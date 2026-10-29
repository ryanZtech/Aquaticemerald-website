"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { isValidEmail, isValidPhone } from "@/lib/contactValidation";
import TurnstileWidget, { TurnstileHandle } from "@/components/TurnstileWidget";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
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
  hasPromoCodes: boolean;
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

const STORE_TIMEZONE = "Australia/Sydney";

function sydneyParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STORE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
}

function sydneyDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const target = Date.UTC(year, month, day, hour, minute);
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const p = sydneyParts(new Date(instant));
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const adjustment = target - represented;
    if (!adjustment) break;
    instant += adjustment;
  }
  return new Date(instant);
}

function formatClockValue(date: Date) {
  return date.toLocaleTimeString("en-US", { timeZone: STORE_TIMEZONE, hour: "numeric", minute: "2-digit" });
}

function createOrderReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
  return `AE-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}`;
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
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const slotMinutes = Math.max(1, Number(rule.slot_duration_minutes || 15));

    for (let minute = start; minute + slotMinutes <= end; minute += slotMinutes) {
      const current = sydneyDate(year, month, day, Math.floor(minute / 60), minute % 60);
      const nextMinute = minute + slotMinutes;
      const next = sydneyDate(year, month, day, Math.floor(nextMinute / 60), nextMinute % 60);
      const parts = sydneyParts(current);
      // Skip nonexistent local times during the daylight-saving transition.
      if (parts.year !== year || parts.month !== month + 1 || parts.day !== day || parts.hour !== Math.floor(minute / 60) || parts.minute !== minute % 60) continue;
      slots.push({
        label: `${formatClockValue(current)} - ${formatClockValue(next)}`,
        pickupSlotAt: current.toISOString(),
        maxPickups: Math.max(1, Number(rule.max_pickups_per_slot || 1)),
      });
    }
  }

  return slots;
}

