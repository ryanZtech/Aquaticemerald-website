"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Copy, Check, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

interface OrderItem {
  id: number;
  product_id: string | null;
  variant_id: string | null;
  snapshot_product_name: string;
  snapshot_variant_label: string | null;
  snapshot_unit_price: number;
  quantity: number;
}

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_location_id: number | null;
  pickup_location_name: string | null;
  pickup_slot_at: string | null;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersPageClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPickedUp, setShowPickedUp] = useState(false);
  const [copyState, setCopyState] = useState<Record<number, boolean>>({});

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleTogglePicked = async (order: Order) => {
    const newStatus = order.status === "picked_up" ? "pending" : "picked_up";
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Order updated");
        fetchOrders();
      } else {
        toast.error("Failed to update order");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update order");
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm("Delete this order?")) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Order deleted");
        fetchOrders();
      } else {
        toast.error("Failed to delete order");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete order");
    }
  };

  const formatPickupTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = dayNames[date.getDay()];
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${day}, ${time}`;
  };

  const copyMessage = (order: Order) => {
    const itemsText = order.items.map(i => `${i.quantity}× ${i.snapshot_product_name}`).join(", ");
    const pickupAt = order.pickup_slot_at ? formatPickupTime(order.pickup_slot_at) : "N/A";
    const loc = order.pickup_location_name || "the pickup location";
    const msg = `just to confirm, you ordered ${itemsText} for $${Number(order.total).toFixed(2)}, and we'll meet up at ${loc} at ${pickupAt}`;
    try {
      navigator.clipboard.writeText(msg);
      toast.success("Copied message to clipboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to copy message");
    }
  };

  const toggleCopy = (orderId: number, cb: () => void) => {
    setCopyState((s) => ({ ...s, [orderId]: true }));
    cb();
    setTimeout(() => setCopyState((s) => ({ ...s, [orderId]: false })), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-40">Loading orders...</div>;

  const pending = orders.filter(o => o.status !== "picked_up");
  const picked = orders.filter(o => o.status === "picked_up");

  return (
    <div className="space-y-6">
      <style>{`
        .checkbox-wrapper-30 .checkbox {
          --bg: var(--background);
          --brdr: var(--border);
          --brdr-actv: var(--primary);
          --brdr-hovr: var(--muted-foreground);
          --dur: calc((var(--size, 2)/2) * 0.6s);
          display: inline-block;
          width: calc(var(--size, 1) * 22px);
          position: relative;
        }
        .checkbox-wrapper-30 .checkbox:after {
          content: "";
          width: 100%;
          padding-top: 100%;
          display: block;
        }
        .checkbox-wrapper-30 .checkbox > * {
          position: absolute;
        }
        .checkbox-wrapper-30 .checkbox input {
          -webkit-appearance: none;
          -moz-appearance: none;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
          background-color: var(--bg);
          border-radius: calc(var(--size, 1) * 4px);
          border: calc(var(--newBrdr, var(--size, 1)) * 1px) solid;
          color: var(--newBrdrClr, var(--brdr));
          outline: none;
          margin: 0;
          padding: 0;
          transition: all calc(var(--dur) / 3) linear;
        }
        .checkbox-wrapper-30 .checkbox input:hover,
        .checkbox-wrapper-30 .checkbox input:checked {
          --newBrdr: calc(var(--size, 1) * 2);
        }
        .checkbox-wrapper-30 .checkbox input:hover {
          --newBrdrClr: var(--brdr-hovr);
        }
        .checkbox-wrapper-30 .checkbox input:checked {
          --newBrdrClr: var(--brdr-actv);
          transition-delay: calc(var(--dur) /1.3);
        }
        .checkbox-wrapper-30 .checkbox input:checked + svg {
          --dashArray: 16 93;
          --dashOffset: 109;
          stroke: #16a34a; /* green tick */
        }
        .checkbox-wrapper-30 .checkbox svg {
          fill: none;
          left: 0;
          pointer-events: none;
          stroke: var(--muted-foreground);
          stroke-dasharray: var(--dashArray, 93);
          stroke-dashoffset: var(--dashOffset, 94);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2px;
          top: 0;
          transition: stroke-dasharray var(--dur), stroke-dashoffset var(--dur);
        }
        .checkbox-wrapper-30 .checkbox svg,
        .checkbox-wrapper-30 .checkbox input {
          display: block;
          height: 100%;
          width: 100%;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">Orders</h1>
          <p className="text-muted-foreground text-sm">Manage incoming orders and pickup status</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" style={{display: 'none'}}>
          <symbol id="checkbox-30" viewBox="0 0 22 22">
            <path fill="none" stroke="currentColor" d="M5.5,11.3L9,14.8L20.2,3.3l0,0c-0.5-1-1.5-1.8-2.7-1.8h-13c-1.7,0-3,1.3-3,3v13c0,1.7,1.3,3,3,3h13 c1.7,0,3-1.3,3-3v-13c0-0.4-0.1-0.8-0.3-1.2" />
          </symbol>
        </svg>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[48px]"> </TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-light">No orders</TableCell>
              </TableRow>
            ) : (
              pending.map((o) => (
                <TableRow key={o.id}>
                    <TableCell>
                      <div className="checkbox-wrapper-30">
                        <label className="checkbox">
                          <input type="checkbox" checked={o.status === 'picked_up'} onChange={() => handleTogglePicked(o)} />
                          <svg viewBox="0 0 22 22">
                            <use xlinkHref="#checkbox-30" />
                          </svg>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">#{o.id}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell>{o.customer_email}</TableCell>
                  <TableCell>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</TableCell>
                  <TableCell>${Number(o.total).toFixed(2)}</TableCell>
                  <TableCell>{o.pickup_location_name || "-"}<br/><span className="text-xs text-muted-foreground">{o.pickup_slot_at ? formatPickupTime(o.pickup_slot_at) : "-"}</span></TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleCopy(o.id, () => copyMessage(o))} className="cursor-pointer">
                          {copyState[o.id] ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(o)} className="cursor-pointer text-destructive hover:text-destructive">
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

      <div>
        <button className="text-sm text-muted-foreground underline" onClick={() => setShowPickedUp((s) => !s)}>
          {showPickedUp ? "Hide" : "Show"} picked up orders ({picked.length})
        </button>
        {showPickedUp && (
          <div className="mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Picked Up At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picked.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-light">No picked up orders</TableCell>
                  </TableRow>
                ) : (
                  picked.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">#{o.id}</TableCell>
                      <TableCell>{o.customer_name}<br/><span className="text-xs text-muted-foreground">{o.customer_email}</span></TableCell>
                      <TableCell>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell>${Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>{o.pickup_slot_at ? new Date(o.pickup_slot_at).toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => copyMessage(o)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleTogglePicked(o)}>
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
