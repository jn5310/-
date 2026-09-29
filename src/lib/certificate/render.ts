import { FIVE_ELEMENT_META } from "@/lib/saju/five-elements";
import {
  loadSealFont,
  parseSealText,
  renderKoreanSeal,
  SEAL_INK_COLOR,
  type SealFont,
  type SealShape,
} from "@/lib/seal";
import type { GeneratedName } from "@/types/api";
import type { FiveElement, SajuReading } from "@/types/saju";

/*
 * 이름 증서(A4 가로) — 캔버스에 그린다. 약 200dpi(2339 × 1654px)라 인쇄해도 선명하다.
 * 글꼴은 페이지가 이미 쓰는 Noto Serif KR · Noto Sans KR(next/font)을 그대로 쓴다.
 */

export const CERTIFICATE_SIZE = { width: 2339, height: 1654 } as const;

export interface CertificateData {
  englishName: string;
  name: GeneratedName;
  favorableElements: FiveElement[];
  dayMaster: SajuReading["dayMaster"];
  /** 증서 번호로 쓸 풀이 ID */
  certificateId: string;
  issuedAt: Date;
  seal: { shape: SealShape; font: SealFont };
}

export interface CertificateFonts {
  serif: string;
  sans: string;
}

const COLORS = {
  paper: "#f6f1e7",
  ink: "#1e1b18",
  inkSoft: "#4b443c",
  inkMuted: "#756b5f",
  vermilion: "#b3372b",
  ochre: "#82601f",
} as const;

const SAEKDONG = [
  "#c8423a",
  "#e2b33c",
  "#3f8a5a",
  "#2f5d9a",
  "#f3eee4",
  "#d67a9c",
];

/**
 * next/font가 <html>에 심어 둔 CSS 변수에서 실제 글꼴 이름을 읽는다.
 * 캔버스는 var(--…)를 해석하지 못하기 때문이다. 값이 없으면 시스템 글꼴로 그린다.
 */
export function resolveCertificateFonts(): CertificateFonts {
  const style = getComputedStyle(document.documentElement);
  const serif = style.getPropertyValue("--font-noto-serif-kr").trim();
  const sans = style.getPropertyValue("--font-noto-sans-kr").trim();
  return {
    serif: serif ? `${serif}, serif` : "serif",
    sans: sans ? `${sans}, sans-serif` : "sans-serif",
  };
}

/** 증서에 쓸 글자가 든 폰트 조각(unicode-range)만 미리 받는다 */
export async function loadCertificateFonts(
  fonts: CertificateFonts,
  data: CertificateData,
): Promise<void> {
  const { name } = data;
  const text = [
    "CERTIFICATE OF KOREAN NAME 한국 이름 증서 공방",
    "This certifies that has been given the Korean name",
    "ISSUED CERTIFICATE NO. Balanced with Day master · K-Name Studio 0123456789",
    data.englishName,
    name.hangul,
    name.hanja,
    name.romanization,
    name.summary,
    ...name.characters.map(
      (character) => `${character.hanja} ${character.meaning}`,
    ),
    ...Object.values(FIVE_ELEMENT_META).map(
      (meta) => `${meta.label} ${meta.hanja}`,
    ),
    data.dayMaster.hanja,
  ].join(" ");

  await Promise.all([
    loadSealFont({ family: fonts.serif, weight: 400 }, text),
    loadSealFont({ family: fonts.serif, weight: 700 }, text),
    loadSealFont({ family: fonts.sans, weight: 400 }, text),
    loadSealFont({ family: fonts.sans, weight: 600 }, text),
    loadSealFont(data.seal.font, name.hangul),
  ]);
}

type Context2D = CanvasRenderingContext2D & { letterSpacing?: string };

