const { Workbook } = require('exceljs');
const fs = require('fs');
const path = require('path');

async function analyzeExcelStructure() {
  try {
    console.log('=== Excel Template Structure Analysis ===\n');
    
    // Load the Excel template file
    const templatePath = path.join(process.cwd(), 'assets', 'template', 'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx');
    const workbook = new Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    console.log(`Loaded template: ${templatePath}`);
    console.log(`Number of worksheets: ${workbook.worksheets.length}\n`);
    
    // Analyze each worksheet
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`=== Worksheet ${index + 1}: ${worksheet.name} ===`);
      console.log(`Dimensions: ${worksheet.dimensions}`);
      console.log(`Row count: ${worksheet.rowCount}`);
      console.log(`Column count: ${worksheet.columnCount}\n`);
      
      // Analyze first 50 rows to understand structure
      const maxRows = Math.min(50, worksheet.rowCount);
      console.log(`Analyzing first ${maxRows} rows...\n`);
      
      for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
        const row = worksheet.getRow(rowNum);
        if (row && row.cellCount > 0) {
          const rowData = [];
          row.eachCell((cell, colNumber) => {
            if (cell.value !== undefined && cell.value !== null && cell.value !== '') {
              rowData.push({
                col: colNumber,
                value: cell.value,
                address: cell.address,
                isMerged: cell.isMerged,
                mergeAddress: cell.mergeAddress
              });
            }
          });
          
          if (rowData.length > 0) {
            console.log(`Row ${rowNum}:`);
            rowData.forEach(cell => {
              console.log(`  ${cell.address}: "${cell.value}" ${cell.isMerged ? '(merged)' : ''}`);
            });
            console.log('');
          }
        }
      }
      
      // Check for merged cells
      if (worksheet.model && worksheet.model.merges) {
        console.log('Merged cells:');
        worksheet.model.merges.forEach(merge => {
          console.log(`  ${merge}`);
        });
        console.log('');
      }
      
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Error analyzing Excel structure:', error);
  }
}

