# K-Name Studio

한국 문화·K-pop·한국어에 관심 있는 외국인을 위한 **사주(四柱) 기반 한국 이름 추천** 서비스입니다.
입력 폼 → Gemini 이름 생성 → 무료 미리보기(이름 1개) → **$3.99 프리미엄**(이름 3개·상세 풀이·도장 PNG·공식 이름 증명서 PDF)으로 이어집니다.
무료 화면은 Google AdSense 광고로, 프리미엄은 광고 없이 운영하는 하이브리드 수익 모델입니다.
UI 문구는 영어이고, 한글·한자를 함께 적어 한국적인 분위기를 살렸습니다.

## 기술 스택

| 영역       | 사용 기술                                                    |
| ---------- | ------------------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript 5              |
| 스타일     | Tailwind CSS v4 (`globals.css`에 CSS-first 테마)             |
| 폼·검증    | React Hook Form 7 + Zod 4 (`@hookform/resolvers`)            |
| 이름 생성  | Gemini API (`@google/genai`) + 서버 만세력 계산              |
| 결제       | Stripe Checkout 일시불 (`stripe` v22) + 웹훅                 |
| PDF        | `@react-pdf/renderer` v4 (벡터) · 캔버스 이미지 PDF(대체)    |
| 저장소     | 로컬 파일(`.data/kv`) 또는 Upstash Redis(REST)               |
| 광고       | Google AdSense (무료 화면만, 선택)                           |
| 폰트       | Noto Sans KR · Noto Serif KR (`next/font/google`, 가변 폰트) |

## 시작하기

```bash
npm install        # Node.js 20.9 이상
cp .env.example .env.local   # Windows cmd: copy .env.example .env.local
                             # GEMINI_API_KEY · STRIPE_SECRET_KEY(sk_test_…) 입력
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드
npm run lint       # ESLint (eslint-config-next)
npm run typecheck  # 라우트 타입 생성 후 tsc --noEmit
```

> `package-lock.json`은 첫 `npm install` 때 생성됩니다. 로컬 풀이 데이터는 `.data/kv`에 저장됩니다(커밋되지 않음).

### 결제 테스트 (Stripe 테스트 모드)

