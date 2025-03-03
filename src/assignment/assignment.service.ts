import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Assignment,
  FileOnAssignment,
  Prisma,
  Skill,
  Student,
  StudentOnAssignment,
  User,
} from '@prisma/client';
import * as cheerio from 'cheerio';
import { Workbook } from 'exceljs';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { FileAssignmentRepository } from '../file-assignment/file-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SkillOnAssignmentService } from './../skill-on-assignment/skill-on-assignment.service';
import { SkillService } from './../skill/skill.service';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { SubjectService } from './../subject/subject.service';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { VectorService } from './../vector/vector.service';
import { AssignmentRepository } from './assignment.repository';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  ReorderAssignmentDto,
  UpdateAssignmentDto,
} from './dto';
import { firstValueFrom } from 'rxjs';
import { TeacherOnSubjectRepository } from 'src/teacher-on-subject/teacher-on-subject.repository';
import { MemberOnSchoolRepository } from 'src/member-on-school/member-on-school.repository';
import { HttpService } from '@nestjs/axios';
import { AuthService } from 'src/auth/auth.service';
import { PredictionServiceClient, protos } from '@google-cloud/aiplatform';
import axios from 'axios';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import pdfParse from 'pdf-parse';
import { ImageAnnotatorClient } from '@google-cloud/vision';

@Injectable()
export class AssignmentService {
  private logger: Logger = new Logger(AssignmentService.name);
  assignmentRepository: AssignmentRepository;
  private fileAssignmentRepository: FileAssignmentRepository;
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;

  GOOGLE_TRANSLATION_ENDPOINT = 'https://translation.googleapis.com';
  PROJECT_ID = 'tatuga-425319';

  private predictionClient: PredictionServiceClient;
  private endpoint: string;

  private visionClient = new ImageAnnotatorClient();

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private subjectService: SubjectService,
    private studentOnSubjectService: StudentOnSubjectService,
    private skillService: SkillService,
    private skillOnAssignmentService: SkillOnAssignmentService,
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    this.predictionClient = new PredictionServiceClient();

    const projectId = this.PROJECT_ID;
    const location = 'us-central1';

