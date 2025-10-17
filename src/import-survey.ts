import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  try {
    const careers = await prisma.career.findMany();
    const skills = await prisma.skill.findMany();
    const file = Bun.file('../(2025) แบบสอบถามทักษะพื้นฐาน.xlsx - JAPS.json');
    const data = (await file.json()) as {
      'Career sector': string;
      Collaboration: string;
      'Critical Thinking': string;
      Creativity: string;
      Communication: string;
      'Social Skills': string;
      Leadership: string;
      'Digital Literacy': string;
    }[];

    const transformedData = data.flatMap<
      {
        'Career sector': string;
        skill: string;
        skillId: string;
        careerId: string;
        value: number;
        reference: string;
      }[]
    >((entry, index) => {
      // 1. Grab the 'Career sector' value, which will be repeated.
      const careerSector = entry['Career sector'];

      // 2. Get all keys *except* 'Career sector'. These are your skills.
      const skillKeys = Object.keys(entry).filter(
        (key) => key !== 'Career sector',
      );

      // 3. Map over the list of skill keys to create a new object for each one.
      //    flatMap will automatically merge all these new objects into one array.
      return skillKeys.map((skillName) => {
        return {
          'Career sector': careerSector,
          skill: skillName,
          skillId: skills.find((a) => a.title === skillName).id,
          careerId: careers.find((a) => a.title === careerSector).id,
          value: parseFloat(entry[skillName]), // Convert the string value to a number
          reference: index.toString(),
        };
      });
    });
    const create = await prisma.skillOnCareer.createMany({
      data: transformedData
        .flat()
        .map<Prisma.SkillOnCareerCreateManyInput>((list) => {
          return {
            skillId: list.skillId,
            weight: list.value,
            careerId: list.careerId,
            reference: list.reference,
          };
        }),
    });
    console.log(create);
  } catch (error) {
    console.error(error);
  }
};

main();
