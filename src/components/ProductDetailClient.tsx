"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/staticData";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, Minus, Plus } from "lucide-react";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  
  // Set initial variant to first variant in the list, or empty if none
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === selectedVariant);
  const total = variant ? variant.price * qty : 0;

  const handleAdd = () => {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      qty,
      name: product.name,
      variantLabel: variant.label,
      price: variant.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const stats = [
    { label: "Average Size", value: product.avgSize },
    { label: "Origin",       value: product.origin },
    { label: "Care Level",   value: product.careLevel },
    { label: "Light",        value: product.light },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto min-h-screen">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image Display */}
        <div className="rounded-3xl overflow-hidden bg-muted aspect-square shadow-lg border border-border">
          <img 
            src={product.img} 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Details Section */}
        <div className="flex flex-col">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 capitalize font-semibold">
            {product.category}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium mb-4 leading-snug">
            {product.name}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{product.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary rounded-xl p-3.5 border border-border/10">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  {s.label}
                </p>
                <p className="text-sm font-medium">{s.value}</p>
              </div>
            ))}
          </div>

          {product.variants.length === 0 ? (
            <div className="bg-muted rounded-2xl p-8 text-center border border-border">
              <p className="font-serif font-medium text-lg mb-2">Coming Soon</p>
              <p className="text-sm text-muted-foreground font-light">
                This product is not yet available. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {/* Variant Selector */}
              {product.variants.length > 1 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3">Select Option</p>
                  <div className="flex flex-col gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer
                          ${selectedVariant === v.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40"}`}
                      >
                        <span>{v.label}</span>
                        <span className="font-semibold">${v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Variant Display */}
              {product.variants.length === 1 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary bg-primary/5 text-primary text-sm mb-6">
                  <span>{product.variants[0].label}</span>
                  <span className="font-semibold">${product.variants[0].price}</span>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-8">
                <p className="text-sm font-semibold mb-3">Quantity</p>
                <div className="flex items-center gap-5">
                  <div className="flex items-center border border-border rounded-full overflow-hidden bg-secondary">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-semibold text-sm">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {variant && (
                    <span className="text-sm text-muted-foreground font-light">
                      {qty} × ${variant.price} = &nbsp;
                      <span className="text-foreground font-semibold">${total.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart Trigger */}
              <button
                onClick={handleAdd}
                className={`w-full py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 cursor-pointer
                  ${added
                    ? "bg-emerald-600 text-white scale-[0.99] shadow-lg shadow-emerald-600/20"
                    : "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"}`}
              >
                {added ? "✓ Added to Cart!" : `Add to Cart — $${total.toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
