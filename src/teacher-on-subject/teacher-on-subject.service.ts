import { EmailService } from '../email/email.service';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { TeacherOnSubjectRepository } from './teacher-on-subject.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeacherOnSubjectDto,
  DeleteTeacherOnSubjectDto,
  GetTeacherOnSubjectByIdDto,
  GetTeacherOnSubjectsBySubjectIdDto,
  GetTeacherOnSubjectsByTeacherIdDto,
  UpdateTeacherOnSubjectDto,
} from './dto';
import { TeacherOnSubject, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeacherOnSubjectService {
  logger: Logger = new Logger(TeacherOnSubjectService.name);
  teacherOnSubjectRepository: TeacherOnSubjectRepository;

  memberOnSchoolRepository: MemberOnSchoolRepository;
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(this.prisma);
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
  }

  async ValidateAccess({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }): Promise<void> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: subjectId,
        },
      });

      const memberOnSchool = await this.memberOnSchoolRepository.findFirst({
        where: {
          schoolId: subject.schoolId,
          userId: userId,
        },
      });

      if (!memberOnSchool || memberOnSchool?.status !== 'ACCEPT') {
        throw new ForbiddenException("You're not a member of this school");
      }

      if (memberOnSchool.role === 'ADMIN') {
        return;
      }

      const memberOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: userId,
          subjectId,
        });

      if (!memberOnSubject || memberOnSubject.status !== 'ACCEPT') {
        console.log(memberOnSubject);
        throw new ForbiddenException("You're not a teacher on this subject");
      }
      return;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async getTeacherOnSubjectById(dto: GetTeacherOnSubjectByIdDto, user: User) {
    try {
      const teacherOnSubject = await this.teacherOnSubjectRepository.getById({
        teacherOnSubjectId: dto.teacherOnSubjectId,
      });
      if (!teacherOnSubject) {
        throw new NotFoundException('Teacher on subject not found');
      }
      await this.ValidateAccess({
        userId: user.id,
        subjectId: teacherOnSubject.subjectId,
      });
      return teacherOnSubject;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async getTeacherOnSubjectBySubjectId(
    dto: GetTeacherOnSubjectsBySubjectIdDto,
    user: User,
  ) {
    try {
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getManyBySubjectId({
          subjectId: dto.subjectId,
        });

      await this.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return teacherOnSubject;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async getTeacherOnSubjectByUserId(
    dto: GetTeacherOnSubjectsByTeacherIdDto,
    user: User,
  ) {
    try {
      if (user.role !== 'ADMIN' && user.id !== dto.teacherId) {
        throw new ForbiddenException("You're not allowed to view this data");
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getManyByTeacherId({
          teacherId: dto.teacherId,
        });
      return teacherOnSubject;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async createTeacherOnSubject(dto: CreateTeacherOnSubjectDto, user: User) {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      const [memberOnSchool, targetMemberOnSchool] = await Promise.all([
        this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId({
          userId: user.id,
          schoolId: subject.schoolId,
        }),

        this.memberOnSchoolRepository.findFirst({
          where: {
            email: dto.email,
            schoolId: subject.schoolId,
          },
        }),
      ]);
      if (!memberOnSchool) {
        throw new ForbiddenException("You're not a member of this school");
      }
      if (memberOnSchool.status !== 'ACCEPT') {
        throw new ForbiddenException(
          "You're not a member of this school or your status is not accepted",
        );
      }

      if (!targetMemberOnSchool) {
        throw new ForbiddenException(
          'This user is not a member of this school, please invite this user to join the school first',
        );
      }
      if (targetMemberOnSchool.status !== 'ACCEPT') {
        throw new ForbiddenException(
          "this user is not a member of this school or the user's status is not accepted, please wait for the user to accept the invitation to join the school first",
        );
      }

      const memberOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: dto.subjectId,
        });

      if (!memberOnSubject && user.role !== 'ADMIN') {
        throw new ForbiddenException(
          "You're not a teacher on this subject or you're not an admin",
        );
      }

      const teacher = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      const create = await this.teacherOnSubjectRepository.create({
        role: dto.role,
        userId: teacher.id,
        subjectId: subject.id,
        status: 'ACCEPT',
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        photo: teacher.photo,
        blurHash: teacher.blurHash,
        phone: teacher.phone,
        schoolId: subject.schoolId,
      });

      const body = `
      <body style="background-color: #f8f9fa;">
      <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
        <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
        <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
          Invitation on subject ${subject.title} by ${user.firstName} ${user.lastName}
          </h1>
          <p style="margin: 0 0 16px;">
            You have been invited to teach <span style="font-weight: 500">${subject.title}</span> by ${user.firstName} ${user.lastName}
            Please check the invitation by clicking the button below
          </p>
           <p style="margin: 0 0 16px; color: #6c757d">
           Do not reply to this email, this email is automatically generated.
           If you have any questions, please contact this email permlap@tatugacamp.com or the address below
          </p>
            <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${this.config.get('CLIENT_URL')}/account/invitation">Check</a>
        </div>
        <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
        <div style="color: #6c757d; text-align: center; margin: 24px 0;">
        Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
        288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีมา 30000<br>
        โทร 0610277960 Email: permlap@tatugacamp.com<br>
        </div>
      </div>
    </body>
  `;

      this.emailService.sendMail({
        to: teacher.email,
        subject: 'Tatuga School : Invitation on subject',
        html: body,
      });

      return create;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async updateTeacherOnSubject(dto: UpdateTeacherOnSubjectDto, user: User) {
    try {
      const teacherOnSubject = await this.teacherOnSubjectRepository.getById({
        teacherOnSubjectId: dto.query.teacherOnSubjectId,
      });
      const memberOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: teacherOnSubject.subjectId,
        });

      if (!memberOnSubject) {
        throw new ForbiddenException('Unauthorized');
      }

      if (
        teacherOnSubject.userId !== user.id &&
        memberOnSubject.role !== 'ADMIN'
      ) {
        throw new ForbiddenException('Unauthorized');
      }

      const update = await this.teacherOnSubjectRepository.update({
        query: {
          teacherOnSubjectId: dto.query.teacherOnSubjectId,
        },
        body: {
          ...dto.body,
        },
      });

      if (dto.body.status === 'REJECT') {
        await this.teacherOnSubjectRepository.delete({
          teacherOnSubjectId: dto.query.teacherOnSubjectId,
        });
      }

      return update;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async DeleteTeacherOnSubject(dto: DeleteTeacherOnSubjectDto, user: User) {
    try {
      const teacherOnSubject = await this.teacherOnSubjectRepository.getById({
        teacherOnSubjectId: dto.teacherOnSubjectId,
      });

      if (!teacherOnSubject) {
        throw new NotFoundException('Teacher on subject does not exist');
      }
      const memberOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: teacherOnSubject.subjectId,
        });

      if (!memberOnSubject) {
        throw new ForbiddenException("You're not a teacher on this subject");
      }

      if (
        teacherOnSubject.userId !== user.id &&
        memberOnSubject.role !== 'ADMIN'
      ) {
        throw new ForbiddenException('You are not allowed to delete this data');
      }

      const exsitingTeacherOnSubjects =
        await this.teacherOnSubjectRepository.findMany({
          where: {
            subjectId: teacherOnSubject.subjectId,
          },
        });

      const filterAdmin = exsitingTeacherOnSubjects.filter(
        (t) => t.role === 'ADMIN',
      );

      const filterNonDuplicate = filterAdmin.filter(
        (t) => t.id !== teacherOnSubject.id,
      );

      if (filterNonDuplicate.length < 1) {
        throw new BadRequestException("You can't delete the last admin");
      }

      return await this.teacherOnSubjectRepository.delete({
        teacherOnSubjectId: dto.teacherOnSubjectId,
      });
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }
}
