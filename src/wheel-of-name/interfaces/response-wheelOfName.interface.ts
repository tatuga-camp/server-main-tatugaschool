import { WheelOfName } from './model.interface';

export type ResponseCreate = {
  data: {
    path: string;
  };
};

export type ResponseUpdate = {
  data: {
    success: boolean;
  };
};

export type ResponseGet = {
  data: WheelOfName;
};
