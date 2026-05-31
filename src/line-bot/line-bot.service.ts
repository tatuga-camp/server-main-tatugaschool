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

  async sendMessage(request: { groupId: string; message: string }) {
    try {
      if (!request.message) {
        throw new BadRequestException('Message is required');
      }

      const message: TextMessage = {
        type: 'text',
        text: request.message,
      };
      await this.lineClient.pushMessage({
        to: request.groupId,
        messages: [message],
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
      const message: TextMessage = {
        type: 'text',
        text: request.message,
      };
      await this.lineClient.replyMessage({
        replyToken: request.replyToken,
        messages: [message],
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
