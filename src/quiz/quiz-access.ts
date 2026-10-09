import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Assignment, StudentOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

/**
 * A quiz is locked for editing once ANY of its StudentOnAssignment rows has an
 * attempt, assigned or not. Shared by the edit guard and the teacher monitor.
 */
export async function isQuizLocked(
  prisma: PrismaService,
  assignmentId: string,
): Promise<boolean> {
  const started = await prisma.studentOnAssignment.count({
    where: { assignmentId, quizAttempt: { isSet: true } },
  });
  return started > 0;
}

@Injectable()
export class QuizAccess {
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {}

  async teacherAssignment(
    assignmentId: string,
    user: UserJwtPayload,
  ): Promise<Assignment> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.type !== 'Quiz')
      throw new BadRequestException('Assignment is not a quiz');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: assignment.subjectId,
    });
    return assignment;
  }

  async teacherStudentOnAssignment(
    studentOnAssignmentId: string,
    user: UserJwtPayload,
  ): Promise<{ soa: StudentOnAssignment; assignment: Assignment }> {
    const soa = await this.prisma.studentOnAssignment.findUnique({
      where: { id: studentOnAssignmentId },
    });
    if (!soa) throw new NotFoundException('Student work not found');
    const assignment = await this.teacherAssignment(soa.assignmentId, user);
    return { soa, assignment };
  }

  async studentQuiz(
    studentOnAssignmentId: string,
    student: StudentJwtPayload,
  ): Promise<{ soa: StudentOnAssignment; assignment: Assignment }> {
    const found = await this.prisma.studentOnAssignment.findUnique({
      where: { id: studentOnAssignmentId },
      include: { assignment: true },
    });
    if (!found) throw new NotFoundException('Student work not found');
    if (found.studentId !== student.id) {
      throw new ForbiddenException(
        'You are not allowed to access this resource',
      );
    }
    const { assignment, ...soa } = found;
    if (assignment.type !== 'Quiz')
      throw new BadRequestException('Assignment is not a quiz');
    if (
      !soa.isAssigned ||
      assignment.status !== 'Published' ||
      assignment.beginDate.getTime() > Date.now()
    ) {
      throw new ForbiddenException('This quiz is not available');
    }
    return { soa, assignment };
  }
}
