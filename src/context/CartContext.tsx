"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem } from "@/lib/staticData";

function getMaxAllowedQty(item: CartItem) {
  if (item.stock_level === "none") return 0;
  if (item.stock_level === "low") return 1;
  if (typeof item.stock_quantity === "number" && item.stock_quantity > 0) {
    return item.stock_quantity;
  }
  return 999;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQty: (productId: string, variantId: string, qty: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

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
    if (isHydrated) {
      localStorage.setItem("aquatic_emerald_cart", JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const maxAllowed = getMaxAllowedQty(item);
      if (maxAllowed <= 0) {
        return prev;
      }

      const exists = prev.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (exists) {
        return prev.map((i) =>
          i.productId === item.productId && i.variantId === item.variantId
            ? {
                ...i,
                ...item,
                qty: Math.min(maxAllowed, i.qty + item.qty),
              }
            : i
        );
      }
      return [...prev, { ...item, qty: Math.min(maxAllowed, item.qty) }];
    });
  };

  const updateQty = (productId: string, variantId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
      );
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, qty: Math.min(getMaxAllowedQty(i), qty) }
            : i
        )
      );
    }
  };

  const removeItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

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
