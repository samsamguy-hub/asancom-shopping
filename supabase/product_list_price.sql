-- 아산컴마트 정상가(할인 전 가격) 표시
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products 에 list_price 열 1개 추가 (비어 있으면 할인 표시 없음). 기존 상품·관리자·RLS 변경 없음
-- "정상가 > 판매가" 검사는 앱에서 함 (DB 제약으로 두면 판매가만 올릴 때 저장이 막히므로)
-- 여러 번 실행해도 안전합니다.
begin;

alter table public.products add column if not exists list_price integer;
alter table public.products drop constraint if exists products_list_price_check;
alter table public.products add constraint products_list_price_check
  check (list_price is null or (list_price >= 0 and list_price <= 1000000000));

commit;

-- 확인용 (선택): list_price 한 줄이 보이면 정상
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'products' and column_name = 'list_price';
