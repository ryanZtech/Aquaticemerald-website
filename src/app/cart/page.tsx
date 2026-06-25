"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { maxQtyForLevel } from "@/lib/stockLimits";
import { ShoppingCart, Minus, Plus, X, ArrowLeft } from "lucide-react";

export default function CartPage() {
  const { cart, updateQty, removeItem, cartTotal, stockLimits } = useCart();
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto min-h-screen">
      <div className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>

      <h1 className="font-serif text-4xl font-medium mb-8">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="text-center py-28 bg-card border border-border rounded-3xl p-6 shadow-sm">
          <ShoppingCart className="w-14 h-14 text-muted-foreground/40 mx-auto mb-5 animate-pulse" />
          <p className="font-serif text-xl font-medium mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-8 font-light">
            Browse our collection and add something beautiful.
          </p>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 hover:shadow-lg transition cursor-pointer"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          {}
          <div className="space-y-3 mb-8">
            {cart.map((item) => {
              const maxQty = maxQtyForLevel(item.stock_level, stockLimits);
                          return (
                            <div
                              key={`${item.productId}-${item.variantId}`}
                              className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl transition-colors duration-200"
                            >
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/10">
                                {item.img ? (
                                  <img 
                                    src={item.img} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                                )}
                              </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.variantLabel}</p>
                    <p className="text-primary font-semibold text-sm mt-1">
                      ${(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                  
                  {}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center border border-border rounded-full overflow-hidden bg-secondary">
                      <button
                        onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                        disabled={maxQty <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                        disabled={maxQty <= 0 || item.qty >= maxQty}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      aria-label="Remove item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between text-sm text-muted-foreground mb-3 font-light">
              <span>Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base mb-6 pt-4 border-t border-border transition-colors">
              <span>Total</span>
              <span className="text-primary">${cartTotal.toFixed(2)}</span>
            </div>

            {}
            <p 
              className={`text-xs text-center mb-3 font-medium transition-all duration-200 ${
                cartTotal < 5 
                  ? "text-destructive" 
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {cartTotal < 5 
                ? "Minimum order is $5.00. Please add more items to proceed."
                : "✓ Minimum order of $5.00 met!"}
            </p>

            <Link
              href={cartTotal < 5 ? "/cart" : "/checkout"}
              onClick={(e) => {
                if (cartTotal < 5) {
                  e.preventDefault();
                }
              }}
              className={`block w-full py-4 text-center rounded-full font-semibold text-sm tracking-wide transition-all duration-200 ${
                cartTotal < 5
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 pointer-events-none"
                  : "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 cursor-pointer"
              }`}
            >
              Proceed to Pickup Confirmation
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
