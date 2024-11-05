import { Test, TestingModule } from '@nestjs/testing';
import { CareerService } from './career.service';
import { Career } from '@prisma/client';
import { DeleteCareerDto, UpdateCareerDto } from './dto';
import { AppModule } from '../app.module';

describe('CareerService', () => {
  let service: CareerService;
  let career: Career;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CareerService],
      imports: [AppModule],
    }).compile();

    service = module.get<CareerService>(CareerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('POST', () => {
    it('should create', async () => {
      const dto = {
        title: 'Career 1',
        description: 'Career 1 description',
        keywords: 'Keyword 1, Keyword 2',
      };
      const result = await service.create(dto);
      career = result;
      expect(result).toBeDefined();
    });
  });

  describe('GET', () => {
    it('should get by page', async () => {
      const dto = {
        page: 1,
        limit: 10,
      };
      const result = await service.getCareerByPage(dto);
      expect(result).toBeDefined();
    });
  });

  describe('PATCH', () => {
    it('should update', async () => {
      const dto: UpdateCareerDto = {
        query: { id: career.id },
        body: {
          title: 'Career 1 Updated',
          description: 'Career 1 description updated',
          keywords: 'Keyword 1, Keyword 2, Keyword 3',
        },
      };
      const result = await service.update(dto);
      expect(result).toBeDefined();
      expect(result.title).toBe(dto.body.title);
      expect(result.description).toBe(dto.body.description);
      expect(result.keywords).toBe(dto.body.keywords);
    });
  });

  describe('DELETE', () => {
    it('should delete', async () => {
      const dto: DeleteCareerDto = { id: career.id };
      const result = await service.delete(dto);
      expect(result.message).toBeDefined();
    });
  });
});
