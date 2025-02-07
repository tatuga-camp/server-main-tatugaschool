import { PrismaClient } from '@prisma/client';

const primsa = new PrismaClient();

const careerLists = [
  {
    name: 'Agriculture and natural resources careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 87.5 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 85.5,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 84.0 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 85.0 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 77.5,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.0 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 72.5 },
    ],
  },
  //   {
  //     name: 'Architecture and Construction careers',
  //     skills: [
  //       { name: 'Collaboration',id:"676286ec5782649b733b47d6", weight: 0 },
  //       { name: 'Critical Thinking', id:"676288195782649b733b47d7", weight: 0 },
  //       { name: 'Creativity', id:"676288405782649b733b47d8", weight: 0 },
  //       { name: 'Communication', id:"676288745782649b733b47d9", weight: 0 },
  //       { name: 'Digital Literacy', id:"6762889d5782649b733b47da", weight: 0 },
  //       { name: 'Social Skills',id:"676288e45782649b733b47db", weight: 0 },
  //       { name: 'Leadership', id:"676289095782649b733b47dc", weight: 0 },
  //     ],
  //   },
  {
    name: 'Business management, finance, and administration careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 86.3 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 80.9,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 81.1 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 87.2 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 85.6,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 89.7 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 84.7 },
    ],
  },
  {
    name: 'Education careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 82.0 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 77.3,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 79.1 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 77.1 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 79.8,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 79.9 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 78.0 },
    ],
  },
  {
    name: 'Arts, marketing, and communication careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 78.3 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 82.5,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 72.4 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 86.7 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 85.8,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 77.5 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 74.2 },
    ],
  },
  {
    name: 'Careers in health science',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 81.6 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 75.5,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 71.7 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 80.0 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 79.1,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 77.5 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 75.1 },
    ],
  },
  //   {
  //     name: 'Information technology careers',
  //     skills: [
  //       { name: 'Collaboration',id:"676286ec5782649b733b47d6", weight: 7 },
  //       { name: 'Critical Thinking', id:"676288195782649b733b47d7", weight: 9 },
  //       { name: 'Creativity', id:"676288405782649b733b47d8", weight: 8 },
  //       { name: 'Communication', id:"676288745782649b733b47d9", weight: 7 },
  //       { name: 'Digital Literacy', id:"6762889d5782649b733b47da", weight: 10 },
  //       { name: 'Social Skills',id:"676288e45782649b733b47db", weight: 6 },
  //       { name: 'Leadership', id:"676289095782649b733b47dc", weight: 7 },
  //     ],
  //   },
  {
    name: 'Careers in law and public safety careers',
    skills: [
      { name: 'Collaboration', id: '676286ec5782649b733b47d6', weight: 85.0 },
      {
        name: 'Critical Thinking',
        id: '676288195782649b733b47d7',
        weight: 84.2,
      },
      { name: 'Creativity', id: '676288405782649b733b47d8', weight: 83.2 },
      { name: 'Communication', id: '676288745782649b733b47d9', weight: 83.1 },
      {
        name: 'Digital Literacy',
        id: '6762889d5782649b733b47da',
        weight: 88.6,
      },
      { name: 'Social Skills', id: '676288e45782649b733b47db', weight: 83.3 },
      { name: 'Leadership', id: '676289095782649b733b47dc', weight: 83.9 },
    ],
  },
  //   {
  //     name: 'Science and engineering careers',
  //     skills: [
  //       { name: 'Collaboration',id:"676286ec5782649b733b47d6", weight: 8 },
  //       { name: 'Critical Thinking', id:"676288195782649b733b47d7", weight: 10 },
  //       { name: 'Creativity', id:"676288405782649b733b47d8", weight: 9 },
  //       { name: 'Communication', id:"676288745782649b733b47d9", weight: 7 },
  //       { name: 'Digital Literacy', id:"6762889d5782649b733b47da", weight: 9 },
  //       { name: 'Social Skills',id:"676288e45782649b733b47db", weight: 6 },
  //       { name: 'Leadership', id:"676289095782649b733b47dc", weight: 7 },
  //     ],
  //   },
];

async function testCareer() {
  for (const career of careerLists) {
    const create = await primsa.career.create({
      data: {
        title: career.name,
      },
    });

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
console.log(testCareer());
