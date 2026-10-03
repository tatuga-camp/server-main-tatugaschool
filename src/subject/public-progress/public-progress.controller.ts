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
import { GetUser } from '../../auth/decorators';
import { UserGuard } from '../../auth/guard';
import { UserJwtPayload } from '../../interfaces/jwt-payload';
import { GetSubjectByIdDto } from '../dto';
import {
  PublicProgressLevelDto,
  PublicProgressTokenParamDto,
} from './public-progress.dto';
import { PublicProgressService } from './public-progress.service';

@Controller('v1/subjects')
export class PublicProgressController {
  constructor(private readonly publicProgressService: PublicProgressService) {}

  // Public — no guard. Two path segments, so it never collides with the
  // single-segment `GET v1/subjects/:subjectId` route.
  @Get('public-progress/:token')
  getPublicProgress(@Param() param: PublicProgressTokenParamDto) {
    return this.publicProgressService.getByToken(param.token);
  }

  @UseGuards(UserGuard)
  @Post(':subjectId/public-progress')
  share(
    @Param() param: GetSubjectByIdDto,
    @Body() body: PublicProgressLevelDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.publicProgressService.share(
      { subjectId: param.subjectId, level: body.level },
      user,
    );
  }

  @UseGuards(UserGuard)
  @Patch(':subjectId/public-progress')
  updateLevel(
    @Param() param: GetSubjectByIdDto,
    @Body() body: PublicProgressLevelDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.publicProgressService.updateLevel(
      { subjectId: param.subjectId, level: body.level },
      user,
    );
  }

  @UseGuards(UserGuard)
  @Delete(':subjectId/public-progress')
  revoke(@Param() param: GetSubjectByIdDto, @GetUser() user: UserJwtPayload) {
    return this.publicProgressService.revoke(
      { subjectId: param.subjectId },
      user,
    );
  }
}
