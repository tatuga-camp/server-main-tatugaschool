import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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

@Controller('webhooks')
export class WebhooksController {
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
}
