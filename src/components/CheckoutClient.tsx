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
  getTimeWindows
} from "@/lib/staticData";
import { ArrowLeft, Phone, User, MapPin, Calendar, Clock, Check, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CheckoutClientProps {
  locations: PickupLocation[];
  hours: PickupHour[];
  whatsapp: string;
}

export default function CheckoutClient({ locations, hours, whatsapp }: CheckoutClientProps) {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState(todayY);
  const [month, setMonth] = useState(todayM);
  const [day, setDay] = useState<number | null>(null);
  const [timeWindow, setTimeWindow] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Generate unique order number when the checkout component mounts
  useEffect(() => {
    const generate22CharId = () => {
      // "AE-XXXX-XXXX-XXXX-XXXX" is exactly 22 characters long
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

  // Available months: current + next 5 months
  const availableMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(todayY, todayM + i, 1);
    return { 
      year: d.getFullYear(), 
      month: d.getMonth(), 
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` 
    };
  });

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m); 
    setYear(y); 
    setDay(null); 
    setTimeWindow("");
  };

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const isDayDisabled = (d: number) => {
    if (year < todayY) return true;
    if (year === todayY && month < todayM) return true;
    if (year === todayY && month === todayM && d < todayD) return true;
    return false;
  };

  const selectedDow = day !== null ? new Date(year, month, day).getDay() : -1;
  const timeWindows = day !== null ? getTimeWindows(selectedDow) : [];

  // Map hours list from database/fallback to descriptions
  const getDowLabel = () => {
    if (selectedDow === 6) {
      const satHour = hours.find(h => h.dayRange.toLowerCase().includes("sat"));
      return `Saturday: ${satHour ? satHour.timeRange : "11:00 am – 6:00 pm"}`;
    }
    if (selectedDow === 0) {
      const sunHour = hours.find(h => h.dayRange.toLowerCase().includes("sun"));
      return `Sunday: ${sunHour ? sunHour.timeRange : "1:00 pm – 6:00 pm"}`;
    }
    const weekdayHour = hours.find(h => h.dayRange.toLowerCase().includes("week") || h.dayRange.toLowerCase().includes("mon"));
    return `Weekday: ${weekdayHour ? weekdayHour.timeRange : "4:30 pm – 7:00 pm"}`;
  };

  const canConfirm = phone.trim().length >= 8 && location && day !== null && timeWindow;

  const handleConfirm = () => {
    if (!phone.trim() || phone.trim().length < 8) {
      setPhoneError(true);
      return;
    }

    // Build exactly the requested short WhatsApp message structure
    const msg = `my order number is ${orderId}, please confirm my order`;
    
    // Open WhatsApp link
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    
    // Clear shopping cart since request has been successfully submitted
    clearCart();
    
    // Re-route to Home
    router.push("/");
  };

  if (cart.length === 0) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center">
        <p className="text-muted-foreground mb-4 font-serif text-lg">No items in cart.</p>
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

      <h1 className="font-serif text-4xl font-medium mb-2">Pickup Confirmation</h1>
      <p className="text-muted-foreground text-sm mb-6 font-light">
        Fill in your details and choose a pickup slot. {"You'll"} then message us on WhatsApp to confirm.
      </p>

      {/* Visual Display of generated Order ID */}
      <div className="bg-emerald-600/10 border border-emerald-600/20 text-emerald-800 dark:text-emerald-300 rounded-2xl p-4 mb-8 text-center">
        <p className="text-xs uppercase tracking-widest font-semibold mb-1">Your Unique Order Reference</p>
        <p className="font-mono text-lg font-bold tracking-wider">{orderId}</p>
      </div>

      <div className="space-y-6">
        {/* Order summary */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Order Summary
          </p>
          <div className="space-y-2 mb-4">
            {cart.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-light">
                  {item.qty}× {item.name}
                  <span className="text-xs ml-1 font-normal">({item.variantLabel})</span>
                </span>
                <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Contact Input Form */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Your Details
          </p>
          <div className="space-y-4">
            <div>
              {/* REMOVED '* required' visual tag but still programmatically mandatory */}
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { 
                  setPhone(e.target.value); 
                  setPhoneError(false); 
                }}
                placeholder="04XX XXX XXX"
                className={`w-full px-4 py-3 rounded-xl bg-secondary border text-sm outline-none focus:ring-2 focus:ring-ring transition
                  ${phoneError ? "border-red-500" : "border-border focus:border-primary"}`}
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid phone number (min 8 digits).</p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Name
                <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
          </div>
        </div>

        {/* Pickup Location Selector */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Pickup Location
          </p>
          <div className="space-y-2">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setLocation(loc.name)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm transition-all text-left cursor-pointer
                  ${location === loc.name ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                  ${location === loc.name ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                  {location === loc.name && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium">{loc.name}</p>
                  {loc.detail && <p className="text-xs text-muted-foreground font-light mt-0.5">{loc.detail}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Picker */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Pickup Date
          </p>

          {/* Month selector */}
          <div className="flex gap-2 flex-wrap mb-5">
            {availableMonths.map((m) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => handleMonthChange(m.month, m.year)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer
                  ${month === m.month && year === m.year
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT.map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground py-1.5 font-semibold uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
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
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all cursor-pointer
                      ${disabled ? "text-muted-foreground/25 cursor-not-allowed" : ""}
                      ${selected ? "bg-primary text-primary-foreground font-semibold shadow-sm" : ""}
                      ${!disabled && !selected ? "hover:bg-accent font-medium" : ""}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time windows */}
        <AnimatePresence>
          {day !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Pickup Time
              </p>
              <p className="text-xs text-muted-foreground mb-4 font-light">
                {getDowLabel()} · 30-minute windows
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeWindows.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => setTimeWindow(tw)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer
                      ${timeWindow === tw ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    {tw}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finalize Orders triggers */}
        <AnimatePresence>
          {canConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <button
                onClick={handleConfirm}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                Confirm &amp; Message on WhatsApp
              </button>
              <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed font-light">
                This opens WhatsApp with your order reference number pre-filled. Your order is confirmed once the seller responds.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
