import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMemberOnSchoolDto,
  GetMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchool, Provider, UserRole } from '@prisma/client';
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
import { RequestDeleteMemberOnSchool } from './interfaces';

@Injectable()
export class MemberOnSchoolService {
  logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  userRepository: UserRepositoryType;
  constructor(private prisma: PrismaService) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
    this.userRepository = new UserRepository(prisma);
  }

  async getAllMemberOnSchools() {
    return this.prisma.memberOnSchool.findMany();
  }

  async getMemberOnSchoolById(
    dto: GetMemberOnSchoolDto,
  ): Promise<MemberOnSchool> {
    const memberOnSchool = await this.prisma.memberOnSchool.findUnique({
      where: { ...dto },
    });

    if (!memberOnSchool) {
      throw new NotFoundException(`MemberOnSchool with ID ${dto.id} not found`);
    }

    return memberOnSchool;
  }

  async createMemberOnSchool(
    dto: CreateMemberOnSchoolDto,
  ): Promise<MemberOnSchool> {
    try {
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
      await this.userRepository.updateUser({
        query: {
          id: existingUser.id,
        },
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          photo: dto.photo,
        },
      });

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
  ): Promise<MemberOnSchool> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById(id);
      if (!memberOnSchool) {
        throw new NotFoundException(`ไม่พบ MemberOnSchool ที่ต้องการอัพเดท`);
      }

      const data = {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        photo: dto.photo,
      };
      await this.userRepository.updateUser({
        query: {
          id: memberOnSchool.userId,
        },
        data: data,
      });

      return await this.memberOnSchoolRepository.updateMemberOnSchool({
        query: { id: memberOnSchool.id },
        data: data,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteMemberOnSchool(
    request: RequestDeleteMemberOnSchool,
  ): Promise<void> {
    const memberOnSchool = await this.prisma.memberOnSchool.findUnique({
      where: { ...request },
    });
    if (!memberOnSchool) {
      throw new NotFoundException(
        `MemberOnSchool with ID ${request.id} not found`,
      );
    }

    await this.prisma.memberOnSchool.delete({
      where: { ...request },
    });

    // const userId = memberOnSchool.userId;

    // Check if there are other MemberOnSchool entries for this user
    // const remainingEntries = await this.prisma.memberOnSchool.findMany({
    //   where: { userId },
    // });

    // // If there are no remaining entries, delete the user
    // if (remainingEntries.length === 0) {
    //   await this.prisma.user.delete({
    //     where: { id: userId },
    //   });
    // }
  }
}
