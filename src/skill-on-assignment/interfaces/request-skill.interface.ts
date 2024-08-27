export type RequestGetById = {
  id: string;
};

export type RequestCreate = {
  skillId: string;
  assignmentId: string;
  subjectId: string;
};

export type RequestDelete = {
  id: string;
};

export type RequestGetByAssignmentId = {
  assignmentId: string;
};

export type RequestGetBySkillId = {
  skillId: string;
};

export type RequestGetBySubjectId = {
  subjectId: string;
};
