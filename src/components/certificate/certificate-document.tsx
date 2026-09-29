import {
  Defs,
  Document,
  Image,
  Page,
  Path,
  RadialGradient,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import type { CertificateContent } from "@/lib/certificate/content";
import {
  CERTIFICATE_COLORS as COLORS,
  cornerOrnamentOrigins,
  englishNameFontSize,
  FRAME,
  meanderPath,
  PAGE_SIZE,
  paperFiberPath,
  SAEKDONG_COLORS,
} from "@/lib/certificate/design";

import type { CertificateFontFamilies } from "./certificate-fonts";

/*
 * 공식 한국어 이름 증명서 — A4 가로 한 장 (react-pdf, 벡터).
 *
 * ┌ 인주색 이중 테두리 · 번개무늬(回紋) 띠 · 모서리 亞자 장식 ─────────────┐
 * │                 名 · Official Certificate of Korean Name              │
 * │                        공식 한국어 이름 증명서                           │
 * │          This is to certify that  <영문 본명>  has been bestowed…      │
 * │                         김서윤 / 金瑞允 / Kim Seo-yun                     │
 * │        [한자 풀이]                              [사주 요약]              │
 * │  발급일 · 증명서 ID            K-Name Studio                    [도장] │
 * └──────────────────────────────────────────────────────────────────────┘
 */

export interface CertificateDocumentProps {
  content: CertificateContent;
  fonts: CertificateFontFamilies;
  /** 투명 배경 도장 PNG — 오른쪽 아래에 찍는다 (만들지 못했으면 null) */
  seal: Blob | null;
}

const W = PAGE_SIZE.width;
const H = PAGE_SIZE.height;

export function CertificateDocument({
  content,
  fonts,
  seal,
}: CertificateDocumentProps) {
  const t = content.text;
  const styles = createStyles(fonts);
  const nameSize = englishNameFontSize(content.englishName);

  return (
    <Document
      title={`${t.title} — ${content.romanization}`}
      author={t.issuer}
      subject={`${content.hangul} (${content.hanja}) · ${content.englishName}`}
      keywords="Korean name, Saju, Hanja, certificate"
      creator={t.issuer}
      producer={t.issuer}
      language="en"
    >
      <Page size="A4" orientation="landscape" wrap={false} style={styles.page}>
        <PaperTexture seed={content.certificateId} />
        <Text style={styles.watermark}>{t.watermark}</Text>
        <Frame />

        <View style={styles.body}>
          {/* 머리글 */}
          <View style={styles.saekdong}>
            {SAEKDONG_COLORS.map((color) => (
              <View
                key={color}
                style={[styles.saekdongStripe, { backgroundColor: color }]}
              />
            ))}
          </View>
          <View style={styles.emblem}>
            <Text style={styles.emblemText}>{t.emblem}</Text>
          </View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
          <Divider />

          {/* 영문 본명 → 한국 이름 */}
          <Text style={styles.lead}>{t.certifies}</Text>
          <Text style={[styles.englishName, { fontSize: nameSize }]}>
            {content.englishName}
          </Text>
          <Text style={styles.lead}>{t.bestowed}</Text>

          <Text style={styles.hangul}>{content.hangul}</Text>
          <Text style={styles.hanja}>{content.hanja}</Text>
          <Text style={styles.romanization}>{content.romanization}</Text>
          <Text style={styles.summary}>{`“${content.summary}”`}</Text>

          {/* 한자 풀이 · 사주 요약 */}
          <View style={styles.columns}>
            <View style={styles.panel}>
              <PanelHeading
                styles={styles}
                title={t.hanjaHeading}
                hangul={t.hanjaHeadingKo}
              />
              {content.characters.map((character, index) => (
                <View
                  key={`${character.hanja}-${index}`}
                  style={styles.charRow}
                >
                  <Text style={styles.charHanja}>{character.hanja}</Text>
                  <Text style={styles.charHangul}>{character.hangul}</Text>
                  <Text style={styles.charMeaning}>
                    {character.meaning}
                    {character.isSurname ? (
                      <Text
                        style={styles.charNote}
                      >{`  (${t.surnameLabel})`}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.charElement}>{character.element}</Text>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <PanelHeading
                styles={styles}
                title={t.sajuHeading}
                hangul={t.sajuHeadingKo}
              />
              <View style={styles.pillars}>
                {content.pillars.map((pillar) => (
                  <View key={pillar.label} style={styles.pillar}>
                    <Text style={styles.pillarLabel}>
                      {`${pillar.label.toUpperCase()} ${pillar.labelHanja}`}
                    </Text>
                    <Text
                      style={
                        pillar.hanja ? styles.pillarValue : styles.pillarMissing
                      }
                    >
                      {pillar.hanja ?? t.missing}
                    </Text>
                    <Text style={styles.pillarHangul}>
                      {pillar.hangul ?? t.hourUnknown}
                    </Text>
                  </View>
                ))}
              </View>
              <Fact
                styles={styles}
                label={t.dayMasterLabel}
                value={content.dayMaster}
              />
              {content.favorable ? (
                <Fact
                  styles={styles}
                  label={t.favorableLabel}
                  value={content.favorable}
                />
              ) : null}
              <Fact
                styles={styles}
                label={t.balanceLabel}
                value={content.balance}
              />
              {content.sajuExcerpt ? (
                <Text style={styles.excerpt}>{content.sajuExcerpt}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 발급 정보 · 발급처 */}
        <View style={styles.footer}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerLabel}>
              {t.issuedLabel.toUpperCase()}
            </Text>
            <Text style={styles.footerValue}>{content.issuedOn}</Text>
            <Text style={[styles.footerLabel, { marginTop: 6 }]}>
              {t.idLabel.toUpperCase()}
            </Text>
            <Text style={styles.footerId}>{content.certificateId}</Text>
          </View>
          <View style={[styles.footerColumn, styles.footerCenter]}>
            <Text style={styles.issuer}>{t.issuer}</Text>
            <View style={styles.signatureLine} />
            <Text
              style={styles.issuerNote}
            >{`${t.issuedBy} ${t.issuer} ${t.separator} ${t.issuerKo}`}</Text>
          </View>
          <View style={styles.footerColumn} />
        </View>

        {/* 오른쪽 아래 도장 — 손으로 찍은 듯 살짝 기울인다 */}
        {seal ? <Image src={seal} style={styles.seal} /> : null}

        <Text style={styles.disclaimer}>{t.disclaimer}</Text>
      </Page>
    </Document>
  );
}

// ─── 조각 ────────────────────────────────────────────────────

type Styles = ReturnType<typeof createStyles>;

function PanelHeading({
  styles,
  title,
  hangul,
}: {
  styles: Styles;
  title: string;
  hangul: string;
}) {
  return (
    <View style={styles.panelHeading}>
      <Text style={styles.panelTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.panelTitleKo}>{hangul}</Text>
    </View>
  );
}

function Fact({
  styles,
  label,
  value,
}: {
  styles: Styles;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return (
    <Svg width={170} height={10} style={{ marginTop: 7 }}>
      <Path d="M0 5 H74 M96 5 H170" stroke={COLORS.ochre} strokeWidth={0.8} />
      <Path d="M85 1 L89 5 L85 9 L81 5 Z" fill={COLORS.ochre} />
    </Svg>
  );
}

/** 한지: 가장자리로 갈수록 짙어지는 빛 + 결 따라 흩어진 닥나무 섬유 (증명서 ID로 고정된 무늬) */
function PaperTexture({ seed }: { seed: string }) {
  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <RadialGradient
          id="paper-vignette"
          cx={W / 2}
          cy={H / 2}
          r={W * 0.62}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={COLORS.paper} stopOpacity={0} />
          <Stop offset={0.7} stopColor={COLORS.paperEdge} stopOpacity={0.35} />
          <Stop offset={1} stopColor={COLORS.paperEdge} stopOpacity={0.9} />
        </RadialGradient>
        <RadialGradient
          id="ochre-glow"
          cx={1}
          cy={1}
          r={W * 0.55}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={COLORS.ochre} stopOpacity={0.12} />
          <Stop offset={1} stopColor={COLORS.ochre} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id="vermilion-glow"
          cx={W - 1}
          cy={1}
          r={W * 0.45}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={COLORS.vermilion} stopOpacity={0.08} />
          <Stop offset={1} stopColor={COLORS.vermilion} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#paper-vignette)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#ochre-glow)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#vermilion-glow)" />
      <Path
        d={paperFiberPath(seed)}
        fill="none"
        stroke={COLORS.fiber}
        strokeWidth={0.35}
        strokeOpacity={0.22}
      />
    </Svg>
  );
}

/** 전통 테두리: 인주색 이중선 → 번개무늬(回紋) 띠 → 먹색 안쪽 이중선, 네 모서리에 亞자 장식 */
function Frame() {
  const { outer, outerThin, band, inner, innerThin } = FRAME;

  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Rect
        x={outer}
        y={outer}
        width={W - outer * 2}
        height={H - outer * 2}
        fill="none"
        stroke={COLORS.vermilion}
        strokeWidth={2.4}
      />
      <Rect
        x={outerThin}
        y={outerThin}
        width={W - outerThin * 2}
        height={H - outerThin * 2}
        fill="none"
        stroke={COLORS.vermilion}
        strokeWidth={0.6}
      />

      <Path
        d={meanderPath()}
        fill="none"
        stroke={COLORS.ochre}
        strokeWidth={0.8}
        strokeLinecap="square"
      />

      {cornerOrnamentOrigins().map(([x, y]) => (
        <CornerOrnament key={`${x}-${y}`} x={x} y={y} size={band} />
      ))}

      <Rect
        x={inner}
        y={inner}
        width={W - inner * 2}
        height={H - inner * 2}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={0.7}
        strokeOpacity={0.55}
      />
      <Rect
        x={innerThin}
        y={innerThin}
        width={W - innerThin * 2}
        height={H - innerThin * 2}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={0.35}
        strokeOpacity={0.35}
      />
    </Svg>
  );
}

function CornerOrnament({
  x,
  y,
  size,
}: {
  x: number;
  y: number;
  size: number;
}) {
  const inset = size * 0.25;
  const dot = size * 0.18;
  return (
    <>
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill={COLORS.paper}
        stroke={COLORS.vermilion}
        strokeWidth={0.9}
      />
      <Rect
        x={x + inset}
        y={y + inset}
        width={size - inset * 2}
        height={size - inset * 2}
        fill="none"
        stroke={COLORS.vermilion}
        strokeWidth={0.6}
      />
      <Rect
        x={x + (size - dot) / 2}
        y={y + (size - dot) / 2}
        width={dot}
        height={dot}
        fill={COLORS.vermilion}
      />
    </>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────

function createStyles(fonts: CertificateFontFamilies) {
  return StyleSheet.create({
    page: {
      backgroundColor: COLORS.paper,
      color: COLORS.ink,
      fontFamily: fonts.sans,
      fontSize: 9,
    },
    watermark: {
      position: "absolute",
      top: (H - 300) / 2,
      left: 0,
      width: W,
      textAlign: "center",
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 300,
      lineHeight: 1,
      color: COLORS.vermilion,
      opacity: 0.035,
    },
    body: {
      position: "absolute",
      top: 56,
      left: 72,
      right: 72,
      alignItems: "center",
    },
    saekdong: { flexDirection: "row", marginTop: 6 },
    saekdongStripe: { width: 22, height: 3 },
    emblem: {
      marginTop: 8,
      width: 24,
      height: 24,
      borderRadius: 5,
      backgroundColor: COLORS.vermilion,
      alignItems: "center",
      justifyContent: "center",
      transform: "rotate(-3deg)",
    },
    emblemText: {
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 14,
      lineHeight: 1,
      color: COLORS.hanji,
    },
    title: {
      marginTop: 7,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 21,
      lineHeight: 1.2,
      letterSpacing: 0.6,
      color: COLORS.ink,
    },
    subtitle: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 10.5,
      lineHeight: 1.3,
      letterSpacing: 3,
      color: COLORS.vermilion,
    },
    lead: {
      marginTop: 6,
      fontSize: 9,
      lineHeight: 1.3,
      letterSpacing: 0.5,
      color: COLORS.inkSoft,
    },
    englishName: {
      marginTop: 2,
      fontFamily: fonts.serif,
      fontWeight: 700,
      lineHeight: 1.2,
      color: COLORS.ink,
      maxLines: 1,
      textOverflow: "ellipsis",
    },
    hangul: {
      marginTop: 3,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 48,
      letterSpacing: 6,
      lineHeight: 1.12,
      color: COLORS.ink,
    },
    hanja: {
      fontFamily: fonts.serif,
      fontWeight: 400,
      fontSize: 17,
      letterSpacing: 5,
      lineHeight: 1.25,
      color: COLORS.inkSoft,
    },
    romanization: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontSize: 12,
      letterSpacing: 0.8,
      lineHeight: 1.3,
      color: COLORS.inkMuted,
    },
    summary: {
      marginTop: 4,
      maxWidth: 470,
      textAlign: "center",
      fontFamily: fonts.serif,
      fontSize: 9.5,
      lineHeight: 1.35,
      color: COLORS.ink,
      maxLines: 2,
      textOverflow: "ellipsis",
    },
    columns: {
      marginTop: 10,
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    panel: {
      width: 320,
      borderTopWidth: 0.6,
      borderTopColor: COLORS.ochre,
      paddingTop: 5,
    },
    panelHeading: {
      flexDirection: "row",
      alignItems: "flex-end",
      marginBottom: 3,
    },
    panelTitle: {
      fontWeight: 700,
      fontSize: 7,
      lineHeight: 1.2,
      letterSpacing: 1.4,
      color: COLORS.vermilion,
    },
    panelTitleKo: {
      marginLeft: 6,
      fontFamily: fonts.serif,
      fontSize: 7.5,
      lineHeight: 1.2,
      color: COLORS.inkMuted,
    },
    charRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 1.2,
      borderBottomWidth: 0.3,
      borderBottomColor: "#d9ccb4",
    },
    charHanja: {
      width: 22,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 13,
      lineHeight: 1.2,
      color: COLORS.ink,
    },
    charHangul: {
      width: 18,
      fontFamily: fonts.serif,
      fontSize: 9,
      lineHeight: 1.2,
      color: COLORS.inkSoft,
    },
    charMeaning: {
      flexGrow: 1,
      flexShrink: 1,
      fontSize: 8.5,
      lineHeight: 1.2,
      color: COLORS.ink,
      maxLines: 1,
      textOverflow: "ellipsis",
    },
    charNote: { fontSize: 7, color: COLORS.inkMuted },
    charElement: {
      width: 64,
      textAlign: "right",
      fontSize: 7.5,
      lineHeight: 1.2,
      color: COLORS.inkMuted,
    },
    pillars: { flexDirection: "row", marginBottom: 4 },
    pillar: {
      width: 50,
      marginRight: 6,
      paddingVertical: 2,
      alignItems: "center",
      borderWidth: 0.4,
      borderColor: "#d9ccb4",
      borderRadius: 3,
      backgroundColor: "#f8f2e6",
    },
    pillarLabel: {
      fontSize: 5.5,
      lineHeight: 1.2,
      letterSpacing: 0.6,
      color: COLORS.inkMuted,
    },
    pillarValue: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 12,
      lineHeight: 1.2,
      color: COLORS.ink,
    },
    pillarMissing: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontSize: 12,
      lineHeight: 1.2,
      color: COLORS.inkMuted,
    },
    pillarHangul: { fontSize: 5.5, lineHeight: 1.2, color: COLORS.inkMuted },
    fact: { flexDirection: "row", marginTop: 1.5 },
    factLabel: {
      width: 64,
      fontSize: 7,
      lineHeight: 1.3,
      color: COLORS.inkMuted,
    },
    factValue: {
      flexGrow: 1,
      flexShrink: 1,
      fontSize: 7.5,
      lineHeight: 1.3,
      color: COLORS.ink,
    },
    excerpt: {
      marginTop: 3,
      fontFamily: fonts.serif,
      fontSize: 7.5,
      lineHeight: 1.35,
      color: COLORS.inkSoft,
      maxLines: 2,
      textOverflow: "ellipsis",
    },
    footer: {
      position: "absolute",
      left: 72,
      right: 72,
      bottom: 62,
      flexDirection: "row",
      alignItems: "flex-end",
    },
    footerColumn: { flexGrow: 1, flexBasis: 0 },
    footerCenter: { alignItems: "center" },
    footerLabel: {
      fontWeight: 700,
      fontSize: 6,
      lineHeight: 1.2,
      letterSpacing: 1.4,
      color: COLORS.inkMuted,
    },
    footerValue: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontSize: 10,
      lineHeight: 1.25,
      color: COLORS.ink,
    },
    footerId: {
      marginTop: 1,
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 9.5,
      lineHeight: 1.25,
      letterSpacing: 0.8,
      color: COLORS.ink,
    },
    issuer: {
      fontFamily: fonts.serif,
      fontWeight: 700,
      fontSize: 12,
      lineHeight: 1.2,
      color: COLORS.ink,
    },
    signatureLine: {
      marginTop: 3,
      width: 150,
      height: 0.6,
      backgroundColor: COLORS.inkSoft,
    },
    issuerNote: {
      marginTop: 3,
      fontSize: 6.5,
      lineHeight: 1.2,
      letterSpacing: 0.4,
      color: COLORS.inkMuted,
    },
    seal: {
      position: "absolute",
      right: 80,
      bottom: 50,
      width: 66,
      height: 66,
      transform: "rotate(-4deg)",
    },
    disclaimer: {
      position: "absolute",
      left: 72,
      right: 72,
      bottom: 49,
      textAlign: "center",
      fontSize: 5.5,
      lineHeight: 1.2,
      letterSpacing: 0.3,
      color: COLORS.inkMuted,
    },
  });
}
