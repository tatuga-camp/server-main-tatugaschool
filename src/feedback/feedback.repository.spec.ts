import { FeedbackRepository } from './feedback.repository';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackTag } from '@prisma/client';

describe('FeedbackRepository', () => {
  let feedbackRepository: FeedbackRepository;
  const prismaService = new PrismaService();

  const userId = '6613bfe8801a6be179b08fff';
  let feedbackId: string;

  beforeEach(() => {
    feedbackRepository = new FeedbackRepository(prismaService);
  });

  describe('create', () => {
    it('should create feedback', async () => {
      try {
        const created = await feedbackRepository.create({
          data: {
            title: 'Feature Suggestion',
            body: 'Please add dark mode!',
            tag: FeedbackTag.REQUEST_FEATURE,
            userId: userId,
          },
        });

        expect(created.title).toBe('Feature Suggestion');
        expect(created.body).toBe('Please add dark mode!');
        expect(created.tag).toBe(FeedbackTag.REQUEST_FEATURE);
        expect(created.userId).toBe(userId);

        feedbackId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find feedback by id', async () => {
      try {
        const found = await feedbackRepository.findUnique({
          where: {
            id: feedbackId,
          },
        });
        expect(found.id).toBe(feedbackId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return feedbacks by tag', async () => {
      try {
        const results = await feedbackRepository.findMany({
          where: {
            tag: FeedbackTag.REQUEST_FEATURE,
          },
        });
        expect(results.some((f) => f.id === feedbackId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count feedbacks by tag', async () => {
      try {
        const count = await feedbackRepository.count({
          where: {
            tag: FeedbackTag.REQUEST_FEATURE,
          },
        });
        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error('count failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete feedback', async () => {
      try {
        const deleted = await feedbackRepository.delete({
          where: {
            id: feedbackId,
          },
        });
        expect(deleted.id).toBe(feedbackId);
        feedbackId = '';
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
