import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

@Injectable()
export class EmailService {
  logger: Logger;
  private oauth2Client: any;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.logger = new Logger(EmailService.name);
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const redirectUri = process.env.GMAIL_REDIRECT_URI;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId,
        clientSecret,
        refreshToken,
        accessToken: this.oauth2Client.getAccessToken(),
      },
    });
  }

  async sendMail({
    to,
    subject,
    text,
  }: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