    this.endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/text-bison@001`;
  }

  async getAssignmentById(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<Assignment & { files: FileOnAssignment[]; skills: Skill[] }> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      const files = await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: assignment.id,
      });

      const skills = await this.skillOnAssignmentService.getByAssignmentId(
        { assignmentId: assignment.id },
        user,
      );
      return { ...assignment, files, skills: skills.map((s) => s.skill) };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAssignmentBySubjectId(
    dto: GetAssignmentBySubjectIdDto,
    user?: User | undefined,
    student?: Student | undefined,
  ): Promise<
    (Assignment & {
      files: FileOnAssignment[];
      studentAssign: number;
      reviewNumber: number;
      summitNumber: number;
      penddingNumber: number;
      studentOnAssignment?: StudentOnAssignment;
    })[]
  > {
    try {
      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });
      }
      let studentsOnAssignments: StudentOnAssignment[] = [];
      if (student) {
        const studentOnSubject =
          await this.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: dto.subjectId },
          });

        studentsOnAssignments =
          await this.studentOnAssignmentRepository.findMany({
            where: {
              subjectId: dto.subjectId,
              studentOnSubjectId: studentOnSubject.id,
              isAssigned: true,
            },
          });

        if (!studentOnSubject) {
          throw new ForbiddenException('Student not enrolled in this subject');
        }
      }

      let assignments = await this.assignmentRepository
        .findMany({
          where: {
            ...(student
              ? {
                  id: { in: studentsOnAssignments.map((s) => s?.assignmentId) },
                }
              : { subjectId: dto.subjectId }),
          },
        })
        .then((assignments) => {
          return assignments.map((assignment) => {
            delete assignment.vector;
            return { ...assignment };
          });
        });

      if (student) {
        assignments = assignments.filter(
          (assignment) => assignment.status === 'Published',
        );
      }

      const allStudentOnAssignments =
        await this.studentOnAssignmentRepository.findMany({
          where: {
            subjectId: dto.subjectId,
          },
        });

      const files = await this.fileAssignmentRepository.findMany({
        where: {
          assignmentId: { in: assignments.map((assignment) => assignment.id) },
        },
      });

      return assignments.map((assignment) => {
        const studentOnAssignments = allStudentOnAssignments.filter(
          (s) => s.assignmentId === assignment.id,
        );
        return {
          ...assignment,
          studentAssign: studentOnAssignments.length,
          summitNumber: studentOnAssignments.filter(
            (s) => s.status === 'SUBMITTED',
          ).length,
          penddingNumber: studentOnAssignments.filter(
            (s) => s.status === 'PENDDING',
          ).length,
          reviewNumber: studentOnAssignments.filter(
            (s) => s.status === 'REVIEWD',
          ).length,
          files: files.filter((file) => file.assignmentId === assignment.id),
          //if request come from student attrach studentOnAssignment
          studentOnAssignment:
            studentsOnAssignments.length > 0
              ? studentsOnAssignments.find(
                  (s) => s.assignmentId === assignment.id,
                )
              : undefined,
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getOverviewScoreOnAssignment(
    dto: { subjectId: string },
    user: User,
  ): Promise<{ assignment: Assignment; students: StudentOnAssignment[] }[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const assignments = await this.assignmentRepository.findMany({
        where: { subjectId: dto.subjectId, status: 'Published' },
      });

      const studentsOnSubjects =
        await this.studentOnAssignmentRepository.findMany({
          where: { subjectId: dto.subjectId },
        });

      return assignments.map((assignment) => {
        return {
          assignment,
          students: studentsOnSubjects.filter(
            (student) => student.assignmentId === assignment.id,
          ),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createAssignment(
    dto: CreateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      if (dto.type === 'Assignment' && (!dto.beginDate || !dto.maxScore)) {
        throw new BadRequestException(
          'Assign at and max score are required for assignment ',
        );
      }
      if (dto.type === 'Material') {
        delete dto?.maxScore;
        delete dto?.dueDate;
        delete dto?.weight;
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const subject = await this.subjectService.subjectRepository.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject Not Found');
      }

      const assignment = await this.assignmentRepository.create({
        data: { ...dto, schoolId: _member.schoolId, userId: user.id },
      });

      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: { subjectId: assignment.subjectId },
      });

      const createStudentOnAssignments = studentOnSubjects.map(
        (student): Prisma.StudentOnAssignmentCreateManyInput => {
          return {
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            number: student.number,
            blurHash: student.blurHash,
            photo: student.photo,
            schoolId: student.schoolId,
            assignmentId: assignment.id,
            studentId: student.studentId,
            studentOnSubjectId: student.id,
            subjectId: student.subjectId,
          };
        },
      );

      await this.studentOnAssignmentRepository.createMany({
        data: createStudentOnAssignments,
      });
      if (assignment.type === 'Assignment') {
        this.BackgroudEmbedingAssignment(assignment.id, user);
      }

      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async BackgroudEmbedingAssignment(assignmentId: string, user: User) {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: assignmentId,
      });
      await this.EmbedingAssignment(assignment.id);

      const skills = await this.skillService.findByVectorSearch({
        assignmentId: assignment.id,
      });

      const exsitingSkills =
        await this.skillOnAssignmentService.getByAssignmentId(
          { assignmentId: assignment.id },
          user,
        );

      const newSkills = skills.filter(
        (skill) => !exsitingSkills.some((s) => s.skillId === skill.id),
      );

      const exsitingSkillNotInNewSkills = exsitingSkills.filter(
        (skill) => !skills.some((s) => s.id === skill.skillId),
      );

      await Promise.allSettled(
        newSkills.map((skill) =>
          this.skillOnAssignmentService.skillOnAssignmentRepository.create({
            skillId: skill.id,
            assignmentId: assignment.id,
            subjectId: assignment.subjectId,
          }),
        ),
      );

      await Promise.allSettled(
        exsitingSkillNotInNewSkills.map((skill) =>
          this.skillOnAssignmentService.delete(
            { skillOnAssignmentId: skill.id },
            user,
          ),
        ),
      );
      return;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async summarizeWithVertex(text: string): Promise<string> {
    if (!text) {
      return '';
    }

    try {
      const request: protos.google.cloud.aiplatform.v1.IPredictRequest = {
        endpoint: this.endpoint,
        instances: [
          {
            structValue: {
              fields: {
                content: {
                  stringValue: `Summarize the following text in a concise way: ${text.slice(0, 1000)}`, // Limit input size
                },
              },
            },
          },
        ],
        parameters: {
          structValue: {
            fields: {
              temperature: { numberValue: 0.2 },
              maxOutputTokens: { numberValue: 256 },
              topK: { numberValue: 40 },
              topP: { numberValue: 0.8 },
            },
          },
        },
      };

      const [response] = await this.predictionClient.predict(request);
      const summary =
        response?.predictions?.[0]?.structValue?.fields?.content?.stringValue;

      if (!summary) {
        throw new Error('No summary generated');
      }

      return summary;
    } catch (error) {
      this.logger.error('Error in summarizeWithVertex:', error);
      return `Summary: ${text.slice(0, 100)}...`;
    }
  }

  async EmbedingAssignment(assignmentId: string) {
    try {
      let text: string = '';
      const assignment = await this.assignmentRepository.getById({
        assignmentId: assignmentId,
      });

      text += assignment.title;

      // extract text from html
      const doc = cheerio.load(assignment.description);
      text += doc('body').text();
      const files = await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: assignment.id,
      });

      const accessToken = await this.authService.getGoogleAccessToken();

      // 1. Detect the language of the combined text.
      const detectedLanguage = await this.detectLanguage(text, accessToken);
      // 2. If the language is not English, translate it to English.
      if (detectedLanguage !== 'en') {
        text = await this.translateText(text, 'en', accessToken);
      }

      // Summarize each file's content in English
      const summaries = [];
      for (const file of files) {
        // Download and read text from file (อาจเป็น doc/pdf/image ฯลฯ)
        const fileText = await this.readAndConvertFile(file.url);

        // Summarize with Vertex AI
        if (fileText) {
          const summary = await this.summarizeWithVertex(fileText);
          summaries.push({ fileName: file.id, summary });
        }
      }

      text += '\n' + summaries.map((s) => s.summary).join('\n');

      const vectors = await this.vectorService.embbedingText(text);
      return await this.assignmentRepository.update({
        where: { id: assignmentId },
        data: {
          vector: vectors.predictions[0].embeddings.values,
          vectorResouce: text,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * ดึงไฟล์จาก URL -> ตรวจสอบประเภทไฟล์ -> ถ้าเป็น Office/อื่นๆ ก็แปลงเป็น PDF
   * ถ้าเป็นภาพ (.png, .jpg, .jpeg) ใช้ Vision API OCR -> ส่งคืนข้อความ
   */
  private async readAndConvertFile(fileUrl: string): Promise<string> {
    const tempDir = '/tmp';
    const fileName = path.basename(fileUrl);
    const filePath = path.join(tempDir, fileName);

    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      writeFileSync(filePath, response.data);

      // Process file based on extension
      const extension = path.extname(fileName).toLowerCase();
      let result = '';

      try {
        switch (extension) {
          case '.pdf':
            result = await this.parsePdf(filePath);
            break;
          case '.txt':
            result = response.data.toString();
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
            result = await this.extractTextFromImage(filePath);
            break;
          default:
            const pdfPath = await this.convertToPdf(filePath);
            result = await this.parsePdf(pdfPath);
            // Clean up converted PDF
            exec(`rm ${pdfPath}`);
            break;
        }
      } finally {
        // Clean up temp file
        exec(`rm ${filePath}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error processing file ${fileUrl}:`, error);
      throw error;
    }
  }

  /**
   * ใช้ pdf-parse แปลง PDF -> string
   */
  private async parsePdf(filePath: string): Promise<string> {
    const pdfBuffer = readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    return pdfData.text || '';
  }

  /**
   * ตัวอย่างใช้ LibreOffice CLI แปลง doc, docx, ppt เป็นต้น -> PDF
   */
  private async convertToPdf(inputPath: string): Promise<string> {
    const tempDir = path.dirname(inputPath);
    return new Promise((resolve, reject) => {
      exec(
        `soffice --headless --convert-to pdf --outdir "${tempDir}" "${inputPath}"`,
        (error) => {
          if (error) {
            return reject(error);
          }
          // แปลงเสร็จไฟล์ .pdf จะมีชื่อเดียวกับ input แต่เปลี่ยน .xxx -> .pdf
          const outPath = inputPath.replace(path.extname(inputPath), '.pdf');
          resolve(outPath);
        },
      );
    });
  }

  /**
   * OCR ด้วย Google Cloud Vision API
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    // เรียก visionClient.textDetection
    const [result] = await this.visionClient.textDetection(filePath);
    const detections = result.textAnnotations;
    if (detections && detections.length > 0) {
      // textAnnotations[0] คือข้อความทั้งหมด
      return detections[0].description ?? '';
    }
    return '';
  }

  async reorder(dto: ReorderAssignmentDto, user: User): Promise<Assignment[]> {
    try {
      const assignments = await this.assignmentRepository.findMany({
        where: { id: { in: dto.assignmentIds } },
      });

      if (assignments.length !== dto.assignmentIds.length) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignments[0].subjectId,
      });

      const sortAssignments = dto.assignmentIds.map((assignmentId, index) => {
        return this.assignmentRepository.update({
          where: { id: assignmentId },
          data: { order: index + 1 },
        });
      });

      const sortRequset = await Promise.allSettled(sortAssignments);

      const successSort = sortRequset
        .filter((sort) => sort.status === 'fulfilled')
        .map((sort) => sort.value);

      return successSort.map((sort) => {
        delete sort.vector;
        return sort;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateAssignment(
    dto: UpdateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.query.assignmentId,
      });
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      return await this.assignmentRepository.update({
        where: { id: dto.query.assignmentId },
        data: { ...dto.data },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteAssignment(
    dto: DeleteAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });
      await this.assignmentRepository.delete(dto);

      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async exportExcel(subjectId: string, user: User) {
    const listStudentOnSubject =
      await this.studentOnSubjectService.getStudentOnSubjectsBySubjectId(
        { subjectId },
        user,
      );
    const listAssignment = await this.getOverviewScoreOnAssignment(
      { subjectId },
      user,
    );

    const data = {
      header: [
        'Number',
        'Student Name',
        ...listAssignment.map((assignment) =>
          assignment.assignment.weight
            ? `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points / ${assignment.assignment.weight}% `
            : `${assignment.assignment.title} \n ${assignment.assignment.maxScore} points`,
        ),
      ],
      data: await Promise.all(
        listStudentOnSubject
          .sort((a, b) => Number(a.number) - Number(b.number))
          .map((student) => {
            return [
              student.number,
              student.firstName + ' ' + student.lastName,
              ...listAssignment.map((assignment) => {
                const studentOnAssignment = assignment.students.find(
                  (studentOnAssignment) =>
                    studentOnAssignment.studentOnSubjectId === student.id,
                );

                if (!studentOnAssignment) {
                  return 'Student not assigned';
                }

                if (
                  !studentOnAssignment.score &&
                  studentOnAssignment.status !== 'REVIEWD'
                ) {
                  return 'No Work';
                }
                let score: string | number = 0;
                score = studentOnAssignment.score;
                const originalScore =
                  studentOnAssignment.score / assignment.assignment.maxScore;

                if (
                  assignment.assignment.weight !== null &&
                  studentOnAssignment.status === 'REVIEWD'
                ) {
                  score = (
                    originalScore * assignment.assignment.weight
                  ).toFixed(2);
                }
                return score;
              }),
            ];
          }),
      ),
    };

    const workbook = new Workbook();

    const worksheet = workbook.addWorksheet('Assignment');
    worksheet.addRow(data.header);
    worksheet.addRows(data.data);
    const firstRow = worksheet.getRow(1);
    const columA = worksheet.getColumn(1);
    const columB = worksheet.getColumn(2);
    columA.width = 10;
    columB.width = 35;
    columA.alignment = { vertical: 'middle', horizontal: 'center' };

    firstRow.font = { bold: true, size: 10 };
    firstRow.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let i = 3; i <= listAssignment.length + 3; i++) {
      const column = worksheet.getColumn(i);
      column.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      column.width = 30;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  }

  async detectLanguage(text: string, accessToken: string): Promise<string> {
    const url =
      'https://translation.googleapis.com/language/translate/v2/detect';
    const headers = { Authorization: `Bearer ${accessToken}` };
    const data = { q: text };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers }),
      );

      const detections = response?.data?.data?.detections;
      const detectedLanguage = detections[0][0].language;
      return detectedLanguage;
    } catch (error) {
      throw new HttpException(
        'Failed to detect language',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async translateText(
    text: string,
    targetLang: string,
    accessToken: string,
  ): Promise<string> {
    const url = 'https://translation.googleapis.com/language/translate/v2';
    const headers = { Authorization: `Bearer ${accessToken}` };
    const data = { q: text, target: targetLang, format: 'text' };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers }),
      );

      const translations = response.data.data.translations[0].translatedText;
      return translations;
    } catch (error) {
      throw new HttpException(
        'Failed to translate text',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
