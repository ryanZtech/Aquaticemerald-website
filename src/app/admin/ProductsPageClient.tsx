"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Plus, Edit, Trash2, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import ProductFormDialog from "./ProductFormDialog";
import { toast } from "sonner";

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_name: string;
  img: string;
  variants: Array<{ id: string; label: string; price: number; stock_quantity: number }>;
}

export default function ProductsPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
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
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.category_name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, products]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleClearAndSeed = async () => {
    if (!confirm("This will delete ALL products and add 2 demo products. Continue?")) return;
    try {
      const res = await fetch("/api/products/clear", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        toast.success(json.message || "Products cleared and seeded");
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to clear products");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear products");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleProductSaved = () => {
    fetchProducts();
    handleDialogClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage your aquarium products and stock</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" /> New Product
          </Button>
          <Button variant="ghost" className="gap-2 text-destructive" onClick={handleClearAndSeed}>
            Clear & Seed
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Price Range</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-light">
                  {searchQuery ? "No products match your search." : "No products found. Create your first product!"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                const prices = p.variants.map((v) => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange =
                  prices.length > 0
                    ? minPrice === maxPrice
                      ? `$${minPrice}`
                      : `$${minPrice} – $${maxPrice}`
                    : "N/A";

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.img ? (
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">slug: {p.slug}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                        {p.category_name || p.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{priceRange}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${p.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleProductSaved}
        editingProduct={editingProduct}
      />
    </div>
  );
}
