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
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import {
  CreateSchoolDto,
  DeleteSchoolDto,
  GetSchoolByIdDto,
  UpdateSchoolDto,
} from './dto';
import { SchoolService } from './school.service';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/schools')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  @Get()
  async findAll(@GetUser() user: UserJwtPayload) {
    return this.schoolService.getSchools(user);
  }

  @Post()
  async create(@GetUser() user: UserJwtPayload, @Body() dto: CreateSchoolDto) {
    return await this.schoolService.createSchool(dto, user);
  }
  @Patch()
  async update(@Body() dto: UpdateSchoolDto, @GetUser() user: UserJwtPayload) {
    return await this.schoolService.updateSchool(dto, user);
  }

  @Delete(':schoolId')
  async remove(@Param() dto: DeleteSchoolDto, @GetUser() user: UserJwtPayload) {
    return this.schoolService.deleteSchool(dto, user);
  }

  @Get(':schoolId')
  async findOne(
    @Param() dto: GetSchoolByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.schoolService.getSchoolById(dto, user);
  }
}
