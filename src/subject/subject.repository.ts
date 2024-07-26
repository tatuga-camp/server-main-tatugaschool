import { GoogleStorageService } from './../google-storage/google-storage.service';
import { Injectable, Logger } from '@nestjs/common';
import { Subject } from '@prisma/client';
import {
  RequestCreateSubject,
  RequestDeleteSubject,
  RequestGetSubjectById,
  RequestReorderSubjects,
  RequestUpdateSubject,
} from './interfaces';
import { PrismaService } from '../prisma/prisma.service';

export type SubjectRepositoryType = {
  getSubjectById(request: RequestGetSubjectById): Promise<Subject | null>;
  createSubject(request: RequestCreateSubject): Promise<Subject>;
  updateSubject(request: RequestUpdateSubject): Promise<Subject>;
  deleteSubject(request: RequestDeleteSubject): Promise<{ message: string }>;
  reorderSubjects(request: RequestReorderSubjects): Promise<Subject[]>;
};
@Injectable()
export class SubjectRepository implements SubjectRepositoryType {
  logger: Logger = new Logger(SubjectRepository.name);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getSubjectById(
    request: RequestGetSubjectById,
  ): Promise<Subject | null> {
    try {
      return await this.prisma.subject.findUnique({
        where: {
          id: request.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSubject(request: RequestCreateSubject): Promise<Subject> {
    try {
      return await this.prisma.subject.create({
        data: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateSubject(request: RequestUpdateSubject): Promise<Subject> {
    try {
      return await this.prisma.subject.update({
        where: {
          id: request.query.subjectId,
        },
        data: {
          ...request.body,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderSubjects(request: RequestReorderSubjects): Promise<Subject[]> {
    try {
      const updatedSubjects = request.subjectIds.map((subjectId, index) => {
        return this.prisma.subject.update({
          where: {
            id: subjectId,
          },
          data: {
            order: index,
          },
        });
      });

      return Promise.all(updatedSubjects);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSubject(
    request: RequestDeleteSubject,
  ): Promise<{ message: string }> {
    try {
      const { subjectId } = request;
      const fileOnAssignments = await this.prisma.fileOnAssignment.findMany({
        where: {
          subjectId: subjectId,
        },
      });
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            subjectId: subjectId,
          },
        });
      // Delete related attendance records
      await this.prisma.attendance.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related attendanceRow records
      await this.prisma.attendanceRow.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related attendanceTable records
      await this.prisma.attendanceTable.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related scoreOnStudent records
      await this.prisma.scoreOnStudent.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related scoreOnSubject records
      await this.prisma.scoreOnSubject.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related studentOnSubjects records
      await this.prisma.studentOnSubject.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related teacherOnSubjects records
      await this.prisma.teacherOnSubject.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      await this.prisma.fileOnAssignment.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      await this.prisma.fileOnStudentAssignment.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      await this.prisma.skillOnAssignment.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      await this.prisma.studentOnAssignment.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      await this.prisma.assignment.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related commentOnAssignmentStudents records
      await this.prisma.commentOnAssignmentStudent.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      // Delete related commentOnAssignmentTeachers records
      await this.prisma.commentOnAssignmentTeacher.deleteMany({
        where: {
          subjectId: subjectId,
        },
      });

      Promise.allSettled([
        ...fileOnAssignments.map((file) =>
          this.googleStorageService.DeleteFileOnStorage({
            fileName: file.url,
          }),
        ),
        ...fileOnStudentAssignments.map((file) =>
          this.googleStorageService.DeleteFileOnStorage({
            fileName: file.url,
          }),
        ),
      ]);
      // Delete the subject
      await this.prisma.subject.delete({
        where: {
          id: subjectId,
        },
      });

      return { message: 'Delete subject successfully' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
