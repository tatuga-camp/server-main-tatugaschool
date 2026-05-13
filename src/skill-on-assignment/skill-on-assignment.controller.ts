import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from '../auth/guard';
import { SkillOnAssignmentService } from './skill-on-assignment.service';
import {
  CreateSkillOnAssignmentDto,
  DeleteSkillOnAssignmentDto,
  GetSkillOnAssignmentByAssignmentId,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/skill-on-assignments')
export class SkillOnAssignmentController {
  constructor(
    private readonly skillOnAssignmentService: SkillOnAssignmentService,
  ) {}

  @Get('/assignment/:assignmentId')
  getByAssignmentId(
    @Param() dto: GetSkillOnAssignmentByAssignmentId,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.skillOnAssignmentService.getByAssignmentId(dto, user);
  }

  @Post()
  create(
    @Body() dto: CreateSkillOnAssignmentDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.skillOnAssignmentService.create(dto, user);
  }

  @Delete('/:skillOnAssignmentId')
  delete(
    @Param() dto: DeleteSkillOnAssignmentDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.skillOnAssignmentService.delete(dto, user);
  }
}
