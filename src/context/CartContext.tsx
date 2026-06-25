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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [stockLimits, setStockLimits] = useState<StockLimits>(
    DEFAULT_STOCK_LIMITS,
  );

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
