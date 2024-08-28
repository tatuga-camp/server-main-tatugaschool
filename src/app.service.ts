import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AppService {
  getHello(request: Request): { message: string } {
    const fullUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    return {
      message: `welcome to tatuga school server running at ${fullUrl}`,
    };
  }
}
