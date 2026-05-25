import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
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
import { SchoolService } from './../school/school.service';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolByIdDto,
  GetMemberOnSchoolsDto,
  QueryMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchoolRepository } from './member-on-school.repository';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Injectable()
export class MemberOnSchoolService {
  private logger: Logger;
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
    this.logger = new Logger(MemberOnSchoolService.name);
  }

  async validateAccess({
    user,
    schoolId,
  }: {
    user: UserJwtPayload;
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
    try {
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
        this.pushService.sendNotification(
          subscription.data as PushSubscription,
          {
            title: title,
            body: body,
            url,
            groupId: schoolId,
          },
        ),
      );

      await Promise.all(notifications);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMemberOnSchoolByUserId(
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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
    user: UserJwtPayload,
  ): Promise<MemberOnSchool[]> {
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

  private async sendInviteEmail(
    member: MemberOnSchool,
    school: School,
  ): Promise<void> {
    const greeting = member.firstName ? `Hello ${member.firstName},` : 'Hello,';

    const ctaBlock = member.invitationToken
      ? `
        <p style="margin: 0 0 16px;">
          ${greeting}<br>
          You have been invited to join the school "${school.title}" on Tatuga School.
          Click the button below to create your account and join. This invitation expires in 7 days.
        </p>
        <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${process.env.CLIENT_URL}/auth/sign-up?invitationToken=${member.invitationToken}">Create Account & Join</a>
      `
      : `
        <p style="margin: 0 0 16px;">
          ${greeting}<br>
          You have been invited to join the school ${school.title} on Tatuga School. Please click the link below to accept the invitation.
        </p>
        <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${process.env.CLIENT_URL}/account?menu=Invitations">Click</a>
      `;

    const emailHTML = `
       <body style="background-color: #f8f9fa;">
     <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
       <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
       <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
         <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
        You have been invited to join the school ${school.title} on Tatuga School
         </h1>
         ${ctaBlock}
         <p style="margin: 0 0 16px; color: #6c757d">
          Do not reply to this email, this email is automatically generated.
          If you have any questions, please contact this email permlap@tatugacamp.com or the address below
         </p>
       </div>
       <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
       <div style="color: #6c757d; text-align: center; margin: 24px 0;">
       Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
       288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีีมา 30000<br>
       โทร 0610277960 Email: permlap@tatugacamp.com<br>
       </div>
     </div>
   </body>
   `;

    await this.emailService.sendMail({
      to: member.email,
      subject: 'Invite to join school - Tatuga School',
      html: emailHTML,
    });
  }

  async createMemberOnSchool(
    dto: CreateMemberOnSchoolDto,
    user: UserJwtPayload,
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
        where: { schoolId: school.id },
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

      const existingInvite =
        await this.memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
          email: dto.email,
          schoolId: dto.schoolId,
        });

      // ----- Dedupe / re-send path -----
      if (existingInvite) {
        if (existingInvite.status === 'ACCEPT') {
          throw new ForbiddenException('User is already a member');
        }
        if (existingInvite.invitationToken) {
          const refreshed = new Date();
          refreshed.setDate(refreshed.getDate() + 7);
          await this.memberOnSchoolRepository.updateMemberOnSchool({
            query: { id: existingInvite.id },
            data: { invitationTokenExpiresAt: refreshed } as any,
          });
        }
        await this.sendInviteEmail(existingInvite, school);
        return existingInvite;
      }

      const existingUser = await this.userRepository.findByEmail({
        email: dto.email,
      });

      let create: MemberOnSchool;

      if (existingUser) {
        // ----- Flow A: existing user -----
        create = await this.memberOnSchoolRepository.create({
          status: 'PENDDING',
          role: dto.role,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          photo: existingUser.photo,
          phone: existingUser.phone,
          userId: existingUser.id,
          blurHash: existingUser.blurHash,
          schoolId: school.id,
          invitationToken: null,
          invitationTokenExpiresAt: null,
        });
      } else {
        // ----- Flow B: not-yet-registered email -----
        const token = crypto.randomBytes(32).toString('hex');
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7);

        create = await this.memberOnSchoolRepository.create({
          status: 'PENDDING',
          role: dto.role,
          firstName: null,
          lastName: null,
          email: dto.email,
          photo: null,
          phone: null,
          userId: null,
          blurHash: null,
          schoolId: school.id,
          invitationToken: token,
          invitationTokenExpiresAt: expiration,
        });
      }

      await this.sendInviteEmail(create, school);

      await this.notifyMembers({
        members: [create],
        schoolId: dto.schoolId,
        title: `Your school ${school.title} has a new member`,
        body: `${create.firstName ?? create.email} has been invited to join the school`,
        url: new URL(`${process.env.CLIENT_URL}/account?menu=Invitations`),
      }).catch((error) => console.log(error));

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getInvitationByToken(token: string): Promise<{
    email: string;
    role: MemberRole;
    schoolTitle: string;
    schoolLogo: string;
  }> {
    try {
      const invite =
        await this.memberOnSchoolRepository.getMemberOnSchoolByInvitationToken({
          token,
        });
      if (!invite) {
        throw new NotFoundException('Invitation not found');
      }
      if (
        !invite.invitationTokenExpiresAt ||
        invite.invitationTokenExpiresAt < new Date()
      ) {
        throw new ForbiddenException('Invitation expired');
      }
      if (invite.status !== 'PENDDING' || invite.userId !== null) {
        throw new ConflictException('Invitation already used');
      }
      const school = await this.schoolService.schoolRepository.getSchoolById({
        schoolId: invite.schoolId,
      });
      return {
        email: invite.email,
        role: invite.role,
        schoolTitle: school.title,
        schoolLogo: school.logo,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateMemberOnSchool(
    dto: UpdateMemberOnSchoolDto,
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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

      const userFavorite = await this.userRepository.findById({
        id: targetDeleteMember.userId,
      });

      if (userFavorite.favoritSchool === targetDeleteMember.schoolId) {
        await this.userRepository.update({
          where: { id: targetDeleteMember.userId },
          data: { favoritSchool: null },
        });
      }

      return deleteMemberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
