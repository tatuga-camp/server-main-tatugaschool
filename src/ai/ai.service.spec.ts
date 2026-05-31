import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AuthService } from '../auth/auth.service';
import { GoogleGenAI } from '@google/genai';
import { of } from 'rxjs';
import axios from 'axios';

jest.mock('../auth/auth.service', () => ({
  AuthService: jest.fn(),
}));

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContentStream: jest.fn(),
      },
    })),
    ThinkingLevel: { HIGH: 'HIGH' },
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    },
    HarmBlockThreshold: { OFF: 'OFF' },
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GOOGLE_AI_KEY') return 'test-key';
              if (key === 'GOOGLE_CLOUD_PROJECT_ID') return 'test-project';
              return null;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {}, // Add mocked methods if necessary
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContent', () => {
    it('should generate text from stream correctly', async () => {
      // Setup mock stream response
      const mockStream = [{ text: 'Hello' }, { text: ' World' }];

      const mockGenerateContentStream = jest.fn().mockResolvedValue(mockStream);
      (service as any).googleAI.models.generateContentStream =
        mockGenerateContentStream;

      const result = await service.generateContent([
        { role: 'user', parts: [{ text: 'Test prompt' }] },
      ]);

      expect(mockGenerateContentStream).toHaveBeenCalled();
      expect(result).toBe('Hello World');
    });
  });

  describe('detectLanguage', () => {
    it('should detect language correctly via HttpService', async () => {
      const mockResponse = {
        data: {
          data: {
            detections: [[{ language: 'en' }]],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as any));

      const result = await service.detectLanguage('Hello', 'mock-token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://translation.googleapis.com/language/translate/v2/detect',
        { q: 'Hello' },
        { headers: { Authorization: 'Bearer mock-token' } },
      );
      expect(result).toBe('en');
    });
  });

  describe('translateText', () => {
    it('should translate text correctly via HttpService', async () => {
      const mockResponse = {
        data: {
          data: {
            translations: [{ translatedText: 'Hola' }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as any));

      const result = await service.translateText('Hello', 'es', 'mock-token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://translation.googleapis.com/language/translate/v2',
        { q: 'Hello', target: 'es', format: 'text' },
        { headers: { Authorization: 'Bearer mock-token' } },
      );
      expect(result).toBe('Hola');
    });
  });

  describe('embbedingText', () => {
    it('should fetch embedding via HttpService', async () => {
      const mockEmbeddingsResponse = {
        predictions: [[0.1, 0.2, 0.3]],
      };

      const mockResponse = {
        data: mockEmbeddingsResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as any));

      const result = await service.embbedingText('test text', 'mock-token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://asia-southeast1-aiplatform.googleapis.com/v1/projects/test-project/locations/asia-southeast1/publishers/google/models/text-embedding-005:predict',
        {
          instances: [
            {
              task_typ: 'SEMANTIC_SIMILARITY',
              content: 'test text',
            },
          ],
        },
        {
          headers: {
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );
      expect(result).toEqual(mockEmbeddingsResponse);
    });
  });

  describe('summarizeFile', () => {
    it('should return empty candidates if no supported files are provided', async () => {
      const result = await service.summarizeFile({
        imageURLs: [{ url: 'test.xyz', type: 'application/xyz' }],
        accessToken: 'token',
      });

      expect(result.candidates[0].content.parts[0].text).toBe('');
    });

    it('should process supported files and call generateContent', async () => {
      // Mock axios get
      mockedAxios.get.mockResolvedValue({ data: Buffer.from('mock-data') });

      // Mock generateContent
      jest
        .spyOn(service, 'generateContent')
        .mockResolvedValue('Summary of the file');

      const result = await service.summarizeFile({
        imageURLs: [
          { url: 'data:image/png;base64,iVBORw0KGgo', type: 'image/png' },
          { url: 'http://example.com/test.jpg', type: 'image/jpeg' },
        ],
        accessToken: 'token',
      });

      expect(service.generateContent).toHaveBeenCalled();
      expect(result.candidates[0].content.parts[0].text).toBe(
        'Summary of the file',
      );
    });
  });

  describe('suggestTeachingMaterialMetadata', () => {
    it('should return empty metadata if no supported files are provided', async () => {
      const result = await service.suggestTeachingMaterialMetadata({
        imageURLs: [{ url: 'test.xyz', type: 'application/xyz' }],
        accessToken: 'token',
      });

      expect(result).toEqual({
        title: '',
        titleTH: '',
        keywords: [],
        description: '',
      });
    });

    it('should process supported files, call generateContent, and parse JSON correctly', async () => {
      mockedAxios.get.mockResolvedValue({ data: Buffer.from('mock-data') });

      const mockJsonResponse =
        '```json\n' +
        '{\n' +
        '  "title": "Test Title",\n' +
        '  "titleTH": "Test Title TH",\n' +
        '  "keywords": ["tag1", "tag2"],\n' +
        '  "description": "Long description here..."\n' +
        '}\n' +
        '```';

      jest
        .spyOn(service, 'generateContent')
        .mockResolvedValue(mockJsonResponse);

      const result = await service.suggestTeachingMaterialMetadata({
        imageURLs: [{ url: 'http://example.com/test.jpg', type: 'image/jpeg' }],
        accessToken: 'token',
      });

      expect(service.generateContent).toHaveBeenCalled();
      expect(result).toEqual({
        title: 'Test Title',
        titleTH: 'Test Title TH',
        keywords: ['tag1', 'tag2'],
        description: 'Long description here...',
      });
    });

    it('should fallback to empty defaults and raw description if JSON parsing fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: Buffer.from('mock-data') });

      jest
        .spyOn(service, 'generateContent')
        .mockResolvedValue('Invalid JSON response');

      const result = await service.suggestTeachingMaterialMetadata({
        imageURLs: [{ url: 'http://example.com/test.jpg', type: 'image/jpeg' }],
        accessToken: 'token',
      });

      expect(result).toEqual({
        title: '',
        titleTH: '',
        keywords: [],
        description: 'Invalid JSON response',
      });
    });
  });

  describe('generateLineBotSummary', () => {
    it('should call generateContent with correct prompt', async () => {
      jest
        .spyOn(service, 'generateContent')
        .mockResolvedValue('Line bot response');

      const result = await service.generateLineBotSummary(
        'user message',
        'server data',
      );

      expect(service.generateContent).toHaveBeenCalled();
      const callArgs = (service.generateContent as jest.Mock).mock.calls[0][0];
      expect(callArgs[0].parts[0].text).toContain('user message');
      expect(callArgs[0].parts[0].text).toContain('server data');
      expect(result).toBe('Line bot response');
    });
  });
});
