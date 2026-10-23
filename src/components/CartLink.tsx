"use client";
import Link from "next/link";
import { cartCount, useCart } from "@/lib/cart-store";
export default function CartLink(){const count=cartCount(useCart());
 return <Link href="/cart" className="cart-link" aria-label={`장바구니, ${count}개`}>🛒 장바구니{count>0&&<span className="cart-badge">{count>99?"99+":count}</span>}</Link>;
}
