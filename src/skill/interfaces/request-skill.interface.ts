export type RequestFindSkillById = {
  skillId: string;
};

export type RequestCreateSkill = {
  title: string;
  description: string;
  keywords: string;
  vector: number[];
};

export type RequestUpdateSkill = {
  query: {
    skillId: string;
  };
  data: {
    title?: string;
    description?: string;
    keywords?: string;
    vector?: number[];
  };
};

export type RequestDeleteSkill = {
  skillId: string;
};
export interface RawSkill {
  _id: { $oid: string };
  createAt: { $date: string };
  updateAt: { $date: string };
  title: string;
  description: string;
  keywords: string;
}
