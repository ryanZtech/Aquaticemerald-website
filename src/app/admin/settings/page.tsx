"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/app/components/ui/card";
import { MessageSquare, Mail, Save, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("ryan.zhao254@gmail.com");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.seller_whatsapp) setWhatsapp(data.seller_whatsapp);
          if (data.seller_email) setEmail(data.seller_email);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings from database");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_whatsapp: whatsapp.replace(/\D/g, ""), // strip non-numeric
          seller_email: email.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-muted-foreground text-sm font-light">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl font-medium">Store Settings</h1>
        <p className="text-muted-foreground text-sm">Global configurations for your shop</p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Contact & Communication</CardTitle>
            </div>
            <CardDescription>
              Configure the seller coordinates used for WhatsApp messaging and order receipt notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Seller WhatsApp Number
              </label>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 rounded-md border border-input bg-muted text-muted-foreground text-sm">
                  +
                </span>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="61468766892"
                  className="flex-1"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for the "Message on WhatsApp" button after checkout. Include country code without "+" or spaces.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Seller Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ryan.zhao254@gmail.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Order confirmation receipts will be carbon-copied to this address automatically.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex justify-end p-4">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
