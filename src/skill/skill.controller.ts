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
import { AdminGuard } from '../auth/guard';
import { SkillService } from './skill.service';
import {
  CreateSkillDto,
  DeleteSkillDto,
  GetSkillDto,
  UpdateSkillDto,
} from './dto';

@UseGuards(AdminGuard)
@Controller('v1/skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  async findAll() {
    return this.skillService.findAll();
  }

  @Get('assignment/:assignmentId')
  async findByVectorSearch(@Param() dto: GetSkillDto) {
    return this.skillService.findByVectorSearch(dto);
  }

  @Post()
  async create(@Body() dto: CreateSkillDto) {
    return this.skillService.create(dto);
  }

  @Patch()
  async update(@Body() dto: UpdateSkillDto) {
    return this.skillService.update(dto);
  }

  @Delete(':skillId')
  async delete(@Param() dto: DeleteSkillDto) {
    return this.skillService.delete(dto);
  }
}
