"use client";
import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_QTY_PER_ITEM, sanitizeCartItems, type CartItem } from "@/lib/cart";
// 비회원 장바구니: 이 브라우저의 localStorage 에 { 상품 id, 수량 } 만 저장. 다른 탭과 자동 동기화
// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이 탭에서만 유지되는 메모리 장바구니로 동작
const KEY = "asancommart-cart-v1", EVENT = "asancommart-cart-change";
const EMPTY: CartItem[] = [];
let memory: CartItem[] | null = null, cachedRaw: string | null | undefined, cached: CartItem[] = EMPTY;

function read(): CartItem[] {
  if (memory) return memory;
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { return cached; }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try { cached = raw ? sanitizeCartItems(JSON.parse(raw)) : EMPTY; } catch { cached = EMPTY; }
  return cached;
}
function write(items: CartItem[]) {
  const clean = sanitizeCartItems(items);
  try { localStorage.setItem(KEY, JSON.stringify(clean)); memory = null; } catch { memory = clean; }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => { window.removeEventListener("storage", onChange); window.removeEventListener(EVENT, onChange); };
}
export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);
export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);

// 담기: 이미 있으면 수량 합산. maxQuantity(화면에 보이는 재고) 이상은 담지 않음 (최종 확인은 서버)
export function addToCart(productId: string, quantity: number, maxQuantity: number): { ok: boolean; quantity: number; message: string } {
  const items = read(), existing = items.find(i => i.productId === productId);
  if (!existing && items.length >= MAX_CART_LINES) return { ok: false, quantity: 0, message: `장바구니에는 최대 ${MAX_CART_LINES}종류까지 담을 수 있습니다.` };
  const limit = Math.min(maxQuantity, MAX_QTY_PER_ITEM), before = existing?.quantity || 0;
  const next = Math.min(before + quantity, limit);
  if (next <= before) return { ok: false, quantity: before, message: `이미 담을 수 있는 최대 수량(${limit}개)이 장바구니에 있습니다.` };
  write(existing ? items.map(i => i.productId === productId ? { ...i, quantity: next } : i) : [...items, { productId, quantity: next }]);
  return { ok: true, quantity: next, message: next < before + quantity ? `재고 한도로 ${next}개까지만 담았습니다.` : `장바구니에 담았습니다 (총 ${next}개).` };
}
// 선택한 배송·설치 방법 id (금액은 저장하지 않음 — 서버가 DB 에서 읽음)
const SHIP_KEY = "asancommart-shipping-v1";
let shipMemory: string | null | undefined;
function readShipping(): string | null {
  if (shipMemory !== undefined) return shipMemory;
  try { return localStorage.getItem(SHIP_KEY); } catch { return null; }
}
export const useShippingChoice = () => useSyncExternalStore(subscribe, readShipping, () => null);
export function setShippingChoice(id: string | null) {
  try { if (id) localStorage.setItem(SHIP_KEY, id); else localStorage.removeItem(SHIP_KEY); shipMemory = undefined; } catch { shipMemory = id; }
  window.dispatchEvent(new Event(EVENT));
}
export function setCartQuantity(productId: string, quantity: number) {
  write(read().map(i => i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(Math.floor(quantity) || 1, MAX_QTY_PER_ITEM)) } : i));
}
export function removeFromCart(productIds: string[]) {
  write(read().filter(i => !productIds.includes(i.productId)));
}
