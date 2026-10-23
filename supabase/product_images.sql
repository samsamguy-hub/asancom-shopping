-- 아산컴마트 상품사진 업로드: Storage 버킷 + product_images 테이블 + RLS
-- 적용 대상: supabase/schema.sql 이 이미 적용된 프로젝트 (products, admins, is_admin 필요)
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 기존 상품·관리자 데이터와 기존 정책은 수정·삭제하지 않습니다. 이 파일이 만드는 객체만 다시 만들므로 여러 번 실행해도 안전합니다.
begin;

-- 1) 비공개 버킷: 파일당 5MB, JPG/PNG/WEBP만 허용 (SVG·GIF 불가)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) 상품사진 정보. 파일 경로: products/{상품 id}/{무작위 uuid}.{jpg|png|webp}
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  -- 사진이 남은 상품은 DB에서 바로 삭제되지 않음 (저장소에 주인 없는 파일이 남는 것을 방지)
  product_id uuid not null references public.products(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  is_public boolean not null default false,
  sort_order integer not null default 0,
  alt_text text check (alt_text is null or char_length(alt_text) <= 120),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint product_images_path_format check (
    storage_path ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(storage_path, '/', 2) = product_id::text),
  constraint product_images_ext_matches_mime check (
       (mime_type = 'image/jpeg' and storage_path like '%.jpg')
    or (mime_type = 'image/png'  and storage_path like '%.png')
    or (mime_type = 'image/webp' and storage_path like '%.webp'))
);
create index if not exists idx_product_images_product on public.product_images(product_id, sort_order);

-- 권한: 조회는 누구나(RLS로 제한), 변경은 로그인 사용자(RLS로 관리자만). id·product_id·작성자는 수정 불가
revoke all on table public.product_images from public, anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant insert, delete on table public.product_images to authenticated;
grant update (storage_path, mime_type, size_bytes, is_public, sort_order, alt_text) on table public.product_images to authenticated;

alter table public.product_images enable row level security;

-- 고객: 공개 사진 + 판매 공개(active) 상품의 사진만. is_admin 은 anon 실행권한이 없으므로 anon 정책에서는 호출하지 않음
drop policy if exists "public read public product images" on public.product_images;
create policy "public read public product images" on public.product_images for select
 to anon using (is_public and exists (select 1 from public.products p where p.id = product_id and p.active));

drop policy if exists "signed in read allowed product images" on public.product_images;
create policy "signed in read allowed product images" on public.product_images for select
 to authenticated using (
   (is_public and exists (select 1 from public.products p where p.id = product_id and p.active))
   or public.is_admin((select auth.uid())));

drop policy if exists "admin insert product images" on public.product_images;
create policy "admin insert product images" on public.product_images for insert
 to authenticated with check (public.is_admin((select auth.uid())) and created_by = (select auth.uid()));

drop policy if exists "admin update product images" on public.product_images;
create policy "admin update product images" on public.product_images for update
 to authenticated using (public.is_admin((select auth.uid())))
 with check (public.is_admin((select auth.uid())));

drop policy if exists "admin delete product images" on public.product_images;
create policy "admin delete product images" on public.product_images for delete
 to authenticated using (public.is_admin((select auth.uid())));

-- 3) Storage 파일 정책 (storage.objects 의 RLS는 Supabase가 이미 켜 둠)
-- 고객: product_images 에서 볼 수 있는 행(위 RLS 적용)이 있는 파일만 서명 URL 발급 가능
drop policy if exists "public read public product image files" on storage.objects;
create policy "public read public product image files" on storage.objects for select
 to anon using (
   bucket_id = 'product-images'
   and exists (select 1 from public.product_images i where i.storage_path = objects.name));

drop policy if exists "signed in read product image files" on storage.objects;
create policy "signed in read product image files" on storage.objects for select
 to authenticated using (
   bucket_id = 'product-images'
   and (public.is_admin((select auth.uid()))
        or exists (select 1 from public.product_images i where i.storage_path = objects.name)));

-- 업로드: 관리자만, products/{존재하는 상품 id}/파일.jpg|png|webp 경로만
drop policy if exists "admin upload product image files" on storage.objects;
create policy "admin upload product image files" on storage.objects for insert
 to authenticated with check (
   bucket_id = 'product-images'
   and public.is_admin((select auth.uid()))
   and array_length(storage.foldername(name), 1) = 2
   and (storage.foldername(name))[1] = 'products'
   and exists (select 1 from public.products p where p.id::text = (storage.foldername(name))[2])
   and lower(storage.extension(name)) in ('jpg','png','webp'));

drop policy if exists "admin delete product image files" on storage.objects;
create policy "admin delete product image files" on storage.objects for delete
 to authenticated using (bucket_id = 'product-images' and public.is_admin((select auth.uid())));

-- UPDATE 정책은 만들지 않음: 기존 파일 덮어쓰기·이동 불가. 사진 교체는 새 파일 업로드 후 이전 파일 삭제로 처리.

commit;

-- 확인용 (선택): 아래 결과에 정책 9개(product_images 5개 + storage.objects 4개)가 보이면 정상
-- select tablename, policyname, cmd, roles from pg_policies
-- where policyname like '%product image%' order by 1, 2;

-- 되돌리기 (필요할 때만, 업로드한 사진 정보가 사라짐. 버킷 파일은 대시보드 Storage에서 먼저 비우기):
-- drop policy if exists "public read public product image files" on storage.objects;
-- drop policy if exists "signed in read product image files" on storage.objects;
-- drop policy if exists "admin upload product image files" on storage.objects;
-- drop policy if exists "admin delete product image files" on storage.objects;
-- drop table if exists public.product_images;
