import type {
  DayMasterProfile,
  DayMasterStrength,
  ElementInsight,
  ElementLevel,
  ElementTip,
  FiveElement,
  HeavenlyStem,
  SajuAnalysis,
  SajuReading,
} from "@/types/saju";

import { FIVE_ELEMENT_META, FIVE_ELEMENTS } from "./five-elements";
import {
  branchIndexOf,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  stemIndexOf,
} from "./ganji";

/*
 * 사주 풀이(규칙 기반) — 만세력 원국만으로 결정적으로 만든다. 모델 호출이 없어 즉시·무료이고, 같은 원국은 늘 같은 풀이다.
 *
 * - 일간(日干) 10종의 성향: 전통적인 자연물 비유(甲 큰 나무, 丙 태양 …)
 * - 오행 분포: 원국 8자(시주 미상이면 6자)에서 각 오행이 차지하는 비율로 없음·약함·알맞음·강함·과다를 정한다
 * - 일간 세기: 일간 외 글자 중 같은 오행(비겁)·생해 주는 오행(인성)의 비중 — 월지(月支)는 계절의 힘이 커서 2점.
 *   지장간·합충·조후는 보지 않는 간단한 추정이다 (화면에 '간단한 추정'이라고 밝힌다)
 * - 채우면 좋은 오행: 억부(抑扶) — 신약이면 인성·비겁, 신강이면 식상·재성·관성 중에서 원국에 부족한 것을 먼저
 *
 * 문화적 흥미를 위한 풀이다 — 의료·법률·재정 조언을 하지 않는다.
 */

// ─── 오행의 관계 ─────────────────────────────────────────────

/** 상생 순서(木→火→土→金→水)에서의 위치 */
const position = (element: FiveElement) => FIVE_ELEMENTS.indexOf(element);
const shift = (element: FiveElement, steps: number): FiveElement =>
  FIVE_ELEMENTS[(position(element) + steps) % FIVE_ELEMENTS.length];

/** element가 생(生)해 주는 오행 — 木生火 */
export const generates = (element: FiveElement) => shift(element, 1);
/** element를 생해 주는 오행 — 水生木 */
export const generatedBy = (element: FiveElement) => shift(element, 4);
/** element가 극(剋)하는 오행 — 木剋土 */
export const controls = (element: FiveElement) => shift(element, 2);
/** element를 극하는 오행 — 金剋木 */
export const controlledBy = (element: FiveElement) => shift(element, 3);

// ─── 풀이 문구 ───────────────────────────────────────────────

interface ElementText {
  qualities: string;
  virtue: string;
  excess: string;
  deficiency: string;
  tip: Omit<ElementTip, "element">;
}

const ELEMENT_TEXT: Record<FiveElement, ElementText> = {
  wood: {
    qualities: "growth, vision and kindness",
    virtue: "Benevolence 仁",
    excess: "stubbornness or taking on too much at once",
    deficiency: "starting new things and planning ahead may take extra effort",
    tip: {
      colors: "Green and teal",
      direction: "East",
      season: "Spring",
      activities: "Time among trees, learning something new, morning walks",
    },
  },
  fire: {
    qualities: "passion, warmth and self-expression",
    virtue: "Courtesy 禮",
    excess: "impatience or burning out",
    deficiency:
      "showing enthusiasm and putting yourself forward may feel harder",
    tip: {
      colors: "Red, orange and purple",
      direction: "South",
      season: "Summer",
      activities:
        "Sunlight, exercise that gets your heart pumping, sharing your work",
    },
  },
  earth: {
    qualities: "stability, patience and trust",
    virtue: "Trust 信",
    excess: "resistance to change or overthinking",
    deficiency: "staying grounded and consistent may take extra effort",
    tip: {
      colors: "Yellow, beige and earth tones",
      direction: "Center",
      season: "The turn of each season",
      activities:
        "Cooking, gardening or pottery, steady daily routines, hiking",
    },
  },
  metal: {
    qualities: "focus, principle and decisiveness",
    virtue: "Righteousness 義",
    excess: "rigidity or being too critical",
    deficiency: "setting boundaries and making clear decisions may feel harder",
    tip: {
      colors: "White, silver and gold",
      direction: "West",
      season: "Autumn",
      activities:
        "Decluttering, clear goals, structured practice such as music or martial arts",
    },
  },
  water: {
    qualities: "wisdom, flexibility and intuition",
    virtue: "Wisdom 智",
    excess: "restlessness or worry",
    deficiency: "slowing down to reflect may take conscious effort",
    tip: {
      colors: "Black, navy and deep blue",
      direction: "North",
      season: "Winter",
      activities: "Reading, journaling, swimming, rest and quiet reflection",
    },
  },
};

