import { AssignmentRepository } from './../assignment/assignment.repository';
import { SkillRepository } from './skill.repository';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSkillDto,
  DeleteSkillDto,
  GetSkillDto,
  UpdateSkillDto,
} from './dto';
import { Skill } from '@prisma/client';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class SkillService {
  logger: Logger = new Logger(SkillService.name);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  skillRepository: SkillRepository = new SkillRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
  ) {}

  async findAll() {
    try {
      return this.skillRepository.findAll();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByVectorSearch(dto: GetSkillDto): Promise<Skill[]> {
    try {
      const assignment = await this.assignmentRepository.getAssignmentById({
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
      const text = `${dto.title} ${dto.description} ${dto.keywords}`;
      const vectors = await this.vectorService.embbedingText(text);
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
      const skill = await this.skillRepository.findById({
        skillId: dto.query.skillId,
      });
      if (!skill) {
        throw new NotFoundException('Skill not found');
      }
      let arrayText: string[] = [];
      if (dto.data.title) {
        arrayText.push(dto.data.title);
      } else if (!dto.data.title) {
        arrayText.push(skill.title);
      }
      if (dto.data.description) {
        arrayText.push(dto.data.description);
      } else if (!dto.data.description) {
        arrayText.push(skill.description);
      }
      if (dto.data.keywords) {
        arrayText.push(dto.data.keywords);
      } else if (!dto.data.keywords) {
        arrayText.push(skill.keywords);
      }

      const text = arrayText.join(' ');

      const vectors = await this.vectorService.embbedingText(text);
      const update = await this.skillRepository.update({
        query: dto.query,
        data: { ...dto.data, vector: vectors.predictions[0].embeddings.values },
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
