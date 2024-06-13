import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import {
  MemberOnSchool,
  MemberRole,
  Provider,
  User,
  UserRole,
} from '@prisma/client';
import {
  MemberOnSchoolRepository,
  MemberOnSchoolRepositoryType,
} from './member-on-school.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository, UserRepositoryType } from '../users/users.repository';
import {
  DEFAULT_PASSWORD,
  VERIFY_EMAIL_TOKEN,
  VERIFY_EMAIL_TOKEN_EXPIRES_AT,
} from 'src/common/constants';

@Injectable()
export class MemberOnSchoolService {
  logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  userRepository: UserRepositoryType;
  constructor(private prisma: PrismaService) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
    this.userRepository = new UserRepository(prisma);
  }

  async getSchoolByMemberOnSchoolId(id: string) {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(id);

      if (!memberOnSchool) {
        throw new NotFoundException(`MemberOnSchool with ID ${id} not found`);
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllMemberOnSchools() {
    try {
      return this.memberOnSchoolRepository.getAllMemberOnSchools;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMemberOnSchoolById(
    dto: GetMemberOnSchoolDto,
  ): Promise<MemberOnSchool> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(
          dto.memberOnSchoolId,
        );

      if (!memberOnSchool) {
        throw new NotFoundException(
          `MemberOnSchool with ID ${dto.memberOnSchoolId} not found`,
        );
      }

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
      const isAdminMemberonSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: user.email,
          schoolId: dto.schoolId,
        });

      if (isAdminMemberonSchool.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      const existingMemberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: dto.email,
          schoolId: dto.schoolId,
        });

      if (existingMemberOnSchool) {
        throw new ForbiddenException('มีผู้ใช้งานอยู่ในระบบแล้ว');
      }

      const existingUser = await this.userRepository.findByEmail({
        email: dto.email,
      });
      if (!existingUser) {
        const user = await this.userRepository.createUser({
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: await DEFAULT_PASSWORD(),
          phone: dto.phone,
          photo: dto.photo,
          provider: Provider.LOCAL,
          role: UserRole.USER,
          verifyEmailToken: await VERIFY_EMAIL_TOKEN(),
          verifyEmailTokenExpiresAt: await VERIFY_EMAIL_TOKEN_EXPIRES_AT(),
        });
        return await this.memberOnSchoolRepository.create({
          ...dto,
          userId: user.id,
        });
      }
      return await this.memberOnSchoolRepository.create({
        ...dto,
        userId: existingUser.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateMemberOnSchool(
    id: string,
    dto: UpdateMemberOnSchoolDto,
    user: User,
  ): Promise<MemberOnSchool> {
    try {
      const isAdminMemberonSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: user.email,
          schoolId: id,
        });

      if (isAdminMemberonSchool.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(id);
      if (!memberOnSchool) {
        throw new NotFoundException(`ไม่พบ MemberOnSchool ที่ต้องการอัพเดท`);
      }

      return await this.memberOnSchoolRepository.updateMemberOnSchool({
        query: { id: memberOnSchool.id },
        data: dto,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteMemberOnSchool(request: DeleteMemberOnSchoolDto): Promise<void> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(
          request.memberOnSchoolId,
        );

      if (!memberOnSchool) {
        throw new NotFoundException(
          `MemberOnSchool with ID ${request.memberOnSchoolId} not found`,
        );
      }

      await this.memberOnSchoolRepository.delete(request.memberOnSchoolId);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
