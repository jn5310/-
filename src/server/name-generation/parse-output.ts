import { getSoundElement } from "@/lib/saju/sound-elements";
import type { GeneratedName, NameCharacter } from "@/types/api";
import type { FiveElement } from "@/types/saju";

import { invalidModelOutput } from "./errors";
import { AVOIDED_HANJA, lookupHanja } from "./hanja";
import { modelOutputSchema, type ModelOutput } from "./output-schema";

/** 모델 출력이 반드시 따라야 할 요청 조건 */
export interface NamingContext {
  /** 성 포함 전체 글자 수 */
  nameLength: number;
  surnameSyllables: number;
  /** 확정된 성씨 한글 — 대표 성씨·한글 직접 입력. 영문 직접 입력이면 null (모델이 한글로 옮긴다) */
  surnameHangul: string | null;
  /** 확정된 성씨 한자 — 대표 성씨만 */
  surnameHanja: string | null;
  /** 로마자 표기의 성 부분을 이 값으로 맞춘다 — 대표 성씨·영문 직접 입력 */
  surnameRomanization: string | null;
}

export interface ParsedModelOutput {
  favorableElements: FiveElement[];
  names: GeneratedName[];
}

const HANGUL_NAME = /^[가-힣]+$/;
const SINGLE_HAN = /^\p{Script=Han}$/u;
const ROMANIZATION = /^[A-Za-z][A-Za-z'’-]*(?: [A-Za-z][A-Za-z'’-]*)+$/;
const GIVEN_NAME_EXAMPLES = ["Hyun", "Min-jun", "Han-ga-ram"] as const;

const LIMITS = {
  meaning: 60,
  summary: 220,
  /** 프롬프트가 요구하는 분량(60–150단어)의 절반 남짓 — 이보다 짧으면 성의 없는 답으로 본다 */
  premiumMin: 300,
  premiumMax: 2400,
  /** 영문 필드에 한글이 이 비율을 넘으면 언어 규칙 위반으로 본다 */
  hangulRatio: 0.2,
} as const;

const collapse = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();

const paragraphs = (value: string) =>
  value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * 모델 응답 텍스트 → 검증·정리된 이름 목록.
 * 문제가 있으면 INVALID_MODEL_OUTPUT(issues 포함)을 던진다 — 호출 측이 issues를 붙여 다시 요청한다.
 */
export function parseModelOutput(
  text: string | undefined,
  context: NamingContext,
): ParsedModelOutput {
  if (!text?.trim()) throw invalidModelOutput(["응답이 비어 있습니다."]);

  const parsed = modelOutputSchema.safeParse(extractJson(text));
  if (!parsed.success) {
    throw invalidModelOutput(
      parsed.error.issues
        .slice(0, 8)
        .map(
          (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        ),
    );
  }

  const issues: string[] = [];
  const names = parsed.data.names.map((name, index) =>
    normalizeName(name, `names[${index}]`, context, issues),
  );
  checkAcrossNames(names, context, issues);

  if (issues.length > 0) throw invalidModelOutput(issues);
  return {
    favorableElements: [...new Set(parsed.data.favorableElements)],
    names: names as GeneratedName[],
  };
}

/** responseMimeType이 JSON이라도 코드 펜스나 앞뒤 문장이 섞이는 경우를 대비한다 */
function extractJson(text: string): unknown {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  const candidates = [trimmed];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) candidates.push(fenced[1]);
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    candidates.push(trimmed.slice(first, last + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // 다음 후보로
    }
  }
  throw invalidModelOutput([
    "응답을 JSON으로 해석할 수 없습니다. 스키마에 맞는 JSON 객체 하나만 출력하세요.",
  ]);
}

