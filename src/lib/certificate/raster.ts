import {
  loadSealFont,
  parseSealText,
  renderKoreanSeal,
  SEAL_INK_COLOR,
} from "@/lib/seal";

import {
  collectCertificateCharacters,
  type CertificateContent,
  type CertificateInput,
} from "./content";
import {
  CERTIFICATE_COLORS as COLORS,
  cornerOrnamentOrigins,
  englishNameFontSize,
  FRAME,
  meanderPath,
  PAGE_SIZE,
  paperFiberPath,
  SAEKDONG_COLORS,
} from "./design";
import { createJpegPdf } from "./pdf";

/*
 * 대체 렌더러 — 캔버스에 증명서를 그려 JPEG 한 장짜리 PDF로 만든다.
 * 벡터(react-pdf) 방식이 폰트 서버 문제 등으로 실패했을 때 쓴다.
 * 글꼴은 페이지가 이미 쓰는 Noto Serif KR · Noto Sans KR(next/font)을 쓰므로 따로 받을 파일이 없다.
 * 벡터 레이아웃과 같은 pt 좌표로 그리고 200dpi로 확대한다(2339 × 1654px).
 */

const DPI = 200;
const SCALE = DPI / 72;
const JPEG_QUALITY = 0.92;

const W = PAGE_SIZE.width;
const H = PAGE_SIZE.height;

interface PageFonts {
  serif: string;
  sans: string;
}

type Context2D = CanvasRenderingContext2D & { letterSpacing?: string };

export async function createRasterCertificatePdf(
  content: CertificateContent,
  seal: CertificateInput["seal"],
): Promise<Blob> {
  const fonts = resolvePageFonts();
  const characters = collectCertificateCharacters(content);
  await Promise.all([
    loadSealFont({ family: fonts.serif, weight: 400 }, characters),
    loadSealFont({ family: fonts.serif, weight: 700 }, characters),
    loadSealFont({ family: fonts.sans, weight: 400 }, characters),
    loadSealFont({ family: fonts.sans, weight: 700 }, characters),
    loadSealFont(seal.font, content.hangul),
  ]);

  const canvas = document.createElement("canvas");
  renderRasterCertificate(canvas, content, seal, fonts);

  const pdf = createJpegPdf({
    jpeg: await canvasToJpeg(canvas),
    widthPx: canvas.width,
    heightPx: canvas.height,
    pageWidthPt: W,
    pageHeightPt: H,
    title: `${content.text.title} — ${content.romanization}`,
    author: content.text.issuer,
    subject: `${content.hangul} (${content.hanja}) · ${content.englishName}`,
  });
  return new Blob([pdf], { type: "application/pdf" });
}

/**
 * next/font가 <html>에 심어 둔 CSS 변수에서 실제 글꼴 이름을 읽는다.
 * 캔버스는 var(--…)를 해석하지 못하기 때문이다. 값이 없으면 시스템 글꼴로 그린다.
 */
export function resolvePageFonts(): PageFonts {
  const style = getComputedStyle(document.documentElement);
  const serif = style.getPropertyValue("--font-noto-serif-kr").trim();
  const sans = style.getPropertyValue("--font-noto-sans-kr").trim();
  return {
    serif: serif ? `${serif}, serif` : "serif",
    sans: sans ? `${sans}, sans-serif` : "sans-serif",
  };
}

