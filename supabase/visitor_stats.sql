-- 아산컴마트 방문자 통계 (관리자 대시보드)
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (is_admin 필요). Supabase SQL Editor에서 전체 실행
-- 새 테이블 2개와 함수 2개만 추가합니다. 기존 상품·게시물·주문·사진 테이블과 Storage는 변경하지 않습니다. 여러 번 실행해도 안전합니다.
--
-- 설계
--  - 원본 IP·이메일·이름은 저장하지 않음. 방문자는 브라우저 쿠키의 무작위 ID를 서버에서 SHA-256으로 바꾼 값만 저장
--  - 순 방문자: (날짜, 방문자) 한 줄 → 같은 날 여러 번 와도 1명. 7일·30일은 기간 안에서 중복 제거해 계산
--  - 페이지 조회수: (날짜, 경로)별 숫자 1줄을 늘림 → 조회 1건마다 행이 쌓이지 않음
--  - 날짜는 한국시간(Asia/Seoul) 기준
--  - 기록은 record_site_visit 함수로만 가능 (테이블 직접 쓰기 권한 없음). 관리자로 로그인한 사람·/admin 경로는 함수가 다시 거름
--  - 조회는 관리자만 가능 (RLS + 함수 안에서 관리자 확인)
--  - 보유 기간 2년: 기록 함수가 가끔 2년 지난 통계 행을 자동 삭제 (통계 테이블에만 해당)
begin;

create table if not exists public.site_daily_visitors (
  day date not null,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  primary key (day, visitor_hash)
);

create table if not exists public.site_page_views (
  day date not null,
  path text not null check (char_length(path) between 1 and 200),
  views integer not null default 0 check (views >= 0),
  primary key (day, path)
);

revoke all on table public.site_daily_visitors from public, anon, authenticated;
revoke all on table public.site_page_views from public, anon, authenticated;
grant select on table public.site_daily_visitors to authenticated;
grant select on table public.site_page_views to authenticated;
alter table public.site_daily_visitors enable row level security;
alter table public.site_page_views enable row level security;

drop policy if exists "admin read visitors" on public.site_daily_visitors;
create policy "admin read visitors" on public.site_daily_visitors for select
 to authenticated using (public.is_admin((select auth.uid())));
drop policy if exists "admin read page views" on public.site_page_views;
create policy "admin read page views" on public.site_page_views for select
 to authenticated using (public.is_admin((select auth.uid())));

-- 방문 기록 (쇼핑몰 서버 /api/visit 에서 호출). 잘못된 값·관리자·관리자 경로는 조용히 무시
create or replace function public.record_site_visit(p_visitor text, p_path text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  v_path text := p_path;
begin
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{64}$' then return; end if;
  if v_path is null or v_path !~ '^/[^[:space:][:cntrl:]?#]{0,199}$' then return; end if;
  if lower(v_path) ~ '^/(admin|api|auth|_next)(/|$)' then return; end if;
  if (select auth.uid()) is not null and public.is_admin((select auth.uid())) then return; end if;

  insert into public.site_daily_visitors (day, visitor_hash) values (d, p_visitor)
  on conflict do nothing;

  -- 남용 방지: 하루 경로 종류는 3000개까지. 넘으면 '기타'로 합산 (임의 주소로 행을 늘리는 공격 차단)
  if not exists (select 1 from public.site_page_views where day = d and path = v_path)
     and (select count(*) from public.site_page_views where day = d) >= 3000 then
    v_path := '/(기타)';
  end if;
  insert into public.site_page_views (day, path, views) values (d, v_path, 1)
  on conflict (day, path) do update set views = public.site_page_views.views + 1;

  -- 보유 기간(개인정보처리방침: 집계일부터 2년)이 지난 통계만 정리. 방문 기록 약 100건에 1번만 실행해 부담을 줄임
  -- 지우는 대상은 이 파일이 만든 통계 테이블 2개의 2년 지난 행뿐 (상품·주문·회원 등 다른 데이터와 무관)
  if random() < 0.01 then
    delete from public.site_daily_visitors where day < d - 730;
    delete from public.site_page_views where day < d - 730;
  end if;
end $$;

revoke all on function public.record_site_visit(text, text) from public;
grant execute on function public.record_site_visit(text, text) to anon, authenticated;

-- 관리자 대시보드용 통계 (p_days: 1·7·30). 그래프는 최소 7일 표시
create or replace function public.site_visit_stats(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  n integer := least(greatest(coalesce(p_days, 7), 1), 30);
  g integer := greatest(n, 7);
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'today', (select count(*) from public.site_daily_visitors where day = d),
    'yesterday', (select count(*) from public.site_daily_visitors where day = d - 1),
    'unique7', (select count(distinct visitor_hash) from public.site_daily_visitors where day > d - 7),
    'unique30', (select count(distinct visitor_hash) from public.site_daily_visitors where day > d - 30),
    'period_views', (select coalesce(sum(views), 0) from public.site_page_views where day > d - n),
    'total_views', (select coalesce(sum(views), 0) from public.site_page_views),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', s.day, 'visitors', coalesce(v.c, 0), 'views', coalesce(p.c, 0)) order by s.day), '[]'::jsonb)
      from (select d - i as day from generate_series(0, g - 1) i) s
      left join (select day, count(*) c from public.site_daily_visitors where day > d - g group by day) v on v.day = s.day
      left join (select day, sum(views) c from public.site_page_views where day > d - g group by day) p on p.day = s.day
    ),
    'top_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', t.path, 'views', t.views) order by t.views desc, t.path), '[]'::jsonb)
      from (select path, sum(views) views from public.site_page_views where day > d - n group by path order by 2 desc, 1 limit 10) t
    )
  );
end $$;

revoke all on function public.site_visit_stats(integer) from public, anon;
grant execute on function public.site_visit_stats(integer) to authenticated;

commit;

-- 확인용 (선택): 정책 2개가 보이면 정상
-- select tablename, policyname from pg_policies where tablename in ('site_daily_visitors', 'site_page_views');
