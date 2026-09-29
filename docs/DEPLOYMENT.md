# K-Name Studio 배포 · 운영 · 매각 준비 가이드

Vercel 운영 배포부터 GA4 전환 추적, 매각 실사용 지표(Flippa)까지 한 번에 정리한 체크리스트입니다.
위에서부터 순서대로 진행하면 됩니다. 각 항목 옆 `[ ]`를 복사해 진행 상황을 표시하세요.

## 0. 한눈에 보기

- [ ] 사업용 이메일 하나로 모든 계정을 만든다 (매각 때 계정째 넘기기 쉽다)
- [ ] Vercel **Pro** 팀에 저장소를 가져온다 — Hobby 요금제는 비상업적 개인 용도만 허용한다
- [ ] Vercel Marketplace에서 **Upstash Redis**를 연결한다 (풀이 저장소 + 기본 지표 저장소)
- [ ] (선택) **Supabase**에 지표 표를 만든다 — SQL로 조회·내보내기가 쉬워 실사 자료로 가장 설득력이 있다
- [ ] 환경 변수를 Production · Preview · Development로 나눠 넣는다 ([2장](#2-환경-변수))
- [ ] 도메인을 연결하고 `APP_URL`을 지정한다
- [ ] (지금은 건너뜀) Stripe 실결제 키와 웹훅 — 무료 개방 중에는 필요 없다. 유료로 바꿀 때 [5장](#5-stripe-실결제-전환)
- [ ] Search Console · Bing 소유권을 확인하고 sitemap을 제출한다
- [ ] GA4 속성을 만들고 **향상된 측정의 '브라우저 기록 기반 페이지 변경'을 끈다** ([6장](#6-google-analytics-4))
- [ ] 배포 후 점검 목록을 확인한다 ([8장](#8-배포-후-점검))
- [ ] 첫날부터 매달 지표를 내보내 보관한다 ([9장](#9-flippa-매각-준비))

## 1. 준비할 계정

| 서비스                                                                                                                | 용도                            | 비고                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| [Vercel](https://vercel.com) (Pro)                                                                                    | 호스팅 · 서버리스 함수 · 도메인 | 상업용은 Pro 필요. 프로젝트를 다른 팀으로 옮길 수 있어 매각에 유리  |
| 도메인 등록 기관                                                                                                      | 사이트 주소                     | 등록 기관 계정도 사업용 이메일로                                    |
| [Google AI Studio](https://aistudio.google.com/apikey)                                                                | Gemini API 키                   | 결제를 연결한 키 사용 (무료 등급은 요청이 제품 개선에 쓰일 수 있음) |
| [Stripe](https://dashboard.stripe.com)                                                                                | $3.99 결제                      | 계정은 사업자(법인·개인)에 묶여 넘길 수 없다 — 9장 참고             |
| [Upstash](https://upstash.com) (Vercel Marketplace)                                                                   | 풀이·결제 권한 저장, 기본 지표  | Vercel에서 연결하면 키가 자동으로 들어온다                          |
| [Supabase](https://supabase.com) (선택)                                                                               | 지표 원장(Postgres)             | 백업이 되는 유료 플랜 권장                                          |
| [Google Analytics 4](https://analytics.google.com)                                                                    | 방문·전환 분석                  | Flippa에 연동해 트래픽을 검증받는다                                 |
| [Google Search Console](https://search.google.com/search-console) · [Bing Webmaster](https://www.bing.com/webmasters) | 검색 노출                       |                                                                     |
| [Google AdSense](https://adsense.google.com)                                                                          | 무료 화면 광고                  | 계정은 넘길 수 없다 — 매수자는 자기 게시자 ID를 쓴다                |

## 2. 환경 변수

Vercel › Project › Settings › **Environment Variables**에서 환경별로 넣습니다. 로컬은 `.env.local`에 넣습니다([3장](#3-로컬-envlocal)).

- `NEXT_PUBLIC_…`과 `GA4_API_SECRET`의 "설정 여부"는 **빌드할 때 코드에 박힙니다.** 바꾼 뒤에는 다시 배포(Redeploy)해야 반영됩니다.
- `VERCEL` · `VERCEL_ENV` · `VERCEL_URL` · `VERCEL_PROJECT_PRODUCTION_URL`은 Vercel이 자동으로 넣는 시스템 변수입니다. 직접 만들지 않습니다.
- 비밀 값(API 키·토큰)은 Vercel에서 **Sensitive**로 표시해 두면 대시보드에서도 다시 읽을 수 없습니다.

### 필수 — 앱 동작

| 변수                                    | Production                | Preview          | Development            | 설명                                                             |
| --------------------------------------- | ------------------------- | ---------------- | ---------------------- | ---------------------------------------------------------------- |
| `GEMINI_API_KEY`                        | ✓                         | ✓                | ✓                      | Gemini API 키                                                    |
| `GEMINI_MODEL`                          | 권장                      | 권장             |                        | 버전 고정 (예: `gemini-3.5-flash`). 비우면 `gemini-flash-latest` |
| `NEXT_PUBLIC_PAYWALL_ENABLED`           | 비움 (무료 개방)          | 비움             | 비움                   | `true`면 $3.99 결제를 켠다. 켜면 아래 Stripe 값이 필요하다       |
| `STRIPE_SECRET_KEY`                     | `sk_live_…`               | `sk_test_…`      | `sk_test_…`            | **페이월을 켤 때만.** Preview에는 실결제 키 금지                 |
| `STRIPE_WEBHOOK_SECRET`                 | 운영 엔드포인트 `whsec_…` | (선택)           | `stripe listen` 출력값 | 결제 복귀 확인만으로도 열리므로 Preview는 비워도 된다            |
| `STRIPE_PRODUCT_ID`                     | 권장                      |                  |                        | 매출이 상품 하나로 모여 실사 때 보기 쉽다                        |
| `APP_URL`                               | `https://도메인`          | 비움             | 비움                   | 결제 복귀 주소 · canonical · sitemap · OG가 모두 이 값을 쓴다    |
| `KV_REST_API_URL` · `KV_REST_API_TOKEN` | 자동 (Upstash 연결)       | **별도 DB** 권장 | 비움 → `.data/kv` 파일 | `UPSTASH_REDIS_REST_URL` · `…_TOKEN`도 인식                      |
| `NEXT_PUBLIC_SUPPORT_EMAIL`             | ✓                         |                  |                        | 푸터·정책 문서·JSON-LD 고객 문의 주소                            |

### 분석 · 검색

| 변수                            | Production    | Preview | Development             | 설명                                                                  |
| ------------------------------- | ------------- | ------- | ----------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-…`         | 비움    | 비움 (또는 테스트 속성) | 비우면 GA 코드를 아예 싣지 않는다                                     |
| `GA4_API_SECRET`                | ✓             |         |                         | Measurement Protocol 비밀 — 결제 완료(purchase)를 서버가 보낸다       |
| `GA4_MP_ENDPOINT`               | (선택)        |         |                         | EU 수집 엔드포인트: `https://region1.google-analytics.com/mp/collect` |
| `GA4_TRACK_TEST_PAYMENTS`       | **넣지 않음** |         | 테스트할 때만 `1`       | 테스트 결제를 GA 매출에 섞지 않는다                                   |
| `GOOGLE_SITE_VERIFICATION`      | (선택)        |         |                         | Search Console HTML 태그의 `content` 값 (DNS 확인이면 불필요)         |
| `BING_SITE_VERIFICATION`        | (선택)        |         |                         | Bing `msvalidate.01`의 `content` 값                                   |
| `NEXT_PUBLIC_TWITTER_HANDLE`    | (선택)        |         |                         | X 계정 `@…` — 공유 카드에 표시                                        |

### 매각 실사용 지표

| 변수                                   | Production    | Preview   | Development | 설명                                                                                        |
| -------------------------------------- | ------------- | --------- | ----------- | ------------------------------------------------------------------------------------------- |
| `METRICS_BACKEND`                      | `auto` (비움) | **`off`** | 비움 → 파일 | `auto` · `kv` · `supabase` · `file` · `off`. Preview가 운영 숫자를 오염시키지 않게 끈다     |
| `METRICS_SALT`                         | ✓             |           |             | 방문자 해시 비밀 (무작위 64자). 없으면 고정값이라 해시를 되짚어 볼 수 있다                  |
| `METRICS_ADMIN_TOKEN`                  | ✓             |           | (선택)      | 지표 내보내기 API 토큰 (24자 이상). 없으면 `/api/admin/metrics`가 404                       |
| `SUPABASE_URL` · `SUPABASE_SECRET_KEY` | (선택)        |           |             | 있으면 `auto`가 Supabase를 쓴다. 옛 `SUPABASE_SERVICE_ROLE_KEY`도 인식(2026년 말 폐지 예정) |
| `METRICS_FILE`                         |               |           | (선택)      | 파일 저장소 위치 (기본 `.data/metrics.json`)                                                |

무작위 값 만들기 (Windows cmd · macOS · Linux 공통):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 광고

| 변수                                                  | Production | 설명                                           |
| ----------------------------------------------------- | ---------- | ---------------------------------------------- |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID`                       | 승인 후    | `ca-pub-…` — `/ads.txt`도 이 값으로 만들어진다 |
| `NEXT_PUBLIC_ADSENSE_SLOT_LANDING` · `…_SLOT_READING` | 승인 후    | 디스플레이 광고 단위 ID                        |

## 3. 로컬 `.env.local`

```bat
copy .env.example .env.local
notepad .env.local
```

최소 설정은 `GEMINI_API_KEY` 하나입니다(무료 개방 중에는 Stripe 키가 필요 없습니다. 결제를 켜서 시험하려면 `NEXT_PUBLIC_PAYWALL_ENABLED=true`와 `STRIPE_SECRET_KEY=sk_test_…`를 넣습니다). 나머지는 비워 두면 로컬 기본값(파일 저장소·GA 없음·광고 자리 표시)으로 동작합니다. 값을 바꾸면 `npm run dev`를 껐다가 다시 켭니다.

## 4. Vercel 배포

1. **New Project › Import** 에서 GitHub 저장소를 고릅니다. Framework는 Next.js로 자동 인식되고, 빌드 명령은 기본값(`next build`)을 씁니다.
2. **Storage › Marketplace › Upstash (Redis)** 로 데이터베이스를 만들고 프로젝트에 연결합니다. `KV_REST_API_URL` · `KV_REST_API_TOKEN`이 자동으로 들어옵니다.
   - Preview용 데이터베이스를 따로 만들어 Preview 환경에만 연결하면, 미리보기에서 만든 풀이·테스트 결제가 운영 데이터에 섞이지 않습니다.
   - 지표도 이 데이터베이스에 쌓입니다. 페이지뷰 1회에 Redis 명령 5–6개를 쓰므로, 트래픽이 늘면 Upstash 요금제를 확인합니다.
3. **Settings › Functions › Region** 을 Upstash·Supabase와 같은 지역으로 맞춥니다(예: Washington, D.C. `iad1` ↔ `us-east-1`). 요청마다 저장소를 부르므로 지연 시간이 줄어듭니다.
4. [2장](#2-환경-변수)의 환경 변수를 넣고 **Deploy** 합니다.
5. **Settings › Domains** 에서 도메인을 연결합니다. `www`와 맨 도메인 중 하나를 대표로 두고 나머지는 리디렉션합니다. 대표 주소를 `APP_URL`에 넣고 다시 배포합니다.

## 5. Stripe 실결제 전환

> **지금은 무료 개방 중이라 이 장을 건너뜁니다.** 유료로 바꿀 때 아래를 마친 뒤 Production에 `NEXT_PUBLIC_PAYWALL_ENABLED=true`를 넣고 다시 배포합니다. 무료 기간에 만든 풀이는 계속 열려 있고, 그 뒤 새로 만든 풀이부터 무료 미리보기 + $3.99 결제가 적용됩니다.

1. 계정 활성화(사업자 정보·정산 계좌)를 마칩니다.
2. 운영 비밀 키 `sk_live_…`를 Production의 `STRIPE_SECRET_KEY`에 넣습니다.
3. **개발자 › 웹훅 › 엔드포인트 추가**: `https://도메인/api/stripe-webhook`, 이벤트 `checkout.session.completed` · `checkout.session.async_payment_succeeded` · `checkout.session.async_payment_failed`. 서명 비밀을 `STRIPE_WEBHOOK_SECRET`에 넣습니다.
4. 상품을 하나 만들어 `STRIPE_PRODUCT_ID`에 넣고, 설정 › 이메일에서 결제 영수증을 켭니다.
5. 실제 카드로 $3.99를 한 번 결제해 전체 흐름을 확인한 뒤 대시보드에서 환불합니다([8장](#8-배포-후-점검)).

## 6. Google Analytics 4

### 속성 설정

1. **관리 › 만들기 › 속성** → 웹 데이터 스트림을 추가하고 측정 ID(`G-…`)를 `NEXT_PUBLIC_GA_MEASUREMENT_ID`에 넣습니다.
2. **꼭 끄기** — 데이터 스트림 › 향상된 측정(Enhanced measurement) ⚙ › 페이지 조회수 › 고급 설정 › **브라우저 기록 이벤트 기반 페이지 변경**(Page changes based on browser history events)을 끕니다.
   앱이 풀이 주소를 `/reading/[id]`로 바꾼 page_view를 직접 보냅니다. 이 옵션을 켜 두면 실제 풀이 주소(= 열람 권한)가 GA에 쌓여, GA 권한을 받은 사람(예: 매수 후보)이 남의 유료 풀이를 열 수 있습니다.
3. **데이터 보관** (Data retention)을 **14개월**로 늘립니다. 기본 2개월이면 탐색 보고서에서 6개월 추이를 볼 수 없습니다.
4. **Measurement Protocol API 비밀**(데이터 스트림 › Measurement Protocol API secrets › 만들기)을 `GA4_API_SECRET`에 넣습니다. 결제 완료는 서버(Stripe 웹훅)가 보내므로 광고 차단기·결제 후 탭 닫기로 빠지지 않고, 브라우저는 purchase를 보내지 않아 두 번 세지 않습니다.
5. **키 이벤트**(관리 › 이벤트): 무료 개방 중에는 `generate_lead` · `seal_download` · `certificate_download`를, 결제를 켠 뒤에는 `begin_checkout` · `purchase`도 키 이벤트로 표시합니다.
6. **맞춤 측정기준**(관리 › 맞춤 정의, 이벤트 범위): `placement` · `lead_source` · `error_code` · `surname_source` · `name_length` · `birth_time_known` · `renderer` · `shape`.
7. **내부 트래픽 제외**: 데이터 스트림 › 태그 설정 › 내부 트래픽 정의에 운영자 IP를 넣고, 데이터 필터를 '활성'으로 바꿉니다.
8. **Search Console 연결**(관리 › 제품 링크)로 검색어 보고서를 GA에서 봅니다.

### 수집하는 이벤트 (전환 퍼널)

| 단계        | 이벤트                                   | 언제                                                        | 주요 매개변수                                                             |
| ----------- | ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| 방문        | `page_view`                              | 페이지 이동마다 (주소 비식별화)                             | `page_location`: `/reading/[id]`, 마케팅 매개변수(`utm_*`·`gclid`)만 남김 |
| 폼 입력     | `name_form_start`                        | 폼에 처음 들어갈 때 1회                                     |                                                                           |
| 폼 제출     | `name_form_submit`                       | 검증을 통과해 제출할 때                                     | `name_length` · `surname_source` · `birth_time_known`                     |
| 결과 페이지 | `generate_lead` ★                        | 풀이가 만들어졌을 때                                        | `lead_source`                                                             |
|             | `name_generation_error`                  | 생성 실패                                                   | `error_code`                                                              |
| 결제 제안   | `view_item`                              | 무료 결과에서 결제 카드를 볼 때 (세션당 1회)                | 금액·상품                                                                 |
| 결제 버튼   | `begin_checkout` ★                       | 결제 버튼 클릭                                              | `placement`(`paywall_card`·`locked_name`·`locked_section`) + 금액·상품    |
|             | `checkout_cancel`                        | Stripe에서 취소하고 돌아옴                                  |                                                                           |
| 결제 완료   | `purchase` ★                             | 결제 확정 — 서버가 보냄 (`transaction_id` = Stripe 세션 ID) | `value: 3.99` · `currency: USD`                                           |
| 사주 분석   | `saju_reading`                           | 사주 분석(`/saju`) 결과를 봤을 때                           | `birth_time_known`                                                        |
| 이용        | `seal_download` · `certificate_download` | 도장 PNG · 증명서 PDF 저장                                  | `shape` · `renderer`                                                      |

이름·생년월일 같은 개인 정보는 어떤 이벤트에도 넣지 않습니다(GA 약관 위반). 탐색 › **유입경로 탐색**에 위 순서로 단계를 넣으면 단계별 이탈률을 볼 수 있습니다.

### 동의(EEA · 영국 · 스위스)

- 이 지역 방문자는 동의 모드 v2 기본값이 **거부**입니다. 쿠키 없이 익명 신호만 가고, 서버 purchase도 보내지 않습니다(그 결제는 자체 원장에만 남습니다).
- AdSense › 개인 정보 보호 및 메시지에서 **유럽 규정 메시지**(Google 인증 CMP)를 켜고, **동의 모드 설정 관리**에서 광고용과 분석용 동의 모드를 모두 켭니다. 동의한 방문자는 그때부터 정상 측정됩니다.

### 확인

[Tag Assistant](https://tagassistant.google.com/)로 사이트를 연 뒤 GA › 관리 › **DebugView**에서 이벤트가 위 순서로 들어오는지, 풀이 페이지의 `page_location`에 실제 ID가 아니라 `/reading/[id]`가 찍히는지 확인합니다.

## 7. 매각 실사용 지표 (자체 원장)

GA4와 별개로, 서버가 직접 **방문 · 퍼널 · 결제**를 날짜별로 기록합니다. 광고 차단기와 무관하고, 결제 원장은 Stripe 세션 ID로 Stripe와 한 건씩 대조할 수 있어 GA 수치를 뒷받침합니다.

| 기록      | 언제                                                | 저장 내용                                                                                                |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 방문      | 페이지 이동마다 (`/api/metrics/collect`, 쿠키 없음) | 날짜별 `pageviews` · `visits`(외부 유입 첫 페이지) · 페이지 묶음 · 국가 · 기기 · 유입 경로, 순 방문자 수 |
| 풀이 생성 | `/api/generate-name` 성공                           | `readings_created`                                                                                       |
| 결제 시작 | `/api/checkout` 성공                                | `checkouts_started`                                                                                      |
| 사주 분석 | `/api/saju` 성공                                    | `saju_readings`                                                                                          |
| 결제 완료 | 프리미엄이 처음 열린 순간 (결제당 1회)              | 원장 한 줄 + `payments` · `revenue_cents` (테스트 결제는 `payments_test` · `revenue_cents_test`)         |

- 저장하지 않는 것: IP · User-Agent · 풀이 ID(원장에는 되돌릴 수 없는 해시 `reading_ref`만) · 이름 · 이메일 · 카드 정보.
- 순 방문자는 `HMAC(METRICS_SALT, 날짜|IP|브라우저)`로 셉니다. 날마다 값이 바뀌어 날짜를 넘겨 같은 사람을 이을 수 없습니다. 그래서 기간 합계의 `visitors`는 **일별 순 방문자의 합**입니다.
- 봇 · 미리 불러오기 · 다른 사이트에서 온 요청은 세지 않습니다. 날짜는 UTC 기준입니다.
- 지표 저장이 실패해도 이름 생성·결제는 그대로 진행되고 경고 로그(`"scope":"metrics"`)만 남습니다.

### 저장소 고르기

|           | Upstash (Vercel KV)                       | Supabase (Postgres)                         |
| --------- | ----------------------------------------- | ------------------------------------------- |
| 설정      | 없음 — 풀이 저장소와 같은 DB              | SQL 한 번 실행 + 키 2개                     |
| 조회      | 내보내기 API                              | 내보내기 API + SQL Editor에서 자유 조회     |
| 원자성    | 결제 원장·합계를 Lua 스크립트 하나로 기록 | 결제 원장·합계를 함수 하나(트랜잭션)로 기록 |
| 순 방문자 | HyperLogLog (오차 약 0.8%)                | 정확한 값 (해시는 이틀 뒤 삭제)             |

`METRICS_BACKEND`를 비워 두면(`auto`) Supabase → Upstash → 로컬 파일 순으로 고릅니다. Vercel에서 둘 다 없으면 지표를 끕니다(앱은 정상 동작).

### Supabase 설정 (선택)

1. Vercel 함수와 같은 지역에 프로젝트를 만듭니다.
2. **SQL Editor**에 [`supabase/migrations/20260929000000_kns_metrics.sql`](../supabase/migrations/20260929000000_kns_metrics.sql) 전체를 붙여 넣고 **Run** 합니다. 여러 번 실행해도 안전합니다.
   - 표 3개(`kns_metrics_daily` · `kns_metrics_visitors` · `kns_payments`)에 RLS를 켜고 공개 키 권한을 모두 거둡니다.
   - 쓰기는 함수 2개(`kns_record_metrics` · `kns_record_payment`)로만 됩니다. 비밀 키가 새더라도 API로 원장을 고치거나 지울 수 없습니다.
3. **Settings › API Keys › Secret keys**에서 비밀 키(`sb_secret_…`)를 만들어 `SUPABASE_SECRET_KEY`에, 프로젝트 URL을 `SUPABASE_URL`에 넣습니다. 공개 키(`sb_publishable_…`)는 쓰지 않습니다.
4. Data API가 켜져 있어야 합니다(기본값).

### 내보내기 API

`GET /api/admin/metrics` — `Authorization: Bearer <METRICS_ADMIN_TOKEN>` 헤더가 필요합니다. 토큰은 URL에 넣지 않습니다(로그에 남음).

| 매개변수      | 값                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------- |
| `type`        | `summary`(기본: 합계·전환율·유입·국가·월별·일별 JSON) · `daily` · `monthly` · `payments` |
| `format`      | `json`(기본) · `csv` (`daily` · `monthly` · `payments`)                                  |
| `from` · `to` | UTC 날짜 `YYYY-MM-DD` — 기본 최근 30일, 최대 400일                                       |
| `limit`       | `payments`의 최대 줄 수 (기본 1000, 최대 10000)                                          |

Windows cmd:

```bat
set TOKEN=발급한_METRICS_ADMIN_TOKEN
curl -H "Authorization: Bearer %TOKEN%" "https://도메인/api/admin/metrics"
curl -H "Authorization: Bearer %TOKEN%" "https://도메인/api/admin/metrics?type=monthly&format=csv&from=2026-10-01&to=2027-03-31" -o monthly.csv
curl -H "Authorization: Bearer %TOKEN%" "https://도메인/api/admin/metrics?type=payments&format=csv&from=2026-10-01&to=2027-03-31" -o payments.csv
```

macOS · Linux: `%TOKEN%`을 `$TOKEN`으로, `set`을 `export`로 바꿉니다.

CSV는 엑셀에서 바로 열립니다. 수식으로 실행될 수 있는 값(`=`·`+`·`-`·`@`로 시작)은 앞에 `'`를 붙여 막습니다.

### 알아 둘 한계

- 매출은 Stripe 수수료·환불·분쟁을 빼기 **전** 금액입니다. 순매출은 Stripe 보고서로 제시합니다.
- 수집 API는 누구나 부를 수 있는 공개 주소라, 작정하면 방문 수를 부풀릴 수 있습니다. 매수자에게는 GA4 · Search Console · Stripe와 함께 보여 줍니다(세 곳의 추이가 맞아야 믿습니다).

## 8. 배포 후 점검

| 확인                                                                                                                                       | 기대 결과                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://도메인/robots.txt`                                                                                                                | `Allow: /` · `Disallow: /api/` · `Sitemap: https://도메인/sitemap.xml` (Preview는 `Disallow: /`)                                             |
| `/sitemap.xml`                                                                                                                             | `/` · `/privacy` · `/terms` 세 개만 (풀이 페이지 없음)                                                                                       |
| `/manifest.webmanifest` · `/icon.svg`                                                                                                      | 200                                                                                                                                          |
| `/opengraph-image`                                                                                                                         | 1200×630 PNG, 한글 이름 `김서윤` 표시. 영문만 나오면 빌드 때 Google Fonts를 받지 못한 것 — 빌드 로그의 `font-subset-failed`를 보고 다시 배포 |
| `/ads.txt`                                                                                                                                 | `google.com, pub-…, DIRECT, f08c47fec0942fa0` (AdSense 설정 시)                                                                              |
| 홈 페이지 소스                                                                                                                             | `<link rel="canonical" href="https://도메인/">` · `og:image` · `twitter:card` · `application/ld+json`                                        |
| 풀이 페이지 응답 헤더                                                                                                                      | `X-Robots-Tag: noindex, nofollow, noarchive` + `<meta name="robots" content="noindex, nofollow">`                                            |
| [리치 결과 테스트](https://search.google.com/test/rich-results) · [Schema 검사기](https://validator.schema.org/)                           | Organization · WebSite · WebApplication 오류 없음 (평점이 없으니 별점 리치 결과는 나오지 않는 것이 정상 — 가짜 평점은 넣지 않는다)           |
| [Facebook 공유 디버거](https://developers.facebook.com/tools/debug/) · [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) | 제목·설명·이미지가 보임                                                                                                                      |
| GA4 실시간 · DebugView                                                                                                                     | `page_view` → … → `purchase`, 풀이 주소는 `/reading/[id]`                                                                                    |
| 무료 개방 확인                                                                                                                             | 이름을 만들면 결제 버튼 없이 이름 3개·한자·상세 풀이·도장 PNG·증명서 PDF가 바로 보이고, 랜딩 도장 체험에서도 PNG를 내려받을 수 있다          |
| (결제를 켠 뒤) 실결제 $3.99 1건                                                                                                            | Stripe 결제 성공 → 화면 즉시 열림 → GA4 `purchase` → `/api/admin/metrics`의 `payments: 1` → 대시보드에서 환불                                |
| `curl -i https://도메인/api/admin/metrics` (토큰 없이)                                                                                     | `401` (토큰 미설정이면 `404`)                                                                                                                |

## 9. Flippa 매각 준비

Flippa는 Stripe · Google Analytics · AdSense를 목록에 직접 연동해 읽기 전용 '검증' 배지를 붙입니다. 매수자는 이 세 곳과 자체 원장의 숫자가 서로 맞는지를 봅니다.

### 매달 할 일 (1일)

- [ ] 지난달 `monthly.csv` · `payments.csv`를 내려받아 공유 드라이브에 보관한다
- [ ] Stripe › 보고서에서 지난달 결제·환불·수수료를 내려받는다
- [ ] 손익 시트를 채운다: 매출(Stripe 총액 − 수수료 − 환불) + AdSense − 비용(Vercel · Gemini · Upstash/Supabase · 도메인)
- [ ] `payments.csv`의 `checkout_session_id` 건수와 Stripe 성공 결제 건수가 맞는지 확인한다
- [ ] GA4 속성·Stripe 상품·도메인을 바꾸지 않는다 (기간 중간에 끊기면 추이를 증명하기 어렵다)

### 실사 자료 묶음

| 자료      | 제공 방법                                                                |
| --------- | ------------------------------------------------------------------------ |
| 매출      | Flippa Stripe 연동 + 월별 보고서 CSV                                     |
| 트래픽    | Flippa GA 연동, 실사 중 매수자에게 GA4 **뷰어** 권한                     |
| 검색      | Search Console 실적 보고서 (매수자를 제한된 사용자로 추가)               |
| 자체 원장 | `monthly.csv`(방문·전환·매출) · `payments.csv`(Stripe 대조용) — 6–12개월 |
| 광고 수익 | Flippa AdSense 연동                                                      |
| 비용      | 각 서비스 청구서                                                         |

### 이전 체크리스트

| 자산               | 이전 방법                                                                                                            | 비고                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| GitHub 저장소      | Settings › Transfer ownership                                                                                        |                                                                 |
| Vercel 프로젝트    | Project Settings › Transfer (매수자 팀으로)                                                                          | 환경 변수도 함께 옮겨진다 — 판매자 소유 키는 매수자 것으로 교체 |
| 도메인             | 등록 기관 간 이전 또는 계정 내 이전(push)                                                                            | DNS: Vercel · Search Console TXT · 이메일                       |
| Stripe             | **이전 불가** — 매수자가 새 계정을 만들고 `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRODUCT_ID`를 교체 | 과거 매출은 보고서로 넘긴다                                     |
| GA4                | 매수자를 속성 **관리자**로 추가 → 매수자가 자기 계정으로 속성 이동 → 판매자 권한 삭제                                | 측정 ID가 그대로라 코드 변경 없음                               |
| Search Console     | 매수자를 **소유자**로 추가                                                                                           | 도메인(DNS) 속성이면 도메인과 함께 넘어간다                     |
| AdSense            | **이전 불가** — 매수자가 자기 계정으로 승인받고 `NEXT_PUBLIC_ADSENSE_*` 교체                                         | `/ads.txt`는 자동으로 바뀐다                                    |
| Upstash · Supabase | 팀·조직 초대 후 소유권 이전 (또는 매수자 DB로 데이터 이전)                                                           | 지표·원장 기록이 그대로 넘어간다                                |
| Gemini             | 매수자 키로 `GEMINI_API_KEY` 교체                                                                                    |                                                                 |
| 인계 후            | `METRICS_ADMIN_TOKEN` · 모든 API 키를 새로 발급                                                                      | 판매자가 쓰던 비밀 값은 폐기                                    |
