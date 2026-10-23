-- 아산컴마트 홈페이지 제작·앱 개발·창업 문의 접수
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (is_admin, set_products_updated_at 필요). Supabase SQL Editor에서 전체 실행
-- 하는 일: 새 테이블 1개 + 접수 함수만 추가. 기존 상품·관리자·RLS 정책은 변경하지 않습니다. 여러 번 실행해도 안전합니다.
-- 이름·전화번호·이메일이 들어 있으므로 조회·수정·삭제는 관리자만. 고객 접수는 submit_business_inquiry 함수로만 가능 (테이블 직접 쓰기 권한 없음)
-- 선택지는 src/lib/inquiry-rules.ts 와 같아야 함
-- (예전 버전을 이미 실행했어도 다시 실행하면 선택지 규칙만 새로 바뀝니다. 접수된 문의는 그대로)
begin;

create table if not exists public.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_no bigint generated always as identity unique,
  inquiry_type text not null check (inquiry_type in ('web','app','startup')),
  kind text not null,
  customer_name text not null check (char_length(customer_name) between 2 and 20),
  company text not null default '' check (char_length(company) <= 40),
  phone text not null check (phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  email text not null default '' check (email = '' or (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  contact_time text not null check (char_length(contact_time) between 1 and 60),
  budget text not null,
  schedule text not null check (schedule in ('최대한 빨리','1개월 이내','1~3개월','3개월 이후','미정')),
  content text not null check (char_length(content) between 10 and 3000),
  status text not null default 'received' check (status in ('received','consulting','done','canceled')),
  admin_memo text check (char_length(admin_memo) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 구분·예산 규칙 (종류마다 다름). 다시 실행해도 되도록 지웠다가 새로 만듦
-- 창업 문의는 '컴퓨터매장 창업 문의' 하나만, 예산은 1천만원 이내 / 3천만원 이내 / 5천만원 이상
-- 예전 버전으로 이미 접수된 창업 문의(옛 구분·예산)도 상태 변경·메모가 되도록 옛 값은 남겨 두고, 새 접수는 아래 접수 함수에서 새 선택지만 허용
alter table public.business_inquiries drop constraint if exists business_inquiries_kind_check;
alter table public.business_inquiries add constraint business_inquiries_kind_check check (
  (inquiry_type = 'web' and kind in ('신규 홈페이지 제작','쇼핑몰 제작','기존 홈페이지 리뉴얼','유지보수·수정','기타')) or
  (inquiry_type = 'app' and kind in ('안드로이드 앱','아이폰 앱','안드로이드+아이폰','모바일 웹앱','기존 앱 수정·유지보수','기타')) or
  (inquiry_type = 'startup' and kind in ('컴퓨터매장 창업 문의','컴퓨터 매장 창업','PC방 창업','온라인 쇼핑몰 창업','사무실·매장 PC 구축','기타'))
);
alter table public.business_inquiries drop constraint if exists business_inquiries_budget_check;
alter table public.business_inquiries add constraint business_inquiries_budget_check check (
  budget in ('미정 (상담 후 결정)','300만원 미만','300만~1,000만원','1,000만~3,000만원','3,000만원 이상','1천만원 이내','3천만원 이내','5천만원 이상')
);
create index if not exists idx_business_inquiries_created on public.business_inquiries(created_at desc);

alter table public.business_inquiries enable row level security;
revoke all on table public.business_inquiries from public, anon, authenticated;
grant select, delete on table public.business_inquiries to authenticated;
grant update (status, admin_memo) on table public.business_inquiries to authenticated;

drop policy if exists "admin read business inquiries" on public.business_inquiries;
create policy "admin read business inquiries" on public.business_inquiries for select to authenticated using (public.is_admin((select auth.uid())));
drop policy if exists "admin update business inquiries" on public.business_inquiries;
create policy "admin update business inquiries" on public.business_inquiries for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete business inquiries" on public.business_inquiries;
create policy "admin delete business inquiries" on public.business_inquiries for delete to authenticated using (public.is_admin((select auth.uid())));

drop trigger if exists trg_business_inquiries_updated on public.business_inquiries;
create trigger trg_business_inquiries_updated before update on public.business_inquiries
for each row execute function public.set_products_updated_at();

-- 고객 문의 접수: 항상 '접수' 상태로 저장하고 접수번호를 돌려줌. 각 값의 형식은 위 CHECK 제약으로 검사
create or replace function public.submit_business_inquiry(
  p_type text, p_kind text, p_name text, p_company text, p_phone text, p_email text,
  p_contact_time text, p_budget text, p_schedule text, p_content text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_no bigint;
begin
  -- 종류별 새 선택지만 접수
  if p_type = 'startup' then
    if p_kind <> '컴퓨터매장 창업 문의' then raise exception 'invalid kind'; end if;
    if p_budget not in ('1천만원 이내','3천만원 이내','5천만원 이상') then raise exception 'invalid budget'; end if;
  else
    if p_budget not in ('미정 (상담 후 결정)','300만원 미만','300만~1,000만원','1,000만~3,000만원','3,000만원 이상') then raise exception 'invalid budget'; end if;
  end if;
  insert into public.business_inquiries (inquiry_type, kind, customer_name, company, phone, email, contact_time, budget, schedule, content)
  values (p_type, p_kind, btrim(p_name), btrim(coalesce(p_company, '')), p_phone, lower(btrim(coalesce(p_email, ''))),
          btrim(p_contact_time), p_budget, p_schedule, btrim(p_content))
  returning inquiry_no into new_no;
  return new_no;
end $$;
revoke all on function public.submit_business_inquiry(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_business_inquiry(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

commit;

-- 확인용 (선택): business_inquiries 가 보이면 정상
-- select table_name from information_schema.tables where table_schema='public' and table_name='business_inquiries';
