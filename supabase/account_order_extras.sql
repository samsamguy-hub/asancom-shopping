-- 아산컴마트 회원 탈퇴 + 입금 기한 지난 주문 자동 취소
-- 적용 대상: supabase/members_orders.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: 함수만 추가·교체하고, 자동 취소 예약(pg_cron)을 등록합니다. 기존 상품·주문·관리자·RLS 정책은 변경하지 않습니다.
-- 여러 번 실행해도 안전합니다.
begin;

-- 1) 회원 탈퇴: 로그인한 본인 계정만 삭제. 회원 정보는 함께 삭제되고, 주문 기록은 법정 보관(5년)을 위해 남기되 회원 연결만 끊김(user_id = null)
--    관리자 계정은 이 기능으로 탈퇴할 수 없음 (실수로 관리자 권한이 사라지는 것 방지)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'admin_account'; end if;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2) 주문 취소 공통 처리: 상태를 취소로 바꾸고 재고를 한 번만 복구 (권한 확인은 부르는 쪽에서)
create or replace function public.cancel_order_internal(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.order_cancel', 'on', true);
  update public.orders set status = 'canceled', canceled_at = now() where id = p_order_id and status <> 'canceled';
  if not found then return false; end if;
  update public.products pr set stock = least(pr.stock + i.quantity, 1000000)
    from public.order_items i where i.order_id = p_order_id and i.product_id = pr.id;
  return true;
end $$;
revoke all on function public.cancel_order_internal(uuid) from public, anon, authenticated;

-- 관리자 주문 취소 (기존 함수를 공통 처리로 교체)
create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  perform public.cancel_order_internal(p_order_id);
end $$;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- 3) 입금 기한(주문 후 p_days 일)이 지난 '입금대기' 주문을 모두 취소하고 재고 복구. 취소한 건수를 돌려줌
--    자동 예약(pg_cron, 로그인 없음)이나 관리자만 실행 가능
create or replace function public.cancel_expired_orders(p_days integer default 3)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'invalid_days'; end if;
  for r in select id from public.orders where status = 'pending' and created_at < now() - make_interval(days => p_days) for update skip locked loop
    if public.cancel_order_internal(r.id) then
      n := n + 1;
      update public.orders set admin_memo = left(concat_ws(E'\n', admin_memo, '입금 기한 경과로 자동 취소 (' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') || ')'), 2000) where id = r.id;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.cancel_expired_orders(integer) from public, anon;
grant execute on function public.cancel_expired_orders(integer) to authenticated;

commit;

-- 4) 자동 실행 예약: 매시 정각에 기한 지난 주문 취소 (pg_cron). 실패해도 위 함수들은 이미 적용됨
--    pg_cron 을 쓸 수 없으면 관리자 → 주문 관리의 '기한 지난 주문 취소' 버튼으로 직접 실행하세요.
do $$
begin
  create extension if not exists pg_cron;
  if exists (select 1 from cron.job where jobname = 'asancommart-cancel-expired-orders') then
    perform cron.unschedule('asancommart-cancel-expired-orders');
  end if;
  perform cron.schedule('asancommart-cancel-expired-orders', '0 * * * *', 'select public.cancel_expired_orders(3)');
  raise notice '자동 취소 예약 완료 (매시 정각)';
exception when others then
  raise notice '자동 취소 예약 실패: % — Database > Extensions 에서 pg_cron 을 켠 뒤 이 파일을 다시 실행하세요.', sqlerrm;
end $$;

-- 확인용 (선택): 예약이 보이면 정상
-- select jobname, schedule, command from cron.job where jobname = 'asancommart-cancel-expired-orders';
