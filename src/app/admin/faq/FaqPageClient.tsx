"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";

interface Faq {
  id: number;
  title: string;
  slug: string;
  body: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function SortableFaqRow({
  faq,
  onDrop,
  onEdit,
  onDelete,
}: {
  faq: Faq;
  onDrop: () => void;
  onEdit: (faq: Faq) => void;
  onDelete: (faq: Faq) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={faq}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 12px 28px rgba(13, 31, 16, 0.14)",
        zIndex: 30,
      }}
      className="flex items-center gap-3 bg-card border border-border rounded-2xl px-3 py-3 list-none cursor-default"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="w-6 h-9 flex items-center justify-center text-muted-foreground hover:text-primary active:text-primary transition-colors cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label={`Reorder ${faq.title}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{faq.title}</div>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {faq.slug}
        </code>
      </div>

      <div className="w-28 flex-shrink-0">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            faq.active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {faq.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="w-20 flex justify-end gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => onEdit(faq)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(faq)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Reorder.Item>
  );
}

export default function FaqPageClient() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    body: "",
    active: true,
  });

  const fetchFaqs = async () => {
    try {
      const response = await fetch("/api/faqs");
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  // After a drag settles, write the new running order to display_order so the
  // public FAQ page renders in exactly the order shown here.
  const persistOrder = async (list: Faq[]) => {
    const updates = list
      .map((faq, index) => ({ faq, order: index }))
      .filter(({ faq, order }) => faq.display_order !== order);
    if (updates.length === 0) return;

    setFaqs(list.map((faq, index) => ({ ...faq, display_order: index })));
    try {
      await Promise.all(
        updates.map(({ faq, order }) =>
          fetch(`/api/faqs/${faq.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: faq.title,
              slug: faq.slug,
              body: faq.body,
              display_order: order,
              active: faq.active,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to save order");
          }),
        ),
      );
      toast.success("Order saved");
    } catch (error) {
      console.error("Error saving FAQ order:", error);
      toast.error("Failed to save order");
      fetchFaqs();
    }
  };

  const handleDelete = async (faq: Faq) => {
    if (!confirm(`Are you sure you want to delete "${faq.title}"?`)) return;

    try {
      const response = await fetch(`/api/faqs/${faq.id}`, { method: "DELETE" });

      if (response.ok) {
        toast.success("FAQ deleted successfully");
        fetchFaqs();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete FAQ");
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error("Failed to delete FAQ");
    }
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormData({
      title: faq.title,
      slug: faq.slug,
      body: faq.body,
      active: faq.active,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({ title: "", slug: "", body: "", active: true });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingFaq(null);
  };

  const handleSave = async () => {
    try {
      const url = editingFaq ? `/api/faqs/${editingFaq.id}` : "/api/faqs";
      const method = editingFaq ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Display order is managed by dragging now: keep an edited item
          // where it is, and append brand-new ones at the end.
          display_order: editingFaq ? editingFaq.display_order : faqs.length,
        }),
      });

      if (response.ok) {
        toast.success(editingFaq ? "FAQ updated successfully" : "FAQ created successfully");
        fetchFaqs();
        handleDialogClose();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editingFaq ? "update" : "create"} FAQ`);
      }
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast.error(`Failed to ${editingFaq ? "update" : "create"} FAQ`);
    }
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading FAQs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">FAQ</h1>
          <p className="text-muted-foreground text-sm">
            Manage your frequently asked questions — drag a row to change the
            order they appear in.
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> New FAQ
        </Button>
      </div>

      {faqs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-12 text-center text-muted-foreground font-light">
          No FAQs found. Create your first FAQ!
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 px-3 pb-2 text-xs font-medium text-muted-foreground">
            <span className="w-6" />
            <span className="flex-1">Question</span>
            <span className="w-28">Status</span>
            <span className="w-20 text-right">Actions</span>
          </div>
          <Reorder.Group
            axis="y"
            values={faqs}
            onReorder={setFaqs}
            className="space-y-2"
          >
            {faqs.map((faq) => (
              <SortableFaqRow
                key={faq.id}
                faq={faq}
                onDrop={() => persistOrder(faqs)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </Reorder.Group>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Question</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug || generateSlug(title),
                  }));
                }}
                placeholder="FAQ question"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="faq-slug"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Answer</label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="FAQ answer"
                rows={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <label htmlFor="active" className="text-sm font-medium">Active</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSave}>{editingFaq ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
