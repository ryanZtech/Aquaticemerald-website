"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Plus, Edit, Trash2, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Switch } from "@/app/components/ui/switch";

interface Location {
  id: number;
  name: string;
  detail: string | null;
  active: boolean;
}

export default function LocationsClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [active, setActive] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("Failed to load locations");
      setLocations(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setDetail("");
    setActive(true);
    setShowEditDialog(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editing) {
        const res = await fetch(`/api/locations/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, detail, active }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed");
        }
        toast.success("Location updated");
      } else {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, detail, active }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed");
        }
        toast.success("Location added");
      }
      fetchLocations();
      setEditing(null);
      setShowEditDialog(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save");
    }
  };

  const edit = (loc: Location) => {
    setEditing(loc);
    setName(loc.name);
    setDetail(loc.detail || "");
    setActive(loc.active ?? true);
    setShowEditDialog(true);
  };

  // Inline toggle: flips visibility at checkout without opening any dialog.
  const toggleActive = async (loc: Location, next: boolean) => {
    setSavingId(loc.id);
    setLocations((prev) =>
      prev.map((l) => (l.id === loc.id ? { ...l, active: next } : l)),
    );
    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loc.name,
          detail: loc.detail || "",
          active: next,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(next ? "Shown at checkout" : "Hidden from checkout");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update location");
      setLocations((prev) =>
        prev.map((l) => (l.id === loc.id ? { ...l, active: !next } : l)),
      );
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (loc: Location) => {
    if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Location deleted");
      fetchLocations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete location");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-muted-foreground text-sm font-light">
          Loading locations...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Pickup Locations</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            These are the places customers can choose when they collect an
            order. Turn a location off to hide it from checkout — orders
            already placed against it are unaffected.
          </p>
        </div>
        <Button className="gap-2 cursor-pointer" onClick={startCreate}>
          <Plus className="w-4 h-4" /> New Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <p className="font-medium text-sm mb-1">No pickup locations yet</p>
          <p className="text-muted-foreground text-sm font-light mb-5">
            Add one so customers know where to meet you.
          </p>
          <Button className="gap-2 cursor-pointer" onClick={startCreate}>
            <Plus className="w-4 h-4" /> New Location
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`flex items-center gap-4 bg-card border rounded-2xl px-4 py-3.5 transition-colors ${
                loc.active
                  ? "border-border hover:border-primary/40"
                  : "border-border/60 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{loc.name}</div>
                <div className="text-xs text-muted-foreground font-light truncate">
                  {loc.detail || "No address note"}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      loc.active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {savingId === loc.id
                      ? "Saving…"
                      : loc.active
                        ? "Visible at checkout"
                        : "Hidden from checkout"}
                  </span>
                  <Switch
                    checked={loc.active}
                    disabled={savingId === loc.id}
                    onCheckedChange={(next) => toggleActive(loc, next)}
                    className="cursor-pointer"
                    aria-label={`Show ${loc.name} at checkout`}
                  />
                </div>
                <div className="w-px h-6 bg-border" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => edit(loc)}
                  className="cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                  aria-label={`Edit ${loc.name}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(loc)}
                  className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${loc.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => setShowEditDialog(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Location" : "New Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Location name
              </label>
              <Input
                placeholder="e.g. Car park at Westfield"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Address or note shown at checkout
              </label>
              <Input
                placeholder="e.g. Meet near the fountain on Level 1"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
              <span>
                <span className="font-medium block">Visible at checkout</span>
                <span className="text-xs text-muted-foreground font-light">
                  Customers can pick this location when ordering
                </span>
              </span>
              <Switch
                checked={active}
                onCheckedChange={setActive}
                aria-label="Visible at checkout"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                setEditing(null);
                setName("");
                setDetail("");
                setActive(true);
                setShowEditDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={save}>
              {editing ? "Save Changes" : "Add Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
