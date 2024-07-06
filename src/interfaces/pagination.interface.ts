export type Pagination<T> = {
  data: T[];
  meta: {
    total: number;
    lastPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
};