function normalizeName(
  raw: ModelOutput["names"][number],
  label: string,
  context: NamingContext,
  issues: string[],
): GeneratedName | null {
  const before = issues.length;
  const hangul = raw.hangul.normalize("NFC").replace(/\s+/g, "");
  const syllables = Array.from(hangul);

  if (!HANGUL_NAME.test(hangul)) {
    issues.push(`${label}.hangul "${raw.hangul}": 완성형 한글만 쓰세요.`);
  }
  if (syllables.length !== context.nameLength) {
    issues.push(
      `${label}.hangul "${hangul}": 성 포함 ${context.nameLength}자여야 하는데 ${syllables.length}자입니다.`,
    );
  }
  if (context.surnameHangul && !hangul.startsWith(context.surnameHangul)) {
    issues.push(
      `${label}.hangul "${hangul}": 성씨 "${context.surnameHangul}"(으)로 시작해야 합니다.`,
    );
  }
  if (raw.characters.length !== syllables.length) {
    issues.push(
      `${label}.characters: 음절마다 하나씩 ${syllables.length}개여야 하는데 ${raw.characters.length}개입니다.`,
    );
  }

  const characters = raw.characters.map((character, position) => {
    const where = `${label}.characters[${position}]`;
    const charHangul = character.hangul.normalize("NFC").trim();
    // NFC는 호환 한자(U+F900대)를 통합 한자로 바꿔 준다 (예: 李 U+F9E1 → U+674E)
    const hanja = character.hanja.normalize("NFC").trim();
    const meaning = collapse(character.meaning);
    const isSurname = position < context.surnameSyllables;

    if (charHangul !== syllables[position]) {
      issues.push(
        `${where}.hangul "${charHangul}": 이름의 ${position + 1}번째 음절 "${syllables[position] ?? ""}"과 같아야 합니다.`,
      );
    }
    const hanjaIssue = checkHanja(hanja, charHangul, isSurname);
    if (hanjaIssue) issues.push(`${where}.hanja "${hanja}": ${hanjaIssue}`);
    if (
      meaning === "" ||
      meaning.length > LIMITS.meaning ||
      hangulRatio(meaning) > LIMITS.hangulRatio
    ) {
      issues.push(`${where}.meaning: 1–4단어의 짧은 영어 뜻을 쓰세요.`);
    }
    return {
      hangul: charHangul,
      hanja,
      meaning,
      element: character.element,
      soundElement: getSoundElement(charHangul),
      isSurname,
    };
  });

  if (
    context.surnameHanja &&
    characters[0] &&
    characters[0].hanja !== context.surnameHanja
  ) {
    issues.push(
      `${label}.characters[0].hanja "${characters[0].hanja}": 성씨 한자는 "${context.surnameHanja}"이어야 합니다.`,
    );
  }

  const romanization = normalizeRomanization(
    raw.romanization,
    context,
    context.nameLength - context.surnameSyllables,
  );
  if (romanization.problem) {
    issues.push(
      `${label}.romanization "${raw.romanization}": ${romanization.problem}`,
    );
  } else if (!ROMANIZATION.test(romanization.value)) {
    issues.push(
      `${label}.romanization "${raw.romanization}": "Kim Min-jun"처럼 영문자로 성과 이름을 띄어 쓰세요.`,
    );
  }

  const summary = collapse(raw.summary);
  if (
    summary === "" ||
    summary.length > LIMITS.summary ||
    hangulRatio(summary) > LIMITS.hangulRatio
  ) {
    issues.push(`${label}.summary: 25단어 이내의 영어 한 문장이어야 합니다.`);
  }

  const premium = {
    sajuHarmony: paragraphs(raw.premium.sajuHarmony),
    soundHarmony: paragraphs(raw.premium.soundHarmony),
    fortune: paragraphs(raw.premium.fortune),
  };
  for (const [key, value] of Object.entries(premium)) {
    if (value.length < LIMITS.premiumMin || value.length > LIMITS.premiumMax) {
      issues.push(
        `${label}.premium.${key}: 분량 지침(단어 수)을 지키세요 — 지금 ${value.length}자.`,
      );
    } else if (hangulRatio(value) > LIMITS.hangulRatio) {
      issues.push(
        `${label}.premium.${key}: 영어로 쓰세요. 한국어 용어는 괄호 안에만 씁니다.`,
      );
    }
  }

  if (issues.length > before) return null;
  return {
    hangul,
    romanization: romanization.value,
    hanja: characters.map((character) => character.hanja).join(""),
    // 검증을 통과했으므로 모든 음절이 완성형 한글이고 soundElement가 있다
    characters: characters as NameCharacter[],
    summary,
    premium,
  };
}

/**
 * 한자와 음절의 짝을 Unicode Unihan(kHangul) 한자음으로 확인한다.
 * 이름 글자는 인명에 쓸 수 있는 글자여야 하고 흉한 뜻의 글자는 쓰지 않는다.
 * (성씨는 대표 성씨·의뢰인 입력을 따르므로 음만 확인한다)
 */
