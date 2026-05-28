"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  PickupLocation,
  PickupHour,
  MONTH_NAMES,
  DAY_NAMES_SHORT,
  daysInMonth,
  firstDayOfMonth,
} from "@/lib/staticData";
import {
  ArrowLeft,
  Phone,
  User,
  MapPin,
  Calendar,
  Clock,
  Check,
  MessageCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CheckoutClientProps {
  locations: PickupLocation[];
  hours: PickupHour[];
  whatsapp: string;
}

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

interface SlotOption {
  label: string;
  pickupSlotAt: string;
  maxPickups: number;
}

function formatClockValue(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildSlotsForDate(
  rules: TimeRule[],
  year: number,
  month: number,
  day: number,
): SlotOption[] {
  const slots: SlotOption[] = [];

  for (const rule of rules) {
    const [startHour, startMinute] = rule.start_time.split(":").map(Number);
    const [endHour, endMinute] = rule.end_time.split(":").map(Number);
    let current = new Date(year, month, day, startHour, startMinute, 0, 0);
    const end = new Date(year, month, day, endHour, endMinute, 0, 0);
    const slotMinutes = Math.max(1, Number(rule.slot_duration_minutes || 15));

    while (current < end) {
      const next = new Date(current.getTime() + slotMinutes * 60 * 1000);
      if (next > end) break;

      slots.push({
        label: `${formatClockValue(current)} - ${formatClockValue(next)}`,
        pickupSlotAt: current.toISOString(),
        maxPickups: Math.max(1, Number(rule.max_pickups_per_slot || 1)),
      });

      current = next;
    }
  }

  return slots;
}

export default function CheckoutClient({
  locations,
  hours,
  whatsapp,
}: CheckoutClientProps) {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(todayY);
  const [month, setMonth] = useState(todayM);
  const [day, setDay] = useState<number | null>(null);
  const [timeWindow, setTimeWindow] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [bookedSlotCounts, setBookedSlotCounts] = useState<
    Record<string, number>
  >({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const generate22CharId = () => {
      const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const segment = (len: number) => {
        let res = "";
        for (let i = 0; i < len; i++) {
          res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
      };
      return `AE-${segment(4)}-${segment(4)}-${segment(4)}-${segment(4)}`;
    };
    setOrderId(generate22CharId());
  }, []);

  const availableMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(todayY, todayM + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    };
  });

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    setDay(null);
    setTimeWindow("");
  };

  useEffect(() => {
    async function loadTimeRules() {
      try {
        const res = await fetch("/api/times", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setTimeRules(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load pickup rules:", error);
      }
    }

    loadTimeRules();
  }, []);

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const isDayDisabled = (d: number) => {
    if (year < todayY) return true;
    if (year === todayY && month < todayM) return true;
    if (year === todayY && month === todayM && d < todayD) return true;
    return false;
  };

  const selectedDow = day !== null ? new Date(year, month, day).getDay() : -1;
  const selectedLocationId = location ? parseInt(location, 10) : NaN;
  const selectedRules = Number.isNaN(selectedLocationId)
    ? []
    : timeRules.filter(
        (rule) =>
          rule.active &&
          rule.pickup_location_id === selectedLocationId &&
          rule.weekday === selectedDow,
      );
  const slotOptions =
    day !== null && !Number.isNaN(selectedLocationId)
      ? buildSlotsForDate(selectedRules, year, month, day)
      : [];
  const timeWindows = slotOptions.map((slot) => ({
    ...slot,
    bookedCount: bookedSlotCounts[slot.pickupSlotAt] || 0,
    disabled: (bookedSlotCounts[slot.pickupSlotAt] || 0) >= slot.maxPickups,
  }));

  useEffect(() => {
    if (day === null || Number.isNaN(selectedLocationId)) {
      setBookedSlotCounts({});
      return;
    }

    let cancelled = false;

    async function loadBookedSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const counts: Record<string, number> = {};

        for (const order of Array.isArray(data) ? data : []) {
          if (
            order?.pickup_location_id === selectedLocationId &&
            order?.pickup_slot_at &&
            order?.status !== "cancelled"
          ) {
            counts[order.pickup_slot_at] =
              (counts[order.pickup_slot_at] || 0) + 1;
          }
        }

        if (!cancelled) {
          setBookedSlotCounts(counts);
        }
      } catch (error) {
        console.error("Failed to load booked slots:", error);
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    loadBookedSlots();

    return () => {
      cancelled = true;
    };
  }, [selectedLocationId, year, month, day]);

  useEffect(() => {
    if (
      timeWindow &&
      !timeWindows.some(
        (slot) => slot.pickupSlotAt === timeWindow && !slot.disabled,
      )
    ) {
      setTimeWindow("");
    }
  }, [timeWindow, timeWindows]);

  const getDowLabel = () => {
    if (selectedDow === 6) {
      const satHour = hours.find((h) =>
        h.dayRange.toLowerCase().includes("sat"),
      );
      return `Saturday: ${satHour ? satHour.timeRange : "11:00 am - 6:00 pm"}`;
    }
    if (selectedDow === 0) {
      const sunHour = hours.find((h) =>
        h.dayRange.toLowerCase().includes("sun"),
      );
      return `Sunday: ${sunHour ? sunHour.timeRange : "1:00 pm - 6:00 pm"}`;
    }
    if (selectedRules.length > 0) {
      return `${new Date(year, month, day as number).toLocaleDateString("en-US", { weekday: "long" })}: ${selectedRules.map((rule) => `${rule.start_time.slice(0, 5)} - ${rule.end_time.slice(0, 5)}`).join(", ")}`;
    }
    const weekdayHour = hours.find(
      (h) =>
        h.dayRange.toLowerCase().includes("week") ||
        h.dayRange.toLowerCase().includes("mon"),
    );
    return `Weekday: ${weekdayHour ? weekdayHour.timeRange : "4:30 pm - 7:00 pm"}`;
  };

  const canConfirm =
    name.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    email.trim().includes("@") &&
    location &&
    day !== null &&
    timeWindow;

  const handleConfirm = async () => {
    let hasError = false;
    if (!name.trim() || name.trim().length < 2) {
      setNameError(true);
      hasError = true;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setPhoneError(true);
      hasError = true;
    }

    if (hasError) return;

    if (!email.trim() || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const pickup_slot_at = timeWindow;

      const payload = {
        orderRef: orderId,
        customer_name: name || "",
        customer_email: email,
        customer_phone: phone,
        pickup_location_id: parseInt(location) || null,
        pickup_slot_at,
        cart,
        subtotal: cart.reduce((s, it) => s + it.price * it.qty, 0),
        total: cartTotal,
        notes: "",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Order creation failed:", err);
        alert("Failed to create order. Please try again.");
        return;
      }

      const msg = `my order number is ${orderId}, please confirm my order`;
      const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;

      // Open WhatsApp
      window.open(whatsappUrl, "_blank");

      // Small delay before redirecting to allow the window to open
      setTimeout(() => {
        clearCart();
        router.push("/");
      }, 500);
    } catch (e) {
      console.error(e);
      alert("Failed to submit order");
    } finally {
      setSaving(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center">
        <p className="text-muted-foreground mb-4 font-serif text-lg">
          No items in cart.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition cursor-pointer"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4 max-w-2xl mx-auto min-h-screen">
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </Link>

      <h1 className="font-serif text-4xl font-medium mb-2">
        Pickup Confirmation
      </h1>
      <p className="text-muted-foreground text-sm mb-6 font-light">
        Fill in your details and choose a pickup slot. {"You'll"} then message
        us on WhatsApp to confirm.
      </p>

      <div className="bg-emerald-600/10 border border-emerald-600/20 text-emerald-800 dark:text-emerald-300 rounded-2xl p-4 mb-8 text-center">
        <p className="text-xs uppercase tracking-widest font-semibold mb-1">
          Your Unique Order Reference
        </p>
        <p className="font-mono text-lg font-bold tracking-wider">{orderId}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Order Summary
          </p>
          <div className="space-y-2 mb-4">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground font-light">
                  {item.qty}× {item.name}{" "}
                  <span className="text-xs ml-1 font-normal">
                    ({item.variantLabel})
                  </span>
                </span>
                <span className="font-medium">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Your Details
          </p>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(false);
                }}
                placeholder="04XX XXX XXX"
                className={`w-full px-4 py-3 rounded-xl bg-secondary border text-sm outline-none focus:ring-2 focus:ring-ring transition ${phoneError ? "border-red-500" : "border-border focus:border-primary"}`}
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter a valid phone number (min 8 digits).
                </p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <User className="w-4 h-4 text-muted-foreground" /> Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(false);
                }}
                placeholder="Your name"
                className={`w-full px-4 py-3 rounded-xl bg-secondary border text-sm outline-none focus:ring-2 focus:ring-ring transition ${nameError ? "border-red-500" : "border-border focus:border-primary"}`}
              />
              {nameError && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter your name (min 2 characters).
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Pickup Location
          </p>
          <div className="space-y-2">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  setLocation(loc.id.toString());
                  setTimeWindow("");
                }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm transition-all text-left cursor-pointer ${location === loc.id.toString() ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${location === loc.id.toString() ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                >
                  {location === loc.id.toString() && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{loc.name}</p>
                  {loc.detail && (
                    <p className="text-xs text-muted-foreground font-light mt-0.5">
                      {loc.detail}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Pickup Date
          </p>
          <div className="flex gap-2 flex-wrap mb-5">
            {availableMonths.map((m) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => handleMonthChange(m.month, m.year)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${month === m.month && year === m.year ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] text-muted-foreground py-1.5 font-semibold uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = i + 1;
                const disabled = isDayDisabled(d);
                const selected = day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (!disabled) {
                        setDay(d);
                        setTimeWindow("");
                      }
                    }}
                    disabled={disabled}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all cursor-pointer ${disabled ? "text-muted-foreground/25 cursor-not-allowed" : ""} ${selected ? "bg-primary text-primary-foreground font-semibold shadow-sm" : ""} ${!disabled && !selected ? "hover:bg-accent font-medium" : ""}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {day !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
              We only take cash at pickups
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Pickup Time
            </p>
            <p className="text-xs text-muted-foreground mb-4 font-light">
              {getDowLabel()}
              {selectedRules.length > 0
                ? ` · ${selectedRules[0].slot_duration_minutes}-minute windows`
                : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timeWindows.map((slot) => (
                <button
                  key={slot.pickupSlotAt}
                  onClick={() => setTimeWindow(slot.pickupSlotAt)}
                  disabled={slot.disabled}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    timeWindow === slot.pickupSlotAt
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40"
                  } ${slot.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            {loadingSlots && (
              <p className="mt-3 text-xs text-muted-foreground">
                Checking booked slots...
              </p>
            )}
            {!loadingSlots && timeWindows.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {location
                  ? "No pickup times are available for this date and location."
                  : "Select a pickup location first."}
              </p>
            )}
          </motion.div>
        )}

        {canConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <button
              onClick={handleConfirm}
              disabled={saving}
              className={`w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 cursor-pointer ${saving ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  <span>Confirm & Message on WhatsApp</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed font-light">
              This opens WhatsApp with your order reference number pre-filled.
              Your order is confirmed once the seller responds.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
