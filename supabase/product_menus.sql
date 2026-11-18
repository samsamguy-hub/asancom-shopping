-- 아산컴마트 상단 상품 메뉴 카테고리 추가: 프리미엄 · 한정판 · 데스크톱세트
-- 적용 대상: supabase/schema.sql (+ builder_specs.sql) 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products.category 허용 목록에 '프리미엄', '한정판', '데스크톱세트' 3개만 추가 ('모니터'는 이미 있음)
--   기존 카테고리는 그대로라 기존 상품 영향 없음. 상품을 옮기거나 값을 바꾸지 않습니다.
--   (이전 초안의 is_premium·is_limited 열 추가는 운영 DB에 적용된 적이 없어 제거함 → 프리미엄·한정판은 일반 카테고리로 관리)
-- 상품·사진·가격·설명·주문·게시물 데이터와 RLS 는 변경하지 않습니다.
-- 여러 번 실행해도 안전합니다.
begin;

-- category 열의 기존 CHECK 제약을 이름과 관계없이 찾아 교체 (builder_specs.sql 과 같은 방식)
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
    where con.conrelid = 'public.products'::regclass and con.contype = 'c' and a.attname = 'category'
  loop
    execute format('alter table public.products drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.products add constraint products_category_check
  check (category in ('프리미엄','한정판','완제품','중고PC','데스크톱세트','CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','노트북','모니터','주변기기'));

commit;

-- 확인용 (선택): 결과에 '프리미엄', '한정판', '데스크톱세트'가 보이면 정상
-- select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.products'::regclass and conname = 'products_category_check';

-- 되돌리기 (필요할 때만. 세 카테고리 상품이 남아 있으면 실패하므로 먼저 다른 카테고리로 바꿀 것):
-- alter table public.products drop constraint if exists products_category_check;
-- alter table public.products add constraint products_category_check
--   check (category in ('완제품','중고PC','CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','노트북','모니터','주변기기'));
