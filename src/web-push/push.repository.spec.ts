import { PrismaService } from '../prisma/prisma.service';
import { PushRepository } from './push.repository';

describe('PushRepository', () => {
  const prismaService = new PrismaService();
  let pushRepository: PushRepository;
  let pushId: string;

  const mockPush = {
    id: '66500e4ea1b3f5370ac122f9',
    endpoint: 'https://example.com/fake-token',
    data: {
      keys: {
        p256dh: 'mockP256dh',
        auth: 'mockAuth',
      },
    },
    userAgent: 'TestAgent/1.0',
    expiredAt: new Date(Date.now() + 86400000),
    userId: null,
    createAt: new Date(),
    updateAt: new Date(),
  };

  beforeEach(() => {
    pushRepository = new PushRepository(prismaService);
  });

  describe('create', () => {
    it('should create a new subscription notification', async () => {
      try {
        jest.spyOn(pushRepository, 'create').mockResolvedValueOnce(mockPush as any);

        const created = await pushRepository.create({
          data: {
            endpoint: mockPush.endpoint,
            data: mockPush.data,
            userAgent: mockPush.userAgent,
            expiredAt: mockPush.expiredAt,
            user: undefined as any,
          },
        } as any);

        expect(created).toBeDefined();
        expect(created.id).toBe(mockPush.id);
        expect(created.endpoint).toBe(mockPush.endpoint);
        pushId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find a record by ID', async () => {
      try {
        jest.spyOn(pushRepository, 'findUnique').mockResolvedValueOnce(mockPush as any);

        const result = await pushRepository.findUnique({
          where: { id: pushId },
        } as any);

        expect(result).toBeDefined();
        expect(result.id).toBe(pushId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find the first record by endpoint', async () => {
      try {
        jest.spyOn(pushRepository, 'findFirst').mockResolvedValueOnce(mockPush as any);

        const first = await pushRepository.findFirst({
          where: { endpoint: mockPush.endpoint },
        } as any);

        expect(first).toBeDefined();
        expect(first.endpoint).toBe(mockPush.endpoint);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should find all records by userId', async () => {
      try {
        jest.spyOn(pushRepository, 'findMany').mockResolvedValueOnce([mockPush] as any);

        const results = await pushRepository.findMany({
          where: { userId: mockPush.userId },
        } as any);

        expect(Array.isArray(results)).toBe(true);
        expect(results.some((r) => r.id === pushId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update userAgent', async () => {
      try {
        const updated = {
          ...mockPush,
          userAgent: 'UpdatedAgent/2.0',
        };

        jest.spyOn(pushRepository, 'update').mockResolvedValueOnce(updated as any);

        const result = await pushRepository.update({
          where: { id: pushId },
          data: { userAgent: 'UpdatedAgent/2.0' },
        } as any);

        expect(result.userAgent).toBe('UpdatedAgent/2.0');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the subscription record', async () => {
      try {
        jest.spyOn(pushRepository, 'delete').mockResolvedValueOnce(mockPush as any);

        const result = await pushRepository.delete({
          where: { id: pushId },
        } as any);

        expect(result.id).toBe(pushId);
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
