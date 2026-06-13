import { RiskTier } from '../analytics.scoring';

export type AtRiskStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  number: string;
  photo: string;
  classId: string;
  className: string;
  riskScore: number; // 0-100
  tier: Extract<RiskTier, 'HIGH' | 'MEDIUM'>;
  limitedData: boolean;
  signals: {
    missingCount: number;
    missingRate: number; // 0-1
    avgScorePercent: number | null;
    absentCount: number;
    absentRate: number | null; // 0-1
  };
};

export type SchoolAnalytics = {
  schoolId: string;
  educationYear: string;
  generatedAt: string; // ISO
  source: 'scheduled' | 'on-demand';
  summary: {
    totalStudents: number;
    atRiskCount: number; // HIGH + MEDIUM
    highRiskCount: number;
    mediumRiskCount: number;
    onTimeSubmissionRate: number; // 0-1
    awaitingGradingCount: number;
    attendanceRate: number; // 0-1
    avgScorePercent: number; // 0-100
  };
  atRiskStudents: AtRiskStudent[];
  scoreDistribution: Array<{ bucket: string; count: number }>;
  attendanceOverview: { present: number; absent: number; other: number; rate: number };
  classLeaderboard: Array<{
    classId: string;
    title: string;
    level: string;
    studentCount: number;
    atRiskCount: number;
    avgScorePercent: number;
  }>;
  subjectLeaderboard: Array<{
    subjectId: string;
    title: string;
    attendanceRate: number; // 0-1
    atRiskCount: number;
    studentCount: number;
    avgScorePercent: number; // 0-100
    teachers: Array<{ userId: string; firstName: string; lastName: string; photo: string }>;
  }>;
  teacherLeaderboard: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    photo: string;
    subjectCount: number;
    studentCount: number;
    atRiskCount: number;
    atRiskRate: number; // 0-1, lower = better
  }>;
};

export type StudentInsightDetail = {
  studentId: string;
  missingAssignments: Array<{
    studentOnAssignmentId: string;
    assignmentId: string;
    title: string;
    subjectId: string;
    subjectTitle: string;
    dueDate: string | null; // ISO
  }>;
};
