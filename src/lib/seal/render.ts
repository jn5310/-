import { computeSealLayout, type Rect, type SealLayout } from "./layout";
import { createRandom, hashString } from "./random";
import type { SealRenderOptions } from "./types";

type Context2D = CanvasRenderingContext2D;

/** 글리프 잉크 경계를 잴 기준 글자 크기 — 칸에 맞출 때 배율로 확대·축소한다 */
const REFERENCE_FONT_SIZE = 200;
/** 칸을 채울 때 허용하는 가로·세로 배율 차이의 상한 (과도한 찌그러짐 방지) */
const MAX_ANISOTROPY = 2.1;

/**
 * 투명 배경 캔버스에 전통 인장을 그린다.
 * 캔버스 크기를 options.size로 맞추므로 기존 그림은 지워진다.
 *
 * @param characters parseSealText()로 검증한 1–4개의 한글 음절
 */
export function renderKoreanSeal(
  canvas: HTMLCanvasElement,
  characters: readonly string[],
  options: SealRenderOptions,
): SealLayout {
  const { shape, size, color, texture } = options;

  canvas.width = size;
  canvas.height = size;
  const ctx = getContext(canvas);
  const layout = computeSealLayout(shape, size, characters.length);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  drawFrame(ctx, layout);
  drawCharacters(ctx, characters, layout, options);

  if (texture) {
    applyInkTexture(ctx, layout, hashString(`${characters.join("")}|${shape}`));
  }

  return layout;
}

/** 도장을 지워 투명한 빈 캔버스로 되돌린다 */
export function clearSealCanvas(canvas: HTMLCanvasElement): void {
  canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}

function getContext(canvas: HTMLCanvasElement): Context2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported in this browser.");
  return ctx;
}

// ─── 테두리 ─────────────────────────────────────────────────

function drawFrame(ctx: Context2D, { frame }: SealLayout) {
  ctx.beginPath();

  if (frame.shape === "square") {
    const { outer, cornerRadius, borderWidth } = frame;
    addRoundedRect(ctx, outer, cornerRadius);
    addRoundedRect(
      ctx,
      {
        x: outer.x + borderWidth,
        y: outer.y + borderWidth,
        width: outer.width - borderWidth * 2,
        height: outer.height - borderWidth * 2,
      },
      // 안쪽 모서리는 조각칼 자국처럼 거의 각지게
      Math.max(cornerRadius - borderWidth, cornerRadius * 0.3),
    );
  } else {
    const { cx, cy, radius, borderWidth } = frame;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.moveTo(cx + radius - borderWidth, cy);
    ctx.arc(cx, cy, radius - borderWidth, 0, Math.PI * 2);
  }

  // 바깥 윤곽과 안쪽 윤곽 사이만 칠해 고리(링) 모양 테두리를 만든다
  ctx.fill("evenodd");
}

function addRoundedRect(ctx: Context2D, rect: Rect, radius: number) {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(right, rect.y, right, bottom, r);
  ctx.arcTo(right, bottom, rect.x, bottom, r);
  ctx.arcTo(rect.x, bottom, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, right, rect.y, r);
  ctx.closePath();
}

// ─── 글자 ──────────────────────────────────────────────────

function drawCharacters(
  ctx: Context2D,
  characters: readonly string[],
  layout: SealLayout,
  { color, font, size }: SealRenderOptions,
) {
  const spread = Math.max(0, (font.inkSpread ?? 0) * size);
  // 번짐을 줄 때는 글자를 별도 레이어에 그린 뒤 여러 방향으로 겹쳐 찍는다
  const layer = spread > 0 ? createLayer(size) : null;
  const target = layer ?? ctx;

  target.fillStyle = color;
  target.textAlign = "left";
  target.textBaseline = "alphabetic";
  target.font = `${font.weight} ${REFERENCE_FONT_SIZE}px ${font.family}`;

  characters.forEach((character, index) => {
    fitGlyph(target, character, layout.cells[index]);
  });

  if (layer) stampWithSpread(ctx, layer.canvas, layout.cells, spread);
}

/**
 * 글리프의 실제 잉크 경계(actualBoundingBox)를 칸에 꽉 차게 늘린다.
 * 인장은 글자가 면을 채우는 것이 특징이라 가로·세로를 따로 맞추되, 비율 차이는 MAX_ANISOTROPY로 제한한다.
 */