export function renderCertificate(
  canvas: HTMLCanvasElement,
  data: CertificateData,
  fonts: CertificateFonts,
): void {
  const { width: W, height: H } = CERTIFICATE_SIZE;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d") as Context2D | null;
  if (!ctx) throw new Error("Canvas 2D is not supported in this browser.");

  drawPaper(ctx, W, H);
  drawFrame(ctx, W, H);

  const { name } = data;
  const center = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // 머리글
  text(ctx, "CERTIFICATE OF KOREAN NAME", center, 250, {
    font: `600 46px ${fonts.sans}`,
    color: COLORS.inkMuted,
    letterSpacing: "14px",
  });
  text(ctx, "한국 이름 증서", center, 338, {
    font: `700 64px ${fonts.serif}`,
    color: COLORS.vermilion,
    letterSpacing: "10px",
  });

  text(ctx, "This certifies that", center, 440, {
    font: `400 40px ${fonts.sans}`,
    color: COLORS.inkSoft,
  });
  fittedText(ctx, data.englishName, center, 555, {
    family: fonts.serif,
    weight: 700,
    maxSize: 96,
    minSize: 48,
    maxWidth: 1500,
    color: COLORS.ink,
  });
  drawDivider(ctx, center, 604);
  text(ctx, "has been given the Korean name", center, 680, {
    font: `400 40px ${fonts.sans}`,
    color: COLORS.inkSoft,
  });

  // 이름
  fittedText(ctx, name.hangul, center, 960, {
    family: fonts.serif,
    weight: 700,
    maxSize: 250,
    minSize: 140,
    maxWidth: 1300,
    color: COLORS.ink,
    letterSpacing: "24px",
  });
  fittedText(ctx, `${name.hanja}  ·  ${name.romanization}`, center, 1072, {
    family: fonts.serif,
    weight: 400,
    maxSize: 60,
    minSize: 36,
    maxWidth: 1400,
    color: COLORS.inkSoft,
  });
  fittedText(
    ctx,
    name.characters
      .map((character) => `${character.hanja} ${character.meaning}`)
      .join("   ·   "),
    center,
    1150,
    {
      family: fonts.sans,
      weight: 400,
      maxSize: 34,
      minSize: 24,
      maxWidth: 1500,
      color: COLORS.inkMuted,
    },
  );

  drawSummary(ctx, `“${name.summary}”`, center, 1218, fonts.sans);

  // 아래: 발급 정보 (왼쪽) · 오행 (가운데) · 도장 (오른쪽)
  ctx.textAlign = "left";
  const left = 190;
  text(ctx, "ISSUED", left, 1352, {
    font: `600 24px ${fonts.sans}`,
    color: COLORS.inkMuted,
    letterSpacing: "6px",
  });
  text(ctx, formatIssuedDate(data.issuedAt), left, 1394, {
    font: `400 36px ${fonts.serif}`,
    color: COLORS.ink,
  });
  text(ctx, "CERTIFICATE NO.", left, 1440, {
    font: `600 24px ${fonts.sans}`,
    color: COLORS.inkMuted,
    letterSpacing: "6px",
  });
  text(ctx, formatCertificateNumber(data.certificateId), left, 1480, {
    font: `400 32px ${fonts.serif}`,
    color: COLORS.ink,
  });

  ctx.textAlign = "center";
  const elements = data.favorableElements
    .map(
      (element) =>
        `${FIVE_ELEMENT_META[element].label} ${FIVE_ELEMENT_META[element].hanja}`,
    )
    .join("  ·  ");
  if (elements) {
    text(ctx, `Balanced with ${elements}`, center, 1420, {
      font: `400 32px ${fonts.sans}`,
      color: COLORS.inkSoft,
    });
  }
  const master = FIVE_ELEMENT_META[data.dayMaster.element];
  text(
    ctx,
    `Day master ${data.dayMaster.hanja} · ${capitalize(data.dayMaster.yinYang)} ${master.label}`,
    center,
    1466,
    { font: `400 28px ${fonts.sans}`, color: COLORS.inkMuted },
  );

  drawSeal(ctx, data, { x: 2157 - 280, y: 1190, size: 280 });
  text(ctx, "K-Name Studio · 한국 이름 공방", 2157 - 140, 1515, {
    font: `400 24px ${fonts.sans}`,
    color: COLORS.inkMuted,
  });
}

// ─── 그리기 도우미 ───────────────────────────────────────────

function drawPaper(ctx: Context2D, W: number, H: number) {
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  // 한지에 스민 은은한 빛
  const glows: [number, number, string][] = [
    [0, 0, "rgba(130, 96, 31, 0.10)"],
    [W, 0, "rgba(179, 55, 43, 0.07)"],
  ];
  for (const [x, y, color] of glows) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, W * 0.55);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(246, 241, 231, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawFrame(ctx: Context2D, W: number, H: number) {
  ctx.strokeStyle = COLORS.vermilion;
  ctx.lineWidth = 8;
  ctx.strokeRect(70, 70, W - 140, H - 140);

  ctx.strokeStyle = "rgba(30, 27, 24, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(92, 92, W - 184, H - 184);

  // 네 모서리 장식 (마름모)
  ctx.fillStyle = COLORS.vermilion;
  for (const [x, y] of [
    [70, 70],
    [W - 70, 70],
    [70, H - 70],
    [W - 70, H - 70],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x, y + 18);
    ctx.lineTo(x - 18, y);
    ctx.closePath();
    ctx.fill();
  }

  // 색동 띠
  const bandWidth = 600;
  const segment = bandWidth / SAEKDONG.length;
  SAEKDONG.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(W / 2 - bandWidth / 2 + index * segment, 140, segment, 10);
  });
}

