# K-Name Studio

한국 문화·K-pop·한국어에 관심 있는 외국인을 위한 **사주(四柱) 기반 한국 이름 추천** 서비스입니다.
입력 폼 → Gemini 이름 생성 API → 추천 이름 카드와 전통 도장(PNG)까지 한 화면에서 이어집니다.
UI 문구는 영어이고, 한글·한자를 함께 적어 한국적인 분위기를 살렸습니다.

## 기술 스택

| 영역       | 사용 기술                                                    |
| ---------- | ------------------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript 5              |
| 스타일     | Tailwind CSS v4 (`globals.css`에 CSS-first 테마)             |
| 폼·검증    | React Hook Form 7 + Zod 4 (`@hookform/resolvers`)            |
| 이름 생성  | Gemini API (`@google/genai`) + 서버 만세력 계산              |
| 폰트       | Noto Sans KR · Noto Serif KR (`next/font/google`, 가변 폰트) |

## 시작하기

```bash
npm install        # Node.js 20.9 이상
cp .env.example .env.local   # GEMINI_API_KEY 입력
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
│   ├── api/generate-name/route.ts  # 이름 생성 API (POST)
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
│   │   ├── name-form.tsx         # useForm + zodResolver, 제출 → API 호출 → 결과 화면 전환
│   │   ├── english-name-field.tsx
│   │   ├── gender-field.tsx
│   │   ├── surname-field.tsx     # 대표 성씨 12선 + 직접 입력
│   │   ├── birth-fields.tsx      # 생년월일 · 출생 시각 · 시각 미상 · 출생지 시간대
│   │   ├── name-length-field.tsx # 이름 자수 2–4자 (Controller)
│   │   ├── name-results.tsx      # 사주 원국 · 추천 이름 3개 · 글자 풀이 · 도장 미리보기/다운로드
│   │   └── use-name-form-context.ts
│   └── ui/                   # Field/FieldGroup, 공통 클래스, Eyebrow, SealMark
├── hooks/
│   ├── use-client-value.ts   # 브라우저 전용 값을 하이드레이션 안전하게 읽기
│   └── use-korean-seal.ts    # 도장 렌더링·미리보기·다운로드 훅
├── lib/
│   ├── api/generate-name.ts  # 브라우저용 API 클라이언트 (오류 응답 정규화 · fieldErrors 경로 변환)
│   ├── constants/            # 대표 성씨 데이터, 선택지 문구
│   ├── saju/
│   │   ├── four-pillars.ts       # 만세력: 생년월일시 → 사주팔자·오행·음양
│   │   ├── ganji.ts              # 천간·지지 표
│   │   ├── sound-elements.ts     # 발음오행(초성)
│   │   └── birth-hour.ts · five-elements.ts
│   ├── seal/                 # 도장 엔진 (React에 의존하지 않는 순수 Canvas 모듈)
│   │   ├── layout.ts             # 글자 수·모양별 전통 배치 계산
│   │   ├── render.ts             # 테두리·글자·인주 질감 그리기
│   │   ├── fonts.ts              # 새길 글자가 든 폰트 조각만 미리 받기
│   │   ├── export.ts             # PNG 인코딩·다운로드·화면 밖 생성
│   │   └── text.ts · types.ts · constants.ts · random.ts
│   ├── validations/
│   │   ├── rules.ts          # 폼과 API가 함께 쓰는 검증 규칙
│   │   ├── name-form.ts      # 폼 스키마 (폼 값 → NameRequest 변환)
│   │   └── name-request.ts   # API 요청 본문 스키마 (서버 재검증)
│   ├── date.ts · time-zone.ts · cn.ts
├── server/                   # 서버 전용 코드
│   ├── name-generation/
│   │   ├── prompt.ts             # Gemini 프롬프트 템플릿 (시스템 지시문 + 의뢰서)
│   │   ├── output-schema.ts      # 응답 JSON 스키마 (Zod → responseJsonSchema)
│   │   ├── parse-output.ts       # 응답 파싱·규칙 검증·정리
│   │   ├── generate-names.ts     # 원국 계산 → 호출 → 검증 → 재시도
│   │   ├── gemini.ts             # @google/genai 어댑터·환경 설정
│   │   ├── hanja.ts              # 한자 음·인명용 여부 조회 (hanja-readings.ts: Unihan 생성 데이터)
│   │   └── errors.ts             # 오류 코드 ↔ HTTP 상태·사용자 문구
│   ├── http.ts                   # JSON 본문 읽기(크기 제한)·응답 헬퍼
│   └── deadline.ts               # 제한 시간 신호
└── types/
    ├── name.ts               # 폼 값 · 추천 요청 인터페이스
    ├── api.ts                # 이름 생성 API 요청·응답 계약
    └── saju.ts               # 오행 · 천간 · 지지 · 사주팔자 · 원국
```

## 화면 흐름

