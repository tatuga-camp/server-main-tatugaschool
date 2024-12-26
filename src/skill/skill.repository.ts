import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Skill } from '@prisma/client';
import {
  RawSkill,
  RequestCreateSkill,
  RequestDeleteSkill,
  RequestFindSkillById,
  RequestUpdateSkill,
} from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type SkillRepositoryType = {
  findById(request: RequestFindSkillById): Promise<Skill | null>;
  findByVectorSearch(vector: number[]): Promise<Skill[]>;
  findAll(): Promise<Skill[]>;
  create(request: RequestCreateSkill): Promise<Skill>;
  update(request: RequestUpdateSkill): Promise<Skill>;
  delete(request: RequestDeleteSkill): Promise<{ message: string }>;
};
@Injectable()
export class SkillRepository implements SkillRepositoryType {
  logger: Logger = new Logger(SkillRepository.name);

  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Skill[]> {
    try {
      return await this.prisma.skill.findMany();
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByVectorSearch(vector: number[]): Promise<Skill[]> {
    try {
      const rawSkills = (await this.prisma.skill.aggregateRaw({
        pipeline: [
          {
            $vectorSearch: {
              queryVector: vector,
              path: 'vector',
              numCandidates: 768,
              limit: 3,
              index: 'skillIndexing',
            },
          },
          {
            $project: {
              _id: 1,
              createAt: 1,
              updateAt: 1, // Add current timestamp
              title: 1,
              description: 1,
              keywords: 1,
            },
          },
        ],
      })) as unknown as RawSkill[];
      const skills = rawSkills.map((skill) => ({
        id: (skill._id as any).$oid,
        createAt: (skill.createAt as any).$date,
        updateAt: (skill.updateAt as any).$date,
        title: skill.title as string,
        description: skill.description as string,
        keywords: skill.keywords as string,
      })) as Skill[];

      return skills;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findById(request: RequestFindSkillById): Promise<Skill | null> {
    try {
      return await this.prisma.skill.findUnique({
        where: {
          id: request.skillId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async create(request: RequestCreateSkill): Promise<Skill> {
    try {
      return await this.prisma.skill.create({
        data: request,
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(request: RequestUpdateSkill): Promise<Skill> {
    try {
      return await this.prisma.skill.update({
        where: { id: request.query.skillId },
        data: request.data,
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(request: RequestDeleteSkill): Promise<{ message: string }> {
    try {
      await this.prisma.skillOnAssignment.deleteMany({
        where: { skillId: request.skillId },
      });
      await this.prisma.skillOnCareer.deleteMany({
        where: { skillId: request.skillId },
      });
      await this.prisma.skillOnStudentAssignment.deleteMany({
        where: {
          skillId: request.skillId,
        },
      });
      await this.prisma.skill.delete({
        where: { id: request.skillId },
      });
      return { message: 'Skill deleted successfully' };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
