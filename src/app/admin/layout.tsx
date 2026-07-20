import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { sanitizeEnv } from "@/lib/env";
import { Button } from "@/app/components/ui/button";
import { LogOut, Package, MapPin, Settings, FolderTree, ShoppingCart, BookOpen, Clock, CircleHelp, Percent } from "lucide-react";
import Link from "next/link";
import { logoutAdmin } from "@/app/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const secretStr = sanitizeEnv(process.env.JWT_SECRET);
    if (!secretStr) throw new Error("JWT_SECRET missing");
    const secret = new TextEncoder().encode(secretStr);
    await jwtVerify(token, secret);
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col sm:flex-row">
      {}
      <aside className="w-full sm:w-64 bg-card border-r border-border p-6 flex flex-col h-screen sticky top-0">
        <Link href="/" className="flex items-center gap-2 group mb-8">
          <img
            src="/logo.png"
            alt="Aquatic Emerald Logo"
            className="w-6 h-6 object-contain group-hover:scale-110 transition-transform"
          />
          <span className="font-serif text-xl font-medium">
            Aquatic Emerald
          </span>
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Package className="w-4 h-4 text-foreground" /> Products
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-foreground" /> Orders
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <FolderTree className="w-4 h-4 text-foreground" /> Categories
          </Link>
          <Link
            href="/admin/locations"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4 text-foreground" /> Locations
          </Link>
          <Link
            href="/admin/times"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4 text-foreground" /> Times
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4 text-foreground" /> Settings
          </Link>
          <Link
            href="/admin/guides"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4 text-foreground" /> Care Guides
          </Link>
          <Link
            href="/admin/faq"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <CircleHelp className="w-4 h-4 text-foreground" /> FAQ
          </Link>
          <Link
            href="/admin/promo"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Percent className="w-4 h-4 text-foreground" /> Promotions
          </Link>
        </nav>
        <div className="pt-4 border-t border-border">
          <form action={logoutAdmin}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </form>
        </div>
      </aside>

      {}
      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  );
}
