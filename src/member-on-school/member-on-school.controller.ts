import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Patch,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { MemberOnSchoolService } from './member-on-school.service';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolsDto,
  QueryMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchool, User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/member-on-schools')
export class MemberOnSchoolController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @UseGuards(UserGuard)
  @Get('user')
  async getByUserId(@GetUser() user: UserJwtPayload) {
    return this.memberOnSchoolService.getMemberOnSchoolByUserId(user);
  }

  @Get('invitation/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.memberOnSchoolService.getInvitationByToken(token);
  }

  @UseGuards(UserGuard)
  @Get('school/:schoolId')
  async getAllMemberOnSchools(
    @Param() param: GetMemberOnSchoolsDto,
    @Query() query: QueryMemberOnSchoolDto,
    @GetUser() user: UserJwtPayload,
  ) {
    const dto: GetMemberOnSchoolsDto & QueryMemberOnSchoolDto = {
      ...param,
      ...query,
    };
    return this.memberOnSchoolService.getAllMemberOnSchools(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  createMemberOnSchool(
    @Body() dto: CreateMemberOnSchoolDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.memberOnSchoolService.createMemberOnSchool(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':memberOnSchoolId')
  async deleteMemberOnSchool(
    @Param() dto: DeleteMemberOnSchoolDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.memberOnSchoolService.deleteMemberOnSchool(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateMemberOnSchool(
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: UserJwtPayload,
  ): Promise<MemberOnSchool> {
    return await this.memberOnSchoolService.updateMemberOnSchool(dto, user);
  }

  @UseGuards(UserGuard)
  @HttpCode(200)
  @Patch('invitation')
  async updateInvitation(
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: UserJwtPayload,
  ): Promise<{ message: string }> {
    return await this.memberOnSchoolService.AcceptMemberOnSchool(dto, user);
  }
}
