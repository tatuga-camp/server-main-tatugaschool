import { UserRepository } from './../users/users.repository';
import { CareerRepository } from './../career/career.repository';
import { SkillRepository } from './../skill/skill.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSkillOnCareerDto,
  DeleteSkillOnCareerDto,
  GetByCarrerIdDto,
} from './dto';
import { SkillOnCareerRepository } from './skill-on-career.repository';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Injectable()
export class SkillOnCareerService {
  private logger: Logger = new Logger(SkillOnCareerService.name);
  skillOnCareerRepository: SkillOnCareerRepository;
  private userRepository: UserRepository;
  private skillRepository: SkillRepository;
  private careerRepository: CareerRepository;
  constructor(private prisma: PrismaService) {
    this.careerRepository = new CareerRepository(this.prisma);
    this.skillRepository = new SkillRepository(this.prisma);
    this.skillOnCareerRepository = new SkillOnCareerRepository(this.prisma);
    this.userRepository = new UserRepository(this.prisma);
  }

  async getByCareerId(dto: GetByCarrerIdDto) {
    try {
      const skillOnCareer = await this.skillOnCareerRepository.findMany({
        where: {
          careerId: dto.careerId,
        },
      });

      return skillOnCareer;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateSkillOnCareerDto, user: UserJwtPayload) {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo || userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Access deny');
      }
      if (dto.weight > 1 && dto.weight < 0) {
        throw new BadRequestException('Weight must be between 0 and 1');
      }

      const [skill, career] = await Promise.all([
        this.skillRepository.findById({
          skillId: dto.skillId,
        }),
        this.careerRepository.findUnique({
          where: {
            id: dto.careerId,
          },
        }),
      ]);

      if (!skill) {
        throw new NotFoundException('Skill not found');
      }

      if (!career) {
        throw new NotFoundException('Career not found');
      }

      return await this.skillOnCareerRepository.create({
        data: { ...dto },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteSkillOnCareerDto, user: UserJwtPayload) {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo || userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Access deny');
      }
      return await this.skillOnCareerRepository.delete({
        where: {
          id: dto.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
