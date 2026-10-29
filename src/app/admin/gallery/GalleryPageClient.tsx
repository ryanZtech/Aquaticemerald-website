"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Plus, Edit, Trash2, Images, Upload } from "lucide-react";
import { toast } from "sonner";

interface GalleryItem {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
}

export default function GalleryPageClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/gallery");
      if (!response.ok) throw new Error(`Failed to load gallery (${response.status})`);
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const clearPreview = () => {
    setPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const openUpload = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setFile(null);
    clearPreview();
    setDialogOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setFile(null);
    clearPreview();
    setPreview(item.image_url);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setFile(null);
      clearPreview();
    }
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    if (next) {
      clearPreview();
      setPreview(URL.createObjectURL(next));
    } else {
      clearPreview();
      if (editing) setPreview(editing.image_url);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }
    if (!file && !editing) {
      toast.error("Please choose an image to upload");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editing?.image_url || "";

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("/api/gallery/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          toast.error(uploadData.error || "Failed to upload image");
          return;
        }
        imageUrl = uploadData.url;
      }

      const response = await fetch(
        editing ? `/api/gallery/${editing.id}` : "/api/gallery",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            image_url: imageUrl,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Failed to save image");
        return;
      }

      toast.success(editing ? "Image updated" : "Image added");
      setDialogOpen(false);
      setEditing(null);
      setFile(null);
      clearPreview();
      fetchItems();
    } catch (error) {
      console.error("Error saving gallery item:", error);
      toast.error("Failed to save image");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm(`Delete "${item.title}"? This removes the image from the gallery.`))
      return;

    try {
      const response = await fetch(`/api/gallery/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success("Image deleted");
        fetchItems();
      } else {
        toast.error(data.error || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting gallery item:", error);
      toast.error("Failed to delete image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading gallery...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">Gallery</h1>
          <p className="text-muted-foreground text-sm">
            Upload photos for the public gallery. Each image has a title shown
            under it and a description shown when it&apos;s opened.
          </p>
        </div>
        <Button className="gap-2" onClick={openUpload}>
          <Plus className="w-4 h-4" /> Upload Image
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-12 text-center text-muted-foreground font-light">
          No images yet. Upload your first photo!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground font-light truncate">
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => openEdit(item)}
                    aria-label={`Edit ${item.title}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Image" : "Upload Image"}</DialogTitle>
            <DialogDescription>
              The title appears under the photo in the gallery. The description
              appears when a visitor opens it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Image</label>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-56 object-cover"
                  />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                  <Images className="w-6 h-6" />
                  <span className="text-sm">Choose an image</span>
                  <span className="text-xs font-light">
                    PNG, JPEG, WEBP or GIF · max 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              )}
              {preview && (
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Replace image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Crystal shrimp tank"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's in this photo?"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
