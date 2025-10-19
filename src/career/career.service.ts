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
      careerMatchPoint: number;
      skills: (Skill & {
        avg: number;
        above: number;
        below: number;
        matchPoint: number;
      })[];
    })[];
  }> {
    try {
      const skillOnStudents =
        await this.skillOnStudentAssignmentService.skillOnStudentAssignmentRepository.findMany(
          {
            where: {
              studentId: dto.studentId,
            },
          },
        );

      if (skillOnStudents.length === 0) {
        throw new BadRequestException('Student has no enough data');
      }
      const [careers, allSkillOnCareers, allSkills] = await Promise.all([
        this.careerRepository.findMany({}),
        this.skillOnCareerRepository.findMany({}),
        this.skillService.skillRepository.findMany({
          omit: {
            vector: true,
          },
        }),
      ]);

      // 2. Process student's skills to get their average score for each skill
      const studentSkillsMap = new Map<
        string,
        { total: number; count: number }
      >();

      for (const record of skillOnStudents) {
        if (!studentSkillsMap.has(record.skillId)) {
          studentSkillsMap.set(record.skillId, { total: 0, count: 0 });
        }
        const skillData = studentSkillsMap.get(record.skillId);
        skillData.total += record.weight;
        skillData.count += 1;
      }
      const studentAvgSkillsMap = new Map<string, number>();
      studentSkillsMap.forEach((data, skillId) => {
        studentAvgSkillsMap.set(skillId, data.total / data.count);
      });

      // 3. Create lookup maps for efficient data access
      const skillsMap = new Map(allSkills.map((s) => [s.id, s]));

      const studentProfileSkills = Array.from(
        studentAvgSkillsMap.entries(),
      ).map(([skillId, studentAvg]) => {
        const skillInfo = skillsMap.get(skillId);
        return {
          ...skillInfo,
          avg: studentAvg, // 'avg' here is the student's own average score
        };
      });

      // 5b. Process each career and compare skills
      const processedCareers = careers.map((career) => {
        const requiredSkills = allSkillOnCareers.filter(
          (soc) => soc.careerId === career.id,
        );
        const populationSkillsMap = new Map<string, number[]>();
        for (const assignment of requiredSkills) {
          if (!populationSkillsMap.has(assignment.skillId)) {
            populationSkillsMap.set(assignment.skillId, []);
          }
          populationSkillsMap.get(assignment.skillId).push(assignment.weight);
        }

        const comparedSkills = Array.from(populationSkillsMap.entries()).map(
          (reqSkill) => {
            const skillId = reqSkill[0];
            const skillInfo = skillsMap.get(skillId);
            const studentScore = studentAvgSkillsMap.get(skillId) ?? 0;

            // Get all scores for this skill from the entire student population
            const populationScores = reqSkill[1];

            // Calculate population average
            const populationSum = populationScores.reduce(
              (acc, score) => acc + score,
              0,
            );
            const populationAvg =
              populationScores.length > 0
                ? populationSum / populationScores.length
                : 0;

            // Calculate position relative to the population
            const above = populationScores.filter(
              (score) => score > studentScore,
            ).length;
            const below = populationScores.filter(
              (score) => score < studentScore,
            ).length;

            const matchPoint =
              populationAvg > 0 ? studentScore / populationAvg : 0;
            return {
              ...skillInfo,
              avg: populationAvg, // 'avg' here is the population average for this skill
              above,
              below,
              matchPoint,
            };
          },
        );

        return {
          ...career,
          careerMatchPoint: comparedSkills.reduce(
            (acc, skill) => (acc += skill.matchPoint),
            0,
          ),
          skills: comparedSkills,
        };
      });

      return {
        student: {
          skills: studentProfileSkills,
        },
        careers: processedCareers.sort(
          (a, b) => b.careerMatchPoint - a.careerMatchPoint,
        ),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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
