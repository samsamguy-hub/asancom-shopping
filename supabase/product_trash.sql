-- 아산컴마트 상품 휴지통
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products 에 열 2개 추가. 기존 상품은 모두 "휴지통 아님"으로 시작하며 다른 데이터·관리자·RLS 는 변경하지 않습니다.
--   deleted_at         : 휴지통으로 옮긴 시각 (비어 있으면 일반 상품)
--   deleted_was_active : 휴지통으로 옮기기 전 판매 공개 여부 (복구할 때 원래 상태로 되돌리기 위함)
-- 휴지통 상품은 active=false(판매중지)로 바뀌므로 기존 RLS 그대로 고객 화면·장바구니·견적에서 보이지 않습니다.
-- 여러 번 실행해도 안전합니다.
begin;

alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists deleted_was_active boolean not null default false;
create index if not exists idx_products_deleted_at on public.products(deleted_at) where deleted_at is not null;

commit;

-- 확인용 (선택): deleted_at, deleted_was_active 두 줄이 보이면 정상
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'products' and column_name in ('deleted_at','deleted_was_active');
