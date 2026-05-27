"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Plus, Trash2, Upload, Info, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ProductImage, Variant } from "@/lib/staticData";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface VariantOption {
  id: string;
  name: string;
  values: string[];
  valuesInput?: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProduct?: any;
  inline?: boolean;
}

export default function ProductFormDialog({
  open,
  onClose,
  onSaved,
  editingProduct,
  inline = false,
}: ProductFormDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  
  // Product images
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Variant options and variants
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variants, setVariants] = useState<Array<Variant & { imageFile?: File; imagePreview?: string }>>([]);
  
  // Attributes
  const [careLevel, setCareLevel] = useState("");
  const [light, setLight] = useState("");
  const [avgSize, setAvgSize] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (editingProduct) {
        loadProductData();
      } else {
        resetForm();
      }
    }
  }, [open, editingProduct]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const loadProductData = async () => {
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`);
      const data = await response.json();
      
      setName(data.name);
      setSlug(data.slug);
      setCategoryId(data.category_id?.toString() || "");
      setShortDescription(data.short_description || "");
      setFullDescription(data.full_description || "");
      
      // Load images
      if (data.images && data.images.length > 0) {
        setProductImages(data.images);
      } else if (data.img) {
        setProductImages([{ image_url: data.img, is_primary: true, alt_text: data.name }]);
      }
      
      // Load variants safely (supporting strings/arrays)
      const rawVariants = typeof data.variants === "string" ? JSON.parse(data.variants) : (data.variants || []);
      const numberToLevel = (qty: number) => {
        if (!qty || qty <= 0) return "none";
        if (qty <= 10) return "low";
        if (qty <= 20) return "med";
        return "high";
      };

      const loadedVariants = rawVariants.map((v: any) => ({
        id: v.id ? v.id.toString().split("-").pop() : Math.random().toString(),
        label: v.label,
        price: parseFloat(v.price),
        stock: v.stock_quantity || 0,
        stock_level: numberToLevel(Number(v.stock_quantity || 0)),
        image_url: v.image_url,
      }));
      setVariants(loadedVariants);
      
      // Load attributes
      setCareLevel(data.attributes?.["Care Level"] || "");
      setLight(data.attributes?.["Light"] || "");
      setAvgSize(data.attributes?.["Average Size"] || "");
      setOrigin(data.attributes?.["Origin"] || "");

      // Reconstruct variant options from the 'Variant Options' attribute
      const loadedOptionNamesVal = data.attributes?.["Variant Options"];
      let loadedOptionNames = [];
      if (loadedOptionNamesVal) {
        try {
          loadedOptionNames = JSON.parse(loadedOptionNamesVal);
        } catch {
          loadedOptionNames = [];
        }
      }

      if (loadedOptionNames.length > 0) {
        const constructedOptions = loadedOptionNames.map((name: string, idx: number) => {
          const values = Array.from(new Set(
            loadedVariants.map((v: any) => v.label.split(" / ")[idx]?.trim()).filter(Boolean)
          ));
            return {
              id: `opt_${Date.now()}_${idx}`,
              name,
              values,
              valuesInput: values.join(", ")
            };
        });
        setVariantOptions(constructedOptions);
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product data");
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setCategoryId("");
    setShortDescription("");
    setFullDescription("");
    setProductImages([]);
    setImageFiles([]);
    setImagePreviews([]);
    setVariantOptions([]);
    setVariants([]);
    setCareLevel("");
    setLight("");
    setAvgSize("");
    setOrigin("");
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingProduct) {
      setSlug(generateSlug(value));
    }
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews: string[] = [];
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
        setImageFiles(prev => [...prev, file]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVariantImageChange = (variantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setVariants(prev => 
        prev.map(v => 
          v.id === variantId 
            ? { ...v, imageFile: file, imagePreview: reader.result as string } 
            : v
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const addVariantOption = () => {
    setVariantOptions([
      ...variantOptions,
      { id: Date.now().toString(), name: "", values: [], valuesInput: "" },
    ]);
  };

  const updateVariantOption = (id: string, field: "name" | "values" | "valuesInput", value: any) => {
    setVariantOptions(
      variantOptions.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
      )
    );
  };

  const removeVariantOption = (id: string) => {
    setVariantOptions(variantOptions.filter((opt) => opt.id !== id));
  };

  const generateVariants = () => {
    if (variantOptions.length === 0) {
      toast.error("Add at least one variant option");
      return;
    }

    // Validate variant options and parse raw input if provided
    const parsedOptions = variantOptions.map((opt) => {
      const raw = typeof opt.valuesInput === "string" && opt.valuesInput.length > 0
        ? opt.valuesInput
        : opt.values.join(",");
      const values = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return { ...opt, valuesParsed: values } as any;
    });

    for (const opt of parsedOptions) {
      if (!opt.name.trim()) {
        toast.error("All variant options must have a name");
        return;
      }
      if (!opt.valuesParsed || opt.valuesParsed.length === 0) {
        toast.error(`Add values for "${opt.name}"`);
        return;
      }
    }

    // Generate all combinations using parsed values
    const combinations: string[][] = [[]];
    for (const opt of parsedOptions) {
      const newCombinations: string[][] = [];
      for (const combo of combinations) {
        for (const value of opt.valuesParsed) {
          newCombinations.push([...combo, value]);
        }
      }
      combinations.length = 0;
      combinations.push(...newCombinations);
    }

    // Create variants with default stock level
    const newVariants: Array<Variant & { imageFile?: File; imagePreview?: string }> = combinations.map((combo, index) => ({
      id: `var_${Date.now()}_${index}`,
      label: combo.join(" / "),
      price: 0,
      stock_level: "none",
    }));

    setVariants(newVariants);
    toast.success(`Generated ${newVariants.length} variants`);
  };

  const addSingleVariant = () => {
    setVariants([
      ...variants,
      {
        id: `var_${Date.now()}`,
        label: "",
        price: 0,
        stock_level: "none",
      },
    ]);
  };

  const updateVariant = (id: string, field: keyof (Variant & { imageFile?: File; imagePreview?: string }), value: any) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const setPrimaryImage = (index: number) => {
    setProductImages(prev => prev.map((img, i) => ({
      ...img,
      is_primary: i === index
    })));
  };

  const removeProductImage = (index: number) => {
    if (imagePreviews.length > 0 && index >= productImages.length) {
      setImagePreviews(prev => prev.filter((_, i) => i !== (index - productImages.length)));
      setImageFiles(prev => prev.filter((_, i) => i !== (index - productImages.length)));
    } else {
      setProductImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !slug || !categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (variants.length === 0) {
      toast.error("Add at least one variant");
      return;
    }

    for (const variant of variants) {
      if (!variant.label || variant.price <= 0) {
        toast.error("All variants must have a label and price");
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("categoryId", categoryId);
      formData.append("shortDescription", shortDescription);
      formData.append("fullDescription", fullDescription);
      
      // Append product images
      formData.append("productImages", JSON.stringify(productImages));
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append("newImages", imageFiles[i]);
      }
      
      // Append variants
      formData.append("variants", JSON.stringify(variants));
      for (const variant of variants) {
        if (variant.imageFile) {
          formData.append(`variantImage_${variant.id}`, variant.imageFile);
        }
      }

      // Build attributes payload, including dynamic 'Variant Options' list
      const attributesPayload: Record<string, string> = {
        "Care Level": careLevel,
        Light: light,
        "Average Size": avgSize,
        Origin: origin,
      };

      if (variantOptions.length > 0) {
        attributesPayload["Variant Options"] = JSON.stringify(
          variantOptions.map((opt) => opt.name)
        );
      }

      formData.append("attributes", JSON.stringify(attributesPayload));

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        toast.success(
          editingProduct ? "Product updated successfully" : "Product created successfully"
        );
        onSaved();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const allImages = [
    ...productImages,
    ...imagePreviews.map((preview, i) => ({ image_url: preview, is_primary: false, alt_text: `New Image ${i + 1}` } as ProductImage))
  ];

  const content = (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{editingProduct ? "Edit Product" : "Create New Product"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Neon Tetra"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., neon-tetra"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input
                id="shortDesc"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief description for listings"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDesc">Full Description</Label>
              <Textarea
                id="fullDesc"
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="Detailed product description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Product Images</Label>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {allImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.image_url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.is_primary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white"
                          onClick={() => setPrimaryImage(index)}
                        >
                          <GripVertical className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400"
                        onClick={() => removeProductImage(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {img.is_primary && (
                      <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Images</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProductImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Variant Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-primary flex items-center gap-1.5 mb-1.5">
                <Info className="w-3.5 h-3.5" /> Dynamic Variant Combinations Guide
              </span>
              To create multiple dropdowns for customers, define options here. For example:
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Option Name: <code className="bg-muted px-1 rounded text-primary">Size</code> with values: <code className="bg-muted px-1 rounded">S, M, L</code></li>
                <li>Option Name: <code className="bg-muted px-1 rounded text-primary">Color</code> with values: <code className="bg-muted px-1 rounded">Red, Blue</code></li>
              </ul>
              Click <strong>Generate Variants</strong> below to automatically calculate all unique combinations. You can then specify the custom price and stock for each combo!
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Variant Options</h3>
              <Button type="button" variant="outline" size="sm" onClick={addVariantOption}>
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            {variantOptions.map((opt) => (
              <div key={opt.id} className="flex gap-4 items-start p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Option name (e.g., Size, Color)"
                    value={opt.name}
                    onChange={(e) => updateVariantOption(opt.id, "name", e.target.value)}
                  />
                  <Input
                    placeholder="Values separated by commas (e.g., S, M, L)"
                    value={opt.valuesInput ?? opt.values.join(", ")}
                    onChange={(e) => updateVariantOption(opt.id, "valuesInput", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariantOption(opt.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {variantOptions.length > 0 && (
              <Button type="button" onClick={generateVariants} variant="secondary">
                Generate Variants
              </Button>
            )}
          </div>

          {/* Variants */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Variants *</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSingleVariant}>
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </div>

            {variants.map((variant) => (
              <div key={variant.id} className="flex gap-4 items-center p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <Input
                    placeholder="Label (e.g., Small / Red)"
                    value={variant.label}
                    onChange={(e) => updateVariant(variant.id, "label", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={variant.price || ""}
                    onChange={(e) =>
                      updateVariant(variant.id, "price", parseFloat(e.target.value) || 0)
                    }
                  />
                  <select
                    aria-label="Stock Level"
                    value={variant.stock_level ?? "none"}
                    onChange={(e) => updateVariant(variant.id, "stock_level", e.target.value)}
                    className="h-9 rounded-md border px-3"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <div className="flex items-center gap-2">
                    {(variant.imagePreview || variant.image_url) && (
                      <img
                        src={variant.imagePreview || variant.image_url}
                        alt={variant.label}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-muted text-xs">
                        <Upload className="w-3 h-3" />
                        <span>Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleVariantImageChange(variant.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariant(variant.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Attributes */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Product Attributes</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="careLevel">Care Level</Label>
                <Input
                  id="careLevel"
                  value={careLevel}
                  onChange={(e) => setCareLevel(e.target.value)}
                  placeholder="e.g., Easy, Moderate, Expert"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="light">Light Requirements</Label>
                <Input
                  id="light"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  placeholder="e.g., Low, Medium, High"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avgSize">Average Size</Label>
                <Input
                  id="avgSize"
                  value={avgSize}
                  onChange={(e) => setAvgSize(e.target.value)}
                  placeholder="e.g., 2-3 inches"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input
                  id="origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g., South America"
                />
              </div>
            </div>
          </div>

        <div className="flex justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="mr-2">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} form={undefined} onClick={() => {}}>
            {loading ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (inline) {
    return <div className="bg-background border border-border rounded-2xl">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="top-0 left-0 translate-x-0 translate-y-0 w-full h-screen max-w-none rounded-none m-0 p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProduct ? "Edit Product" : "Create New Product"}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
