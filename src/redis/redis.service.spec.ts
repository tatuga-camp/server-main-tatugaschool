import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis', () => {
  return class MockRedis {
    disconnect = jest.fn();
  };
});

describe('RedisService', () => {
  let service: RedisService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should disconnect on module destroy', () => {
    service.disconnect = jest.fn();
    service.onModuleDestroy();
    expect(service.disconnect).toHaveBeenCalled();
  });
});
