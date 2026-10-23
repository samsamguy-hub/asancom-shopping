import type { Product, Category, Specs } from "./types";
const make = (id: string, name: string, category: Category, price: number, specs: Specs = {}, description = "실제 판매 전 상품 정보·가격·재고 확인 필요", extra: Partial<Product> = {}) : Product => ({
  id, name, slug:id, category, price, specs, description, stock: 3, active: true, is_used: category === "중고PC", ...extra
});
// 가상 규격: 견적 호환성 검사 시연용. 일부 상품은 일부러 정보를 비워 '확인 필요' 표시를 보여줌
export const demoProducts: Product[] = [
  make("demo-gaming-5600", "라이젠5 5600 게이밍PC (예시)", "완제품", 869000, {cpu:"Ryzen 5 5600", ram:"16GB DDR4", graphics:"RTX 5060", storage:"NVMe 500GB"}, undefined, {badges:["인기","특가"],list_price:949000}),
  make("demo-office-5600g", "라이젠5 사무용PC (예시)", "완제품", 479000, {cpu:"Ryzen 5 5600G", ram:"16GB", storage:"SSD 500GB"}),
  make("demo-used-pc", "중고 사무용PC (예시)", "중고PC", 259000, {cpu:"Core i5", ram:"16GB", storage:"SSD 256GB"}, undefined, {badges:["한정수량","임박"]}),
  make("demo-cpu-5600", "AMD 라이젠5 5600 (예시)", "CPU", 145000, {socket:"AM4",memory_type:"DDR4",power_w:65,cpu_series:"Ryzen 5000",cooler_included:true}),
  make("demo-cpu-7500f", "AMD 라이젠5 7500F (예시)", "CPU", 195000, {socket:"AM5",memory_type:"DDR5",power_w:65,cpu_series:"Ryzen 7000",cooler_included:true}),
  make("demo-cpu-9700x", "AMD 라이젠7 9700X (예시)", "CPU", 420000, {socket:"AM5",memory_type:"DDR5",power_w:65,cpu_series:"Ryzen 9000",cooler_included:false}, undefined, {badges:["NEW"]}),
  make("demo-board-b550", "B550M DDR4 메인보드 (예시)", "메인보드", 115000, {socket:"AM4",memory_type:"DDR4",form_factor:"mATX",bios_supported_series:"Ryzen 3000,Ryzen 5000",cpu_power_connectors:"EPS8x1"}),
  make("demo-board-b650", "B650M DDR5 메인보드 (예시)", "메인보드", 170000, {socket:"AM5",memory_type:"DDR5",form_factor:"mATX",bios_supported_series:"Ryzen 7000,Ryzen 8000",bios_update_series:"Ryzen 9000",cpu_power_connectors:"EPS8x1"}),
  make("demo-ram-ddr4", "DDR4 16GB 메모리 (예시)", "메모리", 65000, {memory_type:"DDR4"}),
  make("demo-ram-ddr5", "DDR5 32GB 메모리 (예시)", "메모리", 145000, {memory_type:"DDR5"}),
  make("demo-rtx5060", "RTX 5060 그래픽카드 (예시)", "그래픽카드", 470000, {power_w:145,gpu_length_mm:245,gpu_slots:2,gpu_power_connectors:"PCIE8x1"}),
  make("demo-rtx5070", "RTX 5070 그래픽카드 (예시)", "그래픽카드", 780000, {power_w:250,gpu_length_mm:300,gpu_slots:2.5,gpu_power_connectors:"16PINx1"}, undefined, {sold_out:true}),
  make("demo-ssd500", "NVMe SSD 500GB (예시)", "SSD", 70000),
  make("demo-ssd1t", "NVMe SSD 1TB (예시)", "SSD", 110000),
  make("demo-psu600", "정격 600W 파워 (예시)", "파워", 65000, {power_w:600,psu_form_factor:"ATX",psu_connectors:"EPS8x1,PCIE8x2"}),
  make("demo-psu750", "정격 750W 파워 (예시)", "파워", 95000, {power_w:750,psu_form_factor:"ATX",psu_connectors:"EPS8x2,PCIE8x3,16PINx1"}),
  make("demo-case", "미들타워 케이스 (예시)", "케이스", 79000, {max_gpu_length_mm:320,max_cooler_height_mm:160,mb_form_factors:"ATX,mATX,ITX",psu_form_factors:"ATX",radiator_sizes:"240,280"}),
  make("demo-cooler-air", "타워형 공랭 쿨러 (예시)", "CPU쿨러", 39000, {cooler_type:"공랭",cooler_sockets:"AM4,AM5,LGA1700,LGA1851",cooler_height_mm:155,cooler_tdp_w:200}),
  make("demo-cooler-360", "360mm 수랭 쿨러 (예시)", "CPU쿨러", 129000, {cooler_type:"수랭",cooler_sockets:"AM4,AM5,LGA1700",radiator_mm:360,cooler_tdp_w:280}),
];
