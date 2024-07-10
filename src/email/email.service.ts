import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  logger: Logger;

  constructor(
    private mailService: MailerService,
    private config: ConfigService,
  ) {
    this.logger = new Logger(EmailService.name);
  }

  async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const mailOptions: ISendMailOptions = {
        from: this.config.get('EMAIL_NAME_SERVICE'),
        to,
        subject,
        html,
      };

      await this.mailService.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
