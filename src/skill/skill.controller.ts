import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, UserGuard } from '../auth/guard';
import { SkillService } from './skill.service';
import {
  CreateSkillDto,
  DeleteSkillDto,
  GetSkillByAssignmentDto,
  GetSkillDto,
  UpdateSkillDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @UseGuards(UserGuard)
  @Get(':skillId')
  async findById(@Param() dto: GetSkillDto) {
    return this.skillService.getOne(dto);
  }
  @UseGuards(UserGuard)
  @Get('assignment/:assignmentId')
  async findByAssignment(
    @Param() dto: GetSkillByAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.skillService.findByVectorSearch(dto);
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() dto: CreateSkillDto) {
    return this.skillService.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch()
  async update(@Body() dto: UpdateSkillDto) {
    return this.skillService.update(dto);
  }

  @UseGuards(AdminGuard)
  @Delete(':skillId')
  async delete(@Param() dto: DeleteSkillDto) {
    return this.skillService.delete(dto);
  }
}
