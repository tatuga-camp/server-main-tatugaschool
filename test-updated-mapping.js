const { Workbook } = require('exceljs');
const fs = require('fs');
const path = require('path');

async function testUpdatedMapping() {
  try {
    console.log('=== Testing Updated Excel Mapping ===\n');
    
    // Load JSON data
    const jsonPath = path.join(process.cwd(), 'assets', 'data', '1.ปก ปพ 5.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Load template
    const templatePath = path.join(process.cwd(), 'assets', 'template', 'แบบบันทึกผลการเรียนประจำรายวิชา.xlsx');
    const workbook = new Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.worksheets[0];
    
    // Apply the corrected mapping from our analysis
    const cellMappings = {
      // School information - CORRECTED
      school_name: { row: 5, col: 2 }, // B5
      school_address: { row: 6, col: 2 }, // B6
      school_area: { row: 7, col: 2 }, // B7
      
      // Academic details - CORRECTED
      academic_year_value: { row: 10, col: 4 }, // D10: 2568
      semester_value: { row: 10, col: 7 }, // G10: 1
      class_value: { row: 10, col: 9 }, // I10: ประถมศึกษาปีที่ 5/1
      learning_area_value: { row: 11, col: 6 }, // F11: ภาษาต่างประเทศ
      course_type_value: { row: 11, col: 11 }, // K11: พื้นฐาน
      course_code_value: { row: 12, col: 4 }, // D12: อ15101
      course_name_value: { row: 12, col: 7 }, // G12: ภาษาอังกฤษ 5
      credits_value: { row: 13, col: 4 }, // D13: 3
      learning_hours_value: { row: 13, col: 9 }, // I13: 120 ชั่วโมง/ปี
      
      // Personnel - CORRECTED
      instructor_1_name: { row: 14, col: 5 }, // E14: นายศตวรรษ ปิฉิมพลี
      instructor_1_phone: { row: 14, col: 10 }, // J14: 099-997-9797
      instructor_2_name: { row: 15, col: 5 }, // E15: -
      instructor_2_phone: { row: 15, col: 10 }, // J15: -
      homeroom_teacher_name: { row: 16, col: 5 }, // E16: นางวารุณี ศรีนวลแสง
      homeroom_teacher_phone: { row: 16, col: 10 }, // J16: 099-997-9799
      
      // Results summary - CORRECTED
      total_students: { row: 21, col: 1 }, // A21: 10
      grade_4: { row: 21, col: 2 }, // B21: 5
      grade_3_5: { row: 21, col: 3 }, // C21: 2
      grade_3: { row: 21, col: 4 }, // D21: 2
      grade_2_5: { row: 21, col: 5 }, // E21: 1
      grade_2: { row: 21, col: 6 }, // F21: 0
      grade_1_5: { row: 21, col: 7 }, // G21: 0
      grade_1: { row: 21, col: 8 }, // H21: 0
      grade_0: { row: 21, col: 9 }, // I21: 0
      grade_r: { row: 21, col: 10 }, // J21: 0
      grade_mp: { row: 21, col: 11 }, // K21: 0
      grade_ms: { row: 21, col: 12 }, // L21: 0
      
      // Characteristics, reading, and indicators - CORRECTED
      char_3: { row: 25, col: 2 }, // B25: 7
      char_2: { row: 25, col: 3 }, // C25: 3
      char_1: { row: 25, col: 4 }, // D25: 0
      char_0: { row: 25, col: 5 }, // E25: 0
      read_3: { row: 25, col: 6 }, // F25: 8
      read_2: { row: 25, col: 7 }, // G25: 2
      read_1: { row: 25, col: 8 }, // H25: 0
      read_0: { row: 25, col: 9 }, // I25: 0
      indicators_pass: { row: 25, col: 10 }, // J25: 10
      indicators_fail: { row: 25, col: 11 }, // K25: 0
      
      // Approval signatures - CORRECTED (G column)
      signature_1: { row: 30, col: 7 }, // G30: (นายศตวรรษ ปิฉิมพลี)
      signature_2: { row: 32, col: 7 }, // G32: (นางมุกดา พาชวนชม)
      signature_3: { row: 34, col: 7 }, // G34: (นางมุกดา พาชวนชม)
      signature_4: { row: 36, col: 7 }, // G36: (นายวิชัย สุเมศไทย)
      signature_5: { row: 38, col: 7 }, // G38: (นางสุธีรตรา มหาราณี)
      signature_6: { row: 40, col: 7 }, // G40: (นายชาญชนะ มานะวินัย)
    };
    
    console.log('Applying updated mappings...\n');
    
    // Update school information
    if (jsonData.school_information) {
      updateCellValue(worksheet, cellMappings.school_name, jsonData.school_information.name);
      updateCellValue(worksheet, cellMappings.school_address, jsonData.school_information.address);
      updateCellValue(worksheet, cellMappings.school_area, jsonData.school_information.educational_service_area);
    }
    
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
    
    // Update signatures with correct formatting
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
          // Format signature as "(Name)" to match Excel template
          const formattedSignature = `(${signature.name})`;
          updateCellValue(worksheet, signaturePositions[index], formattedSignature);
        }
      });
    }
    
    // Save updated workbook
    const testOutputPath = path.join(process.cwd(), 'test-updated-output.xlsx');
    await workbook.xlsx.writeFile(testOutputPath);
    console.log(`Updated workbook saved to: ${testOutputPath}`);
    
    // Verify key mappings
    console.log('\n=== Verification of Key Mappings ===\n');
    
    const verificationMappings = [
      { cell: 'D10', expected: jsonData.academic_details?.year, description: 'Academic Year' },
      { cell: 'G10', expected: jsonData.academic_details?.semester, description: 'Semester' },
      { cell: 'I10', expected: jsonData.academic_details?.class, description: 'Class' },
      { cell: 'F11', expected: jsonData.academic_details?.learning_area, description: 'Learning Area' },
      { cell: 'K11', expected: jsonData.academic_details?.course_type, description: 'Course Type' },
      { cell: 'D12', expected: jsonData.academic_details?.course_code, description: 'Course Code' },
      { cell: 'G12', expected: jsonData.academic_details?.course_name, description: 'Course Name' },
      { cell: 'D13', expected: jsonData.academic_details?.credits, description: 'Credits' },
      { cell: 'I13', expected: jsonData.academic_details?.learning_hours, description: 'Learning Hours' },
      { cell: 'E14', expected: jsonData.personnel?.instructors?.[0]?.name, description: 'Instructor 1 Name' },
      { cell: 'J14', expected: jsonData.personnel?.instructors?.[0]?.phone, description: 'Instructor 1 Phone' },
      { cell: 'E16', expected: jsonData.personnel?.homeroom_teacher?.name, description: 'Homeroom Teacher Name' },
      { cell: 'J16', expected: jsonData.personnel?.homeroom_teacher?.phone, description: 'Homeroom Teacher Phone' },
      { cell: 'A21', expected: jsonData.results_summary?.total_students, description: 'Total Students' },
      { cell: 'B21', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '4')?.count, description: 'Grade 4 Count' },
      { cell: 'C21', expected: jsonData.results_summary?.grade_distribution?.find(g => g.grade === '3.5')?.count, description: 'Grade 3.5 Count' },
      { cell: 'B25', expected: jsonData.results_summary?.desirable_characteristics?.student_count?.find(c => c.scale === '3')?.count, description: 'Characteristics Level 3' },
      { cell: 'F25', expected: jsonData.results_summary?.reading_thinking_analysis_writing?.student_count?.find(r => r.scale === '3')?.count, description: 'Reading Level 3' },
      { cell: 'J25', expected: jsonData.results_summary?.indicators_assessment?.find(i => i.result === 'ผ่าน')?.count, description: 'Indicators Pass' },
      { cell: 'G30', expected: `(${jsonData.approval_signatures?.[0]?.name})`, description: 'Signature 1' },
      { cell: 'G32', expected: `(${jsonData.approval_signatures?.[1]?.name})`, description: 'Signature 2' },
      { cell: 'G36', expected: `(${jsonData.approval_signatures?.[3]?.name})`, description: 'Signature 4' },
    ];
    
    verificationMappings.forEach(mapping => {
      const cell = worksheet.getCell(mapping.cell);
      const actual = cell.value;
      const isMatch = actual === mapping.expected;
      
      console.log(`${mapping.cell} (${mapping.description}):`);
      console.log(`  Expected: "${mapping.expected}"`);
      console.log(`  Actual:   "${actual}"`);
      console.log(`  Status:   ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log('');
    });
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.error('Error testing updated mapping:', error);
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

// Run the test
testUpdatedMapping().catch(console.error); 