-- 아산컴마트 쇼핑몰 스타터 DB: Supabase SQL Editor에서 전체 실행
-- 테스트 프로젝트에서 먼저 실행하십시오. 실서비스 데이터가 있는 DB에 무작정 적용하지 마세요.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,90}$'),
  category text not null check (category in ('완제품','중고PC','CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','노트북','모니터','주변기기')),
  description text not null default '',
  price integer not null check (price >= 0 and price <= 1000000000),
  stock integer not null default 0 check (stock >= 0 and stock <= 1000000),
  is_used boolean not null default false,
  active boolean not null default true,
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_active_category on public.products(active,category);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 활성화된 상품만 공개. 관리자는 비공개 상품도 볼 수 있음.
create or replace function public.is_admin(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.admins a where a.user_id = p_user_id);
$$;

-- 권한 부여(Grant)와 행 보안(RLS)을 모두 제한
revoke all on table public.products from public, anon, authenticated;
grant select on table public.products to anon;
grant select, insert, update, delete on table public.products to authenticated;
revoke all on table public.admins from public, anon, authenticated;
grant select on table public.admins to authenticated;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.products enable row level security;
alter table public.admins enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select
 to anon using (active = true);
drop policy if exists "signed in read allowed products" on public.products;
create policy "signed in read allowed products" on public.products for select
 to authenticated using (active = true or public.is_admin((select auth.uid())));

drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products for insert
 to authenticated with check (public.is_admin((select auth.uid())));

drop policy if exists "admin update products" on public.products;
create policy "admin update products" on public.products for update
 to authenticated using (public.is_admin((select auth.uid())))
 with check (public.is_admin((select auth.uid())));

drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products for delete
 to authenticated using (public.is_admin((select auth.uid())));

drop policy if exists "admin read own role" on public.admins;
create policy "admin read own role" on public.admins for select
 to authenticated using (user_id = (select auth.uid()));

create or replace function public.set_products_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
for each row execute function public.set_products_updated_at();

-- DB 연결 테스트용 가상상품 (판매가 아님, 관리자에서 삭제 또는 수정할 것)
insert into public.products (name,slug,category,description,price,stock,is_used,specs)
values
('라이젠5 5600 게이밍PC (가상 예시)','demo-gaming-5600','완제품','실제 상품이 아닌 시연용 가상 상품입니다.',869000,3,false,'{"cpu":"Ryzen 5 5600","ram":"16GB DDR4","graphics":"RTX 5060","storage":"NVMe 500GB"}'),
('중고 사무용PC (가상 예시)','demo-used-pc','중고PC','실제 상품이 아닌 시연용 가상 상품입니다.',259000,2,true,'{"cpu":"Core i5","ram":"16GB","storage":"SSD 256GB"}'),
('AMD 라이젠5 5600 (가상 예시)','demo-cpu-5600','CPU','테스트용 가격입니다.',145000,5,false,'{"socket":"AM4","memory_type":"DDR4","power_w":65}'),
('AMD 라이젠5 7500F (가상 예시)','demo-cpu-7500f','CPU','테스트용 가격입니다.',195000,5,false,'{"socket":"AM5","memory_type":"DDR5","power_w":65}'),
('B550M DDR4 메인보드 (가상 예시)','demo-board-b550','메인보드','테스트용 가격입니다.',115000,5,false,'{"socket":"AM4","memory_type":"DDR4"}'),
('B650M DDR5 메인보드 (가상 예시)','demo-board-b650','메인보드','테스트용 가격입니다.',170000,5,false,'{"socket":"AM5","memory_type":"DDR5"}'),
('DDR4 16GB (가상 예시)','demo-ram-ddr4','메모리','테스트용 가격입니다.',65000,5,false,'{"memory_type":"DDR4"}'),
('DDR5 32GB (가상 예시)','demo-ram-ddr5','메모리','테스트용 가격입니다.',145000,5,false,'{"memory_type":"DDR5"}'),
('RTX 5060 (가상 예시)','demo-rtx5060','그래픽카드','테스트용 가격입니다.',470000,5,false,'{"power_w":180,"gpu_length_mm":245}'),
('RTX 5070 (가상 예시)','demo-rtx5070','그래픽카드','테스트용 가격입니다.',780000,5,false,'{"power_w":250,"gpu_length_mm":300}'),
('NVMe SSD 500GB (가상 예시)','demo-ssd500','SSD','테스트용 가격입니다.',70000,5,false,'{}'),
('정격 600W 파워 (가상 예시)','demo-psu600','파워','테스트용 가격입니다.',65000,5,false,'{"power_w":600}'),
('미들타워 케이스 (가상 예시)','demo-case','케이스','테스트용 가격입니다.',79000,5,false,'{"max_gpu_length_mm":320}')
on conflict (slug) do nothing;

-- !!! 별도 단계: Supabase Auth > Users에서 관리자 계정을 만든 뒤 다음 SQL을 수정하여 실행
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;
