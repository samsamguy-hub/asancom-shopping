-- 아산컴마트 회원가입 + 주문(무통장입금)
-- 적용 대상: schema.sql, product_badges.sql(sold_out), shipping_options.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: 새 테이블 3개(회원정보·주문·주문상품)와 함수만 추가. 기존 상품·관리자·RLS 정책은 변경하지 않습니다. 여러 번 실행해도 안전합니다.
-- 보안 원칙
--   * 주문은 create_order 함수로만 생성. 가격·배송비·부가세는 DB가 다시 계산하고, 화면에 보인 금액과 다르면 주문하지 않음
--   * 재고는 주문 시 원자적으로 차감(재고보다 많이 팔리지 않음). 관리자 취소 시 복구
--   * 회원은 자기 정보·자기 주문만, 관리자는 전체 조회. 비회원 주문은 주문번호 + 휴대폰번호로만 조회
begin;

-- 1) 회원 정보 (가입 시 자동 생성)
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 20),
  phone text not null default '' check (phone = '' or phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  zipcode text not null default '' check (char_length(zipcode) <= 10),
  address1 text not null default '' check (char_length(address1) <= 200),
  address2 text not null default '' check (char_length(address2) <= 200),
  agreed_terms_at timestamptz,
  agreed_privacy_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
revoke all on table public.customer_profiles from public, anon, authenticated;
grant select on table public.customer_profiles to authenticated;
grant update (name, phone, zipcode, address1, address2) on table public.customer_profiles to authenticated;
drop policy if exists "own or admin read profile" on public.customer_profiles;
create policy "own or admin read profile" on public.customer_profiles for select to authenticated
 using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));
drop policy if exists "own update profile" on public.customer_profiles;
create policy "own update profile" on public.customer_profiles for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists trg_customer_profiles_updated on public.customer_profiles;
create trigger trg_customer_profiles_updated before update on public.customer_profiles
for each row execute function public.set_products_updated_at();

-- 가입 시 회원 정보 행 생성 (가입 화면에서 보낸 이름·휴대폰·동의 여부). 오류가 나도 가입 자체는 막지 않음
create or replace function public.handle_new_customer()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  begin
    insert into public.customer_profiles (user_id, name, phone, agreed_terms_at, agreed_privacy_at)
    values (new.id, left(btrim(coalesce(m->>'name', '')), 20),
      case when coalesce(m->>'phone', '') ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$' then m->>'phone' else '' end,
      case when m->>'agree_terms' = 'true' then now() end,
      case when m->>'agree_privacy' = 'true' then now() end)
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'customer profile not created: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer after insert on auth.users
for each row execute function public.handle_new_customer();

-- 2) 주문
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','preparing','shipping','delivered','canceled')),
  orderer_name text not null check (char_length(orderer_name) between 2 and 20),
  orderer_phone text not null check (orderer_phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  orderer_email text not null default '' check (char_length(orderer_email) <= 120),
  shipping_option_id uuid,
  shipping_name text not null check (char_length(shipping_name) between 1 and 60),
  shipping_fee integer not null check (shipping_fee >= 0),
  is_pickup boolean not null default false,
  receiver_name text not null default '' check (char_length(receiver_name) <= 20),
  receiver_phone text not null default '' check (receiver_phone = '' or receiver_phone ~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$'),
  zipcode text not null default '' check (char_length(zipcode) <= 10),
  address1 text not null default '' check (char_length(address1) <= 200),
  address2 text not null default '' check (char_length(address2) <= 200),
  delivery_memo text not null default '' check (char_length(delivery_memo) <= 200),
  goods_total integer not null default 0 check (goods_total >= 0),
  vat integer not null default 0 check (vat >= 0),
  total integer not null default 0 check (total >= 0),
  payment_method text not null default '무통장입금' check (payment_method in ('무통장입금')),
  bank_account text not null check (char_length(bank_account) <= 100),
  depositor_name text not null check (char_length(depositor_name) between 1 and 20),
  cash_receipt_type text not null default 'none' check (cash_receipt_type in ('none','income','expense')),
  cash_receipt_number text not null default '' check (char_length(cash_receipt_number) <= 20),
  agreed_at timestamptz not null default now(),
  admin_memo text check (char_length(admin_memo) <= 2000),
  paid_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  category text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total integer not null check (line_total >= 0)
);
create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
-- 직접 쓰기 권한 없음 (생성은 create_order 함수). 관리자만 상태·메모 변경. 주문 기록은 법정 보관(5년) 때문에 삭제 권한을 주지 않음
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;
grant update (status, admin_memo, paid_at) on table public.orders to authenticated;
drop policy if exists "own or admin read orders" on public.orders;
create policy "own or admin read orders" on public.orders for select to authenticated
 using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated
 using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "own or admin read order items" on public.order_items;
create policy "own or admin read order items" on public.order_items for select to authenticated
 using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin((select auth.uid())))));
-- 취소는 재고를 복구하는 cancel_order 함수로만, 취소된 주문은 되살리지 않음
create or replace function public.guard_order_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'canceled' and new.status <> 'canceled' then raise exception 'canceled_order'; end if;
  if new.status = 'canceled' and old.status <> 'canceled' and coalesce(current_setting('app.order_cancel', true), '') <> 'on' then raise exception 'use_cancel_order'; end if;
  return new;
end $$;
drop trigger if exists trg_orders_guard_status on public.orders;
create trigger trg_orders_guard_status before update on public.orders
for each row execute function public.guard_order_status();
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
for each row execute function public.set_products_updated_at();

