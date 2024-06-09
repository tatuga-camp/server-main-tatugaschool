import { Injectable, Logger } from '@nestjs/common';
import { CreateMemberOnSchoolDto } from './dto';
import { MemberOnSchool } from '@prisma/client';
import {
  MemberOnSchoolRepository,
  MemberOnSchoolRepositoryType,
} from './member-on-school.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MemberOnSchoolService {
  logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  constructor(private prisma: PrismaService) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
  }
  async createMemberOnSchool(
    data: CreateMemberOnSchoolDto,
  ): Promise<MemberOnSchool> {
    try {
      return this.memberOnSchoolRepository.create(data);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
