import { createRandom, hashString } from "@/lib/seal/random";

/*
 * 증명서 디자인 값 — 벡터(react-pdf)와 캔버스(대체) 렌더러가 함께 쓴다.
 * 좌표는 모두 pt(1/72인치), A4 가로 기준이다. 경로는 SVG path 문자열이라
 * react-pdf <Path d>와 캔버스 new Path2D(d)에 그대로 넣을 수 있다.
 */

/** A4 가로 (pt) */
export const PAGE_SIZE = { width: 841.89, height: 595.28 } as const;

export const CERTIFICATE_COLORS = {
  paper: "#f4ecdb",
  paperEdge: "#e9dcc2",
  ink: "#1e1b18",
  inkSoft: "#4b443c",
  inkMuted: "#756b5f",
  vermilion: "#b3372b",
  ochre: "#82601f",
  fiber: "#8a7552",
  hanji: "#f6f1e7",
  rule: "#d9ccb4",
  cell: "#f8f2e6",
} as const;

/** 색동 — 머리글 위 짧은 띠 */
export const SAEKDONG_COLORS = [
  "#c8423a",
  "#e2b33c",
  "#3f8a5a",
  "#2f5d9a",
  "#f3eee4",
  "#d67a9c",
] as const;

/** 테두리 위치 (페이지 가장자리에서 pt) */
export const FRAME = {
  outer: 16,
  outerThin: 21,
  bandOuter: 26,
  band: 12,
  inner: 43,
  innerThin: 46,
} as const;

/** 번개무늬 띠의 네 모서리에 놓는 亞자 장식의 왼쪽 위 좌표 */
export function cornerOrnamentOrigins(): [number, number][] {
  const { width: W, height: H } = PAGE_SIZE;
  const { bandOuter, band } = FRAME;
  const far = bandOuter + band;
  return [
    [bandOuter, bandOuter],
    [W - far, bandOuter],
    [bandOuter, H - far],
    [W - far, H - far],
  ];
}

/**
 * 번개무늬(回紋) 띠 — 네 변을 따라 네모 소용돌이를 줄지어 세우고 안쪽에 받침선을 긋는다.
 * 변마다 (u: 변을 따라, v: 바깥 → 안쪽) 좌표를 페이지 좌표로 옮겨 하나의 경로로 만든다.
 */
export function meanderPath(): string {
  const { width: W, height: H } = PAGE_SIZE;
  const { bandOuter, band } = FRAME;
  const start = bandOuter + band; // 모서리 장식 다음부터
  const edges = [
    {
      length: W - start * 2,
      map: (u: number, v: number) => [start + u, bandOuter + v],
    },
    {
      length: W - start * 2,
      map: (u: number, v: number) => [start + u, H - bandOuter - v],
    },
    {
      length: H - start * 2,
      map: (u: number, v: number) => [bandOuter + v, start + u],
    },
    {
      length: H - start * 2,
      map: (u: number, v: number) => [W - bandOuter - v, start + u],
    },
  ];

  // 한 칸(12pt) 안의 소용돌이: 받침선에서 올라가 안으로 세 번 꺾인다 (폭 9pt + 틈 3pt)
  const spiral: [number, number][] = [
    [0, 12],
    [0, 0],
    [9, 0],
    [9, 9],
    [3, 9],
    [3, 3],
    [6, 3],
    [6, 6],
  ];

  const commands: string[] = [];
  for (const edge of edges) {
    const count = Math.floor(edge.length / band);
    const offset = (edge.length - count * band) / 2;
    const point = (u: number, v: number) => edge.map(u, v).map(round).join(" ");

    commands.push(`M${point(0, band)} L${point(edge.length, band)}`);
    for (let index = 0; index < count; index++) {
      const u0 = offset + index * band + 1.5;
      commands.push(
        spiral
          .map(
            ([u, v], step) =>
              `${step === 0 ? "M" : "L"}${point(u0 + u, (v * band) / 12)}`,
          )
          .join(" "),
      );
    }
  }
  return commands.join(" ");
}

/** 한지 섬유 — 증명서 ID로 고정한 무작위 곡선이라 같은 증명서는 늘 같은 결이 나온다 */
export function paperFiberPath(seed: string, count = 180): string {
  const { width: W, height: H } = PAGE_SIZE;
  const random = createRandom(hashString(seed));
  const fibers: string[] = [];
  for (let index = 0; index < count; index++) {
    const x = random() * W;
    const y = random() * H;
    const length = 5 + random() * 20;
    const angle = random() * Math.PI;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    const bend = (random() - 0.5) * 6;
    fibers.push(
      `M${round(x)} ${round(y)} Q${round(x + dx / 2 + bend)} ${round(y + dy / 2 - bend)} ${round(x + dx)} ${round(y + dy)}`,
    );
  }
  return fibers.join(" ");
}

/** 영문 본명 글자 크기 — 긴 이름도 한 줄(폭 540pt)에 들어가게 줄인다 */
export function englishNameFontSize(name: string): number {
  const length = Math.max(1, Array.from(name).length);
  // 세리프 라틴 글자의 평균 폭 ≈ 글자 크기 × 0.56
  return Math.max(
    14,
    Math.min(25, Math.floor((540 / (0.56 * length)) * 10) / 10),
  );
}

const round = (value: number) => Math.round(value * 100) / 100;
