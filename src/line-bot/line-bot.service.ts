import { TextMessage } from '@line/bot-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, WebhookEvent } from '@line/bot-sdk';
@Injectable()
export class LineBotService {
  private lineClient: messagingApi.MessagingApiClient;
  constructor(private config: ConfigService) {
    this.lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: this.config.get('LINE_ACCESS_TOKEN'),
    });
  }

  async sendMessage(request: { groupId: string; message: string }) {
    try {
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
}
