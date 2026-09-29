import type { SealShape } from "./types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SealFrame =
  | {
      shape: "square";
      /** 테두리 바깥 가장자리 */
      outer: Rect;
      cornerRadius: number;
      borderWidth: number;
    }
  | {
      shape: "circle";
      cx: number;
      cy: number;
      /** 테두리 바깥 반지름 */
      radius: number;
      borderWidth: number;
    };

export interface SealLayout {
  size: number;
  frame: SealFrame;
  /** 글자 칸 — 새기는(읽는) 순서: 오른쪽 열부터 위→아래 */
  cells: Rect[];
}

/** 도장 한 변(size) 대비 비율 */
export const SEAL_PROPORTIONS = {
  /** 캔버스 가장자리 여백 — 테두리 안티앨리어싱·마모 표현이 잘리지 않게 */
  margin: 0.03,
  borderWidth: { square: 0.058, circle: 0.052 },
  cornerRadius: 0.045,
  /** 테두리 안쪽과 글자 사이 */
  padding: 0.045,
  /** 글자 칸 사이 */
  gutter: 0.03,
} as const;

/**
 * 원형 도장에서 글자 영역(정사각형)의 반변 — 내접 정사각형(1/√2≈0.707)보다 살짝 크게 잡는다.
 * 모서리가 글자 반지름을 조금 넘지만 테두리 안쪽 여백(padding) 안에 머문다.
 */
const CIRCLE_SQUARE_HALF = 0.745;
/** 원형 도장 2자 배치: 두 열의 전체 폭(반지름 대비 반폭) — 높이는 원의 현(弦)으로 결정 */
const CIRCLE_TWO_COLUMN_HALF_WIDTH = 0.8;

/**
 * 글자 수에 맞춘 전통 인장 배치를 계산한다.
 *
 * - 1자: 한 칸 가득
 * - 2자: 두 열 (오른쪽 → 왼쪽), 글자가 세로로 길어지는 인장 특유의 비례
 * - 3자: 오른쪽 열에 성(姓)을 크게, 왼쪽 열에 이름 두 자를 위아래로
 * - 4자: 2×2 — 오른쪽 열 위·아래, 왼쪽 열 위·아래 순
 */
export function computeSealLayout(
  shape: SealShape,
  size: number,
  count: number,
): SealLayout {
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new RangeError(
      `A seal holds 1–4 characters (received ${String(count)}).`,
    );
  }

  const margin = size * SEAL_PROPORTIONS.margin;
  const borderWidth = size * SEAL_PROPORTIONS.borderWidth[shape];
  const padding = size * SEAL_PROPORTIONS.padding;
  const gutter = size * SEAL_PROPORTIONS.gutter;

  if (shape === "square") {
    const inset = margin + borderWidth + padding;
    const box = {
      x: inset,
      y: inset,
      width: size - inset * 2,
      height: size - inset * 2,
    };
    return {
      size,
      frame: {
        shape,
        outer: {
          x: margin,
          y: margin,
          width: size - margin * 2,
          height: size - margin * 2,
        },
        cornerRadius: size * SEAL_PROPORTIONS.cornerRadius,
        borderWidth,
      },
      cells: splitIntoCells(box, count, gutter),
    };
  }

  const center = size / 2;
  const radius = center - margin;
  const textRadius = radius - borderWidth - padding;
  const box =
    count === 2
      ? twoColumnBoxInCircle(center, textRadius)
      : squareBoxInCircle(center, textRadius);

  return {
    size,
    frame: { shape, cx: center, cy: center, radius, borderWidth },
    cells: splitIntoCells(box, count, gutter),
  };
}

function squareBoxInCircle(center: number, textRadius: number): Rect {
  const half = textRadius * CIRCLE_SQUARE_HALF;
  return {
    x: center - half,
    y: center - half,
    width: half * 2,
    height: half * 2,
  };
}

/** 두 열의 바깥 모서리가 원 위에 오도록 높이를 정한다: h/2 = √(r² − w²) */
function twoColumnBoxInCircle(center: number, textRadius: number): Rect {
  const halfWidth = textRadius * CIRCLE_TWO_COLUMN_HALF_WIDTH;
  const halfHeight = Math.sqrt(textRadius ** 2 - halfWidth ** 2);
  return {
    x: center - halfWidth,
    y: center - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
}

/** 세로쓰기 전통 배치 — 오른쪽 열부터 위→아래로 채운다 */
function splitIntoCells(box: Rect, count: number, gutter: number): Rect[] {
  if (count === 1) return [box];

  const columnWidth = (box.width - gutter) / 2;
  const rowHeight = (box.height - gutter) / 2;
  const rightX = box.x + columnWidth + gutter;
  const leftX = box.x;
  const topY = box.y;
  const bottomY = box.y + rowHeight + gutter;

  const tallRight = {
    x: rightX,
    y: topY,
    width: columnWidth,
    height: box.height,
  };
  const quarter = (x: number, y: number): Rect => ({
    x,
    y,
    width: columnWidth,
    height: rowHeight,
  });

  if (count === 2) {
    return [tallRight, { ...tallRight, x: leftX }];
  }
  if (count === 3) {
    return [tallRight, quarter(leftX, topY), quarter(leftX, bottomY)];
  }
  return [
    quarter(rightX, topY),
    quarter(rightX, bottomY),
    quarter(leftX, topY),
    quarter(leftX, bottomY),
  ];
}
