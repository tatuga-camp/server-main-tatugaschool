import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, WordCloud, WordCloudSet } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

// publicResultsToken and wordCloudSetId are optional fields, so Prisma filters
// on them compile to `$expr`/`$ne: [field, "$$REMOVE"]` pipelines MongoDB
// cannot serve from the { publicResultsToken } / { wordCloudSetId } indexes.
// The hot lookups below (public results page) use findRaw with plain filters.

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawWordCloudSet = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  title?: string | null;
  status?: WordCloudSet['status'];
  accessMode?: WordCloudSet['accessMode'];
  allowMultiple?: boolean;
  activeWordCloudId?: RawObjectId | null;
  publicResultsToken?: string | null;
  subjectId: RawObjectId;
  schoolId: RawObjectId;
  userId: RawObjectId;
};

type RawWordCloud = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  question: string;
  status?: WordCloud['status'];
  accessMode?: WordCloud['accessMode'];
  allowMultiple?: boolean;
  subjectId: RawObjectId;
  schoolId: RawObjectId;
  userId: RawObjectId;
  wordCloudSetId?: RawObjectId | null;
  order?: RawInt | null;
};

// findRaw may emit ints as plain JSON numbers (relaxed EJSON) or as
// {$numberInt}/{$numberLong} (canonical EJSON) — handle both, like the dates.
type RawInt = number | { $numberInt?: string; $numberLong?: string };

function fromRawInt(raw: RawInt | null | undefined, fallback: number): number {
  if (raw == null) return fallback;
  if (typeof raw === 'number') return raw;
  const value = raw.$numberInt ?? raw.$numberLong;
  return value == null ? fallback : Number(value);
}

function fromRawDate(raw: RawDate): Date {
  return typeof raw.$date === 'string'
    ? new Date(raw.$date)
    : new Date(Number(raw.$date.$numberLong));
}

function fromRawWordCloudSet(doc: RawWordCloudSet): WordCloudSet {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    title: doc.title ?? null,
    status: doc.status ?? 'OPEN',
    accessMode: doc.accessMode ?? 'PUBLIC',
    allowMultiple: doc.allowMultiple ?? false,
    activeWordCloudId: doc.activeWordCloudId?.$oid ?? null,
    publicResultsToken: doc.publicResultsToken ?? null,
    subjectId: doc.subjectId.$oid,
    schoolId: doc.schoolId.$oid,
    userId: doc.userId.$oid,
  };
}

function fromRawWordCloud(doc: RawWordCloud): WordCloud {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    question: doc.question,
    status: doc.status ?? 'OPEN',
    accessMode: doc.accessMode ?? 'PUBLIC',
    allowMultiple: doc.allowMultiple ?? false,
    subjectId: doc.subjectId.$oid,
    schoolId: doc.schoolId.$oid,
    userId: doc.userId.$oid,
    wordCloudSetId: doc.wordCloudSetId?.$oid ?? null,
    order: fromRawInt(doc.order, 0),
  };
}

@Injectable()
export class WordCloudSetRepository {
  private logger = new Logger(WordCloudSetRepository.name);
  constructor(private prisma: PrismaService) {}

  private handle(error: unknown): never {
    this.logger.error(error);
    if (error instanceof PrismaClientKnownRequestError) {
      throw new InternalServerErrorException(
        `message: ${error.message} - codeError: ${error.code}`,
      );
    }
    throw error;
  }

