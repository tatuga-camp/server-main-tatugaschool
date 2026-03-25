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
  ) {}

  @Cron('0 7 * * 1-5', { timeZone: 'Asia/Bangkok' })
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
              const studentOnSubjects =
                await this.prisma.studentOnSubject.findMany({
                  where: {
                    subjectId: subject.id,
                    isActive: true,
                  },
                  include: {
                    studentOnAssignments: {
                      where: {
                        status: 'PENDDING',
                        isAssigned: true,
                        assignment: {
                          status: 'Published',
                        },
                      },
                    },
                  },
                  orderBy: {
                    order: 'asc',
                  },
                });

              let message = `📚 รายวิชา: ${subject.title}\nสรุปงานค้างของนักเรียน:\n\n`;
              let hasPending = false;

              for (const sos of studentOnSubjects) {
                const pendingCount = sos.studentOnAssignments.length;
                if (pendingCount > 0) {
                  hasPending = true;
                  const numberStr = sos.number ? `เลขที่ ${sos.number} ` : '';
                  message += `${numberStr}${sos.title}${sos.firstName} ${sos.lastName}: ${pendingCount} งาน\n`;
                }
              }

              if (hasPending && subject.lineGroupId) {
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
