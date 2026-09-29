# K-Name Studio

한국 문화·K-pop·한국어에 관심 있는 외국인을 위한 **사주(四柱) 기반 한국 이름 추천** 서비스의 기본 구조와 메인 입력 폼입니다.
UI 문구는 영어이고, 한글·한자를 함께 적어 한국적인 분위기를 살렸습니다.

## 기술 스택

| 영역       | 사용 기술                                                    |
| ---------- | ------------------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript 5              |
| 스타일     | Tailwind CSS v4 (`globals.css`에 CSS-first 테마)             |
| 폼·검증    | React Hook Form 7 + Zod 4 (`@hookform/resolvers`)            |
| 폰트       | Noto Sans KR · Noto Serif KR (`next/font/google`, 가변 폰트) |

## 시작하기

```bash
npm install        # Node.js 20.9 이상
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드
npm run lint       # ESLint (eslint-config-next)
npm run typecheck  # 라우트 타입 생성 후 tsc --noEmit
```

> `package-lock.json`은 첫 `npm install` 때 생성됩니다.

## 폴더 구조

```
src/
├── app/
│   ├── layout.tsx            # 폰트·메타데이터·뷰포트
│   ├── page.tsx              # 랜딩 페이지 (섹션 조합)
│   ├── globals.css           # 디자인 토큰(한지·먹·인주·오방색) + 커스텀 유틸리티
│   └── icon.svg              # 낙관(도장) 모티프 파비콘
├── components/
│   ├── landing/              # 헤더 · 히어로 · 작명 원리 · 스튜디오 · 이름 도장 · 푸터 (서버 컴포넌트)
│   ├── seal/                 # 전통 도장 생성기 (클라이언트 컴포넌트)
│   │   ├── korean-seal.tsx       # 미리보기 캔버스 + 투명 PNG 다운로드
│   │   ├── seal-studio.tsx       # 이름·모양·서체를 고르는 체험 UI
│   │   └── seal-fonts.ts         # 도장 전용 웹 폰트 프리셋 (next/font)
│   ├── name-form/            # 메인 입력 폼 (클라이언트 컴포넌트)
│   │   ├── name-form.tsx         # useForm + zodResolver, 제출 → 요약 화면 전환
│   │   ├── english-name-field.tsx
│   │   ├── gender-field.tsx
│   │   ├── surname-field.tsx     # 대표 성씨 12선 + 직접 입력
│   │   ├── birth-fields.tsx      # 생년월일 · 출생 시각 · 시각 미상 · 출생지 시간대
│   │   ├── name-length-field.tsx # 이름 자수 2–4자 (Controller)
│   │   ├── request-preview.tsx   # 제출된 NameRequest 요약
│   │   └── use-name-form-context.ts
│   └── ui/                   # Field/FieldGroup, 공통 클래스, Eyebrow, SealMark
├── hooks/
│   ├── use-client-value.ts   # 브라우저 전용 값을 하이드레이션 안전하게 읽기
│   └── use-korean-seal.ts    # 도장 렌더링·미리보기·다운로드 훅
├── lib/
│   ├── constants/            # 대표 성씨 데이터, 선택지 문구
│   ├── saju/                 # 12지시(時辰) 변환, 오행 메타데이터
│   ├── seal/                 # 도장 엔진 (React에 의존하지 않는 순수 Canvas 모듈)
│   │   ├── layout.ts             # 글자 수·모양별 전통 배치 계산
│   │   ├── render.ts             # 테두리·글자·인주 질감 그리기
│   │   ├── fonts.ts              # 새길 글자가 든 폰트 조각만 미리 받기
│   │   ├── export.ts             # PNG 인코딩·다운로드·화면 밖 생성
│   │   └── text.ts · types.ts · constants.ts · random.ts
│   ├── validations/
│   │   └── name-form.ts      # Zod 스키마 (폼 값 → NameRequest 변환)
│   ├── date.ts · time-zone.ts · cn.ts
└── types/
    ├── name.ts               # 폼 값 · 추천 요청 · 추천 결과 인터페이스
    └── saju.ts               # 오행 · 천간 · 지지 · 사주팔자
```

## 폼 설계

| 항목          | 입력 방식                                                          | 검증 규칙                                                                          |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 영문 이름     | 텍스트                                                             | 필수, 50자 이내, 라틴 문자로 시작(악센트·공백·하이픈·아포스트로피 허용), 공백 정리 |
| 성별          | Male / Female / Neutral 라디오 카드                                | 필수 (기본값 없음)                                                                 |
| 성씨          | 대표 성씨 12선(김·이·박·최·정·강·조·윤·장·임·한·오) 또는 직접 입력 | 직접 입력은 한글 1–2음절 또는 영문                                                 |
| 생년월일      | `<input type="date">`                                              | 필수, 실제 존재하는 날짜, 1900-01-01 이후, 미래 불가                               |
| 출생 시각     | `<input type="time">` + "I don’t know" 체크                        | 체크하지 않으면 필수 (HH:mm)                                                       |
| 출생지 시간대 | IANA 시간대 선택 (기기 시간대 자동 입력)                           | 필수, 유효한 IANA 시간대                                                           |
| 이름 자수     | 2 · 3 · 4자 (기본 3자)                                             | 복성(2음절 성)이면 3자 이상                                                        |

