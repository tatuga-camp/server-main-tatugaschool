import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateMemberOnSchool,
  RequestGetMemberOnSchoolByEmail,
  RequestUpdateMemberOnSchool,
} from './interfaces';
import { $Enums, MemberOnSchool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type MemberOnSchoolRepositoryType = {
  create(request: RequestCreateMemberOnSchool): Promise<MemberOnSchool>;
  updateMemberOnSchool(
    request: RequestUpdateMemberOnSchool,
  ): Promise<MemberOnSchool>;
  delete(request: { memberOnSchoolId: string }): Promise<{ message: string }>;
  getAllMemberOnSchoolsBySchoolId(request: {
    schoolId: string;
  }): Promise<MemberOnSchool[]>;
  getByUserId(request: { userId: string }): Promise<MemberOnSchool[]>;
  getMemberOnSchoolByUserIdAndSchoolId(request: {
    userId: string;
    schoolId: string;
  }): Promise<MemberOnSchool>;
  getMemberOnSchoolById(request: {
    memberOnSchoolId: string;
  }): Promise<MemberOnSchool>;
  getMemberOnSchoolByEmailAndSchool(request: {
    email: string;
    schoolId: string;
  }): Promise<MemberOnSchool>;
};

@Injectable()
export class MemberOnSchoolRepository implements MemberOnSchoolRepositoryType {
  logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(MemberOnSchoolRepository.name);
  }

  async getByUserId(request: { userId: string }): Promise<MemberOnSchool[]> {
    try {
      return await this.prisma.memberOnSchool.findMany({
        where: {
          userId: request.userId,
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

  async create(request: RequestCreateMemberOnSchool): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.create({
        data: {
          ...request,
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

  async getMemberOnSchoolByUserIdAndSchoolId(request: {
    userId: string;
    schoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: request.userId,
          schoolId: request.schoolId,
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

  async updateMemberOnSchool(
    request: RequestUpdateMemberOnSchool,
  ): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.update({
        where: {
          ...request.query,
        },
        data: {
          ...request.data,
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

  async delete(request: {
    memberOnSchoolId: string;
  }): Promise<{ message: string }> {
    try {
      // Delete related MemberOnTeam records first
      await this.prisma.memberOnTeam.deleteMany({
        where: {
          memberOnSchoolId: request.memberOnSchoolId,
        },
      });

      // Finally, delete the MemberOnSchool record
      await this.prisma.memberOnSchool.delete({
        where: {
          id: request.memberOnSchoolId,
        },
      });

      return { message: 'MemberOnSchool deleted successfully' };
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

  async getAllMemberOnSchoolsBySchoolId(request: {
    schoolId: string;
  }): Promise<MemberOnSchool[]> {
    try {
      return await this.prisma.memberOnSchool.findMany({
        where: {
          schoolId: request.schoolId,
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

  async getMemberOnSchoolById(request: {
    memberOnSchoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.findUnique({
        where: {
          id: request.memberOnSchoolId,
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
  async getMemberOnSchoolByEmailAndSchool(request: {
    email: string;
    schoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.findFirst({
        where: {
          email: request.email,
          schoolId: request.schoolId,
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
}
