export type StudentOnSubjectReport = {
  schoolName: string;
  reportTitle: string;
  studentInfo: {
    name: string;
    imageURL: string;
    class: string;
  };
  courseInfo: {
    subject: string;
    description: string;
    educationYear: string;
  };
  teachers: {
    homeroom: string;
    instructor: {
      name: string;
      imageURL: string;
      email: string;
    }[];
  };
  attendance: {
    status: string; // "ผ่านเกณฑ์" - consider using a more specific literal type if other statuses are known e.g., "ผ่านเกณฑ์" | "ไม่ผ่านเกณฑ์"
    totalHours: number;
    summary: {
      status: string;
      value: number;
    }[];
  };
  academicPerformance: {
    overallGrade: string;
    overallScore: number;
    maxScore: number;
    assessments: {
      item: string;
      score: number;
      maxScore: string;
      weight: number | null;
    }[];
  };
  skillAssessment: {
    title: string;
    skills: {
      skill: string;
      percentage: number;
    }[];
  };
  recommendations: string;
  signatureFields: {
    position: string;
    name: string;
  };
};
