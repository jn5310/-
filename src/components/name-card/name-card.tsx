import type { Ref } from "react";

import { DAY_MASTER_IMAGES } from "@/lib/saju/day-master";
import { FIVE_ELEMENT_META, FIVE_ELEMENTS } from "@/lib/saju/five-elements";
import {
  NAME_CARD_FONT_FAMILIES,
  NAME_CARD_HEIGHT,
  NAME_CARD_WIDTH,
} from "@/lib/name-card/constants";
import { fitText } from "@/lib/name-card/text-fit";
import type { GeneratedName } from "@/types/api";
import type { FiveElement, SajuReading } from "@/types/saju";

/*
 * 이름 카드 — SNS에 올리는 한 장짜리 이미지 (360 × 450, 저장할 때 3배 = 1080 × 1350 · 인스타그램 4:5).
 *
 * 이미지로 굳히는 아트보드라 픽셀 단위 인라인 스타일로 그린다 (공유 이미지 opengraph-image.tsx와 같은 방식).
 * 화면에 보이는 카드를 html-to-image가 그대로 PNG로 바꾸므로 화면과 파일이 같다.
 *
 * 글꼴: 저장할 때는 카드에 나오는 글자만 담은 서브셋 폰트(KNS Card Serif/Sans)를 이미지 안에 넣고,
 * 화면에서는 그 이름이 없으니 사이트의 Noto Serif KR · Noto Sans KR로 그린다 — 같은 글꼴이라 모양이 같다.
 * 글자 크기는 정수 px로 둔다 — html-to-image는 글자 크기를 정수로 내린 뒤 0.1px 줄여 옮기므로(9 → 8.9px),
 *   소수 크기(8.5 → 7.9px)는 이미지에서만 눈에 띄게 작아진다.
 * 긴 글(한 줄 뜻·한자 뜻)은 CSS 말줄임 대신 fitText로 미리 잘라 화면과 이미지가 같게 한다.
 * 개인 정보(영문 이름·생년월일)는 싣지 않는다.
 */

const COLORS = {
  paper: "#f6f1e7",
  ink: "#1e1b18",
  inkSoft: "#4b443c",
  inkMuted: "#756b5f",
  vermilion: "#b3372b",
  ochre: "#82601f",
} as const;

/** 오방색 — 사이트 테마(globals.css)와 같은 값 */
const ELEMENT_COLORS: Record<FiveElement, { fill: string; text: string }> = {
  wood: { fill: "#2f6f5e", text: COLORS.paper },
  fire: { fill: "#b3372b", text: COLORS.paper },
  earth: { fill: "#c9962b", text: COLORS.ink },
  metal: { fill: "#e4ddcf", text: COLORS.ink },
  water: { fill: "#1e1b18", text: COLORS.paper },
};

const SERIF = `"${NAME_CARD_FONT_FAMILIES.serif}", var(--font-noto-serif-kr), ui-serif, Georgia, serif`;
const SANS = `"${NAME_CARD_FONT_FAMILIES.sans}", var(--font-noto-sans-kr), ui-sans-serif, system-ui, sans-serif`;

/** 두 겹 테두리 안쪽 여백 — 글 상자 폭 계산에 쓴다 */
const FRAME_INSET = 15;
const CONTENT_PADDING_X = 22;
const CONTENT_WIDTH = NAME_CARD_WIDTH - 2 * (FRAME_INSET + CONTENT_PADDING_X);
const HANJA_GAP = 6;
const SUMMARY_WIDTH = 262;

const SAEKDONG =
  "linear-gradient(90deg, #c8423a 0 16.66%, #e2b33c 16.66% 33.33%, #3f8a5a 33.33% 50%, #2f5d9a 50% 66.66%, #f3eee4 66.66% 83.33%, #d67a9c 83.33% 100%)";

export interface NameCardProps {
  name: GeneratedName;
  /** 이름으로 채운 오행 (용신·희신) */
  favorableElements: FiveElement[];
  saju: SajuReading;
  /** 도장 PNG (data URL) — 아직 그리지 못했으면 null */
  sealSrc: string | null;
  /** 카드 아래에 적는 사이트 주소 (예: kname.studio) — 이미지만 퍼져도 찾아올 수 있게 */
  siteHost: string;
  ref?: Ref<HTMLDivElement>;
}

