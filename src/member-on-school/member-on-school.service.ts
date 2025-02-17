import { SchoolService } from './../school/school.service';
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
import { MemberOnSchool, MemberRole, School, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from '../users/users.repository';
import { PushSubscription } from '../web-push/interfaces';
import { PushService } from '../web-push/push.service';
import { EmailService } from './../email/email.service';
import { SchoolRepository } from './../school/school.repository';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolByIdDto,
  GetMemberOnSchoolsDto,
  QueryMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchoolRepository } from './member-on-school.repository';

@Injectable()
export class MemberOnSchoolService {
  private logger: Logger = new Logger(MemberOnSchoolService.name);
  memberOnSchoolRepository: MemberOnSchoolRepository;
  private userRepository: UserRepository;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    @Inject(forwardRef(() => SchoolService))
    private schoolService: SchoolService,
  ) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
    this.userRepository = new UserRepository(prisma);
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

  private async notifyMembers({
    schoolId,
    title,
    body,
    url,
    members,
  }: {
    schoolId: string;
    title: string;
    body: string;
    url: URL;
    members: MemberOnSchool[];
  }): Promise<void> {
    const users = await this.userRepository.findMany({
      where: {
        OR: members.map((member) => ({ id: member.userId })),
      },
    });

    const notificaitons = await this.pushService.pushRepository.findMany({
      where: {
        OR: users.map((user) => ({ userId: user.id })),
      },
    });
    const notifications = notificaitons.map((subscription) =>
      this.pushService.sendNotification(subscription.data as PushSubscription, {
        title: title,
        body: body,
        url,
      }),
    );

    await Promise.all(notifications);
  }

  async getMemberOnSchoolByUserId(
    user: User,
  ): Promise<(MemberOnSchool & { school: School })[]> {
    try {
      const memberOnSchools = await this.memberOnSchoolRepository.getByUserId({
        userId: user.id,
      });
      const school = await this.schoolService.schoolRepository.findMany({
        where: {
          OR: memberOnSchools.map((m) => ({ id: m.schoolId })),
        },
      });

      return memberOnSchools.map((member) => {
        const schoolData = school.find((s) => s.id === member.schoolId);
        return {
          ...member,
          school: schoolData,
        };
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

  async getAllMemberOnSchools(
    dto: GetMemberOnSchoolsDto & QueryMemberOnSchoolDto,
    user: User,
  ) {
    try {
      await this.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });
      return await this.memberOnSchoolRepository.findMany({
        where: {
          schoolId: dto.schoolId,
        },
      });
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
      const school = await this.schoolService.schoolRepository.getSchoolById({
        schoolId: dto.schoolId,
      });

      if (!school) {
        throw new NotFoundException(
          'No School Found with this schoolId, Please check the schoolId again',
        );
      }

      const totalMembers = await this.memberOnSchoolRepository.findMany({
        where: {
          schoolId: school.id,
        },
      });

      await this.schoolService.ValidateLimit(
        school,
        'members',
        totalMembers.length + 1,
      );

      const member = await this.validateAccess({
        schoolId: dto.schoolId,
        user: user,
      });

      if (member.role !== MemberRole.ADMIN && dto.role === 'ADMIN') {
        throw new ForbiddenException(
          "You don't have permission to invite other user as a admin",
        );
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
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${process.env.CLIENT_URL}/account?menu=Invitations">Click</a>
         </div>
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.cloud.google.com/public-tatugaschool/branner.png" />
         <div style="color: #6c757d; text-align: center; margin: 24px 0;">
         Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
         288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีีมา 30000<br>
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

      await this.notifyMembers({
        members: [create],
        schoolId: dto.schoolId,
        title: `Your school ${school.title} has a new member`,
        body: `${newMember.firstName} ${newMember.lastName} has been invited to join the school`,
        url: new URL(`${process.env.CLIENT_URL}/account?menu=Invitations`),
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
        throw new NotFoundException(
          `MemberOnSchool with ID ${dto.query.memberOnSchoolId} not found`,
        );
      }

      const member = await this.validateAccess({
        user: user,
        schoolId: memberOnSchool.schoolId,
      });

      if (member.role !== MemberRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานนี้');
      }

      const updateMemberOnSchool =
        await this.memberOnSchoolRepository.updateMemberOnSchool({
          query: { id: memberOnSchool.id },
          data: dto.body,
        });

      await this.notifyMembers({
        members: [updateMemberOnSchool],
        schoolId: memberOnSchool.schoolId,
        title: `Your school has updated member`,
        body: `${memberOnSchool.firstName} ${memberOnSchool.lastName} has been updated`,
        url: new URL(
          `${process.env.CLIENT_URL}/school/${memberOnSchool.schoolId}`,
        ),
      });

      return updateMemberOnSchool;
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
          "You don't have permission to accept this invitation",
        );
      }

      const memberOnSchools = await this.memberOnSchoolRepository.findMany({
        where: {
          schoolId: memberOnSchool.schoolId,
          status: 'ACCEPT',
        },
      });
      if (dto.body.status === 'ACCEPT') {
        await this.memberOnSchoolRepository.updateMemberOnSchool({
          query: { id: dto.query.memberOnSchoolId },
          data: {
            status: 'ACCEPT',
          },
        });

        await this.notifyMembers({
          members: memberOnSchools.filter((m) => m.userId !== user.id),
          schoolId: memberOnSchool.schoolId,
          title: `Your school has a new member`,
          body: `${memberOnSchool.firstName} ${memberOnSchool.lastName} has been accepted to join the school`,
          url: new URL(
            `${process.env.CLIENT_URL}/school/${memberOnSchool.schoolId}`,
          ),
        });
        return { message: 'Accept success' };
      } else if (dto.body.status === 'REJECT') {
        await this.memberOnSchoolRepository.delete({
          memberOnSchoolId: dto.query.memberOnSchoolId,
        });

        await this.notifyMembers({
          members: memberOnSchools.filter((m) => m.userId !== user.id),
          schoolId: memberOnSchool.schoolId,
          title: `Your school has rejected member`,
          body: `${memberOnSchool.firstName} ${memberOnSchool.lastName} has been rejected to join the school`,
          url: new URL(
            `${process.env.CLIENT_URL}/school/${memberOnSchool.schoolId}`,
          ),
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
  ): Promise<MemberOnSchool> {
    try {
      const targetDeleteMember =
        await this.memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: dto.memberOnSchoolId,
        });

      if (!targetDeleteMember) {
        throw new NotFoundException('Not found member on school');
      }

      const member = await this.validateAccess({
        user: user,
        schoolId: targetDeleteMember.schoolId,
      });

      const checksExists =
        await this.memberOnSchoolRepository.getAllMemberOnSchoolsBySchoolId({
          schoolId: targetDeleteMember.schoolId,
        });

      // Check if the user is not an admin and the user is not the target user to delete
      if (
        member.role !== MemberRole.ADMIN &&
        user.id !== targetDeleteMember.userId
      ) {
        throw new ForbiddenException("You don't have permission to delete");
      }

      if (
        member.role === MemberRole.ADMIN &&
        checksExists.filter((m) => m.role === 'ADMIN').length === 1 &&
        user.id === targetDeleteMember.userId
      ) {
        throw new BadRequestException(
          "You are the last admin in this school you can't delete yourself",
        );
      }

      const deleteMemberOnSchool = await this.memberOnSchoolRepository.delete({
        memberOnSchoolId: dto.memberOnSchoolId,
      });

      await this.notifyMembers({
        members: checksExists
          .filter((m) => m.userId !== user.id)
          .filter((m) => m.status === 'ACCEPT'),
        schoolId: targetDeleteMember.schoolId,
        title: `Your school has removed member`,
        body: `${targetDeleteMember.firstName} ${targetDeleteMember.lastName} has been removed from the school`,
        url: new URL(
          `${process.env.CLIENT_URL}/school/${targetDeleteMember.schoolId}`,
        ),
      });

      return deleteMemberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
