import { AuthService } from './../auth/auth.service';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { EmbeddingsResponse } from './models';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom } from 'rxjs';

type VectorType = {
  embbedingText(text: string): Promise<EmbeddingsResponse>;
};
@Injectable()
export class VectorService implements VectorType {
  logger: Logger;
  constructor(
    private config: ConfigService,
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    this.logger = new Logger(VectorService.name);
  }

  async embbedingText(text: string): Promise<EmbeddingsResponse> {
    try {
      const access_token = await this.authService.getGoogleAccessToken();

      const response = this.httpService
        .post<EmbeddingsResponse>(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/${this.config.get('GOOGLE_CLOUD_PROJECT_ID')}/locations/us-central1/publishers/google/models/textembedding-gecko@003:predict`,
          {
            instances: [
              {
                task_typ: 'SEMANTIC_SIMILARITY',
                content: text,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            throw new HttpException(e.response.data, e.response.status);
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
