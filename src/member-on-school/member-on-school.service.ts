import { EmailService } from './../email/email.service';
import {
  SchoolRepository,
  SchoolRepositoryType,
} from './../school/school.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolByIdDto,
  GetMemberOnSchoolsDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchool, MemberRole, User } from '@prisma/client';
import {
  MemberOnSchoolRepository,
  MemberOnSchoolRepositoryType,
} from './member-on-school.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository, UserRepositoryType } from '../users/users.repository';

@Injectable()
export class MemberOnSchoolService {
  logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  userRepository: UserRepositoryType;
  schoolRepository: SchoolRepositoryType;
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
    this.userRepository = new UserRepository(prisma);
    this.schoolRepository = new SchoolRepository(prisma);
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

      if (!memberOnSchool) {
        throw new ForbiddenException(
          'Access denied: User is not a member of the school',
        );
      }

      if (memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied: User is not an admin');
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSchoolByMemberOnSchoolById(
    dto: GetMemberOnSchoolByIdDto,
    user: User,
  ) {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(dto);

      if (!memberOnSchool) {
        throw new NotFoundException(
          `MemberOnSchool with ID ${dto.memberOnSchoolId} not found`,
        );
      }

      await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllMemberOnSchools(dto: GetMemberOnSchoolsDto, user: User) {
    try {
      await this.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });
      return this.memberOnSchoolRepository.getAllMemberOnSchoolsBySchoolId(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMemberOnSchoolById(
    dto: GetMemberOnSchoolByIdDto,
    user: User,
  ): Promise<MemberOnSchool> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException(
          `MemberOnSchool with ID ${dto.memberOnSchoolId} not found`,
        );
      }

      await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createMemberOnSchool(
    dto: CreateMemberOnSchoolDto,
    user: User,
  ): Promise<MemberOnSchool> {
    try {
      const school = await this.schoolRepository.getSchoolById({
        schoolId: dto.schoolId,
      });

      if (!school) {
        throw new NotFoundException(
          `ไม่พบ School ที่ต้องการสร้าง MemberOnSchool`,
        );
      }

      const member = await this.validateAccess({
        schoolId: dto.schoolId,
        user: user,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      const newMember = await this.userRepository.findByEmail({
        email: dto.email,
      });

      const existingMemberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: member.email,
          schoolId: dto.schoolId,
        });

      if (existingMemberOnSchool) {
        throw new ForbiddenException('MemberOnSchool already exists');
      }

      const create = await this.memberOnSchoolRepository.create({
        status: 'PENDDING',
        role: dto.role,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        photo: newMember.photo,
        phone: newMember.phone,
        userId: newMember.id,
        schoolId: school.id,
      });

      this.emailService.sendMail({
        to: newMember.email,
        subject: 'Invite to join school',
        html: `You have been invited to join ${school.title}. 
        Please click the link to join. ${process.env.CLIENT_URL}/invite/${create.id}`,
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateMemberOnSchool(
    dto: UpdateMemberOnSchoolDto,
    user: User,
  ): Promise<MemberOnSchool> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException(`ไม่พบ MemberOnSchool ที่ต้องการอัพเดท`);
      }

      const member = await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      return await this.memberOnSchoolRepository.updateMemberOnSchool({
        query: { id: memberOnSchool.id },
        data: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async AcceptMemberOnSchool(dto: UpdateMemberOnSchoolDto): Promise<void> {
    try {
      if (dto.body.status === 'ACCEPT') {
        const acceptMember =
          await this.memberOnSchoolRepository.updateMemberOnSchool({
            query: { id: dto.query.memberOnSchoolId },
            data: {
              status: 'ACCEPT',
            },
          });
      } else if (dto.body.status === 'REJECT') {
        const rejectMember = await this.memberOnSchoolRepository.delete({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteMemberOnSchool(
    dto: DeleteMemberOnSchoolDto,
    user: User,
  ): Promise<void> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException(`ไม่พบ MemberOnSchool ที่ต้องการอัพเดท`);
      }

      const member = await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      await this.memberOnSchoolRepository.delete({
        memberOnSchoolId: dto.memberOnSchoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
