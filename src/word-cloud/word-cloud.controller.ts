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
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';
import { WordCloudService } from './word-cloud.service';
import {
  AnswerWordCloudDto,
  CreateWordCloudDto,
  DeleteWordCloudDto,
  GetWordCloudByIdDto,
  GetWordCloudsBySubjectDto,
  UpdateWordCloudDto,
  WordCloudIdParamDto,
} from './dto';

@Controller('v1/word-clouds')
export class WordCloudController {
  constructor(private wordCloudService: WordCloudService) {}

  @UseGuards(UserGuard)
  @Post()
  create(@Body() dto: CreateWordCloudDto, @GetUser() user: UserJwtPayload) {
    return this.wordCloudService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId')
  findBySubject(
    @Param() dto: GetWordCloudsBySubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.wordCloudService.findBySubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Get(':wordCloudId')
  getById(
    @Param() dto: GetWordCloudByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.wordCloudService.getById(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(@Body() dto: UpdateWordCloudDto, @GetUser() user: UserJwtPayload) {
    return this.wordCloudService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':wordCloudId')
  delete(
    @Param() dto: DeleteWordCloudDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.wordCloudService.delete(dto, user);
  }

  // ---- Student-facing ----

  @Get(':wordCloudId/public')
  getPublic(@Param() param: WordCloudIdParamDto) {
    return this.wordCloudService.getPublic(param);
  }

  @Post(':wordCloudId/answer/public')
  submitPublic(
    @Param() param: WordCloudIdParamDto,
    @Body() dto: AnswerWordCloudDto,
  ) {
    return this.wordCloudService.submitPublic(param, dto);
  }

  @UseGuards(StudentGuard)
  @Post(':wordCloudId/answer/student')
  submitStudent(
    @Param() param: WordCloudIdParamDto,
    @Body() dto: AnswerWordCloudDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.wordCloudService.submitStudent(param, dto, student);
  }
}