export function renderRasterCertificate(
  canvas: HTMLCanvasElement,
  content: CertificateContent,
  seal: CertificateInput["seal"],
  fonts: PageFonts,
): void {
  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(H * SCALE);
  const ctx = canvas.getContext("2d") as Context2D | null;
  if (!ctx) throw new Error("Canvas 2D is not supported in this browser.");
  ctx.scale(SCALE, SCALE); // 이제부터 pt 단위로 그린다

  const t = content.text;
  const serif = (weight: number, size: number) =>
    `${weight} ${size}px ${fonts.serif}`;
  const sans = (weight: number, size: number) =>
    `${weight} ${size}px ${fonts.sans}`;

  drawPaper(ctx, content.certificateId);
  drawWatermark(ctx, t.watermark, serif(700, 300));
  drawFrame(ctx);

  // ── 머리글 (벡터 레이아웃과 같은 흐름으로 위에서부터 쌓는다) ──
  const center = W / 2;
  let y = 56 + 6;
  SAEKDONG_COLORS.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(center - 66 + index * 22, y, 22, 3);
  });
  y += 3 + 8;
  drawEmblem(ctx, t.emblem, center, y + 12, serif(700, 14));
  y += 24;

  y = line(ctx, t.title, center, y + 7, 21 * 1.2, {
    font: serif(700, 21),
    color: COLORS.ink,
    spacing: 0.6,
  });
  y = line(ctx, t.subtitle, center, y + 1, 10.5 * 1.3, {
    font: serif(700, 10.5),
    color: COLORS.vermilion,
    spacing: 3,
  });
  drawDivider(ctx, center, y + 7 + 5);
  y += 7 + 10;

  // ── 영문 본명 → 한국 이름 ──
  y = line(ctx, t.certifies, center, y + 6, 9 * 1.3, {
    font: sans(400, 9),
    color: COLORS.inkSoft,
    spacing: 0.5,
  });
  const nameSize = englishNameFontSize(content.englishName);
  y = line(ctx, content.englishName, center, y + 2, nameSize * 1.2, {
    font: serif(700, nameSize),
    color: COLORS.ink,
    maxWidth: W - 144,
  });
  y = line(ctx, t.bestowed, center, y + 6, 9 * 1.3, {
    font: sans(400, 9),
    color: COLORS.inkSoft,
    spacing: 0.5,
  });
  y = line(ctx, content.hangul, center, y + 3, 48 * 1.12, {
    font: serif(700, 48),
    color: COLORS.ink,
    spacing: 6,
  });
  y = line(ctx, content.hanja, center, y, 17 * 1.25, {
    font: serif(400, 17),
    color: COLORS.inkSoft,
    spacing: 5,
  });
  y = line(ctx, content.romanization, center, y + 1, 12 * 1.3, {
    font: serif(400, 12),
    color: COLORS.inkMuted,
    spacing: 0.8,
  });

  ctx.font = serif(400, 9.5);
  const summaryLines = wrapLines(ctx, `“${content.summary}”`, 470, 2);
  y += 4;
  for (const summaryLine of summaryLines) {
    y = line(ctx, summaryLine, center, y, 9.5 * 1.35, {
      font: serif(400, 9.5),
      color: COLORS.ink,
    });
  }

  // ── 한자 풀이 · 사주 요약 ──
  const columnTop = y + 10;
  drawHanjaPanel(ctx, content, 72, columnTop, serif, sans);
  drawSajuPanel(ctx, content, W - 72 - 320, columnTop, serif, sans);

  // ── 발급 정보 · 발급처 ──
  let footerY = H - 62 - 46.8;
  const left = 72;
  footerY = line(ctx, t.issuedLabel.toUpperCase(), left, footerY, 6 * 1.2, {
    font: sans(700, 6),
    color: COLORS.inkMuted,
    spacing: 1.4,
    align: "left",
  });
  footerY = line(ctx, content.issuedOn, left, footerY + 1, 10 * 1.25, {
    font: serif(400, 10),
    color: COLORS.ink,
    align: "left",
  });
  footerY = line(ctx, t.idLabel.toUpperCase(), left, footerY + 6, 6 * 1.2, {
    font: sans(700, 6),
    color: COLORS.inkMuted,
    spacing: 1.4,
    align: "left",
  });
  line(ctx, content.certificateId, left, footerY + 1, 9.5 * 1.25, {
    font: serif(700, 9.5),
    color: COLORS.ink,
    spacing: 0.8,
    align: "left",
  });

  const signatureCenter = (72 + (W - 72)) / 2;
  let signatureY = H - 62 - 28.8;
  signatureY = line(ctx, t.issuer, signatureCenter, signatureY, 12 * 1.2, {
    font: serif(700, 12),
    color: COLORS.ink,
  });
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillRect(signatureCenter - 75, signatureY + 3, 150, 0.6);
  line(
    ctx,
    `${t.issuedBy} ${t.issuer} ${t.separator} ${t.issuerKo}`,
    signatureCenter,
    signatureY + 6.6,
    6.5 * 1.2,
    { font: sans(400, 6.5), color: COLORS.inkMuted, spacing: 0.4 },
  );

  drawSeal(ctx, content.hangul, seal, {
    x: W - 80 - 66,
    y: H - 50 - 66,
    size: 66,
  });

  line(ctx, t.disclaimer, center, H - 49 - 6.6, 5.5 * 1.2, {
    font: sans(400, 5.5),
    color: COLORS.inkMuted,
    spacing: 0.3,
  });
}

