import { UserRepository } from './../users/users.repository';
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
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Injectable()
export class SkillService {
  private logger: Logger = new Logger(SkillService.name);
  private assignmentRepository: AssignmentRepository;
  private teacherOnSubjectRepository: TeacherOnSubjectRepository;
  private userRepository: UserRepository;
  skillRepository: SkillRepository;
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private googleStorageService: StorageService,
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
    this.userRepository = new UserRepository(this.prisma);
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

  async create(dto: CreateSkillDto, user: UserJwtPayload): Promise<Skill> {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo || userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Access deny');
      }
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

  async update(dto: UpdateSkillDto, user: UserJwtPayload): Promise<Skill> {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo || userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Access deny');
      }
      const accessToken = await this.authService.getGoogleAccessToken();

      const skill = await this.skillRepository.findById({
        skillId: dto.query.skillId,
      });
      if (!skill) {
        throw new NotFoundException('Skill not found');
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

  async delete(
    dto: DeleteSkillDto,
    user: UserJwtPayload,
  ): Promise<{ message: string }> {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo || userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Access deny');
      }
      return await this.skillRepository.delete({ skillId: dto.skillId });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
