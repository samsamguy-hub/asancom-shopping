-- 아산컴마트 A/S 신청 접수
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (is_admin, set_products_updated_at 필요). Supabase SQL Editor에서 전체 실행
-- 하는 일: 새 테이블 1개 + 접수 함수만 추가. 기존 상품·관리자·RLS 정책은 변경하지 않습니다. 여러 번 실행해도 안전합니다.
-- 이름·전화번호·주소가 들어 있으므로 조회·수정·삭제는 관리자만. 고객 접수는 submit_as_request 함수로만 가능 (테이블 직접 쓰기 권한 없음)
begin;

create table if not exists public.as_requests (
  id uuid primary key default gen_random_uuid(),
  request_no bigint generated always as identity unique,
  customer_name text not null check (char_length(customer_name) between 2 and 20),
  phone text not null check (phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  contact_time text not null check (char_length(contact_time) between 1 and 60),
  product_type text not null check (product_type in ('조립PC(데스크탑)','브랜드PC','노트북','모니터','PC부품','기타')),
  purchase_place text not null check (purchase_place in ('아산컴마트 구매','다른 곳에서 구매','모름')),
  purchase_date text not null default '' check (char_length(purchase_date) <= 30),
  symptom_type text not null check (symptom_type in ('전원이 안 켜짐','부팅이 안 됨','화면이 안 나옴','블루스크린·재부팅','속도 저하','소음·발열','인터넷·네트워크','부품 교체·업그레이드','윈도우 설치','기타')),
  symptom text not null check (char_length(symptom) between 5 and 2000),
  receipt_method text not null check (receipt_method in ('매장 방문','택배 발송','출장 방문 요청')),
  visit_address text not null default '' check (char_length(visit_address) <= 120),
  status text not null default 'received' check (status in ('received','checking','repairing','done','returned','canceled')),
  admin_memo text check (char_length(admin_memo) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_as_requests_created on public.as_requests(created_at desc);

alter table public.as_requests enable row level security;
revoke all on table public.as_requests from public, anon, authenticated;
grant select, delete on table public.as_requests to authenticated;
grant update (status, admin_memo) on table public.as_requests to authenticated;

drop policy if exists "admin read as requests" on public.as_requests;
create policy "admin read as requests" on public.as_requests for select to authenticated using (public.is_admin((select auth.uid())));
drop policy if exists "admin update as requests" on public.as_requests;
create policy "admin update as requests" on public.as_requests for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete as requests" on public.as_requests;
create policy "admin delete as requests" on public.as_requests for delete to authenticated using (public.is_admin((select auth.uid())));

drop trigger if exists trg_as_requests_updated on public.as_requests;
create trigger trg_as_requests_updated before update on public.as_requests
for each row execute function public.set_products_updated_at();

-- 고객 A/S 접수: 항상 '접수' 상태로 저장하고 접수번호를 돌려줌. 각 값의 형식은 위 CHECK 제약으로 검사
create or replace function public.submit_as_request(
  p_name text, p_phone text, p_contact_time text, p_product_type text, p_purchase_place text, p_purchase_date text,
  p_symptom_type text, p_symptom text, p_receipt_method text, p_visit_address text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_no bigint;
begin
  if p_receipt_method = '출장 방문 요청' and char_length(btrim(coalesce(p_visit_address, ''))) < 2 then raise exception 'address required'; end if;
  insert into public.as_requests (customer_name, phone, contact_time, product_type, purchase_place, purchase_date, symptom_type, symptom, receipt_method, visit_address)
  values (btrim(p_name), p_phone, btrim(p_contact_time), p_product_type, p_purchase_place, btrim(coalesce(p_purchase_date, '')),
          p_symptom_type, btrim(p_symptom), p_receipt_method,
          case when p_receipt_method = '출장 방문 요청' then btrim(coalesce(p_visit_address, '')) else '' end)
  returning request_no into new_no;
  return new_no;
end $$;
revoke all on function public.submit_as_request(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_as_request(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

commit;

-- 확인용 (선택): as_requests 가 보이면 정상
-- select table_name from information_schema.tables where table_schema='public' and table_name='as_requests';