function fitGlyph(ctx: Context2D, character: string, cell: Rect) {
  const metrics = ctx.measureText(character);
  const left = metrics.actualBoundingBoxLeft;
  const right = metrics.actualBoundingBoxRight;
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const inkWidth = left + right;
  const inkHeight = ascent + descent;
  if (!(inkWidth > 0 && inkHeight > 0)) return;

  let scaleX = cell.width / inkWidth;
  let scaleY = cell.height / inkHeight;
  if (scaleY / scaleX > MAX_ANISOTROPY) scaleY = scaleX * MAX_ANISOTROPY;
  else if (scaleX / scaleY > MAX_ANISOTROPY) scaleX = scaleY * MAX_ANISOTROPY;

  ctx.save();
  ctx.translate(cell.x + cell.width / 2, cell.y + cell.height / 2);
  ctx.scale(scaleX, scaleY);
  // 잉크 경계의 중심이 칸의 중심에 오도록 기준점을 옮겨 찍는다
  ctx.fillText(character, (left - right) / 2, (ascent - descent) / 2);
  ctx.restore();
}

function createLayer(size: number): Context2D {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return getContext(canvas);
}

/** 레이어를 원형으로 조금씩 밀어 여러 번 찍어 획을 모든 방향으로 고르게 두껍게 한다 (형태학적 팽창) */
function stampWithSpread(
  ctx: Context2D,
  layer: HTMLCanvasElement,
  cells: readonly Rect[],
  spread: number,
) {
  const bounds = expand(unionRect(cells), spread * 2);
  const offsets: [number, number][] = [[0, 0]];
  const steps = 12;
  for (const radius of [spread, spread * 0.5]) {
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * Math.PI * 2;
      offsets.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }

  for (const [dx, dy] of offsets) {
    ctx.drawImage(
      layer,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      bounds.x + dx,
      bounds.y + dy,
      bounds.width,
      bounds.height,
    );
  }
}

function unionRect(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

function expand(rect: Rect, by: number): Rect {
  return {
    x: Math.max(0, rect.x - by),
    y: Math.max(0, rect.y - by),
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

// ─── 인주 질감 ──────────────────────────────────────────────

/**
 * 실제로 찍은 도장처럼 잉크를 조금씩 덜어 낸다 (destination-out).
 * 시드가 같으면 결과도 같다 — 미리보기와 다운로드 파일이 항상 일치한다.
 */
function applyInkTexture(ctx: Context2D, layout: SealLayout, seed: number) {
  const { size } = layout;
  const random = createRandom(seed);

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  // 1) 농담 얼룩 — 인주가 덜 묻어 살짝 옅어진 넓은 부분 (선명함을 해치지 않을 만큼만)
  for (let index = 0; index < 5; index++) {
    const x = random() * size;
    const y = random() * size;
    const radius = size * (0.07 + random() * 0.13);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${0.05 + random() * 0.08})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // 2) 잉크 반점 — 종이 결 때문에 비어 보이는 작은 점
  ctx.fillStyle = "#000";
  for (let index = 0; index < 700; index++) {
    const x = random() * size;
    const y = random() * size;
    const radius = size * (0.0006 + 0.0034 * random() ** 3);
    ctx.globalAlpha = 0.3 + random() * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) 테두리 마모 — 바깥 가장자리가 군데군데 살짝 뜯긴 자국
  for (let index = 0; index < 36; index++) {
    const [x, y] = pointOnFrameEdge(layout, random(), random() - 0.5);
    const radius = size * (0.003 + random() * 0.009);
    ctx.globalAlpha = 0.55 + random() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 테두리 바깥선 위의 한 점 (t: 둘레 위치 0–1, jitter: 안팎으로 흔들림 −0.5–0.5) */
function pointOnFrameEdge(
  { frame, size }: SealLayout,
  t: number,
  jitter: number,
): [number, number] {
  const offset = jitter * size * 0.008;

  if (frame.shape === "circle") {
    const angle = t * Math.PI * 2;
    const radius = frame.radius + offset;
    return [
      frame.cx + Math.cos(angle) * radius,
      frame.cy + Math.sin(angle) * radius,
    ];
  }

  const { outer } = frame;
  const side = Math.floor(t * 4);
  const along = (t * 4) % 1;
  if (side === 0) return [outer.x + along * outer.width, outer.y - offset];
  if (side === 1) {
    return [outer.x + outer.width + offset, outer.y + along * outer.height];
  }
  if (side === 2) {
    return [outer.x + along * outer.width, outer.y + outer.height + offset];
  }
  return [outer.x - offset, outer.y + along * outer.height];
}
