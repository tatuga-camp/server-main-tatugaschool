import { Injectable, Logger } from '@nestjs/common';
import { Workbook } from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

interface MappingTestResult {
  testName: string;
  success: boolean;
  errors: string[];
  mappings: {
    cell: string;
    field: string;
    expected: any;
    actual: any;
    normalizedActual?: any;
    normalizedExpected?: any;
    match: boolean;
  }[];
}

interface ExcelMappingTestResults {
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: MappingTestResult[];
  summary: string;
}

@Injectable()
export class ExcelMappingTestService {
  private readonly logger = new Logger(ExcelMappingTestService.name);

  /**
   * Comprehensive test to verify Excel template mapping with JSON data
   */
  async testExcelMapping(): Promise<ExcelMappingTestResults> {
    try {
      this.logger.log('Starting comprehensive Excel mapping test...');

      // Load JSON data
      const jsonPath = path.join(
        process.cwd(),
        'assets',
        'data',
        '1.ปก ปพ 5.json',
      );
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Load Excel template
      const templatePath = path.join(
        process.cwd(),
        'assets',
        'template',
        'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx',
      );
      const workbook = new Workbook();
      await workbook.xlsx.readFile(templatePath);

      const worksheet = workbook.worksheets[0];

      // Run all tests
      const testResults = await Promise.all([
        this.testSchoolInformationMapping(worksheet, jsonData),
        this.testAcademicDetailsMapping(worksheet, jsonData),
        this.testPersonnelMapping(worksheet, jsonData),
        this.testResultsSummaryMapping(worksheet, jsonData),
        this.testCharacteristicsMapping(worksheet, jsonData),
        this.testReadingAnalysisMapping(worksheet, jsonData),
        this.testIndicatorsMapping(worksheet, jsonData),
        this.testApprovalSignaturesMapping(worksheet, jsonData),
      ]);

      // Calculate overall results
      const totalTests = testResults.length;
      const passedTests = testResults.filter((result) => result.success).length;
      const failedTests = totalTests - passedTests;
      const overallSuccess = failedTests === 0;

      // Generate summary
      const summary = this.generateSummary(
        testResults,
        overallSuccess,
        totalTests,
        passedTests,
        failedTests,
      );

      return {
        overallSuccess,
        totalTests,
        passedTests,
        failedTests,
        testResults,
        summary,
      };
    } catch (error) {
      this.logger.error(`Error in Excel mapping test: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test school information mapping
   */
  private async testSchoolInformationMapping(
    worksheet: any,
    jsonData: any,
  ): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'School Information Mapping',
      success: true,
      errors: [],
      mappings: [],
    };

    const schoolMappings = [
      {
        cell: 'B5',
        field: 'school_information.name',
        expected: jsonData.school_information?.name,
      },
      {
        cell: 'B6',
        field: 'school_information.address',
        expected: jsonData.school_information?.address,
      },
      {
        cell: 'B7',
        field: 'school_information.educational_service_area',
        expected: jsonData.school_information?.educational_service_area,
      },
    ];

    for (const mapping of schoolMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      const isMatch = actual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        match: isMatch,
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(
          `Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`,
        );
      }
    }

    return results;
  }

  /**
   * Test academic details mapping
   */
  private async testAcademicDetailsMapping(
    worksheet: any,
    jsonData: any,
  ): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Academic Details Mapping',
      success: true,
      errors: [],
      mappings: [],
    };

    const academicMappings = [
      {
        cell: 'D10',
        field: 'academic_details.year',
        expected: jsonData.academic_details?.year,
      },
      {
        cell: 'G10',
        field: 'academic_details.semester',
        expected: jsonData.academic_details?.semester,
      },
      {
        cell: 'I10',
        field: 'academic_details.class',
        expected: jsonData.academic_details?.class,
      },
      {
        cell: 'F11',
        field: 'academic_details.learning_area',
        expected: jsonData.academic_details?.learning_area,
      },
      {
        cell: 'K11',
        field: 'academic_details.course_type',
        expected: jsonData.academic_details?.course_type,
      },
      {
        cell: 'D12',
        field: 'academic_details.course_code',
        expected: jsonData.academic_details?.course_code,
      },
      {
        cell: 'G12',
        field: 'academic_details.course_name',
        expected: jsonData.academic_details?.course_name,
      },
      {
        cell: 'D13',
        field: 'academic_details.credits',
        expected: jsonData.academic_details?.credits,
      },
      {
        cell: 'I13',
        field: 'academic_details.learning_hours',
        expected: jsonData.academic_details?.learning_hours,
      },
    ];

    for (const mapping of academicMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      const isMatch = actual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test personnel mapping
   */
  private async testPersonnelMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Personnel Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const personnelMappings = [
      { cell: 'E14', field: 'personnel.instructors[0].name', expected: jsonData.personnel?.instructors?.[0]?.name },
      { cell: 'J14', field: 'personnel.instructors[0].phone', expected: jsonData.personnel?.instructors?.[0]?.phone },
      { cell: 'E15', field: 'personnel.instructors[1].name', expected: jsonData.personnel?.instructors?.[1]?.name },
      { cell: 'J15', field: 'personnel.instructors[1].phone', expected: jsonData.personnel?.instructors?.[1]?.phone },
      { cell: 'E16', field: 'personnel.homeroom_teacher.name', expected: jsonData.personnel?.homeroom_teacher?.name },
      { cell: 'J16', field: 'personnel.homeroom_teacher.phone', expected: jsonData.personnel?.homeroom_teacher?.phone }
    ];

    for (const mapping of personnelMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      // Handle extra spaces in Excel template
      const normalizedActual = typeof actual === 'string' ? actual.replace(/\s+/g, ' ').trim() : actual;
      const normalizedExpected = typeof mapping.expected === 'string' ? mapping.expected.replace(/\s+/g, ' ').trim() : mapping.expected;
      const isMatch = normalizedActual === normalizedExpected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        normalizedActual: normalizedActual,
        normalizedExpected: normalizedExpected,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test results summary mapping
   */
  private async testResultsSummaryMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Results Summary Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const summaryMappings = [
      { cell: 'A21', field: 'results_summary.total_students', expected: jsonData.results_summary?.total_students },
      { cell: 'B21', field: 'grade_distribution[4]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '4')?.count },
      { cell: 'C21', field: 'grade_distribution[3.5]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '3.5')?.count },
      { cell: 'D21', field: 'grade_distribution[3]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '3')?.count },
      { cell: 'E21', field: 'grade_distribution[2.5]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '2.5')?.count },
      { cell: 'F21', field: 'grade_distribution[2]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '2')?.count },
      { cell: 'G21', field: 'grade_distribution[1.5]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '1.5')?.count },
      { cell: 'H21', field: 'grade_distribution[1]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '1')?.count },
      { cell: 'I21', field: 'grade_distribution[0]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '0')?.count },
      { cell: 'J21', field: 'grade_distribution[ร]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'ร')?.count },
      { cell: 'K21', field: 'grade_distribution[มผ]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'มผ')?.count },
      { cell: 'L21', field: 'grade_distribution[มส]', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'มส')?.count }
    ];

    for (const mapping of summaryMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      // Handle null values in Excel template
      const normalizedActual = actual === null ? 0 : actual;
      const isMatch = normalizedActual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        normalizedActual: normalizedActual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test characteristics mapping
   */
  private async testCharacteristicsMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Characteristics Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const charMappings = [
      { cell: 'B25', field: 'desirable_characteristics[3]', expected: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '3')?.count },
      { cell: 'C25', field: 'desirable_characteristics[2]', expected: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '2')?.count },
      { cell: 'D25', field: 'desirable_characteristics[1]', expected: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '1')?.count },
      { cell: 'E25', field: 'desirable_characteristics[0]', expected: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '0')?.count }
    ];

    for (const mapping of charMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      // Handle dash values in Excel template
      const normalizedActual = actual === '-' ? 0 : actual;
      const isMatch = normalizedActual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        normalizedActual: normalizedActual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test reading analysis mapping
   */
  private async testReadingAnalysisMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Reading Analysis Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const readingMappings = [
      { cell: 'F25', field: 'reading_thinking_analysis_writing[3]', expected: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '3')?.count },
      { cell: 'G25', field: 'reading_thinking_analysis_writing[2]', expected: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '2')?.count },
      { cell: 'H25', field: 'reading_thinking_analysis_writing[1]', expected: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '1')?.count },
      { cell: 'I25', field: 'reading_thinking_analysis_writing[0]', expected: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '0')?.count }
    ];

    for (const mapping of readingMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      // Handle dash values in Excel template
      const normalizedActual = actual === '-' ? 0 : actual;
      const isMatch = normalizedActual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        normalizedActual: normalizedActual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test indicators mapping
   */
  private async testIndicatorsMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Indicators Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const indicatorMappings = [
      { cell: 'J25', field: 'indicators_assessment[ผ่าน]', expected: jsonData.results_summary?.indicators_assessment?.find(i => i.result === 'ผ่าน')?.count },
      { cell: 'K25', field: 'indicators_assessment[ไม่ผ่าน]', expected: jsonData.results_summary?.indicators_assessment?.find(i => i.result === 'ไม่ผ่าน')?.count }
    ];

    for (const mapping of indicatorMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      // Handle dash values in Excel template
      const normalizedActual = actual === '-' ? 0 : actual;
      const isMatch = normalizedActual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        normalizedActual: normalizedActual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Test approval signatures mapping
   */
  private async testApprovalSignaturesMapping(worksheet: any, jsonData: any): Promise<MappingTestResult> {
    const results: MappingTestResult = {
      testName: 'Approval Signatures Mapping',
      success: true,
      errors: [],
      mappings: []
    };

    const signatureMappings = [
      { cell: 'G30', field: 'approval_signatures[0].name', expected: `(${jsonData.approval_signatures?.[0]?.name})` },
      { cell: 'G32', field: 'approval_signatures[1].name', expected: `(${jsonData.approval_signatures?.[1]?.name})` },
      { cell: 'G34', field: 'approval_signatures[2].name', expected: `(${jsonData.approval_signatures?.[2]?.name})` },
      { cell: 'G36', field: 'approval_signatures[3].name', expected: `(${jsonData.approval_signatures?.[3]?.name})` },
      { cell: 'G38', field: 'approval_signatures[4].name', expected: `(${jsonData.approval_signatures?.[4]?.name})` },
      { cell: 'G40', field: 'approval_signatures[5].name', expected: `(${jsonData.approval_signatures?.[5]?.name})` }
    ];

    for (const mapping of signatureMappings) {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      const isMatch = actual === mapping.expected;

      results.mappings.push({
        cell: mapping.cell,
        field: mapping.field,
        expected: mapping.expected,
        actual: actual,
        match: isMatch
      });

      if (!isMatch) {
        results.success = false;
        results.errors.push(`Mismatch at ${mapping.cell}: expected "${mapping.expected}", got "${actual}"`);
      }
    }

    return results;
  }

  /**
   * Generate test summary
   */
  private generateSummary(
    testResults: MappingTestResult[],
    overallSuccess: boolean,
    totalTests: number,
    passedTests: number,
    failedTests: number
  ): string {
    let summary = `\n=== Excel Mapping Test Summary ===\n`;
    summary += `Overall Status: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}\n`;
    summary += `Tests Run: ${totalTests}\n`;
    summary += `Passed: ${passedTests}\n`;
    summary += `Failed: ${failedTests}\n\n`;

    testResults.forEach(result => {
      summary += `${result.success ? '✅' : '❌'} ${result.testName}\n`;
      if (!result.success && result.errors.length > 0) {
        summary += `  Errors:\n`;
        result.errors.forEach(error => {
          summary += `    - ${error}\n`;
        });
      }
      summary += `  Mappings: ${result.mappings.filter(m => m.match).length}/${result.mappings.length} correct\n\n`;
    });

    return summary;
  }
} 