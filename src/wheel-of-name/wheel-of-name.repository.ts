import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  RequestCreate,
  RequestGet,
  RequestUpdate,
  ResponseCreate,
  ResponseGet,
  ResponseUpdate,
} from './interfaces';
import { catchError, lastValueFrom } from 'rxjs';

type Repository = {
  create(request: RequestCreate): Promise<ResponseCreate>;
  update(request: RequestUpdate): Promise<ResponseUpdate>;
  get(request: RequestGet): Promise<ResponseGet>;
};

@Injectable()
export class WheelOfNameRepository implements Repository {
  private logger: Logger;
  constructor(
    private httpService: HttpService,
    private config: ConfigService,
  ) {
    this.logger = new Logger(WheelOfNameRepository.name);
  }

  async get(request: RequestGet): Promise<ResponseGet> {
    try {
      const response = this.httpService
        .get<ResponseGet>(
          `https://wheelofnames.com/api/v2/wheels/${request.where.path}`,
          {
            headers: {
              'x-api-key': this.config.get('WHEEL_OF_NAME_SECRET_KEY'),
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            this.logger.error(e);
            throw e;
          }),
        );
      const checkResult = await lastValueFrom(response);
      return checkResult.data;
    } catch (error) {
      throw error;
    }
  }

  async create(request: RequestCreate): Promise<ResponseCreate> {
    try {
      const response = this.httpService
        .post<ResponseCreate>(
          `https://wheelofnames.com/api/v2/wheels`,
          {
            ...request,
          },
          {
            headers: {
              'x-api-key': this.config.get('WHEEL_OF_NAME_SECRET_KEY'),
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            this.logger.error(e);
            throw e;
          }),
        );
      const checkResult = await lastValueFrom(response);
      return checkResult.data;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(request: RequestUpdate): Promise<ResponseUpdate> {
    try {
      const response = this.httpService
        .put<ResponseUpdate>(
          `https://wheelofnames.com/api/v1/wheels/${request.where.path}`,
          {
            ...request.data,
          },
          {
            headers: {
              'x-api-key': this.config.get('WHEEL_OF_NAME_SECRET_KEY'),
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            this.logger.error(e);
            throw e;
          }),
        );
      const checkResult = await lastValueFrom(response);
      return checkResult.data;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
