"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Plus, Edit, Trash2, Ticket, Zap, Megaphone, Upload, Copy } from "lucide-react";
import { toast } from "sonner";

interface DiscountCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  free_product_id: number | null;
  free_variant_id: number | null;
  free_product_name: string | null;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  active: boolean;
  usage_count: number;
}

interface AutoDiscount {
  id: number;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_spend_amount: number | null;
  trigger_product_id: number | null;
  trigger_variant_id: number | null;
  trigger_product_name: string | null;
  effect_type: string;
  effect_value: number | null;
  effect_free_product_id: number | null;
  effect_free_variant_id: number | null;
  effect_free_product_name: string | null;
  priority: number;
  active: boolean;
}

interface PromoPopup {
  id: number;
  name: string;
  heading: string;
  body_text: string | null;
  button_text: string;
  button_url: string;
  image_url: string | null;
  delay_seconds: number;
  active: boolean;
}

interface Product {
  id: string | number;
  name: string;
  slug: string;
}

export default function PromoPageClient() {
  const [activeTab, setActiveTab] = useState("codes");

  // Discount Codes
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [codeForm, setCodeForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    free_product_id: "",
    free_variant_id: "",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: "",
    max_uses: "",
    active: true,
  });

  // Auto Discounts
  const [autoDiscounts, setAutoDiscounts] = useState<AutoDiscount[]>([]);
  const [autoDialogOpen, setAutoDialogOpen] = useState(false);
  const [editingAuto, setEditingAuto] = useState<AutoDiscount | null>(null);
  const [autoForm, setAutoForm] = useState({
    name: "",
    description: "",
    trigger_type: "spend_amount",
    trigger_spend_amount: "",
    trigger_product_id: "",
    trigger_variant_id: "",
    effect_type: "fixed_amount",
    effect_value: "",
    effect_free_product_id: "",
    effect_free_variant_id: "",
    priority: "0",
    active: true,
  });

  // Promo Popups
  const [promoPopups, setPromoPopups] = useState<PromoPopup[]>([]);
  const [popupDialogOpen, setPopupDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PromoPopup | null>(null);
  const [popupForm, setPopupForm] = useState({
    name: "",
    heading: "",
    body_text: "",
    button_text: "Shop Now",
    button_url: "/products",
    image_url: "",
    delay_seconds: "3",
    active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Products for dropdowns
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchDiscountCodes();
    fetchAutoDiscounts();
    fetchPromoPopups();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchDiscountCodes = async () => {
    try {
      const res = await fetch("/api/discount-codes");
      const data = await res.json();
      setDiscountCodes(data);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      toast.error("Failed to load discount codes");
    }
  };

  const fetchAutoDiscounts = async () => {
    try {
      const res = await fetch("/api/auto-discounts");
      const data = await res.json();
      setAutoDiscounts(data);
    } catch (error) {
      console.error("Error fetching auto discounts:", error);
      toast.error("Failed to load auto discounts");
    }
  };

  const fetchPromoPopups = async () => {
    try {
      const res = await fetch("/api/promo-popups/admin");
      const data = await res.json();
      setPromoPopups(data);
    } catch (error) {
      console.error("Error fetching promo popups:", error);
      toast.error("Failed to load promo popups");
    }
  };

  // Discount Code handlers
  const handleCreateCode = () => {
    setEditingCode(null);
    setCodeForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      free_product_id: "",
      free_variant_id: "",
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: "",
      max_uses: "",
      active: true,
    });
    setCodeDialogOpen(true);
  };

  const handleEditCode = (code: DiscountCode) => {
    setEditingCode(code);
    setCodeForm({
      code: code.code,
      description: code.description || "",
      discount_type: code.discount_type,
      discount_value: code.discount_value?.toString() || "",
      free_product_id: code.free_product_id?.toString() || "",
      free_variant_id: code.free_variant_id?.toString() || "",
      valid_from: new Date(code.valid_from).toISOString().slice(0, 16),
      valid_until: code.valid_until ? new Date(code.valid_until).toISOString().slice(0, 16) : "",
      max_uses: code.max_uses?.toString() || "",
      active: code.active,
    });
    setCodeDialogOpen(true);
  };

  const handleSaveCode = async () => {
    try {
      const url = editingCode ? `/api/discount-codes/${editingCode.id}` : "/api/discount-codes";
      const method = editingCode ? "PUT" : "POST";

      const payload = {
        ...codeForm,
        discount_value: codeForm.discount_value ? parseFloat(codeForm.discount_value) : null,
        free_product_id: codeForm.free_product_id || null,
        free_variant_id: codeForm.free_variant_id ? parseInt(codeForm.free_variant_id) : null,
        max_uses: codeForm.max_uses ? parseInt(codeForm.max_uses) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingCode ? "Code updated" : "Code created");
        fetchDiscountCodes();
        setCodeDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save code");
      }
    } catch (error) {
      console.error("Error saving discount code:", error);
      toast.error("Failed to save code");
    }
  };

  const handleDeleteCode = async (id: number, code: string) => {
    if (!confirm(`Delete code "${code}"?`)) return;

    try {
      const res = await fetch(`/api/discount-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Code deleted");
        fetchDiscountCodes();
      } else {
        toast.error("Failed to delete code");
      }
    } catch (error) {
      console.error("Error deleting code:", error);
      toast.error("Failed to delete code");
    }
  };

  const copyPromoLink = (code: string) => {
    const url = `${window.location.origin}?promo=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Promo link copied to clipboard!");
  };

  // Auto Discount handlers
  const handleCreateAuto = () => {
    setEditingAuto(null);
    setAutoForm({
      name: "",
      description: "",
      trigger_type: "spend_amount",
      trigger_spend_amount: "",
      trigger_product_id: "",
      trigger_variant_id: "",
      effect_type: "fixed_amount",
      effect_value: "",
      effect_free_product_id: "",
      effect_free_variant_id: "",
      priority: "0",
      active: true,
    });
    setAutoDialogOpen(true);
  };

  const handleEditAuto = (discount: AutoDiscount) => {
    setEditingAuto(discount);
    setAutoForm({
      name: discount.name,
      description: discount.description || "",
      trigger_type: discount.trigger_type,
      trigger_spend_amount: discount.trigger_spend_amount?.toString() || "",
      trigger_product_id: discount.trigger_product_id?.toString() || "",
      trigger_variant_id: discount.trigger_variant_id?.toString() || "",
      effect_type: discount.effect_type,
      effect_value: discount.effect_value?.toString() || "",
      effect_free_product_id: discount.effect_free_product_id?.toString() || "",
      effect_free_variant_id: discount.effect_free_variant_id?.toString() || "",
      priority: discount.priority.toString(),
      active: discount.active,
    });
    setAutoDialogOpen(true);
  };

  const handleSaveAuto = async () => {
    try {
      const url = editingAuto ? `/api/auto-discounts/${editingAuto.id}` : "/api/auto-discounts";
      const method = editingAuto ? "PUT" : "POST";

      const payload = {
        ...autoForm,
        trigger_spend_amount: autoForm.trigger_spend_amount ? parseFloat(autoForm.trigger_spend_amount) : null,
        trigger_product_id: autoForm.trigger_product_id || null,
        trigger_variant_id: autoForm.trigger_variant_id ? parseInt(autoForm.trigger_variant_id) : null,
        effect_value: autoForm.effect_value ? parseFloat(autoForm.effect_value) : null,
        effect_free_product_id: autoForm.effect_free_product_id || null,
        effect_free_variant_id: autoForm.effect_free_variant_id ? parseInt(autoForm.effect_free_variant_id) : null,
        priority: parseInt(autoForm.priority) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingAuto ? "Auto discount updated" : "Auto discount created");
        fetchAutoDiscounts();
        setAutoDialogOpen(false);
      } else {
        toast.error("Failed to save auto discount");
      }
    } catch (error) {
      console.error("Error saving auto discount:", error);
      toast.error("Failed to save auto discount");
    }
  };

  const handleDeleteAuto = async (id: number, name: string) => {
    if (!confirm(`Delete auto discount "${name}"?`)) return;

    try {
      const res = await fetch(`/api/auto-discounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Auto discount deleted");
        fetchAutoDiscounts();
      } else {
        toast.error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting auto discount:", error);
      toast.error("Failed to delete");
    }
  };

  // Popup handlers
  const handleCreatePopup = () => {
    setEditingPopup(null);
    setPopupForm({
      name: "",
      heading: "",
      body_text: "",
      button_text: "Shop Now",
      button_url: "/products",
      image_url: "",
      delay_seconds: "3",
      active: true,
    });
    setPopupDialogOpen(true);
  };

  const handleEditPopup = (popup: PromoPopup) => {
    setEditingPopup(popup);
    setPopupForm({
      name: popup.name,
      heading: popup.heading,
      body_text: popup.body_text || "",
      button_text: popup.button_text,
      button_url: popup.button_url,
      image_url: popup.image_url || "",
      delay_seconds: popup.delay_seconds.toString(),
      active: popup.active,
    });
    setPopupDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/promo-popups/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPopupForm((prev) => ({ ...prev, image_url: data.url }));
        toast.success("Image uploaded");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePopup = async () => {
    try {
      const url = editingPopup ? `/api/promo-popups/${editingPopup.id}` : "/api/promo-popups";
      const method = editingPopup ? "PUT" : "POST";

      const payload = {
        ...popupForm,
        delay_seconds: parseInt(popupForm.delay_seconds) || 3,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingPopup ? "Popup updated" : "Popup created");
        fetchPromoPopups();
        setPopupDialogOpen(false);
      } else {
        toast.error("Failed to save popup");
      }
    } catch (error) {
      console.error("Error saving popup:", error);
      toast.error("Failed to save popup");
    }
  };

  const handleDeletePopup = async (id: number, name: string) => {
    if (!confirm(`Delete popup "${name}"? This will also delete the associated image.`)) return;

    try {
      const res = await fetch(`/api/promo-popups/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Popup deleted");
        fetchPromoPopups();
      } else {
        toast.error("Failed to delete popup");
      }
    } catch (error) {
      console.error("Error deleting popup:", error);
      toast.error("Failed to delete popup");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium">Promotions</h1>
        <p className="text-muted-foreground text-sm">Manage discount codes, auto discounts, and promo popups</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="codes" className="gap-2">
            <Ticket className="w-4 h-4" />
            Codes
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            <Zap className="w-4 h-4" />
            Auto
          </TabsTrigger>
          <TabsTrigger value="popups" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Popups
          </TabsTrigger>
        </TabsList>

        {/* DISCOUNT CODES TAB */}
        <TabsContent value="codes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create time-limited discount codes for customers to use at checkout
            </p>
            <Button onClick={handleCreateCode} className="gap-2">
              <Plus className="w-4 h-4" /> New Code
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-light">
                      No discount codes yet
                    </TableCell>
                  </TableRow>
                ) : (
                  discountCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold">{code.code}</TableCell>
                      <TableCell className="text-xs">
                        {code.discount_type === "percentage" ? "Percentage" : "Free Item"}
                      </TableCell>
                      <TableCell>
                        {code.discount_type === "percentage"
                          ? `${code.discount_value}%`
                          : code.free_product_name || "Item"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {code.valid_until
                          ? new Date(code.valid_until).toLocaleDateString()
                          : "No expiry"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">{code.usage_count}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            code.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {code.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyPromoLink(code.code)}
                            title="Copy promo link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCode(code)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCode(code.id, code.code)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* AUTO DISCOUNTS TAB */}
        <TabsContent value="auto" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Automatic discounts triggered by cart conditions
            </p>
            <Button onClick={handleCreateAuto} className="gap-2">
              <Plus className="w-4 h-4" /> New Auto Discount
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-light">
                      No auto discounts yet
                    </TableCell>
                  </TableRow>
                ) : (
                  autoDiscounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-medium">{discount.name}</TableCell>
                      <TableCell className="text-xs">
                        {discount.trigger_type === "spend_amount" && `Spend $${discount.trigger_spend_amount}`}
                        {discount.trigger_type === "item_in_cart" && (discount.trigger_product_name || "Item in cart")}
                        {discount.trigger_type === "both" && "Spend + Item"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {discount.effect_type === "fixed_amount" && `$${discount.effect_value} off`}
                        {discount.effect_type === "percentage" && `${discount.effect_value}% off`}
                        {discount.effect_type === "free_item" && (discount.effect_free_product_name || "Free item")}
                      </TableCell>
                      <TableCell>{discount.priority}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            discount.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {discount.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditAuto(discount)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteAuto(discount.id, discount.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* POPUPS TAB */}
        <TabsContent value="popups" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Homepage promotional popups with images and CTAs
            </p>
            <Button onClick={handleCreatePopup} className="gap-2">
              <Plus className="w-4 h-4" /> New Popup
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Heading</TableHead>
                  <TableHead>Button</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoPopups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-light">
                      No popups yet
                    </TableCell>
                  </TableRow>
                ) : (
                  promoPopups.map((popup) => (
                    <TableRow key={popup.id}>
                      <TableCell className="font-medium">{popup.name}</TableCell>
                      <TableCell className="text-sm">{popup.heading}</TableCell>
                      <TableCell className="text-xs">{popup.button_text}</TableCell>
                      <TableCell className="text-xs">{popup.delay_seconds}s</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            popup.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {popup.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditPopup(popup)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeletePopup(popup.id, popup.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* DISCOUNT CODE DIALOG */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Edit Discount Code" : "Create Discount Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Code *</label>
              <Input
                value={codeForm.code}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={codeForm.description}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Summer sale discount"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Discount Type *</label>
              <Select
                value={codeForm.discount_type}
                onValueChange={(value) => setCodeForm((prev) => ({ ...prev, discount_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="free_item">Free Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {codeForm.discount_type === "percentage" ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Percentage *</label>
                <Input
                  type="number"
                  value={codeForm.discount_value}
                  onChange={(e) => setCodeForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Free Product *</label>
                <Select
                  value={codeForm.free_product_id}
                  onValueChange={(value) => setCodeForm((prev) => ({ ...prev, free_product_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Valid From *</label>
                <Input
                  type="datetime-local"
                  value={codeForm.valid_from}
                  onChange={(e) => setCodeForm((prev) => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valid Until</label>
                <Input
                  type="datetime-local"
                  value={codeForm.valid_until}
                  onChange={(e) => setCodeForm((prev) => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Uses</label>
              <Input
                type="number"
                value={codeForm.max_uses}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, max_uses: e.target.value }))}
                placeholder="Leave empty for unlimited"
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for unlimited uses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="code-active"
                checked={codeForm.active}
                onChange={(e) => setCodeForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <label htmlFor="code-active" className="text-sm font-medium">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCodeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCode}>{editingCode ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AUTO DISCOUNT DIALOG */}
      <Dialog open={autoDialogOpen} onOpenChange={setAutoDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAuto ? "Edit Auto Discount" : "Create Auto Discount"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                value={autoForm.name}
                onChange={(e) => setAutoForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Spend $50 get 10% off"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={autoForm.description}
                onChange={(e) => setAutoForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Auto discount description"
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Trigger Conditions</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Trigger Type *</label>
                  <Select
                    value={autoForm.trigger_type}
                    onValueChange={(value) => setAutoForm((prev) => ({ ...prev, trigger_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spend_amount">Spend Amount</SelectItem>
                      <SelectItem value="item_in_cart">Item in Cart</SelectItem>
                      <SelectItem value="both">Both (Spend + Item)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(autoForm.trigger_type === "spend_amount" || autoForm.trigger_type === "both") && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Minimum Spend *</label>
                    <Input
                      type="number"
                      value={autoForm.trigger_spend_amount}
                      onChange={(e) => setAutoForm((prev) => ({ ...prev, trigger_spend_amount: e.target.value }))}
                      placeholder="50"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
                {(autoForm.trigger_type === "item_in_cart" || autoForm.trigger_type === "both") && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Required Product *</label>
                    <Select
                      value={autoForm.trigger_product_id}
                      onValueChange={(value) => setAutoForm((prev) => ({ ...prev, trigger_product_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Effect</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Effect Type *</label>
                  <Select
                    value={autoForm.effect_type}
                    onValueChange={(value) => setAutoForm((prev) => ({ ...prev, effect_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {autoForm.effect_type === "fixed_amount" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Amount Off *</label>
                    <Input
                      type="number"
                      value={autoForm.effect_value}
                      onChange={(e) => setAutoForm((prev) => ({ ...prev, effect_value: e.target.value }))}
                      placeholder="5"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
                {autoForm.effect_type === "percentage" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Percentage Off *</label>
                    <Input
                      type="number"
                      value={autoForm.effect_value}
                      onChange={(e) => setAutoForm((prev) => ({ ...prev, effect_value: e.target.value }))}
                      placeholder="10"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
                {autoForm.effect_type === "free_item" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Free Product *</label>
                    <Select
                      value={autoForm.effect_free_product_id}
                      onValueChange={(value) => setAutoForm((prev) => ({ ...prev, effect_free_product_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Input
                  type="number"
                  value={autoForm.priority}
                  onChange={(e) => setAutoForm((prev) => ({ ...prev, priority: e.target.value }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Higher = applied first</p>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="auto-active"
                    checked={autoForm.active}
                    onChange={(e) => setAutoForm((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  <label htmlFor="auto-active" className="text-sm font-medium">Active</label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAutoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAuto}>{editingAuto ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP DIALOG */}
      <Dialog open={popupDialogOpen} onOpenChange={setPopupDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPopup ? "Edit Popup" : "Create Popup"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Internal Name *</label>
              <Input
                value={popupForm.name}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Summer Sale Popup"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Heading *</label>
              <Input
                value={popupForm.heading}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="Summer Sale!"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body Text</label>
              <Textarea
                value={popupForm.body_text}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, body_text: e.target.value }))}
                placeholder="Get 20% off all products this week"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Image</label>
              {popupForm.image_url && (
                <div className="mb-2">
                  <img src={popupForm.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Button Text *</label>
                <Input
                  value={popupForm.button_text}
                  onChange={(e) => setPopupForm((prev) => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Shop Now"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Button URL *</label>
                <Input
                  value={popupForm.button_url}
                  onChange={(e) => setPopupForm((prev) => ({ ...prev, button_url: e.target.value }))}
                  placeholder="/products"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Delay (seconds)</label>
              <Input
                type="number"
                value={popupForm.delay_seconds}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, delay_seconds: e.target.value }))}
                placeholder="3"
                min="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="popup-active"
                checked={popupForm.active}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <label htmlFor="popup-active" className="text-sm font-medium">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPopupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePopup}>{editingPopup ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
