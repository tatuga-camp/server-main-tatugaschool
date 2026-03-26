import { SubjectService } from './../subject/subject.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineBotService } from '../line-bot/line-bot.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineBotService: LineBotService,
    private subjectService: SubjectService,
  ) {}

  @Cron('0 15 12 * * 1-5', { timeZone: 'Asia/Bangkok' })
  async notifyPendingAssignments() {
    this.logger.log('Starting Line notification job for pending assignments');
    try {
      let skip = 0;
      const take = 5;
      let hasMore = true;

      while (hasMore) {
        const subjects = await this.prisma.subject.findMany({
          skip,
          take,
          where: {
            isVerifyLine: true,
            lineGroupId: { not: null },
            school: {
              plan: {
                in: ['PREMIUM', 'ENTERPRISE'],
              },
            },
          },
        });

        if (subjects.length < take) {
          hasMore = false;
        }
        skip += take;

        await Promise.allSettled(
          subjects.map(async (subject) => {
            try {
              const message =
                await this.subjectService.reportPendingAssignments(subject);

              if (subject.lineGroupId) {
                await this.lineBotService.sendMessage({
                  groupId: subject.lineGroupId,
                  message: message.trim(),
                });
              }
            } catch (error) {
              this.logger.error(
                `Failed to process subject ${subject.id}:`,
                error,
              );
            }
          }),
        );
      }
      this.logger.log('Finished Line notification job');
    } catch (error) {
      this.logger.error('Error in notifyPendingAssignments job:', error);
    }
  }
}
