import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateCareerDto,
  DeleteCareerDto,
  GetCareerByPageDto,
  UpdateCareerDto,
} from './dto';
import { AdminGuard } from '../auth/guard';
import { CareerService } from './career.service';

@UseGuards(AdminGuard)
@Controller('v1/careers')
export class CareerController {
  constructor(private careerService: CareerService) {}
  @Get()
  getByPage(@Query() dto: GetCareerByPageDto) {
    return this.careerService.getCareerByPage(dto);
  }

  @Post()
  create(@Body() dto: CreateCareerDto) {
    return this.careerService.create(dto);
  }

  @Patch()
  update(@Body() dto: UpdateCareerDto) {
    return this.careerService.update(dto);
  }

  @Delete(':id')
  delete(@Param() dto: DeleteCareerDto) {
    return this.careerService.delete(dto);
  }
}
