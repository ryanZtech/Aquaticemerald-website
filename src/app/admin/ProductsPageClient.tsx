"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Search,
  Package,
  Eye,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import ProductFormDialog from "./ProductFormDialog";
import { toast } from "sonner";
import { getLucideIconByName } from "@/lib/lucideIcon";

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_name: string;
  img: string;
  short_description?: string;
  full_description?: string;
  attributes?: Record<string, string>;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    stock_quantity: number;
    stock_level?: string;
  }>;
}

export default function ProductsPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState(false);
  const [editingStockVariantId, setEditingStockVariantId] = useState<
    string | null
  >(null);
  const [tempStockLevel, setTempStockLevel] = useState("");
  const [tempStockQuantity, setTempStockQuantity] = useState("0");

  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchProducts = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      const productData = await productsRes.json();
      const categoryData = await categoriesRes.json();
      setCategories(Array.isArray(categoryData) ? categoryData : []);

      let productsData: Product[] = [];
      if (Array.isArray(productData)) {
        productsData = productData as Product[];
      } else if (productData && Array.isArray((productData as any).products)) {
        productsData = (productData as any).products;
      } else if (productData && Array.isArray((productData as any).rows)) {
        productsData = (productData as any).rows;
      } else if (productData && typeof productData === "object") {
        const arr = Object.values(productData).find((v) => Array.isArray(v));
        if (arr) productsData = arr as any;
      }

      productsData = productsData.map((p: any) => ({
        ...p,
        variants:
          typeof p.variants === "string"
            ? JSON.parse(p.variants)
            : p.variants || [],
      }));

      setProducts(productsData);
      setFilteredProducts(productsData);

      if (detailProduct) {
        const updated = productsData.find(
          (item) => item.id === detailProduct.id,
        );
        if (updated) setDetailProduct(updated);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.category === selectedCategory ||
          p.category_name?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category_name?.toLowerCase().includes(query) ||
          p.short_description?.toLowerCase().includes(query),
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategory]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Product deleted successfully");
        setDetailProduct(null);
        fetchProducts();
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleClearProducts = async () => {
    if (
      !confirm(
        "This will permanently delete ALL products in your database. Continue?",
      )
    )
      return;
    try {
      const res = await fetch("/api/products/clear", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        toast.success(json.message || "Inventory wiped clean");
        setDetailProduct(null);
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to wipe products");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to wipe products");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormDialogOpen(true);
  };

  const handleProductSaved = () => {
    fetchProducts();
    setFormDialogOpen(false);
    setEditingProduct(null);
  };

  const handleUpdateStockLevel = async (
    variantId: string,
    newStockLevel: string,
    newStockQuantity?: number,
  ) => {
    try {
      const response = await fetch(`/api/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_level: newStockLevel,
          stock_quantity: newStockQuantity,
        }),
      });

      if (response.ok) {
        toast.success("Stock level updated");
        fetchProducts();
        setEditingStockVariantId(null);
      } else {
        toast.error("Failed to update stock level");
      }
    } catch (error) {
      console.error("Error updating stock level:", error);
      toast.error("Failed to update stock level");
    }
  };

  const getCategoryIcon = (categorySlug: string) => {
    const cat = categories.find((c: any) => c.slug === categorySlug);
    return getLucideIconByName(cat?.icon_name || "Package");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse font-light">
          Loading dynamic inventory...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {formDialogOpen ? (
        <div>
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-medium">
              {editingProduct ? "Edit Product" : "Create Product"}
            </h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="cursor-pointer"
                onClick={() => {
                  setFormDialogOpen(false);
                  setEditingProduct(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <ProductFormDialog
              open={formDialogOpen}
              inline
              onClose={() => {
                setFormDialogOpen(false);
                setEditingProduct(null);
              }}
              onSaved={handleProductSaved}
              editingProduct={editingProduct}
            />
          </div>
        </div>
      ) : (
        <>
          {viewingProduct && detailProduct ? (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setViewingProduct(false);
                      setDetailProduct(null);
                    }}
                    className="cursor-pointer"
                  >
                    Back
                  </Button>
                  <h2 className="font-serif text-2xl font-medium">
                    {detailProduct.name}
                  </h2>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => {
                      const item = detailProduct;
                      setViewingProduct(false);
                      setTimeout(() => handleEdit(item), 150);
                    }}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                </div>
              </div>
              {detailProduct && (
                <div className="flex flex-col md:flex-row min-h-[500px]">
                  <div className="w-full md:w-5/12 bg-muted relative min-h-[250px] md:min-h-full p-4 flex items-center justify-center">
                    {detailProduct.img ? (
                      <img
                        src={detailProduct.img}
                        alt={detailProduct.name}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-sm text-muted-foreground font-light absolute inset-0">
                        No image uploaded
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <label className="cursor-pointer inline-flex items-center gap-2 bg-card/90 px-3 py-2 rounded shadow border border-border">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const prodRes = await fetch(
                                `/api/products/${detailProduct.id}`,
                              );
                              const prod = await prodRes.json();
                              const fd = new FormData();
                              fd.append(
                                "name",
                                prod.name || detailProduct.name,
                              );
                              fd.append(
                                "slug",
                                prod.slug || detailProduct.slug,
                              );
                              fd.append(
                                "categoryId",
                                prod.category_id || prod.category_id === 0
                                  ? String(prod.category_id)
                                  : "0",
                              );
                              fd.append(
                                "shortDescription",
                                prod.short_description ||
                                  prod.short_description ||
                                  "",
                              );
                              fd.append(
                                "fullDescription",
                                prod.full_description ||
                                  prod.full_description ||
                                  "",
                              );
                              fd.append(
                                "variants",
                                JSON.stringify(
                                  prod.variants || detailProduct.variants || [],
                                ),
                              );
                              fd.append(
                                "attributes",
                                JSON.stringify(
                                  prod.attributes ||
                                    detailProduct.attributes ||
                                    {},
                                ),
                              );
                              fd.append("image", file);
                              const res = await fetch(
                                `/api/products/${detailProduct.id}`,
                                { method: "PUT", body: fd },
                              );
                              if (res.ok) {
                                toast.success("Hero image updated");
                                fetchProducts();
                              } else {
                                toast.error("Failed to update image");
                              }
                            } catch (err) {
                              console.error(err);
                              toast.error("Failed to upload");
                            }
                          }}
                        />
                        <span className="text-sm">Change Hero Image</span>
                      </label>
                    </div>
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      {(() => {
                        const DetailCatIcon = getCategoryIcon(
                          detailProduct.category,
                        ) as any;
                        return (
                          <DetailCatIcon className="w-3 h-3 text-primary-foreground" />
                        );
                      })()}
                      <span>
                        {detailProduct.category_name || detailProduct.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {detailProduct.id}
                        </span>
                        <Link
                          href={`/products/${detailProduct.slug}`}
                          target="_blank"
                          className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
                        >
                          View Customer Page{" "}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <h2 className="font-serif text-3xl font-semibold mb-3">
                        {detailProduct.name}
                      </h2>
                      <p className="text-xs text-muted-foreground mb-4">
                        Slug:{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                          {detailProduct.slug}
                        </code>
                      </p>

                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Description
                        </h4>
                        <p className="text-sm text-foreground/80 leading-relaxed font-light">
                          {detailProduct.full_description ||
                            detailProduct.short_description ||
                            "No full description added."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                        {[
                          {
                            label: "Care Level",
                            value:
                              detailProduct.attributes?.["Care Level"] || "N/A",
                          },
                          {
                            label: "Light",
                            value: detailProduct.attributes?.["Light"] || "N/A",
                          },
                          {
                            label: "Average Size",
                            value:
                              detailProduct.attributes?.["Average Size"] ||
                              "N/A",
                          },
                          {
                            label: "Origin",
                            value:
                              detailProduct.attributes?.["Origin"] || "N/A",
                          },
                        ].map((attr) => (
                          <div
                            key={attr.label}
                            className="bg-secondary/40 border border-border/50 rounded-xl p-2.5"
                          >
                            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                              {attr.label}
                            </span>
                            <span className="text-xs font-medium">
                              {attr.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Variants & Pricing
                        </h4>
                        {detailProduct.variants.length === 0 ? (
                          <div className="text-xs text-muted-foreground font-light py-2 bg-secondary/20 border rounded-lg text-center">
                            No active variants found. Open edit to add one.
                          </div>
                        ) : (
                          <div className="border border-border/60 rounded-xl overflow-hidden bg-card text-xs">
                            <div className="grid grid-cols-4 bg-muted/50 py-2.5 px-4 font-semibold text-muted-foreground border-b border-border/60">
                              <div>Label</div>
                              <div className="text-center">Price</div>
                              <div className="text-center">Qty</div>
                              <div className="text-right">Stock Level</div>
                            </div>
                            <div className="divide-y divide-border/40">
                              {detailProduct.variants.map((v, idx) => {
                                const currentStockLevel =
                                  v.stock_level ||
                                  (v.stock_quantity && v.stock_quantity > 20
                                    ? "high"
                                    : v.stock_quantity && v.stock_quantity > 10
                                      ? "med"
                                      : v.stock_quantity && v.stock_quantity > 0
                                        ? "low"
                                        : "none");
                                const currentStockQuantity = Number(
                                  v.stock_quantity || 0,
                                );
                                const isEditing =
                                  editingStockVariantId === v.id;

                                return (
                                  <div
                                    key={`${idx}-${v.id}`}
                                    className="grid grid-cols-4 py-2.5 px-4 items-center"
                                  >
                                    <div className="font-medium text-foreground">
                                      {v.label}
                                    </div>
                                    <div className="text-center font-semibold text-primary">
                                      ${Number(v.price).toFixed(2)}
                                    </div>
                                    <div className="text-center text-xs text-muted-foreground">
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          value={tempStockQuantity}
                                          onChange={(e) =>
                                            setTempStockQuantity(e.target.value)
                                          }
                                          className="mx-auto h-8 w-20 text-center"
                                        />
                                      ) : (
                                        currentStockQuantity
                                      )}
                                    </div>
                                    <div className="text-right">
                                      {isEditing ? (
                                        <div className="flex items-center gap-2 justify-end">
                                          <Select
                                            value={tempStockLevel}
                                            onValueChange={(value) =>
                                              setTempStockLevel(value)
                                            }
                                          >
                                            <SelectTrigger className="w-28 h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">
                                                None
                                              </SelectItem>
                                              <SelectItem value="low">
                                                Low
                                              </SelectItem>
                                              <SelectItem value="med">
                                                Medium
                                              </SelectItem>
                                              <SelectItem value="high">
                                                High
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 cursor-pointer"
                                            onClick={() =>
                                              handleUpdateStockLevel(
                                                v.id,
                                                tempStockLevel,
                                                Math.max(
                                                  0,
                                                  parseInt(
                                                    tempStockQuantity,
                                                    10,
                                                  ) || 0,
                                                ),
                                              )
                                            }
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 cursor-pointer"
                                            onClick={() =>
                                              setEditingStockVariantId(null)
                                            }
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingStockVariantId(v.id);
                                            setTempStockLevel(
                                              currentStockLevel,
                                            );
                                            setTempStockQuantity(
                                              String(currentStockQuantity),
                                            );
                                          }}
                                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto cursor-pointer"
                                        >
                                          {currentStockLevel
                                            .charAt(0)
                                            .toUpperCase() +
                                            currentStockLevel.slice(1)}
                                          <Edit className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-border pt-4 mt-4">
                      <Button
                        variant="outline"
                        className="gap-2 cursor-pointer border-border/80"
                        onClick={() => {
                          const item = detailProduct;
                          setDetailProduct(null);
                          setTimeout(() => handleEdit(item), 150);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" /> Edit
                        Product
                      </Button>
                      <Button
                        variant="ghost"
                        className="gap-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() =>
                          handleDelete(detailProduct.id, detailProduct.name)
                        }
                      >
                        <Trash2 className="w-4 h-4" /> Delete Product
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-medium">Inventory</h1>
                  <p className="text-muted-foreground text-sm font-light">
                    Manage your aquarium products and stock
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="gap-2 shadow-md cursor-pointer"
                    onClick={() => setFormDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" /> New Product
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={handleClearProducts}
                  >
                    Clear Inventory
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-48 cursor-pointer">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">
                      All Categories
                    </SelectItem>
                    {Array.isArray(categories) &&
                      categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.slug}
                          className="cursor-pointer"
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl flex flex-col items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm font-serif font-light">
                    {searchQuery
                      ? "No products match your search criteria."
                      : "No products found. Add your first product!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((p) => {
                    const prices = p.variants.map((v) => Number(v.price));
                    const minPrice =
                      prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice =
                      prices.length > 0 ? Math.max(...prices) : 0;
                    const priceRange =
                      prices.length > 0
                        ? minPrice === maxPrice
                          ? `$${minPrice.toFixed(2)}`
                          : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`
                        : "Coming Soon";

                    const CatIcon = getCategoryIcon(p.category || "") as any;
                    const stockLevels = p.variants.map(
                      (v) =>
                        v.stock_level ||
                        (v.stock_quantity && v.stock_quantity > 20
                          ? "high"
                          : v.stock_quantity && v.stock_quantity > 10
                            ? "med"
                            : v.stock_quantity && v.stock_quantity > 0
                              ? "low"
                              : "none"),
                    );
                    const allSame = stockLevels.every(
                      (s) => s === stockLevels[0],
                    );
                    const stockLabel = allSame
                      ? stockLevels[0] || "none"
                      : "Mixed";

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDetailProduct(p);
                          setViewingProduct(true);
                        }}
                        className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
                      >
                        <div className="relative h-44 overflow-hidden bg-muted flex-shrink-0">
                          {p.img ? (
                            <img
                              src={p.img}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center text-xs text-muted-foreground font-light">
                              No Image Uploaded
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <CatIcon className="w-3 h-3 text-white" />
                            <span>{p.category_name || p.category}</span>
                          </div>
                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full font-light">
                            Stock:{" "}
                            {stockLabel.charAt(0).toUpperCase() +
                              stockLabel.slice(1)}
                          </div>
                        </div>
                        <div className="p-5 flex-grow flex flex-col">
                          <h3 className="font-serif font-medium text-base mb-1.5 group-hover:text-primary transition-colors">
                            {p.name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-grow font-light">
                            {p.short_description ||
                              p.full_description ||
                              "No description provided."}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-primary font-semibold text-sm">
                              {priceRange}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                              <Eye className="w-3.5 h-3.5" /> Details
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
