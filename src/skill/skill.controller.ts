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
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import {
  CreateSkillDto,
  DeleteSkillDto,
  GetSkillByAssignmentDto,
  GetSkillDto,
  UpdateSkillDto,
} from './dto';
import { SkillService } from './skill.service';

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
    @GetUser() user: UserJwtPayload,
  ) {
    return this.skillService.findByVectorSearch(dto);
  }

  @UseGuards(UserGuard)
  @Post()
  async create(@Body() dto: CreateSkillDto, @GetUser() user: UserJwtPayload) {
    return this.skillService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async update(@Body() dto: UpdateSkillDto, @GetUser() user: UserJwtPayload) {
    return this.skillService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':skillId')
  async delete(@Param() dto: DeleteSkillDto, @GetUser() user: UserJwtPayload) {
    return this.skillService.delete(dto, user);
  }
}
