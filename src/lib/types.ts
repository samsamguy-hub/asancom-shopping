// CPU쿨러는 supabase/builder_specs.sql 적용 후 등록 가능 (DB 카테고리 제약)
export const categories = ["완제품", "중고PC", "CPU", "메인보드", "메모리", "그래픽카드", "SSD", "파워", "케이스", "CPU쿨러", "노트북", "모니터", "주변기기"] as const;
export type Category = (typeof categories)[number];
// "PC부품" 메뉴에 함께 보이는 부품 분류 (완제품·중고PC·노트북·모니터·주변기기 제외)
export const partCategories: readonly Category[] = ["CPU", "메인보드", "메모리", "그래픽카드", "SSD", "파워", "케이스", "CPU쿨러"];
// 각 값의 의미·입력 형식은 lib/specs.ts 의 SPEC_FIELDS. 목록·커넥터 값은 쉼표 구분 문자열, "NONE" = 없음(확인됨)
export type Specs = {
  socket?: string; memory_type?: string; power_w?: number; gpu_length_mm?: number; max_gpu_length_mm?: number;
  cpu?: string; ram?: string; graphics?: string; storage?: string;
  cpu_series?: string; cooler_included?: boolean;
  form_factor?: string; bios_supported_series?: string; bios_update_series?: string; cpu_power_connectors?: string;
  gpu_slots?: number; gpu_power_connectors?: string;
  psu_form_factor?: string; psu_connectors?: string;
  max_gpu_slots?: number; max_cooler_height_mm?: number; mb_form_factors?: string; psu_form_factors?: string; radiator_sizes?: string;
  cooler_type?: string; cooler_sockets?: string; cooler_height_mm?: number; radiator_mm?: number; cooler_tdp_w?: number;
};
export type Product = {
  id: string; name: string; slug: string; category: Category;
  description: string; price: number; stock: number; is_used: boolean;
  active: boolean; specs: Specs; created_at?: string; updated_at?: string; images?: ProductImage[];
  // supabase/product_badges.sql 적용 전 DB 에는 없을 수 있어 선택 항목
  sold_out?: boolean; badges?: string[];
  // 정상가(할인 전 가격). supabase/product_list_price.sql 적용 후 사용. null = 할인 표시 없음
  list_price?: number | null;
  // 휴지통 (supabase/product_trash.sql). 값이 있으면 휴지통 상품
  deleted_at?: string | null;
  deleted_was_active?: boolean;
};
// product_images 행 (IMAGE_COLUMNS) + 서버에서 발급한 서명 URL
export type ProductImage = {
  id: string; product_id: string; storage_path: string; is_public: boolean;
  sort_order: number; alt_text: string | null; created_at?: string; url?: string;
};
export const formatKRW = (value: number) => new Intl.NumberFormat("ko-KR").format(value) + "원";
export const isBuilderCategory = (category: Category) => ["CPU", "메인보드", "메모리", "그래픽카드", "SSD", "파워", "케이스", "CPU쿨러"].includes(category);
