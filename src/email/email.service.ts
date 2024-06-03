import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

@Injectable()
export class EmailService {
  private oauth2Client: any;
  private transporter: nodemailer.Transporter;

  constructor() {
    const clientId =
      '349215492140-53jtkujmhoi58und7534jg6uk9c3prkv.apps.googleusercontent.com';
    const clientSecret = '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';
    const refreshToken =
      '1//043zl2cUa8PEOCgYIARAAGAQSNwF-L9IrGcbPMDh2LyIyLuJPLrLG--cHgW2zE482hLZXywqmLWVn_mR8xGnIMa2xFPJEDbzLjAM';
    const redirectUri = 'https://developers.google.com/oauthplayground';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    console.log('AccessToken', this.oauth2Client.getAccessToken());

    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        type: 'OAuth2',
        user: 'dlivestreaming8@gmail.com',
        clientId,
        clientSecret,
        refreshToken,
        accessToken: this.oauth2Client.getAccessToken(),
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    const mailOptions = {
      from: 'dlivestreaming8@gmail.com',
      to,
      subject,
      text,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
