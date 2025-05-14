import { PrismaService } from '../prisma/prisma.service';
import { GroupOnSubjectRepository } from './group-on-subject.repository';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prismaService = new PrismaService();

describe('GroupOnSubjectRepository', () => {
  let groupRepository: GroupOnSubjectRepository;

  const subjectId = '6613bfe8801a6be179b0aaaa';
  const schoolId = '6613bfe8801a6be179b0aaaa';
  let groupOnSubjectId: string;

  beforeEach(() => {
    groupRepository = new GroupOnSubjectRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (groupOnSubjectId) {
        await groupRepository.delete({
          groupOnSubjectId: groupOnSubjectId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('create', () => {
    it('should create group on subject', async () => {
      try {
        const created = await groupRepository.create({
          data: {
            subjectId: subjectId,
            schoolId: schoolId,
            title: 'กลุ่มที่ 1',
            description: 'กลุ่มทดลองการสอน',
          },
        });

        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(subjectId);
        expect(created.title).toBe('กลุ่มที่ 1');
        expect(created.description).toBe('กลุ่มทดลองการสอน');

        groupOnSubjectId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find group by id', async () => {
      try {
        const result = await groupRepository.findUnique({
          where: {
            id: groupOnSubjectId,
          },
        });

        expect(result.id).toBe(groupOnSubjectId);
      } catch (error) {
        console.error('FindUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should find groups by subjectId', async () => {
      try {
        const result = await groupRepository.findMany({
          where: {
            subjectId: subjectId,
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((g) => g.id === groupOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('FindMany failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find first group by subjectId', async () => {
      try {
        const result = await groupRepository.findFirst({
          where: {
            subjectId: subjectId,
          },
        });

        expect(result.subjectId).toBe(subjectId);
      } catch (error) {
        console.error('FindFirst failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update group title', async () => {
      try {
        const updated = await groupRepository.update({
          where: {
            id: groupOnSubjectId,
          },
          data: {
            title: 'กลุ่มที่ 1 - แก้ไขแล้ว',
            description: 'กลุ่มทดลองการสอน แก้ไขแล้ว',
          },
        });

        expect(updated.title).toBe('กลุ่มที่ 1 - แก้ไขแล้ว');
        expect(updated.description).toBe('กลุ่มทดลองการสอน แก้ไขแล้ว');
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete group on subject', async () => {
      try {
        const deleted = await groupRepository.delete({
          groupOnSubjectId: groupOnSubjectId,
        });

        expect(deleted.id).toBe(groupOnSubjectId);
        groupOnSubjectId = ''; // ป้องกันลบซ้ำ
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
