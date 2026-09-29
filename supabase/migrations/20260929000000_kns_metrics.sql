-- K-Name Studio · 매각 실사용 지표 (Supabase / Postgres)
--
-- 실행: Supabase 대시보드 › SQL Editor에 이 파일 전체를 붙여 넣고 Run — 여러 번 실행해도 안전하다.
--       (Supabase CLI를 쓰면: supabase link → supabase db push)
--
-- 개인 정보는 저장하지 않는다: 날짜별 합계, 이틀만 두는 익명 방문자 해시, 결제 원장(풀이 ID 대신 해시).
-- 앱은 서버 전용 비밀 키(sb_secret_… 또는 옛 service_role)로 아래 두 함수만 부르고 두 표만 읽는다.
-- 공개 키(publishable / anon · authenticated)로는 아무것도 읽거나 쓸 수 없다.

-- ─── 표 ───────────────────────────────────────────────────────

-- 날짜(UTC)별 합계 — counters 예: {"pageviews": 120, "visits": 80, "page:/": 70, "country:US": 40,
--   "readings_created": 12, "checkouts_started": 5, "payments": 2, "revenue_cents": 798}
create table if not exists public.kns_metrics_daily (
  day        date        primary key,
  counters   jsonb       not null default '{}'::jsonb,
  visitors   integer     not null default 0,
  updated_at timestamptz not null default now()
);

-- 순 방문자 중복 제거용 — 날마다 바뀌는 해시라 날짜를 넘겨 같은 사람을 이을 수 없다. 이틀 지나면 지운다.
create table if not exists public.kns_metrics_visitors (
  day          date not null,
  visitor_hash text not null,
  primary key (day, visitor_hash)
);

-- 결제 원장 — checkout_session_id(cs_live_…)로 Stripe 대시보드와 한 건씩 대조할 수 있다
create table if not exists public.kns_payments (
  checkout_session_id text        primary key,
  payment_intent_id   text,
  amount_total        integer     not null check (amount_total >= 0),
  currency            text        not null,
  livemode            boolean     not null,
  country             text,
  reading_ref         text        not null,
  recorded_at         timestamptz not null default now()
);

create index if not exists kns_payments_recorded_at_idx
  on public.kns_payments (recorded_at desc);

-- ─── 권한 ─────────────────────────────────────────────────────

-- RLS를 켜고 정책을 두지 않는다 → anon·authenticated는 한 줄도 못 본다 (service_role은 RLS를 건너뛴다)
alter table public.kns_metrics_daily    enable row level security;
alter table public.kns_metrics_visitors enable row level security;
alter table public.kns_payments         enable row level security;

-- Supabase가 새 표에 자동으로 주는 권한을 모두 거두고, 앱이 읽는 두 표의 SELECT만 service_role에 준다.
-- 쓰기는 아래 함수로만 된다 — 비밀 키가 새더라도 API로 원장을 고치거나 지울 수 없다.
revoke all on table public.kns_metrics_daily, public.kns_metrics_visitors, public.kns_payments
  from public, anon, authenticated, service_role;
grant select on table public.kns_metrics_daily, public.kns_payments to service_role;

-- ─── 함수 ─────────────────────────────────────────────────────

-- 두 JSON 객체의 숫자 값을 키별로 더한다: {"a":1} + {"a":2,"b":1} → {"a":3,"b":1}
create or replace function public.kns_jsonb_add(a jsonb, b jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(key, total), '{}'::jsonb)
  from (
    select key, sum((value #>> '{}')::numeric) as total
    from (
      select key, value from jsonb_each(coalesce(a, '{}'::jsonb))
      union all
      select key, value from jsonb_each(coalesce(b, '{}'::jsonb))
    ) as merged
    where jsonb_typeof(value) = 'number'
    group by key
  ) as sums
$$;

-- 그날 합계에 카운터를 더하고, 처음 보는 방문자면 순 방문자를 1 올린다
create or replace function public.kns_record_metrics(
  p_day      date,
  p_counters jsonb,
  p_visitor  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_visitors integer := 0;
begin
  if p_day is null or p_counters is null or jsonb_typeof(p_counters) <> 'object' then
    raise exception 'kns_record_metrics: p_day and a JSON object p_counters are required';
  end if;

  if p_visitor is not null then
    insert into public.kns_metrics_visitors (day, visitor_hash)
    values (p_day, left(p_visitor, 64))
    on conflict do nothing;
    get diagnostics v_new_visitors = row_count;
  end if;

  -- 없으면 만들고, 행 잠금을 잡은 채 더한다 — 동시에 들어온 요청도 빠짐없이 합산된다
  insert into public.kns_metrics_daily (day) values (p_day)
  on conflict (day) do nothing;

  update public.kns_metrics_daily
  set counters   = public.kns_jsonb_add(counters, p_counters),
      visitors   = visitors + v_new_visitors,
      updated_at = now()
  where day = p_day;

  delete from public.kns_metrics_visitors where day < p_day - 2;
end;
$$;

-- 결제 한 건: 원장에 넣고(같은 세션은 한 번만) 그날 합계를 같은 트랜잭션에서 올린다
-- 반환: true = 새로 기록, false = 이미 있는 결제
create or replace function public.kns_record_payment(
  p_checkout_session_id text,
  p_payment_intent_id   text,
  p_amount_total        integer,
  p_currency            text,
  p_livemode            boolean,
  p_country             text,
  p_reading_ref         text,
  p_recorded_at         timestamptz,
  p_day                 date,
  p_counters            jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  insert into public.kns_payments (
    checkout_session_id, payment_intent_id, amount_total, currency,
    livemode, country, reading_ref, recorded_at
  )
  values (
    p_checkout_session_id, p_payment_intent_id, p_amount_total, upper(p_currency),
    p_livemode, p_country, p_reading_ref, coalesce(p_recorded_at, now())
  )
  on conflict (checkout_session_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return false;
  end if;

  perform public.kns_record_metrics(p_day, coalesce(p_counters, '{}'::jsonb), null);
  return true;
end;
$$;

revoke all on function public.kns_jsonb_add(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.kns_record_metrics(date, jsonb, text)
  from public, anon, authenticated, service_role;
revoke all on function public.kns_record_payment(
  text, text, integer, text, boolean, text, text, timestamptz, date, jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.kns_record_metrics(date, jsonb, text) to service_role;
grant execute on function public.kns_record_payment(
  text, text, integer, text, boolean, text, text, timestamptz, date, jsonb
) to service_role;

-- ─── 실사용 조회 예시 (SQL Editor) ────────────────────────────
--
-- 월별 트래픽·전환·매출 (실결제만):
--   select to_char(day, 'YYYY-MM') as month,
--          sum(visitors)                                       as visitors,
--          sum(coalesce((counters->>'visits')::numeric, 0))           as visits,
--          sum(coalesce((counters->>'pageviews')::numeric, 0))        as pageviews,
--          sum(coalesce((counters->>'readings_created')::numeric, 0)) as readings,
--          sum(coalesce((counters->>'checkouts_started')::numeric, 0)) as checkouts,
--          sum(coalesce((counters->>'payments')::numeric, 0))         as payments,
--          sum(coalesce((counters->>'revenue_cents')::numeric, 0)) / 100.0 as revenue_usd
--   from public.kns_metrics_daily
--   group by 1 order by 1;
--
-- 결제 원장 (Stripe 대시보드와 대조):
--   select recorded_at, checkout_session_id, amount_total / 100.0 as amount, currency, country
--   from public.kns_payments where livemode order by recorded_at desc;
