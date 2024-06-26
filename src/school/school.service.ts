import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberOnSchool,
  MemberRole,
  School,
  Status,
  User,
} from '@prisma/client';
import {
  CreateSchoolDto,
  DeleteSchoolDto,
  GetSchoolByIdDto,
  UpdateSchoolDto,
} from './dto';
import { SchoolRepository, SchoolRepositoryType } from './school.repository';

import { StripeService } from '../stripe/stripe.service';
import {
  MemberOnSchoolRepository,
  MemberOnSchoolRepositoryType,
} from '../member-on-school/member-on-school.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolService {
  logger: Logger;
  schoolRepository: SchoolRepositoryType;
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  constructor(
    logger: Logger,
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {
    this.logger = new Logger(SchoolService.name);
    this.schoolRepository = new SchoolRepository(prisma);
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
  }

  async getSchools(page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;
      const [schools, total] = await Promise.all([
        this.prisma.school.findMany({
          skip,
          take: limit,
        }),
        this.prisma.school.count(),
      ]);

      return {
        data: schools,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async validateAccess({
    user,
    schoolId,
  }: {
    user: User;
    schoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: schoolId,
        },
      });

      if (!memberOnSchool && user.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied');
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSchoolById(dto: GetSchoolByIdDto, user: User): Promise<School> {
    try {
      const school = await this.schoolRepository.getSchoolById(dto);
      await this.validateAccess({
        user: user,
        schoolId: school.id,
      });
      return school;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSchool(dto: CreateSchoolDto, user: User): Promise<School> {
    try {
      //create stripe customer
      const customer = await this.stripe.CreateCustomer({
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
      });

      const school = await this.schoolRepository.create({
        ...dto,
        stripe_customer_id: customer.id,
        plan: 'FREE',
        billingManagerId: user.id,
      });

      await this.memberOnSchoolRepository.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        phone: user.phone,
        userId: user.id,
        role: MemberRole.ADMIN,
        status: Status.ACCEPT,
        schoolId: school.id,
      });
      return school;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateSchool(dto: UpdateSchoolDto, user: User): Promise<School> {
    try {
      const school = await this.schoolRepository.getSchoolById({
        schoolId: dto.query.schoolId,
      });

      const member = await this.validateAccess({
        user: user,
        schoolId: school.id,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('Access denied');
      }

      //if there is a new billing manager update stripe customer
      if (dto.body.billingManagerId) {
        const newBillingManager = await this.prisma.user.findUnique({
          where: {
            id: dto.body.billingManagerId,
          },
        });

        if (!newBillingManager) {
          throw new NotFoundException('User not found');
        }

        const updateStripeCustomer = await this.stripe.UpdateCustomer({
          query: {
            stripeCustomerId: school.stripe_customer_id,
          },
          body: {
            email: newBillingManager.email,
            name:
              newBillingManager.firstName + ' ' + newBillingManager.lastName,
          },
        });
      }

      return await this.schoolRepository.update({
        query: { schoolId: dto.query.schoolId },
        body: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async deleteSchool(dto: DeleteSchoolDto, user: User): Promise<{ message }> {
    try {
      const school = await this.schoolRepository.getSchoolById({
        schoolId: dto.schoolId,
      });
      const member = await this.validateAccess({
        user: user,
        schoolId: school.id,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('Access denied');
      }

      return await this.schoolRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
