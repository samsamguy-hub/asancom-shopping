-- 아산컴마트 조립PC 견적 상담 + 견적게시판
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (is_admin, set_products_updated_at 필요). Supabase SQL Editor에서 전체 실행
-- 하는 일: 새 테이블 3개만 추가. 기존 상품·관리자·RLS 정책은 변경하지 않습니다. 여러 번 실행해도 안전합니다.
--   estimate_parts    : 관리자가 넣는 견적용 부품 이름 목록 (가격 없음). 고객은 '표시' 상태만 조회
--   estimate_requests : 견적게시판 글 (선택 부품·가려진 이름·상태). 개인정보 없음 → 누구나 조회 가능
--   estimate_contacts : 이름·전화번호·상담 가능 시간·요청사항. 관리자만 조회 (고객·로그인 사용자 모두 조회 불가)
-- 고객 접수는 submit_estimate_request 함수로만 가능 (두 테이블에 한 번에 저장, 입력값 검사). 테이블에 직접 쓰기 권한은 주지 않음
begin;

create table if not exists public.estimate_parts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','O/S','조립선택')),
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name)
);

create table if not exists public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  request_no bigint generated always as identity unique,
  parts jsonb not null default '{}'::jsonb check (jsonb_typeof(parts) = 'object' and pg_column_size(parts) < 8000),
  display_name text not null check (char_length(display_name) between 1 and 20),
  status text not null default 'received' check (status in ('received','consulting','done','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_contacts (
  request_id uuid primary key references public.estimate_requests(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 2 and 20),
  phone text not null check (phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  contact_time text not null check (char_length(contact_time) between 1 and 60),
  message text not null default '' check (char_length(message) <= 1000),
  admin_memo text check (char_length(admin_memo) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_estimate_parts_category on public.estimate_parts(category, sort_order);
create index if not exists idx_estimate_requests_created on public.estimate_requests(created_at desc);

alter table public.estimate_parts enable row level security;
alter table public.estimate_requests enable row level security;
alter table public.estimate_contacts enable row level security;

revoke all on table public.estimate_parts from public, anon, authenticated;
grant select on table public.estimate_parts to anon, authenticated;
grant insert, update, delete on table public.estimate_parts to authenticated;

revoke all on table public.estimate_requests from public, anon, authenticated;
grant select on table public.estimate_requests to anon, authenticated;
grant update (status) on table public.estimate_requests to authenticated;
grant delete on table public.estimate_requests to authenticated;

revoke all on table public.estimate_contacts from public, anon, authenticated;
grant select on table public.estimate_contacts to authenticated;
grant update (admin_memo) on table public.estimate_contacts to authenticated;

-- 부품 목록: 고객은 표시(active)만, 관리자는 전체 조회·추가·수정·삭제 (is_admin 은 anon 실행권한이 없으므로 anon 정책에서는 호출하지 않음)
drop policy if exists "public read active estimate parts" on public.estimate_parts;
create policy "public read active estimate parts" on public.estimate_parts for select to anon using (active);
drop policy if exists "signed in read estimate parts" on public.estimate_parts;
create policy "signed in read estimate parts" on public.estimate_parts for select to authenticated
 using (active or public.is_admin((select auth.uid())));
drop policy if exists "admin insert estimate parts" on public.estimate_parts;
create policy "admin insert estimate parts" on public.estimate_parts for insert to authenticated with check (public.is_admin((select auth.uid())));
drop policy if exists "admin update estimate parts" on public.estimate_parts;
create policy "admin update estimate parts" on public.estimate_parts for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete estimate parts" on public.estimate_parts;
create policy "admin delete estimate parts" on public.estimate_parts for delete to authenticated using (public.is_admin((select auth.uid())));

-- 견적게시판 글: 숨김(hidden)이 아닌 글은 누구나, 관리자는 전체. 상태 변경·삭제는 관리자만
drop policy if exists "public read estimate requests" on public.estimate_requests;
create policy "public read estimate requests" on public.estimate_requests for select to anon using (status <> 'hidden');
drop policy if exists "signed in read estimate requests" on public.estimate_requests;
create policy "signed in read estimate requests" on public.estimate_requests for select to authenticated
 using (status <> 'hidden' or public.is_admin((select auth.uid())));
drop policy if exists "admin update estimate requests" on public.estimate_requests;
create policy "admin update estimate requests" on public.estimate_requests for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete estimate requests" on public.estimate_requests;
create policy "admin delete estimate requests" on public.estimate_requests for delete to authenticated using (public.is_admin((select auth.uid())));

-- 연락처: 관리자만 조회·메모 수정 (삭제는 게시글 삭제 시 함께)
drop policy if exists "admin read estimate contacts" on public.estimate_contacts;
create policy "admin read estimate contacts" on public.estimate_contacts for select to authenticated using (public.is_admin((select auth.uid())));
drop policy if exists "admin update estimate contacts" on public.estimate_contacts;
create policy "admin update estimate contacts" on public.estimate_contacts for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));

drop trigger if exists trg_estimate_parts_updated on public.estimate_parts;
create trigger trg_estimate_parts_updated before update on public.estimate_parts
for each row execute function public.set_products_updated_at();
drop trigger if exists trg_estimate_requests_updated on public.estimate_requests;
create trigger trg_estimate_requests_updated before update on public.estimate_requests
for each row execute function public.set_products_updated_at();

-- 고객 견적 상담 접수: 입력값을 검사하고 게시글 + 연락처를 한 번에 저장. 게시판 번호를 돌려줌
-- 게시판에는 이름 첫 글자 + '**' 만 저장 (예: 홍**). 이름·전화번호 형식은 estimate_contacts 의 CHECK 제약으로 검사
create or replace function public.submit_estimate_request(p_parts jsonb, p_name text, p_phone text, p_contact_time text, p_message text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  k text; v jsonb; picked int := 0; new_id uuid; new_no bigint;
begin
  if p_parts is null or jsonb_typeof(p_parts) <> 'object' then raise exception 'invalid parts'; end if;
  for k, v in select * from jsonb_each(p_parts) loop
    if k not in ('CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','O/S','조립선택')
       or jsonb_typeof(v) <> 'string'
       -- 관리자가 등록한 '표시' 상태 부품 이름만 허용 (게시판에 임의 문구가 올라가지 않게)
       or not exists (select 1 from public.estimate_parts ep where ep.category = k and ep.name = v #>> '{}' and ep.active) then
      raise exception 'invalid part';
    end if;
    picked := picked + 1;
  end loop;
  if picked = 0 then raise exception 'no parts'; end if;
  p_name := btrim(coalesce(p_name, '')); p_contact_time := btrim(coalesce(p_contact_time, '')); p_message := btrim(coalesce(p_message, ''));
  insert into public.estimate_requests (parts, display_name) values (p_parts, left(p_name, 1) || '**')
  returning id, request_no into new_id, new_no;
  insert into public.estimate_contacts (request_id, customer_name, phone, contact_time, message)
  values (new_id, p_name, p_phone, p_contact_time, p_message);
  return new_no;
end $$;
revoke all on function public.submit_estimate_request(jsonb, text, text, text, text) from public;
grant execute on function public.submit_estimate_request(jsonb, text, text, text, text) to anon, authenticated;

-- 처음 한 번만: 조립선택·O/S 기본 항목 (이미 목록이 있으면 넣지 않음)
insert into public.estimate_parts (category, name, sort_order)
select * from (values
  ('조립선택','조립 요청 (조립 + 기본 점검)',1),
  ('조립선택','부품만 구매 (조립 안 함)',2),
  ('O/S','Windows 11 Home',1),
  ('O/S','Windows 11 Pro',2),
  ('O/S','설치 안 함 (FreeDOS)',3)
) as v(category, name, sort_order)
where not exists (select 1 from public.estimate_parts);

commit;

-- 확인용 (선택): 3개 테이블이 보이면 정상
-- select table_name from information_schema.tables where table_schema='public' and table_name like 'estimate_%';
