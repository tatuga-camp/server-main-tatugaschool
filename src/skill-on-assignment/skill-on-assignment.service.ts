import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SkillRepository } from './../skill/skill.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { SkillOnAssignmentRepository } from './skill-on-assignment.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetAssignmentByIdDto } from '../assignment/dto';
import { Skill, SkillOnAssignment, User } from '@prisma/client';
import { CreateSkillOnAssignmentDto, DeleteSkillOnAssignmentDto } from './dto';

@Injectable()
export class SkillOnAssignmentService {
  logger: Logger = new Logger(SkillOnAssignmentService.name);
  skillOnAssignmentRepository: SkillOnAssignmentRepository;
  private skillRepository: SkillRepository;
  private assignmentRepository: AssignmentRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.skillRepository = new SkillRepository(this.prisma);
    this.skillOnAssignmentRepository = new SkillOnAssignmentRepository(
      this.prisma,
    );
  }

  async getByAssignmentId(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<(SkillOnAssignment & { skill: Skill })[]> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: assignment.subjectId,
        userId: user.id,
      });

      const skillOnAssignment =
        await this.skillOnAssignmentRepository.getByAssignmentId({
          assignmentId: dto.assignmentId,
        });

      const skills = await this.skillRepository
        .findMany({
          where: {
            OR: skillOnAssignment.map((skill) => ({ id: skill.skillId })),
          },
        })
        .then((res) => {
          return res.map((skill) => {
            delete skill.vector;
            return {
              ...skill,
            };
          });
        });

      return skillOnAssignment.map((skill) => ({
        ...skill,
        skill: skills.find((s) => s.id === skill.skillId),
      }));
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: CreateSkillOnAssignmentDto,
    user: User,
  ): Promise<SkillOnAssignment> {
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
      const skillOnAssignment = await this.skillOnAssignmentRepository.create({
        ...dto,
        subjectId: assignment.subjectId,
      });
      return skillOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteSkillOnAssignmentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const skillOnAssingment = await this.skillOnAssignmentRepository.getById({
        id: dto.skillOnAssignmentId,
      });

      if (!skillOnAssingment) {
        throw new NotFoundException('item not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: skillOnAssingment.subjectId,
      });

      const remove = await this.skillOnAssignmentRepository.delete({
        id: dto.skillOnAssignmentId,
      });

      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
