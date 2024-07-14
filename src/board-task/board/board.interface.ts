export interface RequestCreateBoard {
  data: {
    title: string;
    description: string;
    teamId: string;
    schoolId: string;
  };
}

export interface RequestUpdateBoard {
  boardId: string;
  data: {
    title: string;
    description: string;
    teamId: string;
    schoolId: string;
  };
}

export interface RequestDeleteBoard {
  boardId: string;
}

export interface RequestGetBoard {
  boardId: string;
}

export interface RequestGetBoardsByTeamId {
  teamId: string;
  page: number;
  limit: number;
}
