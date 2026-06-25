"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { ShoppingCart, ChevronDown, Sun, Moon, X, Menu } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Category } from "@/lib/staticData";
import { getLucideIconByName } from "@/lib/lucideIcon";

export default function Navbar() {
  const { cartCount } = useCart();
  const { dark, toggleDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [dropOpen, setDropOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<
    { slug: string; name: string; icon_name?: string; image_url?: string }[]
  >([
    { slug: "plants", name: "Plants", icon_name: "sprout" },
    { slug: "shrimp", name: "Shrimp", icon_name: "shrimp" },
    { slug: "snails", name: "Snails", icon_name: "shell" },
    { slug: "fish", name: "Fish", icon_name: "fish" },
  ]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          const activeCats = data
            .filter((c: any) => c.active)
            .map((c: any) => ({
              slug: c.slug,
              name: c.name,
              icon_name: c.icon_name || "package",
              image_url: c.image_url,
            }));
          if (activeCats.length > 0) {
            setCategories(activeCats);
          }
        }
      } catch (err) {
        console.error("Failed to load categories in navbar:", err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(event.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleCategoryClick = (cat: string) => {
    router.push(`/products?category=${cat}`);
    setDropOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="Aquatic Emerald Logo"
            className="w-8 h-8 object-contain group-hover:scale-[1.08] transition-transform"
          />
          <span className="font-serif text-[17px] font-medium tracking-tight">
            Aquatic{" "}
            <em className="not-italic text-primary font-semibold">Emerald</em>
          </span>
        </Link>

        {}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>

          {}
          <div
            ref={dropRef}
            className="relative"
            onMouseEnter={() => setDropOpen(true)}
            onMouseLeave={() => setDropOpen(false)}
          >
            <Link
              href="/products"
              className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith("/products")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Products
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  dropOpen ? "rotate-180" : ""
                }`}
              />
            </Link>
            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-44 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={() => handleCategoryClick("all")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left font-medium cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-primary">
                      All
                    </span>
                    <span>All</span>
                  </button>
                  {categories.map((c) => {
                    const IconComp = getLucideIconByName(c.icon_name) as any;
                    return (
                      <button
                        key={c.slug}
                        onClick={() => handleCategoryClick(c.slug)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left font-medium cursor-pointer"
                      >
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="w-4 h-4 object-contain rounded-sm"
                          />
                        ) : (
                          <IconComp className="w-4 h-4 text-primary" />
                        )}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/info"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/info" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Info
          </Link>

          <Link
            href="/guides"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/guides" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Guides
          </Link>

          <Link
            href="/faq"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/faq" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            FAQ
          </Link>
        </div>

        {}
        <div className="flex items-center gap-2">
          {}
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {dark ? (
              <Sun className="w-4 h-4 text-primary" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>

          {}
          <Link
            href="/cart"
            className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="w-4 h-4 text-primary" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold leading-none">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-primary" />
            ) : (
              <Menu className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>
      </div>

      {}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3"
          >
            <Link
              href="/"
              className={`block text-sm font-medium py-2 px-3 rounded-lg hover:bg-accent ${
                pathname === "/"
                  ? "text-primary bg-primary/5"
                  : "text-foreground"
              }`}
            >
              Home
            </Link>

            <div className="py-2 px-3">
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Products
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/products"
                  className={`text-sm py-1.5 px-2 rounded-lg hover:bg-accent ${
                    pathname === "/products"
                      ? "text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  All Products
                </Link>
                {categories.map((c) => {
                  const IconComp = getLucideIconByName(c.icon_name) as any;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => handleCategoryClick(c.slug)}
                      className="text-sm py-1.5 px-2 rounded-lg hover:bg-accent text-left text-foreground font-normal flex items-center gap-2 cursor-pointer"
                    >
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className="w-3.5 h-3.5 object-contain rounded-sm"
                        />
                      ) : (
                        <IconComp className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Link
              href="/info"
              className={`block text-sm font-medium py-2 px-3 rounded-lg hover:bg-accent ${
                pathname === "/info"
                  ? "text-primary bg-primary/5"
                  : "text-foreground"
              }`}
            >
              Info & Guides
            </Link>

            <Link
              href="/faq"
              className={`block text-sm font-medium py-2 px-3 rounded-lg hover:bg-accent ${
                pathname === "/faq"
                  ? "text-primary bg-primary/5"
                  : "text-foreground"
              }`}
            >
              FAQ
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
