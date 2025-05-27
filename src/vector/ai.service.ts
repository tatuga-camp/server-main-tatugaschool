import { AuthService } from '../auth/auth.service';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EmbeddingsResponse, ResponseNonStreamingText } from './models';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, lastValueFrom } from 'rxjs';

type AiType = {
  embbedingText(text: string, accessToken: string): Promise<EmbeddingsResponse>;
  summarizeFile(dto: {
    imageURLs: { url: string; type: string }[];
    accessToken: string;
  }): Promise<ResponseNonStreamingText>;
  detectLanguage(text: string, accessToken: string): Promise<string>;
  translateText(
    text: string,
    targetLang: string,
    accessToken: string,
  ): Promise<string>;
};
@Injectable()
export class AiService implements AiType {
  logger: Logger;
  constructor(
    private config: ConfigService,
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    this.logger = new Logger(AiService.name);
  }

  async summarizeFile(dto: {
    imageURLs: { url: string; type: string }[];
    accessToken: string;
  }): Promise<ResponseNonStreamingText> {
    try {
      const supportFilesType = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/x-matroska',
        'video/quicktime',
        'application/pdf',
        'text/plain',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/webm',
        'audio/x-m4a',
        'audio/opus',
        'audio/aac',
        'audio/flac',
        'audio/L16',
      ];

      if (
        dto.imageURLs.filter((url) => supportFilesType.includes(url.type))
          .length === 0
      ) {
        return {
          candidates: [
            {
              content: {
                role: 'USER',
                parts: [
                  {
                    text: '',
                  },
                ],
              },
              finishReason: '',
              avgLogprobs: 0,
            },
          ],
        };
      }
      const PROJECT_ID = this.config.get('GOOGLE_CLOUD_PROJECT_ID');
      const LOCATION_ID = 'us-central1';
      const API_ENDPOINT = 'us-central1-aiplatform.googleapis.com';
      const MODEL_ID = 'gemini-2.5-flash-preview-05-20';
      const GENERATE_CONTENT_API = 'generateContent';
      console.log(PROJECT_ID);
      const response = this.httpService
        .post<ResponseNonStreamingText>(
          `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:${GENERATE_CONTENT_API}`,
          {
            contents: [
              {
                role: 'user',
                parts: [
                  ...dto.imageURLs
                    .filter((url) => supportFilesType.includes(url.type))
                    .map((url) => {
                      return {
                        fileData: {
                          mimeType: url.type,
                          fileUri: url.url,
                        },
                      };
                    }),
                  {
                    text: "Describe the content and purpose of this image. If it is a worksheet, summarize the subject, topic, and type of activities included. If it is an assignment attachment, explain how it supports the student's task. Include any relevant text, images, or instructions present in the image.",
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT'],
              temperature: 1,
              maxOutputTokens: 4370,
              topP: 0.95,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'OFF',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'OFF',
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'OFF',
              },
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'OFF',
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${dto.accessToken}`,
              'Content-Type': 'text/plain; charset=utf-8',
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            this.logger.error(e);
            throw new HttpException(e.response?.data, e.response?.status);
          }),
        );
      const checkResult = await lastValueFrom(response);
      return checkResult.data;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async detectLanguage(text: string, accessToken: string): Promise<string> {
    const url =
      'https://translation.googleapis.com/language/translate/v2/detect';
    const headers = { Authorization: `Bearer ${accessToken}` };
    const data = { q: text };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers }),
      );

      const detections = response?.data?.data?.detections;
      const detectedLanguage = detections[0][0].language;
      return detectedLanguage;
    } catch (error) {
      throw new HttpException(
        'Failed to detect language',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async translateText(
    text: string,
    targetLang: string,
    accessToken: string,
  ): Promise<string> {
    const url = 'https://translation.googleapis.com/language/translate/v2';
    const headers = { Authorization: `Bearer ${accessToken}` };
    const data = { q: text, target: targetLang, format: 'text' };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers }),
      );

      const translations = response.data.data.translations[0].translatedText;
      return translations;
    } catch (error) {
      throw new HttpException(
        'Failed to translate text',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async embbedingText(
    text: string,
    accessToken: string,
  ): Promise<EmbeddingsResponse> {
    try {
      const response = this.httpService
        .post<EmbeddingsResponse>(
          `https://asia-southeast1-aiplatform.googleapis.com/v1/projects/${this.config.get('GOOGLE_CLOUD_PROJECT_ID')}/locations/asia-southeast1/publishers/google/models/text-embedding-005:predict`,
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
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
          },
        )
        .pipe(
          catchError((e: any) => {
            this.logger.error(e.response);
            throw new HttpException(e.response?.data, e.response?.status);
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
