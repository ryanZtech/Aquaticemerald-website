import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { sanitizeEnv } from "@/lib/env";
import { Button } from "@/app/components/ui/button";
import { LogOut, Package, MapPin, Settings, FolderTree, ShoppingCart, BookOpen, Clock, CircleHelp, Percent, MessageSquare } from "lucide-react";
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

        <nav className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
          <Link
            href="/admin"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Package className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Products
          </Link>
          <Link
            href="/admin/orders"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Orders
          </Link>
          <Link
            href="/admin/messages"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Messages
          </Link>
          <Link
            href="/admin/categories"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <FolderTree className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Categories
          </Link>
          <Link
            href="/admin/locations"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Locations
          </Link>
          <Link
            href="/admin/times"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Times
          </Link>
          <Link
            href="/admin/settings"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Settings
          </Link>
          <Link
            href="/admin/guides"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Care Guides
          </Link>
          <Link
            href="/admin/faq"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <CircleHelp className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> FAQ
          </Link>
          <Link
            href="/admin/promo"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            <Percent className="w-4 h-4 text-foreground transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:-rotate-6" /> Promotions
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
