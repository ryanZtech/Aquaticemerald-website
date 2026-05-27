"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";

export default function LocationsClient() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);

  const startCreate = () => { setEditing(null); setName(''); setDetail(''); setShowEditDialog(true); };

  const save = async () => {
    try {
      if (editing) {
        const res = await fetch(`/api/locations/${editing.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, detail }) });
        if (!res.ok) throw new Error('Failed');
        toast.success('Updated');
      } else {
        const res = await fetch('/api/locations', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, detail }) });
        if (!res.ok) throw new Error('Failed');
        toast.success('Created');
      }
      fetchLocations();
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    }
  };

  const edit = (loc: any) => { setEditing(loc); setName(loc.name); setDetail(loc.detail); setShowEditDialog(true); };

  const remove = async (loc: any) => {
    if (!confirm('Delete this location?')) return;
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Deleted');
      fetchLocations();
    } catch (e) { console.error(e); toast.error('Failed to delete'); }
  };

  if (loading) return <div className="py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Pickup Locations</h2>
        <div className="flex gap-2">
          <Button onClick={startCreate}><Plus className="w-4 h-4" /> New</Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden p-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-light">No locations</TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></div>
                  </TableCell>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground font-light">{loc.detail}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => edit({ id: loc.id, name: loc.name, detail: loc.detail })}><Edit className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(loc)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(open) => setShowEditDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'New Location'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Address / Detail" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setName(''); setDetail(''); setShowEditDialog(false); }}>Cancel</Button>
            <Button onClick={async () => { await save(); setShowEditDialog(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
