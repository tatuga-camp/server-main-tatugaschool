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

  describe('create', () => {
    it('should create a comment', async () => {
      try {
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
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should find comment by id', async () => {
      try {
        const found = await commentRepository.getById({
          commentOnAssignmentId: commentId,
        });
        expect(found.id).toBe(commentId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('getByStudentOnAssignmentId', () => {
    it('should find comments by studentOnAssignmentId', async () => {
      try {
        const comments = await commentRepository.getByStudentOnAssignmentId({
          studentOnAssignmentId: StudentOnAssignmentId,
        });
        expect(Array.isArray(comments)).toBe(true);
        expect(comments.some((c) => c.id === commentId)).toBe(true);
      } catch (error) {
        console.error('getByStudentOnAssignmentId failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      try {
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
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the comment', async () => {
      try {
        const deleted = await commentRepository.delete({
          commentOnAssignmentId: commentId,
        });
        expect(deleted.id).toBe(commentId);
        commentId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
