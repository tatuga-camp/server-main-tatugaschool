import { PrismaService } from '../prisma/prisma.service';
import { CommentAssignmentRepository } from './comment-assignment.repository';

describe('CommentAssignmentRepository', () => {
  const prismaService = new PrismaService();
  let commentRepository: CommentAssignmentRepository;

  const StudentOnAssignmentId = '6613bfe8801a6be179b08888';
  const UserId = '6613bfe8801a6be179b09999';
  const subjectId = '6613bfe8801a6be179b0aaaa';
  const schoolId = '6613bfe8801a6be179b0bbbb';
  let commentId: string;

  beforeEach(() => {
    commentRepository = new CommentAssignmentRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (commentId) {
        await commentRepository.delete({
          commentOnAssignmentId: commentId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const created = await commentRepository.create({
        title: 'แสดงความคิดเห็นเกี่ยวกับการบ้าน',
        content: 'นี่คือคอมเมนต์ทดสอบ',
        studentOnAssignmentId: StudentOnAssignmentId,
        userId: UserId,
        firstName: 'Thanathorn',
        lastName: 'Chulay',
        subjectId: subjectId,
        schoolId: schoolId,
      });

      expect(created.content).toBe('นี่คือคอมเมนต์ทดสอบ');
      expect(created.studentOnAssignmentId).toBe(StudentOnAssignmentId);
      expect(created.userId).toBe(UserId);

      commentId = created.id;
    });
  });

  describe('getById', () => {
    it('should find comment by id', async () => {
      const found = await commentRepository.getById({
        commentOnAssignmentId: commentId,
      });
      expect(found.id).toBe(commentId);
    });
  });

  describe('getByStudentOnAssignmentId', () => {
    it('should find comments by studentOnAssignmentId', async () => {
      const comments = await commentRepository.getByStudentOnAssignmentId({
        studentOnAssignmentId: StudentOnAssignmentId,
      });
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.some((c) => c.id === commentId)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      const updated = await commentRepository.update({
        query: {
          commentOnAssignmentId: commentId,
        },
        body: {
          content: 'คอมเมนต์ถูกแก้ไข',
        },
      });

      expect(updated.id).toBe(commentId);
      expect(updated.content).toBe('คอมเมนต์ถูกแก้ไข');
    });
  });

  describe('delete', () => {
    it('should delete the comment', async () => {
      const deleted = await commentRepository.delete({
        commentOnAssignmentId: commentId,
      });
      expect(deleted.id).toBe(commentId);
      commentId = ''; // ป้องกันลบซ้ำใน afterAll
    });
  });
});
