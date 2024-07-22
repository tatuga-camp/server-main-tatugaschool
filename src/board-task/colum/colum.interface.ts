export interface RequestCreateColum {
  data: {
    title: string;
    description?: string;
    color: string;
    teamId: string;
    schoolId: string;
    boardId: string;
  };
}

export interface RequestUpdateColum {
  columId: string;
  data: {
    title?: string;
    description?: string;
    color?: string;
    teamId?: string;
    schoolId?: string;
    boardId?: string;
  };
}

export interface RequestDeleteColum {
  columId: string;
}

export interface RequestGetColum {
  columId: string;
}

export interface RequestGetColumsByBoardId {
  boardId: string;
}
