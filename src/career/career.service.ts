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
    careers: Career;
    skills: {
      skill: Skill;
      average: number;
    }[];
  }> {
    try {
      const student = await this.studentService.studentRepository.findById({
        studentId: dto.studentId,
      });

      if (!student) {
        throw new BadRequestException('Student not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user,
        schoolId: student.schoolId,
      });

      const [skillOnCareers, skills, skillOnStudents] = await Promise.all([
        this.skillOnCareerRepository.findMany({}),
        this.skillService.skillRepository.findMany({}),
        this.skillOnStudentAssignmentService.skillOnStudentAssignmentRepository.findMany(
          {
            where: {
              studentId: dto.studentId,
            },
          },
        ),
      ]);

      const groupsSkills = Object.groupBy(
        skillOnStudents,
        (skill) => skill.skillId,
      );
      const groupedArrayStudentSkills = Object.entries(groupsSkills).map(
        ([skillId, skillOnAssignment]) => ({
          title: skills.find((s) => s.id === skillId).title,
          skillId,
          average:
            skillOnAssignment.reduce((sum, skill) => sum + skill.weight, 0) /
            skillOnAssignment.length, // average weight
          skillOnAssignment,
        }),
      );

      let careers = (await this.careerRepository.findMany({})).map((s) => {
        return {
          point: 0,
          ...s,
        };
      });
      const groupSkillOnCareerBySkillId = Object.groupBy(
        skillOnCareers,
        (skill) => skill.skillId,
      );
      const groupArraySkillOnCareerBySkillId = Object.entries(
        groupSkillOnCareerBySkillId,
      ).map(([skillId, skillOnCareers]) => {
        return {
          title: skills.find((s) => s.id === skillId).title,
          skillId,
          skillOnCareers,
        };
      });

      if (
        groupArraySkillOnCareerBySkillId.length !==
        groupedArrayStudentSkills.length
      ) {
        throw new BadRequestException(
          'Data is not enough to give a suggestion',
        );
      }

      for (const skillOnCareer of groupArraySkillOnCareerBySkillId) {
        const skillOnStudent = groupedArrayStudentSkills.find(
          (s) => s.skillId === skillOnCareer.skillId,
        );
        const closestPoint = this.findClosestNumber(
          skillOnStudent.average,
          skillOnCareer.skillOnCareers.map((s) => s.weight),
        );

        const winCareer = skillOnCareer.skillOnCareers.find(
          (s) => s.weight === closestPoint,
        );

        careers = careers.map((career) => {
          if (winCareer.careerId === career.id) {
            return {
              point: (career.point += 1),
              ...career,
            };
          } else {
            return {
              ...career,
            };
          }
        });
      }

      return {
        skills: groupedArrayStudentSkills.map((s) => {
          const skill = skills.find((skill) => skill.id === s.skillId);
          delete skill?.vector;
          delete s.skillId;
          return {
            skill: skill,
            average: s.average,
          };
        }),
        careers: careers.sort((a, b) => b.point - a.point)[0],
      };
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
