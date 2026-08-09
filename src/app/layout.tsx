import "@/styles/index.css";
import Navbar from "@/components/Navbar";
import SiteChrome from "@/components/SiteChrome";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { getSellerWhatsApp } from "@/lib/dataService";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aquatic Emerald",
  description:
    "Curated home-grown freshwater botanicals, shrimp, and snails for the discerning aquarium hobbyist in Sydney Hills District.",
  keywords:
    "aquarium plants, freshwater shrimp, bloody mary shrimp, trumpet snails, Hills District, Sydney aquariums",
  authors: [{ name: "Aquatic Emerald" }],
  icons: {
    icon: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const whatsapp = await getSellerWhatsApp();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <CartProvider>
            <Navbar />
            <SiteChrome whatsapp={whatsapp}>{children}</SiteChrome>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
