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
  suggestTeachingMaterialMetadata(dto: {
    imageURLs: { url: string; type: string }[];
    accessToken: string;
  }): Promise<{
    title: string;
    titleTH: string;
    keywords: string[];
    description: string;
  }>;
  generateLineBotSummary(userInput: string, serverData: any): Promise<string>;
};

@Injectable()
export class AiService implements AiType {
  logger: Logger;
  private googleAI: GoogleGenAI;
  constructor(
    private config: ConfigService,
    private httpService: HttpService,
  ) {
    this.logger = new Logger(AiService.name);
    this.googleAI = new GoogleGenAI({
      apiKey: this.config.get('GOOGLE_AI_KEY'),
    });
  }

  async generateContent(
    request: ContentListUnion,
    model: string = 'gemini-3.1-flash-lite',
    maxOutputTokens: number = 65536,
    thinkingLevel: ThinkingLevel = ThinkingLevel.HIGH,
  ) {
    const streamingResp = await this.googleAI.models.generateContentStream({
      model: model,
      contents: request,
      config: {
        maxOutputTokens: maxOutputTokens,
        temperature: 1,
        topP: 0.95,
        thinkingConfig: {
          thinkingLevel: thinkingLevel,
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

  // Gemini rejects requests whose total body exceeds ~20MB with a 400
  // INVALID_ARGUMENT. base64 inflates raw bytes by ~33%, so cap the cumulative
  // *raw* inline payload at ~14MB to leave headroom for the prompt + encoding.
  // Any file that would push the request past this cap is skipped.
  private static readonly GEMINI_INLINE_LIMIT_BYTES = 14 * 1024 * 1024;

  /**
   * Resolve a media reference to its raw bytes + mime type, never buffering more
   * than `maxBytes` into memory. Returns `null` (skip) when the media is too big
   * or the fetch fails, so a single huge file can't OOM the process or abort the
   * whole request. Handles both `data:` URIs and remote URLs.
   */
  private async resolveMediaBytes(
    url: { url: string; type: string },
    maxBytes: number,
  ): Promise<{ mimeType: string; base64: string; bytes: Buffer } | null> {
    let mimeType = url.type;

    if (url.url.startsWith('data:')) {
      // data:[<mime>][;base64],<payload> — Gemini's inlineData.data must be the
      // raw base64 payload only, NOT the full data URI. Strip the prefix.
      const match = url.url.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s);
      if (!match || !match[2]) {
        this.logger.warn('Skipping media: invalid data URI');
        return null;
      }
      if (match[1]) {
        mimeType = match[1];
      }
      // Estimate decoded size from the base64 length and bail BEFORE allocating
      // the decoded Buffer if it's already over budget.
      const estimatedBytes = Math.floor((match[2].length * 3) / 4);
      if (estimatedBytes > maxBytes) {
        this.logger.warn(
          `Skipping media (${mimeType}, ~${estimatedBytes} bytes): exceeds the Gemini inline request budget`,
        );
        return null;
      }
      return {
        mimeType,
        base64: match[2],
        bytes: Buffer.from(match[2], 'base64'),
      };
    }

    try {
      // maxContentLength/maxBodyLength are enforced chunk-by-chunk by the axios
      // Node adapter, so an oversized (or gzip-bomb) response is aborted mid
      // stream — memory is bounded by maxBytes, not the full file size.
      const response = await axios.get(url.url, {
        responseType: 'arraybuffer',
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
      });
      const bytes = Buffer.from(response.data);
      return { mimeType, base64: bytes.toString('base64'), bytes };
    } catch (error: any) {
      this.logger.warn(
        `Skipping media (${url.url}): ${error?.message ?? 'fetch failed'}`,
      );
      return null;
    }
  }

  /**
   * Build the multimodal `parts` array for a set of media references, keeping
   * inline data under Gemini's ~20MB request cap. Files are processed
   * sequentially against a shrinking budget so peak memory is one file at a time
   * (≤ the remaining budget), never the sum of all files. Anything that doesn't
   * fit is skipped (and logged) without being fully downloaded.
   */
  private async buildContentParts(
    supportedFiles: { url: string; type: string }[],
  ): Promise<any[]> {
    const parts: any[] = [];
    let budgetRemaining = AiService.GEMINI_INLINE_LIMIT_BYTES;

    for (const file of supportedFiles) {
      if (budgetRemaining <= 0) {
        this.logger.warn(
          `Skipping media (${file.type}): Gemini inline request budget exhausted`,
        );
        continue;
      }

      const media = await this.resolveMediaBytes(file, budgetRemaining);
      if (!media) {
        continue;
      }

      // Defense in depth: even if the transport didn't enforce the cap (e.g. no
      // Content-Length), never let the cumulative inline payload exceed budget.
      if (media.bytes.length > budgetRemaining) {
        this.logger.warn(
          `Skipping media (${media.mimeType}, ${media.bytes.length} bytes): exceeds the Gemini inline request budget`,
        );
        continue;
      }

      budgetRemaining -= media.bytes.length;
      parts.push({
        inlineData: { mimeType: media.mimeType, data: media.base64 },
      });
    }

    return parts;
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

      const parts = await this.buildContentParts(supportedFiles);
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

  async suggestTeachingMaterialMetadata(dto: {
    imageURLs: { url: string; type: string }[];
    accessToken: string;
  }): Promise<{
    title: string;
    titleTH: string;
    keywords: string[];
    description: string;
  }> {
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

      const supportedFiles = dto.imageURLs.filter((url) =>
        supportFilesType.includes(url.type),
      );

      if (supportedFiles.length === 0) {
        return {
          title: '',
          titleTH: '',
          keywords: [],
          description: '',
        };
      }

      const parts = await this.buildContentParts(supportedFiles);
      const response = await this.generateContent([
        {
          role: 'user',
          parts: [
            ...parts,
            {
              text: 'Analyze the content of this teaching material. Return ONLY a valid JSON object with the following properties: "title" (English title. 1. Determine if the material is a "worksheet", a "presentation", or "other". 2. Identify the education level and the main topic. The topic must be meaningful and specific, describing the objective, not just the subject e.g. use \'English Skills Practice about animal (Prepositions)\' instead of just \'English Skills Practice\'. 3. Format: for worksheet use "worksheet: [Topic] for [Education Level]", for presentation use "presentation: [Topic] for [Education Level]". If no education level is found, omit the "for [Education Level]" part.), "titleTH" (Thai title. Follow the same rules as the English title but in Thai. Format: for worksheet use "ใบงานเรื่อง [Topic] สำหรับ [Education Level]", for presentation use "พรีเซนเทชันเรื่อง [Topic] สำหรับ [Education Level]". If no education level is found, omit the "สำหรับ [Education Level]" part. Ensure it naturally incorporates the original intent.), "keywords" (an array of 5-10 relevant keywords or tags), and "description" (Analyze the content and purpose of this teaching material. Include the subject, topic, activity types, target grade level in Thai Education System and grade level on US, and relevant 21st-century skills and it should be longer than 200 words). Do not include any markdown formatting or extra text outside the JSON object.',
            },
          ],
        },
      ]);

      try {
        const cleanResponse = response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        const parsed = JSON.parse(cleanResponse);
        return {
          title: parsed.title || '',
          titleTH: parsed.titleTH || '',
          keywords: parsed.keywords || [],
          description: parsed.description || '',
        };
      } catch (e) {
        this.logger.error('Failed to parse JSON response from Gemini', e);
        return {
          title: '',
          titleTH: '',
          keywords: [],
          description: response,
        };
      }
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

  async generateLineBotSummary(
    userInput: string,
    serverData: string,
  ): Promise<string> {
    try {
      const prompt = `You are an AI assistant helping a user via a LINE bot. 
The user asked or stated: "${userInput}"

Here is the relevant information from the server:
${serverData}

Your tasks:
1. Analyze the user's input and predict what the user needs or is trying to achieve.
2. Provide a concise, helpful response based on the server information that directly addresses the user's needs.
3. Format your response so it is suitable for a LINE bot message (use emojis, bullet points, keep it friendly and easy to read on mobile screens).
4. Don't use **. Instead, use ALL CAPS for emphasis if needed. ** **`;
      const response = await this.generateContent([
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ]);

      return response;
    } catch (error) {
      this.logger.error('Failed to generate LINE bot summary:', error);
      throw error;
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
