import { GroupOnSubjectService } from './../group-on-subject/group-on-subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UnitOnGroupRepository } from './unit-on-group.repository';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUnitOnGroupDto,
  DeleteUnitOnGroupDto,
  ReorderUnitOnGroupDto,
  UpdateUnitOnGroupDto,
} from './dto';
import { UnitOnGroup, User } from '@prisma/client';

@Injectable()
export class UnitOnGroupService {
  private logger: Logger;
  unitOnGroupRepository: UnitOnGroupRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private groupOnSubjectService: GroupOnSubjectService,
  ) {
    this.logger = new Logger(UnitOnGroupRepository.name);
    this.unitOnGroupRepository = new UnitOnGroupRepository(this.prisma);
  }

  async create(dto: CreateUnitOnGroupDto, user: User): Promise<UnitOnGroup> {
    try {
      const groupOnSubject =
        await this.groupOnSubjectService.groupOnSubjectRepository.findUnique({
          where: {
            id: dto.groupOnSubjectId,
          },
        });

      if (!groupOnSubject) {
        throw new NotFoundException('goupOnSubjectId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: groupOnSubject.subjectId,
      });

      return await this.unitOnGroupRepository.create({
        data: {
          ...dto,
          icon: dto.icon,
          schoolId: groupOnSubject.schoolId,
          subjectId: groupOnSubject.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateUnitOnGroupDto, user: User): Promise<UnitOnGroup> {
    try {
      const unitOnGroup = await this.unitOnGroupRepository.findUnique({
        where: {
          id: dto.query.unitOnGroupId,
        },
      });

      if (!unitOnGroup) {
        throw new NotFoundException('goupOnSubjectId is invaild');
      }

      let totalPoints = unitOnGroup.totalScore;

      if (dto.body.score) {
        totalPoints += dto.body.score;
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: unitOnGroup.subjectId,
      });

      delete dto.body.score;

      return await this.unitOnGroupRepository.update({
        where: {
          id: dto.query.unitOnGroupId,
        },
        data: { ...dto.body, totalScore: totalPoints },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(
    dto: ReorderUnitOnGroupDto,
    user: User,
  ): Promise<UnitOnGroup[]> {
    try {
      const unitOnGroup = await this.unitOnGroupRepository.findUnique({
        where: {
          id: dto.unitOnGroupIds[0],
        },
      });

      if (!unitOnGroup) {
        throw new NotFoundException('One of the unitOnGroupId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: unitOnGroup.subjectId,
      });

      const update = await Promise.allSettled(
        dto.unitOnGroupIds.map((value, index) => {
          return this.unitOnGroupRepository.update({
            where: {
              id: value,
            },
            data: {
              order: index,
            },
          });
        }),
      );

      return update.filter((f) => f.status === 'fulfilled').map((f) => f.value);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteUnitOnGroupDto, user: User): Promise<UnitOnGroup> {
    try {
      const unitOnGroup = await this.unitOnGroupRepository.findUnique({
        where: {
          id: dto.unitOnGroupId,
        },
      });

      if (!unitOnGroup) {
        throw new NotFoundException('One of the unitOnGroupId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: unitOnGroup.subjectId,
      });

      return await this.unitOnGroupRepository.delete({
        unitOnGroupId: unitOnGroup.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
