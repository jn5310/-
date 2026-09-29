import { FIVE_ELEMENT_META, FIVE_ELEMENTS } from "@/lib/saju/five-elements";
import type { SealFont, SealShape } from "@/lib/seal";
import type { GeneratedName } from "@/types/api";
import type { FiveElement, SajuReading } from "@/types/saju";

import { createCertificateId } from "./certificate-id";

/*
 * 증명서에 들어갈 내용을 한곳에서 만든다.
 * 벡터(react-pdf)와 캔버스(대체) 두 렌더러가 같은 내용을 쓰고, 한글 폰트 서브셋도 이 문자열로 계산한다 —
 * 그래서 렌더러에 문구를 직접 적지 말고 여기의 값만 쓴다.
 */

/** 결제한 풀이에서 증명서를 만들 때 필요한 값 */
export interface CertificateInput {
  readingId: string;
  englishName: string;
  /** 사용자가 최종 선택한 이름 */
  name: GeneratedName;
  saju: SajuReading;
  favorableElements: FiveElement[];
  /** 발급일 — 잠금 해제 시각이라 몇 번을 받아도 같다 */
  issuedAt: Date;
  /** 화면에서 고른 도장 모양·서체를 그대로 찍는다 */
  seal: { shape: SealShape; font: SealFont };
}

export const CERTIFICATE_TEXT = {
  title: "Official Certificate of Korean Name",
  subtitle: "공식 한국어 이름 증명서",
  certifies: "This is to certify that",
  bestowed: "has been bestowed the Korean name",
  hanjaHeading: "Meaning of the Hanja",
  hanjaHeadingKo: "한자 풀이",
  sajuHeading: "Saju Summary",
  sajuHeadingKo: "사주 요약",
  dayMasterLabel: "Day Master",
  favorableLabel: "Balanced with",
  balanceLabel: "Five Elements",
  surnameLabel: "surname",
  issuedLabel: "Date of Issue",
  idLabel: "Certificate ID",
  issuedBy: "Issued by",
  issuer: "K-Name Studio",
  issuerKo: "한국 이름 공방",
  hourUnknown: "Hour unknown",
  disclaimer:
    "Issued by K-Name Studio for cultural and personal use. This certificate is not a legal name registration.",
  emblem: "名",
  watermark: "名",
  separator: "·",
  missing: "—",
} as const;

export interface CertificateCharacter {
  hangul: string;
  hanja: string;
  meaning: string;
  /** 자원오행 — 예) "Metal 金" */
  element: string;
  isSurname: boolean;
}

export interface CertificatePillar {
  /** 예) "Hour" */
  label: string;
  /** 예) "時" */
  labelHanja: string;
  /** 간지 한자 (예: "甲子") — 시각 미상이면 null */
  hanja: string | null;
  hangul: string | null;
}

export interface CertificateContent {
  text: typeof CERTIFICATE_TEXT;
  englishName: string;
  hangul: string;
  hanja: string;
  romanization: string;
  /** 이름의 의미 한 문장 */
  summary: string;
  characters: CertificateCharacter[];
  /** 전통 표기 순서를 화면 방향으로: 시 · 일 · 월 · 연 */
  pillars: CertificatePillar[];
  /** 예) "甲 · Yang Wood" */
  dayMaster: string;
  /** 예) "Water 水 · Wood 木" */
  favorable: string;
  /** 예) "Wood 2 · Fire 1 · Earth 3 · Metal 1 · Water 1" */
  balance: string;
  /** 사주 조화 분석의 앞부분 (영문 한두 문장) */
  sajuExcerpt: string;
  /** 예) "September 29, 2026" */
  issuedOn: string;
  certificateId: string;
}

const PILLAR_ORDER = [
  { key: "hour", label: "Hour", labelHanja: "時" },
  { key: "day", label: "Day", labelHanja: "日" },
  { key: "month", label: "Month", labelHanja: "月" },
  { key: "year", label: "Year", labelHanja: "年" },
] as const;

const elementLabel = (element: FiveElement) =>
  `${FIVE_ELEMENT_META[element].label} ${FIVE_ELEMENT_META[element].hanja}`;

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function buildCertificateContent(
  input: CertificateInput,
): CertificateContent {
  const { name, saju } = input;
  const separator = ` ${CERTIFICATE_TEXT.separator} `;

  return {
    text: CERTIFICATE_TEXT,
    englishName: input.englishName.trim(),
    hangul: name.hangul,
    hanja: name.hanja,
    romanization: name.romanization,
    summary: name.summary,
    characters: name.characters.map((character) => ({
      hangul: character.hangul,
      hanja: character.hanja,
      meaning: character.meaning,
      element: elementLabel(character.element),
      isSurname: character.isSurname,
    })),
    pillars: PILLAR_ORDER.map(({ key, label, labelHanja }) => {
      const pillar = saju.chart[key];
      return {
        label,
        labelHanja,
        hanja: pillar?.hanja ?? null,
        hangul: pillar?.hangul ?? null,
      };
    }),
    dayMaster: `${saju.dayMaster.hanja}${separator}${capitalize(saju.dayMaster.yinYang)} ${FIVE_ELEMENT_META[saju.dayMaster.element].label}`,
    favorable: input.favorableElements.map(elementLabel).join(separator),
    balance: FIVE_ELEMENTS.map(
      (element) =>
        `${FIVE_ELEMENT_META[element].label} ${saju.elementBalance[element]}`,
    ).join(separator),
    sajuExcerpt: excerpt(name.premium?.sajuHarmony ?? "", 230),
    issuedOn: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(input.issuedAt),
    certificateId: createCertificateId({
      readingId: input.readingId,
      hangul: name.hangul,
      hanja: name.hanja,
      issuedAt: input.issuedAt,
    }),
  };
}

/** korean-name-certificate-kim-seo-yun.pdf */
export function getCertificateFileName(romanization: string): string {
  const slug = romanization
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `korean-name-certificate${slug ? `-${slug}` : ""}.pdf`;
}

/** 문장 단위로 앞부분만 — 첫 문장이 너무 길면 단어 단위로 자르고 말줄임표를 붙인다 */
export function excerpt(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const sentences = clean.match(/[^.!?]+[.!?]+["”’)]*\s*/g) ?? [];
  let result = "";
  for (const sentence of sentences) {
    if ((result + sentence).trim().length > maxLength) break;
    result += sentence;
  }
  if (result.trim()) return result.trim();

  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * 증명서에 쓰는 모든 글자 (코드 포인트 순, 중복 없음) — 한글 폰트 서브셋을 요청할 때 쓴다.
 * 라틴 문자는 기본 묶음 전체를 넣어, 영문 이름이 글자 집합으로 드러나지 않게 한다.
 */
export function collectCertificateCharacters(
  content: CertificateContent,
): string {
  const characters = new Set<string>(LATIN_BASE);
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const character of value.normalize("NFC")) characters.add(character);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(content);

  return [...characters]
    .filter((character) => (character.codePointAt(0) ?? 0) >= 0x20)
    .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
    .join("");
}

/** 기본 라틴(U+0020–U+007E) · 라틴-1 보충 · 라틴 확장-A + 문장부호 */
const LATIN_BASE: readonly string[] = [
  ...range(0x20, 0x7e),
  ...range(0xa0, 0x17f),
  ..."‘’“”–—…•",
];

function range(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    String.fromCodePoint(start + index),
  );
}
