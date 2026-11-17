-- 아산컴마트 메인 추천상품 '인기제품순' 순위
-- 적용 대상: supabase/members_orders.sql 과 supabase/visitor_stats.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
--   (visitor_stats.sql 을 먼저 실행해야 합니다. 방문 통계 테이블이 없으면 이 파일 실행이 실패하며, 실패해도 바뀌는 것은 없습니다)
-- 하는 일: 조회용 함수 1개만 추가. 테이블·데이터는 만들거나 바꾸거나 지우지 않습니다. 여러 번 실행해도 안전합니다.
--
-- 순위 기준 (실제 데이터만 사용, 임의 순위 없음)
--  1) 판매 수량: 입금 확인 이후 단계(paid·preparing·shipping·delivered) 주문의 상품별 수량 합계. 대기(pending)·취소 주문 제외
--  2) 같으면 최근 30일 상품 상세페이지 조회수 (방문 통계)
--  3) 같으면 최신 등록 상품
--  판매·조회가 모두 0인 상품은 순위에 넣지 않음 → 화면에서 순위 상품 뒤에 등록순으로 이어 붙임
-- 공개 범위: 고객 화면에서 호출하므로 '상품 id와 순위'만 돌려줌. 판매 수량·조회수·주문 정보는 노출하지 않음
begin;

create or replace function public.product_popularity_rank()
returns table (product_id uuid, rank integer)
language sql stable security definer set search_path = '' as $$
  with sold as (
    select i.product_id, sum(i.quantity)::bigint as qty
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where o.status in ('paid', 'preparing', 'shipping', 'delivered') and i.product_id is not null
    group by i.product_id
  ), viewed as (
    select substring(v.path from '^/products/([a-z0-9-]+)$') as slug, sum(v.views)::bigint as views
    from public.site_page_views v
    where v.day > (now() at time zone 'Asia/Seoul')::date - 30 and v.path like '/products/%'
    group by 1
  )
  select p.id, (row_number() over (order by coalesce(s.qty, 0) desc, coalesce(w.views, 0) desc, p.created_at desc))::integer
  from public.products p
  left join sold s on s.product_id = p.id
  left join viewed w on w.slug = p.slug
  where p.active and (coalesce(s.qty, 0) > 0 or coalesce(w.views, 0) > 0)
$$;

revoke all on function public.product_popularity_rank() from public;
grant execute on function public.product_popularity_rank() to anon, authenticated;

commit;

-- 확인용 (선택): 함수가 있으면 결과 1줄 (없으면 null)
-- select to_regprocedure('public.product_popularity_rank()');
