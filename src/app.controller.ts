import { Controller, Get, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Req() request: FastifyRequest): { message: string } {
    return this.appService.getHello(request);
  }
}