async function testJsonMapping() {
  try {
    console.log('=== JSON Data Mapping Test ===\n');
    
    // Load JSON data
    const jsonPath = path.join(process.cwd(), 'assets', 'data', '1.ปก ปพ 5.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log('JSON Data Structure:');
    console.log(JSON.stringify(jsonData, null, 2));
    console.log('\n');
    
    // Test mapping with Excel structure
    const templatePath = path.join(process.cwd(), 'assets', 'template', 'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx');
    const workbook = new Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.worksheets[0]; // First worksheet
    
    console.log('=== Testing Cell Mapping ===\n');
    
    // Test academic details mapping
    console.log('Academic Details Mapping:');
    const academicMappings = [
      { cell: 'D10', field: 'academic_details.year', value: jsonData.academic_details?.year },
      { cell: 'G10', field: 'academic_details.semester', value: jsonData.academic_details?.semester },
      { cell: 'I10', field: 'academic_details.class', value: jsonData.academic_details?.class },
      { cell: 'F11', field: 'academic_details.learning_area', value: jsonData.academic_details?.learning_area },
      { cell: 'K11', field: 'academic_details.course_type', value: jsonData.academic_details?.course_type },
      { cell: 'D12', field: 'academic_details.course_code', value: jsonData.academic_details?.course_code },
      { cell: 'G12', field: 'academic_details.course_name', value: jsonData.academic_details?.course_name },
      { cell: 'D13', field: 'academic_details.credits', value: jsonData.academic_details?.credits },
      { cell: 'I13', field: 'academic_details.learning_hours', value: jsonData.academic_details?.learning_hours }
    ];
    
    academicMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nPersonnel Mapping:');
    const personnelMappings = [
      { cell: 'E14', field: 'personnel.instructors[0].name', value: jsonData.personnel?.instructors?.[0]?.name },
      { cell: 'J14', field: 'personnel.instructors[0].phone', value: jsonData.personnel?.instructors?.[0]?.phone },
      { cell: 'E15', field: 'personnel.instructors[1].name', value: jsonData.personnel?.instructors?.[1]?.name },
      { cell: 'J15', field: 'personnel.instructors[1].phone', value: jsonData.personnel?.instructors?.[1]?.phone },
      { cell: 'E16', field: 'personnel.homeroom_teacher.name', value: jsonData.personnel?.homeroom_teacher?.name },
      { cell: 'J16', field: 'personnel.homeroom_teacher.phone', value: jsonData.personnel?.homeroom_teacher?.phone }
    ];
    
    personnelMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nResults Summary Mapping:');
    const resultsMappings = [
      { cell: 'A21', field: 'results_summary.total_students', value: jsonData.results_summary?.total_students },
      { cell: 'B21', field: 'grade_distribution[4]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '4')?.count },
      { cell: 'C21', field: 'grade_distribution[3.5]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '3.5')?.count },
      { cell: 'D21', field: 'grade_distribution[3]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '3')?.count },
      { cell: 'E21', field: 'grade_distribution[2.5]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '2.5')?.count },
      { cell: 'F21', field: 'grade_distribution[2]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '2')?.count },
      { cell: 'G21', field: 'grade_distribution[1.5]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '1.5')?.count },
      { cell: 'H21', field: 'grade_distribution[1]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '1')?.count },
      { cell: 'I21', field: 'grade_distribution[0]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '0')?.count },
      { cell: 'J21', field: 'grade_distribution[ร]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'ร')?.count },
      { cell: 'K21', field: 'grade_distribution[มผ]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'มผ')?.count },
      { cell: 'L21', field: 'grade_distribution[มส]', value: jsonData.results_summary?.grade_distribution?.find(g => g.grade === 'มส')?.count }
    ];
    
    resultsMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nCharacteristics Mapping:');
    const charMappings = [
      { cell: 'B25', field: 'desirable_characteristics[3]', value: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '3')?.count },
      { cell: 'C25', field: 'desirable_characteristics[2]', value: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '2')?.count },
      { cell: 'D25', field: 'desirable_characteristics[1]', value: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '1')?.count },
      { cell: 'E25', field: 'desirable_characteristics[0]', value: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '0')?.count }
    ];
    
    charMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nReading Analysis Mapping:');
    const readingMappings = [
      { cell: 'F25', field: 'reading_thinking_analysis_writing[3]', value: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '3')?.count },
      { cell: 'G25', field: 'reading_thinking_analysis_writing[2]', value: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '2')?.count },
      { cell: 'H25', field: 'reading_thinking_analysis_writing[1]', value: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '1')?.count },
      { cell: 'I25', field: 'reading_thinking_analysis_writing[0]', value: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '0')?.count }
    ];
    
    readingMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nIndicators Mapping:');
    const indicatorMappings = [
      { cell: 'J25', field: 'indicators_assessment[ผ่าน]', value: jsonData.results_summary?.indicators_assessment?.find(i => i.result === 'ผ่าน')?.count },
      { cell: 'K25', field: 'indicators_assessment[ไม่ผ่าน]', value: jsonData.results_summary?.indicators_assessment?.find(i => i.result === 'ไม่ผ่าน')?.count }
    ];
    
    indicatorMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
    console.log('\nApproval Signatures Mapping:');
    const signatureMappings = [
      { cell: 'F30', field: 'approval_signatures[0].name', value: jsonData.approval_signatures?.[0]?.name },
      { cell: 'F32', field: 'approval_signatures[1].name', value: jsonData.approval_signatures?.[1]?.name },
      { cell: 'F34', field: 'approval_signatures[2].name', value: jsonData.approval_signatures?.[2]?.name },
      { cell: 'F36', field: 'approval_signatures[3].name', value: jsonData.approval_signatures?.[3]?.name },
      { cell: 'F38', field: 'approval_signatures[4].name', value: jsonData.approval_signatures?.[4]?.name },
      { cell: 'F40', field: 'approval_signatures[5].name', value: jsonData.approval_signatures?.[5]?.name }
    ];
    
    signatureMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      console.log(`${mapping.cell}: Expected "${mapping.value}", Current "${cell.value}"`);
    });
    
  } catch (error) {
    console.error('Error testing JSON mapping:', error);
  }
}

async function createTestWorkbook() {
  try {
    console.log('=== Creating Test Workbook ===\n');
    
    // Load JSON data
    const jsonPath = path.join(process.cwd(), 'assets', 'data', '1.ปก ปพ 5.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Load template
    const templatePath = path.join(process.cwd(), 'assets', 'template', 'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx');
    const workbook = new Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.worksheets[0];
    
    // Apply the mapping from the service
    const cellMappings = {
      // Academic details
      academic_year_value: { row: 10, col: 4 },
      semester_value: { row: 10, col: 7 },
      class_value: { row: 10, col: 9 },
      learning_area_value: { row: 11, col: 6 },
      course_type_value: { row: 11, col: 11 },
      course_code_value: { row: 12, col: 4 },
      course_name_value: { row: 12, col: 7 },
      credits_value: { row: 13, col: 4 },
      learning_hours_value: { row: 13, col: 9 },
      
      // Personnel
      instructor_1_name: { row: 14, col: 5 },
      instructor_1_phone: { row: 14, col: 10 },
      instructor_2_name: { row: 15, col: 5 },
      instructor_2_phone: { row: 15, col: 10 },
      homeroom_teacher_name: { row: 16, col: 5 },
      homeroom_teacher_phone: { row: 16, col: 10 },
      
      // Results summary
      total_students: { row: 21, col: 1 },
      grade_4: { row: 21, col: 2 },
      grade_3_5: { row: 21, col: 3 },
      grade_3: { row: 21, col: 4 },
      grade_2_5: { row: 21, col: 5 },
      grade_2: { row: 21, col: 6 },
      grade_1_5: { row: 21, col: 7 },
      grade_1: { row: 21, col: 8 },
      grade_0: { row: 21, col: 9 },
      grade_r: { row: 21, col: 10 },
      grade_mp: { row: 21, col: 11 },
      grade_ms: { row: 21, col: 12 },
      
      // Characteristics and reading
      char_3: { row: 25, col: 2 },
      char_2: { row: 25, col: 3 },
      char_1: { row: 25, col: 4 },
      char_0: { row: 25, col: 5 },
      read_3: { row: 25, col: 6 },
      read_2: { row: 25, col: 7 },
      read_1: { row: 25, col: 8 },
      read_0: { row: 25, col: 9 },
      indicators_pass: { row: 25, col: 10 },
      indicators_fail: { row: 25, col: 11 },
      
      // Signatures
      signature_1: { row: 30, col: 6 },
      signature_2: { row: 32, col: 6 },
      signature_3: { row: 34, col: 6 },
      signature_4: { row: 36, col: 6 },
      signature_5: { row: 38, col: 6 },
      signature_6: { row: 40, col: 6 }
    };
    
    // Update academic details
    if (jsonData.academic_details) {
      updateCellValue(worksheet, cellMappings.academic_year_value, jsonData.academic_details.year);
      updateCellValue(worksheet, cellMappings.semester_value, jsonData.academic_details.semester);
      updateCellValue(worksheet, cellMappings.class_value, jsonData.academic_details.class);
      updateCellValue(worksheet, cellMappings.learning_area_value, jsonData.academic_details.learning_area);
      updateCellValue(worksheet, cellMappings.course_type_value, jsonData.academic_details.course_type);
      updateCellValue(worksheet, cellMappings.course_code_value, jsonData.academic_details.course_code);
      updateCellValue(worksheet, cellMappings.course_name_value, jsonData.academic_details.course_name);
      updateCellValue(worksheet, cellMappings.credits_value, jsonData.academic_details.credits);
      updateCellValue(worksheet, cellMappings.learning_hours_value, jsonData.academic_details.learning_hours);
    }
    
    // Update personnel
    if (jsonData.personnel) {
      if (jsonData.personnel.instructors?.[0]) {
        updateCellValue(worksheet, cellMappings.instructor_1_name, jsonData.personnel.instructors[0].name);
        updateCellValue(worksheet, cellMappings.instructor_1_phone, jsonData.personnel.instructors[0].phone);
      }
      if (jsonData.personnel.instructors?.[1]) {
        updateCellValue(worksheet, cellMappings.instructor_2_name, jsonData.personnel.instructors[1].name);
        updateCellValue(worksheet, cellMappings.instructor_2_phone, jsonData.personnel.instructors[1].phone);
      }
      if (jsonData.personnel.homeroom_teacher) {
        updateCellValue(worksheet, cellMappings.homeroom_teacher_name, jsonData.personnel.homeroom_teacher.name);
        updateCellValue(worksheet, cellMappings.homeroom_teacher_phone, jsonData.personnel.homeroom_teacher.phone);
      }
    }
    
    // Update results summary
    if (jsonData.results_summary) {
      updateCellValue(worksheet, cellMappings.total_students, jsonData.results_summary.total_students);
      
      if (jsonData.results_summary.grade_distribution) {
        const gradeMap = {
          '4': cellMappings.grade_4,
          '3.5': cellMappings.grade_3_5,
          '3': cellMappings.grade_3,
          '2.5': cellMappings.grade_2_5,
          '2': cellMappings.grade_2,
          '1.5': cellMappings.grade_1_5,
          '1': cellMappings.grade_1,
          '0': cellMappings.grade_0,
          'ร': cellMappings.grade_r,
          'มผ': cellMappings.grade_mp,
          'มส': cellMappings.grade_ms,
        };
        
        jsonData.results_summary.grade_distribution.forEach(grade => {
          const mapping = gradeMap[grade.grade];
          if (mapping) {
            updateCellValue(worksheet, mapping, grade.count);
          }
        });
      }
      
      // Update characteristics
      if (jsonData.results_summary.desirable_characteristics?.student_count) {
        const charMap = {
          '3': cellMappings.char_3,
          '2': cellMappings.char_2,
          '1': cellMappings.char_1,
          '0': cellMappings.char_0,
        };
        
        jsonData.results_summary.desirable_characteristics.student_count.forEach(char => {
          const mapping = charMap[char.scale];
          if (mapping) {
            updateCellValue(worksheet, mapping, char.count);
          }
        });
      }
      
      // Update reading analysis
      if (jsonData.results_summary.reading_thinking_analysis_writing?.student_count) {
        const readMap = {
          '3': cellMappings.read_3,
          '2': cellMappings.read_2,
          '1': cellMappings.read_1,
          '0': cellMappings.read_0,
        };
        
        jsonData.results_summary.reading_thinking_analysis_writing.student_count.forEach(read => {
          const mapping = readMap[read.scale];
          if (mapping) {
            updateCellValue(worksheet, mapping, read.count);
          }
        });
      }
      
      // Update indicators
      if (jsonData.results_summary.indicators_assessment) {
        jsonData.results_summary.indicators_assessment.forEach(indicator => {
          if (indicator.result === 'ผ่าน') {
            updateCellValue(worksheet, cellMappings.indicators_pass, indicator.count);
          } else if (indicator.result === 'ไม่ผ่าน') {
            updateCellValue(worksheet, cellMappings.indicators_fail, indicator.count);
          }
        });
      }
    }
    
    // Update signatures
    if (jsonData.approval_signatures) {
      const signaturePositions = [
        cellMappings.signature_1,
        cellMappings.signature_2,
        cellMappings.signature_3,
        cellMappings.signature_4,
        cellMappings.signature_5,
        cellMappings.signature_6,
      ];
      
      jsonData.approval_signatures.forEach((signature, index) => {
        if (signaturePositions[index]) {
          updateCellValue(worksheet, signaturePositions[index], signature.name);
        }
      });
    }
    
    // Save test workbook
    const testOutputPath = path.join(process.cwd(), 'test-output.xlsx');
    await workbook.xlsx.writeFile(testOutputPath);
    console.log(`Test workbook saved to: ${testOutputPath}`);
    
  } catch (error) {
    console.error('Error creating test workbook:', error);
  }
}

function updateCellValue(worksheet, position, value) {
  try {
    if (value !== undefined && value !== null && value !== '') {
      const cell = worksheet.getCell(position.row, position.col);
      cell.value = value;
      console.log(`Updated cell ${position.row},${position.col} with value: ${value}`);
    }
  } catch (error) {
    console.warn(`Failed to update cell ${position.row},${position.col}: ${error.message}`);
  }
}

// Run the analysis
async function main() {
  console.log('Starting Excel analysis...\n');
  
  await analyzeExcelStructure();
  await testJsonMapping();
  await createTestWorkbook();
  
  console.log('\nAnalysis complete!');
}

main().catch(console.error); 