1. 폼을 제출하면 클라이언트 검증을 통과한 `NameRequest`를 `POST /api/generate-name`으로 보냅니다(보통 10–30초, 최대 약 1분).
2. 성공하면 결과 화면으로 바뀝니다: 사주 원국(시·일·월·연주, 오행 분포) → 추천 이름 3개 → 고른 이름의 글자 풀이·상세 분석 → 그 이름의 **도장 미리보기와 PNG 다운로드**(모양·서체 선택).
3. 서버 재검증 오류(`VALIDATION_ERROR`)는 해당 입력 필드 옆에 붙이고, 그 밖의 오류는 폼 아래 안내 문구로 보여 줍니다. 결과 화면에서 "Suggest three more"로 같은 입력에 새 이름을 받을 수 있습니다.

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
- 이름 생성 API는 같은 규칙(`rules.ts`)으로 만든 `nameRequestSchema`로 요청을 다시 검증합니다.

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

## 이름 생성 API — `POST /api/generate-name`

입력 폼이 만드는 `NameRequest`를 받아 사주 원국을 계산하고, Gemini로 한국어 이름 3개를 지어 돌려줍니다.

### 환경 변수 (`.env.local`)

| 변수                    | 필수 | 기본값                | 설명                                                  |
| ----------------------- | ---- | --------------------- | ----------------------------------------------------- |
| `GEMINI_API_KEY`        | ✓    | —                     | Gemini API 키 (서버에서만 읽음)                       |
| `GEMINI_MODEL`          |      | `gemini-flash-latest` | 운영에서는 버전 고정을 권장 (예: `gemini-3.5-flash`)  |
| `GEMINI_TIMEOUT_MS`     |      | `50000`               | 요청 하나(재시도 포함)의 제한 시간, 10000–55000       |
| `GEMINI_THINKING_LEVEL` |      | 모델 기본값           | `minimal`·`low`·`medium`·`high` — Gemini 3 계열에서만 |

> **개인 정보**: 영문 이름과 생년월일시가 Gemini로 전송됩니다. 무료 등급 키에서는 요청 내용이 Google 제품 개선에 쓰일 수 있으므로, 운영에서는 결제를 연결한 키나 Vertex AI를 쓰고 이용자에게 알립니다.

### 요청·응답

```bash
curl -X POST http://localhost:3000/api/generate-name \
  -H "Content-Type: application/json" \
  -d '{"englishName":"Emily Johnson","gender":"female",
       "surname":{"source":"preset","id":"kim"},
       "birth":{"date":"1998-04-12","time":"14:30","timeZone":"America/New_York"},
       "nameLength":3}'
```

```jsonc
{
  "ok": true,
  "data": {
    "names": [
      {
        "hangul": "김서윤",
        "romanization": "Kim Seo-yun",
        "hanja": "金瑞允",
        "characters": [
          { "hangul": "김", "hanja": "金", "meaning": "gold", "element": "metal", "soundElement": "wood", "isSurname": true },
          { "hangul": "서", "hanja": "瑞", "meaning": "auspicious", "element": "metal", "soundElement": "metal", "isSurname": false },
          { "hangul": "윤", "hanja": "允", "meaning": "sincere", "element": "earth", "soundElement": "earth", "isSurname": false }
        ],
        "summary": "…", // 무료: 영문 한 줄 요약
        "premium": { "sajuHarmony": "…", "soundHarmony": "…", "fortune": "…" } // 프리미엄: 영문 상세 분석
      }
      // … 모두 3개
    ],
    "favorableElements": ["water", "wood"], // 용신·희신
    "saju": { "chart": { "year": { "hanja": "戊寅", … }, … }, "elementBalance": { … }, "notes": ["dst-removed"] }
  },
  "meta": { "requestId": "…", "model": "gemini-3.5-flash", "generatedAt": "…", "durationMs": 14210, "attempts": 1 }
}
```

실패하면 `{ "ok": false, "error": { "code", "message", "retryable", "fieldErrors?" }, "meta": { "requestId" } }` 형식입니다. 타입은 `src/types/api.ts`에 있습니다.

| 코드                                                            | HTTP                | 상황                                                |
| --------------------------------------------------------------- | ------------------- | --------------------------------------------------- |
| `VALIDATION_ERROR`                                              | 422                 | 입력 오류 — `fieldErrors[{ path, message }]` 포함   |
| `INVALID_JSON` · `UNSUPPORTED_MEDIA_TYPE` · `PAYLOAD_TOO_LARGE` | 400 · 415 · 413     | 본문 형식 문제 (JSON, 8KB 이하)                     |
| `CONTENT_BLOCKED`                                               | 422                 | 모델 안전 정책에 막힘                               |
| `RATE_LIMITED` · `UPSTREAM_UNAVAILABLE`                         | 503 + `Retry-After` | Gemini 429·5xx·네트워크 오류가 재시도 후에도 이어짐 |
| `INVALID_MODEL_OUTPUT` · `UPSTREAM_ERROR`                       | 502                 | 응답이 3번 모두 규칙 위반 / 그 밖의 Gemini 오류     |
| `TIMEOUT`                                                       | 504                 | 제한 시간 초과                                      |
| `CONFIGURATION_ERROR` · `INTERNAL_ERROR`                        | 500                 | API 키·모델 설정 문제 / 예기치 못한 오류            |

