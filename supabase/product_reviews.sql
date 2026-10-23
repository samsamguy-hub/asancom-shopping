-- 아산컴마트 상품 리뷰 (작성 → 관리자 승인 후 게시)
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (products, is_admin 필요). Supabase SQL Editor에서 전체 실행
-- 기존 상품·관리자·정책은 변경하지 않습니다. 여러 번 실행해도 안전합니다.
--
-- 보안 설계
--  - 고객(비로그인 포함)은 닉네임·별점·내용만 쓸 수 있고, 상태는 항상 '검토 대기'로 시작 (열 단위 권한 + RLS 이중 제한)
--  - 고객에게는 '게시(approved)' 상태이면서 판매 공개 상품의 리뷰만 보임
--  - 관리자는 승인·숨김·삭제·구매확인 표시·판매자 답글만 가능. 리뷰 작성·본문 수정 권한 없음 (리뷰 조작 방지)
--  - 이메일·전화번호·IP 등 개인정보는 저장하지 않음
begin;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  verified_purchase boolean not null default false,
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_product_reviews_product on public.product_reviews(product_id, status, created_at desc);
create index if not exists idx_product_reviews_status on public.product_reviews(status, created_at desc);

-- 열 단위 권한: 고객은 4개 열만 입력 가능 → status·구매확인·답글을 스스로 정할 수 없음
revoke all on table public.product_reviews from public, anon, authenticated;
grant select on table public.product_reviews to anon, authenticated;
grant insert (product_id, nickname, rating, content) on table public.product_reviews to anon, authenticated;
grant update (status, verified_purchase, admin_reply, replied_at) on table public.product_reviews to authenticated;
grant delete on table public.product_reviews to authenticated;
alter table public.product_reviews enable row level security;

drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews" on public.product_reviews for select
 to anon using (status = 'approved' and exists (select 1 from public.products p where p.id = product_id and p.active));
drop policy if exists "signed in read reviews" on public.product_reviews;
create policy "signed in read reviews" on public.product_reviews for select
 to authenticated using (
   (status = 'approved' and exists (select 1 from public.products p where p.id = product_id and p.active))
   or public.is_admin((select auth.uid())));

-- 작성: 판매 공개 상품에만, 반드시 검토 대기·구매확인 없음·답글 없음 상태로
drop policy if exists "anyone submit pending review" on public.product_reviews;
create policy "anyone submit pending review" on public.product_reviews for insert
 to anon, authenticated with check (
   status = 'pending' and verified_purchase = false and admin_reply is null and replied_at is null
   and exists (select 1 from public.products p where p.id = product_id and p.active));

drop policy if exists "admin moderate reviews" on public.product_reviews;
create policy "admin moderate reviews" on public.product_reviews for update
 to authenticated using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
drop policy if exists "admin delete reviews" on public.product_reviews;
create policy "admin delete reviews" on public.product_reviews for delete
 to authenticated using (public.is_admin((select auth.uid())));

drop trigger if exists trg_product_reviews_updated on public.product_reviews;
create trigger trg_product_reviews_updated before update on public.product_reviews
for each row execute function public.set_products_updated_at();

commit;

-- 확인용 (선택): 정책 5개가 보이면 정상
-- select policyname, cmd, roles from pg_policies where tablename = 'product_reviews' order by 1;
