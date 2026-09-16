import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private config: ConfigService) {}

  /**
   * Verifies a Cloudflare Turnstile token. Resolves when the token is valid,
   * throws BadRequestException otherwise. Tokens are single-use, so the
   * client must reset its widget after any failed sign-up attempt.
   */
  async verify(token: string): Promise<void> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      this.logger.error('TURNSTILE_SECRET_KEY is not configured');
      throw new InternalServerErrorException(
        'Turnstile verification is not configured',
      );
    }

    if (!token) {
      throw new BadRequestException('Turnstile verification failed');
    }

    let result: SiteverifyResponse;
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
      });
      result = (await response.json()) as SiteverifyResponse;
    } catch (error) {
      this.logger.error('Turnstile siteverify request failed', error);
      throw new BadRequestException('Turnstile verification failed');
    }

    if (!result.success) {
      this.logger.warn(
        `Turnstile rejected token: ${(result['error-codes'] ?? []).join(', ')}`,
      );
      throw new BadRequestException('Turnstile verification failed');
    }
  }
}
