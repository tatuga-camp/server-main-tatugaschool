import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { MemberOnSchoolService } from './member-on-school.service';
import {
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolDto,
  GetSchoolByMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchool, User } from '@prisma/client';
import { GetUser } from 'src/auth/decorators';

@Controller('v1/member-on-school')
export class MemberOnSchoolController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @Get()
  async getAllMemberOnSchools() {
    return this.memberOnSchoolService.getAllMemberOnSchools();
  }

  @Get(':id')
  async getMemberOnSchoolById(@Param() params: GetMemberOnSchoolDto) {
    return this.memberOnSchoolService.getMemberOnSchoolById(params);
  }

  @Get(':id/school')
  async getSchoolByMemberOnSchoolId(
    @Param() params: GetSchoolByMemberOnSchoolDto,
  ) {
    return this.memberOnSchoolService.getSchoolByMemberOnSchoolId(
      params.memberOnSchoolId,
    );
  }

  @Post()
  createMemberOnSchool(
    @Body() dto: CreateMemberOnSchoolDto,
    @GetUser() user: User,
  ) {
    return this.memberOnSchoolService.createMemberOnSchool(dto, user);
  }

  @Delete(':id')
  async deleteMemberOnSchool(
    @Param() params: DeleteMemberOnSchoolDto,
  ): Promise<void> {
    await this.memberOnSchoolService.deleteMemberOnSchool(params);
  }
  @Patch(':id')
  async updateMemberOnSchool(
    @Param() params: GetMemberOnSchoolDto,
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: User,
  ): Promise<MemberOnSchool> {
    return await this.memberOnSchoolService.updateMemberOnSchool(
      params.memberOnSchoolId,
      dto,
      user,
    );
  }
}
