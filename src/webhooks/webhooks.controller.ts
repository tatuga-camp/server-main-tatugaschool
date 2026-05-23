import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { validateSignature, WebhookRequestBody } from '@line/bot-sdk';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { verifySanityWebhookSignature } from './sanity-signature';
import { assertSanityNewsPayload } from './sanity-news.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private webhooksService: WebhooksService,
    private config: ConfigService,
  ) {}

  @Post('stripe')
  handleStripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Res() reply: FastifyReply,
  ) {
    return this.webhooksService.handleStripeWebhook(req, reply);
  }

  @Post('line')
  @HttpCode(HttpStatus.OK)
  async handleLineWebhook(@Req() req: RawBodyRequest<FastifyRequest>) {
    const signature = req.headers['x-line-signature'] as string;
    const channelSecret = this.config.get<string>('LINE_CHANNEL_SECRET');

    if (!signature) {
      throw new UnauthorizedException('Missing LINE signature');
    }

    const rawBodyBuffer = req.rawBody;

    const isValid = validateSignature(rawBodyBuffer, channelSecret, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid LINE signature');
    }

    const parsedBody: WebhookRequestBody = JSON.parse(
      rawBodyBuffer.toString('utf8'),
    );

    await this.webhooksService.handleLineWebhook(parsedBody);

    return 'OK';
  }

  @Post('sanity-news')
  @HttpCode(HttpStatus.OK)
  async handleSanityNewsWebhook(@Req() req: RawBodyRequest<FastifyRequest>) {
    const secret = this.config.get<string>('SANITY_WEBHOOK_SECRET');
    verifySanityWebhookSignature({
      rawBody: req.rawBody,
      header: req.headers['sanity-webhook-signature'] as string | undefined,
      secret,
    });

    const body = req.rawBody
      ? JSON.parse(req.rawBody.toString('utf8'))
      : undefined;
    assertSanityNewsPayload(body);

    // Fire-and-forget: never let fanout errors bubble back to Sanity
    // (Sanity would retry on 5xx and we'd send duplicate emails).
    this.webhooksService
      .handleSanityNewsWebhook(body)
      .catch((err) =>
        this.logger.error('sanity-news background fanout crashed', err),
      );

    return { received: true };
  }
}
