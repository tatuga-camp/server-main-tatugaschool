import { TextMessage } from '@line/bot-sdk';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, WebhookEvent } from '@line/bot-sdk';
@Injectable()
export class LineBotService {
  private readonly logger = new Logger(LineBotService.name);
  private lineClient: messagingApi.MessagingApiClient;
  constructor(private config: ConfigService) {
    this.lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: this.config.get('LINE_ACCESS_TOKEN'),
    });
  }

  // LINE rejects a text message over 5000 chars with 400 "Length must be
  // between 0 and 5000" — on BOTH reply and push, so an over-long AI answer
  // would otherwise reach the user as pure silence.
  private static readonly LINE_TEXT_LIMIT = 5000;

  private toTextMessage(text: string): TextMessage {
    if (text.length <= LineBotService.LINE_TEXT_LIMIT) {
      return { type: 'text', text };
    }
    this.logger.warn(
      `Truncating outgoing LINE message from ${text.length} to ${LineBotService.LINE_TEXT_LIMIT} chars`,
    );
    let truncated = text.slice(0, LineBotService.LINE_TEXT_LIMIT - 1);
    // Never end on the high half of a surrogate pair (e.g. a split emoji).
    if (/[\uD800-\uDBFF]$/.test(truncated)) {
      truncated = truncated.slice(0, -1);
    }
    return { type: 'text', text: truncated + '…' };
  }

  async sendMessage(request: { groupId: string; message: string }) {
    try {
      if (!request.message) {
        throw new BadRequestException('Message is required');
      }

      await this.lineClient.pushMessage({
        to: request.groupId,
        messages: [this.toTextMessage(request.message)],
      });
    } catch (error) {
      throw error;
    }
  }

  async replyMessage(request: { replyToken: string; message: string }) {
    try {
      if (!request.message) {
        throw new BadRequestException('Message is required');
      }
      await this.lineClient.replyMessage({
        replyToken: request.replyToken,
        messages: [this.toTextMessage(request.message)],
      });
    } catch (error) {
      throw error;
    }
  }

  async replyOrPushMessage(request: {
    replyToken: string;
    groupId: string;
    message: string;
  }) {
    try {
      await this.replyMessage({
        replyToken: request.replyToken,
        message: request.message,
      });
    } catch (err) {
      this.logger.warn(
        `replyMessage failed, falling back to pushMessage for group ${request.groupId}`,
        err,
      );
      await this.sendMessage({
        groupId: request.groupId,
        message: request.message,
      });
    }
  }
}
