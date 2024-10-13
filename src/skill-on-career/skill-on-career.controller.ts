import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guard';
import { SkillOnCareerService } from './skill-on-career.service';
import {
  CreateSkillOnCareerDto,
  DeleteSkillOnCareerDto,
  GetByCarrerIdDto,
} from './dto';

@UseGuards(AdminGuard)
@Controller('v1/skill-on-career')
export class SkillOnCareerController {
  constructor(private readonly skillOnCareerService: SkillOnCareerService) {}

  @Get('career/:careerId')
  async getByCareerId(@Param() dto: GetByCarrerIdDto) {
    return await this.skillOnCareerService.getByCareerId(dto);
  }

  @Post()
  async create(@Body() dto: CreateSkillOnCareerDto) {
    return await this.skillOnCareerService.create(dto);
  }

  @Delete(':id')
  async delete(@Param() dto: DeleteSkillOnCareerDto) {
    return await this.skillOnCareerService.delete(dto);
  }
}
