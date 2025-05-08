import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentRepository } from './assignment.repository';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

describe('Assignment repository', () => {
  let assignmentRepository: AssignmentRepository;
  const prismaService = new PrismaService();
  const configService = new ConfigService();
  const googleStorageService = new GoogleStorageService(configService, prismaService);

  beforeEach(async () => {
    assignmentRepository = new AssignmentRepository(prismaService, googleStorageService);
  });

  let assignmentId: string;
  let subjectId: string = '660d16ef446ebda4dbd74f7e';
  let schoolId: string = '660d16ef446ebda4dbd74f7f';
  let userId: string = '660d16ef446ebda4dbd74f80';

  describe('create', () => {
    it('should create assignment', async () => {
      try {
        const created = await assignmentRepository.create({
          data: {
            title: 'Assignment Test',
            description: '<p>รายละเอียด</p>',
            beginDate: new Date().toISOString(),
            type: 'Assignment',
            status: 'Draft',
            subjectId: subjectId,
            userId: userId,
            schoolId: schoolId,
          },
        });

        expect(created.title).toBe('Assignment Test');
        expect(created.subjectId).toBe(subjectId);
        expect(created.status).toBe('Draft');
        assignmentId = created.id;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should return assignment by id', async () => {
      try {
        const assignment = await assignmentRepository.getById({
          assignmentId,
        });

        expect(assignment.id).toBe(assignmentId);
        expect(assignment.title).toBeDefined();
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update assignment with full fields', async () => {
      try {
        const updated = await assignmentRepository.update({
          where: { id: assignmentId },
          data: {
            title: 'Updated Full Title',
            description: '<p>Updated description content</p>',
            maxScore: 100,
            weight: 10,
            beginDate: new Date('2025-06-01T00:00:00Z'),
            dueDate: new Date('2025-06-10T00:00:00Z'),
            status: 'Published',
            type: 'Assignment',
          },
        });

        expect(updated.id).toBe(assignmentId);
        expect(updated.title).toBe('Updated Full Title');
        expect(updated.description).toBe('<p>Updated description content</p>');
        expect(updated.maxScore).toBe(100);
        expect(updated.weight).toBe(10);
        expect(new Date(updated.beginDate).toISOString()).toBe(new Date('2025-06-01T00:00:00Z').toISOString());
        expect(new Date(updated.dueDate).toISOString()).toBe(new Date('2025-06-10T00:00:00Z').toISOString());
        expect(updated.status).toBe('Published');
        expect(updated.type).toBe('Assignment');
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should return count of assignments for subject', async () => {
      try {
        const count = await assignmentRepository.count({
          where: {
            subjectId,
          },
        });

        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return assignment array', async () => {
      try {
        const assignments = await assignmentRepository.findMany({
          where: {
            subjectId,
          },
        });

        expect(assignments.length).toBeGreaterThan(0);
        expect(assignments[0].subjectId).toBe(subjectId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getBySubjectId', () => {
    it('should return assignment by subjectId', async () => {
      try {
        const assignments = await assignmentRepository.getBySubjectId({
          subjectId,
        });

        expect(assignments.length).toBeGreaterThan(0);
        expect(assignments[0].subjectId).toBe(subjectId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete assignment and return message', async () => {
      try {
        const deleted = await assignmentRepository.delete({
          assignmentId,
        });

        expect(deleted.message).toBe('Deleted Assignment Successfully');
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });
});
