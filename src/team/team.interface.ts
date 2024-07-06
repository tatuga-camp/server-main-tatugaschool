import { Team } from '@prisma/client';

export interface RequestCreateTeam {
  data: {
    title: string;
    description?: string;
    icon: string;
    schoolId: string;
  };
}

export interface RequestUpdateTeam {
  teamId: string;
  data: {
    title?: string;
    description?: string;
    icon?: string;
    schoolId: string;
  };
}

export interface RequestDeleteTeam {
  teamId: string;
}

export interface RequestGetTeam {
  teamId: string;
}

export interface RequestGetTeamsBySchoolId {
  schoolId: string;
  page: number;
  limit: number;
}

export interface TeamRepositoryType {
  create(request: RequestCreateTeam): Promise<Team>;
  update(request: RequestUpdateTeam): Promise<Team>;
  delete(request: RequestDeleteTeam): Promise<Team>;
  findById(request: RequestGetTeam): Promise<Team | null>;
  findBySchoolId(request: RequestGetTeamsBySchoolId): Promise<{
    data: Team[];
    meta: {
      total: number;
      lastPage: number;
      currentPage: number;
      prev: number | null;
      next: number | null;
    };
  }>;
}
