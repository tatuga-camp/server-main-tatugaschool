import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberOnSchoolDto } from './create-member-on-school.dto';

export class UpdateMemberOnSchoolDto extends PartialType(
  CreateMemberOnSchoolDto,
) {}
