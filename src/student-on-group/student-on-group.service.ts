import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { UnitOnGroupService } from './../unit-on-group/unit-on-group.service';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnGroupRepository } from './student-on-group.repository';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentOnGroup, User } from '@prisma/client';
import { ReorderStudentOnGroupDto, UpdateStudentOnGroupDto } from './dto';

@Injectable()
export class StudentOnGroupService {
  private logger: Logger;
  studentOnGroupRepository: StudentOnGroupRepository;
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private unitOnGroupService: UnitOnGroupService,
    private studentOnSubjectService: StudentOnSubjectService,
  ) {
    this.logger = new Logger(StudentOnGroupService.name);
    this.studentOnGroupRepository = new StudentOnGroupRepository(this.prisma);
  }

  async create(
    dto: { unitOnGroupId: string; studentOnSubjectId: string },
    user: User,
  ): Promise<StudentOnGroup> {
    try {
      const [unit, studentOnSubject] = await Promise.all([
        this.unitOnGroupService.unitOnGroupRepository.findUnique({
          where: {
            id: dto.unitOnGroupId,
          },
        }),
        this.studentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectById(
          { studentOnSubjectId: dto.studentOnSubjectId },
        ),
      ]);

      if (!unit || !studentOnSubject) {
        throw new BadRequestException('Unit or Student ID is invaild');
      }

      if (studentOnSubject.subjectId !== unit.subjectId) {
        throw new BadRequestException(
          'SubjectId of both student and unit should be the same',
        );
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: unit.subjectId,
      });

      return await this.studentOnGroupRepository.create({
        data: {
          ...dto,
          title: studentOnSubject.title,
          firstName: studentOnSubject.firstName,
          lastName: studentOnSubject.lastName,
          photo: studentOnSubject.photo,
          blurHash: studentOnSubject.blurHash,
          number: studentOnSubject.number,
          schoolId: studentOnSubject.schoolId,
          subjectId: studentOnSubject.subjectId,
          groupOnSubjectId: unit.groupOnSubjectId,
          studentId: studentOnSubject.studentId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(
    dto: ReorderStudentOnGroupDto,
    user: User,
  ): Promise<StudentOnGroup[]> {
    try {
      const studentOnGroup = await this.studentOnGroupRepository.findUnique({
        where: {
          id: dto.studentOnGroupIds[0],
        },
      });

      if (!studentOnGroup) {
        throw new NotFoundException('One of the unitOnGroupId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnGroup.subjectId,
      });

      const update = await Promise.allSettled(
        dto.studentOnGroupIds.map((value, index) => {
          return this.studentOnGroupRepository.update({
            where: {
              id: value,
            },
            data: {
              order: index,
            },
          });
        }),
      );
      return update.filter((f) => f.status === 'fulfilled').map((f) => f.value);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStudentOnGroupDto,
    user: User,
  ): Promise<StudentOnGroup> {
    try {
      const studentOnGroup = await this.studentOnGroupRepository.findUnique({
        where: {
          id: dto.query.studentOnGroupId,
        },
      });

      if (!studentOnGroup) {
        throw new NotFoundException('One of the unitOnGroupId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnGroup.subjectId,
      });

      return await this.studentOnGroupRepository.update({
        where: {
          id: dto.query.studentOnGroupId,
        },
        data: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async delete(
    dto: { studentOnGroupId: string },
    user: User,
  ): Promise<StudentOnGroup> {
    try {
      const studentOnGroup = await this.studentOnGroupRepository.findUnique({
        where: {
          id: dto.studentOnGroupId,
        },
      });

      if (!studentOnGroup) {
        throw new NotFoundException('One of the unitOnGroupId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnGroup.subjectId,
      });

      return await this.studentOnGroupRepository.delete({
        where: {
          id: studentOnGroup.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
