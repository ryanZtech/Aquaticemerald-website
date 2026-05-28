"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Plus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface TimeRule {
  id: number;
  pickup_location_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_pickups_per_slot: number;
  active: boolean;
}

interface Location {
  id: number;
  name: string;
  detail: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimesPageClient() {
  const [rules, setRules] = useState<TimeRule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeRule | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    pickup_location_id: 1,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    start_time: "16:30:00",
    end_time: "19:00:00",
    slot_duration_minutes: 15,
    max_pickups_per_slot: 1,
    active: true,
  });

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/times");
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error("Error fetching time rules:", error);
      toast.error("Failed to load time rules");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocs = async () => {
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchLocs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this time rule?")) return;

    try {
      const response = await fetch(`/api/times/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Time rule deleted successfully");
        fetchRules();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete time rule");
      }
    } catch (error) {
      console.error("Error deleting time rule:", error);
      toast.error("Failed to delete time rule");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRuleIds.size} rules?`)) return;

    try {
      await Promise.all(
        Array.from(selectedRuleIds).map(async (id) => {
          await fetch(`/api/times/${id}`, { method: "DELETE" });
        })
      );
      toast.success("Bulk delete successful");
      setSelectedRuleIds(new Set());
      fetchRules();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to bulk delete rules");
    }
  };

  const handleBulkToggleActive = async (active: boolean) => {
    try {
      await Promise.all(
        Array.from(selectedRuleIds).map(async (id) => {
          const rule = rules.find((r) => r.id === id);
          if (rule) {
            await fetch(`/api/times/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...rule, active }),
            });
          }
        })
      );
      toast.success(`Bulk ${active ? "enable" : "disable"} successful`);
      setSelectedRuleIds(new Set());
      fetchRules();
    } catch (error) {
      console.error("Bulk toggle failed:", error);
      toast.error(`Failed to bulk ${active ? "enable" : "disable"} rules`);
    }
  };

  const handleEdit = (rule: TimeRule) => {
    setEditingRule(rule);
    setFormData({
      pickup_location_id: rule.pickup_location_id,
      weekdays: [rule.weekday],
      start_time: rule.start_time,
      end_time: rule.end_time,
      slot_duration_minutes: rule.slot_duration_minutes,
      max_pickups_per_slot: rule.max_pickups_per_slot,
      active: rule.active,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      pickup_location_id: locations[0]?.id || 1,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      start_time: "16:30:00",
      end_time: "19:00:00",
      slot_duration_minutes: 15,
      max_pickups_per_slot: 1,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        const url = `/api/times/${editingRule.id}`;
        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            weekday: formData.weekdays[0],
          }),
        });
        if (response.ok) {
          toast.success("Time rule updated successfully");
          fetchRules();
          handleDialogClose();
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to update time rule");
        }
      } else {
        await Promise.all(
          formData.weekdays.map(async (weekday) => {
            const response = await fetch("/api/times", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pickup_location_id: formData.pickup_location_id,
                weekday,
                start_time: formData.start_time,
                end_time: formData.end_time,
                slot_duration_minutes: formData.slot_duration_minutes,
                max_pickups_per_slot: formData.max_pickups_per_slot,
                active: formData.active,
              }),
            });
            if (!response.ok) throw new Error("Failed to create time rule");
          })
        );
        toast.success("Time rules created successfully");
        fetchRules();
        handleDialogClose();
      }
    } catch (error) {
      console.error("Error saving time rules:", error);
      toast.error(`Failed to ${editingRule ? "update" : "create"} time rules`);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRuleIds.size === rules.length) {
      setSelectedRuleIds(new Set());
    } else {
      setSelectedRuleIds(new Set(rules.map((r) => r.id)));
    }
  };

  const toggleSelectRule = (id: number) => {
    const newSelected = new Set(selectedRuleIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRuleIds(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading time rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Pickup Times</h1>
          <p className="text-muted-foreground text-sm">Manage your pickup availability</p>
        </div>
        <div className="flex gap-2">
          {selectedRuleIds.size > 0 && (
            <>
              <Button
                variant="ghost"
                onClick={() => handleBulkToggleActive(true)}
                className="text-green-600 hover:text-green-700 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Enable Selected
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleBulkToggleActive(false)}
                className="text-yellow-600 hover:text-yellow-700 cursor-pointer"
              >
                <XCircle className="w-4 h-4 mr-1" /> Disable Selected
              </Button>
              <Button
                variant="ghost"
                onClick={handleBulkDelete}
                className="text-destructive hover:text-destructive cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
              </Button>
            </>
          )}
          <Button className="gap-2 cursor-pointer" onClick={handleCreate}>
            <Plus className="w-4 h-4" /> New Time Rule
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedRuleIds.size === rules.length && rules.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Slot Duration</TableHead>
              <TableHead>Max Pickups/Slot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-light">
                  No time rules found. Create your first rule!
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedRuleIds.has(rule.id)}
                      onCheckedChange={() => toggleSelectRule(rule.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {locations.find((l) => l.id === rule.pickup_location_id)?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{WEEKDAYS[rule.weekday]}</TableCell>
                  <TableCell>{rule.start_time}</TableCell>
                  <TableCell>{rule.end_time}</TableCell>
                  <TableCell>{rule.slot_duration_minutes} min</TableCell>
                  <TableCell>{rule.max_pickups_per_slot}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        rule.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => handleDelete(rule.id)}
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
            <DialogTitle>{editingRule ? "Edit Time Rule" : "Create Time Rules"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Select
                value={String(formData.pickup_location_id)}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, pickup_location_id: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Days</label>
              <div className="grid grid-cols-4 gap-2">
                {WEEKDAYS.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${idx}`}
                      checked={formData.weekdays.includes(idx)}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          weekdays: checked
                            ? [...prev.weekdays, idx]
                            : prev.weekdays.filter((d) => d !== idx),
                        }));
                      }}
                    />
                    <label htmlFor={`day-${idx}`} className="text-sm cursor-pointer">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={formData.start_time.slice(0, 5)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value + ":00" }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={formData.end_time.slice(0, 5)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value + ":00" }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slot Duration (minutes)</label>
                <Input
                  type="number"
                  value={formData.slot_duration_minutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slot_duration_minutes: parseInt(e.target.value) || 15 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Pickups per Slot</label>
                <Input
                  type="number"
                  value={formData.max_pickups_per_slot}
                  onChange={(e) => setFormData((prev) => ({ ...prev, max_pickups_per_slot: parseInt(e.target.value) || 1 }))}
                />
              </div>
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
            <Button variant="ghost" className="cursor-pointer" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleSave}>
              {editingRule ? "Update" : "Create Rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
