import { Injectable, Logger } from '@nestjs/common';
import {
  RequestCreateMemberOnSchool,
  RequestGetMemberOnSchoolByEmail,
  RequestUpdateMemberOnSchool,
} from './interfaces';
import { MemberOnSchool } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type MemberOnSchoolRepositoryType = {
  create(request: RequestCreateMemberOnSchool): Promise<MemberOnSchool>;
  updateMemberOnSchool(
    request: RequestUpdateMemberOnSchool,
  ): Promise<MemberOnSchool>;
  delete(id: string): Promise<MemberOnSchool>;
  getAllMemberOnSchools(): Promise<MemberOnSchool[]>;
  getMemberOnSchoolById(id: string): Promise<MemberOnSchool>;
  getMemberOnSchoolByEmailAndSchool: (
    request: RequestGetMemberOnSchoolByEmail,
  ) => Promise<MemberOnSchool>;
};

@Injectable()
export class MemberOnSchoolRepository implements MemberOnSchoolRepositoryType {
  logger: Logger = new Logger(MemberOnSchoolRepository.name);
  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateMemberOnSchool): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.create({
        data: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
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
      throw error;
    }
  }

  async delete(id: string): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllMemberOnSchools(): Promise<MemberOnSchool[]> {
    try {
      return this.prisma.memberOnSchool.findMany();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMemberOnSchoolById(id: string): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.findUnique({
        where: {
          id,
        },
        include: {
          school: true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async getMemberOnSchoolByEmailAndSchool(
    requrst: RequestGetMemberOnSchoolByEmail,
  ): Promise<MemberOnSchool> {
    try {
      return await this.prisma.memberOnSchool.findFirst({
        where: {
          ...requrst,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