-- 3) 주문 생성: p_items = [{"product_id": "...", "quantity": 1}], p_info = 주문자·배송·입금 정보
-- 단가·배송비는 DB 값, 부가세 = (상품 + 배송비) 의 10% (원 미만 버림). p_expected_total 과 다르면 'price_changed'
create or replace function public.create_order(p_items jsonb, p_shipping_id uuid, p_info jsonb, p_bank_account text, p_expected_total integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ship record; v_pickup boolean; v_order uuid; v_no text; it record; p record;
  v_goods integer := 0; v_vat integer; v_total integer; v_lines integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid_items'; end if;
  select * into v_ship from public.shipping_options where id = p_shipping_id and active;
  if not found then raise exception 'invalid_shipping'; end if;
  v_pickup := position('수령' in v_ship.name) > 0;
  if not v_pickup and (char_length(btrim(coalesce(p_info->>'address1', ''))) < 2 or char_length(btrim(coalesce(p_info->>'receiver_name', ''))) < 2
     or coalesce(p_info->>'receiver_phone', '') = '') then
    raise exception 'address_required';
  end if;
  loop
    v_no := 'AC' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.orders where order_no = v_no);
  end loop;
  insert into public.orders (order_no, user_id, orderer_name, orderer_phone, orderer_email, shipping_option_id, shipping_name, shipping_fee, is_pickup,
    receiver_name, receiver_phone, zipcode, address1, address2, delivery_memo, bank_account, depositor_name, cash_receipt_type, cash_receipt_number)
  values (v_no, auth.uid(), btrim(p_info->>'orderer_name'), p_info->>'orderer_phone', btrim(coalesce(p_info->>'orderer_email', '')),
    v_ship.id, v_ship.name, v_ship.fee, v_pickup,
    case when v_pickup then '' else btrim(coalesce(p_info->>'receiver_name', '')) end,
    case when v_pickup then '' else coalesce(p_info->>'receiver_phone', '') end,
    case when v_pickup then '' else btrim(coalesce(p_info->>'zipcode', '')) end,
    case when v_pickup then '' else btrim(coalesce(p_info->>'address1', '')) end,
    case when v_pickup then '' else btrim(coalesce(p_info->>'address2', '')) end,
    btrim(coalesce(p_info->>'delivery_memo', '')), p_bank_account, btrim(coalesce(p_info->>'depositor_name', '')),
    coalesce(p_info->>'cash_receipt_type', 'none'), btrim(coalesce(p_info->>'cash_receipt_number', '')))
  returning id into v_order;
  -- 같은 상품이 여러 번 오면 합쳐서 처리. 판매 공개·품절 아님·재고 충분할 때만 차감
  for it in select (e->>'product_id')::uuid as pid, sum((e->>'quantity')::int)::int as qty
            from jsonb_array_elements(p_items) e group by 1 loop
    if it.qty is null or it.qty < 1 or it.qty > 99 then raise exception 'invalid_quantity'; end if;
    update public.products set stock = stock - it.qty
     where id = it.pid and active and not sold_out and stock >= it.qty
     returning name, category, price into p;
    if not found then raise exception 'out_of_stock'; end if;
    insert into public.order_items (order_id, product_id, product_name, category, unit_price, quantity, line_total)
    values (v_order, it.pid, p.name, p.category, p.price, it.qty, p.price * it.qty);
    v_goods := v_goods + p.price * it.qty; v_lines := v_lines + 1;
  end loop;
  if v_lines = 0 then raise exception 'invalid_items'; end if;
  v_vat := (v_goods + v_ship.fee) / 10;
  v_total := v_goods + v_ship.fee + v_vat;
  if p_expected_total is distinct from v_total then raise exception 'price_changed'; end if;
  update public.orders set goods_total = v_goods, vat = v_vat, total = v_total where id = v_order;
  return jsonb_build_object('order_no', v_no, 'total', v_total);
end $$;
revoke all on function public.create_order(jsonb, uuid, jsonb, text, integer) from public;
grant execute on function public.create_order(jsonb, uuid, jsonb, text, integer) to anon, authenticated;

-- 4) 비회원 주문 조회: 주문번호 + 주문자 휴대폰번호가 모두 맞을 때만
create or replace function public.lookup_order(p_order_no text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_no', o.order_no, 'status', o.status, 'created_at', o.created_at, 'orderer_name', o.orderer_name,
    'shipping_name', o.shipping_name, 'shipping_fee', o.shipping_fee, 'is_pickup', o.is_pickup,
    'receiver_name', o.receiver_name, 'address1', o.address1, 'address2', o.address2,
    'goods_total', o.goods_total, 'vat', o.vat, 'total', o.total, 'bank_account', o.bank_account, 'depositor_name', o.depositor_name,
    'items', coalesce((select jsonb_agg(jsonb_build_object('product_name', i.product_name, 'unit_price', i.unit_price, 'quantity', i.quantity, 'line_total', i.line_total))
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.orders o where o.order_no = upper(btrim(p_order_no)) and o.orderer_phone = p_phone;
$$;
revoke all on function public.lookup_order(text, text) from public;
grant execute on function public.lookup_order(text, text) to anon, authenticated;

-- 5) 관리자 주문 취소: 상태를 취소로 바꾸고 재고 복구 (한 번만)
create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  perform set_config('app.order_cancel', 'on', true);
  update public.orders set status = 'canceled', canceled_at = now() where id = p_order_id and status <> 'canceled';
  if not found then return; end if;
  update public.products pr set stock = least(pr.stock + i.quantity, 1000000)
    from public.order_items i where i.order_id = p_order_id and i.product_id = pr.id;
end $$;
revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;

commit;

-- 확인용 (선택): 3개 테이블이 보이면 정상
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('customer_profiles','orders','order_items');
