import { GradeService } from './../grade/grade.service';

import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Class,
  Student,
  StudentOnSubject,
  Subject,
  TeacherOnSubject,
  User,
} from '@prisma/client';
import * as crypto from 'crypto';
import { Workbook } from 'exceljs';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubjectRepository } from '../student-on-subject/student-on-subject.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import { ScoreOnSubjectRepository } from './../score-on-subject/score-on-subject.repository';
import { StudentRepository } from './../student/student.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByIdDto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
} from './dto';
import { SubjectRepository } from './subject.repository';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SubjectService {
  logger: Logger = new Logger(SubjectService.name);
  subjectRepository: SubjectRepository;
  private scoreOnSubjectRepository: ScoreOnSubjectRepository;
  private studentRepository: StudentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private wheelOfNameService: WheelOfNameService,
    private attendanceTableService: AttendanceTableService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private classroomService: ClassService,
    @Inject(forwardRef(() => MemberOnSchoolService))
    private memberOnSchoolService: MemberOnSchoolService,

    @Inject(forwardRef(() => GradeService))
    private gradeService: GradeService,
  ) {
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(this.prisma);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getSubjectById(
    dto: GetSubjectByIdDto,
    user?: User,
    student?: Student,
  ): Promise<Subject> {
    try {
      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });
      }

      if (student) {
        const studentOnSubject =
          await this.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: dto.subjectId,
              studentId: student.id,
            },
          });
        if (!studentOnSubject) {
          throw new ForbiddenException(
            "Student doesn't belong to this subject",
          );
        }
      }

      return await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySchoolId(
    dto: { schoolId: string; educationYear: string },
    user: User,
  ): Promise<(Subject & { teachers: TeacherOnSubject[]; class: Class })[]> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }

      const subjects = await this.subjectRepository.findMany({
        where: {
          schoolId: dto.schoolId,
          educationYear: dto.educationYear,
        },
      });

      const [teachers, classrooms] = await Promise.all([
        this.teacherOnSubjectService.teacherOnSubjectRepository.findMany({
          where: {
            OR: subjects.map((subject) => {
              return {
                subjectId: subject.id,
                status: 'ACCEPT',
              };
            }),
          },
        }),
        this.classroomService.classRepository.findMany({
          where: {
            OR: subjects.map((subject) => {
              return {
                id: subject.classId,
              };
            }),
          },
        }),
      ]);
      return subjects.map((subject) => {
        return {
          ...subject,
          teachers: teachers.filter(
            (teacher) => teacher.subjectId === subject.id,
          ),
          class: classrooms.find(
            (classroom) => classroom.id === subject.classId,
          ),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectsThatStudentBelongTo(
    dto: { studentId: string; educationYear: string },
    studentUser: Student,
  ): Promise<Subject[]> {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (studentUser.id !== student.id) {
        throw new ForbiddenException('Forbidden access');
      }
      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          studentId: student.id,
        },
      });
      const subjects = await this.subjectRepository.findMany({
        where: {
          id: {
            in: studentOnSubjects.map(
              (studentOnSubject) => studentOnSubject.subjectId,
            ),
          },
          educationYear: dto.educationYear,
        },
      });

      return subjects;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectWithTeacherAndStudent(dto: {
    code?: string;
    subjectId?: string;
  }): Promise<
    Subject & {
      studentOnSubjects: StudentOnSubject[];
      teacherOnSubjects: TeacherOnSubject[];
    }
  > {
    try {
      const subject = await this.subjectRepository.findUnique({
        where: {
          ...(dto.code && { code: dto.code }),
          ...(dto.subjectId && { id: dto.subjectId }),
        },
      });
      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      const [students, teachers] = await Promise.all([
        this.studentOnSubjectRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        }),
        this.teacherOnSubjectService.teacherOnSubjectRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        }),
      ]);

      return {
        ...subject,
        studentOnSubjects: students,
        teacherOnSubjects: teachers,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSubject(dto: CreateSubjectDto, user: User): Promise<Subject> {
    let subjectId: string;
    try {
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });

      if (!member) {
        throw new ForbiddenException('Access denied');
      }

      const educationYear = dto.educationYear;
      delete dto.educationYear;

      const classroom = await this.classroomService.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      await this.classroomService.validateAccess({
        classroom: classroom,
        classId: dto.classId,
      });

      if (classroom.schoolId !== member.schoolId) {
        throw new ForbiddenException("Class doesn't belong to this school");
      }

      const students = await this.studentRepository.findByClassId({
        classId: dto.classId,
      });

      const code = crypto.randomBytes(3).toString('hex');
      let subject = await this.subjectRepository.createSubject({
        ...dto,
        educationYear: educationYear,
        code,
        userId: user.id,
      });

      subjectId = subject.id;

      const studentOnSubjectCreates = students.map((student) => {
        return {
          title: student.title,
          firstName: student.firstName,
          lastName: student.lastName,
          photo: student.photo,
          blurHash: student.blurHash,
          number: student.number,
          studentId: student.id,
          classId: student.classId,
          subjectId: subject.id,
          schoolId: student.schoolId,
        };
      });

      if (studentOnSubjectCreates.length > 0) {
        await this.studentOnSubjectRepository.createMany({
          data: studentOnSubjectCreates,
        });
      }

      const scoreOnSubjectTitlesDefault = [
        {
          title: 'Good Job',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Good-job.svg',
          blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
          score: 1,
        },
        {
          title: 'Well Done',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Well-Done.svg',
          blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
          score: 1,
        },
        {
          title: 'Keep It Up',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Keep-It-Up.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: 1,
        },
        {
          title: 'Excellent',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Excellent.svg',
          blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
          score: 1,
        },
        {
          title: 'Needs Improvement',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Needs-Improvement.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: -1,
        },
      ];

      const gradeRule = [
        {
          min: 80,
          max: 100,
          grade: '4',
        },
        {
          min: 75,
          max: 79,
          grade: '3.5',
        },
        {
          min: 70,
          max: 74,
          grade: '3',
        },
        {
          min: 65,
          max: 69,
          grade: '2.5',
        },
        {
          min: 60,
          max: 64,
          grade: '2',
        },
        {
          min: 55,
          max: 59,
          grade: '1.5',
        },
        {
          min: 50,
          max: 54,
          grade: '1',
        },
        {
          min: 0,
          max: 49,
          grade: '0',
        },
      ];

      await Promise.all([
        this.gradeService.gradeRepository.create({
          data: {
            subjectId: subject.id,
            schoolId: subject.schoolId,
            gradeRules: JSON.stringify(gradeRule),
          },
        }),
        this.wheelOfNameService
          .create({
            title: subject.title,
            description: subject.description,
            texts: students.map((student) => {
              return {
                text: `${student.title} ${student.firstName} ${student.lastName}`,
              };
            }),
          })
          .then(async (wheel) => {
            subject = await this.subjectRepository.update({
              where: {
                id: subject.id,
              },
              data: {
                wheelOfNamePath: wheel.data.path,
              },
            });
          })
          .catch((error) => {
            this.logger.error(error);
          }),
        this.prisma.teacherOnSubject.create({
          data: {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            role: 'ADMIN',
            status: 'ACCEPT',
            photo: user.photo,
            subjectId: subject.id,
            schoolId: dto.schoolId,
          },
        }),
        this.attendanceTableService.createAttendanceTable(
          {
            title: 'Default',
            description: 'Attendance table for ' + subject.title,
            subjectId: subject.id,
          },
          user,
        ),
        ...scoreOnSubjectTitlesDefault.map((score) =>
          this.scoreOnSubjectRepository.createSocreOnSubject({
            title: score.title,
            icon: score.icon,
            subjectId: subject.id,
            score: score.score,
            schoolId: dto.schoolId,
            blurHash: score.blurHash,
          }),
        ),
      ]);

      return subject;
    } catch (error) {
      if (subjectId) {
        await this.subjectRepository.deleteSubject({
          subjectId: subjectId,
        });
      }
      this.logger.error(error);
      throw error;
    }
  }

  async updateSubject(dto: UpdateSubjectDto, user: User): Promise<Subject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.query.subjectId,
      });
      const educationYear = dto.body.educationYear;

      if (educationYear) {
        delete dto.body.educationYear;
      }
      const subject = await this.subjectRepository.findUnique({
        where: {
          id: dto.query.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.classroomService.validateAccess({
        classId: subject.classId,
      });

      return await this.subjectRepository.update({
        where: {
          id: dto.query.subjectId,
        },
        data: { ...dto.body, ...(educationYear && { educationYear }) },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderSubjects(
    dto: ReorderSubjectsDto,
    user: User,
  ): Promise<Subject[]> {
    try {
      const getRandomIdFromArray =
        dto.subjectIds[Math.floor(Math.random() * dto.subjectIds.length)];

      const subject = await this.subjectRepository.findUnique({
        where: {
          id: getRandomIdFromArray,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: subject.schoolId,
      });

      return await this.subjectRepository.reorderSubjects({
        subjectIds: dto.subjectIds,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSubject(dto: DeleteSubjectDto, user: User): Promise<Subject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const remove = await this.subjectRepository.deleteSubject({
        subjectId: dto.subjectId,
      });
      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async generateSummaryReport5Excel(subjectName: string): Promise<any> {
    try {
      // Load data from JSON files
      const assetsPath = path.join(process.cwd(), 'assets', 'data');
      const templatePath = path.join(process.cwd(), 'assets', 'template');

      const dataFiles = [
        '1.ปก ปพ 5.json',
        '2.ข้อมูลนักเรียน.json',
        '3.คำอธิบายรายวิชา.json',
        '4.มาตราฐานตัวชี้วัด(1).json',
        '5.มาตราฐานตัวชี้วัด(2).json',
        '6.เวลาเรียนประจำเดือน.json',
        '7.สรุปเวลาเรียน(มา).json',
        '8.สรุปเวลาเรียน(ขลสป).json',
        '9.แบบเก็บคะแนนเทอม1.json',
        '10.แบบเก็บคะแนนเทอม2.json',
        '11.สรุปคะแนนเทอม 1.json',
        '12.สรุปคะแนนเทอม 2.json',
        '13.สรุปคะแนนรายปี.json',
        '14.ประเมินตัวชี้วัด.json',
        '15ประเมินคุณลักษณะ.json',
        '16ประเมินการอ่านคิดวิเคราะห์.json',
        '17.สรุปผลแผนภูมิ.json',
      ];

      const templateFiles = [
        'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx',
        'ข้อมูลนักเรียนประจำรายวิชา.xlsx',
        'คำอธิบายรายวิชา.xlsx',
        'ตัวชี้วัดตามรหัส.xlsx',
        'ตัวชี้วัดตามกลุ่ม.xlsx',
        'แบบสรุปเวลาเรียนประจำเดือน.xlsx',
        'สรุปเวลาการมาเรียนประจำปี.xlsx',
        'สรุป สาย ป่วย ลา ขาด.xlsx',
        'เก็บคะแนนเทอม 1.xlsx',
        'เก็บคะแนนเทอม 2.xlsx',
        'สรุปผลเทอม 1.xlsx',
        'สรุปผลเทอม 2.xlsx',
        'สรุปผลรายปี.xlsx',
        'ประเมินตัวชี้วัด.xlsx',
        'ประเมินคุณลักษณะ.xlsx',
        'ประเมินการอ่านคิดวิเคราะห์.xlsx',
        'สรุปผลแผนภูมิ.xlsx',
      ];

      // Load all data with logging
      const allData = dataFiles
        .map((file, index) => {
          try {
            const filePath = path.join(assetsPath, file);
            console.log(`Loading JSON file ${index + 1}: ${filePath}`);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            console.log(`Successfully loaded ${file}:`, Object.keys(jsonData));

            // Log specific data for the cover sheet
            if (index === 0) {
              console.log('Cover sheet data:', {
                academic_year: jsonData.academic_details?.year,
                semester: jsonData.academic_details?.semester,
                class: jsonData.academic_details?.class,
                course_name: jsonData.academic_details?.course_name,
              });
            }

            return jsonData;
          } catch (error) {
            console.error(`Error loading ${file}:`, error.message);
            return null;
          }
        })
        .filter((data) => data !== null);

      // Start with the first template file as base workbook
      const baseTemplateFile = templateFiles[0];
      const mainWorkbook = new Workbook();
      await mainWorkbook.xlsx.readFile(
        path.join(templatePath, baseTemplateFile),
      );

      // Update the first worksheet (ปก ปพ 5) with detailed data mapping
      if (mainWorkbook.worksheets[0]) {
        await this.updateCoverWorksheetDetailed(
          mainWorkbook.worksheets[0],
          allData[0],
        );
      }

      if (mainWorkbook.worksheets[1]) {
        await this.updateStudentDataWorksheetDetailed(
          mainWorkbook.worksheets[1],
          allData[1],
        );
      }

      // Add remaining worksheets from other template files
      for (let i = 1; i < templateFiles.length; i++) {
        const templateFile = templateFiles[i];
        const data = allData[i];

        try {
          // Load template workbook
          const templateWorkbook = new Workbook();
          await templateWorkbook.xlsx.readFile(
            path.join(templatePath, templateFile),
          );

          // Get the first worksheet from template
          const templateWorksheet = templateWorkbook.worksheets[0];

          if (templateWorksheet) {
            // Get worksheet name
            const worksheetName =
              templateWorksheet.name || templateFile.replace('.xlsx', '');
            const uniqueWorksheetName = this.getUniqueWorksheetName(
              mainWorkbook,
              worksheetName,
            );

            // Add worksheet to main workbook by copying from template
            const newWorksheet = mainWorkbook.addWorksheet(uniqueWorksheetName);

            // Copy everything from template worksheet
            this.copyCompleteWorksheet(templateWorksheet, newWorksheet);

            // Update with actual data
            await this.updateWorksheetWithData(newWorksheet, data, subjectName);
          }
        } catch (error) {
          this.logger.warn(
            `Could not process template ${templateFile}: ${error.message}`,
          );
        }
      }

      return await mainWorkbook.xlsx.writeBuffer();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async createCoverWorksheet(
    workbook: Workbook,
    data: any,
    subjectName: string,
  ) {
    const worksheet = workbook.addWorksheet('แบบบันทึกผลการเรียนประจำรายวิชา');

    // Title
    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // School information section
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'โรงเรียน:';
    worksheet.getCell(`B${currentRow}`).value = data.school_information.name;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'ที่อยู่:';
    worksheet.getCell(`B${currentRow}`).value = data.school_information.address;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'สังกัด:';
    worksheet.getCell(`B${currentRow}`).value =
      data.school_information.educational_service_area;
    currentRow += 2;

    // Academic details section
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value = data.academic_details.year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.academic_details.semester;
    worksheet.getCell(`G${currentRow}`).value = 'ชั้น:';
    worksheet.getCell(`H${currentRow}`).value = data.academic_details.class;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'กลุ่มสาระการเรียนรู้:';
    worksheet.getCell(`B${currentRow}`).value =
      data.academic_details.learning_area;
    worksheet.getCell(`D${currentRow}`).value = 'ประเภท:';
    worksheet.getCell(`E${currentRow}`).value =
      data.academic_details.course_type;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.academic_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value =
      `${data.academic_details.course_name} (${subjectName})`;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'หน่วยกิต:';
    worksheet.getCell(`B${currentRow}`).value = data.academic_details.credits;
    worksheet.getCell(`D${currentRow}`).value = 'เวลาเรียน:';
    worksheet.getCell(`E${currentRow}`).value =
      data.academic_details.learning_hours;
    currentRow += 2;

    // Personnel section
    worksheet.getCell(`A${currentRow}`).value = 'ครูผู้สอน:';
    data.personnel.instructors.forEach((instructor: any, index: number) => {
      worksheet.getCell(`B${currentRow + index}`).value =
        `${instructor.name} โทร. ${instructor.phone}`;
    });
    currentRow += data.personnel.instructors.length;

    worksheet.getCell(`A${currentRow}`).value = 'ครูประจำชั้น:';
    worksheet.getCell(`B${currentRow}`).value =
      `${data.personnel.homeroom_teacher.name} โทร. ${data.personnel.homeroom_teacher.phone}`;
    currentRow += 2;

    // Results summary section
    worksheet.getCell(`A${currentRow}`).value = 'สรุปผลการเรียน';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value =
      `จำนวนนักเรียนทั้งหมด ${data.results_summary.total_students} คน`;
    currentRow += 2;

    // Grade distribution table
    worksheet.getCell(`A${currentRow}`).value = 'เกรด';
    worksheet.getCell(`B${currentRow}`).value = '4';
    worksheet.getCell(`C${currentRow}`).value = '3.5';
    worksheet.getCell(`D${currentRow}`).value = '3';
    worksheet.getCell(`E${currentRow}`).value = '2.5';
    worksheet.getCell(`F${currentRow}`).value = '2';
    worksheet.getCell(`G${currentRow}`).value = '1.5';
    worksheet.getCell(`H${currentRow}`).value = '1';
    worksheet.getCell(`I${currentRow}`).value = '0';
    worksheet.getCell(`J${currentRow}`).value = 'ร';
    worksheet.getCell(`K${currentRow}`).value = 'มผ';
    worksheet.getCell(`L${currentRow}`).value = 'มส';

    // Make header row bold
    for (let col = 1; col <= 12; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'จำนวน';
    data.results_summary.grade_distribution.forEach(
      (grade: any, index: number) => {
        worksheet.getCell(currentRow, index + 2).value = grade.count;
        worksheet.getCell(currentRow, index + 2).alignment = {
          horizontal: 'center',
        };
      },
    );
    currentRow += 2;

    // Add borders to grade table
    for (let row = currentRow - 3; row < currentRow - 1; row++) {
      for (let col = 1; col <= 12; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Approval signatures section
    worksheet.getCell(`A${currentRow}`).value = 'ลายเซ็นอนุมัติ';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow += 2;

    data.approval_signatures.forEach((signature: any) => {
      worksheet.getCell(`A${currentRow}`).value =
        `${signature.title}: ${signature.name}`;
      worksheet.getCell(`H${currentRow}`).value = `สถานะ: ${signature.status}`;
      currentRow++;
    });

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createStudentDataWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('ข้อมูลนักเรียนประจำรายวิชา');

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'กลุ่มสาระการเรียนรู้:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.learning_area;
    worksheet.getCell(`D${currentRow}`).value = 'ประเภท:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_type;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value = data.course_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_name;
    currentRow += 2;

    // Student summary
    worksheet.getCell(`A${currentRow}`).value =
      `จำนวนนักเรียนทั้งหมด ${data.student_summary.total} คน`;
    currentRow++;

    data.student_summary.gender_distribution.forEach((gender: any) => {
      worksheet.getCell(`A${currentRow}`).value =
        `${gender.gender}: ${gender.count} คน`;
      currentRow++;
    });
    currentRow++;

    // Student list table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'ชั้น';
    worksheet.getCell(`E${currentRow}`).value = 'ครูประจำชั้น';

    // Make header bold
    for (let col = 1; col <= 5; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student data
    data.student_list.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;
      worksheet.getCell(`D${currentRow}`).value = student.class;
      worksheet.getCell(`E${currentRow}`).value = student.homeroom_teacher;

      // Center align numbers
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders to student table
    const tableStartRow = currentRow - data.student_list.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 5; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createCourseDescriptionWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('คำอธิบายรายวิชา');

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'กลุ่มสาระการเรียนรู้:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.learning_area;
    worksheet.getCell(`D${currentRow}`).value = 'ประเภท:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_type;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value = data.course_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_name;
    currentRow += 2;

    // Course description
    worksheet.getCell(`A${currentRow}`).value = 'คำอธิบายรายวิชา:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    // Wrap the long description text
    worksheet.mergeCells(`A${currentRow}:F${currentRow + 5}`);
    worksheet.getCell(`A${currentRow}`).value = data.course_description.details;
    worksheet.getCell(`A${currentRow}`).alignment = {
      horizontal: 'left',
      vertical: 'top',
      wrapText: true,
    };
    worksheet.getRow(currentRow).height = 120;
    currentRow += 7;

    // Indicators summary
    worksheet.getCell(`A${currentRow}`).value = 'สรุปตัวชี้วัด:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value =
      `จำนวนตัวชี้วัดทั้งหมด ${data.indicators_summary.total} ตัว`;
    currentRow++;

    data.indicators_summary.breakdown.forEach((item: any) => {
      worksheet.getCell(`A${currentRow}`).value =
        `${item.type}: ${item.count} ตัว`;
      currentRow++;
    });

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createIndicatorsByCodeWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('ตัวชี้วัดตามรหัส');

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Indicators table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'มาตราฐาน';
    worksheet.getCell(`C${currentRow}`).value = 'ตัวชี้วัด';
    worksheet.getCell(`D${currentRow}`).value = 'คำอธิบาย';
    worksheet.getCell(`E${currentRow}`).value = 'ประเภท';
    worksheet.getCell(`F${currentRow}`).value = 'กลุ่ม';

    // Make header bold
    for (let col = 1; col <= 6; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Indicators data
    const indicators = data.indicators || [];
    indicators.forEach((indicator: any) => {
      worksheet.getCell(`A${currentRow}`).value = indicator.list_number;
      worksheet.getCell(`B${currentRow}`).value = indicator.standard_code;
      worksheet.getCell(`C${currentRow}`).value = indicator.indicator_code;
      worksheet.getCell(`D${currentRow}`).value = indicator.description;
      worksheet.getCell(`E${currentRow}`).value = indicator.assessment_type;
      worksheet.getCell(`F${currentRow}`).value = indicator.indicator_group;

      // Center align numbers
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center' };

      // Wrap text for description
      worksheet.getCell(`D${currentRow}`).alignment = { wrapText: true };

      currentRow++;
    });

    // Add borders to indicators table
    const tableStartRow = currentRow - indicators.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createIndicatorsByGroupWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('ตัวชี้วัดตามกลุ่ม');

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value =
      'มาตราฐานตัวชี้วัดประจำรายวิชา (จำแนกตามกลุ่ม)';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Use indicator_groups from the data structure
    const indicatorGroups = data.indicator_groups || [];

    // Display indicators by group
    indicatorGroups.forEach((group: any) => {
      worksheet.getCell(`A${currentRow}`).value =
        `กลุ่มที่ ${group.group_number}`;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;

      // Table header
      worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
      worksheet.getCell(`B${currentRow}`).value = 'มาตราฐาน';
      worksheet.getCell(`C${currentRow}`).value = 'ตัวชี้วัด';
      worksheet.getCell(`D${currentRow}`).value = 'คำอธิบาย';
      worksheet.getCell(`E${currentRow}`).value = 'ประเภท';

      // Make header bold
      for (let col = 1; col <= 5; col++) {
        worksheet.getCell(currentRow, col).font = { bold: true };
        worksheet.getCell(currentRow, col).alignment = {
          horizontal: 'center',
        };
      }
      currentRow++;

      // Group indicators data
      const indicators = group.indicators || [];
      indicators.forEach((indicator: any, index: number) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`B${currentRow}`).value = indicator.standard_code;
        worksheet.getCell(`C${currentRow}`).value = indicator.indicator_code;
        worksheet.getCell(`D${currentRow}`).value = indicator.description;
        worksheet.getCell(`E${currentRow}`).value = indicator.assessment_type;

        // Center align numbers
        worksheet.getCell(`A${currentRow}`).alignment = {
          horizontal: 'center',
        };

        // Wrap text for description
        worksheet.getCell(`D${currentRow}`).alignment = { wrapText: true };

        currentRow++;
      });

      // Add borders to group table
      const tableStartRow = currentRow - indicators.length - 1;
      const tableEndRow = currentRow - 1;
      for (let row = tableStartRow; row <= tableEndRow; row++) {
        for (let col = 1; col <= 5; col++) {
          worksheet.getCell(row, col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      }

      currentRow += 2; // Space between groups
    });

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createAttendanceWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('แบบสรุปเวลาเรียนประจำเดือน');

    // Title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value = data.course_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_name;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'เดือน:';
    worksheet.getCell(`B${currentRow}`).value = data.summary_details.month;
    worksheet.getCell(`D${currentRow}`).value = 'วันเรียนในเดือน:';
    worksheet.getCell(`E${currentRow}`).value =
      `${data.summary_details.total_school_days_in_month} วัน`;
    currentRow += 2;

    // Attendance table header
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';

    // Get unique dates for column headers
    const dates =
      data.attendance_records[0]?.daily_records.map(
        (record: any) => record.date,
      ) || [];
    dates.forEach((date: string, index: number) => {
      worksheet.getCell(currentRow, 4 + index).value = date;
    });

    // Summary columns
    const summaryStartCol = 4 + dates.length;
    worksheet.getCell(currentRow, summaryStartCol).value = 'มา';
    worksheet.getCell(currentRow, summaryStartCol + 1).value = 'สาย';
    worksheet.getCell(currentRow, summaryStartCol + 2).value = 'ป่วย';
    worksheet.getCell(currentRow, summaryStartCol + 3).value = 'ลา';
    worksheet.getCell(currentRow, summaryStartCol + 4).value = 'ขาด';

    // Make header bold and centered
    for (let col = 1; col <= summaryStartCol + 4; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Attendance data
    data.attendance_records.forEach((record: any) => {
      worksheet.getCell(`A${currentRow}`).value = record.list_number;
      worksheet.getCell(`B${currentRow}`).value = record.student_id;
      worksheet.getCell(`C${currentRow}`).value = record.full_name;

      // Daily attendance
      record.daily_records.forEach((daily: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = daily.status;
        worksheet.getCell(currentRow, 4 + index).alignment = {
          horizontal: 'center',
        };
      });

      // Monthly summary
      record.monthly_summary.forEach((summary: any, index: number) => {
        worksheet.getCell(currentRow, summaryStartCol + index).value =
          summary.count;
        worksheet.getCell(currentRow, summaryStartCol + index).alignment = {
          horizontal: 'center',
        };
      });

      // Center align student number
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders to attendance table
    const tableStartRow = currentRow - data.attendance_records.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= summaryStartCol + 4; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createAttendanceYearlyWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('สรุปเวลาการมาเรียนประจำปี');

    // Title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semesters;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value = data.course_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.course_name;
    currentRow += 2;

    // Student attendance table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'วันมาเรียนทั้งปี';
    worksheet.getCell(`E${currentRow}`).value = 'ภาคเรียนที่ 1';
    worksheet.getCell(`F${currentRow}`).value = 'ภาคเรียนที่ 2';
    worksheet.getCell(`G${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 7; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student data
    data.student_attendance_records.forEach((record: any) => {
      worksheet.getCell(`A${currentRow}`).value = record.list_number;
      worksheet.getCell(`B${currentRow}`).value = record.student_id;
      worksheet.getCell(`C${currentRow}`).value = record.full_name;
      worksheet.getCell(`D${currentRow}`).value =
        record.year_summary.total_days_attended;
      worksheet.getCell(`E${currentRow}`).value =
        record.semester_summaries[0].total_days_attended;
      worksheet.getCell(`F${currentRow}`).value =
        record.semester_summaries[1].total_days_attended;
      worksheet.getCell(`G${currentRow}`).value = record.final_evaluation;

      // Center align numbers
      for (let col = 1; col <= 7; col++) {
        if (col === 1 || col === 2 || col === 4 || col === 5 || col === 6) {
          worksheet.getCell(currentRow, col).alignment = {
            horizontal: 'center',
          };
        }
      }

      currentRow++;
    });

    // Add borders
    const tableStartRow =
      currentRow - data.student_attendance_records.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 7; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private async createAttendanceAbsenceWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('สรุป สาย ป่วย ลา ขาด');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semesters;
    currentRow += 2;

    // Student absence table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'สาย';
    worksheet.getCell(`E${currentRow}`).value = 'ป่วย';
    worksheet.getCell(`F${currentRow}`).value = 'ลา';
    worksheet.getCell(`G${currentRow}`).value = 'ขาด';
    worksheet.getCell(`H${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student data
    data.student_absence_records.forEach((record: any) => {
      worksheet.getCell(`A${currentRow}`).value = record.list_number;
      worksheet.getCell(`B${currentRow}`).value = record.student_id;
      worksheet.getCell(`C${currentRow}`).value = record.full_name;

      // Year summary counts
      record.year_summary.forEach((summary: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = summary.count;
        worksheet.getCell(currentRow, 4 + index).alignment = {
          horizontal: 'center',
        };
      });

      worksheet.getCell(`H${currentRow}`).value = record.final_evaluation;
      worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center' };

      // Center align numbers
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_absence_records.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 8; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createScoreTerm1Worksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('เก็บคะแนนเทอม 1');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Score table header
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';

    // Assignment headers
    data.scoring_rubric.maximum_scores.assignments.forEach(
      (assignment: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = assignment.name;
      },
    );

    const assignmentCount =
      data.scoring_rubric.maximum_scores.assignments.length;
    worksheet.getCell(currentRow, 4 + assignmentCount).value = 'รวมคะแนนเก็บ';
    worksheet.getCell(currentRow, 5 + assignmentCount).value = 'สอบปลายภาค';
    worksheet.getCell(currentRow, 6 + assignmentCount).value = 'รวม';
    worksheet.getCell(currentRow, 7 + assignmentCount).value = 'เกรด';

    // Make header bold
    for (let col = 1; col <= 7 + assignmentCount; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student scores
    data.student_scores.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;

      // Assignment scores
      student.coursework_scores.forEach((score: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = score.score;
        worksheet.getCell(currentRow, 4 + index).alignment = {
          horizontal: 'center',
        };
      });

      // Summary scores
      worksheet.getCell(currentRow, 4 + assignmentCount).value =
        student.score_summary.coursework_total_score;
      worksheet.getCell(currentRow, 5 + assignmentCount).value =
        student.score_summary.final_exam_score;
      worksheet.getCell(currentRow, 6 + assignmentCount).value =
        student.score_summary.total_score;
      worksheet.getCell(currentRow, 7 + assignmentCount).value =
        student.final_grade;

      // Center align summary
      for (let col = 4 + assignmentCount; col <= 7 + assignmentCount; col++) {
        worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
      }

      // Center align student info
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_scores.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 7 + assignmentCount; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createScoreTerm2Worksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('เก็บคะแนนเทอม 2');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Score table header
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';

    // Assignment headers
    data.scoring_rubric.maximum_scores.assignments.forEach(
      (assignment: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = assignment.name;
      },
    );

    const assignmentCount =
      data.scoring_rubric.maximum_scores.assignments.length;
    worksheet.getCell(currentRow, 4 + assignmentCount).value = 'รวมคะแนนเก็บ';
    worksheet.getCell(currentRow, 5 + assignmentCount).value = 'สอบปลายภาค';
    worksheet.getCell(currentRow, 6 + assignmentCount).value = 'รวม';
    worksheet.getCell(currentRow, 7 + assignmentCount).value = 'เกรด';

    // Make header bold
    for (let col = 1; col <= 7 + assignmentCount; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student scores
    data.student_scores.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;

      // Assignment scores
      student.coursework_scores.forEach((score: any, index: number) => {
        worksheet.getCell(currentRow, 4 + index).value = score.score;
        worksheet.getCell(currentRow, 4 + index).alignment = {
          horizontal: 'center',
        };
      });

      // Summary scores
      worksheet.getCell(currentRow, 4 + assignmentCount).value =
        student.score_summary.coursework_total_score;
      worksheet.getCell(currentRow, 5 + assignmentCount).value =
        student.score_summary.final_exam_score;
      worksheet.getCell(currentRow, 6 + assignmentCount).value =
        student.score_summary.total_score;
      worksheet.getCell(currentRow, 7 + assignmentCount).value =
        student.final_grade;

      // Center align summary
      for (let col = 4 + assignmentCount; col <= 7 + assignmentCount; col++) {
        worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
      }

      // Center align student info
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_scores.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 7 + assignmentCount; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createSummaryTerm1Worksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('สรุปผลเทอม 1');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Summary table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'คะแนนระหว่างเรียน';
    worksheet.getCell(`E${currentRow}`).value = 'คะแนนสอบ';
    worksheet.getCell(`F${currentRow}`).value = 'รวม';
    worksheet.getCell(`G${currentRow}`).value = 'เกรด';
    worksheet.getCell(`H${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student results
    data.student_results.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;
      worksheet.getCell(`D${currentRow}`).value = student.coursework_score;
      worksheet.getCell(`E${currentRow}`).value = student.exam_score;
      worksheet.getCell(`F${currentRow}`).value = student.total_score;
      worksheet.getCell(`G${currentRow}`).value = student.grade;
      worksheet.getCell(`H${currentRow}`).value = student.evaluation;

      // Center align numbers
      for (let col = 1; col <= 8; col++) {
        if (col <= 2 || col >= 4) {
          worksheet.getCell(currentRow, col).alignment = {
            horizontal: 'center',
          };
        }
      }

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_results.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 8; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createSummaryTerm2Worksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('สรุปผลเทอม 2');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Summary table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'คะแนนระหว่างเรียน';
    worksheet.getCell(`E${currentRow}`).value = 'คะแนนสอบ';
    worksheet.getCell(`F${currentRow}`).value = 'รวม';
    worksheet.getCell(`G${currentRow}`).value = 'เกรด';
    worksheet.getCell(`H${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student results
    data.student_results.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;
      worksheet.getCell(`D${currentRow}`).value = student.coursework_score;
      worksheet.getCell(`E${currentRow}`).value = student.exam_score;
      worksheet.getCell(`F${currentRow}`).value = student.total_score;
      worksheet.getCell(`G${currentRow}`).value = student.grade;
      worksheet.getCell(`H${currentRow}`).value = student.evaluation;

      // Center align numbers
      for (let col = 1; col <= 8; col++) {
        if (col <= 2 || col >= 4) {
          worksheet.getCell(currentRow, col).alignment = {
            horizontal: 'center',
          };
        }
      }

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_results.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 8; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createSummaryYearlyWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('สรุปผลรายปี');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semesters;
    currentRow += 2;

    // Summary table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'รหัสนักเรียน';
    worksheet.getCell(`C${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่ 1';
    worksheet.getCell(`E${currentRow}`).value = 'ภาคเรียนที่ 2';
    worksheet.getCell(`F${currentRow}`).value = 'รวม 2 ภาคเรียน';
    worksheet.getCell(`G${currentRow}`).value = 'คะแนนเฉลี่ย';
    worksheet.getCell(`H${currentRow}`).value = 'เกรด';
    worksheet.getCell(`I${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 9; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student results
    data.student_annual_results.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.student_id;
      worksheet.getCell(`C${currentRow}`).value = student.full_name;
      worksheet.getCell(`D${currentRow}`).value = student.semester_1_score;
      worksheet.getCell(`E${currentRow}`).value = student.semester_2_score;
      worksheet.getCell(`F${currentRow}`).value = student.total_score_combined;
      worksheet.getCell(`G${currentRow}`).value = student.average_score;
      worksheet.getCell(`H${currentRow}`).value = student.final_grade;
      worksheet.getCell(`I${currentRow}`).value = student.final_evaluation;

      // Center align numbers
      for (let col = 1; col <= 9; col++) {
        if (col <= 2 || col >= 4) {
          worksheet.getCell(currentRow, col).alignment = {
            horizontal: 'center',
          };
        }
      }

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_annual_results.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 9; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createIndicatorEvaluationWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('ประเมินตัวชี้วัด');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:P1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semesters;
    currentRow += 2;

    // Create complex indicator evaluation table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`C${currentRow}`).value = 'ต.1.1';
    worksheet.getCell(`D${currentRow}`).value = 'ต.1.2';
    worksheet.getCell(`E${currentRow}`).value = 'ต.2.1';
    worksheet.getCell(`F${currentRow}`).value = 'ผ่าน';
    worksheet.getCell(`G${currentRow}`).value = 'ไม่ผ่าน';

    // Make header bold
    for (let col = 1; col <= 7; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student evaluations
    data.student_indicator_evaluations.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.full_name;

      // Simplified indicator display
      worksheet.getCell(`C${currentRow}`).value = '✓';
      worksheet.getCell(`D${currentRow}`).value = '✓';
      worksheet.getCell(`E${currentRow}`).value = '✓';
      worksheet.getCell(`F${currentRow}`).value =
        student.overall_summary[0].count;
      worksheet.getCell(`G${currentRow}`).value =
        student.overall_summary[1].count;

      // Center align
      for (let col = 1; col <= 7; col++) {
        worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
      }

      currentRow++;
    });

    // Add borders
    const tableStartRow =
      currentRow - data.student_indicator_evaluations.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 7; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createCharacteristicEvaluationWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('ประเมินคุณลักษณะ');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semesters;
    currentRow += 2;

    // Characteristic evaluation table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`C${currentRow}`).value = 'คุณลักษณะ 1';
    worksheet.getCell(`D${currentRow}`).value = 'คุณลักษณะ 2';
    worksheet.getCell(`E${currentRow}`).value = 'คุณลักษณะ 3';
    worksheet.getCell(`F${currentRow}`).value = 'คุณลักษณะ 4';
    worksheet.getCell(`G${currentRow}`).value = 'คุณลักษณะ 5';
    worksheet.getCell(`H${currentRow}`).value = 'คุณลักษณะ 6';
    worksheet.getCell(`I${currentRow}`).value = 'คุณลักษณะ 7';
    worksheet.getCell(`J${currentRow}`).value = 'คุณลักษณะ 8';
    worksheet.getCell(`K${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 11; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student evaluations
    data.student_evaluations.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.full_name;

      // Characteristic scores (simplified)
      for (let i = 0; i < 8; i++) {
        const avgScore = student.characteristic_scores[i]
          ? Math.round(
              student.characteristic_scores[i].sub_characteristics.reduce(
                (sum: number, sub: any) => sum + sub.score,
                0,
              ) / student.characteristic_scores[i].sub_characteristics.length,
            )
          : 0;
        worksheet.getCell(currentRow, 3 + i).value = avgScore;
        worksheet.getCell(currentRow, 3 + i).alignment = {
          horizontal: 'center',
        };
      }

      worksheet.getCell(`K${currentRow}`).value =
        student.evaluation_summary.result;
      worksheet.getCell(`K${currentRow}`).alignment = { horizontal: 'center' };

      // Center align student info
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_evaluations.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 11; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createReadingEvaluationWorksheet(
    workbook: Workbook,
    data: any,
  ) {
    const worksheet = workbook.addWorksheet('ประเมินการอ่านคิดวิเคราะห์');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value = data.course_details.semester;
    currentRow += 2;

    // Reading evaluation table
    worksheet.getCell(`A${currentRow}`).value = 'ลำดับ';
    worksheet.getCell(`B${currentRow}`).value = 'ชื่อ-นามสกุล';
    worksheet.getCell(`C${currentRow}`).value = 'ข้อ 1';
    worksheet.getCell(`D${currentRow}`).value = 'ข้อ 2';
    worksheet.getCell(`E${currentRow}`).value = 'ข้อ 3';
    worksheet.getCell(`F${currentRow}`).value = 'ข้อ 4';
    worksheet.getCell(`G${currentRow}`).value = 'ข้อ 5';
    worksheet.getCell(`H${currentRow}`).value = 'ข้อ 6';
    worksheet.getCell(`I${currentRow}`).value = 'ผลการประเมิน';

    // Make header bold
    for (let col = 1; col <= 9; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Student evaluations
    data.student_evaluations.forEach((student: any) => {
      worksheet.getCell(`A${currentRow}`).value = student.list_number;
      worksheet.getCell(`B${currentRow}`).value = student.full_name;

      // Evaluation scores
      student.evaluation_scores.forEach((score: any, index: number) => {
        worksheet.getCell(currentRow, 3 + index).value = score.score;
        worksheet.getCell(currentRow, 3 + index).alignment = {
          horizontal: 'center',
        };
      });

      worksheet.getCell(`I${currentRow}`).value = student.final_evaluation;
      worksheet.getCell(`I${currentRow}`).alignment = { horizontal: 'center' };

      // Center align student info
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Add borders
    const tableStartRow = currentRow - data.student_evaluations.length - 1;
    const tableEndRow = currentRow - 1;
    for (let row = tableStartRow; row <= tableEndRow; row++) {
      for (let col = 1; col <= 9; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
  }

  private async createSummaryChartWorksheet(workbook: Workbook, data: any) {
    const worksheet = workbook.addWorksheet('สรุปผลแผนภูมิ');

    this.applyGeneralFormatting(worksheet);

    // Title
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = data.document_title;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Course summary details
    let currentRow = 3;
    worksheet.getCell(`A${currentRow}`).value = 'ปีการศึกษา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_summary_details.academic_year;
    worksheet.getCell(`D${currentRow}`).value = 'ภาคเรียนที่:';
    worksheet.getCell(`E${currentRow}`).value =
      data.course_summary_details.semesters;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'รหัสวิชา:';
    worksheet.getCell(`B${currentRow}`).value =
      data.course_summary_details.course_code;
    worksheet.getCell(`D${currentRow}`).value = 'ชื่อวิชา:';
    worksheet.getCell(`E${currentRow}`).value =
      data.course_summary_details.course_name;
    currentRow += 2;

    // Grade distribution summary
    worksheet.getCell(`A${currentRow}`).value = 'สรุปผลการเรียนตามเกรด';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'เกรด';
    worksheet.getCell(`B${currentRow}`).value = 'จำนวน';
    worksheet.getCell(`C${currentRow}`).value = 'เปอร์เซ็นต์';

    // Make header bold
    for (let col = 1; col <= 3; col++) {
      worksheet.getCell(currentRow, col).font = { bold: true };
      worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
    }
    currentRow++;

    // Grade data
    data.evaluation_summaries.academic_results_by_grade.forEach(
      (grade: any) => {
        worksheet.getCell(`A${currentRow}`).value = grade.grade;
        worksheet.getCell(`B${currentRow}`).value = grade.count;
        worksheet.getCell(`C${currentRow}`).value = `${grade.percentage}%`;

        // Center align
        for (let col = 1; col <= 3; col++) {
          worksheet.getCell(currentRow, col).alignment = {
            horizontal: 'center',
          };
        }

        currentRow++;
      },
    );

    // Add borders for grade table
    const gradeTableStart =
      currentRow -
      data.evaluation_summaries.academic_results_by_grade.length -
      1;
    const gradeTableEnd = currentRow - 1;
    for (let row = gradeTableStart; row <= gradeTableEnd; row++) {
      for (let col = 1; col <= 3; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    currentRow += 2;

    // Other evaluation summaries
    worksheet.getCell(`A${currentRow}`).value = 'สรุปผลการประเมินคุณลักษณะ';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    data.evaluation_summaries.desirable_characteristics.forEach((char: any) => {
      worksheet.getCell(`A${currentRow}`).value =
        `${char.level}: ${char.count} คน (${char.percentage}%)`;
      currentRow++;
    });

    currentRow++;
    worksheet.getCell(`A${currentRow}`).value =
      'สรุปผลการประเมินการอ่าน คิดวิเคราะห์ เขียน';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    data.evaluation_summaries.reading_thinking_writing.forEach(
      (reading: any) => {
        worksheet.getCell(`A${currentRow}`).value =
          `${reading.level}: ${reading.count} คน (${reading.percentage}%)`;
        currentRow++;
      },
    );

    // Apply general formatting at the end
    this.applyGeneralFormatting(worksheet);
  }

  private copyWorksheetStructure(sourceWorksheet: any, targetWorksheet: any) {
    try {
      // Copy worksheet properties safely
      if (sourceWorksheet.properties) {
        targetWorksheet.properties = { ...sourceWorksheet.properties };
      }

      // Copy page setup
      if (sourceWorksheet.pageSetup) {
        targetWorksheet.pageSetup = { ...sourceWorksheet.pageSetup };
      }

      // Copy all rows and cells with formatting
      if (sourceWorksheet.eachRow) {
        sourceWorksheet.eachRow(
          { includeEmpty: true },
          (row: any, rowNumber: number) => {
            if (!row) return;

            const targetRow = targetWorksheet.getRow(rowNumber);

            // Copy row properties safely
            if (row.height) targetRow.height = row.height;
            if (row.hidden) targetRow.hidden = row.hidden;
            if (row.outlineLevel) targetRow.outlineLevel = row.outlineLevel;

            // Copy each cell safely
            if (row.eachCell) {
              row.eachCell(
                { includeEmpty: true },
                (cell: any, colNumber: number) => {
                  if (!cell) return;

                  const targetCell = targetRow.getCell(colNumber);

                  // Copy cell value
                  if (cell.value !== undefined) {
                    targetCell.value = cell.value;
                  }

                  // Copy formatting safely
                  if (cell.font) targetCell.font = { ...cell.font };
                  if (cell.alignment)
                    targetCell.alignment = { ...cell.alignment };
                  if (cell.border) targetCell.border = { ...cell.border };
                  if (cell.fill) targetCell.fill = { ...cell.fill };
                  if (cell.numFmt) targetCell.numFmt = cell.numFmt;
                },
              );
            }
          },
        );
      }

      // Copy column properties safely
      if (sourceWorksheet.columns && Array.isArray(sourceWorksheet.columns)) {
        sourceWorksheet.columns.forEach((col: any, index: number) => {
          if (
            col &&
            targetWorksheet.columns &&
            targetWorksheet.columns[index]
          ) {
            if (col.width) targetWorksheet.columns[index].width = col.width;
            if (col.hidden) targetWorksheet.columns[index].hidden = col.hidden;
            if (col.outlineLevel)
              targetWorksheet.columns[index].outlineLevel = col.outlineLevel;
          }
        });
      }

      // Copy merged cells safely
      if (
        sourceWorksheet.model?.merges &&
        Array.isArray(sourceWorksheet.model.merges)
      ) {
        sourceWorksheet.model.merges.forEach((merge: any) => {
          if (merge) {
            try {
              targetWorksheet.mergeCells(merge);
            } catch (error) {
              this.logger.warn(`Could not merge cells: ${error.message}`);
            }
          }
        });
      }

      // Copy images if any (optional)
      if (sourceWorksheet.getImages) {
        try {
          const images = sourceWorksheet.getImages();
          if (Array.isArray(images)) {
            images.forEach((img: any) => {
              if (img && img.imageId && img.range) {
                targetWorksheet.addImage(img.imageId, img.range);
              }
            });
          }
        } catch (error) {
          // Images might not be supported in this version
          this.logger.warn('Could not copy images from template');
        }
      }
    } catch (error) {
      this.logger.error(`Error copying worksheet structure: ${error.message}`);
      throw error;
    }
  }

  private copyCompleteWorksheet(sourceWorksheet: any, targetWorksheet: any) {
    try {
      // Copy all properties from source to target
      if (sourceWorksheet.properties) {
        targetWorksheet.properties = JSON.parse(
          JSON.stringify(sourceWorksheet.properties),
        );
      }

      if (sourceWorksheet.pageSetup) {
        targetWorksheet.pageSetup = JSON.parse(
          JSON.stringify(sourceWorksheet.pageSetup),
        );
      }

      if (sourceWorksheet.headerFooter) {
        targetWorksheet.headerFooter = JSON.parse(
          JSON.stringify(sourceWorksheet.headerFooter),
        );
      }

      // Copy columns
      if (sourceWorksheet.columns) {
        targetWorksheet.columns = sourceWorksheet.columns.map((col: any) => ({
          ...col,
        }));
      }

      // Copy all rows with complete formatting
      sourceWorksheet.eachRow(
        { includeEmpty: true },
        (sourceRow: any, rowNumber: number) => {
          const targetRow = targetWorksheet.getRow(rowNumber);

          // Copy row properties
          if (sourceRow.height) targetRow.height = sourceRow.height;
          if (sourceRow.hidden) targetRow.hidden = sourceRow.hidden;
          if (sourceRow.outlineLevel)
            targetRow.outlineLevel = sourceRow.outlineLevel;

          // Copy all cells
          sourceRow.eachCell(
            { includeEmpty: true },
            (sourceCell: any, colNumber: number) => {
              const targetCell = targetRow.getCell(colNumber);

              // Copy value
              targetCell.value = sourceCell.value;

              // Copy all formatting
              if (sourceCell.style) {
                targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
              }
            },
          );
        },
      );

      // Copy merged cells
      if (sourceWorksheet.model && sourceWorksheet.model.merges) {
        sourceWorksheet.model.merges.forEach((merge: any) => {
          try {
            targetWorksheet.mergeCells(merge);
          } catch (error) {
            // Ignore merge errors
          }
        });
      }

      // Copy data validations
      if (sourceWorksheet.dataValidations) {
        targetWorksheet.dataValidations = JSON.parse(
          JSON.stringify(sourceWorksheet.dataValidations),
        );
      }

      // Copy conditional formatting
      if (sourceWorksheet.conditionalFormattings) {
        targetWorksheet.conditionalFormattings = JSON.parse(
          JSON.stringify(sourceWorksheet.conditionalFormattings),
        );
      }
    } catch (error) {
      this.logger.error(`Error copying complete worksheet: ${error.message}`);
    }
  }

  private async updateWorksheetWithData(
    worksheet: any,
    data: any,
    subjectName: string,
  ) {
    try {
      // Check if this is the student data worksheet by looking for specific content
      let isStudentDataWorksheet = false;
      worksheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any) => {
          if (cell.value && typeof cell.value === 'string') {
            if (cell.value.includes('ข้อมูลนักเรียนประจำรายวิชา')) {
              isStudentDataWorksheet = true;
            }
          }
        });
      });

      if (isStudentDataWorksheet) {
        await this.updateStudentDataWorksheetDetailed(worksheet, data);
        return;
      }

      // Update specific cells based on data structure for other worksheets
      worksheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any, colNumber: number) => {
          if (cell.value && typeof cell.value === 'string') {
            let cellValue = cell.value;

            // Replace data from JSON structure
            if (data) {
              // Handle academic details
              if (data.academic_details) {
                cellValue = cellValue.replace(
                  /ปีการศึกษา\s*[\d\s]*/,
                  `ปีการศึกษา ${data.academic_details.year}`,
                );
                cellValue = cellValue.replace(
                  /เทอม\s*[\d\s]*/,
                  `เทอม ${data.academic_details.semester}`,
                );
                cellValue = cellValue.replace(
                  /รหัสวิชา\s*[\w\d\s]*/,
                  `รหัสวิชา ${data.academic_details.course_code}`,
                );
                cellValue = cellValue.replace(
                  /ชื่อวิชา\s*[^\n]*/,
                  `ชื่อวิชา ${data.academic_details.course_name}`,
                );
                cellValue = cellValue.replace(
                  /ชั้น\s*[^\n]*/,
                  `ชั้น ${data.academic_details.class}`,
                );
                cellValue = cellValue.replace(
                  /กลุ่มสาระการเรียนรู้\s*[^\n]*/,
                  `กลุ่มสาระการเรียนรู้ ${data.academic_details.learning_area}`,
                );
                cellValue = cellValue.replace(
                  /ประเภทรายวิชา\s*[^\n]*/,
                  `ประเภทรายวิชา ${data.academic_details.course_type}`,
                );
                cellValue = cellValue.replace(
                  /หน่วยกิต\s*[\d\s]*/,
                  `หน่วยกิต ${data.academic_details.credits}`,
                );
                cellValue = cellValue.replace(
                  /เวลาเรียน\s*[^\n]*/,
                  `เวลาเรียน ${data.academic_details.learning_hours}`,
                );
              }

              // Handle school information
              if (data.school_information) {
                cellValue = cellValue.replace(
                  /โรงเรียน[^\n]*/,
                  data.school_information.name,
                );
                cellValue = cellValue.replace(
                  /ที่อยู่[^\n]*/,
                  data.school_information.address,
                );
                cellValue = cellValue.replace(
                  /สำนักงานเขตพื้นที่[^\n]*/,
                  data.school_information.educational_service_area,
                );
              }

              // Handle personnel information
              if (data.personnel) {
                if (
                  data.personnel.instructors &&
                  data.personnel.instructors[0]
                ) {
                  cellValue = cellValue.replace(
                    /ครูผู้สอน[^\n]*/,
                    `ครูผู้สอน ${data.personnel.instructors[0].name}`,
                  );
                  cellValue = cellValue.replace(
                    /โทร[^\n]*/,
                    `โทร ${data.personnel.instructors[0].phone}`,
                  );
                }
                if (data.personnel.homeroom_teacher) {
                  cellValue = cellValue.replace(
                    /ครูประจำชั้น[^\n]*/,
                    `ครูประจำชั้น ${data.personnel.homeroom_teacher.name}`,
                  );
                }
              }

              // Handle course details (for student data worksheet)
              if (data.course_details) {
                cellValue = cellValue.replace(
                  /ปีการศึกษา\s*[\d\s]*/,
                  `ปีการศึกษา ${data.course_details.academic_year}`,
                );
                cellValue = cellValue.replace(
                  /เทอม\s*[\d\s]*/,
                  `เทอม ${data.course_details.semester}`,
                );
                cellValue = cellValue.replace(
                  /รหัสวิชา\s*[\w\d\s]*/,
                  `รหัสวิชา ${data.course_details.course_code}`,
                );
                cellValue = cellValue.replace(
                  /ชื่อวิชา\s*[^\n]*/,
                  `ชื่อวิชา ${data.course_details.course_name}`,
                );
                cellValue = cellValue.replace(
                  /กลุ่มสาระการเรียนรู้\s*[^\n]*/,
                  `กลุ่มสาระการเรียนรู้ ${data.course_details.learning_area}`,
                );
                cellValue = cellValue.replace(
                  /ประเภทรายวิชา\s*[^\n]*/,
                  `ประเภทรายวิชา ${data.course_details.course_type}`,
                );
              }

              // Handle student summary
              if (data.student_summary) {
                cellValue = cellValue.replace(
                  /จำนวนนักเรียนทั้งหมด\s*[\d\s]*/,
                  `จำนวนนักเรียนทั้งหมด ${data.student_summary.total} คน`,
                );
                if (data.student_summary.gender_distribution) {
                  const maleCount =
                    data.student_summary.gender_distribution.find(
                      (g) => g.gender === 'ชาย',
                    )?.count || 0;
                  const femaleCount =
                    data.student_summary.gender_distribution.find(
                      (g) => g.gender === 'หญิง',
                    )?.count || 0;
                  cellValue = cellValue.replace(
                    /ชาย\s*[\d\s]*\s*คน/,
                    `ชาย ${maleCount} คน`,
                  );
                  cellValue = cellValue.replace(
                    /หญิง\s*[\d\s]*\s*คน/,
                    `หญิง ${femaleCount} คน`,
                  );
                }
              }

              // Handle results summary
              if (data.results_summary) {
                cellValue = cellValue.replace(
                  /นักเรียนทั้งหมด\s*[\d\s]*/,
                  `นักเรียนทั้งหมด ${data.results_summary.total_students}`,
                );

                // Handle grade distribution
                if (data.results_summary.grade_distribution) {
                  data.results_summary.grade_distribution.forEach((grade) => {
                    const gradePattern = new RegExp(
                      `เกรด\\s*${grade.grade}\\s*[\\d\\s]*\\s*คน`,
                      'g',
                    );
                    cellValue = cellValue.replace(
                      gradePattern,
                      `เกรด ${grade.grade} ${grade.count} คน`,
                    );
                  });
                }
              }
            }

            cell.value = cellValue;
          }
        });
      });

      // Call specific update methods based on worksheet content
      this.updateSpecificWorksheetData(worksheet, data);
    } catch (error) {
      this.logger.error(`Error updating worksheet with data: ${error.message}`);
    }
  }

  private updateSpecificWorksheetData(worksheet: any, data: any) {
    try {
      // Update student data if present
      if (data.student_list && Array.isArray(data.student_list)) {
        this.updateStudentDataInWorksheet(worksheet, data.student_list);
      } else if (data.students && Array.isArray(data.students)) {
        this.updateStudentDataInWorksheet(worksheet, data.students);
      }

      // Update score data if present
      if (data.scores && Array.isArray(data.scores)) {
        this.updateScoreDataInWorksheet(worksheet, data.scores);
      }

      // Update attendance data if present
      if (data.attendance && Array.isArray(data.attendance)) {
        this.updateAttendanceDataInWorksheet(worksheet, data.attendance);
      }

      // Update grade distribution data
      if (data.results_summary && data.results_summary.grade_distribution) {
        this.updateGradeDistributionInWorksheet(
          worksheet,
          data.results_summary.grade_distribution,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating specific worksheet data: ${error.message}`,
      );
    }
  }

  private updateStudentDataInWorksheet(worksheet: any, students: any[]) {
    try {
      // Find the starting row for student data (usually after headers)
      let startRow = 1;
      let headerRow = 0;

      worksheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any) => {
          if (cell.value && typeof cell.value === 'string') {
            if (
              cell.value.includes('ลำดับ') ||
              cell.value.includes('เลขที่') ||
              cell.value.includes('ชื่อ-สกุล') ||
              cell.value.includes('ชื่อ')
            ) {
              headerRow = rowNumber;
              startRow = rowNumber + 1;
            }
          }
        });
      });

      // Clear existing student data rows first
      for (let i = 0; i < 50; i++) {
        const row = worksheet.getRow(startRow + i);
        if (row) {
          row.eachCell((cell: any, colNumber: number) => {
            if (colNumber <= 10) {
              // Clear first 10 columns
              cell.value = '';
            }
          });
        }
      }

      // Insert new student data
      if (students && Array.isArray(students)) {
        students.forEach((student, index) => {
          const row = worksheet.getRow(startRow + index);

          // Update cells based on student data structure
          if (student.list_number) {
            row.getCell(1).value = student.list_number;
          }
          if (student.student_id) {
            row.getCell(2).value = student.student_id;
          }
          if (student.full_name) {
            row.getCell(3).value = student.full_name;
          }
          if (student.class) {
            row.getCell(4).value = student.class;
          }
          if (student.homeroom_teacher) {
            row.getCell(5).value = student.homeroom_teacher;
          }

          // Handle different data structures
          if (student.number) row.getCell(1).value = student.number;
          if (student.name) row.getCell(3).value = student.name;
          if (student.firstName && student.lastName) {
            row.getCell(3).value = `${student.firstName} ${student.lastName}`;
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error updating student data: ${error.message}`);
    }
  }

  private updateScoreDataInWorksheet(worksheet: any, scores: any[]) {
    // Implementation for updating score data
    // This would be customized based on the specific score data structure
  }

  private updateAttendanceDataInWorksheet(worksheet: any, attendance: any[]) {
    // Implementation for updating attendance data
    // This would be customized based on the specific attendance data structure
  }

  private updateGradeDistributionInWorksheet(
    worksheet: any,
    gradeDistribution: any[],
  ) {
    try {
      // Find and update grade distribution data in the worksheet
      worksheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any, colNumber: number) => {
          if (cell.value && typeof cell.value === 'string') {
            // Update grade counts
            gradeDistribution.forEach((grade) => {
              const gradePattern = new RegExp(
                `เกรด\\s*${grade.grade}\\s*[\\d\\s]*\\s*คน`,
                'i',
              );
              if (gradePattern.test(cell.value)) {
                cell.value = cell.value.replace(
                  gradePattern,
                  `เกรด ${grade.grade} ${grade.count} คน`,
                );
              }

              // Handle numeric grade patterns
              const numericPattern = new RegExp(
                `${grade.grade}\\s*[\\d\\s]*`,
                'g',
              );
              if (
                cell.value.includes(`เกรด ${grade.grade}`) ||
                cell.value === grade.grade.toString()
              ) {
                cell.value = grade.count.toString();
              }
            });
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error updating grade distribution: ${error.message}`);
    }
  }

  private async updateCoverWorksheetDetailed(worksheet: any, data: any) {
    try {
      this.logger.log('Starting detailed update of cover worksheet (ปก ปพ 5)');

      // CORRECTED cell mappings based on actual Excel analysis
      const cellMappings = {
        // School information - CORRECTED
        school_name: { row: 5, col: 2 }, // B5: โรงเรียนบ้านปราสาท (สุวรรณราษฎร์ประสิทธิ์)
        school_address: { row: 6, col: 2 }, // B6: ตำบล เมืองปราสาท อำเภอโนนสูง จ.นครราชสีมา 30160
        school_area: { row: 7, col: 2 }, // B7: สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 1

        // Academic details - CORRECTED
        academic_year_value: { row: 10, col: 4 }, // D10: 2568
        semester_value: { row: 10, col: 7 }, // G10: 1
        class_value: { row: 10, col: 9 }, // I10: ประถมศึกษาปีที่ 5/1 (merged I10:K10)
        learning_area_value: { row: 11, col: 6 }, // F11: ภาษาต่างประเทศ (merged F11:H11)
        course_type_value: { row: 11, col: 11 }, // K11: พื้นฐาน
        course_code_value: { row: 12, col: 4 }, // D12: อ15101
        course_name_value: { row: 12, col: 7 }, // G12: ภาษาอังกฤษ 5 (merged G12:K12)

        // Row 13 - Credits and learning hours
        credits_value: { row: 13, col: 4 }, // D13: 3
        learning_hours_value: { row: 13, col: 9 }, // I13: 120 ชั่วโมง/ปี (merged I13:K13)

        // Row 14 - First instructor
        instructor_1_name: { row: 14, col: 5 }, // E14: นายศตวรรษ ปิฉิมพลี (merged E14:H14)
        instructor_1_phone: { row: 14, col: 10 }, // J14: 099-997-9797 (merged J14:K14)

        // Row 15 - Second instructor
        instructor_2_name: { row: 15, col: 5 }, // E15: - (merged E15:H15)
        instructor_2_phone: { row: 15, col: 10 }, // J15: - (merged J15:K15)

        // Row 16 - Homeroom teacher
        homeroom_teacher_name: { row: 16, col: 5 }, // E16: นางวารุณี ศรีนวลแสง (merged E16:H16)
        homeroom_teacher_phone: { row: 16, col: 10 }, // J16: 099-997-9799 (merged J16:K16)

        // Grade distribution table (based on detailed analysis)
        // Row 21: A21=total students, B21-L21=grade counts
        total_students: { row: 21, col: 1 }, // A21: 10 (total students)
        grade_4: { row: 21, col: 2 }, // B21: 5 (students with grade 4)
        grade_3_5: { row: 21, col: 3 }, // C21: 2 (students with grade 3.5)
        grade_3: { row: 21, col: 4 }, // D21: 2 (students with grade 3)
        grade_2_5: { row: 21, col: 5 }, // E21: 1 (students with grade 2.5)
        grade_2: { row: 21, col: 6 }, // F21: 0 (students with grade 2)
        grade_1_5: { row: 21, col: 7 }, // G21: 0 (students with grade 1.5)
        grade_1: { row: 21, col: 8 }, // H21: 0 (students with grade 1)
        grade_0: { row: 21, col: 9 }, // I21: 0 (students with grade 0)
        grade_r: { row: 21, col: 10 }, // J21: 0 (students with ร)
        grade_mp: { row: 21, col: 11 }, // K21: 0 (students with มผ)
        grade_ms: { row: 21, col: 12 }, // L21: 0 (students with มส)

        // Characteristics, reading, and indicators table (Row 25)
        char_3: { row: 25, col: 2 }, // B25: 7 (characteristics level 3)
        char_2: { row: 25, col: 3 }, // C25: 3 (characteristics level 2)
        char_1: { row: 25, col: 4 }, // D25: - (characteristics level 1)
        char_0: { row: 25, col: 5 }, // E25: - (characteristics level 0)
        read_3: { row: 25, col: 6 }, // F25: 8 (reading level 3)
        read_2: { row: 25, col: 7 }, // G25: 2 (reading level 2)
        read_1: { row: 25, col: 8 }, // H25: - (reading level 1)
        read_0: { row: 25, col: 9 }, // I25: - (reading level 0)
        indicators_pass: { row: 25, col: 10 }, // J25: 10 (indicators passed)
        indicators_fail: { row: 25, col: 11 }, // K25: - (indicators failed)

        // Approval signatures section (G30-G40) - CORRECTED based on actual Excel structure
        signature_1: { row: 30, col: 7 }, // G30: (นายศตวรรษ ปิฉิมพลี)
        signature_2: { row: 32, col: 7 }, // G32: (นางมุกดา พาชวนชม)
        signature_3: { row: 34, col: 7 }, // G34: (นางมุกดา พาชวนชม)
        signature_4: { row: 36, col: 7 }, // G36: (นายวิชัย สุเมศไทย)
        signature_5: { row: 38, col: 7 }, // G38: (นางสุธีรตรา มหาราณี)
        signature_6: { row: 40, col: 7 }, // G40: (นายชาญชนะ มานะวินัย)
      };

      // Update school information
      if (data.school_information) {
        this.updateCellValue(
          worksheet,
          cellMappings.school_name,
          data.school_information.name,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.school_address,
          data.school_information.address,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.school_area,
          data.school_information.educational_service_area,
        );
      }

      // Update academic details
      if (data.academic_details) {
        this.updateCellValue(
          worksheet,
          cellMappings.academic_year_value,
          data.academic_details.year,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.semester_value,
          data.academic_details.semester,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.class_value,
          data.academic_details.class,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.learning_area_value,
          data.academic_details.learning_area,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.course_type_value,
          data.academic_details.course_type,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.course_code_value,
          data.academic_details.course_code,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.course_name_value,
          data.academic_details.course_name,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.credits_value,
          data.academic_details.credits,
        );
        this.updateCellValue(
          worksheet,
          cellMappings.learning_hours_value,
          data.academic_details.learning_hours,
        );
      }

      // Update personnel information
      if (data.personnel) {
        if (data.personnel.instructors && data.personnel.instructors[0]) {
          this.updateCellValue(
            worksheet,
            cellMappings.instructor_1_name,
            data.personnel.instructors[0].name,
          );
          this.updateCellValue(
            worksheet,
            cellMappings.instructor_1_phone,
            data.personnel.instructors[0].phone,
          );
        }
        if (data.personnel.instructors && data.personnel.instructors[1]) {
          this.updateCellValue(
            worksheet,
            cellMappings.instructor_2_name,
            data.personnel.instructors[1].name,
          );
          this.updateCellValue(
            worksheet,
            cellMappings.instructor_2_phone,
            data.personnel.instructors[1].phone,
          );
        }
        if (data.personnel.homeroom_teacher) {
          this.updateCellValue(
            worksheet,
            cellMappings.homeroom_teacher_name,
            data.personnel.homeroom_teacher.name,
          );
          this.updateCellValue(
            worksheet,
            cellMappings.homeroom_teacher_phone,
            data.personnel.homeroom_teacher.phone,
          );
        }
      }

      // Update results summary
      if (data.results_summary) {
        // Update total students
        this.updateCellValue(
          worksheet,
          cellMappings.total_students,
          data.results_summary.total_students,
        );

        // Update grade distribution
        if (data.results_summary.grade_distribution) {
          const gradeMap = {
            '4': cellMappings.grade_4,
            '3.5': cellMappings.grade_3_5,
            '3': cellMappings.grade_3,
            '2.5': cellMappings.grade_2_5,
            '2': cellMappings.grade_2,
            '1.5': cellMappings.grade_1_5,
            '1': cellMappings.grade_1,
            '0': cellMappings.grade_0,
            ร: cellMappings.grade_r,
            มผ: cellMappings.grade_mp,
            มส: cellMappings.grade_ms,
          };

          data.results_summary.grade_distribution.forEach((grade) => {
            const mapping = gradeMap[grade.grade];
            if (mapping) {
              this.updateCellValue(worksheet, mapping, grade.count);
            }
          });
        }

        // Update desirable characteristics
        if (
          data.results_summary.desirable_characteristics &&
          data.results_summary.desirable_characteristics.student_count
        ) {
          const charMap = {
            '3': cellMappings.char_3,
            '2': cellMappings.char_2,
            '1': cellMappings.char_1,
            '0': cellMappings.char_0,
          };

          data.results_summary.desirable_characteristics.student_count.forEach(
            (char) => {
              const mapping = charMap[char.scale];
              if (mapping) {
                this.updateCellValue(worksheet, mapping, char.count);
              }
            },
          );
        }

        // Update reading thinking analysis
        if (
          data.results_summary.reading_thinking_analysis_writing &&
          data.results_summary.reading_thinking_analysis_writing.student_count
        ) {
          const readMap = {
            '3': cellMappings.read_3,
            '2': cellMappings.read_2,
            '1': cellMappings.read_1,
            '0': cellMappings.read_0,
          };

          data.results_summary.reading_thinking_analysis_writing.student_count.forEach(
            (read) => {
              const mapping = readMap[read.scale];
              if (mapping) {
                this.updateCellValue(worksheet, mapping, read.count);
              }
            },
          );
        }

        // Update indicators assessment
        if (data.results_summary.indicators_assessment) {
          data.results_summary.indicators_assessment.forEach((indicator) => {
            if (indicator.result === 'ผ่าน') {
              this.updateCellValue(
                worksheet,
                cellMappings.indicators_pass,
                indicator.count,
              );
            } else if (indicator.result === 'ไม่ผ่าน') {
              this.updateCellValue(
                worksheet,
                cellMappings.indicators_fail,
                indicator.count,
              );
            }
          });
        }
      }

      // Update approval signatures (specific positions)
      if (data.approval_signatures) {
        const signaturePositions = [
          cellMappings.signature_1, // ครูผู้สอน
          cellMappings.signature_2, // หัวหน้ากลุ่มสาระการเรียนรู้
          cellMappings.signature_3, // หัวหน้างานระเบียนวัดผล
          cellMappings.signature_4, // หัวหน้างานวิชาการ
          cellMappings.signature_5, // รองผู้อำนวยการ
          cellMappings.signature_6, // ผู้อำนวยการ
        ];

        data.approval_signatures.forEach((signature, index) => {
          if (signaturePositions[index]) {
            // Format signature as "(Name)" to match Excel template
            const formattedSignature = `(${signature.name})`;
            this.updateCellValue(
              worksheet,
              signaturePositions[index],
              formattedSignature,
            );
          }
        });
      }

      // Set worksheet name
      worksheet.name = 'แบบบันทึกผลการเรียนประจำรายวิชา';
      
      this.logger.log('Completed detailed update of cover worksheet (ปก ปพ 5)');
    } catch (error) {
      this.logger.error(
        `Error updating cover worksheet detailed: ${error.message}`,
      );
      throw error;
    }
  }

  private updateCellValue(
    worksheet: any,
    position: { row: number; col: number },
    value: any,
  ) {
    try {
      if (value !== undefined && value !== null && value !== '') {
        const cell = worksheet.getCell(position.row, position.col);
        cell.value = value;
        this.logger.debug(
          `Updated cell ${position.row},${position.col} with value: ${value}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update cell ${position.row},${position.col}: ${error.message}`,
      );
    }
  }

  private getUniqueWorksheetName(workbook: any, baseName: string): string {
    // Excel worksheet names must be <= 31 characters and unique
    let worksheetName = baseName.substring(0, 31);
    let counter = 1;

    // Check if name already exists
    while (workbook.worksheets.some((ws: any) => ws.name === worksheetName)) {
      const suffix = ` (${counter})`;
      const maxBaseLength = 31 - suffix.length;
      worksheetName = baseName.substring(0, maxBaseLength) + suffix;
      counter++;
    }

    return worksheetName;
  }

  private async createWorksheetFallback(
    workbook: any,
    data: any,
    index: number,
    subjectName: string,
  ) {
    // Fallback to original methods if template loading fails
    const fallbackMethods = [
      () => this.createCoverWorksheet(workbook, data, subjectName),
      () => this.createStudentDataWorksheet(workbook, data),
      () => this.createCourseDescriptionWorksheet(workbook, data),
      () => this.createIndicatorsByCodeWorksheet(workbook, data),
      () => this.createIndicatorsByGroupWorksheet(workbook, data),
      () => this.createAttendanceWorksheet(workbook, data),
      () => this.createAttendanceYearlyWorksheet(workbook, data),
      () => this.createAttendanceAbsenceWorksheet(workbook, data),
      () => this.createScoreTerm1Worksheet(workbook, data),
      () => this.createScoreTerm2Worksheet(workbook, data),
      () => this.createSummaryTerm1Worksheet(workbook, data),
      () => this.createSummaryTerm2Worksheet(workbook, data),
      () => this.createSummaryYearlyWorksheet(workbook, data),
      () => this.createIndicatorEvaluationWorksheet(workbook, data),
      () => this.createCharacteristicEvaluationWorksheet(workbook, data),
      () => this.createReadingEvaluationWorksheet(workbook, data),
      () => this.createSummaryChartWorksheet(workbook, data),
    ];

    if (fallbackMethods[index]) {
      await fallbackMethods[index]();
    }
  }

  private applyGeneralFormatting(worksheet: any) {
    if (!worksheet) return;

    // Set default font and row height
    if (worksheet.properties) {
      worksheet.properties.defaultRowHeight = 25;
    }

    // Auto-fit columns with maximum width - check if columns exist first
    if (
      worksheet.columns &&
      Array.isArray(worksheet.columns) &&
      worksheet.columns.length > 0
    ) {
      worksheet.columns.forEach((column: any) => {
        if (column) {
          column.width = Math.min(50, Math.max(15, column.width || 15));
        }
      });
    }

    // Set Thai font for all cells and add borders where appropriate
    if (worksheet.eachRow && typeof worksheet.eachRow === 'function') {
      worksheet.eachRow((row: any) => {
        if (row && row.eachCell && typeof row.eachCell === 'function') {
          row.eachCell((cell: any) => {
            if (cell) {
              // Set Thai font
              if (!cell.font) {
                cell.font = { name: 'TH SarabunPSK', size: 12 };
              }

              // Add vertical alignment
              if (!cell.alignment) {
                cell.alignment = { vertical: 'middle', wrapText: true };
              }
            }
          });
        }
      });
    }

    // Add page setup for printing
    if (worksheet.pageSetup) {
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
        printArea: undefined,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };
    }
  }

  private async updateStudentDataWorksheetDetailed(worksheet: any, data: any) {
    try {
      this.logger.log('Starting detailed update of student data worksheet');

      // CORRECTED cell mappings based on actual Excel analysis
      const cellMappings = {
        // Title (Row 2, merged B2:I2)
        title: { row: 2, col: 2, value: data.document_title },

        // Course details (Row 3)
        academic_year_label: { row: 3, col: 2, value: 'ปีการศึกษา:' },
        academic_year_value: {
          row: 3,
          col: 3,
          value: data.course_details.academic_year,
        },
        semester_label: { row: 3, col: 4, value: 'ภาคเรียนที่:' },
        semester_value: { row: 3, col: 5, value: data.course_details.semester },
        learning_area_label: { row: 3, col: 6, value: 'กลุ่มสาระ:' },
        learning_area_value: {
          row: 3,
          col: 8,
          value: data.course_details.learning_area,
        },

        // Course details (Row 4)
        course_type_label: { row: 4, col: 2, value: 'ประเภทวิชา:' },
        course_type_value: {
          row: 4,
          col: 3,
          value: data.course_details.course_type,
        },
        course_code_label: { row: 4, col: 4, value: 'รหัส:' },
        course_code_value: {
          row: 4,
          col: 5,
          value: data.course_details.course_code,
        },
        course_name_label: { row: 4, col: 6, value: 'ชื่อวิชา:' },
        course_name_value: {
          row: 4,
          col: 7,
          value: data.course_details.course_name,
        },

        // Student summary (Row 5) - CORRECTED based on merged cells
        total_students_label: { row: 5, col: 2, value: 'จำนวนนักเรียนทั้งหมด' }, // B5:C5 merged
        total_students_value: {
          row: 5,
          col: 4,
          value: data.student_summary.total,
        }, // D5:E5 merged
        male_label: { row: 5, col: 6, value: 'ชาย' },
        male_count: {
          row: 5,
          col: 7,
          value:
            data.student_summary.gender_distribution.find(
              (g) => g.gender === 'ชาย',
            )?.count || 0,
        },
        female_label: { row: 5, col: 8, value: 'หญิง' },
        female_count: {
          row: 5,
          col: 9,
          value:
            data.student_summary.gender_distribution.find(
              (g) => g.gender === 'หญิง',
            )?.count || 0,
        },

        // Table headers (Row 7) - CORRECTED based on merged cells
        header_number: { row: 7, col: 2, value: 'ที่' },
        header_student_id: { row: 7, col: 3, value: 'รหัส' },
        header_name: { row: 7, col: 4, value: 'ชื่อ-สกุล' }, // D7:G7 merged
        header_class: { row: 7, col: 8, value: 'ชั้น' },
        header_teacher: { row: 7, col: 9, value: 'ครูประจำชั้น' },
      };

      // Update course details
      Object.entries(cellMappings).forEach(([key, mapping]) => {
        this.updateCellValue(worksheet, mapping, mapping.value);
      });

      // Update student data (starting from row 8) - CORRECTED structure
      if (data.student_list && Array.isArray(data.student_list)) {
        data.student_list.forEach((student, index) => {
          const rowNum = 8 + index;

          // CORRECTED cell mappings based on actual Excel structure:
          // Col 2: ลำดับ (ที่)
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 2 },
            student.list_number,
          );

          // Col 3: รหัสนักเรียน
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 3 },
            student.student_id,
          );

          // Col 4: คำนำหน้า (เด็กชาย/เด็กหญิง) - use Thai title directly
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 4 },
            student.title,
          );

          // Col 5: ชื่อ (merged with Col 6)
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 5 },
            student.first_name,
          );

          // Col 7: นามสกุล
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 7 },
            student.last_name,
          );

          // Col 8: ชั้น
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 8 },
            student.class,
          );

          // Col 9: ครูประจำชั้น
          this.updateCellValue(
            worksheet,
            { row: rowNum, col: 9 },
            student.homeroom_teacher,
          );
        });
      }

      // Set worksheet name
      worksheet.name = 'ข้อมูลนักเรียนประจำรายวิชา';

      this.logger.log('Completed detailed update of student data worksheet');
    } catch (error) {
      this.logger.error(
        `Error updating student data worksheet detailed: ${error.message}`,
      );
      throw error;
    }
  }
}