// ─── 영역 ────────────────────────────────────────────────────

type FontSpec = (weight: number, size: number) => string;

function drawHanjaPanel(
  ctx: Context2D,
  content: CertificateContent,
  x: number,
  top: number,
  serif: FontSpec,
  sans: FontSpec,
) {
  const t = content.text;
  let y = panelHeading(
    ctx,
    x,
    top,
    t.hanjaHeading,
    t.hanjaHeadingKo,
    serif,
    sans,
  );
  const rowHeight = 18.3;
  for (const character of content.characters) {
    const middle = y + rowHeight / 2;
    text(ctx, character.hanja, x, middle, {
      font: serif(700, 13),
      color: COLORS.ink,
      align: "left",
    });
    text(ctx, character.hangul, x + 22, middle, {
      font: serif(400, 9),
      color: COLORS.inkSoft,
      align: "left",
    });
    const meaning = character.isSurname
      ? `${character.meaning}  (${t.surnameLabel})`
      : character.meaning;
    text(ctx, meaning, x + 40, middle, {
      font: sans(400, 8.5),
      color: COLORS.ink,
      align: "left",
      maxWidth: 320 - 40 - 68,
    });
    text(ctx, character.element, x + 320, middle, {
      font: sans(400, 7.5),
      color: COLORS.inkMuted,
      align: "right",
    });
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(x, y + rowHeight - 0.3, 320, 0.3);
    y += rowHeight;
  }
}

function drawSajuPanel(
  ctx: Context2D,
  content: CertificateContent,
  x: number,
  top: number,
  serif: FontSpec,
  sans: FontSpec,
) {
  const t = content.text;
  let y = panelHeading(
    ctx,
    x,
    top,
    t.sajuHeading,
    t.sajuHeadingKo,
    serif,
    sans,
  );

  const cellHeight = 33.4;
  content.pillars.forEach((pillar, index) => {
    const left = x + index * 56;
    ctx.fillStyle = COLORS.cell;
    ctx.strokeStyle = COLORS.rule;
    ctx.lineWidth = 0.4;
    roundedRect(ctx, left, y, 50, cellHeight, 3);
    ctx.fill();
    ctx.stroke();
    const middle = left + 25;
    text(
      ctx,
      `${pillar.label.toUpperCase()} ${pillar.labelHanja}`,
      middle,
      y + 2.4 + 3.3,
      { font: sans(400, 5.5), color: COLORS.inkMuted, spacing: 0.6 },
    );
    text(ctx, pillar.hanja ?? t.missing, middle, y + 2.4 + 6.6 + 1 + 7.2, {
      font: serif(pillar.hanja ? 700 : 400, 12),
      color: pillar.hanja ? COLORS.ink : COLORS.inkMuted,
    });
    text(
      ctx,
      pillar.hangul ?? t.hourUnknown,
      middle,
      y + cellHeight - 2.4 - 3.3,
      { font: sans(400, 5.5), color: COLORS.inkMuted },
    );
  });
  y += cellHeight + 4;

  const facts: [string, string][] = [
    [t.dayMasterLabel, content.dayMaster],
    ...(content.favorable
      ? [[t.favorableLabel, content.favorable] as [string, string]]
      : []),
    [t.balanceLabel, content.balance],
  ];
  for (const [label, value] of facts) {
    const middle = y + 1.5 + 4.9;
    text(ctx, label, x, middle, {
      font: sans(400, 7),
      color: COLORS.inkMuted,
      align: "left",
    });
    text(ctx, value, x + 64, middle, {
      font: sans(400, 7.5),
      color: COLORS.ink,
      align: "left",
      maxWidth: 320 - 64,
    });
    y += 1.5 + 9.75;
  }

  if (content.sajuExcerpt) {
    ctx.font = serif(400, 7.5);
    y += 3;
    for (const excerptLine of wrapLines(ctx, content.sajuExcerpt, 320, 2)) {
      text(ctx, excerptLine, x, y + 5.06, {
        font: serif(400, 7.5),
        color: COLORS.inkSoft,
        align: "left",
      });
      y += 7.5 * 1.35;
    }
  }
}

