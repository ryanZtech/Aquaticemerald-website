"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CartItem } from "@/lib/staticData";
import {
  StockLevel,
  DEFAULT_STOCK_LIMITS,
  maxQtyForLevel,
  parseStockLimitSettings,
} from "@/lib/stockLimits";

type StockLimits = Record<StockLevel, number>;

function getMaxAllowedQty(item: CartItem, limits: StockLimits): number {
  return maxQtyForLevel(item.stock_level, limits);
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQty: (productId: string, variantId: string, qty: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  stockLimits: StockLimits;
  autoDiscount: {
    name: string;
    description: string | null;
    discount_amount: number;
    free_item: {
      productId: string;
      productName: string;
      productSlug: string;
      variantId: string;
      variantLabel: string;
    } | null;
  } | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [stockLimits, setStockLimits] = useState<StockLimits>(
    DEFAULT_STOCK_LIMITS,
  );
  const [autoDiscount, setAutoDiscount] = useState<{
    name: string;
    description: string | null;
    discount_amount: number;
    free_item: {
      productId: string;
      productName: string;
      productSlug: string;
      variantId: string;
      variantLabel: string;
    } | null;
  } | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem("aquatic_emerald_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from localStorage:", e);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLimits() {
      try {
        const res = await fetch("/api/settings/public", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStockLimits(parseStockLimitSettings(data));
      } catch (e) {
        console.error("Failed to load stock limits:", e);
      }
    }
    loadLimits();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("aquatic_emerald_cart", JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  // Evaluate auto-discounts whenever cart changes
  useEffect(() => {
    if (!isHydrated || cart.length === 0) {
      setAutoDiscount(null);
      return;
    }

    let cancelled = false;
    async function evaluateAutoDiscounts() {
      try {
        const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const res = await fetch("/api/auto-discounts/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, cartTotal }),
        });
        
        if (!res.ok || cancelled) return;
        
        const data = await res.json();
        if (data.applicable && !cancelled) {
          setAutoDiscount({
            name: data.discount.name,
            description: data.discount.description,
            discount_amount: data.discount.discount_amount || 0,
            free_item: data.discount.free_item || null,
          });
        } else if (!cancelled) {
          setAutoDiscount(null);
        }
      } catch (error) {
        console.error("Failed to evaluate auto discounts:", error);
      }
    }

    evaluateAutoDiscounts();
    return () => {
      cancelled = true;
    };
  }, [cart, isHydrated]);

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const maxAllowed = getMaxAllowedQty(item, stockLimits);
        if (maxAllowed <= 0) {
          return prev;
        }

        const exists = prev.find(
          (i) =>
            i.productId === item.productId && i.variantId === item.variantId,
        );
        if (exists) {
          return prev.map((i) =>
            i.productId === item.productId && i.variantId === item.variantId
              ? {
                  ...i,
                  ...item,
                  qty: Math.min(maxAllowed, i.qty + item.qty),
                }
              : i,
          );
        }
        return [...prev, { ...item, qty: Math.min(maxAllowed, item.qty) }];
      });
    },
    [stockLimits],
  );

  const updateQty = useCallback(
    (productId: string, variantId: string, qty: number) => {
      setCart((prev) => {
        const item = prev.find(
          (i) => i.productId === productId && i.variantId === variantId,
        );
        const limit = item ? getMaxAllowedQty(item, stockLimits) : 999;
        if (qty <= 0) {
          return prev.filter(
            (i) =>
              !(i.productId === productId && i.variantId === variantId),
          );
        }
        return prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, qty: Math.min(limit, qty) }
            : i,
        );
      });
    },
    [stockLimits],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      setCart((prev) =>
        prev.filter(
          (i) =>
            !(i.productId === productId && i.variantId === variantId),
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        cartCount,
        cartTotal,
        stockLimits,
        autoDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
