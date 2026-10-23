-- 아산컴마트 상품 품절 표시 + 배지(인기·임박·NEW·특가·한정수량·중고)
-- (이미 실행했던 경우에도 다시 실행하면 '중고' 배지가 허용 목록에 추가됩니다)
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products 에 열 2개 추가. 기존 상품은 "품절 아님, 배지 없음"으로 시작하며 다른 데이터·관리자·RLS 는 변경하지 않습니다.
-- (기존 RLS: 고객은 조회만, 관리자만 수정 → 새 열에도 그대로 적용)
-- 여러 번 실행해도 안전합니다.
begin;

-- 관리자가 직접 지정하는 품절. 재고 수량과 관계없이 고객 화면에 품절로 표시되고 장바구니·주문 불가
alter table public.products add column if not exists sold_out boolean not null default false;

-- 상품 배지: 허용된 값만, 최대 5개
alter table public.products add column if not exists badges text[] not null default '{}';
alter table public.products drop constraint if exists products_badges_check;
alter table public.products add constraint products_badges_check
  check (badges <@ array['인기','임박','NEW','특가','한정수량','중고']::text[] and cardinality(badges) <= 6);

commit;

-- 확인용 (선택): sold_out, badges 두 줄이 보이면 정상
-- select column_name, data_type, column_default from information_schema.columns
-- where table_schema = 'public' and table_name = 'products' and column_name in ('sold_out','badges');
