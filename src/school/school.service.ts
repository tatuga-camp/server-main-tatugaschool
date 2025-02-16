import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole, School, Status, User } from '@prisma/client';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import {
  CreateSchoolDto,
  DeleteSchoolDto,
  GetSchoolByIdDto,
  UpdateSchoolDto,
} from './dto';
import { SchoolRepository } from './school.repository';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SchoolService {
  private logger: Logger;
  schoolRepository: SchoolRepository;

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    @Inject(forwardRef(() => MemberOnSchoolService))
    private memberOnSchoolService: MemberOnSchoolService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.logger = new Logger(SchoolService.name);
    this.schoolRepository = new SchoolRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getSchools(user: User): Promise<School[]> {
    try {
      const memberOnSchools =
        await this.memberOnSchoolService.memberOnSchoolRepository.findMany({
          where: {
            userId: user.id,
            status: 'ACCEPT',
          },
        });

      const schoolIds = memberOnSchools.map((member) => member.schoolId);

      return await this.schoolRepository.findMany({
        where: {
          id: {
            in: schoolIds,
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSchoolById(dto: GetSchoolByIdDto, user: User): Promise<School> {
    try {
      const school = await this.schoolRepository.getSchoolById(dto);
      await this.memberOnSchoolService.validateAccess({
        user,
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
        schoolTitle: dto.title,
      });

      const school = await this.schoolRepository.create({
        data: {
          ...dto,
          stripe_customer_id: customer.id,
          plan: 'FREE',
          billingManagerId: user.id,
        },
      });

      await this.memberOnSchoolService.memberOnSchoolRepository.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        phone: user.phone,
        blurHash: user.blurHash,
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

  async ValidateLimit(
    school: School,
    checkList: 'totalStorage' | 'members' | 'subjects' | 'classes',
    target: number,
  ) {
    try {
      if (checkList === 'totalStorage' && school.limitTotalStorage < target) {
        throw new ForbiddenException(
          'Your storage size is reaching the limit, please upgrade a plamn',
        );
      }
      if (checkList === 'classes' && school.limitClassNumber < target) {
        throw new ForbiddenException('Class number has reached the limit');
      }

      if (checkList === 'members' && school.limitSchoolMember < target) {
        throw new ForbiddenException('Members on school has reached limit');
      }

      if (checkList === 'subjects' && school.limitSubjectNumber < target) {
        throw new ForbiddenException('Subject number has reached limit');
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async upgradePlanPremium(schoolId: string): Promise<School> {
    try {
      return await this.schoolRepository.update({
        where: {
          id: schoolId,
        },
        data: {
          plan: 'FREE',
          limitSchoolMember: 3,
          limitClassNumber: 20,
          limitSubjectNumber: 20,
          limitTotalStorage: 107374182400,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async upgradePlanFree(schoolId: string): Promise<School> {
    try {
      return await this.schoolRepository.update({
        where: {
          id: schoolId,
        },
        data: {
          plan: 'PREMIUM',
          limitSchoolMember: 2,
          limitClassNumber: 3,
          limitSubjectNumber: 3,
          limitTotalStorage: 16106127360,
        },
      });
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

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: school.id,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException(
          "Access denied because you're not an admin",
        );
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

        if (newBillingManager.id === school.billingManagerId) {
          throw new BadRequestException('User is already a billing manager');
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
        where: { id: dto.query.schoolId },
        data: { ...dto.body },
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

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: school.id,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not an admin");
      }

      return await this.schoolRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
