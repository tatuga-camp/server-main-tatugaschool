export interface RequestCreateTask {
  data: {
    title: string;
    description?: string;
    deadline?: Date;
    assigneeId: string;
    teamId: string;
    schoolId: string;
    boardId: string;
    columId: string;
  };
}

export interface RequestUpdateTask {
  taskId: string;
  data: {
    title?: string;
    description?: string;
    deadline?: Date;
    assigneeId?: string;
    isCompleted?: boolean;
    teamId?: string;
    schoolId?: string;
    boardId?: string;
    columId?: string;
  };
}

export interface RequestDeleteTask {
  taskId: string;
}

export interface RequestGetTask {
  taskId: string;
}

export interface RequestGetTasksByColumId {
  columId: string;
}
