"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { ShoppingCart, ChevronDown, Sun, Moon, Leaf, X, Menu } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Category } from "@/lib/staticData";

export default function Navbar() {
  const { cartCount } = useCart();
  const { dark, toggleDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [dropOpen, setDropOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const categories: { cat: Category; emoji: string; label: string }[] = [
    { cat: "plants", emoji: "🌿", label: "Plants" },
    { cat: "shrimp", emoji: "🦐", label: "Shrimp" },
    { cat: "snails", emoji: "🐌", label: "Snails" },
    { cat: "fish",   emoji: "🐟", label: "Fish" },
  ];

  // Close dropdown on click outside
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

  // Close mobile menu on page transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleCategoryClick = (cat: Category) => {
    router.push(`/products?category=${cat}`);
    setDropOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-[17px] font-medium tracking-tight">
            Aquatic <em className="not-italic text-primary font-semibold">Emerald</em>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>

          {/* Products Dropdown */}
          <div
            ref={dropRef}
            className="relative"
            onMouseEnter={() => setDropOpen(true)}
            onMouseLeave={() => setDropOpen(false)}
          >
            <Link
              href="/products"
              className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith("/products") ? "text-primary" : "text-muted-foreground"
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
                  {categories.map((c) => (
                    <button
                      key={c.cat}
                      onClick={() => handleCategoryClick(c.cat)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left font-medium"
                    >
                      <span className="text-base">{c.emoji}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
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
            Info & Guides
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
          </button>

          {/* Cart */}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-primary" /> : <Menu className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu drawer */}
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
                pathname === "/" ? "text-primary bg-primary/5" : "text-foreground"
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
                    pathname === "/products" ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  All Products
                </Link>
                {categories.map((c) => (
                  <button
                    key={c.cat}
                    onClick={() => handleCategoryClick(c.cat)}
                    className="text-sm py-1.5 px-2 rounded-lg hover:bg-accent text-left text-foreground font-normal"
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/info"
              className={`block text-sm font-medium py-2 px-3 rounded-lg hover:bg-accent ${
                pathname === "/info" ? "text-primary bg-primary/5" : "text-foreground"
              }`}
            >
              Info & Guides
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
