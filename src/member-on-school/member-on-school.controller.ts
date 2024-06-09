import { Body, Controller, Post } from '@nestjs/common';
import { MemberOnSchoolService } from './member-on-school.service';
import { CreateMemberOnSchoolDto } from './dto';

@Controller('member-on-school')
export class MemberOnSchoolController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @Post()
  createMemberOnSchool(@Body() dto: CreateMemberOnSchoolDto) {
    return this.memberOnSchoolService.createMemberOnSchool(dto);
  }
}
