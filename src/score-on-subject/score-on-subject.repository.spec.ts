import { PrismaService } from '../prisma/prisma.service';
import { ScoreOnSubjectRepository } from './score-on-subject.repository';

describe('ScoreOnSubjectRepository', () => {
  const prismaService = new PrismaService();
  let scoreOnSubjectRepository: ScoreOnSubjectRepository;

  const subjectId = '6644f3e1c8a4df26a6e3c111';
  const studentId = '6644f3e1c8a4df26a6e3a444';
  const schoolId = '6644f3e1c8a4df26a6e3a555';
  let scoreOnSubjectId: string;

  beforeEach(() => {
    scoreOnSubjectRepository = new ScoreOnSubjectRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (scoreOnSubjectId) {
        await scoreOnSubjectRepository.delete({
          scoreOnSubjectId: scoreOnSubjectId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('createScoreOnSubject', () => {
    it('should create a score-on-subject record', async () => {
      try {
        const created = await scoreOnSubjectRepository.createSocreOnSubject({
          score: 100,
          title: 'คะแนนเก็บ',
          icon: 'https://example.com/icons/score.png',
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
          subjectId: subjectId,
          schoolId: schoolId,
        });

        expect(created.score).toBe(100);
        expect(created.title).toBe('คะแนนเก็บ');
        expect(created.icon).toBe('https://example.com/icons/score.png');
        expect(created.blurHash).toBe('LKO2?U%2Tw=w]~RBVZRi};RPxuwH');
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);

        scoreOnSubjectId = created.id;
      } catch (error) {
        console.error('createScoreOnSubject failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find score-on-subject by ID', async () => {
      try {
        const found = await scoreOnSubjectRepository.findUnique({
          where: {
            id: scoreOnSubjectId,
          },
        });

        expect(found.id).toBe(scoreOnSubjectId);
        expect(found.subjectId).toBe(subjectId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of score-on-subject records', async () => {
      try {
        const result = await scoreOnSubjectRepository.findMany({
          where: {
            subjectId: subjectId,
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === scoreOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('getAllScoreOnSubjectBySubjectId', () => {
    it('should return score-on-subjects for subjectId', async () => {
      try {
        const result =
          await scoreOnSubjectRepository.getAllScoreOnSubjectBySubjectId({
            subjectId: subjectId,
          });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === scoreOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('getAllScoreOnSubjectBySubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('updateScoreOnSubject', () => {
    it('should update score, title, and icon', async () => {
      try {
        const updated = await scoreOnSubjectRepository.updateScoreOnSubject({
          query: {
            scoreOnSubjectId: scoreOnSubjectId,
          },
          body: {
            score: 75,
            title: 'คะแนนแก้ไข',
            icon: 'https://example.com/icons/updated.png',
            blurHash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I',
            isDeleted: false,
          },
        });

        expect(updated.id).toBe(scoreOnSubjectId);
        expect(updated.score).toBe(75);
        expect(updated.title).toBe('คะแนนแก้ไข');
        expect(updated.icon).toBe('https://example.com/icons/updated.png');
        expect(updated.blurHash).toBe('L5H2EC=PM+yV0g-mq.wG9c010J}I');
        expect(updated.isDeleted).toBe(false);
      } catch (error) {
        console.error('updateScoreOnSubject failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete score-on-subject', async () => {
      try {
        const deleted = await scoreOnSubjectRepository.delete({
          scoreOnSubjectId: scoreOnSubjectId,
        });

        expect(deleted.id).toBe(scoreOnSubjectId);
        scoreOnSubjectId = ''; // ป้องกันลบซ้ำ
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
