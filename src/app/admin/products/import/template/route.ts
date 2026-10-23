import { requireAdmin } from "@/lib/admin";
import { csvTemplate } from "@/lib/csv-import";
// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 포함
export async function GET() {
  await requireAdmin();
  return new Response("﻿" + csvTemplate(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="asancommart-products-template.csv"', "Cache-Control": "no-store" },
  });
}