export function NameCard({
  name,
  favorableElements,
  saju,
  sealSrc,
  siteHost,
  ref,
}: NameCardProps) {
  const syllables = Array.from(name.hangul).length;
  const nameSize = syllables <= 2 ? 60 : syllables === 3 ? 54 : 44;
  const dayMaster = DAY_MASTER_IMAGES[saju.dayMaster.stem];
  const columns = Math.max(name.characters.length, 1);
  const columnWidth = (CONTENT_WIDTH - HANJA_GAP * (columns - 1)) / columns;
  const summary = fitText(name.summary, {
    font: "serif",
    fontSize: 9,
    width: SUMMARY_WIDTH,
    maxLines: 3,
    before: "“",
    after: "”",
  });

  return (
    <div
      ref={ref}
      data-name-card=""
      role="img"
      aria-label={`Name card: ${name.hangul} (${name.hanja}), ${name.romanization} — K-Name Studio`}
      style={{
        position: "relative",
        width: NAME_CARD_WIDTH,
        height: NAME_CARD_HEIGHT,
        flexShrink: 0,
        overflow: "hidden",
        color: COLORS.ink,
        fontFamily: SANS,
        backgroundColor: COLORS.paper,
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(130, 96, 31, 0.16), rgba(246, 241, 231, 0) 55%), radial-gradient(circle at 100% 100%, rgba(179, 55, 43, 0.1), rgba(246, 241, 231, 0) 50%)",
      }}
    >
      {/* 두 겹 테두리 · 워터마크 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 10,
          border: `1.5px solid ${COLORS.vermilion}`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 15,
          border: "0.75px solid rgba(30, 27, 24, 0.28)",
        }}
      />
      <span
        aria-hidden="true"
        lang="ko"
        style={{
          position: "absolute",
          right: -6,
          bottom: 30,
          fontFamily: SERIF,
          fontSize: 150,
          lineHeight: 1,
          color: "rgba(30, 27, 24, 0.035)",
        }}
      >
        名
      </span>

      <div
        style={{
          position: "absolute",
          inset: FRAME_INSET,
          display: "flex",
          flexDirection: "column",
          padding: `22px ${CONTENT_PADDING_X}px 18px`,
        }}
      >
        {/* 머리 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                display: "block",
                width: 60,
                height: 3,
                backgroundImage: SAEKDONG,
              }}
            />
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.3em",
                lineHeight: 1,
                color: COLORS.vermilion,
              }}
            >
              MY KOREAN NAME
            </span>
          </div>
          <span
            lang="ko"
            style={{
              fontFamily: SERIF,
              fontSize: 9,
              letterSpacing: "0.3em",
              lineHeight: 1,
              color: COLORS.ochre,
            }}
          >
            나의 한국 이름
          </span>
        </div>

        {/* 이름 */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <span
            lang="ko"
            style={{
              fontFamily: SERIF,
              fontSize: nameSize,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "0.14em",
              // 자간이 마지막 글자 뒤에도 붙어 왼쪽으로 쏠리는 것을 바로잡는다
              paddingLeft: "0.14em",
              color: COLORS.ink,
            }}
          >
            {name.hangul}
          </span>
          <span
            style={{
              marginTop: 9,
              fontFamily: SERIF,
              fontSize: 15,
              lineHeight: 1.2,
              color: COLORS.inkSoft,
            }}
          >
            {name.romanization}
          </span>
        </div>

        {/* 한자 풀이 */}
        <ol
          style={{
            margin: "14px 0 0",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: HANJA_GAP,
          }}
        >
          {name.characters.map((character, index) => (
            <li
              key={`${character.hanja}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span
                lang="ko"
                style={{
                  fontFamily: SERIF,
                  fontSize: 26,
                  lineHeight: 1,
                  color: COLORS.ink,
                }}
              >
                {character.hanja}
              </span>
              <span
                lang="ko"
                style={{
                  marginTop: 5,
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: COLORS.inkSoft,
                }}
              >
                {character.hangul}
              </span>
              <span
                style={{
                  marginTop: 2,
                  fontSize: 8,
                  lineHeight: 1.35,
                  color: COLORS.inkMuted,
                  overflowWrap: "anywhere",
                }}
              >
                {fitText(character.meaning, {
                  font: "sans",
                  fontSize: 8,
                  width: columnWidth,
                  maxLines: 2,
                })}
              </span>
            </li>
          ))}
        </ol>

        {/* 한 줄 뜻 */}
        <p
          style={{
            margin: "12px auto 0",
            maxWidth: SUMMARY_WIDTH,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: 9,
            fontStyle: "italic",
            lineHeight: 1.5,
            color: COLORS.inkSoft,
            overflowWrap: "anywhere",
          }}
        >
          {summary}
        </p>

        {/* 사주 오행 · 도장 */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 14,
            paddingTop: 11,
            borderTop: "0.75px solid rgba(30, 27, 24, 0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              minWidth: 0,
              flexDirection: "column",
              gap: 7,
            }}
          >
            <span
              style={{
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: "0.26em",
                lineHeight: 1,
                color: COLORS.inkMuted,
              }}
            >
              SAJU FIVE ELEMENTS{" "}
              <span lang="ko" style={{ letterSpacing: "0.12em" }}>
                · 사주 오행
              </span>
            </span>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                gap: 6,
              }}
            >
              {FIVE_ELEMENTS.map((element) => (
                <ElementChip
                  key={element}
                  element={element}
                  count={saju.elementBalance[element]}
                  favorable={favorableElements.includes(element)}
                />
              ))}
            </ul>
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontSize: 9,
                lineHeight: 1.35,
                color: COLORS.inkSoft,
              }}
            >
              <span>
                Day master{" "}
                <strong
                  lang="ko"
                  style={{ fontFamily: SERIF, color: COLORS.ink }}
                >
                  {saju.dayMaster.hanja}
                </strong>{" "}
                · {dayMaster.image}
              </span>
              {favorableElements.length > 0 ? (
                <span>
                  Balanced with{" "}
                  <strong style={{ color: COLORS.ink }}>
                    {listElements(favorableElements)}
                  </strong>
                </span>
              ) : null}
            </span>
          </div>

          <div
            aria-hidden="true"
            data-name-card-seal=""
            style={{
              width: 78,
              height: 78,
              flexShrink: 0,
              transform: "rotate(-4deg)",
              backgroundImage: sealSrc ? `url("${sealSrc}")` : "none",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>

        {/* 로고 · 주소 */}
        <div
          style={{
            marginTop: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              aria-hidden="true"
              lang="ko"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: 5,
                transform: "rotate(-3deg)",
                backgroundColor: COLORS.vermilion,
                color: COLORS.paper,
                fontFamily: SERIF,
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              名
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: COLORS.ink,
                }}
              >
                K-Name Studio
              </span>
              <span
                lang="ko"
                style={{
                  fontSize: 7,
                  letterSpacing: "0.26em",
                  lineHeight: 1,
                  color: COLORS.inkMuted,
                }}
              >
                한국 이름 공방
              </span>
            </span>
          </div>
          <span
            style={{
              display: "flex",
              minWidth: 0,
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            }}
          >
            <span
              style={{ fontSize: 7, lineHeight: 1, color: COLORS.inkMuted }}
            >
              Find yours at
            </span>
            <span
              style={{
                maxWidth: 170,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                lineHeight: 1.1,
                color: COLORS.inkSoft,
              }}
            >
              {siteHost}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ElementChip({
  element,
  count,
  favorable,
}: {
  element: FiveElement;
  count: number;
  favorable: boolean;
}) {
  const color = ELEMENT_COLORS[element];
  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span
        lang="ko"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: color.fill,
          color: color.text,
          fontFamily: SERIF,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          opacity: count === 0 ? 0.32 : 1,
          // 이름으로 채운 오행은 고리를 두른다 · 금(金)은 바탕과 비슷해 가는 테두리를 더한다
          boxShadow: favorable
            ? `0 0 0 1.5px ${COLORS.paper}, 0 0 0 2.75px ${element === "metal" ? COLORS.inkMuted : color.fill}`
            : element === "metal"
              ? "inset 0 0 0 0.75px rgba(30, 27, 24, 0.3)"
              : "none",
        }}
      >
        {FIVE_ELEMENT_META[element].hanja}
      </span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          lineHeight: 1,
          color: COLORS.inkSoft,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
    </li>
  );
}

/** "Water 水", "Water 水 & Wood 木", "Water 水, Wood 木 & Fire 火" */
function listElements(elements: FiveElement[]): string {
  const labels = elements.map(
    (element) =>
      `${FIVE_ELEMENT_META[element].label} ${FIVE_ELEMENT_META[element].hanja}`,
  );
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}
