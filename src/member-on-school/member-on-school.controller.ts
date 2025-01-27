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

@UseGuards(UserGuard)
@Controller('v1/member-on-schools')
export class MemberOnSchoolController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @Get('user')
  async getByUserId(@GetUser() user: User) {
    return this.memberOnSchoolService.getMemberOnSchoolByUserId(user);
  }

  @Get('school/:schoolId')
  async getAllMemberOnSchools(
    @Param() param: GetMemberOnSchoolsDto,
    @Query() query: QueryMemberOnSchoolDto,
    @GetUser() user: User,
  ) {
    const dto: GetMemberOnSchoolsDto & QueryMemberOnSchoolDto = {
      ...param,
      ...query,
    };
    return this.memberOnSchoolService.getAllMemberOnSchools(dto, user);
  }

  @Post()
  createMemberOnSchool(
    @Body() dto: CreateMemberOnSchoolDto,
    @GetUser() user: User,
  ) {
    return this.memberOnSchoolService.createMemberOnSchool(dto, user);
  }

  @Delete(':memberOnSchoolId')
  async deleteMemberOnSchool(
    @Param() dto: DeleteMemberOnSchoolDto,
    @GetUser() user: User,
  ) {
    return await this.memberOnSchoolService.deleteMemberOnSchool(dto, user);
  }

  @Patch()
  async updateMemberOnSchool(
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: User,
  ): Promise<MemberOnSchool> {
    return await this.memberOnSchoolService.updateMemberOnSchool(dto, user);
  }

  @HttpCode(200)
  @Patch('invitation')
  async updateInvitation(
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: User,
  ): Promise<{ message: string }> {
    return await this.memberOnSchoolService.AcceptMemberOnSchool(dto, user);
  }
}
