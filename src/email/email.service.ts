import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
@Injectable()
export class EmailService {
  private logger: Logger;
  private mailerSend: MailerSend;
  constructor(private config: ConfigService) {
    this.logger = new Logger(EmailService.name);
    this.mailerSend = new MailerSend({
      apiKey: this.config.get('EMAIL_API_KEY'),
    });
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
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.log(
          `Email will not be sent to ${to} because you are not in production  env`,
        );
        return;
      }
      const recipients = [new Recipient(to, to.split('@')[0])];
      const sender = new Sender('support@tatugaschool.com', 'support');

      const emailParams = new EmailParams()
        .setFrom(sender)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html);

      await this.mailerSend.email.send(emailParams);

      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
