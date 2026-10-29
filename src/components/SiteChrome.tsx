"use client";

import { useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  // The admin panel (and its login screen) is a self-contained shell — no
  // public footer, and no need for the top padding that exists elsewhere
  // only to clear the public navbar's fixed height (see Navbar.tsx, which
  // hides itself on these same routes).
  const isAdminShell = pathname?.startsWith("/admin") || pathname?.startsWith("/login");

  // The site scrolls inside its own container (below the fixed navbar), so
  // client-side navigation needs to reset that container rather than window.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (isAdminShell) {
    return <>{children}</>;
  }

  return (
    <div className="h-dvh pt-16">
      {/* Starts below the navbar, so the scrollbar begins there too. */}
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="flex flex-col min-h-full">
          <div className="flex-grow">{children}</div>
          <Footer whatsapp={whatsapp} />
        </div>
      </div>
    </div>
  );
}
