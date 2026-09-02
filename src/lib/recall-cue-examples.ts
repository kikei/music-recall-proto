// Example cues shown as the recall input's placeholder. Picked at random on
// each mount so the sidebar feels alive rather than static; entries with an
// hour range lean toward showing up at a matching time of day, but always
// share the pool with the time-agnostic ones so there is no dead time slot.

interface CueExample {
  text: string;
  // [start, end) in local hours, 0-23. Wraps past midnight when start > end
  // (e.g. 22-4 for late night). Omitted entirely means "any time".
  hours?: [number, number];
}

const EXAMPLES: CueExample[] = [
  { text: '雨上がりの匂い' },
  { text: '走り出したくなる感じ' },
  { text: 'ふと立ち止まった瞬間' },
  { text: '朝の静けさ', hours: [5, 10] },
  { text: '通勤電車の窓の外', hours: [6, 10] },
  { text: '窓を開けたときの風', hours: [6, 11] },
  { text: 'カフェのざわめき', hours: [11, 17] },
  { text: '夏の終わりの寂しさ', hours: [16, 20] },
  { text: '誰かと騒いでいた記憶', hours: [19, 24] },
  { text: '深夜のコンビニの明かり', hours: [22, 4] },
];

function matchesHour(example: CueExample, hour: number): boolean {
  if (!example.hours) return true;
  const [start, end] = example.hours;
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function pickCueExample(now: Date = new Date()): string {
  const hour = now.getHours();
  const matching = EXAMPLES.filter(e => matchesHour(e, hour));
  const pool = matching.length > 0 ? matching : EXAMPLES;
  return pool[Math.floor(Math.random() * pool.length)].text;
}
