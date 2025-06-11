import { SubscriptionService } from './../subscription/subscription.service';
import { ClassService } from './../class/class.service';
import { SubjectService } from './../subject/subject.service';
import { StudentService } from './../student/student.service';
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
    @Inject(forwardRef(() => SubjectService))
    private subjectService: SubjectService,
    @Inject(forwardRef(() => ClassService))
    private classService: ClassService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
  ) {
    this.logger = new Logger(SchoolService.name);
    this.schoolRepository = new SchoolRepository(
      this.prisma,
      this.googleStorageService,
      this.subjectService,
      this.classService,
      this.stripe,
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

  async getSchoolById(
    dto: GetSchoolByIdDto,
    user: User,
  ): Promise<
    School & {
      user: User;
      totalClass: number;
      totalTeacher: number;
      totalSubject: number;
    }
  > {
    try {
      let school = await this.schoolRepository.getSchoolById(dto);

      if (!school) {
        throw new NotFoundException('School not found or It has been deleted');
      }
      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: school.id,
      });

      if (school.stripe_subscription_id) {
        const status = await this.subscriptionService.checkSubscriptionStatus(
          school.stripe_subscription_id,
        );

        if (status !== 'active') {
          school = await this.upgradePlanFree(school.id);
        }
      }

      const [billingManger, classes, subjects, teachers] = await Promise.all([
        this.prisma.user.findUnique({
          where: {
            id: school.billingManagerId,
          },
        }),
        this.classService.classRepository.count({
          where: {
            schoolId: school.id,
          },
        }),
        this.subjectService.subjectRepository.count({
          where: {
            schoolId: school.id,
          },
        }),
        this.memberOnSchoolService.memberOnSchoolRepository.count({
          where: {
            schoolId: school.id,
            status: 'ACCEPT',
          },
        }),
      ]);

      return {
        ...school,
        user: billingManger,
        totalClass: classes,
        totalSubject: subjects,
        totalTeacher: teachers,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSchool(dto: CreateSchoolDto, user: User): Promise<School> {
    try {
      //create stripe customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: dto.title,
        description: dto.description,
        address: {
          line1: dto.address,
          postal_code: dto.zipCode,
          state: dto.city,
        },
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

  async upgradePlanPremium(
    schoolId: string,
    stripe_subscription_expireAt: Date,
    stripe_price_id: string,
    stripe_subscription_id: string,
  ): Promise<School> {
    try {
      return await this.schoolRepository.update({
        where: {
          id: schoolId,
        },
        data: {
          stripe_subscription_expireAt: stripe_subscription_expireAt,
          stripe_price_id: stripe_price_id,
          stripe_subscription_id: stripe_subscription_id,
          plan: 'PREMIUM',
          limitSchoolMember: 3,
          limitClassNumber: 20,
          limitSubjectNumber: 30,
          limitTotalStorage: 107374182400,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async upgradePlanEnterprise(
    schoolId: string,
    stripe_subscription_expireAt: Date,
    stripe_price_id: string,
    stripe_subscription_id: string,
    members: number,
  ): Promise<School> {
    try {
      const update = await this.schoolRepository.update({
        where: {
          id: schoolId,
        },
        data: {
          stripe_subscription_expireAt: stripe_subscription_expireAt,
          stripe_price_id: stripe_price_id,
          stripe_subscription_id: stripe_subscription_id,
          plan: 'ENTERPRISE',
          limitSchoolMember: members,
          limitClassNumber: 9999,
          limitSubjectNumber: 9999,
          limitTotalStorage: 10737418240000,
        },
      });

      const [subjects, classrooms] = await Promise.all([
        this.subjectService.subjectRepository.findMany({
          where: {
            schoolId: schoolId,
            isLocked: true,
          },
        }),
        this.classService.classRepository.findMany({
          where: {
            schoolId: schoolId,
            isLocked: true,
          },
        }),
      ]);

      const chooseSubjects = subjects.slice(-update.limitSubjectNumber);
      const chooseClassrooms = classrooms.slice(-update.limitClassNumber);
      await Promise.all([
        ...chooseSubjects.map((s) =>
          this.subjectService.subjectRepository.update({
            where: {
              id: s.id,
            },
            data: {
              isLocked: false,
            },
          }),
        ),
        chooseClassrooms.map((c) =>
          this.classService.classRepository.update({
            where: {
              id: c.id,
            },
            data: {
              isLocked: false,
            },
          }),
        ),
      ]);

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async upgradePlanFree(schoolId: string): Promise<School> {
    try {
      const update = await this.schoolRepository.update({
        where: {
          id: schoolId,
        },
        data: {
          plan: 'FREE',
          limitSchoolMember: 2,
          limitClassNumber: 3,
          stripe_subscription_id: null,
          stripe_subscription_expireAt: null,
          stripe_price_id: null,
          limitSubjectNumber: 3,
          limitTotalStorage: 16106127360,
        },
      });

      const [subjects, classrooms] = await Promise.all([
        this.subjectService.subjectRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.classService.classRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        }),
      ]);

      const chooseSubjects = subjects.slice(3);
      const chooseClassrooms = classrooms.slice(3);
      await Promise.all([
        ...chooseSubjects.map((s) =>
          this.subjectService.subjectRepository.update({
            where: {
              id: s.id,
            },
            data: {
              isLocked: true,
            },
          }),
        ),
        chooseClassrooms.map((c) =>
          this.classService.classRepository.update({
            where: {
              id: c.id,
            },
            data: {
              isLocked: true,
            },
          }),
        ),
      ]);

      return update;
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
  async deleteSchool(dto: DeleteSchoolDto, user: User): Promise<School> {
    try {
      const school = await this.schoolRepository.getSchoolById({
        schoolId: dto.schoolId,
      });
      if (!school) {
        throw new NotFoundException('school not found');
      }
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: school.id,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not an admin");
      }

      const allMember =
        await this.memberOnSchoolService.memberOnSchoolRepository.count({
          where: {
            schoolId: school.id,
            status: 'ACCEPT',
          },
        });

      if (allMember !== 1) {
        throw new BadRequestException(
          'You are not allow to delete school until you delete every members from the school first',
        );
      }

      return await this.schoolRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
