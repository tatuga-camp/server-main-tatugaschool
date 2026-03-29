import { SubjectService } from './../subject/subject.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { ClassService } from '../class/class.service';
import { SchoolService } from '../school/school.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineBotService: LineBotService,
    private subjectService: SubjectService,
    private classroomService: ClassService,
    private schoolService: SchoolService,
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

  @Cron('0 3 * * *', { timeZone: 'Asia/Bangkok' })
  async executeRealDelete() {
    this.logger.log('Starting real delete job for flagged items');
    try {
      const take = 5;

      // Delete schools
      let hasMoreSchools = true;
      while (hasMoreSchools) {
        const schools = await this.prisma.school.findMany({
          where: { isDeleted: true },
          take,
        });

        if (schools.length === 0) {
          hasMoreSchools = false;
        } else {
          for (const s of schools) {
            try {
              await this.schoolService.schoolRepository.delete({
                schoolId: s.id,
              });
              this.logger.log(`Real deleted school ${s.id}`);
            } catch (err) {
              this.logger.error(`Failed to delete school ${s.id}:`, err);
            }
          }
        }
      }

      // Delete classes
      let hasMoreClasses = true;
      while (hasMoreClasses) {
        const classes = await this.prisma.class.findMany({
          where: { isDeleted: true },
          take,
        });

        if (classes.length === 0) {
          hasMoreClasses = false;
        } else {
          for (const c of classes) {
            try {
              await this.classroomService.classRepository.delete({
                classId: c.id,
              });
              this.logger.log(`Real deleted class ${c.id}`);
            } catch (err) {
              this.logger.error(`Failed to delete class ${c.id}:`, err);
            }
          }
        }
      }

      // Delete subjects
      let hasMoreSubjects = true;
      while (hasMoreSubjects) {
        const subjects = await this.prisma.subject.findMany({
          where: { isDeleted: true },
          take,
        });

        if (subjects.length === 0) {
          hasMoreSubjects = false;
        } else {
          for (const s of subjects) {
            try {
              await this.subjectService.subjectRepository.deleteSubject({
                subjectId: s.id,
              });
              this.logger.log(`Real deleted subject ${s.id}`);
            } catch (err) {
              this.logger.error(`Failed to delete subject ${s.id}:`, err);
            }
          }
        }
      }

      this.logger.log('Finished real delete job');
    } catch (error) {
      this.logger.error('Error in executeRealDelete job:', error);
    }
  }
}
