import { PrismaService } from '../prisma/prisma.service';
import { SchoolRepository } from './school.repository';

describe('SchoolRepository', () => {
  const prismaService = new PrismaService();
  let schoolRepository: SchoolRepository;
  let schoolId: string;
  let schoolTitle: string;
  const customerId = '6644f3e1c8a4df26a6e3b9a1';

  beforeEach(() => {
    schoolRepository = new SchoolRepository(
      prismaService,
      { uploadPublicFile: jest.fn() } as any,
      {
        subjectRepository: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteSubject: jest.fn().mockResolvedValue(undefined),
        },
      } as any,
      {
        classRepository: {
          findMany: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(undefined),
        },
      } as any,
      {
        customers: {
          del: jest.fn().mockResolvedValue(undefined),
        },
      } as any,
    );
  });

  describe('create', () => {
    it('should create a school', async () => {
      try {
        const created = await schoolRepository.create({
          data: {
            title: 'โรงเรียนทดสอบ',
            description: 'รายละเอียดโรงเรียนทดสอบ',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 ถนนหลัก ตำบลในเมือง อำเภอเมือง',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
            phoneNumber: '0891234567',
            stripe_customer_id: customerId,
          },
        });

        expect(created.title).toBe('โรงเรียนทดสอบ');
        expect(created.description).toBe('รายละเอียดโรงเรียนทดสอบ');
        expect(created.country).toBe('Thailand');
        expect(created.city).toBe('Khon Kaen');
        expect(created.address).toBe('123 ถนนหลัก ตำบลในเมือง อำเภอเมือง');
        expect(created.zipCode).toBe('40000');
        expect(created.logo).toBe('https://example.com/logo.png');
        expect(created.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
        expect(created.phoneNumber).toBe('0891234567');
        expect(created.stripe_customer_id).toBe(customerId);

        schoolId = created.id;
        schoolTitle = created.title;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find school by id', async () => {
      try {
        const result = await schoolRepository.findUnique({
          where: {
            id: schoolId,
          },
        });

        expect(result.id).toBe(schoolId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find first school by city', async () => {
      try {
        const result = await schoolRepository.findFirst({
          where: {
            city: 'Khon Kaen',
          },
        });

        expect(result.city).toBe('Khon Kaen');
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
    it('should find first school by country', async () => {
      try {
        const result = await schoolRepository.findFirst({
          where: {
            country: 'Thailand',
          },
        });

        expect(result.city).toBe('Khon Kaen');
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of schools in Thailand', async () => {
      try {
        const result = await schoolRepository.findMany({
          where: {
            country: 'Thailand',
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === schoolId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
    it('should return list of schools in Khon Kaen', async () => {
      try {
        const result = await schoolRepository.findMany({
          where: {
            city: 'Khon Kaen',
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === schoolId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should return school using getById', async () => {
      try {
        const result = await schoolRepository.getById({
          schoolId: schoolId,
        });
        
        expect(result.id).toBe(schoolId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update all updatable school fields with Thai info', async () => {
      try {
        const updated = await schoolRepository.update({
          where: {
            id: schoolId,
          },
          data: {
            title: 'โรงเรียนบ้านหนองแสง',
            description: 'โรงเรียนชุมชนขนาดกลางในภาคตะวันออกเฉียงเหนือ',
            country: 'Thailand',
            city: 'อุดรธานี',
            address: '99 หมู่ 5 ตำบลหนองแสง อำเภอเมือง',
            zipCode: '41000',
            logo: 'https://example.com/logo-updated-thai.png',
            blurHash: 'L9AS#*IU00_3IUxut8Rj00WB^kRj',
            phoneNumber: '0812345678',
            billingManagerId: '6644f3e1c8a4df26a6e3b9a1', // mock Mongo ID
          },
        });

        expect(updated.title).toBe('โรงเรียนบ้านหนองแสง');
        expect(updated.description).toBe(
          'โรงเรียนชุมชนขนาดกลางในภาคตะวันออกเฉียงเหนือ',
        );
        expect(updated.country).toBe('Thailand');
        expect(updated.city).toBe('อุดรธานี');
        expect(updated.address).toBe('99 หมู่ 5 ตำบลหนองแสง อำเภอเมือง');
        expect(updated.zipCode).toBe('41000');
        expect(updated.logo).toBe('https://example.com/logo-updated-thai.png');
        expect(updated.blurHash).toBe('L9AS#*IU00_3IUxut8Rj00WB^kRj');
        expect(updated.phoneNumber).toBe('0812345678');
        expect(updated.billingManagerId).toBe('6644f3e1c8a4df26a6e3b9a1');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete school', async () => {
      try {
        const deleted = await schoolRepository.delete({
          schoolId: schoolId,
        });

        expect(deleted.id).toBe(schoolId);
        schoolId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