1. [Stripe 대시보드](https://dashboard.stripe.com/test/apikeys)의 테스트 비밀 키(`sk_test_…`)를 `STRIPE_SECRET_KEY`에 넣고 `npm run dev`를 다시 켭니다.
2. 이름을 만든 뒤 무료 미리보기에서 **Unlock everything — $3.99**를 누르고, 테스트 카드 `4242 4242 4242 4242`(만료일은 미래 아무 날짜, CVC 아무 3자리)로 결제합니다.
3. 결제가 끝나면 `/reading/[id]`로 돌아와 바로 열립니다. 돌아온 URL의 `session_id`로 서버가 Stripe에 결제를 직접 확인하므로, **웹훅 없이도 로컬에서 끝까지 테스트할 수 있습니다.**
4. 웹훅까지 확인하려면 [Stripe CLI](https://docs.stripe.com/stripe-cli)로 이벤트를 로컬에 전달합니다.

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   # 출력된 whsec_…를 .env.local의 STRIPE_WEBHOOK_SECRET에 넣고 dev 서버를 다시 켠다
   ```

   결제하면 터미널에 `checkout.session.completed → 200`이 찍히고, 서버 로그에 `"event":"unlocked"`(이미 열렸으면 `already-unlocked`)가 남습니다.

## 폴더 구조

```
src/
├── app/
│   ├── api/
│   │   ├── generate-name/route.ts   # 이름 생성 → 풀이 저장 → 무료 미리보기 (POST)
│   │   ├── readings/[id]/route.ts   # 풀이 조회 · 결제 복귀 확인 (GET)
│   │   ├── checkout/route.ts        # Stripe Checkout 세션 생성 (POST)
│   │   ├── stripe-webhook/route.ts  # Stripe 웹훅 — 결제 완료 시 잠금 해제 (POST)
│   │   └── fonts/subset/route.ts    # 증명서 PDF용 한글 폰트 서브셋 (GET)
│   ├── reading/[id]/         # 풀이 결과 페이지 (무료/프리미엄) · 결제 후 돌아오는 곳
│   ├── privacy/ · terms/     # 개인정보처리방침 · 이용약관/환불 (AdSense·Stripe 심사용 초안)
│   ├── ads.txt/route.ts      # AdSense 게시자 인증 파일
│   ├── layout.tsx            # 폰트·메타데이터·뷰포트
│   ├── page.tsx              # 랜딩 페이지 (섹션 조합)
│   ├── globals.css           # 디자인 토큰(한지·먹·인주·오방색) + 커스텀 유틸리티
│   └── icon.svg              # 낙관(도장) 모티프 파비콘
├── components/
│   ├── landing/              # 헤더 · 히어로 · 작명 원리 · 스튜디오 · 이름 도장 · 푸터 (서버 컴포넌트)
│   ├── reading/              # 풀이 화면 (클라이언트 컴포넌트)
│   │   ├── reading-experience.tsx # 무료/프리미엄 전환 · 결제 복귀 후 확인될 때까지 재조회
│   │   ├── free-reading.tsx      # 무료 미리보기 + 잠긴 영역(가짜 내용 블러) + 광고
│   │   ├── paywall-card.tsx      # $3.99 결제 카드 · use-checkout.ts(Stripe로 이동)
│   │   ├── premium-reading.tsx   # 이름 3개 · 상세 풀이 · 도장 PNG · 증명서 PDF (광고 없음)
│   │   └── locked-section.tsx · certificate-button.tsx · lock-icon.tsx
│   ├── certificate/          # 공식 이름 증명서 PDF 생성기 (react-pdf)
│   │   ├── certificate-document.tsx # 증명서 문서 컴포넌트: 한지 바탕 · 번개무늬 테두리 · 본문 · 도장
│   │   ├── certificate-fonts.ts  # 한글 폰트 서브셋 등록 · 한글/한자 줄바꿈 규칙
│   │   ├── render-vector.tsx     # 도장 PNG + 문서 → PDF Blob
│   │   └── create-certificate.ts # 벡터 생성 → 실패 시 캔버스 대체
│   ├── ads/ad-slot.tsx       # AdSense 광고 칸 (환경 변수가 없으면 표시 안 함)
│   ├── legal/legal-page.tsx  # 정책 문서 공통 틀
│   ├── seal/                 # 전통 도장 생성기 (클라이언트 컴포넌트)
│   │   ├── korean-seal.tsx       # 미리보기 캔버스 + 투명 PNG 다운로드
│   │   ├── seal-studio.tsx       # 랜딩의 체험 UI (미리보기만 — PNG는 프리미엄)
│   │   └── seal-fonts.ts         # 도장 전용 웹 폰트 프리셋 (next/font)
│   ├── name-form/            # 메인 입력 폼 (클라이언트 컴포넌트)
│   │   ├── name-form.tsx         # useForm + zodResolver, 제출 → API 호출 → /reading/[id]로 이동
│   │   ├── english-name-field.tsx
│   │   ├── gender-field.tsx
│   │   ├── surname-field.tsx     # 대표 성씨 12선 + 직접 입력
│   │   ├── birth-fields.tsx      # 생년월일 · 출생 시각 · 시각 미상 · 출생지 시간대
│   │   ├── name-length-field.tsx # 이름 자수 2–4자 (Controller)
│   │   └── use-name-form-context.ts
│   └── ui/                   # Field/FieldGroup, 공통 클래스, Eyebrow, SealMark
├── hooks/
│   ├── use-client-value.ts   # 브라우저 전용 값을 하이드레이션 안전하게 읽기
│   └── use-korean-seal.ts    # 도장 렌더링·미리보기·다운로드 훅
├── lib/
│   ├── api/client.ts         # 브라우저용 API 클라이언트 (오류 응답 정규화 · fieldErrors 경로 변환)
│   ├── certificate/          # 증명서 내용(content.ts) · 증명서 ID(certificate-id.ts) · 디자인 값(design.ts)
│   │                         #   · 캔버스 대체 렌더러(raster.ts) → 의존성 없는 JPEG PDF 작성기(pdf.ts)
│   ├── pricing.ts            # 프리미엄 가격 $3.99 (결제·표시가 함께 쓰는 단일 값)
│   ├── ads.ts · site.ts      # AdSense 설정 · 사이트 연락처
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
│   ├── payments/
│   │   ├── checkout.ts           # Checkout 세션 생성 (success_url·cancel_url·metadata)
│   │   ├── fulfillment.ts        # 결제 확인 → 프리미엄 잠금 해제 (멱등, 웹훅·결제 복귀 공용)
│   │   ├── stripe.ts             # Stripe 클라이언트·키 검증
│   │   └── errors.ts · respond.ts
│   ├── readings/
│   │   ├── repository.ts         # 풀이 ID 발급·저장·권한 부여·무료/프리미엄 뷰
│   │   └── service.ts            # 권한에 맞는 풀이 읽기 (+ 결제 복귀 확인)
│   ├── storage/kv.ts             # 키-값 저장소: 파일(로컬) · Upstash Redis(운영)
│   ├── fonts/google-subset.ts    # 증명서용 한글 폰트 서브셋 (Google Fonts text=, 메모리 캐시)
│   ├── http.ts                   # 본문 읽기(크기 제한·원문 바이트)·응답 헬퍼
│   ├── log.ts                    # 개인 정보 없는 JSON 로그
│   └── deadline.ts               # 제한 시간 신호
└── types/
    ├── name.ts               # 폼 값 · 추천 요청 인터페이스
    ├── api.ts                # API 요청·응답 계약 (이름 생성 · 풀이 조회 · 결제)
    ├── reading.ts            # 무료/프리미엄 풀이 뷰
    └── saju.ts               # 오행 · 천간 · 지지 · 사주팔자 · 원국
```

## 화면 흐름

1. **입력**: 폼을 제출하면 `POST /api/generate-name`이 이름 3개와 상세 분석을 만들어 서버에 **풀이(reading)** 로 저장하고, 무료 미리보기만 돌려줍니다(보통 10–30초, 최대 약 1분).
2. **무료 미리보기** (`/reading/[id]`): 이름 1개의 한글·영문 발음·한 줄 의미를 보여 줍니다. 나머지 이름 2개, 사주·한자 풀이, 도장·증서는 흐리게 잠겨 있고 결제 카드가 붙습니다. 이 화면과 랜딩 하단에만 광고가 나옵니다.
3. **결제**: 결제 버튼 → `POST /api/checkout` → Stripe Checkout(호스팅 결제 페이지)에서 $3.99를 결제합니다.
4. **복귀**: Stripe가 `/reading/[id]?checkout=success&session_id=…`로 돌려보냅니다. 서버가 세션을 Stripe에서 확인해 바로 엽니다. 아직 확정 전이면(지연 결제 수단·일시 오류) 화면이 최대 1분 동안 다시 조회하고, 웹훅이 도착하면 열립니다. 취소하면 `?checkout=cancelled`로 돌아와 안내만 보여 줍니다.
5. **프리미엄**: 사주 원국, 이름 3개, 글자별 한자·오행, 상세 분석(사주 조화·음령오행·운세), 도장 PNG(모양·서체 선택), 공식 이름 증명서 PDF를 광고 없이 보여 줍니다.

서버 재검증 오류(`VALIDATION_ERROR`)는 해당 입력 필드 옆에 붙이고, 그 밖의 오류는 폼 아래 안내 문구로 보여 줍니다.

## 수익화 — 프리미엄 결제 + 광고

| 구분                | 무료                                 | 프리미엄 ($3.99 일시불)                               |
| ------------------- | ------------------------------------ | ----------------------------------------------------- |
| 추천 이름           | 1개 (한글 · 영문 발음 · 한 줄 의미)  | 3개 전체 + 한자                                       |
| 사주·한자 상세 분석 | 잠김 (블러)                          | 사주 원국 · 오행 · 사주 조화 · 음령오행 · 운세 (영문) |
| 한국식 도장         | 잠김 (블러) — 랜딩 체험은 미리보기만 | 투명 PNG 다운로드 (사각·원형, 서체 3종)               |
| 이름 증명서         | —                                    | A4 PDF (이름·한자·사주 요약·도장·발급일·증명서 ID)    |
| 광고                | 있음                                 | 없음                                                  |

### 잠금은 서버가 결정한다

- 무료 응답에는 프리미엄 데이터(나머지 이름·한자·분석·원국)를 **아예 보내지 않습니다.** 잠긴 영역의 흐린 내용은 화면용 가짜 문구라서, 개발자 도구로 블러를 걷어도 실제 결과는 보이지 않습니다.
- 풀이 ID는 추측할 수 없는 128비트 값이고 URL이 곧 접근 권한입니다(링크를 아는 사람만 볼 수 있음, 검색 노출 차단).
- 권한은 결제가 확인된 뒤에만 기록됩니다. 웹훅과 결제 복귀 확인은 같은 함수(`fulfillCheckoutSession`)를 쓰고 멱등이라, 둘이 겹치거나 Stripe가 같은 이벤트를 여러 번 보내도 한 번만 열립니다.
- 증명서 PDF는 브라우저에서 만듭니다. 한자·분석 데이터가 결제한 풀이에만 내려오므로, 증명서를 만들 수 있는 것도 결제한 사용자뿐입니다.

### 저장소와 보존 기간

| 키                   | 내용                                                                   | 보존                             |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| `reading:{id}`       | 생성 결과 전체 (영문 이름·원국 포함)                                   | 무료 30일 → 결제 시 400일로 연장 |
| `entitlement:{id}`   | 결제 권한 (세션 ID·PaymentIntent·금액 — 이메일·카드 정보는 저장 안 함) | 400일                            |
| `checkout:{세션 ID}` | 이 풀이를 위해 만든 Checkout 세션 (결제 복귀 위조 방지)                | 2일                              |

- 로컬(`npm run dev`)은 `.data/kv`의 파일에 저장합니다. 파일 이름은 키를 16진수로 바꿔 만들어 경로 조작을 막습니다.
- **Vercel 같은 서버리스에서는 Upstash Redis가 필요합니다.** 인스턴스마다 파일이 따로라 결제한 풀이가 열리지 않을 수 있어서, `VERCEL` 환경에서 Upstash 설정이 없으면 파일로 넘어가지 않고 설정 오류를 냅니다.

### Stripe 운영 설정

1. 대시보드에서 운영 비밀 키(`sk_live_…`)를 `STRIPE_SECRET_KEY`로, 사이트 주소를 `APP_URL`로 지정합니다.
2. **개발자 › 웹훅 › 엔드포인트 추가**: URL `https://<도메인>/api/stripe-webhook`, 이벤트 `checkout.session.completed` · `checkout.session.async_payment_succeeded` · `checkout.session.async_payment_failed`. 서명 비밀(`whsec_…`)을 `STRIPE_WEBHOOK_SECRET`에 넣습니다.
3. (선택) 상품을 만들어 `STRIPE_PRODUCT_ID`로 지정하면 결제 내역이 한 상품으로 모입니다. 금액은 항상 코드(`src/lib/pricing.ts`)의 $3.99를 씁니다. 가격을 바꾸려면 이 파일만 고칩니다.
4. 설정 › 이메일에서 **성공한 결제 영수증**을 켜 두면 구매자에게 영수증이 갑니다.
5. 로그의 `duplicate-payment`(같은 풀이를 두 번 결제)와 `paid-reading-missing`(결제했는데 풀이가 만료)은 환불 대상입니다. 대시보드에서 환불합니다.

### Google AdSense

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`(`ca-pub-…`)와 광고 단위 ID(`NEXT_PUBLIC_ADSENSE_SLOT_LANDING` · `_READING`)를 넣으면 광고가 나옵니다. 값이 없으면 광고 코드를 싣지 않고, 개발 중에는 광고 자리만 점선으로 표시합니다. 개발·미리보기 빌드는 `data-adtest="on"`으로 테스트 광고만 요청합니다.
- **배치**: 랜딩 맨 아래(입력 폼과 떨어진 곳), 무료 미리보기 맨 아래(결제 버튼과 떨어진 곳) 두 곳뿐입니다. 결제한 풀이 화면에는 광고 스크립트를 아예 불러오지 않습니다. 광고 자리를 미리 잡아 레이아웃 이동(CLS)을 막고, 채워지지 않으면 자리째 숨깁니다.
- **자동 광고(Auto ads)는 켜지 마세요.** 무료와 프리미엄이 같은 URL(`/reading/[id]`)이라 자동 광고를 켜면 결제한 사용자에게도 광고가 나올 수 있습니다. 수동 광고 단위만 씁니다.
- `/ads.txt`는 게시자 ID로 자동 생성됩니다(`google.com, pub-…, DIRECT, f08c47fec0942fa0`).
- 승인 준비: 개인정보처리방침(`/privacy`, 광고 쿠키·Google 파트너 사이트 안내 포함)과 이용약관·환불(`/terms`) 초안이 있습니다. 사업자 정보·연락처(`NEXT_PUBLIC_SUPPORT_EMAIL`)를 채우고 **법률 검토를 받은 뒤** 공개하세요. EEA·영국·스위스 방문자를 위해 AdSense › 개인 정보 보호 및 메시지에서 Google 인증 동의 메시지(CMP)를 켭니다.

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

## 공식 한국어 이름 증명서 (PDF)

프리미엄 풀이 화면에서 **Download certificate (PDF)** 를 누르면, 고른 이름과 도장 설정으로 A4 가로 한 장짜리 증명서를 브라우저에서 바로 만들어 내려받습니다(`korean-name-certificate-[romanization].pdf`).

| 영역      | 내용                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| 테두리    | 인주색 이중선 · 번개무늬(回紋) 띠 · 모서리 亞자 장식 · 먹색 안쪽 이중선, 한지 결(증명서 ID로 고정한 섬유 무늬)        |
| 머리글    | 색동 띠 · 名 낙관 · **Official Certificate of Korean Name** · 공식 한국어 이름 증명서                                 |
| 본문      | 영문 본명 → 한글 이름 · 한자 · 로마자 표기 · 이름의 의미 한 문장                                                      |
| 한자 풀이 | 글자마다 한자 · 음 · 영문 뜻 · 자원오행                                                                               |
| 사주 요약 | 시·일·월·연주 · 일간 · 용신(보완 오행) · 오행 분포 · 사주 조화 분석 요약(영문)                                        |
| 아래      | 발급일(결제일) · 고유 증명서 ID · 발급처 서명란 · **오른쪽 아래 도장**(화면에서 고른 모양·서체) · 문화·개인 용도 안내 |

- **생성 방식**: `@react-pdf/renderer`로 벡터 PDF를 만듭니다. 글자를 선택·검색할 수 있고 확대·인쇄해도 선명합니다. 생성 코드는 버튼을 누를 때만 불러와서 결과 화면을 무겁게 하지 않습니다.
- **한글 폰트**: Noto Serif KR · Noto Sans KR 원본은 10–20MB라, 증명서에 쓰는 글자만 담은 서브셋을 `GET /api/fonts/subset`에서 받습니다. 이 API는 서버가 Google Fonts(`text=`)에 대신 요청하므로 이용자 IP가 Google로 가지 않고, 결과를 메모리와 브라우저에 1년 동안 캐시합니다. 라틴 문자는 기본 묶음 전체를 요청해서 영문 본명이 Google로 전달되지 않습니다.
- **대체 경로**: 폰트 서버에 닿지 못하는 등으로 벡터 생성이 실패하면, 페이지에 이미 올라온 웹 폰트로 같은 레이아웃을 캔버스에 그려 이미지 PDF(200dpi)로 대신 만듭니다.
- **증명서 ID** (`KN-2026-XXXX-XXXX-XXXX`): 풀이 ID와 고른 이름의 SHA-256에서 만듭니다. 같은 이름이면 몇 번을 받아도 같은 번호이고, 증명서를 공유해도 풀이 링크를 거꾸로 알아낼 수 없습니다.
- 문구는 `src/lib/certificate/content.ts`의 `CERTIFICATE_TEXT`, 색·테두리는 `src/lib/certificate/design.ts`에서 바꿉니다. 두 렌더러가 같은 값을 씁니다.
- 제목에 "Official"이 들어가지만 법적 효력이 있는 문서는 아니므로, 아래쪽에 "not a legal name registration" 문구를 넣었습니다.

## 이름 생성 API — `POST /api/generate-name`

입력 폼이 만드는 `NameRequest`를 받아 사주 원국을 계산하고, Gemini로 한국어 이름 3개를 지어 돌려줍니다.

### 환경 변수 (`.env.local`)

| 변수                    | 필수 | 기본값                | 설명                                                  |
| ----------------------- | ---- | --------------------- | ----------------------------------------------------- |
| `GEMINI_API_KEY`        | ✓    | —                     | Gemini API 키 (서버에서만 읽음)                       |
| `GEMINI_MODEL`          |      | `gemini-flash-latest` | 운영에서는 버전 고정을 권장 (예: `gemini-3.5-flash`)  |
| `GEMINI_TIMEOUT_MS`     |      | `50000`               | 요청 하나(재시도 포함)의 제한 시간, 10000–55000       |
| `GEMINI_THINKING_LEVEL` |      | 모델 기본값           | `minimal`·`low`·`medium`·`high` — Gemini 3 계열에서만 |

결제·저장소·광고 변수는 [`.env.example`](.env.example)에 설명이 있습니다.

| 변수                                                                                                      | 필수     | 설명                                                           |
| --------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                                                                                       | ✓ (결제) | `sk_test_…` / `sk_live_…`                                      |
| `STRIPE_WEBHOOK_SECRET`                                                                                   | ✓ (웹훅) | `whsec_…` — 로컬은 `stripe listen`, 운영은 대시보드 엔드포인트 |
| `STRIPE_PRODUCT_ID` · `APP_URL`                                                                           |          | 대시보드 상품 ID · 결제 후 돌아올 사이트 주소(운영 필수)       |
| `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN`                                                     | 서버리스 | 풀이 저장소 (없으면 `.data/kv` 파일)                           |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` · `NEXT_PUBLIC_ADSENSE_SLOT_LANDING` · `NEXT_PUBLIC_ADSENSE_SLOT_READING` |          | AdSense (없으면 광고 없음)                                     |
| `NEXT_PUBLIC_SUPPORT_EMAIL`                                                                               | 운영     | 고객 문의 이메일 (푸터·정책 문서)                              |

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

응답은 **무료 미리보기**입니다. 전체 결과는 서버에 저장되고, 결제 후 `GET /api/readings/:id`로만 나갑니다.

```jsonc
{
  "ok": true,
  "data": {
    "tier": "free",
    "readingId": "k7x2m9qadr4t5vwbnc3e6fhjpl", // 풀이 페이지: /reading/{readingId}
    "englishName": "Emily Johnson",
    "createdAt": "2026-09-29T09:45:00.000Z",
    "name": {
      "hangul": "김서윤",
      "romanization": "Kim Seo-yun",
      "summary": "An auspicious and sincere name that carries calm, steady energy.",
    },
    "lockedNameCount": 2,
    "offer": { "amount": 399, "currency": "usd" },
  },
  "meta": {
    "requestId": "…",
    "model": "gemini-3.5-flash",
    "generatedAt": "…",
    "durationMs": 14210,
    "attempts": 1,
  },
}
```

결제한 풀이(`GET /api/readings/:id` → `"tier": "premium"`)의 `result`에는 이름 3개가 모두 들어 있습니다.

```jsonc
{
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
      "summary": "…",
      "premium": { "sajuHarmony": "…", "soundHarmony": "…", "fortune": "…" }
    }
    // … 모두 3개
  ],
  "favorableElements": ["water", "wood"], // 용신·희신
  "saju": { "chart": { "year": { "hanja": "戊寅", … }, … }, "elementBalance": { … }, "notes": ["dst-removed"] }
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
| `CONFIGURATION_ERROR` · `INTERNAL_ERROR`                        | 500                 | API 키·모델·저장소 설정 문제 / 예기치 못한 오류     |

### 풀이 조회 · 결제 API

| API                                       | 요청                      | 응답 · 주요 오류                                                                                                                          |
| ----------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/readings/:id[?session_id=cs_…]` | —                         | `ReadingView` (무료/프리미엄). `session_id`가 있으면 결제를 확인해 연다 · `READING_NOT_FOUND` 404                                         |
| `POST /api/checkout`                      | `{ "readingId": "…" }`    | `{ url }` (Stripe 결제 페이지) · `READING_NOT_FOUND` 404 · `ALREADY_UNLOCKED` 409 · `PAYMENT_UNAVAILABLE` 503 · `CONFIGURATION_ERROR` 500 |
| `POST /api/stripe-webhook`                | Stripe 이벤트 (서명 필수) | 200 `{ received: true }` · 서명 오류 400 · 처리 실패 500(Stripe가 재전송)                                                                 |

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

## 다음 단계

1. IP별 요청 제한(rate limit)으로 이름 생성 API의 Gemini 비용 남용을 막습니다(예: Upstash Ratelimit).
2. 환불·분쟁(`charge.refunded` · `charge.dispute.created`) 웹훅으로 권한을 회수하고, 구매자 이메일로 풀이 링크를 다시 보내는 "구매 복구"를 추가합니다.
3. 판매 지역에 따라 Stripe Tax(`automatic_tax`)로 부가세를 처리합니다.
4. 출생 도시를 받아 경도 기반 진태양시 보정을 적용하고, 동음이자 성씨(정 鄭·丁, 조 趙·曺 등)의 한자·본관 선택 단계를 추가합니다.
