"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Mail, Trash2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: number;
  email: string;
  message: string;
  created_at: string;
}

export default function MessagesPageClient() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact-submissions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Delete message from ${email}?`)) return;
    try {
      const res = await fetch(`/api/contact-submissions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Message deleted");
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (expandedId === id) setExpandedId(null);
      } else {
        toast.error("Failed to delete message");
      }
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse font-light">
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Contact Messages</h1>
          <p className="text-muted-foreground text-sm font-light">
            {submissions.length === 0
              ? "No messages yet"
              : `${submissions.length} message${submissions.length !== 1 ? "s" : ""} received`}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 cursor-pointer"
          onClick={fetchSubmissions}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl flex flex-col items-center justify-center">
          <Mail className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm font-serif font-light">
            No contact form submissions yet.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          {submissions.map((s, idx) => {
            const isExpanded = expandedId === s.id;
            const preview = s.message.replace(/\n/g, " ").slice(0, 80);
            return (
              <div
                key={s.id}
                className={`${idx !== 0 ? "border-t border-border" : ""}`}
              >
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  <div className="flex-shrink-0 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-sm">{s.email}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground font-light truncate mt-0.5">
                        {preview}{s.message.length > 80 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://mail.google.com/mail/u/0/?fs=1&to=${encodeURIComponent(s.email)}&tf=cm`, "_blank");
                    }}
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id, s.email);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Expanded message */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-border/50 bg-muted/20">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-light">
                      {s.message}
                    </p>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
