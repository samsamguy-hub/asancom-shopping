-- 아산컴마트 배송·설치 소요 기간
-- 적용 대상: supabase/shipping_options.sql 이 이미 적용된 프로젝트. Supabase SQL Editor에서 전체 실행
-- 하는 일: shipping_options 에 lead_time(소요 기간 안내 문구) 열 추가 + 기본 방법에 처음 한 번만 값 입력
-- 기존 배송비·RLS 는 변경하지 않습니다 (관리자만 수정 가능한 기존 정책이 새 열에도 적용). 여러 번 실행해도 안전합니다.
begin;

alter table public.shipping_options add column if not exists lead_time text not null default '';
alter table public.shipping_options drop constraint if exists shipping_options_lead_time_check;
alter table public.shipping_options add constraint shipping_options_lead_time_check check (char_length(lead_time) <= 60);

-- 비어 있을 때만 기본 문구 입력 (관리자가 이미 입력한 값은 덮어쓰지 않음)
update public.shipping_options set lead_time = '평균 2~3일 소요' where name = '택배 배송' and lead_time = '';
update public.shipping_options set lead_time = '1~2일 소요' where name like '출장 설치%' and lead_time = '';

commit;

-- 확인용 (선택)
-- select name, fee, lead_time from public.shipping_options order by sort_order;