function drawDivider(ctx: Context2D, x: number, y: number) {
  ctx.strokeStyle = COLORS.ochre;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 200, y);
  ctx.lineTo(x - 20, y);
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + 200, y);
  ctx.stroke();
  ctx.fillStyle = COLORS.ochre;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x - 8, y);
  ctx.closePath();
  ctx.fill();
}

function drawSeal(
  ctx: Context2D,
  data: CertificateData,
  box: { x: number; y: number; size: number },
) {
  const parsed = parseSealText(data.name.hangul);
  if (!parsed.ok) return;

  const seal = document.createElement("canvas");
  renderKoreanSeal(seal, parsed.characters, {
    shape: data.seal.shape,
    size: 640,
    color: SEAL_INK_COLOR,
    texture: true,
    font: data.seal.font,
  });

  // 손으로 찍은 듯 살짝 기울이고, 종이에 스며든 것처럼 곱하기로 합성한다
  ctx.save();
  ctx.translate(box.x + box.size / 2, box.y + box.size / 2);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(seal, -box.size / 2, -box.size / 2, box.size, box.size);
  ctx.restore();
}

interface TextStyle {
  font: string;
  color: string;
  letterSpacing?: string;
}

function text(
  ctx: Context2D,
  value: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  // letterSpacing을 지원하지 않는 브라우저에서는 그냥 붙여 쓴다
  const spacing =
    "letterSpacing" in ctx ? (style.letterSpacing ?? "0px") : "0px";
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  // 자간은 마지막 글자 뒤에도 붙어 가운데 정렬이 왼쪽으로 쏠린다 — 절반만큼 되돌린다
  const shift = ctx.textAlign === "center" ? Number.parseFloat(spacing) / 2 : 0;
  ctx.fillText(value, x + shift, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

/** 최대 너비에 들어갈 때까지 글자 크기를 줄여 그린다 */
function fittedText(
  ctx: Context2D,
  value: string,
  x: number,
  y: number,
  options: {
    family: string;
    weight: number;
    maxSize: number;
    minSize: number;
    maxWidth: number;
    color: string;
    letterSpacing?: string;
  },
) {
  let size = options.maxSize;
  for (; size > options.minSize; size -= 2) {
    ctx.font = `${options.weight} ${size}px ${options.family}`;
    if ("letterSpacing" in ctx)
      ctx.letterSpacing = options.letterSpacing ?? "0px";
    if (ctx.measureText(value).width <= options.maxWidth) break;
  }
  text(ctx, value, x, y, {
    font: `${options.weight} ${size}px ${options.family}`,
    color: options.color,
    letterSpacing: options.letterSpacing,
  });
}

/** 한 줄 의미(요약): 32px 두 줄에 안 들어가면 글자를 줄여 세 줄까지 쓴다 */
function drawSummary(
  ctx: Context2D,
  value: string,
  x: number,
  y: number,
  family: string,
) {
  const attempts = [
    { size: 32, maxLines: 2 },
    { size: 29, maxLines: 3 },
    { size: 26, maxLines: 3 },
  ];
  let chosen = attempts[attempts.length - 1];
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  for (const attempt of attempts) {
    ctx.font = `400 ${attempt.size}px ${family}`;
    if (wrapLines(ctx, value, 1300, 99).length <= attempt.maxLines) {
      chosen = attempt;
      break;
    }
  }
  ctx.font = `400 ${chosen.size}px ${family}`;
  ctx.fillStyle = COLORS.ink;
  wrapLines(ctx, value, 1300, chosen.maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * Math.round(chosen.size * 1.4));
  });
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
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function formatIssuedDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** 풀이 ID 앞 12자를 4자씩 묶는다 — 예) KNS-AB3D-EF7H-JK2M */
function formatCertificateNumber(id: string): string {
  const groups =
    id
      .slice(0, 12)
      .toUpperCase()
      .match(/.{1,4}/g) ?? [];
  return ["KNS", ...groups].join("-");
}
