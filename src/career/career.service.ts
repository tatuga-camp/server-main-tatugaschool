import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Career, Skill, SkillOnCareer, User } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../vector/ai.service';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import { SkillOnCareerRepository } from './../skill-on-career/skill-on-career.repository';
import { SkillOnStudentAssignmentService } from './../skill-on-student-assignment/skill-on-student-assignment.service';
import { SkillService } from './../skill/skill.service';
import { StudentService } from './../student/student.service';
import { CareerRepository } from './career.repository';
import { CreateCareerDto, DeleteCareerDto, UpdateCareerDto } from './dto';

@Injectable()
export class CareerService {
  private logger: Logger = new Logger(CareerService.name);
  careerRepository: CareerRepository;
  private skillOnCareerRepository: SkillOnCareerRepository;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
    private skillService: SkillService,
    private memberOnSchoolService: MemberOnSchoolService,
    private studentService: StudentService,
    private authService: AuthService,
  ) {
    this.skillOnCareerRepository = new SkillOnCareerRepository(this.prisma);
    this.careerRepository = new CareerRepository(this.prisma);
  }

  async suggest(
    dto: { studentId: string },
    user: User,
  ): Promise<{
    student: {
      skills: (Skill & { avg: number })[];
    };
    careers: (Career & {
      skill: (Skill & { avg: number; above: number; below: number })[];
    })[];
  }> {
    try {
      return;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  findClosestNumber(target: number, numbers: number[]): number {
    return numbers.reduce((closest, num) =>
      Math.abs(num - target) < Math.abs(closest - target) ? num : closest,
    );
  }
  async getOne(dto: {
    careerId: string;
  }): Promise<Career & { skills: SkillOnCareer[] }> {
    try {
      const career = await this.careerRepository.findUnique({
        where: {
          id: dto.careerId,
        },
      });

      const skilss = await this.skillOnCareerRepository.findMany({
        where: {
          careerId: dto.careerId,
        },
      });

      return { ...career, skills: skilss };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateCareerDto): Promise<Career> {
    try {
      return await this.careerRepository.create({
        data: {
          ...dto,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateCareerDto): Promise<Career> {
    try {
      const accessToken = await this.authService.getGoogleAccessToken();

      const text = `
        title: ${dto.body.title} 
        description: ${dto.body.description} 
        keywords: ${dto.body.keywords}`;

      await this.aiService.embbedingText(text, accessToken);

      return await this.careerRepository.update({
        where: {
          id: dto.query.id,
        },
        data: {
          ...dto.body,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteCareerDto): Promise<{ message: string }> {
    try {
      await this.careerRepository.delete({
        where: { id: dto.id },
      });
      return { message: 'Career deleted successfully' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
