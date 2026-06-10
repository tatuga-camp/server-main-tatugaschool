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
import { WordCloudSetService } from './word-cloud-set.service';
import {
  AppendQuestionDto,
  CreateWordCloudSetDto,
  EditQuestionDto,
  GetWordCloudSetsBySubjectDto,
  SetQuestionParamDto,
  UpdateWordCloudSetDto,
  WordCloudSetIdParamDto,
} from './dto';

@Controller('v1/word-cloud-sets')
export class WordCloudSetController {
  constructor(private service: WordCloudSetService) {}

  @UseGuards(UserGuard)
  @Post()
  create(
    @Body() dto: CreateWordCloudSetDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId')
  findBySubject(
    @Param() dto: GetWordCloudSetsBySubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.findBySubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(
    @Body() dto: UpdateWordCloudSetDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Post(':setId/questions')
  appendQuestion(
    @Param('setId') setId: string,
    @Body() dto: AppendQuestionDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.appendQuestion({ setId }, dto, user);
  }

  @UseGuards(UserGuard)
  @Patch(':setId/questions/:wordCloudId')
  editQuestion(
    @Param() param: SetQuestionParamDto,
    @Body() dto: EditQuestionDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.editQuestion(param, dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':setId/questions/:wordCloudId')
  deleteQuestion(
    @Param() param: SetQuestionParamDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.deleteQuestion(param, user);
  }

  @UseGuards(UserGuard)
  @Get(':setId')
  getById(
    @Param() dto: WordCloudSetIdParamDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.getById(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':setId')
  deleteSet(
    @Param() dto: WordCloudSetIdParamDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.service.deleteSet(dto, user);
  }

  // ---- Student-facing ----

  @Get(':setId/public')
  getPublic(@Param() dto: WordCloudSetIdParamDto) {
    return this.service.getPublic(dto);
  }
}
