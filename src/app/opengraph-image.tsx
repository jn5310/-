import { ImageResponse } from "next/og";

import { isPaywallEnabled } from "@/lib/monetization";
import { formatPrice, PREMIUM_OFFER } from "@/lib/pricing";
import { OG_FONT_FAMILY, loadOgFonts } from "@/server/og/fonts";

/*
 * 공유 카드 이미지 (1200 × 630) — 카카오톡·X·페이스북·슬랙 미리보기와 검색 결과 썸네일에 쓰인다.
 * 빌드할 때 한 번 만들어 둔다. 사이트 전체가 이 이미지를 쓴다.
 */

export const alt = "K-Name Studio — the Korean name you were born for";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPY = {
  brand: "K-NAME STUDIO",
  headlineTop: "The Korean name",
  headlineBottom: "you were born for.",
  features: "From your Saju · Meaningful Hanja · Korean seal",
  // 첫 화면의 예시 이름 카드와 같은 이름 (홍길동 · 洪吉童)
  hangul: "홍길동",
  hanja: "洪吉童",
  romanization: "Hong Gil-dong",
  seal: "名",
  studio: "한국 이름 공방",
} as const;

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

export default async function OpenGraphImage() {
  // 무료 개방 중(페이월 꺼짐)에는 가격 대신 "무료"를 내세운다 — 빌드할 때 한 번 정해진다
  const offer = isPaywallEnabled()
    ? `Free preview · Full reading ${formatPrice(PREMIUM_OFFER)}`
    : "100% free · No sign-up";
  const fonts = await loadOgFonts(Object.values(COPY).join(""));
  // 한글 폰트를 받지 못했으면 한글·한자 없이 그린다 (네모 상자로 깨지지 않게)
  const korean = fonts.length > 0;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 28,
        backgroundColor: COLORS.paper,
        // 값이 undefined인 스타일 키는 Satori가 읽다 멈춘다 — 키 자체를 뺀다
        ...(korean ? { fontFamily: OG_FONT_FAMILY } : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: 10,
          border: `5px solid ${COLORS.vermilion}`,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "40px 60px",
            border: "1.5px solid rgba(30, 27, 24, 0.4)",
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(130, 96, 31, 0.16), rgba(246, 241, 231, 0) 60%)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
            <div style={{ display: "flex" }}>
              {SAEKDONG.map((color) => (
                <div
                  key={color}
                  style={{
                    display: "flex",
                    width: 34,
                    height: 6,
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 6,
                color: COLORS.vermilion,
              }}
            >
              {COPY.brand}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 18,
                fontSize: 66,
                fontWeight: 700,
                lineHeight: 1.1,
                color: COLORS.ink,
              }}
            >
              <div style={{ display: "flex" }}>{COPY.headlineTop}</div>
              <div style={{ display: "flex" }}>{COPY.headlineBottom}</div>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 26,
                color: COLORS.inkSoft,
              }}
            >
              {COPY.features}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 30,
                alignSelf: "flex-start",
                padding: "10px 22px",
                borderRadius: 999,
                backgroundColor: COLORS.ink,
                color: COLORS.paper,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {offer}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 330,
              padding: "34px 24px",
              borderRadius: 28,
              border: "1px solid rgba(30, 27, 24, 0.12)",
              backgroundColor: "rgba(255, 255, 255, 0.85)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 84,
                height: 84,
                borderRadius: 18,
                backgroundColor: COLORS.vermilion,
                color: COLORS.paper,
                fontSize: korean ? 52 : 46,
                fontWeight: 700,
                transform: "rotate(-4deg)",
              }}
            >
              {korean ? COPY.seal : "K"}
            </div>
            {korean ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 92,
                  fontWeight: 700,
                  color: COLORS.ink,
                }}
              >
                {COPY.hangul}
              </div>
            ) : null}
            {korean ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  letterSpacing: 8,
                  color: COLORS.inkSoft,
                }}
              >
                {COPY.hanja}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                marginTop: korean ? 10 : 26,
                fontSize: korean ? 28 : 40,
                color: korean ? COLORS.inkMuted : COLORS.ink,
              }}
            >
              {COPY.romanization}
            </div>
            {korean ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 14,
                  fontSize: 20,
                  letterSpacing: 6,
                  color: COLORS.ochre,
                }}
              >
                {COPY.studio}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    // 빈 배열을 넘기면 기본 폰트(Geist)도 쓰지 않아 렌더링이 실패한다 — 받은 폰트가 있을 때만 넘긴다
    korean ? { ...size, fonts } : size,
  );
}
