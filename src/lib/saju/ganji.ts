import type {
  EarthlyBranch,
  FiveElement,
  HeavenlyStem,
  SajuPillar,
  YinYang,
} from "@/types/saju";

export interface StemInfo {
  id: HeavenlyStem;
  hanja: string;
  hangul: string;
  element: FiveElement;
  yinYang: YinYang;
}

export interface BranchInfo {
  id: EarthlyBranch;
  hanja: string;
  hangul: string;
  element: FiveElement;
  yinYang: YinYang;
  /** 12지 동물 (영문) */
  animal: string;
}

/** 천간(天干) — 갑(甲)부터 순서대로. 인덱스가 곧 60갑자 계산의 기준이다 */
export const HEAVENLY_STEMS = [
  { id: "gap", hanja: "甲", hangul: "갑", element: "wood", yinYang: "yang" },
  { id: "eul", hanja: "乙", hangul: "을", element: "wood", yinYang: "yin" },
  { id: "byeong", hanja: "丙", hangul: "병", element: "fire", yinYang: "yang" },
  { id: "jeong", hanja: "丁", hangul: "정", element: "fire", yinYang: "yin" },
  { id: "mu", hanja: "戊", hangul: "무", element: "earth", yinYang: "yang" },
  { id: "gi", hanja: "己", hangul: "기", element: "earth", yinYang: "yin" },
  {
    id: "gyeong",
    hanja: "庚",
    hangul: "경",
    element: "metal",
    yinYang: "yang",
  },
  { id: "sin", hanja: "辛", hangul: "신", element: "metal", yinYang: "yin" },
  { id: "im", hanja: "壬", hangul: "임", element: "water", yinYang: "yang" },
  { id: "gye", hanja: "癸", hangul: "계", element: "water", yinYang: "yin" },
] as const satisfies readonly StemInfo[];

/** 지지(地支) — 자(子)부터 순서대로 */
export const EARTHLY_BRANCHES = [
  {
    id: "ja",
    hanja: "子",
    hangul: "자",
    element: "water",
    yinYang: "yang",
    animal: "Rat",
  },
  {
    id: "chuk",
    hanja: "丑",
    hangul: "축",
    element: "earth",
    yinYang: "yin",
    animal: "Ox",
  },
  {
    id: "in",
    hanja: "寅",
    hangul: "인",
    element: "wood",
    yinYang: "yang",
    animal: "Tiger",
  },
  {
    id: "myo",
    hanja: "卯",
    hangul: "묘",
    element: "wood",
    yinYang: "yin",
    animal: "Rabbit",
  },
  {
    id: "jin",
    hanja: "辰",
    hangul: "진",
    element: "earth",
    yinYang: "yang",
    animal: "Dragon",
  },
  {
    id: "sa",
    hanja: "巳",
    hangul: "사",
    element: "fire",
    yinYang: "yin",
    animal: "Snake",
  },
  {
    id: "o",
    hanja: "午",
    hangul: "오",
    element: "fire",
    yinYang: "yang",
    animal: "Horse",
  },
  {
    id: "mi",
    hanja: "未",
    hangul: "미",
    element: "earth",
    yinYang: "yin",
    animal: "Goat",
  },
  {
    id: "sin",
    hanja: "申",
    hangul: "신",
    element: "metal",
    yinYang: "yang",
    animal: "Monkey",
  },
  {
    id: "yu",
    hanja: "酉",
    hangul: "유",
    element: "metal",
    yinYang: "yin",
    animal: "Rooster",
  },
  {
    id: "sul",
    hanja: "戌",
    hangul: "술",
    element: "earth",
    yinYang: "yang",
    animal: "Dog",
  },
  {
    id: "hae",
    hanja: "亥",
    hangul: "해",
    element: "water",
    yinYang: "yin",
    animal: "Pig",
  },
] as const satisfies readonly BranchInfo[];

export const mod = (value: number, base: number) =>
  ((value % base) + base) % base;

/** 천간·지지 인덱스로 기둥을 만든다 (두 인덱스의 홀짝이 같아야 실제 60갑자) */
export function makePillar(stemIndex: number, branchIndex: number): SajuPillar {
  const stem = HEAVENLY_STEMS[mod(stemIndex, 10)];
  const branch = EARTHLY_BRANCHES[mod(branchIndex, 12)];
  return {
    stem: stem.id,
    branch: branch.id,
    hanja: `${stem.hanja}${branch.hanja}`,
    hangul: `${stem.hangul}${branch.hangul}`,
  };
}

/** 60갑자 순번(0 = 甲子) → 기둥 */
export function pillarFromCycleIndex(index: number): SajuPillar {
  const cycle = mod(index, 60);
  return makePillar(cycle % 10, cycle % 12);
}

export function stemIndexOf(id: HeavenlyStem): number {
  return HEAVENLY_STEMS.findIndex((stem) => stem.id === id);
}

export function branchIndexOf(id: EarthlyBranch): number {
  return EARTHLY_BRANCHES.findIndex((branch) => branch.id === id);
}
