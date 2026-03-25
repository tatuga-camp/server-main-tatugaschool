import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
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
import { validateSignature, WebhookRequestBody } from '@line/bot-sdk';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
    private config: ConfigService,
  ) {}

  @Post('stripe')
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    return this.webhooksService.handleStripeWebhook(req, res);
  }
  @Post('line')
  @HttpCode(HttpStatus.OK)
  async handleLineWebhook(@Req() req: Request) {
    const signature = req.headers['x-line-signature'] as string;
    const channelSecret = this.config.get('LINE_CHANNEL_SECRET');

    if (!signature) {
      throw new UnauthorizedException('Missing LINE signature');
    }

    const rawBodyBuffer = req.body;

    const isValid = validateSignature(rawBodyBuffer, channelSecret, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid LINE signature');
    }

    const parsedBody: WebhookRequestBody = JSON.parse(
      rawBodyBuffer.toString('utf8'),
    );

    await this.webhooksService.handleLineWebhook(parsedBody);

    return 'OK'; // Always return 200 OK
  }
}
