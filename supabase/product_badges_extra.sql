-- 아산컴마트 상품 배지 추가: 무료배송·출장가능·경품
-- 적용 대상: supabase/product_badges.sql 이 이미 적용된 프로젝트 (products.badges 열 있음). Supabase SQL Editor에서 전체 실행
-- 하는 일: products.badges 허용 목록(제약)만 넓힘. 상품·사진·가격·주문 등 데이터는 바꾸거나 지우지 않습니다.
-- 배지는 표시용이며 주문 배송비·출장설치비 계산(create_order, shipping_options)에는 영향이 없습니다.
-- 여러 번 실행해도 안전합니다.
begin;

alter table public.products drop constraint if exists products_badges_check;
alter table public.products add constraint products_badges_check
  check (badges <@ array['인기','임박','NEW','특가','한정수량','무료배송','출장가능','경품','중고']::text[] and cardinality(badges) <= 9);

commit;

-- 확인용 (선택): 무료배송·출장가능·경품이 포함된 줄이 보이면 정상
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'products_badges_check';
