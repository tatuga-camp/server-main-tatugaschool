import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { RubricService } from './rubric.service';
import {
  AiDraftRubricDto,
  CreateRubricDto,
  GetRubricsBySubjectDto,
  RubricIdParamDto,
  UpdateRubricDto,
} from './dto';

@Controller('v1/rubrics')
export class RubricController {
  constructor(private rubricService: RubricService) {}

  @UseGuards(UserGuard)
  @Post()
  create(@Body() dto: CreateRubricDto, @GetUser() user: UserJwtPayload) {
    return this.rubricService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId')
  findBySubject(
    @Param() dto: GetRubricsBySubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.rubricService.findBySubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Get(':rubricId')
  getById(@Param() dto: RubricIdParamDto, @GetUser() user: UserJwtPayload) {
    return this.rubricService.getById(dto, user);
  }

  @UseGuards(UserGuard)
  @Post('ai-draft')
  aiDraft(
    @Body() dto: AiDraftRubricDto,
    @GetUser() user: UserJwtPayload,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken = (authorization ?? '').replace(/^Bearer\s+/i, '');
    return this.rubricService.aiDraft(dto, user, accessToken);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(@Body() dto: UpdateRubricDto, @GetUser() user: UserJwtPayload) {
    return this.rubricService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':rubricId')
  delete(@Param() dto: RubricIdParamDto, @GetUser() user: UserJwtPayload) {
    return this.rubricService.delete(dto, user);
  }
}