function panelHeading(
  ctx: Context2D,
  x: number,
  top: number,
  title: string,
  hangul: string,
  serif: FontSpec,
  sans: FontSpec,
): number {
  ctx.fillStyle = COLORS.ochre;
  ctx.fillRect(x, top, 320, 0.6);
  const middle = top + 0.6 + 5 + 4.5;
  const width = text(ctx, title.toUpperCase(), x, middle, {
    font: sans(700, 7),
    color: COLORS.vermilion,
    spacing: 1.4,
    align: "left",
  });
  text(ctx, hangul, x + width + 6, middle, {
    font: serif(400, 7.5),
    color: COLORS.inkMuted,
    align: "left",
  });
  return top + 0.6 + 5 + 9 + 3;
}

// ─── 바탕 · 테두리 · 도장 ────────────────────────────────────

function drawPaper(ctx: Context2D, seed: string) {
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    0,
    W / 2,
    H / 2,
    W * 0.62,
  );
  vignette.addColorStop(0, withAlpha(COLORS.paper, 0));
  vignette.addColorStop(0.7, withAlpha(COLORS.paperEdge, 0.35));
  vignette.addColorStop(1, withAlpha(COLORS.paperEdge, 0.9));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  for (const [x, y, radius, color, alpha] of [
    [1, 1, W * 0.55, COLORS.ochre, 0.12],
    [W - 1, 1, W * 0.45, COLORS.vermilion, 0.08],
  ] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, withAlpha(color, alpha));
    glow.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  ctx.strokeStyle = withAlpha(COLORS.fiber, 0.22);
  ctx.lineWidth = 0.35;
  ctx.stroke(new Path2D(paperFiberPath(seed)));
  ctx.restore();
}

function drawWatermark(ctx: Context2D, character: string, font: string) {
  ctx.save();
  ctx.globalAlpha = 0.035;
  text(ctx, character, W / 2, H / 2, { font, color: COLORS.vermilion });
  ctx.restore();
}

function drawFrame(ctx: Context2D) {
  const { outer, outerThin, band, inner, innerThin } = FRAME;
  const strokeRect = (inset: number, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };

  strokeRect(outer, COLORS.vermilion, 2.4);
  strokeRect(outerThin, COLORS.vermilion, 0.6);

  ctx.save();
  ctx.strokeStyle = COLORS.ochre;
  ctx.lineWidth = 0.8;
  ctx.lineCap = "square";
  ctx.stroke(new Path2D(meanderPath()));
  ctx.restore();

  for (const [x, y] of cornerOrnamentOrigins()) {
    const inset = band * 0.25;
    const dot = band * 0.18;
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(x, y, band, band);
    ctx.strokeStyle = COLORS.vermilion;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(x, y, band, band);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x + inset, y + inset, band - inset * 2, band - inset * 2);
    ctx.fillStyle = COLORS.vermilion;
    ctx.fillRect(x + (band - dot) / 2, y + (band - dot) / 2, dot, dot);
  }

  strokeRect(inner, withAlpha(COLORS.ink, 0.55), 0.7);
  strokeRect(innerThin, withAlpha(COLORS.ink, 0.35), 0.35);
}

