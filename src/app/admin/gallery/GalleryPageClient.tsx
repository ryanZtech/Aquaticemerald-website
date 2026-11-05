"use client";

import { useState, useEffect, useRef } from "react";
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
import { Plus, Edit, Trash2, Images, Upload, X, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { MAX_GALLERY_IMAGES } from "@/lib/galleryImages";
import { uploadImageFile } from "@/lib/clientImageUpload";

interface GalleryItem {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  image_urls: string[] | null;
  created_at: string;
}

/** One photo in the editor: an already-saved URL or a file to upload on save. */
interface ImageDraft {
  id: string;
  url?: string;
  file?: File;
  /** Object URL for a new file, or the existing image URL. */
  preview: string;
}

function draftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function imagesOf(item: GalleryItem): string[] {
  const saved = Array.isArray(item.image_urls) ? item.image_urls.filter(Boolean) : [];
  return saved.length > 0 ? saved : [item.image_url].filter(Boolean);
}

function SortableImageRow({
  draft,
  index,
  progress,
  onRemove,
}: {
  draft: ImageDraft;
  index: number;
  progress?: number;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={draft}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 12px 28px rgba(13, 31, 16, 0.14)",
        zIndex: 30,
      }}
      className="bg-card border border-border rounded-2xl px-2 py-2 list-none cursor-default"
    >
      <div className="flex items-center gap-3">
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="w-6 h-9 flex items-center justify-center text-muted-foreground hover:text-primary active:text-primary transition-colors cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label={`Reorder photo ${index + 1}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <img
        src={draft.preview}
        alt={`Photo ${index + 1}`}
        className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {index === 0 ? "Cover photo" : `Photo ${index + 1}`}
        </div>
        <div className="text-xs text-muted-foreground font-light truncate">
          {draft.file ? draft.file.name : "Saved photo"}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        onClick={onRemove}
        aria-label={`Remove photo ${index + 1}`}
      >
        <X className="w-4 h-4" />
      </Button>
      </div>

      {typeof progress === "number" && progress < 100 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-right text-[10px] font-medium tabular-nums text-primary">
            {progress}%
          </span>
        </div>
      )}
    </Reorder.Item>
  );
}

export default function GalleryPageClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Let a long project write-up use the room it needs: the textarea grows
  // with its content instead of trapping the text in a small scrolling box.
  useEffect(() => {
    const field = descriptionRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [description, dialogOpen]);

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

  const releasePreviews = (drafts: ImageDraft[]) => {
    drafts.forEach((draft) => {
      if (draft.preview.startsWith("blob:")) URL.revokeObjectURL(draft.preview);
    });
  };

  const resetImages = (next: ImageDraft[] = []) => {
    setUploadProgress({});
    setImages((prev) => {
      releasePreviews(prev);
      return next;
    });
  };

  const openUpload = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    resetImages();
    setDialogOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || "");
    resetImages(
      imagesOf(item).map((url) => ({ id: draftId(), url, preview: url })),
    );
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      resetImages();
    }
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: ImageDraft[] = Array.from(fileList).map((file) => ({
      id: draftId(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => {
      const next = [...prev, ...added];
      if (next.length > MAX_GALLERY_IMAGES) {
        toast.error(`You can add up to ${MAX_GALLERY_IMAGES} images per entry`);
        // Keep whatever fits and release the object URLs we are dropping.
        releasePreviews(next.slice(MAX_GALLERY_IMAGES));
        return next.slice(0, MAX_GALLERY_IMAGES);
      }
      return next;
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((draft) => draft.id === id);
      if (removed?.preview.startsWith("blob:")) URL.revokeObjectURL(removed.preview);
      return prev.filter((draft) => draft.id !== id);
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }
    if (images.length === 0) {
      toast.error("Please choose at least one image");
      return;
    }

    setSaving(true);
    setUploadProgress({});
    try {
      // Every photo travels in its own request — Vercel rejects a body over
      // ~4.5MB — and each row shows its own progress while it uploads.
      const uploaded = await Promise.all(
        images.map(async (draft) => {
          if (draft.url) return draft.url;
          if (!draft.file) return null;
          const result = await uploadImageFile(
            draft.file,
            "/api/gallery/upload",
            (percent) =>
              setUploadProgress((prev) => ({ ...prev, [draft.id]: percent })),
          );
          if (!result.url) {
            throw new Error(result.error || "Failed to upload image");
          }
          return result.url;
        }),
      );

      if (uploaded.some((url) => !url)) {
        toast.error("Please choose at least one image");
        return;
      }
      const imageUrls = uploaded as string[];

      const response = await fetch(
        editing ? `/api/gallery/${editing.id}` : "/api/gallery",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            image_urls: imageUrls,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Failed to save entry");
        return;
      }

      toast.success(editing ? "Entry updated" : "Entry added");
      setDialogOpen(false);
      setEditing(null);
      resetImages();
      fetchItems();
    } catch (error) {
      console.error("Error saving gallery item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    const count = imagesOf(item).length;
    if (
      !confirm(
        `Delete "${item.title}"? This removes ${
          count > 1 ? `all ${count} photos` : "the photo"
        } from the gallery.`,
      )
    )
      return;

    try {
      const response = await fetch(`/api/gallery/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success("Entry deleted");
        fetchItems();
      } else {
        toast.error(data.error || "Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting gallery item:", error);
      toast.error("Failed to delete entry");
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
            Upload photos for the public gallery. Each entry can hold several
            photos of one project — drag them into the order you want, and the
            first one is the cover. The title shows under the cover and the
            description shows when an entry is opened.
          </p>
        </div>
        <Button className="gap-2" onClick={openUpload}>
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-12 text-center text-muted-foreground font-light">
          No entries yet. Upload your first project!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const itemImages = imagesOf(item);
            return (
              <div
                key={item.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img
                    src={itemImages[0]}
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
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        {/* The dialog itself never scrolls — an inner column does — so the
            rounded corners stay intact around the scrollbar on both sides. */}
        <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-hidden flex flex-col gap-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editing ? "Edit Entry" : "Add Entry"}</DialogTitle>
            <DialogDescription>
              Add one or more photos of the same project, then drag them into
              order. The first photo is the cover in the gallery; the rest are
              shown when a visitor opens it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Photos ({images.length}/{MAX_GALLERY_IMAGES})
              </label>

              {images.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={images}
                  onReorder={setImages}
                  className="space-y-2 max-h-[34vh] overflow-y-auto pr-1"
                >
                  {images.map((draft, index) => (
                    <SortableImageRow
                      key={draft.id}
                      draft={draft}
                      index={index}
                      progress={uploadProgress[draft.id]}
                      onRemove={() => handleRemoveImage(draft.id)}
                    />
                  ))}
                </Reorder.Group>
              )}

              {images.length < MAX_GALLERY_IMAGES && (
                <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                  {images.length === 0 ? (
                    <Images className="w-6 h-6" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span className="text-sm">
                    {images.length === 0 ? "Choose photos" : "Add more photos"}
                  </span>
                  <span className="text-xs font-light">
                    PNG, JPEG, WEBP or GIF · max 5MB each
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}

              {images.length > 1 && (
                <p className="text-xs text-muted-foreground font-light">
                  Drag the handle to change the order.
                </p>
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
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's in this project?"
                className="min-h-[6.5rem] overflow-hidden"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex-shrink-0">
            <Button variant="ghost" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
