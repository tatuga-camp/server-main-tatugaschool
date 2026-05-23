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
      if (
        this.config.get('NODE_ENV') !== 'production' &&
        this.config.get('NODE_ENV') !== 'development'
      ) {
        this.logger.log(
          `Email will not be sent to ${to} because you are in ${this.config.get('NODE_ENV')}  env`,
        );
        return;
      }
      const recipients = [new Recipient(to)];
      const sender = new Sender('support@tatugaschool.com', 'Tatuga School');

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

  async sendBulk({
    to,
    subject,
    html,
  }: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<{ sent: number; failed: number }> {
    if (to.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const env = this.config.get('NODE_ENV');
    if (env !== 'production' && env !== 'development') {
      this.logger.log(
        `Bulk email will not be sent to ${to.length} recipients because you are in ${env} env`,
      );
      return { sent: 0, failed: 0 };
    }

    const sender = new Sender('support@tatugaschool.com', 'Tatuga School');
    const CHUNK_SIZE = 500;

    const chunks: string[][] = [];
    for (let i = 0; i < to.length; i += CHUNK_SIZE) {
      chunks.push(to.slice(i, i + CHUNK_SIZE));
    }

    const dispatches = chunks.map(async (chunk, idx) => {
      const offset = idx * CHUNK_SIZE;
      const params = chunk.map((email) =>
        new EmailParams()
          .setFrom(sender)
          .setTo([new Recipient(email)])
          .setSubject(subject)
          .setHtml(html),
      );
      try {
        await this.mailerSend.email.sendBulk(params);
        this.logger.log(
          `Bulk email chunk sent: ${chunk.length} recipients (offset ${offset})`,
        );
        return { success: true as const, count: chunk.length };
      } catch (error) {
        this.logger.error(
          `Bulk email chunk failed at offset ${offset} (${chunk.length} recipients): ${(error as Error).message}`,
        );
        return { success: false as const, count: chunk.length };
      }
    });

    const settled = await Promise.allSettled(dispatches);
    let sent = 0;
    let failed = 0;
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        if (r.value.success) sent += r.value.count;
        else failed += r.value.count;
      } else {
        // Should not happen — inner promises always resolve — but be defensive.
        this.logger.error(`Bulk email dispatch rejected unexpectedly: ${String(r.reason)}`);
      }
    }

    return { sent, failed };
  }
}
