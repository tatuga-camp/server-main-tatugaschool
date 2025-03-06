import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { SkillRepository } from './skill.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSkillDto,
  DeleteSkillDto,
  GetSkillByAssignmentDto,
  GetSkillDto,
  UpdateSkillDto,
} from './dto';
import { Skill, User } from '@prisma/client';
import { AiService } from '../vector/ai.service';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class SkillService {
  logger: Logger = new Logger(SkillService.name);
  assignmentRepository: AssignmentRepository;
  teacherOnSubjectRepository: TeacherOnSubjectRepository;
  skillRepository: SkillRepository;
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private googleStorageService: GoogleStorageService,
    private authService: AuthService,
  ) {
    this.skillRepository = new SkillRepository(this.prisma);
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getOne(dto: { skillId: string }) {
    try {
      return await this.skillRepository.findById({
        skillId: dto.skillId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByVectorSearch(dto: GetSkillByAssignmentDto): Promise<Skill[]> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      return this.skillRepository.findByVectorSearch(assignment.vector);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    try {
      const accessToken = await this.authService.getGoogleAccessToken();
      const text = `${dto.title} ${dto.description} ${dto.keywords}`;
      const vectors = await this.aiService.embbedingText(text, accessToken);
      const create = await this.skillRepository.create({
        ...dto,
        vector: vectors.predictions[0].embeddings.values,
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateSkillDto): Promise<Skill> {
    try {
      const accessToken = await this.authService.getGoogleAccessToken();

      const skill = await this.skillRepository.findById({
        skillId: dto.query.skillId,
      });
      if (!skill) {
        throw new NotFoundException('Skill not found');
      }

      if (!dto.body.title && !dto.body.description && !dto.body.keywords) {
        return skill;
      }
      let arrayText: string[] = [];
      if (dto.body.title) {
        arrayText.push(dto.body.title);
      } else if (!dto.body.title) {
        arrayText.push(skill.title);
      }
      if (dto.body.description) {
        arrayText.push(dto.body.description);
      } else if (!dto.body.description) {
        arrayText.push(skill.description);
      }
      if (dto.body.keywords) {
        arrayText.push(dto.body.keywords);
      } else if (!dto.body.keywords) {
        arrayText.push(skill.keywords);
      }

      const text = arrayText.join(' ');

      const vectors = await this.aiService.embbedingText(text, accessToken);
      const update = await this.skillRepository.update({
        query: dto.query,
        data: { ...dto.body, vector: vectors.predictions[0].embeddings.values },
      });

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteSkillDto): Promise<{ message: string }> {
    try {
      return await this.skillRepository.delete({ skillId: dto.skillId });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
