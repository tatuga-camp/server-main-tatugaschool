import { Public } from './../auth/decorators/public.decorator';
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
  GetMemberOnSchoolByIdDto,
  GetMemberOnSchoolsDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { MemberOnSchool, User } from '@prisma/client';
import { GetUser } from 'src/auth/decorators';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/member-on-schools')
export class MemberOnSchoolController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @Get()
  async getByUserId(@GetUser() user: User) {
    return this.memberOnSchoolService.getMemberOnSchoolByUserId(user);
  }
  @Get('schoolId/:schoolId')
  async getAllMemberOnSchools(
    @Param() dto: GetMemberOnSchoolsDto,
    @GetUser() user: User,
  ) {
    return this.memberOnSchoolService.getAllMemberOnSchools(dto, user);
  }

  @Get(':memberOnSchoolId')
  async getMemberOnSchoolById(
    @Param() dto: GetMemberOnSchoolByIdDto,
    @GetUser() user: User,
  ) {
    return this.memberOnSchoolService.getMemberOnSchoolById(dto, user);
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
  ): Promise<void> {
    await this.memberOnSchoolService.deleteMemberOnSchool(dto, user);
  }

  @Patch(':memberOnSchoolId')
  async updateMemberOnSchool(
    @Body() dto: UpdateMemberOnSchoolDto,
    @GetUser() user: User,
  ): Promise<MemberOnSchool> {
    return await this.memberOnSchoolService.updateMemberOnSchool(dto, user);
  }

  @HttpCode(200)
  @Patch('invitation')
  async updateInvitation(@Body() dto: UpdateMemberOnSchoolDto): Promise<void> {
    return await this.memberOnSchoolService.AcceptMemberOnSchool(dto);
  }
}
