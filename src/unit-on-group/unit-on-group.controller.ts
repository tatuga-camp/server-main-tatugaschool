import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import {
  CreateUnitOnGroupDto,
  DeleteUnitOnGroupDto,
  ReorderUnitOnGroupDto,
  UpdateUnitOnGroupDto,
} from './dto';
import { UnitOnGroupService } from './unit-on-group.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/unit-on-groups')
export class UnitOnGroupController {
  constructor(private unitOnGroupService: UnitOnGroupService) {}

  @Post()
  @UseGuards(UserGuard)
  async create(
    @Body() dto: CreateUnitOnGroupDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.unitOnGroupService.create(dto, user);
  }

  @Patch()
  @UseGuards(UserGuard)
  async update(
    @Body() dto: UpdateUnitOnGroupDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.unitOnGroupService.update(dto, user);
  }

  @Patch('reorder')
  @UseGuards(UserGuard)
  async reorder(
    @Body() dto: ReorderUnitOnGroupDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.unitOnGroupService.reorder(dto, user);
  }

  @Delete(':unitOnGroupId')
  @UseGuards(UserGuard)
  async delete(
    @Param() dto: DeleteUnitOnGroupDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return await this.unitOnGroupService.delete(dto, user);
  }
}
