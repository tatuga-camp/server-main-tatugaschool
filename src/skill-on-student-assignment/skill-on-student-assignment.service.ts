import { SkillRepository } from './../skill/skill.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { SkillOnAssignmentRepository } from './../skill-on-assignment/skill-on-assignment.repository';
import { StudentRepository } from './../student/student.repository';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { SkillOnStudentAssignmentRepository } from './skill-on-student-assignment.repository';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBySuggestionDto,
  CreateDto,
  DeleteDto,
  GetByStudentIdDto,
} from './dto';
import { SkillOnStudentAssignment, User } from '@prisma/client';
import { StudentOnAssignmentRepository } from '../student-on-assignment/student-on-assignment.repository';

@Injectable()
export class SkillOnStudentAssignmentService {
  private logger: Logger = new Logger(SkillOnStudentAssignmentService.name);
  skillOnStudentAssignmentRepository: SkillOnStudentAssignmentRepository =
    new SkillOnStudentAssignmentRepository(this.prisma);
  private studentRepository: StudentRepository = new StudentRepository(
    this.prisma,
  );
  private skillOnAssignmentRepository: SkillOnAssignmentRepository =
    new SkillOnAssignmentRepository(this.prisma);

  private studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);

  private assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
    this.googleStorageService,
  );
  private skillRepository: SkillRepository = new SkillRepository(this.prisma);

  constructor(
    private prisma: PrismaService,
    private memberOnSchoolService: MemberOnSchoolService,
    private googleStorageService: GoogleStorageService,
  ) {}

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

  async suggestCreate(
    dto: CreateBySuggestionDto,
    user: User,
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

      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: student.schoolId,
      });

      const skillOnAssignments =
        await this.skillOnAssignmentRepository.getByAssignmentId({
          assignmentId: studentOnAssignment.assignmentId,
        });

      // Calculate weigth based on student score and max score of assignment
      const weigth = studentOnAssignment.score / assignment.maxScore;

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

      const create = await Promise.all(
        skillOnStudentAssignments.map((skill) =>
          this.skillOnStudentAssignmentRepository.create({
            data: {
              skillId: skill.skillId,
              studentId: student.id,
              subjectId: skill.subjectId,
              studentOnAssignmentId: studentOnAssignment.id,
              weight: weigth,
            },
          }),
        ),
      );
      return create;
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
        await this.skillOnStudentAssignmentRepository.findById({
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
