"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
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
import { Plus, Edit, Trash2 } from "lucide-react";
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

export default function GuidesPageClient() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    body: "",
    display_order: 0,
    active: true,
  });

  const fetchGuides = async () => {
    try {
      const response = await fetch("/api/guides");
      const data = await response.json();
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

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await fetch(`/api/guides/${id}`, {
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
      display_order: guide.display_order,
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
      display_order: 0,
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
        body: JSON.stringify(formData),
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
          <p className="text-muted-foreground text-sm">Manage your aquarium care guides</p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> New Guide
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-light">
                  No guides found. Create your first guide!
                </TableCell>
              </TableRow>
            ) : (
              guides.map((guide) => (
                <TableRow key={guide.id}>
                  <TableCell className="font-medium">{guide.title}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{guide.slug}</code>
                  </TableCell>
                  <TableCell>{guide.display_order}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        guide.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {guide.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(guide)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(guide.id, guide.title)}
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
                    slug: prev.slug || generateSlug(title),
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
              <label className="text-sm font-medium mb-1 block">Display Order</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
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
