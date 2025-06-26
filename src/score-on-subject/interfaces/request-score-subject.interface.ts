export type RequestGetAllScoreOnSubjectBySubjectId = {
  subjectId: string;
};

export type RequestCreateSocreOnSubject = {
  score: number;
  title: string;
  icon: string;
  schoolId: string;
  subjectId: string;
  blurHash: string;
};

export type RequestUpdateScoreOnSubject = {
  query: {
    scoreOnSubjectId: string;
  };
  body: {
    score?: number;
    title?: string;
    icon?: string;
    isDeleted?: boolean;
    blurHash?: string;
    weight?: number;
  };
};
