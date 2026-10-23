-- 아산컴마트 조립PC 견적 확장: 'CPU쿨러' 카테고리 허용
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: products.category 의 허용 목록에 'CPU쿨러'만 추가 (기존 카테고리는 그대로라 기존 상품 영향 없음)
-- 상품 데이터, 관리자, RLS 정책은 변경하지 않습니다. 호환성 규격은 기존 specs(jsonb) 열에 저장되어 다른 DB 변경은 없습니다.
-- 여러 번 실행해도 안전합니다.
begin;

-- category 열의 기존 CHECK 제약을 이름과 관계없이 찾아 교체
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
  check (category in ('완제품','중고PC','CPU','메인보드','메모리','그래픽카드','SSD','파워','케이스','CPU쿨러','노트북','모니터','주변기기'));

commit;

-- 확인용 (선택): 결과에 'CPU쿨러'가 포함되어 있으면 정상
-- select pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.products'::regclass and conname = 'products_category_check';
