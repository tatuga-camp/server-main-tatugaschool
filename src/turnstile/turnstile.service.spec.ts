import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  let service: TurnstileService;
  let secret: string | undefined;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    secret = 'test-secret';
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnstileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'TURNSTILE_SECRET_KEY' ? secret : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(TurnstileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('posts the secret and token to the siteverify endpoint and resolves on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, 'error-codes': [] }),
    });

    await expect(service.verify('tok-123')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ secret: 'test-secret', response: 'tok-123' });
  });

  it('throws BadRequestException when Cloudflare reports failure', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    });

    await expect(service.verify('bad-token')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when the token is empty', async () => {
    await expect(service.verify('')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the siteverify request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(service.verify('tok')).rejects.toThrow(BadRequestException);
  });

  it('throws InternalServerErrorException when the secret key is not configured', async () => {
    secret = undefined;

    await expect(service.verify('tok')).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
