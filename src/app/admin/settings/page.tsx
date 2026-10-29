"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/app/components/ui/input";
import {
  Settings,
  MessageSquare,
  Mail,
  Boxes,
  Package,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  STOCK_LEVELS,
  STOCK_LEVEL_LABELS,
  STOCK_LEVEL_SETTINGS_KEYS,
  DEFAULT_STOCK_LIMITS,
  type StockLevel,
} from "@/lib/stockLimits";

const LEVEL_DESCRIPTIONS: Record<StockLevel, string> = {
  none: "Forced to 0 — customers cannot order.",
  single: "Max quantity a customer can order when only a single unit remains.",
  very_low: "Max quantity a customer can order for a very-low-stock variant.",
  low: "Max quantity a customer can order for a low-stock variant.",
  medium: "Max quantity a customer can order for a medium-stock variant.",
  high: "Max quantity a customer can order for a high-stock variant.",
  very_high: "Max quantity a customer can order for a very-high-stock variant.",
};

type SaveState = "idle" | "saving" | "saved" | "error";

function SectionHeader({
  Icon,
  title,
  description,
}: {
  Icon: typeof Boxes;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground font-light">{description}</p>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  Icon,
  title,
  description,
  children,
}: {
  Icon: typeof MessageSquare;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-3.5 hover:border-primary/30 transition-colors">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground font-light">{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileHealth, setTurnstileHealth] = useState<{ siteKeyConfigured: boolean; secretKeyConfigured: boolean } | null>(null);

  // One quantity field per stock level, keyed by the level itself.
  const [maxQtyByLevel, setMaxQtyByLevel] = useState<Record<StockLevel, string>>(
    () => {
      const initial = {} as Record<StockLevel, string>;
      STOCK_LEVELS.forEach((level) => {
        initial[level] = String(DEFAULT_STOCK_LIMITS[level]);
      });
      return initial;
    },
  );

  const loadSettings = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error(`Settings request failed (${response.status})`);
      }
      const data = await response.json();
      setTurnstileHealth(data.turnstile_health || null);
      if (data.seller_whatsapp) setWhatsapp(data.seller_whatsapp);
      if (data.seller_email) setEmail(data.seller_email);

      setMaxQtyByLevel((prev) => {
        const next = { ...prev };
        STOCK_LEVELS.forEach((level) => {
          const settingsKey = STOCK_LEVEL_SETTINGS_KEYS[level];
          if (data[settingsKey] !== undefined) {
            next[level] = String(data[settingsKey]);
          }
        });
        return next;
      });
      setLoaded(true);
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Never let autosave run against the default form values: a failed
      // load used to leave empty/default fields that the next keystroke
      // would happily write over the real settings.
      setLoaded(false);
      setLoadFailed(true);
      toast.error("Failed to load settings from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const saveSettings = async (version: number) => {
    setSaveState("saving");
    try {
      const stockLimitPayload: Record<string, string> = {};
      STOCK_LEVELS.forEach((level) => {
        const settingsKey = STOCK_LEVEL_SETTINGS_KEYS[level];
        stockLimitPayload[settingsKey] =
          level === "none"
            ? "0"
            : String(Math.max(0, parseInt(maxQtyByLevel[level], 10) || 0));
      });

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_whatsapp: whatsapp.replace(/\D/g, ""),
          seller_email: email.trim(),
          ...stockLimitPayload,
        }),
      });

      if (response.ok) {
        if (version === saveVersion.current) setSaveState("saved");
      } else {
        if (version === saveVersion.current) setSaveState("error");
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      if (version === saveVersion.current) setSaveState("error");
      toast.error("An error occurred while saving settings");
    }
  };

  // Autosave: every change is written shortly after you stop typing.
  const skipFirstChange = useRef(true);
  useEffect(() => {
    if (loading || !loaded) return;
    if (skipFirstChange.current) {
      skipFirstChange.current = false;
      return;
    }
    const version = ++saveVersion.current;
    setSaveState("saving");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(() => saveSettings(version));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsapp, email, maxQtyByLevel, loading, loaded]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-muted-foreground text-sm font-light">
          Loading configurations...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight">
              Store Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Global configurations for your shop — changes save automatically
            </p>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            loadFailed
              ? "bg-destructive/10 text-destructive"
              : saveState === "saving"
                ? "bg-secondary text-secondary-foreground"
                : saveState === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/15 text-primary"
          }`}
        >
          {loadFailed ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" /> Settings unavailable
            </>
          ) : saveState === "saving" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
            </>
          ) : saveState === "error" ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" /> Save failed
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" /> All changes saved
            </>
          )}
        </div>
      </div>

      {loadFailed && (
        <div className="flex items-center justify-between gap-4 bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3 text-sm text-destructive">
          <span>
            Settings could not be loaded, so autosave is disabled to avoid
            overwriting the store&apos;s real values with defaults.
          </span>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold cursor-pointer"
          >
            Retry load
          </button>
        </div>
      )}

      <div className="space-y-3">
        <SectionHeader
          Icon={MessageSquare}
          title="Contact & Communication"
          description="Where order messages and receipts are sent"
        />
        <SettingRow
          Icon={MessageSquare}
          title="Seller WhatsApp Number"
          description='Used for the "Message on WhatsApp" button after checkout. Include country code without "+" or spaces.'
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 h-9 rounded-l-md border border-input bg-muted text-muted-foreground text-sm">
              +
            </span>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="61400000000"
              className="w-44 rounded-l-none"
            />
          </div>
        </SettingRow>
        <SettingRow
          Icon={Mail}
          title="Seller Email Address"
          description="Order confirmation receipts are carbon-copied to this address automatically."
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seller@example.com"
            className="w-56"
          />
        </SettingRow>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 text-sm">
        <strong>Turnstile configuration:</strong>{" "}
        {turnstileHealth ? (turnstileHealth.siteKeyConfigured && turnstileHealth.secretKeyConfigured ? "Both keys are present." : "Missing site key or secret key; checkout and contact verification will fail.") : "Unable to check configuration."}
        <p className="text-xs text-muted-foreground mt-1">Key presence only; this does not test whether the keys match or the service is reachable.</p>
      </div>

      <div className="space-y-3">
        <SectionHeader
          Icon={Boxes}
          title="Stock Ordering Limits"
          description="Maximum quantity a customer can order of a variant, based on its manually-set stock level"
        />
        {STOCK_LEVELS.map((level) => (
          <SettingRow
            key={level}
            Icon={Package}
            title={`${STOCK_LEVEL_LABELS[level]} stock`}
            description={LEVEL_DESCRIPTIONS[level]}
          >
            <Input
              type="number"
              min="0"
              value={maxQtyByLevel[level]}
              onChange={(e) =>
                setMaxQtyByLevel((prev) => ({
                  ...prev,
                  [level]: e.target.value,
                }))
              }
              disabled={level === "none"}
              className="w-20 text-center"
            />
          </SettingRow>
        ))}
      </div>
    </div>
  );
}
