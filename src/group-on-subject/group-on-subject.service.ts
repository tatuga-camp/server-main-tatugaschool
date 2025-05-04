import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
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
  StudentOnSubject,
  UnitOnGroup,
  User,
} from '@prisma/client';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { CreateGroupOnSubjectDto } from './dto';

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
    private studentOnSubjectService: StudentOnSubjectService,
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

  async create(
    dto: CreateGroupOnSubjectDto,
    user: User,
  ): Promise<
    GroupOnSubject & {
      units: (UnitOnGroup & { students: StudentOnGroup[] })[];
    }
  > {
    try {
      const subject =
        await this.subjectService.subjectRepository.getSubjectById({
          subjectId: dto.subjectId,
        });

      if (!subject) {
        throw new BadRequestException('subjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: subject.id,
        userId: user.id,
      });

      const groupOnSubject = await this.groupOnSubjectRepository.create({
        data: {
          ...dto,
          schoolId: subject.schoolId,
        },
      });
      const studentOnSubjects =
        await this.studentOnSubjectService.studentOnSubjectRepository.findMany({
          where: {
            subjectId: subject.id,
            isActive: true,
          },
        });

      const groups = this.groupStudentsRandomly(studentOnSubjects, 4);

      const create = await Promise.all(
        groups.map(async (group, index) => {
          const unit = await this.unitOnGroupRepository.create({
            data: {
              title: `Group ${index + 1}`,
              description: `this is group number ${index + 1} `,
              icon: '',
              schoolId: subject.schoolId,
              subjectId: subject.id,
              order: index,
              groupOnSubjectId: groupOnSubject.id,
            },
          });
          const students = await Promise.all(
            group.map((studentOnSubject, index) =>
              this.studentOnGroupRepository.create({
                data: {
                  order: index,
                  studentOnSubjectId: studentOnSubject.id,
                  unitOnGroupId: unit.id,
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
              }),
            ),
          );
          return {
            ...unit,
            students: students,
          };
        }),
      );

      return {
        ...groupOnSubject,
        units: create,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  shuffleArray<T>(array: T[]): T[] {
    // Create a copy to avoid modifying the original array
    const shuffledArray = [...array];
    let currentIndex = shuffledArray.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
        shuffledArray[randomIndex],
        shuffledArray[currentIndex],
      ];
    }

    return shuffledArray;
  }

  groupStudentsRandomly(
    students: StudentOnSubject[],
    numberOfGroups: number,
  ): StudentOnSubject[][] {
    // --- Input Validation ---
    if (!students || students.length === 0) {
      throw new BadRequestException("Input 'students' array cannot be empty.");
    }
    if (!Number.isInteger(numberOfGroups) || numberOfGroups <= 0) {
      throw new BadRequestException(
        "'numberOfGroups' must be a positive integer.",
      );
    }
    if (numberOfGroups > students.length) {
      console.warn(
        'Number of groups is greater than the number of students. ' +
          'Each student will be in their own group.',
      );
      numberOfGroups = students.length; // Adjust to have each student in a group
    }

    // --- Shuffling ---
    const shuffledStudents = this.shuffleArray(students);

    // --- Grouping ---
    const totalStudents = shuffledStudents.length;
    const baseGroupSize = Math.floor(totalStudents / numberOfGroups);
    let remainingStudents = totalStudents % numberOfGroups;

    const groups: StudentOnSubject[][] = Array.from(
      { length: numberOfGroups },
      () => [],
    );

    let studentIndex = 0;
    for (let i = 0; i < numberOfGroups; i++) {
      const groupSize = baseGroupSize + (remainingStudents > 0 ? 1 : 0);
      groups[i] = shuffledStudents.slice(
        studentIndex,
        studentIndex + groupSize,
      );
      studentIndex += groupSize;
      if (remainingStudents > 0) {
        remainingStudents--;
      }
    }

    return groups;
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
