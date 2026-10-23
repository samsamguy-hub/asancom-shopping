-- 아산컴마트 배송·설치 방법과 비용 (관리자가 추가·수정 가능)
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (admins, is_admin 필요). Supabase SQL Editor에서 전체 실행
-- 하는 일: shipping_options 테이블 추가 + RLS + 처음 한 번만 기본 4가지 입력. 기존 상품·관리자·정책은 변경하지 않습니다.
-- 금액은 상품 가격과 같이 VAT 별도 금액(공급가)입니다. 여러 번 실행해도 안전합니다.
begin;

create table if not exists public.shipping_options (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  fee integer not null check (fee between 0 and 10000000),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between -1000 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.shipping_options from public, anon, authenticated;
grant select on table public.shipping_options to anon, authenticated;
grant insert, update, delete on table public.shipping_options to authenticated;
alter table public.shipping_options enable row level security;

-- 고객: 사용 중인 방법만 조회. 관리자: 전체 조회·변경 (is_admin 은 anon 실행권한이 없으므로 anon 정책에서는 호출하지 않음)
drop policy if exists "public read active shipping options" on public.shipping_options;
create policy "public read active shipping options" on public.shipping_options for select
 to anon using (active);
drop policy if exists "signed in read shipping options" on public.shipping_options;
create policy "signed in read shipping options" on public.shipping_options for select
 to authenticated using (active or public.is_admin((select auth.uid())));
drop policy if exists "admin insert shipping options" on public.shipping_options;
create policy "admin insert shipping options" on public.shipping_options for insert
 to authenticated with check (public.is_admin((select auth.uid())));
drop policy if exists "admin update shipping options" on public.shipping_options;
create policy "admin update shipping options" on public.shipping_options for update
 to authenticated using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete shipping options" on public.shipping_options;
create policy "admin delete shipping options" on public.shipping_options for delete
 to authenticated using (public.is_admin((select auth.uid())));

drop trigger if exists trg_shipping_options_updated on public.shipping_options;
create trigger trg_shipping_options_updated before update on public.shipping_options
for each row execute function public.set_products_updated_at();

-- 기본 배송·설치 방법: 테이블이 비어 있을 때만 입력 (관리자가 수정·삭제한 뒤 다시 실행해도 덮어쓰지 않음)
insert into public.shipping_options (name, description, fee, sort_order)
select * from (values
  ('택배 배송', '전국 택배 발송 (제주·도서산간 추가 요금은 주문 상담 시 안내)', 5000, 10),
  ('출장 설치 - 아산 지역', '아산시 지역 방문 설치', 0, 20),
  ('출장 설치 - 천안 지역', '천안시 지역 방문 설치', 50000, 30),
  ('매장 방문 수령', '충남 아산시 온천대로 1408 (온양고 앞) 매장에서 직접 수령', 0, 40)
) as v(name, description, fee, sort_order)
where not exists (select 1 from public.shipping_options);

commit;

-- 확인용 (선택): 기본 4가지가 보이면 정상
-- select name, fee, active, sort_order from public.shipping_options order by sort_order;
