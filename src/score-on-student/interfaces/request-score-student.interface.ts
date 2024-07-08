export class RequestGetAllScoreOnStudentBySubjectId {
  subjectId: string;
}
export class RequestGetAllScoreOnStudentByStudentId {
  studentOnSubjectId: string;
}

export class RequestCreateScoreOnStudent {
  score: number;
  title: string;
  icon: string;
  subjectId: string;
  schoolId: string;
  studentId: string;
  studentOnSubjectId: string;
  scoreOnSubjectId: string;
}

export class RequestUpdateScoreOnStudent {
  query: {
    scoreOnStudentId: string;
  };
  body: {
    score: number;
    title: string;
    icon: string;
  };
}

export class RequestDeleteScoreOnStudent {
  scoreOnStudentId: string;
}
