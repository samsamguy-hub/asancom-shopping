-- 아산컴마트 관리자 지정 추천상품 (추천순 정렬: 메인 추천상품 '추천순' + 상품목록 '추천순' 공용 기준)
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products 에 featured_rank 열 1개 추가. 비어 있음(null) = 일반 상품, 1~999 = 추천상품(숫자가 작을수록 먼저)
--   추천 여부와 순위를 한 열로 관리하므로 "추천 해제인데 순위가 남는" 충돌이 생기지 않음. 같은 순위 여러 상품 가능(그 안에서는 최신 등록순)
-- 기존 상품은 모두 "추천 아님"으로 시작합니다. 상품·사진·가격·설명·주문·게시물 데이터와 RLS 는 변경하지 않습니다.
-- (기존 RLS: 고객은 조회만, 관리자만 수정 → 새 열에도 그대로 적용)
-- 여러 번 실행해도 안전합니다. 이미 지정한 추천값은 다시 실행해도 지워지지 않습니다.
begin;

alter table public.products add column if not exists featured_rank smallint;
alter table public.products drop constraint if exists products_featured_rank_check;
alter table public.products add constraint products_featured_rank_check
  check (featured_rank is null or featured_rank between 1 and 999);

commit;

-- 확인용 (선택): featured_rank 한 줄이 보이면 정상
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'products' and column_name = 'featured_rank';

-- 되돌리기 (필요할 때만, 지정한 추천 정보만 사라지고 상품 데이터는 그대로):
-- alter table public.products drop constraint if exists products_featured_rank_check;
-- alter table public.products drop column if exists featured_rank;
