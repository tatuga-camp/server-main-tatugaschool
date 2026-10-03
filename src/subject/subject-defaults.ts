type DefaultScore = {
  title: string;
  icon: string;
  blurHash: string;
  score: number;
};

export type TrackingTable = {
  title: string;
  description: string;
  statusLists: { title: string; value: number; color: string }[];
};

const ICONS = {
  goodJob: {
    icon: 'https://storage.tatugaschool.com/AVATAR/Good-job.webp',
    blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
  },
  wellDone: {
    icon: 'https://storage.tatugaschool.com/AVATAR/Well-Done.webp',
    blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
  },
  keepItUp: {
    icon: 'https://storage.tatugaschool.com/AVATAR/Keep-It-Up.webp',
    blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
  },
  excellent: {
    icon: 'https://storage.tatugaschool.com/AVATAR/Excellent.webp',
    blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
  },
  needsImprovement: {
    icon: 'https://storage.tatugaschool.com/AVATAR/Needs-Improvement.webp',
    blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
  },
};

const DEFAULT_SCORES: DefaultScore[] = [
  { title: 'Good Job', ...ICONS.goodJob, score: 1 },
  { title: 'Well Done', ...ICONS.wellDone, score: 1 },
  { title: 'Keep It Up', ...ICONS.keepItUp, score: 1 },
  { title: 'Excellent', ...ICONS.excellent, score: 1 },
  { title: 'Needs Improvement', ...ICONS.needsImprovement, score: -1 },
];

const THAI_DESIRABLE_CHARACTERISTICS: DefaultScore[] = [
  {
    title: 'รักชาติ ศาสน์ กษัตริย์',
    icon: 'https://storage.tatugaschool.com/AVATAR/Love-Nation-Religion-King.webp',
    blurHash: 'UJLpGu?90Cs;~dR-E3ob05R.xoWowQxVV|Ro',
  },
  {
    title: 'ซื่อสัตย์สุจริต',
    icon: 'https://storage.tatugaschool.com/AVATAR/Honesty.webp',
    blurHash: 'UKLpfV^J06tQ}-XlIqwv05RRt7Nd$zxCNLR-',
  },
  {
    title: 'มีวินัย',
    icon: 'https://storage.tatugaschool.com/AVATAR/Discipline.webp',
    blurHash: 'UDL:YP^r0B-q~b-pE4oZ07E3$|Nd=|osItN4',
  },
  {
    title: 'ใฝ่เรียนรู้',
    icon: 'https://storage.tatugaschool.com/AVATAR/Eager-To-Learn.webp',
    blurHash: 'UKLM?,~Q02^b=UROT3o$0EEOrqE4xaWYnhsk',
  },
  {
    title: 'อยู่อย่างพอเพียง',
    icon: 'https://storage.tatugaschool.com/AVATAR/Sufficiency.webp',
    blurHash: 'UFM6XZ^Q0AxV_AJO9vjc05Sh-nR+%1#rIvbF',
  },
  {
    title: 'มุ่งมั่นในการทำงาน',
    icon: 'https://storage.tatugaschool.com/AVATAR/Dedication.webp',
    blurHash: 'UKLpTA}~0A-X.N-7IsS}0AIpxWI[-TkRNJV_',
  },
  {
    title: 'รักความเป็นไทย',
    icon: 'https://storage.tatugaschool.com/AVATAR/Love-Of-Thainess.webp',
    blurHash: 'UML|09W@0BR+~KM|IYWC06n#s8j[-.o#Nfs.',
  },
  {
    title: 'มีจิตสาธารณะ',
    icon: 'https://storage.tatugaschool.com/AVATAR/Public-Mind.webp',
    blurHash: 'UGMY#r$~04xp?*k9I0e=05WWw|R-=LoLO+k8',
  },
].map((characteristic) => ({ ...characteristic, score: 1 }));

const DONE_COLOR = '#22c55e';
const NOT_DONE_COLOR = '#ef4444';

// Status values are summed per student, so "not done" is 0 and savings are worth their baht amount.
const PRIMARY_TRACKING_TABLES: TrackingTable[] = [
  {
    title: 'ตารางดื่มนม',
    description: 'บันทึกการดื่มนมของนักเรียน',
    statusLists: [
      { title: 'ดื่ม', value: 1, color: DONE_COLOR },
      { title: 'ไม่ดื่ม', value: 0, color: NOT_DONE_COLOR },
    ],
  },
  {
    title: 'ตารางแปรงฟัน',
    description: 'บันทึกการแปรงฟันของนักเรียน',
    statusLists: [
      { title: 'แปรงฟัน', value: 1, color: DONE_COLOR },
      { title: 'ไม่แปรงฟัน', value: 0, color: NOT_DONE_COLOR },
    ],
  },
  {
    title: 'ตารางเงินออม',
    description: 'บันทึกเงินออมของนักเรียน ยอดรวมแสดงเป็นบาท',
    statusLists: [
      { amount: 1, color: '#94a3b8' },
      { amount: 5, color: '#64748b' },
      { amount: 10, color: '#ca8a04' },
      { amount: 20, color: '#16a34a' },
      { amount: 50, color: '#2563eb' },
      { amount: 100, color: '#dc2626' },
    ].map(({ amount, color }) => ({
      title: `${amount} บาท`,
      value: amount,
      color,
    })),
  },
];

// Older schools typed their country as free text, so Thai spellings count too.
const THAILAND_NAMES = ['thailand', 'ประเทศไทย', 'ไทย'];

export const defaultScoresFor = (
  country: string | null | undefined,
): DefaultScore[] =>
  THAILAND_NAMES.includes(country?.trim().toLowerCase() ?? '')
    ? THAI_DESIRABLE_CHARACTERISTICS
    : DEFAULT_SCORES;

export const trackingTablesFor = (level: string): TrackingTable[] =>
  /primary|ประถมศึกษา/i.test(level) ? PRIMARY_TRACKING_TABLES : [];
