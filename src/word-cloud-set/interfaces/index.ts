import { WordCloud, WordCloudSet } from '@prisma/client';
import { WordCount } from '../../word-cloud/interfaces';

export type SetQuestionResult = {
  wordCloud: WordCloud;
  words: WordCount[];
  totalAnswers: number;
};

export type ResponseGetWordCloudSetById = {
  set: WordCloudSet;
  questions: SetQuestionResult[];
};

export type PublicSetQuestion = {
  id: string;
  question: string;
  order: number;
  status: string;
};

export type ResponseGetWordCloudSetPublic = {
  id: string;
  status: string;
  accessMode: string;
  allowMultiple: boolean;
  subjectId: string;
  activeWordCloudId: string | null;
  questions: PublicSetQuestion[]; // only questions revealed so far (order <= active)
  students: import('@prisma/client').StudentOnSubject[]; // roster, STUDENTS_ONLY only
};

export type ResultsQuestion = {
  id: string;
  question: string;
  order: number;
  status: string;
  words: WordCount[];
  totalAnswers: number;
};

// Read-only payload for the public results-by-token endpoint. Deliberately
// excludes subjectId/schoolId/userId and answering config.
export type ResponseGetWordCloudSetResults = {
  title: string | null;
  status: string;
  activeWordCloudId: string | null;
  questions: ResultsQuestion[];
};
