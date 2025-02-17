import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { Controller, Post, RawBodyRequest, Req, Res } from '@nestjs/common';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('stripe')
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    return this.webhooksService.handleStripeWebhook(req, res);
  }
}
