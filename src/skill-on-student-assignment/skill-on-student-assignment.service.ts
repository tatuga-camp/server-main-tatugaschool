import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { SkillRepository } from './../skill/skill.repository';
import { StorageService } from '../storage/storage.service';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { SkillOnAssignmentRepository } from './../skill-on-assignment/skill-on-assignment.repository';
import { StudentRepository } from './../student/student.repository';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { SkillOnStudentAssignmentRepository } from './skill-on-student-assignment.repository';
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBySuggestionDto,
  CreateDto,
  DeleteDto,
  GetByStudentIdDto,
} from './dto';
import { Skill, SkillOnStudentAssignment, User } from '@prisma/client';
import { StudentOnAssignmentRepository } from '../student-on-assignment/student-on-assignment.repository';

@Injectable()
export class SkillOnStudentAssignmentService {
  private logger: Logger = new Logger(SkillOnStudentAssignmentService.name);
  skillOnStudentAssignmentRepository: SkillOnStudentAssignmentRepository;
  private studentRepository: StudentRepository;
  private skillOnAssignmentRepository: SkillOnAssignmentRepository;

  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  private assignmentRepository: AssignmentRepository;
  private skillRepository: SkillRepository;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MemberOnSchoolService))
    private memberOnSchoolService: MemberOnSchoolService,
    private storageService: StorageService,
  ) {
    this.skillOnStudentAssignmentRepository =
      new SkillOnStudentAssignmentRepository(this.prisma);
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.storageService,
    );
    this.skillOnAssignmentRepository = new SkillOnAssignmentRepository(
      this.prisma,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.storageService,
    );
    this.skillRepository = new SkillRepository(this.prisma);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.storageService,
    );
  }

  async getByStudentId(
    dto: GetByStudentIdDto,
    user: User,
  ): Promise<SkillOnStudentAssignment[]> {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: student.schoolId,
      });

      return await this.skillOnStudentAssignmentRepository.findMany({
        where: {
          studentId: dto.studentId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByStudentOnSubjectId(studentOnSubjectId: string): Promise<
    (Skill & {
      skillOnStudentAssignments: SkillOnStudentAssignment[];
      average: number;
    })[]
  > {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: studentOnSubjectId,
        });

      const skillOnStudentAssignments =
        await this.skillOnStudentAssignmentRepository.findMany({
          where: {
            studentId: studentOnSubject.studentId,
            subjectId: studentOnSubject.subjectId,
          },
        });

      const skills = await this.skillRepository.findMany({});
      const groupSkills = skillOnStudentAssignments.reduce<
        Record<string, SkillOnStudentAssignment[]>
      >((prev, current) => {
        const key = current.skillId;
        if (!prev[key]) {
          prev[key] = [];
        }
        prev[key].push(current);
        return prev;
      }, {});

      const mapGroupSkills = Object.entries(groupSkills).map(
        ([skillId, value]) => ({
          skillId: skillId,
          skillOnStudentAssignments: value,
        }),
      );

      return mapGroupSkills.map((data) => {
        const skill = skills.find((s) => s.id === data.skillId);
        return {
          ...skill,
          skillOnStudentAssignments: data.skillOnStudentAssignments,
          average:
            data.skillOnStudentAssignments.reduce((prev, cuurent) => {
              return (prev = +cuurent.weight);
            }, 0) / data.skillOnStudentAssignments.length,
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async suggestCreate(
    dto: CreateBySuggestionDto,
  ): Promise<SkillOnStudentAssignment[]> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      const assignment = await this.assignmentRepository.getById({
        assignmentId: studentOnAssignment.assignmentId,
      });

      if (!studentOnAssignment) {
        throw new NotFoundException('Student on assignment not found');
      }

      const student = await this.studentRepository.findById({
        studentId: studentOnAssignment.studentId,
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const skillOnAssignments =
        await this.skillOnAssignmentRepository.getByAssignmentId({
          assignmentId: studentOnAssignment.assignmentId,
        });
      // Calculate weigth based on student score and max score of assignment
      const weigth = (studentOnAssignment.score / assignment.maxScore) * 100;

      const skillOnStudentAssignments = skillOnAssignments.map(
        (skillOnAssignment) => {
          return {
            skillId: skillOnAssignment.skillId,
            assignmentId: skillOnAssignment.assignmentId,
            subjectId: skillOnAssignment.subjectId,
            weigth: weigth,
          };
        },
      );

      let skillOnStudentAssignmentsCreated: SkillOnStudentAssignment[] = [];
      for (const skill of skillOnStudentAssignments) {
        const skillOnStudentAssignment =
          await this.skillOnStudentAssignmentRepository.findFirst({
            where: {
              studentOnAssignmentId: studentOnAssignment.id,
              skillId: skill.skillId,
            },
          });

        if (skillOnStudentAssignment) {
          skillOnStudentAssignmentsCreated.push(
            await this.skillOnStudentAssignmentRepository.update({
              where: {
                id: skillOnStudentAssignment.id,
              },
              data: {
                weight: weigth,
              },
            }),
          );
        } else {
          skillOnStudentAssignmentsCreated.push(
            await this.skillOnStudentAssignmentRepository.create({
              data: {
                skillId: skill.skillId,
                studentId: student.id,
                subjectId: skill.subjectId,
                studentOnAssignmentId: studentOnAssignment.id,
                weight: weigth,
              },
            }),
          );
        }
      }

      return skillOnStudentAssignmentsCreated;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateDto, user: User): Promise<SkillOnStudentAssignment> {
    try {
      const [studentOnAssignment, skill] = await Promise.all([
        this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        }),
        this.skillRepository.findById({
          skillId: dto.skillId,
        }),
      ]);

      if (!skill) {
        throw new NotFoundException('Skill not found');
      }
      if (!studentOnAssignment) {
        throw new NotFoundException('Student on assignment not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: studentOnAssignment.schoolId,
      });

      return await this.skillOnStudentAssignmentRepository.create({
        data: {
          skillId: dto.skillId,
          studentId: studentOnAssignment.studentId,
          subjectId: studentOnAssignment.subjectId,
          studentOnAssignmentId: studentOnAssignment.id,
          weight: dto.weight,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteDto, user: User): Promise<{ message: string }> {
    try {
      const skillOnStudentAssignment =
        await this.skillOnStudentAssignmentRepository.findUnique({
          where: {
            id: dto.id,
          },
        });
      if (!skillOnStudentAssignment) {
        throw new NotFoundException('Skill on student assignment not found');
      }
      const student = await this.studentRepository.findById({
        studentId: skillOnStudentAssignment.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: student.schoolId,
      });

      await this.skillOnStudentAssignmentRepository.delete({
        where: {
          id: dto.id,
        },
      });

      return { message: 'Skill on student assignment deleted' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
