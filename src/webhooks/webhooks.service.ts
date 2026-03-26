import { Injectable, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { SchoolService } from './../school/school.service';
import {
  WebhookEvent,
  WebhookRequestBody,
  MessageEvent,
  TextEventMessage,
} from '@line/bot-sdk';
import { LineBotService } from '../line-bot/line-bot.service';
import { SubjectService } from '../subject/subject.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(
    private stripe: StripeService,
    private schoolService: SchoolService,
    private line: LineBotService,
    private subjectService: SubjectService,
    private email: EmailService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleLineWebhook(dto: WebhookRequestBody) {
    try {
      const events: WebhookEvent[] = dto.events;
      for (const event of events) {
        if (event.type === 'join' && event.source.type === 'group') {
          await this.line.replyMessage({
            replyToken: event.replyToken,
            message:
              'กรุณา mention @Tatuga School และพิมพ์รหัสวิชา 6 หลัก เพื่อยืนยันกลุ่ม\n(Please mention @Tatuga School and type 6 digits of subject code)',
          });
        }

        if (event.type === 'leave' && event.source.type === 'group') {
          await this.subjectService.leaveGroupLine({
            groupId: event.source.groupId,
          });
        }

        if (
          event.type === 'message' &&
          event.message.type === 'text' &&
          event.source.type === 'group' &&
          event.message.mention?.mentionees &&
          event.message.mention?.mentionees.some((m) => (m as any).isSelf)
        ) {
          const messageEvent = event as MessageEvent;
          const message = messageEvent.message as TextEventMessage;

          const subject = await this.subjectService.subjectRepository.findFirst(
            {
              where: {
                lineGroupId: event.source.groupId,
              },
            },
          );

          const lastText = message.text.split(' ').pop();
          const codeMatch = lastText.match(/\b[A-Za-z0-9]{6}\b/);

          if (!subject && codeMatch) {
            const code = codeMatch[0];
            const subject = await this.prisma.subject.findUnique({
              where: { code },
            });

            if (!subject) {
              await this.line.replyMessage({
                replyToken: event.replyToken,
                message:
                  'ไม่พบรหัสวิชานี้ กรุณาพิมพ์ใหม่อีกครั้ง\n(Incorrect code, please try again)',
              });
              return;
            }

            const verifyLineToken = crypto.randomBytes(32).toString('hex');

            await this.prisma.subject.update({
              where: { id: subject.id },
              data: {
                lineGroupId: event.source.groupId,
                isVerifyLine: false,
                verifyLineToken,
              },
            });

            await this.line.replyMessage({
              replyToken: event.replyToken,
              message:
                'คุณครูต้องไปกดยืนยันหน้ารายวิชาที่เว็บไซต์เราเพื่อยืนยันตัวตน ถ้าไม่เห็น Popup เด้งขึ้น ให้ reload เว็บ\n(Teachers, please verify your identity on the course page of our website. If the popup does not appear, please refresh the page.)',
            });
          }

          if (!subject && !codeMatch) {
            await this.line.replyMessage({
              replyToken: event.replyToken,
              message:
                'รูปแบบรหัสไม่ถูกต้อง กรุณาพิมพ์รหัสวิชา 6 หลักใหม่อีกครั้ง\n(Incorrect code format, please type the 6-digit code again)',
            });
            return;
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async handleStripeWebhook(req: RawBodyRequest<Request>, res: Response) {
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error(err);
      console.log(`⚠️  Webhook signature verification failed.`);
      console.log(
        `⚠️  Check the env file and enter the correct webhook secret.`,
      );
    }
    const dataObject = event.data.object;
    switch (event.type) {
      case 'invoice.paid':
        const invoicePaid = dataObject as Stripe.Invoice;

        let school = await this.schoolService.schoolRepository.findUnique({
          where: {
            stripe_customer_id: invoicePaid.customer.toString(),
          },
        });

        if (!school) {
          res.status(400).send('stripe_customer_id not found on School');
          break;
        }

        const subscription = await this.stripe.subscriptions.retrieve(
          invoicePaid.subscription.toString(),
        );
        const price = await this.stripe.prices.retrieve(
          subscription.items.data[0].price.id,
        );
        const product = await this.stripe.products.retrieve(
          price.product.toString(),
        );
        const date = new Date(subscription.current_period_end * 1000);
        if (product.name === 'Tatuga School Basic') {
          school = await this.schoolService.upgradePlanBasic(
            school.id,
            date,
            price.id,
            subscription.id,
          );
        }
        if (product.name === 'Tatuga School Premium') {
          school = await this.schoolService.upgradePlanPremium(
            school.id,
            date,
            price.id,
            subscription.id,
          );
        }
        if (product.name === 'Tatuga School Enterprise') {
          school = await this.schoolService.upgradePlanEnterprise(
            school.id,
            date,
            price.id,
            subscription.id,
            subscription.items.data[0].quantity,
          );
        }
        const subscriptions = await this.stripe.subscriptions.list({
          customer: school.stripe_customer_id,
          status: 'all',
        });
        const activeSubscriptions = subscriptions.data
          .filter((sub) => sub.status === 'active' || sub.status === 'past_due')
          .filter((s) => s.id !== subscription.id);
        for (const oldSub of activeSubscriptions) {
          await this.stripe.subscriptions.cancel(oldSub.id);
        }

        res.status(200).send(school);
        break;

      case 'customer.subscription.deleted':
        const subscriptionDelete = dataObject as Stripe.Subscription;
        const all_invoices = await this.stripe.invoices.list({
          subscription: subscriptionDelete.id,
          limit: 20,
          status: 'open',
        });

        for (const latest_invoice of all_invoices.data) {
          await this.stripe.invoices.voidInvoice(latest_invoice.id);
        }

        let school_subscription_delete =
          await this.schoolService.schoolRepository.findFirst({
            where: {
              stripe_subscription_id: subscriptionDelete.id,
            },
          });

        if (!school_subscription_delete) {
          res.status(200).send('stripe_subscription_id not found on School');
          break;
        }

        school_subscription_delete = await this.schoolService.upgradePlanFree(
          school_subscription_delete.id,
        );
        res.status(200).send(school_subscription_delete);
        break;

      case 'invoice.updated':
        const invoiceUpdate = dataObject as Stripe.Invoice;
        if (invoiceUpdate.status === 'uncollectible') {
          await this.stripe.invoices.voidInvoice(invoiceUpdate.id);
        }
        res.status(200).send('Updated Invoice');

        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
}
