import { Injectable } from '@nestjs/common';
import { RequestCreateMemberOnSchool } from './interfaces';
import { MemberOnSchool } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type MemberOnSchoolRepositoryType = {
  create: (request: RequestCreateMemberOnSchool) => Promise<MemberOnSchool>;
  update: (id: string, dto: any) => Promise<MemberOnSchool>;
  delete: (id: string) => Promise<MemberOnSchool>;
  getMemberOnSchoolById: (id: string) => Promise<MemberOnSchool>;
};

@Injectable()
export class MemberOnSchoolRepository implements MemberOnSchoolRepositoryType {
  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateMemberOnSchool): Promise<MemberOnSchool> {
    return await this.prisma.memberOnSchool.create({
      data: {
        ...request,
      },
    });
  }

  async update(id: string, dto: any): Promise<MemberOnSchool> {
    return await this.prisma.memberOnSchool.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async delete(id: string): Promise<MemberOnSchool> {
    return await this.prisma.memberOnSchool.delete({
      where: {
        id,
      },
    });
  }

  async getMemberOnSchoolById(id: string): Promise<MemberOnSchool> {
    return await this.prisma.memberOnSchool.findUnique({
      where: {
        id,
      },
    });
  }
}
