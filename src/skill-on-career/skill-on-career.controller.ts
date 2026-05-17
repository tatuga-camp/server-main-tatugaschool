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
import { SkillOnCareerService } from './skill-on-career.service';
import {
  CreateSkillOnCareerDto,
  DeleteSkillOnCareerDto,
  GetByCarrerIdDto,
} from './dto';
import { UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/skill-on-career')
export class SkillOnCareerController {
  constructor(private readonly skillOnCareerService: SkillOnCareerService) {}

  @Get('career/:careerId')
  async getByCareerId(@Param() dto: GetByCarrerIdDto) {
    return await this.skillOnCareerService.getByCareerId(dto);
  }

  @Post()
  async create(
    @Body() dto: CreateSkillOnCareerDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.skillOnCareerService.create(dto, user);
  }

  @Delete(':id')
  async delete(
    @Param() dto: DeleteSkillOnCareerDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.skillOnCareerService.delete(dto, user);
  }
}
