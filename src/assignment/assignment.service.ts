import { ScoreOnStudentService } from './../score-on-student/score-on-student.service';
import { GradeService } from './../grade/grade.service';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Assignment,
  FileOnAssignment,
  GradeRange,
  Prisma,
  ScoreOnStudent,
  ScoreOnSubject,
  Skill,
  Student,
  StudentOnAssignment,
  User,
} from '@prisma/client';
import * as cheerio from 'cheerio';
import { Workbook } from 'exceljs';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { FileAssignmentRepository } from '../file-assignment/file-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../vector/ai.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SkillOnAssignmentService } from './../skill-on-assignment/skill-on-assignment.service';
import { SkillService } from './../skill/skill.service';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { SubjectService } from './../subject/subject.service';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { AssignmentRepository } from './assignment.repository';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  ReorderAssignmentDto,
  UpdateAssignmentDto,
} from './dto';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AssignmentService {
  private logger: Logger = new Logger(AssignmentService.name);
  assignmentRepository: AssignmentRepository;
  private fileAssignmentRepository: FileAssignmentRepository;
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    @Inject(forwardRef(() => SubjectService))
    private subjectService: SubjectService,
    private studentOnSubjectService: StudentOnSubjectService,
    private skillService: SkillService,
    private skillOnAssignmentService: SkillOnAssignmentService,
    private authService: AuthService,
    private gradeService: GradeService,
    private scoreOnSubjectService: ScoreOnSubjectService,
    private scoreOnStudentService: ScoreOnStudentService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.fileAssignmentRepository = new FileAssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getAssignmentById(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<Assignment & { files: FileOnAssignment[]; skills: Skill[] }> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      const files = await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: assignment.id,
      });

      const skills = await this.skillOnAssignmentService.getByAssignmentId(
        { assignmentId: assignment.id },
        user,
      );
      return { ...assignment, files, skills: skills.map((s) => s.skill) };
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
      studentAssign: number;
      reviewNumber: number;
      summitNumber: number;
      penddingNumber: number;
      studentOnAssignment?: StudentOnAssignment;
    })[]
  > {
    try {
      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });
      }
      let studentsOnAssignments: StudentOnAssignment[] = [];
      if (student) {
        const studentOnSubject =
          await this.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: dto.subjectId },
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
                  id: { in: studentsOnAssignments.map((s) => s?.assignmentId) },
                }
              : { subjectId: dto.subjectId }),
          },
        })
        .then((assignments) => {
          return assignments.map((assignment) => {
            delete assignment.vector;
            return { ...assignment };
          });
        });

      if (student) {
        assignments = assignments.filter(
          (assignment) => assignment.status === 'Published',
        );
      }

      const allStudentOnAssignments =
        await this.studentOnAssignmentRepository.findMany({
          where: {
            subjectId: dto.subjectId,
          },
        });

      const files = await this.fileAssignmentRepository.findMany({
        where: {
          assignmentId: { in: assignments.map((assignment) => assignment.id) },
        },
      });

      return assignments.map((assignment) => {
        const studentOnAssignments = allStudentOnAssignments.filter(
          (s) => s.assignmentId === assignment.id,
        );
        return {
          ...assignment,
          studentAssign: studentOnAssignments.length,
          summitNumber: studentOnAssignments.filter(
            (s) => s.status === 'SUBMITTED',
          ).length,
          penddingNumber: studentOnAssignments.filter(
            (s) => s.status === 'PENDDING',
          ).length,
          reviewNumber: studentOnAssignments.filter(
            (s) => s.status === 'REVIEWD',
          ).length,
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
  ): Promise<{
    grade: GradeRange | null;
    assignments: { assignment: Assignment; students: StudentOnAssignment[] }[];
    scoreOnSubjects: {
      scoreOnSubject: ScoreOnSubject;
      students: ScoreOnStudent[];
    }[];
  }> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const [
        assignments,
        studentsOnSubjects,
        grade,
        scoreOnSubjects,
        scoreOnStudents,
      ] = await Promise.all([
        this.assignmentRepository.findMany({
          where: {
            subjectId: dto.subjectId,
            status: 'Published',
            type: 'Assignment',
          },
        }),
        this.studentOnAssignmentRepository.findMany({
          where: { subjectId: dto.subjectId },
        }),
        this.gradeService.gradeRepository.findUnique({
          where: {
            subjectId: dto.subjectId,
          },
        }),
        this.scoreOnSubjectService.scoreOnSubjectRepository.findMany({
          where: {
            subjectId: dto.subjectId,
          },
        }),
        this.scoreOnStudentService.scoreOnStudentRepository.findMany({
          where: {
            subjectId: dto.subjectId,
          },
        }),
      ]);

      return {
        grade: grade
          ? { ...grade, gradeRules: JSON.parse(grade.gradeRules as string) }
          : null,
        assignments: assignments.map((assignment) => {
          return {
            assignment,
            students: studentsOnSubjects.filter(
              (student) => student.assignmentId === assignment.id,
            ),
          };
        }),
        scoreOnSubjects: scoreOnSubjects.map((scoreOnSubject) => {
          return {
            scoreOnSubject: scoreOnSubject,
            students: scoreOnStudents.filter(
              (scoreOnStudent) =>
                scoreOnStudent.scoreOnSubjectId === scoreOnSubject.id,
            ),
          };
        }),
      };
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

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const subject = await this.subjectService.subjectRepository.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject Not Found');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }

      const assignment = await this.assignmentRepository.create({
        data: { ...dto, schoolId: subject.schoolId, userId: user.id },
      });

      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: { subjectId: assignment.subjectId },
      });

      if (studentOnSubjects.length > 0) {
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
      }

      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async BackgroudEmbedingAssignment(assignmentId: string, user: User) {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: assignmentId,
      });
      await this.EmbedingAssignment(assignment.id);

      const skills = await this.skillService.findByVectorSearch({
        assignmentId: assignment.id,
      });

      const exsitingSkills =
        await this.skillOnAssignmentService.getByAssignmentId(
          { assignmentId: assignment.id },
          user,
        );

      const newSkills = skills.filter(
        (skill) => !exsitingSkills.some((s) => s.skillId === skill.id),
      );

      const exsitingSkillNotInNewSkills = exsitingSkills.filter(
        (skill) => !skills.some((s) => s.id === skill.skillId),
      );

      await Promise.allSettled(
        newSkills.map((skill) =>
          this.skillOnAssignmentService.skillOnAssignmentRepository.create({
            skillId: skill.id,
            assignmentId: assignment.id,
            subjectId: assignment.subjectId,
          }),
        ),
      );

      await Promise.allSettled(
        exsitingSkillNotInNewSkills.map((skill) =>
          this.skillOnAssignmentService.delete(
            { skillOnAssignmentId: skill.id },
            user,
          ),
        ),
      );
      return;
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

      // extract URL <img> tags
      const imageUrls: string[] = [];
      doc('img').each((_, element) => {
        const imgSrc = doc(element).attr('src');
        if (imgSrc) {
          imageUrls.push(imgSrc);
        }
      });

      const accessToken = await this.authService.getGoogleAccessToken();
      if (imageUrls.length > 0) {
        const imageURLWithType = await Promise.all(
          imageUrls.map(async (url) => {
            const miniType = await this.getFileMiniType(url);
            return { url, type: miniType };
          }),
        );
        const imageTexts = await this.aiService.summarizeFile({
          imageURLs: imageURLWithType,
          accessToken,
        });

        text += '\n' + imageTexts.candidates[0].content.parts[0].text;
      }

      const summaries = [];
      if (files.length > 0) {
        const fileTexts = await this.aiService.summarizeFile({
          imageURLs: files.map((file) => {
            return {
              url: file.url,
              type: file.type,
            };
          }),
          accessToken,
        });
        text += '\n' + fileTexts.candidates[0].content.parts[0].text;
      }

      text += '\n' + summaries.map((s) => s.summary).join('\n');
      // 1. Detect the language of the combined text.
      const detectedLanguage = await this.aiService.detectLanguage(
        text,
        accessToken,
      );
      // 2. If the language is not English, translate it to English.
      if (detectedLanguage !== 'en') {
        text = await this.aiService.translateText(text, 'en', accessToken);
      }

      const vectors = await this.aiService.embbedingText(text, accessToken);
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

  async getFileMiniType(url: string): Promise<string> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.headers.get('content-type');
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(dto: ReorderAssignmentDto, user: User): Promise<Assignment[]> {
    try {
      const assignments = await this.assignmentRepository.findMany({
        where: { id: { in: dto.assignmentIds } },
      });

      if (assignments.length !== dto.assignmentIds.length) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
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
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: assignment.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject is invaild');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      return await this.assignmentRepository.update({
        where: { id: dto.query.assignmentId },
        data: { ...dto.data },
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
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: assignment.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject is invaild');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      await this.teacherOnSubjectService.ValidateAccess({
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
    const subject = await this.prisma.subject.findUnique({
      where: {
        id: subjectId,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject is invaild');
    }

    if (subject.isLocked === true) {
      throw new ForbiddenException(
        'Subject is locked. Cannot make any changes!',
      );
    }
    const listStudentOnSubject =
      await this.studentOnSubjectService.getStudentOnSubjectsBySubjectId(
        { subjectId },
        user,
      );
    const listAssignment = await this.getOverviewScoreOnAssignment(
      { subjectId },
      user,
    ).then((res) => {
      return {
        ...res,
        assignments: res.assignments.filter(
          (a) => a.assignment.type !== 'Material',
        ),
      };
    });
    const gradeRule = await this.gradeService.gradeRepository.findUnique({
      where: {
        subjectId: subjectId,
      },
    });
    const data = {
      header: [
        'Number',
        'Student Name',
        ...listAssignment.assignments.map((assignment) =>
          assignment.assignment.weight
            ? `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points / ${assignment.assignment.weight}% `
            : `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points`,
        ),
        ...listAssignment.scoreOnSubjects.map(
          (scoreOnSubject) => scoreOnSubject.scoreOnSubject.title,
        ),
        'Total Score',
        'Grade',
      ],
      data: await Promise.all(
        listStudentOnSubject
          .sort((a, b) => Number(a.number) - Number(b.number))
          .map(async (student) => {
            let totalScore =
              listAssignment?.assignments.reduce((prev, current) => {
                let score =
                  current.students.find(
                    (s) => s.studentOnSubjectId === student.id,
                  )?.score ?? 0;
                if (current.assignment.weight !== null) {
                  const originalScore = score / current.assignment.maxScore;
                  score = originalScore * current.assignment.weight;
                }

                return prev + score;
              }, 0) ?? 0;
            totalScore =
              listAssignment.scoreOnSubjects.reduce((prev, scoreOnSubject) => {
                const summaryScore = scoreOnSubject.students.reduce(
                  (prev, studentOnScore) => {
                    if (studentOnScore.studentOnSubjectId === student.id) {
                      return (prev += studentOnScore.score);
                    }
                    return prev;
                  },
                  0,
                );

                return (prev += summaryScore);
              }, totalScore) ?? 0;

            const grade = await this.gradeService.assignGrade(
              totalScore,
              gradeRule,
            );

            return [
              student.number,
              student.title + student.firstName + ' ' + student.lastName,
              ...listAssignment.assignments.map((assignment) => {
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
              ...listAssignment.scoreOnSubjects.map((scoreOnSubject) => {
                const scoreOnStudents = scoreOnSubject.students.filter(
                  (s) => s.studentOnSubjectId === student.id,
                );
                if (scoreOnStudents.length === 0) {
                  return 'NO DATA';
                }

                const totalScore = scoreOnStudents.reduce(
                  (previousValue, current) => {
                    return (previousValue += current.score);
                  },
                  0,
                );

                return totalScore;
              }),
              totalScore,
              grade.grade,
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
    columA.alignment = { vertical: 'middle', horizontal: 'center' };

    firstRow.font = { bold: true, size: 10 };
    firstRow.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let i = 3; i <= listAssignment.assignments.length + 3; i++) {
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
