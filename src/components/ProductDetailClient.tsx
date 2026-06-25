"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/staticData";
import { useCart } from "@/context/CartContext";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { maxQtyForLevel } from "@/lib/stockLimits";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({
  product,
}: ProductDetailClientProps) {
  const { addToCart, stockLimits } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [options, setOptions] = useState<{ name: string; values: string[] }[]>(
    [],
  );
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {},
  );
  const [matchedVariant, setMatchedVariant] = useState<any>(null);

  const allImages = (() => {
    const rawImages = [
      ...(product.images && product.images.length > 0
        ? [...product.images].sort(
            (a, b) => Number(b.is_primary) - Number(a.is_primary),
          )
        : product.img
          ? [{ image_url: product.img, is_primary: true }]
          : []),
      ...product.variants
        .filter((variant) => variant.image_url)
        .map((variant) => ({
          image_url: variant.image_url as string,
          is_primary: false,
        })),
    ];

    const uniqueMap = new Map<
      string,
      { image_url: string; is_primary?: boolean }
    >();

    rawImages.forEach((img) => {
      const url = img.image_url.trim();
      if (!url) return;

      const existing = uniqueMap.get(url);
      if (!existing || img.is_primary) {
        uniqueMap.set(url, { ...img, image_url: url });
      }
    });

    return Array.from(uniqueMap.values());
  })();

  const imageUrls = allImages.map((img) => img.image_url);
  const maxQty = maxQtyForLevel(matchedVariant?.stock_level, stockLimits);

  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      
      const firstVariantLabel = product.variants[0].label;
      const optionCount = firstVariantLabel.split(" / ").length;

      const optionNames =
        product.variantOptions && product.variantOptions.length === optionCount
          ? product.variantOptions
          : Array.from(
              { length: optionCount },
              (_, idx) => `Option ${idx + 1}`,
            );

      const newOptions = optionNames.map((name, idx) => {
        const values = Array.from(
          new Set(
            product.variants
              .map((v) => v.label.split(" / ")[idx]?.trim())
              .filter(Boolean),
          ),
        );
        return { name, values };
      });

      setOptions(newOptions);

      const firstVariantParts = firstVariantLabel
        .split(" / ")
        .map((p) => p.trim());
      const initialSelected: Record<string, string> = {};
      newOptions.forEach((opt, idx) => {
        initialSelected[opt.name] =
          firstVariantParts[idx] || opt.values[0] || "";
      });
      setSelectedValues(initialSelected);
    } else {
      setOptions([]);
      setSelectedValues({});
      setMatchedVariant(null);
    }
  }, [product]);

  useEffect(() => {
    if (product.variants && product.variants.length > 0 && options.length > 0) {
      const match = product.variants.find((v) => {
        const parts = v.label.split(" / ").map((p) => p.trim());
        return options.every(
          (opt, idx) => parts[idx] === selectedValues[opt.name],
        );
      });
      setMatchedVariant(match || null);

      if (match && match.image_url) {
        const index = imageUrls.findIndex((url) => url === match.image_url);
        if (index !== -1 && index !== currentImageIndex) {
          setCurrentImageIndex(index);
        }
      }
    } else {
      setMatchedVariant(product.variants?.[0] || null);
    }
  }, [selectedValues, options, product]);

  useEffect(() => {
    if (maxQty <= 0) {
      setQty(1);
      return;
    }
    setQty((currentQty) => Math.min(Math.max(1, currentQty), maxQty));
  }, [maxQty]);

  useEffect(() => {
    if (currentImageIndex >= imageUrls.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, imageUrls.length]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedValues((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const total = matchedVariant ? matchedVariant.price * qty : 0;

  const handleAdd = () => {
    if (!matchedVariant) return;
    addToCart({
      productId: product.id,
      variantId: matchedVariant.id,
      qty,
      name: product.name,
      variantLabel: matchedVariant.label,
      price: matchedVariant.price,
      img:
        matchedVariant.image_url || imageUrls[currentImageIndex] || product.img,
      stock_level: matchedVariant.stock_level,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + imageUrls.length) % imageUrls.length,
    );
  };

  const stats = [
    { label: "Average Size", value: product.avgSize || "N/A" },
    { label: "Origin", value: product.origin || "N/A" },
    { label: "Care Level", value: product.careLevel || "N/A" },
    { label: "Light", value: product.light || "N/A" },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto min-h-screen">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
        Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {}
        <div className="space-y-3">
          {}
          <div className="relative rounded-3xl bg-muted aspect-square shadow-xl border border-border overflow-hidden">
            {imageUrls[currentImageIndex] ? (
              <img
                src={imageUrls[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}

            {}
            {imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full z-20 cursor-pointer transition-colors shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full z-20 cursor-pointer transition-colors shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {imageUrls.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentImageIndex(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className={`rounded-full transition-all cursor-pointer ${
                        i === currentImageIndex
                          ? "w-5 h-2 bg-white"
                          : "w-2 h-2 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {}
          {imageUrls.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto px-1 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {imageUrls.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-none w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer focus:outline-none ${
                    index === currentImageIndex
                      ? "border-primary ring-2 ring-primary/30 opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
                      No Img
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="flex flex-col">
          <p className="text-xs text-primary tracking-widest mb-2.5 capitalize font-semibold">
            {product.category}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium mb-4 leading-snug">
            {product.name}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 text-sm font-light">
            {product.description}
          </p>

          {}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-secondary/40 rounded-xl p-3.5 border border-border/40 hover:border-border transition-colors"
              >
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  {s.label}
                </p>
                <p className="text-sm font-medium">{s.value}</p>
              </div>
            ))}
          </div>

          {product.variants.length === 0 ? (
            <div className="bg-muted/40 rounded-2xl p-8 text-center border border-border border-dashed">
              <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-serif font-medium text-lg mb-2">Coming Soon</p>
              <p className="text-sm text-muted-foreground font-light">
                This product is not yet available. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {}
              {options.length > 0 && (
                <div className="space-y-4 mb-6">
                  {options.map((opt) => (
                    <div key={opt.name} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {opt.name}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedValues[opt.name] || ""}
                          onChange={(e) =>
                            handleOptionChange(opt.name, e.target.value)
                          }
                          className="w-full bg-secondary text-secondary-foreground border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary cursor-pointer transition-colors appearance-none"
                        >
                          {opt.values.map((val) => (
                            <option key={val} value={val} className="bg-card">
                              {val}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {}
              {matchedVariant ? (
                <div>
                  <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-sm mb-3">
                    <span className="font-medium">Selected Combination</span>
                    <span className="font-bold text-base">
                      ${matchedVariant.price.toFixed(2)}
                    </span>
                  </div>
                  {matchedVariant.stock_level && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/40 bg-muted/30 text-sm mb-6">
                      <span className="text-muted-foreground font-light">
                        Stock Level
                      </span>
                      <span
                        className={`font-semibold text-xs uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          matchedVariant.stock_level === "none"
                            ? "bg-destructive/10 text-destructive"
                            : matchedVariant.stock_level === "low"
                              ? "bg-orange-500/10 text-orange-600"
                              : matchedVariant.stock_level === "med"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-emerald-500/10 text-emerald-600"
                        }`}
                      >
                        {matchedVariant.stock_level.charAt(0).toUpperCase() +
                          matchedVariant.stock_level.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm mb-6">
                  <span className="font-medium">Combination unavailable</span>
                  <span className="font-light">Select other options</span>
                </div>
              )}

              {}
              <div className="mb-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Quantity
                </p>
                <div className="flex items-center gap-5">
                  <div className="flex items-center border border-border rounded-full overflow-hidden bg-secondary">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                      disabled={maxQty <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-semibold text-sm">
                      {qty}
                    </span>
                    <button
                      onClick={() => {
                        setQty((q) => Math.min(maxQty, q + 1));
                      }}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                      disabled={maxQty <= 0 || qty >= maxQty}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {matchedVariant && (
                    <span className="text-sm text-muted-foreground font-light">
                      {qty} × ${matchedVariant.price.toFixed(2)} = &nbsp;
                      <span className="text-foreground font-semibold">
                        ${total.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
                {matchedVariant && maxQty > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {matchedVariant.stock_level === "low"
                      ? `Low stock: up to ${maxQty} can be purchased.`
                      : `You can order up to ${maxQty}.`}
                  </p>
                )}
              </div>

              {}
              <button
                onClick={handleAdd}
                disabled={
                  !matchedVariant || matchedVariant.stock_level === "none"
                }
                className={`w-full py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
                  ${
                    !matchedVariant || matchedVariant.stock_level === "none"
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : added
                        ? "bg-emerald-600 text-white scale-[0.99] shadow-lg shadow-emerald-600/20"
                        : "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                  }`}
              >
                {added ? (
                  <>
                    <ShieldCheck className="w-4 h-4 animate-bounce" />
                    Added to Cart!
                  </>
                ) : matchedVariant?.stock_level === "none" ? (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Out of Stock
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart — ${total.toFixed(2)}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
