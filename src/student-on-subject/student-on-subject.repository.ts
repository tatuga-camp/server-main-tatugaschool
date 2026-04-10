import { StorageService } from '../storage/storage.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, StudentOnSubject } from '@prisma/client';
import {
  RequestCreateStudentOnSubject,
  RequestDeleteStudentOnSubject,
  RequestGetStudentOnSubjectById,
  RequestGetStudentOnSubjectByStudentId,
  RequestGetStudentOnSubjectBySubjectId,
  RequestUpdateStudentOnSubject,
} from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';

export type StudentOnSubjectRepositoryType = {
  getStudentOnSubjectsBySubjectId(
    request: RequestGetStudentOnSubjectBySubjectId,
  ): Promise<StudentOnSubject[]>;
  getStudentOnSubjectsByStudentId(
    request: RequestGetStudentOnSubjectByStudentId,
  ): Promise<StudentOnSubject[]>;
  getStudentOnSubjectById(
    request: RequestGetStudentOnSubjectById,
  ): Promise<StudentOnSubject | null>;
  createStudentOnSubject(
    request: RequestCreateStudentOnSubject,
  ): Promise<StudentOnSubject>;
  updateStudentOnSubject(
    request: RequestUpdateStudentOnSubject,
  ): Promise<StudentOnSubject>;
  delete(request: RequestDeleteStudentOnSubject): Promise<StudentOnSubject>;
  update(request: Prisma.StudentOnSubjectUpdateArgs): Promise<StudentOnSubject>;
  findMany(
    request: Prisma.StudentOnSubjectFindManyArgs,
  ): Promise<StudentOnSubject[]>;
  createMany(
    request: Prisma.StudentOnSubjectCreateManyArgs,
  ): Promise<Prisma.BatchPayload>;
  findFirst(
    request: Prisma.StudentOnSubjectFindFirstArgs,
  ): Promise<StudentOnSubject | null>;
};
@Injectable()
export class StudentOnSubjectRepository
  implements StudentOnSubjectRepositoryType
{
  logger: Logger = new Logger(StudentOnSubjectRepository.name);
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private redisService: RedisService,
    private prismaReadService: PrismaReadService,
  ) {}

  async findFirst(
    request: Prisma.StudentOnSubjectFindFirstArgs,
  ): Promise<StudentOnSubject | null> {
    try {
      return await this.prismaReadService.studentOnSubject.findFirst(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async getStudentOnSubjectsBySubjectId(
    request: RequestGetStudentOnSubjectBySubjectId,
  ): Promise<StudentOnSubject[]> {
    try {
      return await this.prismaReadService.studentOnSubject.findMany({
        where: {
          subjectId: request.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async getStudentOnSubjectsByStudentId(
    request: RequestGetStudentOnSubjectByStudentId,
  ): Promise<StudentOnSubject[]> {
    try {
      return await this.prismaReadService.studentOnSubject.findMany({
        where: {
          studentId: request.studentId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findMany(
    request: Prisma.StudentOnSubjectFindManyArgs,
  ): Promise<StudentOnSubject[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result =
          await this.prismaReadService.studentOnSubject.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
      return await this.prismaReadService.studentOnSubject.findMany(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async getStudentOnSubjectById(
    request: RequestGetStudentOnSubjectById,
  ): Promise<StudentOnSubject | null> {
    try {
      return await this.prisma.studentOnSubject.findUnique({
        where: {
          id: request.studentOnSubjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async createStudentOnSubject(
    request: RequestCreateStudentOnSubject,
  ): Promise<StudentOnSubject> {
    try {
      const result = await this.prisma.studentOnSubject.create({
        data: request,
      });
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Duplicate student on subject');
        }
      }
      this.logger.error(error);
      throw error;
    }
  }

  async createMany(
    request: Prisma.StudentOnSubjectCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const create = await this.prisma.studentOnSubject.createMany(request);

      const subjectId = request.data[0]?.subjectId;

      if (typeof subjectId === 'string' && this.redisService) {
        await this.redisService?.del(this.getCacheKey(subjectId));
      }

      return create;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async updateStudentOnSubject(
    request: RequestUpdateStudentOnSubject,
  ): Promise<StudentOnSubject> {
    try {
      const result = await this.prisma.studentOnSubject.update({
        where: {
          id: request.query.studentOnSubjectId,
        },
        data: request.data,
      });
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.StudentOnSubjectUpdateArgs,
  ): Promise<StudentOnSubject> {
    try {
      const result = await this.prisma.studentOnSubject.update(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(
    request: RequestDeleteStudentOnSubject,
  ): Promise<StudentOnSubject> {
    try {
      const { studentOnSubjectId } = request;

      const studentOnAssignments =
        await this.prisma.studentOnAssignment.findMany({
          where: {
            studentOnSubjectId: studentOnSubjectId,
          },
        });
      // Fetch related entities
      const fileOnStudentAssignments =
        studentOnAssignments.length > 0
          ? await this.prisma.fileOnStudentAssignment.findMany({
              where: {
                studentOnAssignmentId: {
                  in: studentOnAssignments.map(
                    (studentOnAssignment) => studentOnAssignment.id,
                  ),
                },
              },
            })
          : [];

      await this.prisma.studentOnGroup.deleteMany({
        where: {
          studentOnSubjectId: studentOnSubjectId,
        },
      });

      // Delete related attendance records
      await this.prisma.attendance.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete related scoreOnStudents records
      await this.prisma.scoreOnStudent.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete related fileOnStudentAssignments records
      if (fileOnStudentAssignments.length > 0) {
        await this.prisma.fileOnStudentAssignment.deleteMany({
          where: {
            id: {
              in: fileOnStudentAssignments.map((file) => file.id),
            },
          },
        });
      }

      // Delete related commentOnAssignments records
      if (studentOnAssignments.length > 0) {
        await this.prisma.commentOnAssignment.deleteMany({
          where: {
            studentOnAssignmentId: {
              in: studentOnAssignments.map(
                (studentOnAssignment) => studentOnAssignment.id,
              ),
            },
          },
        });
      }

      // Use Promise.allSettled to delete files in Google Storage
      Promise.allSettled(
        fileOnStudentAssignments
          .filter((f) => f.contentType === 'FILE')
          .map((file) =>
            this.storageService.DeleteFileOnStorage({
              fileName: file.body,
            }),
          ),
      );

      await this.prisma.skillOnStudentAssignment.deleteMany({
        where: {
          OR: studentOnAssignments.map((s) => {
            return {
              studentOnAssignmentId: s.id,
            };
          }),
        },
      });

      // Delete related studentOnAssignments records
      await this.prisma.studentOnAssignment.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete the StudentOnSubject

      const result = await this.prisma.studentOnSubject.delete({
        where: { id: studentOnSubjectId },
      });

      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  private getCacheKey(subjectId: string): string {
    return `student_subject_subjectId:${subjectId}`;
  }
}
