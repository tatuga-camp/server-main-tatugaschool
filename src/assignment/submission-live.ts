import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 404 for work whose assignment was soft-deleted; the scheduler removes it later. */
export async function assertSubmissionLive(
  prisma: PrismaService,
  studentOnAssignmentId: string,
): Promise<void> {
  const soa = await prisma.studentOnAssignment.findUnique({
    where: { id: studentOnAssignmentId },
    select: { id: true, assignment: { select: { isDeleted: true } } },
  });
  if (!soa || soa.assignment?.isDeleted) {
    throw new NotFoundException('Student work not found');
  }
}
