import { AuthService } from '../auth/auth.service';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EmbeddingsResponse, ResponseNonStreamingText } from './models';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, lastValueFrom } from 'rxjs';
import axios from 'axios';
import {
  ContentListUnion,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
} from '@google/genai';

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
  private googleAI: GoogleGenAI;
  constructor(
    private config: ConfigService,
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    this.logger = new Logger(AiService.name);
    this.googleAI = new GoogleGenAI({
      apiKey: this.config.get('GOOGLE_AI_KEY'),
    });
  }

  async generateContent(request: ContentListUnion) {
    const streamingResp = await this.googleAI.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: request,
      config: {
        maxOutputTokens: 65535,
        temperature: 1,
        topP: 0.95,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.OFF,
          },
        ],
      },
    });

    let fullResponse = '';

    for await (const chunk of streamingResp) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullResponse += chunkText;
      }
    }

    return fullResponse;
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

      const supportedFiles = dto.imageURLs.filter((url) =>
        supportFilesType.includes(url.type),
      );

      if (supportedFiles.length === 0) {
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

      const parts = await Promise.all(
        supportedFiles.map(async (url) => {
          if (url.url.startsWith('data:')) {
            return {
              inlineData: {
                mimeType: url.type,
                data: url.url,
              },
            };
          }
          const response = await axios.get(url.url, {
            responseType: 'arraybuffer',
          });
          const base64Data = Buffer.from(response.data).toString('base64');
          return {
            inlineData: {
              mimeType: url.type,
              data: base64Data,
            },
          };
        }),
      );
      const response = await this.generateContent([
        {
          role: 'user',
          parts: [
            ...parts,
            {
              text: 'Describe the content and purpose of this teaching material. Include the subject, topic, activity types, target grade level, and relevant 21st-century skills.',
            },
          ],
        },
      ]);
      return {
        candidates: [
          {
            content: {
              role: 'USER',
              parts: [
                {
                  text: response,
                },
              ],
            },
            finishReason: '',
            avgLogprobs: 0,
          },
        ],
      };
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