- 폼 값(`NameFormValues`)은 Zod의 `transform`을 거쳐 정규화된 `NameRequest`로 바뀝니다. `handleSubmit`은 이 값을 받습니다.
- 서버(Route Handler·Server Action)에서도 같은 `nameFormSchema`로 다시 검증할 수 있습니다.

### 사주 관점에서 추가한 입력

- **출생지 시간대**: 외국인은 출생지가 제각각이라, 시간대 없이는 출생 시각의 의미가 정해지지 않습니다. 서머타임·진태양시 보정의 기준이 됩니다.
- **시각 미상**: 출생 시각을 모르면 시주(時柱) 없이 삼주(三柱)로 분석합니다.
- **12지시 안내**: 입력한 시각이 어느 시진(예: 午時 · Hour of the Horse)에 해당하는지 보여 줍니다. 시계 시각 기준의 근사치이며, 실제 분석에서는 출생지 경도에 따른 진태양시 보정이 필요합니다. 예를 들어 서울 출생이면 한국 표준시 기준으로 자시를 23:30–01:29로 봅니다.
- **복성 처리**: 남궁·황보·제갈·선우·독고 등 2음절 성씨(영문 관용 표기 포함)는 이름 자수 계산에 반영합니다.

## 이름 도장 생성기

한글 이름(1–4자)을 HTML5 Canvas로 전통 인장처럼 그려 **투명 배경 PNG**(`korean-seal-[이름].png`)로 내려받습니다. 렌더링은 모두 브라우저에서 이루어집니다.

```tsx
import { KoreanSeal } from "@/components/seal/korean-seal";
import { useKoreanSeal } from "@/hooks/use-korean-seal";

// 1) 컴포넌트: 미리보기 + 다운로드 버튼
<KoreanSeal name="김민준" shape="circle" font="brush" />;

// 2) 훅: 원하는 UI에 직접 연결
const seal = useKoreanSeal("민준", { shape: "square", size: 2048 });
<canvas ref={seal.canvasRef} />;
<button onClick={seal.download} disabled={seal.status !== "ready"}>
  Download
</button>;

// 3) 미리보기 없이 바로 받기 (React 불필요)
import { SEAL_FONTS } from "@/components/seal/seal-fonts";
import { downloadKoreanSeal } from "@/lib/seal";
await downloadKoreanSeal("김서윤", { font: SEAL_FONTS.classic.font });
```

| 옵션      | 기본값     | 설명                                                                                                                       |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `shape`   | `"square"` | `"square"`(사각) · `"circle"`(원형)                                                                                        |
| `font`    | `"brush"`  | `"brush"`(붓글씨·송명) · `"classic"`(명조·나눔명조 ExtraBold) · `"carved"`(각인·가석) 또는 `{ family, weight, inkSpread }` |
| `size`    | `1024`     | 출력 해상도(px), 128–4096                                                                                                  |
| `color`   | `#C8102E`  | 인주 색                                                                                                                    |
| `texture` | `true`     | 인주 질감(잉크 반점·농담 얼룩·테두리 마모)                                                                                 |

- **배치**는 전통 세로쓰기를 따라 오른쪽 열부터 위→아래로 읽습니다. 2자는 두 열, 3자는 오른쪽 열에 성(姓)을 크게 쓰고 왼쪽 열에 이름 두 자를 위아래로, 4자는 2×2입니다. 각 글자는 실제 잉크 경계(`measureText`)를 기준으로 칸을 가득 채우도록 늘리며, 과하게 찌그러지지 않게 가로·세로 배율 차이를 2.1배로 제한합니다.
- **폰트**: 한글 웹 폰트는 unicode-range 조각으로 나뉘어 있어, 새길 글자가 든 조각만 `document.fonts.load()`로 받은 뒤 그립니다. 송명·가석은 KS X 1001 완성형 2,350자만 담고 있어서, 그 밖의 음절은 11,172자를 모두 갖춘 나눔명조로 이어 그립니다.
- **질감**은 이름으로 만든 시드로 생성하므로 같은 설정이면 미리보기와 다운로드 파일이 항상 같습니다.

## 다음 단계

1. 추천 API(Route Handler 또는 Server Action)를 만들고, `name-form.tsx`의 `TODO` 지점에서 연동합니다.
2. 만세력 계산 → 오행 분석 → 인명용 한자 DB(자원오행·원획 획수) 조합 로직을 구현합니다. 응답 계약은 `NameRecommendationResult`입니다.
3. 동음이자 성씨(정 鄭·丁, 조 趙·曺 등)의 한자·본관 선택 단계를 추가합니다.
