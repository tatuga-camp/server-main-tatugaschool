import { PrismaClient } from '@prisma/client';

const primsa = new PrismaClient();

const careerLists = [
  {
    name: 'Agriculture and natural resources careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 79.92 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 80,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 80.92 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 80.63 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 79.47,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 80.68 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 79.57 },
    ],
  },
  {
    name: 'Architecture and Construction careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 85.62 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 86.56,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 85.72 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 85.42 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 85.55,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 87.16 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 85.62 },
    ],
  },
  {
    name: 'Business management, finance, and administration careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 81.87 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 80.48,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 80.16 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 79.59 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 82.24,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.23 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 80.75 },
    ],
  },
  {
    name: 'Education careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 79.4 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 74.97,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 77.45 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 78.84 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 82.28,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 80.09 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 74.21 },
    ],
  },
  {
    name: 'Arts, marketing, and communication careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 83.06 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 80.83,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 84.65 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 84.03 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 83.75,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.65 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 81.6 },
    ],
  },
  {
    name: 'Careers in health science',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 82.86 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 81.68,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 80.47 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 80.85 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 82.1,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.12 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 80.42 },
    ],
  },
  {
    name: 'Information technology careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 86.13 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 85.76,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 86.13 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 87.09 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 90.13,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 87.23 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 86.1 },
    ],
  },
  {
    name: 'Careers in law and public safety careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 82.57 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 81.65,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 82.45 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 81.11 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 83.33,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.41 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 81.61 },
    ],
  },
  {
    name: 'Science and engineering careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 80.06 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 79.05,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 79.85 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 78.82 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 80.16,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 81.74 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 77.1 },
    ],
  },
  {
    name: 'Hospitality and Tourism',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 81.69 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 81.21,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 79.88 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 80.69 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 82.15,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 82.94 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 79.06 },
    ],
  },
];

async function main() {
  for (const career of careerLists) {
    const create = await primsa.career.create({
      data: {
        title: career.name,
      },
    });

    console.log(create);

    for (const skill of career.skills) {
      const skillOnCarrer = await primsa.skillOnCareer.create({
        data: {
          skillId: skill.id,
          careerId: create.id,
          weight: skill.weight,
        },
      });
      console.log(skillOnCarrer);
    }
  }
}
main();
