"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  Settings,
  MessageSquare,
  Mail,
  Boxes,
  Package,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  STOCK_LEVELS,
  STOCK_LEVEL_LABELS,
  STOCK_LEVEL_SETTINGS_KEYS,
  DEFAULT_STOCK_LIMITS,
  type StockLevel,
} from "@/lib/stockLimits";
import SellerPhoneInput from "./SellerPhoneInput";

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

/**
 * Rows in a group sit a few pixels apart, so the corners that touch each other
 * use a smaller radius than the outer ones — the stack reads as one block
 * instead of a pile of separate cards.
 */
type RowPosition = "single" | "first" | "middle" | "last";

const CORNER_CLASSES: Record<RowPosition, string> = {
  single: "rounded-2xl",
  first: "rounded-t-2xl rounded-b-md",
  middle: "rounded-md",
  last: "rounded-t-md rounded-b-2xl",
};

function rowPositions(count: number): RowPosition[] {
  if (count <= 1) return ["single"];
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return "first";
    if (index === count - 1) return "last";
    return "middle";
  });
}

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
  position = "single",
  children,
}: {
  Icon: typeof MessageSquare;
  title: string;
  description: string;
  position?: RowPosition;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-4 bg-card border border-border px-4 py-3.5 hover:border-primary/30 transition-colors ${CORNER_CLASSES[position]}`}
    >
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

type TestResult = { ok: boolean; message: string };

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileHealth, setTurnstileHealth] = useState<{ siteKeyConfigured: boolean; secretKeyConfigured: boolean } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingTurnstile, setTestingTurnstile] = useState(false);

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
      const response = await fetch("/api/settings", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        // The session guard in the admin layout shows the signed-out screen;
        // don't overwrite real settings with defaults in the meantime.
        setLoaded(false);
        setLoadFailed(true);
        return;
      }
      if (!response.ok) {
        throw new Error(`Settings request failed (${response.status})`);
      }
      const data = await response.json();
      setTurnstileHealth(data.turnstile_health || null);

      const loadedWhatsapp = String(data.seller_whatsapp || "").replace(/\D/g, "");
      const loadedEmail = String(data.seller_email || "").trim();
      const loadedStock = {} as Record<StockLevel, string>;
      STOCK_LEVELS.forEach((level) => {
        const settingsKey = STOCK_LEVEL_SETTINGS_KEYS[level];
        loadedStock[level] =
          data[settingsKey] !== undefined
            ? String(data[settingsKey])
            : String(DEFAULT_STOCK_LIMITS[level]);
      });

      setWhatsapp(loadedWhatsapp);
      setEmail(loadedEmail);
      setMaxQtyByLevel(loadedStock);

      // Record what is stored right now, so autosave only fires for real edits.
      persisted.current = JSON.stringify({
        seller_whatsapp: loadedWhatsapp,
        seller_email: loadedEmail,
        ...Object.fromEntries(
          STOCK_LEVELS.map((level) => [
            STOCK_LEVEL_SETTINGS_KEYS[level],
            level === "none"
              ? "0"
              : String(Math.max(0, parseInt(loadedStock[level], 10) || 0)),
          ]),
        ),
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

  // Exactly what a save would write, as one comparable string. Autosave only
  // fires when this differs from what is already in the database, so a slow
  // load (or React re-running effects in dev) can never write placeholder
  // values over the store's real settings.
  const settingsSnapshot = () =>
    JSON.stringify({
      seller_whatsapp: whatsapp.replace(/\D/g, ""),
      seller_email: email.trim(),
      ...Object.fromEntries(
        STOCK_LEVELS.map((level) => [
          STOCK_LEVEL_SETTINGS_KEYS[level],
          level === "none"
            ? "0"
            : String(Math.max(0, parseInt(maxQtyByLevel[level], 10) || 0)),
        ]),
      ),
    });

  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  /** The settings currently stored server-side (last successful load/save). */
  const persisted = useRef<string | null>(null);

  const saveSettings = async (version: number, snapshot: string) => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: snapshot,
      });

      if (response.status === 401) {
        // Expired session: the guard takes the admin back to the login screen
        // rather than this page quietly claiming the change was saved.
        if (version === saveVersion.current) setSaveState("error");
        return;
      }

      if (response.ok) {
        persisted.current = snapshot;
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
  useEffect(() => {
    if (loading || !loaded) return;
    const snapshot = settingsSnapshot();
    if (snapshot === persisted.current) return;
    const version = ++saveVersion.current;
    setSaveState("saving");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(() =>
        saveSettings(version, snapshot),
      );
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsapp, email, maxQtyByLevel, loading, loaded]);

  const runTurnstileTest = async () => {
    setTestingTurnstile(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/settings/turnstile-test", {
        method: "POST",
        credentials: "same-origin",
      });
      if (response.status === 401) return;
      const data = await response.json().catch(() => null);
      if (!data) {
        setTestResult({ ok: false, message: "The test endpoint returned an unreadable response." });
        return;
      }
      setTestResult({ ok: Boolean(data.ok), message: String(data.message || "") });
    } catch (error) {
      console.error("Turnstile test failed:", error);
      setTestResult({ ok: false, message: "The test request could not be completed." });
    } finally {
      setTestingTurnstile(false);
    }
  };

  const keysPresent =
    turnstileHealth?.siteKeyConfigured && turnstileHealth?.secretKeyConfigured;

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

  const contactPositions = rowPositions(2);
  const stockPositions = rowPositions(STOCK_LEVELS.length);

  return (
    <div className="space-y-8 max-w-3xl w-full mx-auto">
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
        <div className="space-y-1">
          <SettingRow
            Icon={MessageSquare}
            title="Seller WhatsApp Number"
            description='Used for the "Message on WhatsApp" button after checkout. Type the country code first — the flag shows the country detected.'
            position={contactPositions[0]}
          >
            <SellerPhoneInput
              id="seller-whatsapp"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="61400000000"
              className="w-52"
            />
          </SettingRow>
          <SettingRow
            Icon={Mail}
            title="Seller Email Address"
            description="Order confirmation receipts are carbon-copied to this address automatically."
            position={contactPositions[1]}
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
      </div>

      <div className="space-y-3">
        <SectionHeader
          Icon={ShieldCheck}
          title="Bot Protection (Turnstile)"
          description="Cloudflare verifies checkout and contact submissions"
        />
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {turnstileHealth
                ? keysPresent
                  ? "Both keys are present."
                  : "Missing site key or secret key; checkout and contact verification will fail."
                : "Unable to check configuration."}
            </p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              Key presence alone proves nothing — the test asks Cloudflare whether it accepts these keys.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void runTurnstileTest()}
                disabled={testingTurnstile}
                className="cursor-pointer"
              >
                {testingTurnstile ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Test configuration
              </Button>
            </div>
            {testResult && (
              <div
                role="status"
                className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                  testResult.ok
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-px" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
          <img
            src="/cloudflare-logo.png"
            alt="Cloudflare"
            className="h-7 w-auto shrink-0 self-start sm:self-center opacity-90"
          />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader
          Icon={Boxes}
          title="Stock Ordering Limits"
          description="Maximum quantity a customer can order of a variant, based on its manually-set stock level"
        />
        <div className="space-y-1">
          {STOCK_LEVELS.map((level, index) => (
            <SettingRow
              key={level}
              Icon={Package}
              title={`${STOCK_LEVEL_LABELS[level]} stock`}
              description={LEVEL_DESCRIPTIONS[level]}
              position={stockPositions[index]}
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
    </div>
  );
}
