import Link from "next/link";
import CsvImport from "@/components/CsvImport";
import { requireAdmin } from "@/lib/admin";
import { COLUMNS } from "@/lib/csv-import";
import { categories } from "@/lib/types";
export const dynamic="force-dynamic";
export default async function ImportProducts(){await requireAdmin();return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>상품 CSV 일괄등록</h1><p>엑셀에서 상품 목록을 CSV로 저장해 한 번에 등록·수정합니다. 미리보기에서 변경 내용을 확인한 뒤 반영 버튼을 눌러야 실제로 저장됩니다.</p>
<div className="compat neutral"><strong>CSV 작성 방법</strong>
<p>① <a className="text-link" href="/admin/products/import/template">CSV 양식 내려받기</a> → 엑셀에서 열어 작성 → &lsquo;CSV UTF-8(쉼표로 분리)&rsquo; 또는 &lsquo;CSV(쉼표로 분리)&rsquo;로 저장</p>
<p>② 필수 열: {COLUMNS.filter(c=>c.required).map(c=>c.label).join(", ")} · 선택 열: {COLUMNS.filter(c=>!c.required).map(c=>c.label).join(", ")}</p>
<p>③ 상품코드는 상품 URL 이름입니다(영문 소문자·숫자·하이픈). 판매가 &ldquo;1,234,000&rdquo; 형식 가능. 중고·판매공개는 Y/N.</p>
<p>④ 카테고리: {categories.join(", ")}</p>
<p>⑤ 사진은 CSV로 올릴 수 없습니다. 등록 후 상품 수정 화면에서 올리세요.</p></div>
<CsvImport/></div>}