type StemText = Pick<
  DayMasterProfile,
  "image" | "imageKo" | "summary" | "strengths" | "challenges"
>;

const DAY_MASTER_TEXT: Record<HeavenlyStem, StemText> = {
  gap: {
    image: "The Great Tree",
    imageKo: "큰 나무",
    summary:
      "Upright and forward-looking, you grow steadily toward your goals and give shelter to the people around you. Others see you as principled and dependable — a natural pillar in any group.",
    strengths: [
      "Principled and honest",
      "A natural leader and protector",
      "A steady, long-term view",
    ],
    challenges: [
      "Can be stubborn once your mind is made up",
      "Finds it hard to bend or ask for help",
    ],
  },
  eul: {
    image: "The Flower & Vine",
    imageKo: "화초 · 덩굴",
    summary:
      "Graceful and adaptable, you find a way around obstacles the way a vine finds the light. You connect people easily and bring charm and creativity wherever you go.",
    strengths: [
      "Flexible and resilient",
      "Warm, sociable and diplomatic",
      "An eye for beauty and style",
    ],
    challenges: [
      "May avoid conflict or hard decisions",
      "Can lean too much on others’ approval",
    ],
  },
  byeong: {
    image: "The Sun",
    imageKo: "태양",
    summary:
      "Warm, generous and hard to ignore, you light up the people around you. You speak your mind, love to share and lift others with your optimism.",
    strengths: [
      "Radiant, optimistic energy",
      "Generous and open-hearted",
      "A confident communicator",
    ],
    challenges: [
      "Can be impatient or blunt",
      "Tends to overcommit and burn out",
    ],
  },
  jeong: {
    image: "The Candle",
    imageKo: "촛불 · 등불",
    summary:
      "Like a candle in a dark room, you give off a steady, focused warmth. You notice what others miss, care deeply and inspire quietly rather than loudly.",
    strengths: [
      "Perceptive and thoughtful",
      "Devoted and caring",
      "Focused, careful effort",
    ],
    challenges: ["Sensitive to criticism", "Prone to overthinking"],
  },
  mu: {
    image: "The Mountain",
    imageKo: "큰 산",
    summary:
      "Solid and calm, you are the mountain others lean on. You keep your word, move at your own pace and stay steady when everything around you shifts.",
    strengths: [
      "Dependable and trustworthy",
      "Patient under pressure",
      "Protective of the people you love",
    ],
    challenges: ["Slow to embrace change", "Keeps feelings to yourself"],
  },
  gi: {
    image: "The Garden Soil",
    imageKo: "기름진 땅",
    summary:
      "Nurturing and practical, you help people and ideas grow like rich soil in a garden. You are resourceful, detail-minded and quietly generous.",
    strengths: [
      "Nurturing and supportive",
      "Practical and resourceful",
      "Attentive to what others need",
    ],
    challenges: ["Worries over details", "May put everyone else first"],
  },
  gyeong: {
    image: "The Sword",
    imageKo: "쇠 · 칼",
    summary:
      "Bold and decisive, you cut through confusion and act on your convictions. You value justice and loyalty, and you rise to a challenge.",
    strengths: [
      "Decisive and courageous",
      "A strong sense of justice",
      "Loyal to your people",
    ],
    challenges: ["Can come across as harsh", "Hard-headed in disagreements"],
  },
  sin: {
    image: "The Jewel",
    imageKo: "보석",
    summary:
      "Refined and sharp-minded, you shine through quality and detail, like a polished gem. You have high standards, a strong sense of beauty and a quick wit.",
    strengths: [
      "Refined taste and elegance",
      "A sharp, analytical mind",
      "High standards",
    ],
    challenges: [
      "Self-critical and perfectionist",
      "Easily hurt by harsh words",
    ],
  },
  im: {
    image: "The Ocean",
    imageKo: "큰 바다",
    summary:
      "Expansive and free-spirited, you move like a great river — full of ideas, curious about the world and able to find a way through anything.",
    strengths: [
      "A big-picture thinker",
      "Adaptable and resourceful",
      "Curious and open-minded",
    ],
    challenges: ["Restless with routine", "Can be hard to pin down"],
  },
  gye: {
    image: "The Rain & Dew",
    imageKo: "비 · 이슬",
    summary:
      "Gentle and intuitive, you nourish others quietly, like rain that brings a garden to life. You read people well and have a rich inner world.",
    strengths: [
      "Intuitive and empathetic",
      "Imaginative and perceptive",
      "Gentle but persistent",
    ],
    challenges: ["Prone to anxiety", "Can be swayed by others’ moods"],
  },
};

// ─── 계산 ────────────────────────────────────────────────────

