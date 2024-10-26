import { EmailService } from './../email/email.service';
import {
  SchoolRepository,
  SchoolRepositoryType,
} from './../school/school.repository';
import {
  BadRequestException,
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
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository, UserRepositoryType } from '../users/users.repository';
import { GoogleStorageService } from '../google-storage/google-storage.service';

@Injectable()
export class MemberOnSchoolService {
  private logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  private userRepository: UserRepositoryType;
  private schoolRepository: SchoolRepositoryType;
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
    this.userRepository = new UserRepository(prisma);
    this.schoolRepository = new SchoolRepository(prisma, googleStorageService);
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

      if (!memberOnSchool || memberOnSchool.status !== 'ACCEPT') {
        throw new ForbiddenException(
          'Access denied: User is not a member of the school',
        );
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMemberOnSchoolByUserId(user: User) {
    try {
      return await this.memberOnSchoolRepository.getByUserId({
        userId: user.id,
      });
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
      return await this.memberOnSchoolRepository.getAllMemberOnSchoolsBySchoolId(
        dto,
      );
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
          'No School Found with this schoolId, Please check the schoolId again',
        );
      }

      const member = await this.validateAccess({
        schoolId: dto.schoolId,
        user: user,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('Access denied: User is not an admin');
      }

      const newMember = await this.userRepository.findByEmail({
        email: dto.email,
      });

      if (!newMember) {
        throw new NotFoundException('No user found with this email');
      }

      const existingMemberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: newMember.email,
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
        blurHash: newMember.blurHash,
        schoolId: school.id,
      });

      const emailHTML = `
         <body style="background-color: #f8f9fa;">
       <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/development-tatuga-school/public/logo.avif" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
          You have been invited to join the school ${school.title} on Tatuga School
           </h1>
           <p style="margin: 0 0 16px;">
           Hello ${newMember.firstName},<br>
            You have been invited to join the school ${school.title} on Tatuga School. Please click the link below to accept the invitation.
           </p>
            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${process.env.CLIENT_URL}/invite/${create.id}">Click</a>
         </div>
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/development-tatuga-school/public/branner.png" />
         <div style="color: #6c757d; text-align: center; margin: 24px 0;">
         Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
         288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีมา 30000<br>
         โทร 0610277960 Email: permlap@tatugacamp.com<br>
         </div>
       </div>
     </body>
     `;

      this.emailService.sendMail({
        to: newMember.email,
        subject: 'Invite to join school - Tatuga School',
        html: emailHTML,
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
      delete dto.body.status;
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException(`ไม่พบ MemberOnSchool ที่ต้องการอัพเดท`);
      }

      if (memberOnSchool.status !== 'ACCEPT') {
        throw new ForbiddenException(
          "You can't update this member because the member has not accepted the invitation",
        );
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

  async AcceptMemberOnSchool(
    dto: UpdateMemberOnSchoolDto,
    user: User,
  ): Promise<{
    message: string;
  }> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException('Not found member on school');
      }

      if (memberOnSchool.userId !== user.id) {
        throw new ForbiddenException(
          'You dont have permission to accept this invitation',
        );
      }
      if (dto.body.status === 'ACCEPT') {
        const acceptMember =
          await this.memberOnSchoolRepository.updateMemberOnSchool({
            query: { id: dto.query.memberOnSchoolId },
            data: {
              status: 'ACCEPT',
            },
          });
        return { message: 'Accept success' };
      } else if (dto.body.status === 'REJECT') {
        const rejectMember = await this.memberOnSchoolRepository.delete({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });
        return { message: 'Reject success' };
      } else {
        throw new BadRequestException('Invalid status');
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteMemberOnSchool(
    dto: DeleteMemberOnSchoolDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.memberOnSchoolId,
        });

      if (!memberOnSchool) {
        throw new NotFoundException('Not found member on school');
      }

      const member = await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException("You don't have permission to delete");
      }

      return await this.memberOnSchoolRepository.delete({
        memberOnSchoolId: dto.memberOnSchoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
