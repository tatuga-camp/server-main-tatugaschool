import { StudentOnGroupRepository } from './../student-on-group/student-on-group.repository';
import { UnitOnGroupRepository } from './../unit-on-group/unit-on-group.repository';
import { SubjectService } from './../subject/subject.service';
import { GroupOnSubjectRepository } from './group-on-subject.repository';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GroupOnSubject,
  StudentOnGroup,
  UnitOnGroup,
  User,
} from '@prisma/client';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Injectable()
export class GroupOnSubjectService {
  private logger: Logger;
  groupOnSubjectRepository: GroupOnSubjectRepository;
  private unitOnGroupRepository: UnitOnGroupRepository;
  private studentOnGroupRepository: StudentOnGroupRepository;
  constructor(
    private prisma: PrismaService,
    private subjectService: SubjectService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.logger = new Logger(GroupOnSubjectService.name);
    this.groupOnSubjectRepository = new GroupOnSubjectRepository(this.prisma);
    this.unitOnGroupRepository = new UnitOnGroupRepository(this.prisma);
    this.studentOnGroupRepository = new StudentOnGroupRepository(this.prisma);
  }

  async getGroupOnSubjects(
    dto: { subjectId: string },
    user: User,
  ): Promise<GroupOnSubject[]> {
    try {
      const subject = await this.subjectService.subjectRepository.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('SubjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: subject.id,
      });

      return this.groupOnSubjectRepository.findMany({
        where: {
          subjectId: dto.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getGroupOnSubject(
    dto: { groupOnSubjectId: string },
    user: User,
  ): Promise<
    GroupOnSubject & {
      units: (UnitOnGroup & { students: StudentOnGroup[] })[];
    }
  > {
    try {
      const groupOnSubject = await this.groupOnSubjectRepository.findUnique({
        where: {
          id: dto.groupOnSubjectId,
        },
      });

      if (!groupOnSubject) {
        throw new NotFoundException('groupOnSubjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: groupOnSubject.subjectId,
      });
      const [units, students] = await Promise.all([
        this.unitOnGroupRepository.findMany({
          where: {
            groupOnSubjectId: groupOnSubject.id,
          },
        }),
        this.studentOnGroupRepository.findMany({
          where: {
            groupOnSubjectId: groupOnSubject.id,
          },
        }),
      ]);

      return {
        ...groupOnSubject,
        units: units.map((u) => {
          return {
            ...u,
            students: students.filter((s) => s.unitOnGroupId === u.id),
          };
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: {
      query: {
        groupOnSubjectId: string;
      };
      body: { title: string; description?: string };
    },
    user: User,
  ): Promise<GroupOnSubject> {
    try {
      const groupOnSubject = await this.groupOnSubjectRepository.findUnique({
        where: {
          id: dto.query.groupOnSubjectId,
        },
      });

      if (!groupOnSubject) {
        throw new NotFoundException('groupOnSubjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: groupOnSubject.subjectId,
      });

      return await this.groupOnSubjectRepository.update({
        where: {
          id: groupOnSubject.id,
        },
        data: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: { groupOnSubjectId: string },
    user: User,
  ): Promise<GroupOnSubject> {
    try {
      const groupOnSubject = await this.groupOnSubjectRepository.findUnique({
        where: {
          id: dto.groupOnSubjectId,
        },
      });

      if (!groupOnSubject) {
        throw new NotFoundException('groupOnSubjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: groupOnSubject.subjectId,
      });

      return await this.groupOnSubjectRepository.delete({
        groupOnSubjectId: groupOnSubject.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
