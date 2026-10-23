import Link from "next/link";
import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/admin";
export const dynamic="force-dynamic";
export default async function NewProduct(){await requireAdmin();return <div className="wide section narrow"><Link href="/admin" className="text-link">← 관리자</Link><h1>새 상품 등록</h1><ProductForm/></div>}