function drawEmblem(
  ctx: Context2D,
  character: string,
  x: number,
  y: number,
  font: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.fillStyle = COLORS.vermilion;
  roundedRect(ctx, -12, -12, 24, 24, 5);
  ctx.fill();
  text(ctx, character, 0, 0, { font, color: COLORS.hanji });
  ctx.restore();
}

function drawDivider(ctx: Context2D, x: number, y: number) {
  ctx.strokeStyle = COLORS.ochre;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - 85, y);
  ctx.lineTo(x - 11, y);
  ctx.moveTo(x + 11, y);
  ctx.lineTo(x + 85, y);
  ctx.stroke();
  ctx.fillStyle = COLORS.ochre;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 4);
  ctx.lineTo(x - 4, y);
  ctx.closePath();
  ctx.fill();
}

function drawSeal(
  ctx: Context2D,
  hangul: string,
  seal: CertificateInput["seal"],
  box: { x: number; y: number; size: number },
) {
  const parsed = parseSealText(hangul);
  if (!parsed.ok) return;

  const image = document.createElement("canvas");
  renderKoreanSeal(image, parsed.characters, {
    shape: seal.shape,
    size: 640,
    color: SEAL_INK_COLOR,
    texture: true,
    font: seal.font,
  });

  // 손으로 찍은 듯 살짝 기울이고, 종이에 스며든 것처럼 곱하기로 합성한다
  ctx.save();
  ctx.translate(box.x + box.size / 2, box.y + box.size / 2);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(image, -box.size / 2, -box.size / 2, box.size, box.size);
  ctx.restore();
}

// ─── 글자 ────────────────────────────────────────────────────

interface TextOptions {
  font: string;
  color: string;
  /** 자간 (pt) */
  spacing?: number;
  align?: "left" | "center" | "right";
  /** 넘치면 말줄임표로 줄인다 */
  maxWidth?: number;
}

/** 한 줄을 그리고 그린 폭을 돌려준다. y는 글줄 가운데 */
function text(
  ctx: Context2D,
  value: string,
  x: number,
  y: number,
  options: TextOptions,
): number {
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textBaseline = "middle";
  const spacing = options.spacing ?? 0;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;

  const content = options.maxWidth
    ? truncate(ctx, value, options.maxWidth)
    : value;
  const width = ctx.measureText(content).width;
  const align = options.align ?? "center";
  // 자간은 마지막 글자 뒤에도 붙으므로 가운데·오른쪽 정렬에서 그만큼 보정한다
  const left =
    align === "left"
      ? x
      : align === "right"
        ? x - width + spacing
        : x - (width - spacing) / 2;
  ctx.textAlign = "left";
  ctx.fillText(content, left, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  return width;
}

/** 글줄 하나(높이 height)를 top부터 그리고 다음 줄의 top을 돌려준다 */
function line(
  ctx: Context2D,
  value: string,
  x: number,
  top: number,
  height: number,
  options: TextOptions,
): number {
  text(ctx, value, x, top + height / 2, options);
  return top + height;
}

function truncate(ctx: Context2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/** 단어 단위로 줄을 나눈다 — 넘치면 마지막 줄을 말줄임표로 끝낸다 */
function wrapLines(
  ctx: Context2D,
  value: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(
    ctx,
    `${kept[maxLines - 1]} ${lines[maxLines]}`,
    maxWidth,
  );
  return kept;
}

function roundedRect(
  ctx: Context2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** "#rrggbb" + 불투명도 → rgba() */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The certificate could not be encoded."));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
