"use client";

import { useState } from "react";
import { loginAdmin } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
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
  const router = useRouter();

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
            Enter your password to access the dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 py-6">
            <div className="space-y-4">
              <Input
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
          <CardFooter className="pb-8">
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
