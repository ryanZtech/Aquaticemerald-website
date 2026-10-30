"use client";

import { useEffect, useState } from "react";
import { loginAdmin } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const router = useRouter();

  // The session guard and the admin layout both send admins here with
  // ?expired=1 so it is obvious why they are suddenly back at the login form.
  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAdmin(formData);

    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Aquatic Emerald Logo" className="w-12 h-12 object-contain" />
          </div>
          <CardTitle className="font-serif text-2xl">Admin Login</CardTitle>
          <CardDescription>
            {expired
              ? "Your admin session ended. Sign in again to continue."
              : "Enter your password to access the dashboard"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 py-6">
            {expired && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  You were signed out because the panel sat idle for too long.
                </span>
              </div>
            )}
            <div className="space-y-4">
              <label htmlFor="admin-password" className="block text-sm font-medium">Password</label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                placeholder="Admin Password"
                required
                className="font-sans h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium text-center">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="pb-8 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Login"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground gap-2"
              asChild
            >
              <Link href="/"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