### 처리 흐름

1. **요청 검증**: 클라이언트 값을 믿지 않고 다시 검증합니다.
   - 대표 성씨는 `id`만 받아 한글·한자를 서버 데이터로 채웁니다.
   - 시간대는 정식 IANA 이름으로 바꿔 씁니다(지원 목록 밖이면 거부).
   - 미래 날짜는 출생지 시간대의 오늘을 기준으로 판정합니다.
   - `fieldErrors`의 경로는 요청 본문 기준이므로, 폼에 붙일 때 `surname.id`는 `surname.choice`로, `surname.value`는 `surname.custom`으로 바꿉니다.
2. **만세력 계산** (`four-pillars.ts`): LLM은 간지 계산을 자주 틀리므로, 원국은 코드로 계산해 프롬프트에 넣습니다.
   - 연주는 입춘, 월주는 12절(태양 황경, Meeus 저정밀식)을 기준으로 정합니다. 일주·시주는 출생지 표준시(서머타임 제외)로 정하고, 23시 이후 출생은 다음 날로 봅니다(子初換日).
   - 서머타임은 오프셋이 바뀐 시각을 정확히 찾아 판정합니다. 1974년 미국처럼 긴 서머타임, 전시 서머타임, 영국 이중 서머타임도 처리합니다.
   - 전환 밤처럼 같은 시각이 두 번 있거나 없는 경우에는 `ambiguous-time`을 남깁니다.
   - 무작위 5,000건을 `lunar-javascript`(고정밀 절기)와 비교했을 때 99.96%가 일치했고, 어긋난 2건은 절입 6분 이내였습니다.
3. **프롬프트** (`prompt.ts`): 시스템 지시문은 "너는 30년 경력의 저명한 성명학자이자 사주 전문가다."로 시작합니다. 이어서 작명 원칙(용신·자원오행, 음령오행 상생, 인명용 한자, 발음, 성별·영문 이름 반영)과 필드별 분량·언어 규칙을 담습니다. 의뢰서에는 원국·일간·오행 분포·음양·참고 사항을 넣습니다.
4. **구조화 출력**: Zod 스키마로 만든 `responseJsonSchema`와 `responseMimeType: application/json`으로 JSON만 받습니다. 속성 순서를 고정해, 모델이 용신을 먼저 정한 뒤 이름을 짓게 합니다.
5. **응답 검증** (`parse-output.ts`): 다음 항목을 확인합니다. 발음오행은 서버가 초성으로 계산해 붙입니다.
   - 성 포함 글자 수, 성씨와 성씨 한자, 로마자 표기(성 + 하이픈으로 이은 이름), 요약·분석 분량과 영어 여부, 이름 중복
   - **한자 음**: Unicode Unihan `kHangul`(8,224자)로 한자의 한국 한자음이 음절과 맞는지 확인합니다(두음법칙 음 포함). 이름 글자는 인명에 쓸 수 있는 글자(교육용 기초 한자·인명용 한자)여야 하고, 뜻이 흉한 글자는 거부합니다.
   - 표는 `node scripts/generate-hanja-readings.mjs <kHangul.txt>`로 다시 만듭니다.
   - 자원오행(`element`)과 용신(`favorableElements`)은 모델의 해석이라 서버가 검증하지 않습니다.
6. **재시도**: 최대 3회까지 다시 요청합니다. 새 시도는 남은 시간이 20초 이상일 때만 시작합니다.
   - 규칙 위반이면 무엇이 틀렸는지 프롬프트에 붙여 다시 요청합니다. 중간에 429가 끼어도 고칠 점은 유지됩니다.
   - 429·5xx·네트워크 오류면 쉬었다가 다시 시도합니다. 429는 Gemini가 알려 준 `retryDelay`를 따르고, 남은 시간보다 길면 바로 `Retry-After`와 함께 돌려줍니다.
   - 제한 시간(본문을 읽기 전부터 잼)이 지나거나 클라이언트가 연결을 끊으면 진행 중인 요청도 끊습니다.
   - 시도마다 결과 코드·걸린 시간·토큰 사용량(사고 토큰 포함)을 JSON 로그로 남깁니다. 개인 정보는 남기지 않습니다.

> **프리미엄 분석**은 결제·인증을 붙이기 전까지 모든 응답에 들어 있습니다. 연동한 뒤에는 `route.ts`에서 권한을 확인해 `premium`을 `null`로 보내야 합니다. 화면에서 숨기는 것만으로는 보호되지 않습니다.

## 다음 단계

1. 결제·인증을 도입해 프리미엄 분석 권한을 판정하고, IP·사용자별 요청 제한(rate limit)을 둡니다.
2. 출생 도시를 받아 경도 기반 진태양시 보정을 적용하고, 동음이자 성씨(정 鄭·丁, 조 趙·曺 등)의 한자·본관 선택 단계를 추가합니다.
