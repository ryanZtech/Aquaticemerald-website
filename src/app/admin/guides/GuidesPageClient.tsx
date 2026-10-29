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

interface Guide {
  id: number;
  title: string;
  slug: string;
  body: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function SortableGuideRow({
  guide,
  onDrop,
  onEdit,
  onDelete,
}: {
  guide: Guide;
  onDrop: () => void;
  onEdit: (guide: Guide) => void;
  onDelete: (guide: Guide) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={guide}
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
        aria-label={`Reorder ${guide.title}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{guide.title}</div>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {guide.slug}
        </code>
      </div>

      <div className="w-28 flex-shrink-0">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            guide.active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {guide.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="w-20 flex justify-end gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => onEdit(guide)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(guide)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Reorder.Item>
  );
}

export default function GuidesPageClient() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    body: "",
    active: true,
  });

  const fetchGuides = async () => {
    try {
      const response = await fetch("/api/guides");
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error("Failed to load guides");
      setGuides(data);
    } catch (error) {
      console.error("Error fetching guides:", error);
      toast.error("Failed to load guides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  // After a drag settles, write the new running order to display_order so the
  // public Care Guides page renders in exactly the order shown here.
  const persistOrder = async (list: Guide[]) => {
    const updates = list
      .map((guide, index) => ({ guide, order: index }))
      .filter(({ guide, order }) => guide.display_order !== order);
    if (updates.length === 0) return;

    setGuides(list.map((guide, index) => ({ ...guide, display_order: index })));
    try {
      await Promise.all(
        updates.map(({ guide, order }) =>
          fetch(`/api/guides/${guide.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: guide.title,
              slug: guide.slug,
              body: guide.body,
              display_order: order,
              active: guide.active,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to save order");
          }),
        ),
      );
      toast.success("Order saved");
    } catch (error) {
      console.error("Error saving guide order:", error);
      toast.error("Failed to save order");
      fetchGuides();
    }
  };

  const handleDelete = async (guide: Guide) => {
    if (!confirm(`Are you sure you want to delete "${guide.title}"?`)) return;

    try {
      const response = await fetch(`/api/guides/${guide.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Guide deleted successfully");
        fetchGuides();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete guide");
      }
    } catch (error) {
      console.error("Error deleting guide:", error);
      toast.error("Failed to delete guide");
    }
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      title: guide.title,
      slug: guide.slug,
      body: guide.body,
      active: guide.active,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setFormData({
      title: "",
      slug: "",
      body: "",
      active: true,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingGuide(null);
  };

  const handleSave = async () => {
    try {
      const url = editingGuide ? `/api/guides/${editingGuide.id}` : "/api/guides";
      const method = editingGuide ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Display order is managed by dragging now: keep an edited guide
          // where it is, and append brand-new ones at the end.
          display_order: editingGuide ? editingGuide.display_order : guides.length,
        }),
      });

      if (response.ok) {
        toast.success(editingGuide ? "Guide updated successfully" : "Guide created successfully");
        fetchGuides();
        handleDialogClose();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editingGuide ? "update" : "create"} guide`);
      }
    } catch (error) {
      console.error("Error saving guide:", error);
      toast.error(`Failed to ${editingGuide ? "update" : "create"} guide`);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading guides...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">Care Guides</h1>
          <p className="text-muted-foreground text-sm">
            Manage your aquarium care guides — drag a row to change the order
            they appear in.
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> New Guide
        </Button>
      </div>

      {guides.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-12 text-center text-muted-foreground font-light">
          No guides found. Create your first guide!
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 px-3 pb-2 text-xs font-medium text-muted-foreground">
            <span className="w-6" />
            <span className="flex-1">Title</span>
            <span className="w-28">Status</span>
            <span className="w-20 text-right">Actions</span>
          </div>
          <Reorder.Group
            axis="y"
            values={guides}
            onReorder={setGuides}
            className="space-y-2"
          >
            {guides.map((guide) => (
              <SortableGuideRow
                key={guide.id}
                guide={guide}
                onDrop={() => persistOrder(guides)}
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
            <DialogTitle>{editingGuide ? "Edit Guide" : "Create Guide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: !prev.slug || prev.slug === generateSlug(prev.title) ? generateSlug(title) : prev.slug,
                  }));
                }}
                placeholder="Guide title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="guide-slug"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Guide content"
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
            <Button variant="ghost" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingGuide ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
