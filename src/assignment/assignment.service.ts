import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Assignment,
  FileOnAssignment,
  Prisma,
  Student,
  StudentOnAssignment,
  User,
} from '@prisma/client';
import * as cheerio from 'cheerio';
import { Workbook } from 'exceljs';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { FileAssignmentRepository } from '../file-assignment/file-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SkillOnAssignmentService } from './../skill-on-assignment/skill-on-assignment.service';
import { SkillService } from './../skill/skill.service';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { VectorService } from './../vector/vector.service';
import { AssignmentRepository } from './assignment.repository';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  ReorderAssignmentDto,
  UpdateAssignmentDto,
} from './dto';

@Injectable()
export class AssignmentService {
  private logger: Logger = new Logger(AssignmentService.name);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
    this.googleStorageService,
  );
  private fileAssignmentRepository: FileAssignmentRepository =
    new FileAssignmentRepository(this.prisma, this.googleStorageService);
  private studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  private studentOnSubjectRepository: StudentOnSubjectRepository =
    new StudentOnSubjectRepository(this.prisma, this.googleStorageService);

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private studentOnSubjectService: StudentOnSubjectService,
    private skillService: SkillService,
    private skillOnAssignmentService: SkillOnAssignmentService,
  ) {}

  async getAssignmentById(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<Assignment & { files: FileOnAssignment[] }> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      const files = await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: assignment.id,
      });

      return { ...assignment, files };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAssignmentBySubjectId(
    dto: GetAssignmentBySubjectIdDto,
    user?: User | undefined,
    student?: Student | undefined,
  ): Promise<
    (Assignment & {
      files: FileOnAssignment[];
      studentOnAssignment?: StudentOnAssignment;
    })[]
  > {
    try {
      if (user) {
        const member = await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });
      }
      let studentsOnAssignments: StudentOnAssignment[] = [];
      if (student) {
        const studentOnSubject =
          await this.studentOnSubjectRepository.findFirst({
            where: {
              studentId: student.id,
              subjectId: dto.subjectId,
            },
          });

        studentsOnAssignments =
          await this.studentOnAssignmentRepository.findMany({
            where: {
              subjectId: dto.subjectId,
              studentOnSubjectId: studentOnSubject.id,
              isAssigned: true,
            },
          });

        if (!studentOnSubject) {
          throw new ForbiddenException('Student not enrolled in this subject');
        }
      }

      let assignments = await this.assignmentRepository
        .findMany({
          where: {
            ...(student
              ? {
                  id: {
                    in: studentsOnAssignments.map((s) => s?.assignmentId),
                  },
                }
              : {
                  subjectId: dto.subjectId,
                }),
          },
        })
        .then((assignments) => {
          return assignments.map((assignment) => {
            delete assignment.vector;
            return {
              ...assignment,
            };
          });
        });

      if (student) {
        assignments = assignments.filter(
          (assignment) => assignment.status === 'Published',
        );
      }

      const files = await this.fileAssignmentRepository.findMany({
        where: {
          assignmentId: {
            in: assignments.map((assignment) => assignment.id),
          },
        },
      });

      return assignments.map((assignment) => {
        return {
          ...assignment,
          files: files.filter((file) => file.assignmentId === assignment.id),
          //if request come from student attrach studentOnAssignment
          studentOnAssignment:
            studentsOnAssignments.length > 0
              ? studentsOnAssignments.find(
                  (s) => s.assignmentId === assignment.id,
                )
              : undefined,
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getOverviewScoreOnAssignment(
    dto: { subjectId: string },
    user: User,
  ): Promise<{ assignment: Assignment; students: StudentOnAssignment[] }[]> {
    try {
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const assignments = await this.assignmentRepository.findMany({
        where: { subjectId: dto.subjectId, status: 'Published' },
      });

      const studentsOnSubjects =
        await this.studentOnAssignmentRepository.findMany({
          where: { subjectId: dto.subjectId },
        });

      return assignments.map((assignment) => {
        return {
          assignment,
          students: studentsOnSubjects.filter(
            (student) => student.assignmentId === assignment.id,
          ),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createAssignment(
    dto: CreateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      if (dto.type === 'Assignment' && (!dto.beginDate || !dto.maxScore)) {
        throw new BadRequestException(
          'Assign at and max score are required for assignment ',
        );
      }
      if (dto.type === 'Material') {
        delete dto?.maxScore;
        delete dto?.dueDate;
        delete dto?.weight;
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const assignment = await this.assignmentRepository.create({
        data: {
          ...dto,
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: { subjectId: assignment.subjectId },
      });

      const createStudentOnAssignments = studentOnSubjects.map(
        (student): Prisma.StudentOnAssignmentCreateManyInput => {
          return {
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            number: student.number,
            blurHash: student.blurHash,
            photo: student.photo,
            schoolId: student.schoolId,
            assignmentId: assignment.id,
            studentId: student.studentId,
            studentOnSubjectId: student.id,
            subjectId: student.subjectId,
          };
        },
      );

      await this.studentOnAssignmentRepository.createMany({
        data: createStudentOnAssignments,
      });
      this.BackgroudEmbedingAssignment(assignment);
      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async BackgroudEmbedingAssignment(assignment: Assignment) {
    try {
      await this.EmbedingAssignment(assignment.id);

      const skills = await this.skillService.findByVectorSearch({
        assignmentId: assignment.id,
      });

      await Promise.allSettled(
        skills.map((skill) =>
          this.skillOnAssignmentService.skillOnAssignmentRepository.create({
            skillId: skill.id,
            assignmentId: assignment.id,
            subjectId: assignment.subjectId,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  async EmbedingAssignment(assignmentId: string) {
    try {
      let text: string = '';
      const assignment = await this.assignmentRepository.getById({
        assignmentId: assignmentId,
      });

      text += assignment.title;

      // extract text from html
      const doc = cheerio.load(assignment.description);
      text += doc('body').text();
      const files = await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: assignment.id,
      });

      if (files.length > 0) {
        // get text from file using AI to extract text and summarize
      }

      const vectors = await this.vectorService.embbedingText(text);
      return await this.assignmentRepository.update({
        where: { id: assignmentId },
        data: {
          vector: vectors.predictions[0].embeddings.values,
          vectorResouce: text,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(dto: ReorderAssignmentDto, user: User): Promise<Assignment[]> {
    try {
      const assignments = await this.assignmentRepository.findMany({
        where: {
          id: {
            in: dto.assignmentIds,
          },
        },
      });

      if (assignments.length !== dto.assignmentIds.length) {
        throw new NotFoundException('Assignment not found');
      }

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignments[0].subjectId,
      });

      const sortAssignments = dto.assignmentIds.map((assignmentId, index) => {
        return this.assignmentRepository.update({
          where: { id: assignmentId },
          data: { order: index + 1 },
        });
      });

      const sortRequset = await Promise.allSettled(sortAssignments);

      const successSort = sortRequset
        .filter((sort) => sort.status === 'fulfilled')
        .map((sort) => sort.value);

      return successSort.map((sort) => {
        delete sort.vector;
        return sort;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateAssignment(
    dto: UpdateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.query.assignmentId,
      });
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      return await this.assignmentRepository.update({
        where: {
          id: dto.query.assignmentId,
        },
        data: {
          ...dto.data,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteAssignment(
    dto: DeleteAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });
      await this.assignmentRepository.delete(dto);

      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async exportExcel(subjectId: string, user: User) {
    const listStudentOnSubject =
      await this.studentOnSubjectService.getStudentOnSubjectsBySubjectId(
        { subjectId },
        user,
      );
    const listAssignment = await this.getOverviewScoreOnAssignment(
      { subjectId },
      user,
    );

    const data = {
      header: [
        'Number',
        'Student Name',
        ...listAssignment.map((assignment) =>
          assignment.assignment.weight
            ? `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points / ${assignment.assignment.weight}% `
            : `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points`,
        ),
      ],
      data: await Promise.all(
        listStudentOnSubject
          .sort((a, b) => Number(a.number) - Number(b.number))
          .map((student) => {
            return [
              student.number,
              student.firstName + ' ' + student.lastName,
              ...listAssignment.map((assignment) => {
                const studentOnAssignment = assignment.students.find(
                  (studentOnAssignment) =>
                    studentOnAssignment.studentOnSubjectId === student.id,
                );

                if (!studentOnAssignment) {
                  return 'Student not assigned';
                }

                if (
                  !studentOnAssignment.score &&
                  studentOnAssignment.status !== 'REVIEWD'
                ) {
                  return 'No Work';
                }
                let score: string | number = 0;
                score = studentOnAssignment.score;
                const originalScore =
                  studentOnAssignment.score / assignment.assignment.maxScore;

                if (
                  assignment.assignment.weight !== null &&
                  studentOnAssignment.status === 'REVIEWD'
                ) {
                  score = (
                    originalScore * assignment.assignment.weight
                  ).toFixed(2);
                }
                return score;
              }),
            ];
          }),
      ),
    };

    const workbook = new Workbook();

    const worksheet = workbook.addWorksheet('Assignment');
    worksheet.addRow(data.header);
    worksheet.addRows(data.data);
    const firstRow = worksheet.getRow(1);
    const columA = worksheet.getColumn(1);
    const columB = worksheet.getColumn(2);
    columA.width = 10;
    columB.width = 35;
    columA.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    firstRow.font = { bold: true, size: 10 };
    firstRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    for (let i = 3; i <= listAssignment.length + 3; i++) {
      const column = worksheet.getColumn(i);
      column.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      column.width = 30;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  }
}
