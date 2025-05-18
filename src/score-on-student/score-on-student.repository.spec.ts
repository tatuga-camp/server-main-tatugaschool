import { PrismaService } from '../prisma/prisma.service';
import { ScoreOnStudentRepository } from './score-on-student.repository';

describe('ScoreOnStudentRepository', () => {
  const prismaService = new PrismaService();
  let scoreOnStudentRepository: ScoreOnStudentRepository;

  const studentOnSubjectId = '6644f3e1c8a4df26a6e3a111';
  const scoreOnSubjectId = '6644f3e1c8a4df26a6e3a222';
  const subjectId = '6644f3e1c8a4df26a6e3a333';
  const studentId = '6644f3e1c8a4df26a6e3a444';
  const schoolId = '6644f3e1c8a4df26a6e3a555';
  let scoreOnStudentId: string;

  beforeEach(() => {
    scoreOnStudentRepository = new ScoreOnStudentRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (scoreOnStudentId) {
        await scoreOnStudentRepository.deleteScoreOnStudent({
          scoreOnStudentId: scoreOnStudentId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('createScoreOnStudent', () => {
    it('should create a score record', async () => {
      try {
        const created = await scoreOnStudentRepository.createSocreOnStudent({
          score: 85,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
          title: 'คะแนนกลางภาค',
          icon: 'https://example.com/icons/midterm.png',
          subjectId: subjectId,
          scoreOnSubjectId: scoreOnSubjectId,
          studentId: studentId,
          schoolId: schoolId,
          studentOnSubjectId: studentOnSubjectId,
        });

        expect(created.score).toBe(85);
        expect(created.blurHash).toBe('LKO2?U%2Tw=w]~RBVZRi};RPxuwH');
        expect(created.title).toBe('คะแนนกลางภาค');
        expect(created.icon).toBe('https://example.com/icons/midterm.png');
        expect(created.subjectId).toBe(subjectId);
        expect(created.scoreOnSubjectId).toBe(scoreOnSubjectId);
        expect(created.studentId).toBe(studentId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.studentOnSubjectId).toBe(studentOnSubjectId);

        scoreOnStudentId = created.id;
      } catch (error) {
        console.error('createScoreOnStudent failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of all score records', async () => {
      try {
        const result = await scoreOnStudentRepository.findMany({
          where: {
            studentOnSubjectId: studentOnSubjectId,
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === scoreOnStudentId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('getAllScoreOnStudentBySubjectId', () => {
    it('should return scores by subjectId', async () => {
      try {
        const result =
          await scoreOnStudentRepository.getAllScoreOnStudentBySubjectId({
            subjectId: scoreOnSubjectId,
          });

        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.error('getAllScoreOnStudentBySubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('getAllScoreOnStudentByStudentId', () => {
    it('should return scores by studentOnSubjectId', async () => {
      try {
        const result =
          await scoreOnStudentRepository.getAllScoreOnStudentByStudentId({
            studentOnSubjectId: studentOnSubjectId,
          });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === scoreOnStudentId)).toBe(true);
      } catch (error) {
        console.error('getAllScoreOnStudentByStudentId failed:', error);
        throw error;
      }
    });
  });

  describe('updateScoreOnStudent', () => {
    it('should update the score, title, and icon fields', async () => {
      try {
        const updated = await scoreOnStudentRepository.updateScoreOnStudent({
          query: {
            scoreOnStudentId: scoreOnStudentId,
          },
          body: {
            score: 95,
            title: 'คะแนนปลายภาค',
            icon: 'https://example.com/icons/final.png',
          },
        });

        expect(updated.id).toBe(scoreOnStudentId);
        expect(updated.score).toBe(95);
        expect(updated.title).toBe('คะแนนปลายภาค');
        expect(updated.icon).toBe('https://example.com/icons/final.png');
      } catch (error) {
        console.error('updateScoreOnStudent failed:', error);
        throw error;
      }
    });
  });

  describe('deleteScoreOnStudent', () => {
    it('should delete score and return message', async () => {
      try {
        const result = await scoreOnStudentRepository.deleteScoreOnStudent({
          scoreOnStudentId: scoreOnStudentId,
        });

        expect(result.message).toBe('Delete score on student successfully');
        scoreOnStudentId = ''; // ป้องกันลบซ้ำ
      } catch (error) {
        console.error('deleteScoreOnStudent failed:', error);
        throw error;
      }
    });
  });
});
