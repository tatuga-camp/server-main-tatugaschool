import { StudentOnSubject, WordCloud } from '@prisma/client';

export type WordCount = {
  text: string; // representative original text for this normalized group
  normalized: string;
  count: number;
  students?: string[]; // display names of answerers, only for STUDENTS_ONLY
};

export type ResponseGetWordCloudById = {
  wordCloud: WordCloud;
  words: WordCount[];
  totalAnswers: number;
};

export type ResponseGetWordCloudPublic = {
  id: string;
  question: string;
  status: string;
  accessMode: string;
  allowMultiple: boolean;
  students: StudentOnSubject[]; // subject roster, only for STUDENTS_ONLY
};