function checkHanja(
  hanja: string,
  syllable: string,
  isSurname: boolean,
): string | null {
  if (!SINGLE_HAN.test(hanja)) return "한자 한 글자여야 합니다.";
  const info = lookupHanja(hanja);
  if (!info) {
    return "한국 한자음을 확인할 수 없는 글자입니다. 인명용 한자에서 고르세요.";
  }
  if (!info.readings.includes(syllable)) {
    return `음이 ${info.readings.join("·")}(이)라 음절 "${syllable}"과 맞지 않습니다. 음이 "${syllable}"인 한자를 고르세요.`;
  }
  if (isSurname) return null;
  if (!info.forNames) return "인명용 한자가 아닙니다.";
  if (AVOIDED_HANJA.has(hanja)) return "뜻이 흉해 이름에 쓰지 않는 글자입니다.";
  return null;
}

/**
 * 로마자 표기를 "성 + 이름(음절을 하이픈으로 이은 한 단어)" 모양으로 정리한다.
 * 성 표기는 지정 값(대표 성씨·영문 입력)으로 맞추고(예: "Gim Min-jun" → "Kim Min-jun"),
 * 이름 부분의 음절 수가 맞지 않거나 성·이름 순서가 뒤바뀌면 고칠 점을 돌려준다.
 */
function normalizeRomanization(
  raw: string,
  context: NamingContext,
  givenSyllables: number,
): { value: string; problem: string | null } {
  const value = collapse(raw);
  const tokens = value.split(" ").filter(Boolean);
  const example = `${context.surnameRomanization ?? "Kim"} ${GIVEN_NAME_EXAMPLES[givenSyllables - 1] ?? "Min-jun"}`;

  if (tokens.length < 2) {
    return { value, problem: `성과 이름을 띄어 쓰세요 (예: "${example}").` };
  }
  const given = tokens[tokens.length - 1];
  if (
    context.surnameRomanization &&
    lettersOf(given) === lettersOf(context.surnameRomanization)
  ) {
    return {
      value,
      problem: `성을 앞에, 이름을 뒤에 쓰세요 (예: "${example}").`,
    };
  }
  if (given.split("-").filter(Boolean).length !== givenSyllables) {
    return {
      value,
      problem: `이름 부분 "${given}"은 ${givenSyllables}음절을 하이픈으로 이은 한 단어여야 합니다 (예: "${example}").`,
    };
  }

  const surname = context.surnameRomanization ?? tokens.slice(0, -1).join(" ");
  const capitalized =
    given.charAt(0).toUpperCase() + given.slice(1).toLowerCase();
  return { value: `${surname} ${capitalized}`, problem: null };
}

const lettersOf = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

function checkAcrossNames(
  names: (GeneratedName | null)[],
  context: NamingContext,
  issues: string[],
) {
  const valid = names.filter((name): name is GeneratedName => name !== null);
  const surnameOf = (name: GeneratedName) =>
    name.characters
      .slice(0, context.surnameSyllables)
      .map((character) => `${character.hangul}${character.hanja}`)
      .join("");

  // 영문으로 입력한 성씨는 모델이 한글·한자로 옮기므로 세 이름이 같은 성을 쓰는지 확인한다
  const surnames = new Set(valid.map(surnameOf));
  if (surnames.size > 1) {
    issues.push(
      `세 이름의 성씨(한글·한자)가 서로 다릅니다: ${[...surnames].join(", ")}. 같은 성씨를 쓰세요.`,
    );
  }

  const givenNames = valid.map((name) =>
    name.hangul.slice(context.surnameSyllables),
  );
  const duplicates = givenNames.filter(
    (given, index) => givenNames.indexOf(given) !== index,
  );
  if (duplicates.length > 0) {
    issues.push(
      `이름이 겹칩니다: ${[...new Set(duplicates)].join(", ")}. 서로 다른 이름을 지으세요.`,
    );
  }
}

function hangulRatio(text: string): number {
  const letters = text.match(/[\p{L}]/gu) ?? [];
  if (letters.length === 0) return 0;
  const hangul = text.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g) ?? [];
  return hangul.length / letters.length;
}