  async create(request: Prisma.WordCloudSetCreateArgs): Promise<WordCloudSet> {
    try {
      return await this.prisma.wordCloudSet.create(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findMany(
    request: Prisma.WordCloudSetFindManyArgs,
  ): Promise<WordCloudSet[]> {
    try {
      return await this.prisma.wordCloudSet.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findUnique(
    request: Prisma.WordCloudSetFindUniqueArgs,
  ): Promise<WordCloudSet | null> {
    try {
      return await this.prisma.wordCloudSet.findUnique(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findFirst(
    request: Prisma.WordCloudSetFindFirstArgs,
  ): Promise<WordCloudSet | null> {
    try {
      return await this.prisma.wordCloudSet.findFirst(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async update(request: Prisma.WordCloudSetUpdateArgs): Promise<WordCloudSet> {
    try {
      return await this.prisma.wordCloudSet.update(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findSetByPublicResultsToken(
    token: string,
  ): Promise<WordCloudSet | null> {
    // A raw {publicResultsToken: null/undefined} filter would match sets whose
    // token was never issued (or, for undefined, any set at all) — never let a
    // falsy token through, independent of DTO validation.
    if (!token) {
      return null;
    }
    try {
      const docs = (await this.prisma.wordCloudSet.findRaw({
        filter: { publicResultsToken: token },
        options: { limit: 1 },
      })) as unknown as RawWordCloudSet[];
      return docs.length > 0 ? fromRawWordCloudSet(docs[0]) : null;
    } catch (error) {
      this.handle(error);
    }
  }

  async findQuestionsBySetId(setId: string): Promise<WordCloud[]> {
    try {
      const docs = (await this.prisma.wordCloud.findRaw({
        filter: { wordCloudSetId: { $oid: setId } },
        options: { sort: { order: 1 } },
      })) as unknown as RawWordCloud[];
      return docs.map(fromRawWordCloud);
    } catch (error) {
      this.handle(error);
    }
  }

  async updateQuestionsBySetId(
    setId: string,
    data: Partial<
      Pick<WordCloud, 'status' | 'accessMode' | 'allowMultiple'>
    >,
  ): Promise<void> {
    try {
      // The update command reports write errors in its reply instead of
      // throwing — surface them, or a failed cascade would look like success.
      const result = (await this.prisma.$runCommandRaw({
        update: 'WordCloud',
        updates: [
          {
            q: { wordCloudSetId: { $oid: setId } },
            u: {
              $set: {
                ...data,
                updateAt: { $date: new Date().toISOString() },
              },
            },
            multi: true,
          },
        ],
      })) as { ok?: number; writeErrors?: unknown[] };
      if (result.ok !== 1 || (result.writeErrors?.length ?? 0) > 0) {
        throw new InternalServerErrorException(
          `Failed to cascade question update for set ${setId}: ${JSON.stringify(
            result.writeErrors ?? result,
          )}`,
        );
      }
    } catch (error) {
      this.handle(error);
    }
  }

  async findUniqueQuestion(
    request: Prisma.WordCloudFindUniqueArgs,
  ): Promise<WordCloud | null> {
    try {
      return await this.prisma.wordCloud.findUnique(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async createQuestion(
    request: Prisma.WordCloudCreateArgs,
  ): Promise<WordCloud> {
    try {
      return await this.prisma.wordCloud.create(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async updateQuestion(
    request: Prisma.WordCloudUpdateArgs,
  ): Promise<WordCloud> {
    try {
      return await this.prisma.wordCloud.update(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async countAnswers(
    request: Prisma.WordCloudAnswerCountArgs,
  ): Promise<number> {
    try {
      return await this.prisma.wordCloudAnswer.count(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findManyAnswers(
    request: Prisma.WordCloudAnswerFindManyArgs,
  ): Promise<Prisma.WordCloudAnswerGetPayload<true>[]> {
    try {
      return await this.prisma.wordCloudAnswer.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  // Deletes a set: its questions' answers, then questions, then the set.
  async deleteSet(setId: string): Promise<WordCloudSet> {
    try {
      const questions = (await this.prisma.wordCloud.findRaw({
        filter: { wordCloudSetId: { $oid: setId } },
        options: { projection: { _id: 1 } },
      })) as unknown as { _id: RawObjectId }[];
      const ids = questions.map((q) => q._id.$oid);
      if (ids.length) {
        await this.prisma.wordCloudAnswer.deleteMany({
          where: { wordCloudId: { in: ids } },
        });
        await this.prisma.wordCloud.deleteMany({
          where: { id: { in: ids } },
        });
      }
      return await this.prisma.wordCloudSet.delete({ where: { id: setId } });
    } catch (error) {
      this.handle(error);
    }
  }

  // Deletes one question (and its answers) belonging to a set.
  async deleteQuestion(wordCloudId: string): Promise<WordCloud> {
    try {
      await this.prisma.wordCloudAnswer.deleteMany({
        where: { wordCloudId },
      });
      return await this.prisma.wordCloud.delete({ where: { id: wordCloudId } });
    } catch (error) {
      this.handle(error);
    }
  }
}