interface ChartCharacter {
  element: FiveElement;
  /** 일간 세기 가중치 — 월지는 2 */
  weight: number;
  isDayStem: boolean;
}

function chartCharacters(reading: SajuReading): ChartCharacter[] {
  const { year, month, day, hour } = reading.chart;
  const characters: ChartCharacter[] = [];
  const add = (
    pillar: typeof year,
    { stemWeight = 1, branchWeight = 1, isDay = false } = {},
  ) => {
    characters.push({
      element: HEAVENLY_STEMS[stemIndexOf(pillar.stem)].element,
      weight: stemWeight,
      isDayStem: isDay,
    });
    characters.push({
      element: EARTHLY_BRANCHES[branchIndexOf(pillar.branch)].element,
      weight: branchWeight,
      isDayStem: false,
    });
  };
  add(year);
  add(month, { branchWeight: 2 });
  add(day, { isDay: true });
  if (hour) add(hour);
  return characters;
}

export function elementLevel(count: number, total: number): ElementLevel {
  if (count === 0) return "missing";
  const share = count / total;
  if (share <= 0.13) return "low"; // 8자 중 1자
  if (share <= 0.26) return "balanced"; // 8자 중 2자 · 6자 중 1자
  if (share <= 0.4) return "strong"; // 8자 중 3자 · 6자 중 2자
  return "dominant";
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

function elementSummary(level: ElementLevel, text: ElementText): string {
  switch (level) {
    case "missing":
      return `Not in your chart — ${text.deficiency}.`;
    case "low":
      return `Lightly present — ${text.qualities} may take a little more effort.`;
    case "balanced":
      return `In good balance — ${text.qualities} come naturally to you.`;
    case "strong":
      return `A clear strength — ${text.qualities} stand out in you.`;
    case "dominant":
      return `Dominant — ${text.qualities} define you, though too much can mean ${text.excess}.`;
  }
}

/** "Wood", "Wood and Fire", "Wood, Fire and Water" */
function listElements(elements: FiveElement[]): string {
  const labels = elements.map(
    (element) =>
      `${FIVE_ELEMENT_META[element].label} (${FIVE_ELEMENT_META[element].hanja})`,
  );
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function strengthOf(characters: ChartCharacter[], dayElement: FiveElement) {
  const others = characters.filter((character) => !character.isDayStem);
  const supporting = new Set([dayElement, generatedBy(dayElement)]);
  const total = others.reduce((sum, character) => sum + character.weight, 0);
  const support = others
    .filter((character) => supporting.has(character.element))
    .reduce((sum, character) => sum + character.weight, 0);
  const ratio = support / total;
  const level: DayMasterStrength =
    ratio >= 0.6 ? "strong" : ratio <= 0.3 ? "weak" : "balanced";
  return { level, support, total };
}

/**
 * 채우면 좋은 오행 (최대 2개).
 * 신약: 생해 주는 오행(인성) · 같은 오행(비겁) / 신강: 설기하는 식상 · 재성 · 관성 / 중화: 부족한 오행.
 * 후보 중 원국에 없거나 약한 것을 먼저, 이미 과다한 오행은 뺀다.
 */
function balancingElements(
  level: DayMasterStrength,
  dayElement: FiveElement,
  insights: ElementInsight[],
): FiveElement[] {
  const byElement = new Map(
    insights.map((insight) => [insight.element, insight]),
  );
  // 원국에 이미 강하거나 과다한 오행은 권하지 않는다 ("강하다"와 "더 채워라"가 한 화면에 함께 나오지 않게)
  const alreadyStrong = (element: FiveElement) => {
    const level = byElement.get(element)!.level;
    return level === "strong" || level === "dominant";
  };
  const lackingFirst = (candidates: FiveElement[]) =>
    candidates
      .map((element, order) => ({
        element,
        order,
        count: byElement.get(element)!.count,
      }))
      .filter(({ element }) => !alreadyStrong(element))
      .sort((a, b) => a.count - b.count || a.order - b.order)
      .map(({ element }) => element);

  if (level === "weak") {
    return lackingFirst([generatedBy(dayElement), dayElement]).slice(0, 2);
  }
  if (level === "strong") {
    return lackingFirst([
      generates(dayElement),
      controls(dayElement),
      controlledBy(dayElement),
    ]).slice(0, 2);
  }
  return insights
    .filter((insight) => insight.level === "missing" || insight.level === "low")
    .sort((a, b) => a.count - b.count)
    .map((insight) => insight.element)
    .slice(0, 2);
}

// ─── 풀이 ────────────────────────────────────────────────────

export function analyzeSaju(reading: SajuReading): SajuAnalysis {
  const characters = chartCharacters(reading);
  const total = characters.length;
  const { dayMaster } = reading;
  const stemText = DAY_MASTER_TEXT[dayMaster.stem];
  const stem = HEAVENLY_STEMS[stemIndexOf(dayMaster.stem)];

  const elements: ElementInsight[] = FIVE_ELEMENTS.map((element) => {
    const count = reading.elementBalance[element];
    const level = elementLevel(count, total);
    const text = ELEMENT_TEXT[element];
    return {
      element,
      count,
      share: Math.round((count / total) * 1000) / 1000,
      level,
      qualities: text.qualities,
      virtue: text.virtue,
      summary: elementSummary(level, text),
    };
  });

  const maxCount = Math.max(...elements.map((insight) => insight.count));
  const dominant = elements
    .filter(
      (insight) =>
        insight.count === maxCount &&
        (insight.level === "strong" || insight.level === "dominant"),
    )
    .map((insight) => insight.element);
  const missing = elements
    .filter((insight) => insight.level === "missing")
    .map((i) => i.element);
  const low = elements
    .filter((insight) => insight.level === "low")
    .map((i) => i.element);
  const lacking = [...missing, ...low];

  const strength = strengthOf(characters, dayMaster.element);
  const dayLabel = FIVE_ELEMENT_META[dayMaster.element].label;
  const strengthSummary =
    strength.level === "strong"
      ? `Your day master draws support from ${strength.support} of ${strength.total} points in your chart, so you have plenty of drive and self-belief — you thrive when you channel that energy outward.`
      : strength.level === "weak"
        ? `Your day master draws support from only ${strength.support} of ${strength.total} points in your chart, so you do best with good allies, steady routines and time to recharge.`
        : `Your day master is well supported (${strength.support} of ${strength.total} points), which helps you adapt to very different people and situations.`;

  const { yang, yin } = reading.yinYang;
  const tendency =
    yang - yin >= 2 ? "yang" : yin - yang >= 2 ? "yin" : "balanced";
  const yinYangSummary =
    tendency === "yang"
      ? "More yang than yin gives you an outgoing, action-first style."
      : tendency === "yin"
        ? "More yin than yang gives you a reflective, receptive style."
        : "Yin and yang are in balance, so you move easily between action and reflection.";

  const balancing = balancingElements(
    strength.level,
    dayMaster.element,
    elements,
  );
  const balancingSummary =
    balancing.length === 0
      ? lacking.length === 0
        ? "Your five elements are evenly spread — keep doing what keeps you centered."
        : "The elements that balance your chart are already well represented — lean on them."
      : strength.level === "weak"
        ? `Because your ${dayLabel} day master is on the gentle side, ${listElements(balancing)} ${balancing.length > 1 ? "bring" : "brings"} it support and balance.`
        : strength.level === "strong"
          ? `Because your ${dayLabel} day master is strong, ${listElements(balancing)} ${balancing.length > 1 ? "give" : "gives"} that energy somewhere to flow.`
          : `Your chart is light on ${listElements(balancing)}, so bringing ${balancing.length > 1 ? "them" : "it"} in helps round you out.`;

  const distribution =
    dominant.length > 0
      ? `${listElements(dominant)} ${dominant.length > 1 ? "lead" : "leads"} your chart${
          missing.length > 0
            ? `, while ${listElements(missing)} ${missing.length > 1 ? "are" : "is"} missing entirely`
            : low.length > 0
              ? `, while ${listElements(low)} ${low.length > 1 ? "are" : "is"} only lightly present`
              : ""
        }.`
      : missing.length > 0
        ? `Your elements are fairly evenly spread, though ${listElements(missing)} ${missing.length > 1 ? "are" : "is"} missing.`
        : "Your five elements are spread evenly — a well-rounded chart.";

  const overview = [
    `You were born as ${dayMaster.hanja} ${capitalize(dayMaster.yinYang)} ${dayLabel} — ${stemText.image.replace(/^The /, "the ")}. ${stemText.summary}`,
    distribution,
    strengthSummary,
    yinYangSummary,
    balancing.length > 0
      ? `Bringing in more ${listElements(balancing)} — through colors, places and habits — can help you feel more centered.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    dayMaster: {
      stem: dayMaster.stem,
      hanja: dayMaster.hanja,
      hangul: stem.hangul,
      element: dayMaster.element,
      yinYang: dayMaster.yinYang,
      ...stemText,
    },
    strength: { ...strength, summary: strengthSummary },
    elements,
    dominant,
    lacking,
    yinYang: { yang, yin, tendency, summary: yinYangSummary },
    balancing: {
      elements: balancing,
      summary: balancingSummary,
      tips: balancing.map((element) => ({
        element,
        ...ELEMENT_TEXT[element].tip,
      })),
    },
    overview,
  };
}
