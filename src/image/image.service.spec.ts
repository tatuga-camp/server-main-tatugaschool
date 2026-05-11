import { Test, TestingModule } from '@nestjs/testing';
import { ImageService } from './image.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Partially mock canvas to avoid native issues in some CI environments
jest.mock('canvas', () => {
  return {
    createCanvas: jest.fn().mockReturnValue({
      getContext: jest.fn().mockReturnValue({
        fillRect: jest.fn(),
        fillText: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest
          .fn()
          .mockReturnValue({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1,
          }),
      }),
      toDataURL: jest
        .fn()
        .mockReturnValue('data:image/png;base64,mockedbase64'),
      width: 200,
      height: 200,
    }),
    loadImage: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
  };
});

jest.mock('blurhash', () => ({
  encode: jest.fn().mockReturnValue('mock-blurhash'),
}));

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageService],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBase64Image', () => {
    it('should generate base64 image from letter', () => {
      const result = service.generateBase64Image('A');
      expect(result).toContain('data:image/png;base64');
    });

    it('should default to A if letter is invalid', () => {
      const result = service.generateBase64Image('123');
      expect(result).toContain('data:image/png;base64');
    });
  });

  describe('encodeImageToBlurhash', () => {
    it('should encode image to blurhash string', async () => {
      const result = await service.encodeImageToBlurhash('http://pic.jpg');
      expect(result).toBe('mock-blurhash');
    });
  });
});
