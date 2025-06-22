import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';

import { TeachingMaterialService } from './teaching-material.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Patch,
  Param,
  Res,
} from '@nestjs/common';
import { UserGuard } from '../auth/guard';
import {
  CreateTeachingMaterialDto,
  GetDescriptionSuggestionDto,
  GetTeachingMaterialDto,
  GetTeachingMaterialsDto,
} from './dto';
import {
  GernearteThumnailDto,
  UpdateTeachingMaterialDto,
} from './dto/patch-teaching-material.dto';

@Controller('v1/teaching-materials')
export class TeachingMaterialController {
  constructor(private teachingMaterialService: TeachingMaterialService) {}

  @UseGuards(UserGuard)
  @Get()
  getByAI(@Query() dto: GetTeachingMaterialsDto) {
    return this.teachingMaterialService.findByAI(dto);
  }

  @UseGuards(UserGuard)
  @Get(':teachingMaterialId')
  get(@Param() dto: GetTeachingMaterialDto, @GetUser() user: User) {
    return this.teachingMaterialService.get(dto, user);
  }

  @UseGuards(UserGuard)
  @Post('ai/description')
  GetDescription(@Body() dto: GetDescriptionSuggestionDto) {
    return this.teachingMaterialService.suggestionVectorResouce(dto);
  }

  @UseGuards(UserGuard)
  @Post()
  Create(@Body() dto: CreateTeachingMaterialDto, @GetUser() user: User) {
    return this.teachingMaterialService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  Update(@Body() dto: UpdateTeachingMaterialDto, @GetUser() user: User) {
    return this.teachingMaterialService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch('thumnail/:teachingMaterialId')
  GenerateThumnail(@Param() dto: GernearteThumnailDto, @GetUser() user: User) {
    return this.teachingMaterialService.createThumnail(dto, user);
  }
}
