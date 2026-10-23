import PCBuilder from "@/components/PCBuilder";
import { getProducts } from "@/lib/products";
import { dbConfigured } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function BuilderPage(){const products=await getProducts(false);return <div className="wide section"><div className="page-heading"><span className="eyebrow blue">BUILD YOUR OWN PC</span><h1>나만의 조립PC 견적</h1><p>CPU부터 케이스까지 부품을 선택하면 견적이 자동으로 계산됩니다.</p></div><PCBuilder products={products} isDemo={!dbConfigured()}/></div>}