function isPlainObject(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export default function CheckoutClient({
  locations,
  hours,
  whatsapp,
  hasPromoCodes,
}: CheckoutClientProps) {
  const { cart, cartTotal, clearCart, autoDiscount, isHydrated } = useCart();
  const [confirmation, setConfirmation] = useState<{ orderRef: string; url: string | null; total: number } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Record<string, any> | null>(null);
  const [quote, setQuote] = useState<{ fingerprint: string; subtotal: number; discountAmount: number; total: number; items: Array<{ productId: string; variantId: string; price: number }> } | null>(null);

  const today = sydneyParts(new Date());
  const todayY = today.year;
  const todayM = today.month - 1;
  const todayD = today.day;

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
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

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount_type: string;
    discount_amount: number;
    discount_value: number;
    description?: string;
    free_item?: { productName: string } | null;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    // Restore each value independently: one corrupt entry must not prevent
    // the other from being recovered (a lost pending order in particular is
    // what makes a safe retry after an interrupted response possible).
    const readSession = (key: string) => {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.error(`Could not read ${key} from sessionStorage:`, error);
        return null;
      }
    };
    const clearSession = (key: string) => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Could not clear ${key} from sessionStorage:`, error);
      }
    };
    const savedConfirmation = readSession("aquatic_emerald_order_confirmation");
    if (savedConfirmation) {
      try {
        setConfirmation(JSON.parse(savedConfirmation));
      } catch (error) {
        console.error("Could not restore order confirmation:", error);
        clearSession("aquatic_emerald_order_confirmation");
      }
    }
    const savedPending = readSession("aquatic_emerald_pending_order");
    if (savedPending) {
      try {
        setPendingOrder(JSON.parse(savedPending));
      } catch (error) {
        console.error("Could not restore pending order:", error);
        clearSession("aquatic_emerald_pending_order");
      }
    }
    setOrderId(createOrderReference());

  }, []);

  const initialPromoHandled = useRef(false);
  useEffect(() => {
    if (!isHydrated || initialPromoHandled.current) return;
    const promoParam = new URLSearchParams(window.location.search).get("promo");
    let storedPromo: string | null = null;
    try {
      if (promoParam) sessionStorage.setItem("aquatic_emerald_pending_promo", promoParam);
      storedPromo = sessionStorage.getItem("aquatic_emerald_pending_promo");
    } catch (error) {
      console.error("Could not access the pending promo in sessionStorage:", error);
    }
    const pendingPromo = promoParam || storedPromo;
    if (!pendingPromo || cart.length === 0) return;
    initialPromoHandled.current = true;
    try {
      sessionStorage.removeItem("aquatic_emerald_pending_promo");
    } catch (error) {
      console.error("Could not clear the pending promo:", error);
    }
    setPromoCode(pendingPromo);
    void handleApplyPromo(pendingPromo);
  }, [isHydrated, cart]);

  const handleApplyPromo = async (code?: string) => {
    const codeToApply = code || promoCode;
    if (!codeToApply.trim()) {
      setPromoError("Enter a promo code");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const res = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToApply, cartTotal }),
      });

      if (res.ok) {
        const data = await res.json();
        setAppliedPromo({
          code: data.code,
          discount_type: data.discount_type,
          discount_amount: data.discount_amount || 0,
          discount_value: Number(data.discount_value) || 0,
          description: data.description,
          free_item: data.free_item || null,
        });
        setPromoError("");
      } else {
        const error = await res.json();
        setPromoError(error.error || "Invalid code");
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error("Error applying promo:", error);
      setPromoError("Failed to apply code");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const fingerprint = JSON.stringify({ cart, autoDiscount, appliedPromo });
  const activeQuote = quote?.fingerprint === fingerprint ? quote : null;
  const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const subtotal = activeQuote?.subtotal ?? money(cart.reduce((s, it) => s + it.price * it.qty, 0));
  // Combine the automatic discount (evaluated from the cart, no code
  // needed) with any manually-applied promo code — this mirrors exactly
  // how the server computes it in orders/route.ts (autoDiscountAmount +
  // promo discount, additive), so what's shown here is what will actually
  // be charged rather than a guess that only ever reflected the promo code.
  const autoDiscountAmount = autoDiscount?.discount_amount || 0;
  const promoDiscountAmount = !appliedPromo ? 0 : appliedPromo.discount_type === "percentage"
    ? Math.min(subtotal, subtotal * appliedPromo.discount_value / 100)
    : appliedPromo.discount_type === "fixed_amount" ? Math.min(subtotal, appliedPromo.discount_value) : 0;
  const discountAmount = activeQuote?.discountAmount ?? Math.min(subtotal, money(autoDiscountAmount + promoDiscountAmount));
  const finalTotal = activeQuote?.total ?? money(Math.max(0, subtotal - discountAmount));

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
    // Block past dates
    if (year < todayY) return true;
    if (year === todayY && month < todayM) return true;
    if (year === todayY && month === todayM && d < todayD) return true;
    
    // If no location selected, allow all future dates
    if (!location || isCustomLocation) return false;
    
    // If location selected but rules not loaded yet, allow all future dates temporarily
    if (timeRules.length === 0) return false;
    
    // Block dates with no time rules for selected location
    if (!Number.isNaN(selectedLocationId)) {
      const testDate = new Date(year, month, d);
      const dow = testDate.getDay();
      const hasRules = timeRules.some(
        (rule) =>
          rule.active &&
          rule.pickup_location_id === selectedLocationId &&
          rule.weekday === dow
      );
      if (!hasRules) return true;
      if (year === todayY && month === todayM && d === todayD) {
        const rules = timeRules.filter((rule) => rule.active && rule.pickup_location_id === selectedLocationId && rule.weekday === dow);
        return !buildSlotsForDate(rules, year, month, d).some((slot) => new Date(slot.pickupSlotAt).getTime() > Date.now());
      }
    }
    
    return false;
  };

  const selectedDow = day !== null ? new Date(year, month, day).getDay() : -1;
  const isCustomLocation = location === "custom";
  const selectedLocationId = !isCustomLocation && location ? parseInt(location, 10) : NaN;
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
    disabled: loadingSlots || new Date(slot.pickupSlotAt).getTime() <= Date.now() || (bookedSlotCounts[slot.pickupSlotAt] || 0) >= slot.maxPickups,
  }));

  useEffect(() => {
    if (day === null || Number.isNaN(selectedLocationId)) {
      setBookedSlotCounts({});
      return;
    }

    let cancelled = false;

    async function loadBookedSlots() {
      setLoadingSlots(true);
      // Do not let counts from the previously selected day/location mark
      // slots here as full (or leave a stale full slot enabled) if this
      // request fails.
      setBookedSlotCounts({});
      try {
        // Aggregate booked counts only — the admin-only /api/orders endpoint
        // would (correctly) 401 for customers.
        const res = await fetch(
          `/api/slots/availability?locationId=${selectedLocationId}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!cancelled) setBookedSlotCounts({});
          return;
        }
        const data = await res.json();
        const counts: Record<string, number> = isPlainObject(data)
          ? data
          : {};

        if (!cancelled) {
          setBookedSlotCounts(counts);
        }
      } catch (error) {
        console.error("Failed to load booked slots:", error);
        if (!cancelled) setBookedSlotCounts({});
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
    isValidPhone(phone) &&
    isValidEmail(email) &&
    location &&
    (isCustomLocation || (day !== null && timeWindow)) &&
    Boolean(turnstileToken) && finalTotal >= 5 && !promoLoading;

  const getMissingFields = () => {
    const missing: string[] = [];
    if (name.trim().length < 2) missing.push("name");
    if (!isValidPhone(phone)) missing.push("phone number");
    if (!isValidEmail(email)) missing.push("email");
    if (finalTotal < 5) missing.push("minimum order of $5");
    if (!location) missing.push("location");
    if (!isCustomLocation) {
      if (day === null) missing.push("date");
      if (!timeWindow) missing.push("time");
    }
    if (!turnstileToken) missing.push("verification check");
    return missing;
  };

  const missingFields = getMissingFields();
  const missingFieldsText = missingFields.length > 0
    ? `Enter ${missingFields.join(", ")} to confirm order`
    : "";

  const handleConfirm = async () => {
    if (savingRef.current) return;
    let hasError = false;
    if (!name.trim() || name.trim().length < 2) {
      setNameError(true);
      hasError = true;
    }
    if (!isValidPhone(phone)) {
      setPhoneError(true);
      hasError = true;
    }

    if (pendingOrder) hasError = false;
    if (hasError) return;

    if (!pendingOrder && !isValidEmail(email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (!pendingOrder && finalTotal < 5) {
      alert("Minimum order is $5.00. Please add more items.");
      return;
    }

    if (!turnstileToken) {
      alert("Please complete the verification check before confirming your order.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    let pendingPayload: Record<string, any> | null = null;
    try {
      const pickup_slot_at = isCustomLocation ? null : timeWindow;

      const payload = pendingOrder ? { ...pendingOrder, turnstile_token: turnstileToken } : {
        orderRef: orderId,
        customer_name: name || "",
        customer_email: email,
        customer_phone: phone,
        pickup_location_id: isCustomLocation ? null : parseInt(location) || null,
        pickup_slot_at,
        cart: cart.map((item) => ({ ...item, price: activeQuote?.items.find((v) => v.productId === item.productId && v.variantId === item.variantId)?.price ?? item.price })),
        subtotal,
        total: finalTotal,
        promo_code: appliedPromo?.code || null,
        expected_auto_free_variant: autoDiscount?.free_item?.variantId || null,
        discount_amount: discountAmount,
        notes: isCustomLocation ? `Custom location - to be negotiated via WhatsApp` : "",
        turnstile_token: turnstileToken,
      };

      pendingPayload = { ...payload, turnstile_token: null };
      sessionStorage.setItem("aquatic_emerald_pending_order", JSON.stringify(pendingPayload));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Order creation failed:", err);
        const priceQuote = res.status === 409 && err.quote;
        if (priceQuote) {
          setQuote({ ...err.quote, fingerprint });
        }
        // Ambiguous failures (network/timeout/5xx/rate limit) keep the
        // pending reference so a retry is idempotent. A definite 4xx means
        // the request was rejected, so return to the form instead of
        // trapping the customer on a retry screen that can never succeed.
        const ambiguous = res.status >= 500 || res.status === 429 || (res.status === 409 && !priceQuote);
        if (ambiguous) {
          setPendingOrder(pendingPayload);
        } else {
          sessionStorage.removeItem("aquatic_emerald_pending_order");
          setPendingOrder(null);
        }
        alert(err.error || "Failed to create order. Please try again.");
        // The Turnstile token is single-use — whether it was this request
        // that consumed it or it had simply expired, a retry needs a fresh
        // one either way.
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        return;
      }

      const result = await res.json();
      console.log("Order created successfully:", result);

      const ref = String(payload.orderRef);
      const msg = !payload.pickup_location_id
        ? `my order number is ${ref}, please confirm my order. I would like to arrange a custom pickup location and time with you.`
        : `my order number is ${ref}, please confirm my order`;
      const phoneNumber = whatsapp.replace(/\D/g, "");
      const confirmed = { orderRef: ref, total: Number(result.total), url: phoneNumber ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}` : null };
      sessionStorage.setItem("aquatic_emerald_order_confirmation", JSON.stringify(confirmed));
      sessionStorage.removeItem("aquatic_emerald_pending_order");
      setPendingOrder(null);
      setConfirmation(confirmed);
      clearCart();
    } catch (e) {
      console.error(e);
      if (pendingPayload) setPendingOrder(pendingPayload);
      alert("The order response was lost. Please retry this same order; do not start a new checkout.");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (confirmation) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center gap-4">
        <h1 className="font-serif text-3xl">Order received</h1>
        <p>Your order reference is <strong>{confirmation.orderRef}</strong>.</p>
        <p>Order total: ${confirmation.total.toFixed(2)}</p>
        {confirmation.url ? <a href={confirmation.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-primary text-primary-foreground rounded-full">Confirm on WhatsApp</a> : <p>WhatsApp is unavailable. Please contact the store with your order reference.</p>}
        <Link href="/products" className="underline" onClick={() => { sessionStorage.removeItem("aquatic_emerald_order_confirmation"); setConfirmation(null); }}>Continue shopping</Link>
      </div>
    );
  }

  if (pendingOrder) {
    const startNewOrder = () => {
      // Escape hatch for a reference the server will never let through
      // (for example a hash mismatch). Only the pending marker and local
      // reference are reset — no request is sent, so this cannot create a
      // duplicate by itself.
      try {
        sessionStorage.removeItem("aquatic_emerald_pending_order");
      } catch (error) {
        console.error("Could not clear the pending order:", error);
      }
      setPendingOrder(null);
      setTurnstileToken(null);
      setOrderId(createOrderReference());
    };

    return <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center gap-4">
      <h1 className="font-serif text-3xl">Check your order</h1>
      <p>The previous response was interrupted. Retry order <strong>{String(pendingOrder.orderRef)}</strong> to safely recover its result.</p>
      <TurnstileWidget ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} onError={() => setTurnstileToken(null)} />
      <button type="button" onClick={handleConfirm} disabled={!turnstileToken || saving} className="px-6 py-3 bg-primary text-primary-foreground rounded-full disabled:opacity-50">{saving ? "Checking…" : "Retry order"}</button>
      <p className="text-xs text-muted-foreground max-w-sm">
        If retrying keeps failing and you have not received an order confirmation, you can start a new checkout. Do not do this if your order was already confirmed.
      </p>
      <button type="button" onClick={startNewOrder} disabled={saving} className="text-sm underline text-muted-foreground disabled:opacity-50">Start a new order</button>
    </div>;
  }

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

      <div className="bg-primary/10 border border-primary/20 text-primary rounded-2xl p-4 mb-8 text-center">
        <p className="text-sm font-semibold mb-1">
          Your order reference
        </p>
        <p className="font-mono text-lg font-bold tracking-wider">{orderId}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-4">
            Order summary
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
                  ${((activeQuote?.items.find((v) => v.productId === item.productId && v.variantId === item.variantId)?.price ?? item.price) * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Automatic discount — evaluated from the cart itself, no code
              needed. Shown here so what the customer sees before submitting
              matches what the cart page already promised them (previously
              this never appeared anywhere in checkout at all). */}
          {autoDiscount && (
            <div className="mb-4 pb-4 border-b border-border">
              <div className="bg-primary/10 border border-primary/25 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-primary">
                  {autoDiscount.name}
                </p>
                {autoDiscount.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {autoDiscount.description}
                  </p>
                )}
                {autoDiscount.free_item ? (
                  <p className="text-xs text-primary mt-1 font-medium">
                    Includes free: {autoDiscount.free_item.productName}
                  </p>
                ) : autoDiscount.discount_amount > 0 ? (
                  <p className="text-xs text-primary mt-1 font-medium">
                    ${autoDiscount.discount_amount.toFixed(2)} off
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Promo Code Input */}
          {!hasPromoCodes && !appliedPromo && !promoError ? null : !appliedPromo ? (
            <div className="mb-4 pb-4 border-b border-border">
              <label className="text-xs font-medium mb-2 block">Promo Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                />
                <button
                  onClick={() => handleApplyPromo()}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-red-500 mt-1">{promoError}</p>
              )}
            </div>
          ) : (
            <div className="mb-4 pb-4 border-b border-border">
              <div className="flex items-center justify-between bg-primary/10 border border-primary/25 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-primary">
                    {appliedPromo.code} applied
                  </p>
                  {appliedPromo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appliedPromo.description}
                    </p>
                  )}
                  {appliedPromo.free_item && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      Includes free: {appliedPromo.free_item.productName}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>
                  Discount
                  {autoDiscountAmount > 0 && promoDiscountAmount > 0 ? " (auto + promo)" : autoDiscountAmount > 0 ? " (auto)" : ""}
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-3 mt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">${finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-4">
            Your details
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="checkout-phone" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
              </label>
              <input
                id="checkout-phone"
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
              <label htmlFor="checkout-email" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email
              </label>
              <input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
            <div>
              <label htmlFor="checkout-name" className="flex items-center gap-2 text-sm font-medium mb-2">
                <User className="w-4 h-4 text-muted-foreground" /> Name *
              </label>
              <input
                id="checkout-name"
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
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Pickup location
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
            <button
              onClick={() => {
                setLocation("custom");
                setTimeWindow("");
                setDay(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm transition-all text-left cursor-pointer ${location === "custom" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${location === "custom" ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
              >
                {location === "custom" && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">Custom Location</p>
                <p className="text-xs text-muted-foreground font-light mt-0.5">
                  Negotiate pickup location via WhatsApp
                </p>
              </div>
            </button>
          </div>
        </div>

        {!isCustomLocation && (
          <>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Pickup date
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
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Pickup time
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
        </>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-center mb-4">
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className={`w-full py-5 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 ${
              canConfirm && !saving
                ? "bg-primary hover:opacity-90 text-primary-foreground cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            } ${saving ? "opacity-75" : ""}`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : canConfirm ? (
              <>
                <MessageCircle className="w-5 h-5" />
                <span>Confirm & Message on WhatsApp</span>
              </>
            ) : (
              <span className="capitalize">{missingFieldsText}</span>
            )}
          </button>
          {canConfirm && (
            <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed font-light">
              After placing your order, use the confirmation link to message us on WhatsApp.
              Your order is confirmed once the seller responds.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
