import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { StudentGuard, UserGuard } from '../auth/guard';
import { GetStudent, GetUser } from '../auth/decorators';
import { SubscribeNotificationDto } from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @UseGuards(UserGuard)
  @Post('subscribe')
  subscribe(
    @GetUser() user: UserJwtPayload,
    @Body() data: SubscribeNotificationDto,
  ) {
    return this.pushService.subscribe(data, user);
  }

  @UseGuards(StudentGuard)
  @Post('subscribe/student')
  subscribeStudent(
    @GetStudent() student: StudentJwtPayload,
    @Body() data: SubscribeNotificationDto,
  ) {
    return this.pushService.subscribeStudent(data, student);
  }
}
