import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class AppService {
  getHello(request: FastifyRequest): { message: string } {
    const fullUrl = `${request.protocol}://${request.hostname}${request.url}`;
    return {
      message: `welcome to tatuga school server running at ${fullUrl}`,
    };
  }
}
