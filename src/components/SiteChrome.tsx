"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function SiteChrome({
  whatsapp,
  children,
}: {
  whatsapp?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The admin panel (and its login screen) is a self-contained shell — no
  // public footer, and no need for the top padding that exists elsewhere
  // only to clear the public navbar's fixed height (see Navbar.tsx, which
  // hides itself on these same routes).
  const isAdminShell = pathname?.startsWith("/admin") || pathname?.startsWith("/login");

  if (isAdminShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow pt-16">{children}</div>
      <Footer whatsapp={whatsapp} />
    </div>
  );
}
