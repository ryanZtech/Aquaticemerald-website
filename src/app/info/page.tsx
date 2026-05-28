import { getLocations, getHours, getStoreSettings } from "@/lib/dataService";
import { MapPin, Clock, ChevronDown } from "lucide-react";

export const revalidate = 60; // Revalidate dynamic hours/locations every 60 seconds (ISR)

export default async function InfoPage() {
  const [locations, hours, settings] = await Promise.all([
    getLocations(),
    getHours(),
    getStoreSettings(),
  ]);

  const sceneImg =
    settings.scene_image || "https://aquaticemerald.com/front1.png";

  const guides = [
    {
      title: "Stem Plants (Rotala, Ludwigia, Hygrophila)",
      body: "Stem plants grow upward and require regular trimming to maintain shape. Plant bundles 1–2 cm apart in nutrient-rich substrate. Most benefit from CO₂ injection and fertiliser dosing. Trim the tops and replant for bushier, denser growth. Perform 30% water changes weekly for best results.",
    },
    {
      title: "Rhizome Plants (Java Fern, Anubias)",
      body: "Never bury the rhizome in substrate — attach to driftwood or rock using thread or aquarium-safe gel glue. These plants grow slowly but are extremely hardy. They adapt well to low light and thrive without CO₂. Brown or translucent patches indicate too much direct light on the rhizome.",
    },
    {
      title: "Floating Plants (Redroot Floater)",
      body: "No planting required — simply float on the surface. Provide ample overhead light for vivid red colouring. Remove excess growth regularly to prevent blocking light to plants below. Redroot Floaters are sensitive to surface agitation from strong filters — a calm surface is ideal.",
    },
    {
      title: "Java Moss",
      body: "Attach to hardscape using dark thread or fishing line, or leave free-floating. Thrives in a wide range of water conditions from low to high tech. Trim periodically to maintain shape and encourage dense new growth. Excellent natural refuge for shrimp, fry, and breeding fish.",
    },
    {
      title: "Cryptocoryne",
      body: "Plant in nutrient-rich substrate with the crown just above the surface. May experience 'Crypt melt' — leaves die back when first introduced — do not remove the plant. New leaves adapted to your tank parameters will emerge within 2–4 weeks. Extremely rewarding once established.",
    },
    {
      title: "Bloody Mary Shrimp",
      body: "Maintain water temperature 20–26°C, pH 6.8–7.4, TDS 150–250 ppm. Avoid all copper-based medications — fatal to shrimp. Drip-acclimate slowly over 1–2 hours before introduction. Feed algae wafers, blanched vegetables, and specialised shrimp food. Change no more than 20% water at a time to avoid shocking parameters.",
    },
    {
      title: "Malaysian Trumpet Snails",
      body: "No special care required — MTS thrive in virtually all freshwater aquariums. They reproduce according to food availability, so avoid overfeeding to keep populations in check. Beneficial in planted tanks for substrate aeration. Will not harm healthy plants. Excellent indicator species for tank health.",
    },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      {/* Header section */}
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3 animate-pulse">
          About Us
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">
          Aquatic Emerald
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">
          A small Hills District operation supplying healthy, home-grown
          freshwater plants, shrimp and snails to planted aquarium hobbyists
          across Sydney. Every specimen leaves our tanks thriving.
        </p>
      </div>

      {/* Lush Scene Image */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 mb-16 bg-muted shadow-lg border border-border/10">
        <img
          src={sceneImg}
          alt="Lush planted aquascape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      {/* Pickup Locations dynamic Grid */}
      <h2 className="font-serif text-3xl font-medium mb-6">Pickup Locations</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/20 transition-all duration-200"
          >
            <MapPin className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-medium text-sm mb-1">
              {loc.name.split(" — ")[0]}
            </h3>
            <p className="text-xs text-muted-foreground font-light">
              {loc.detail || "Sydney, Australia"}
            </p>
          </div>
        ))}
      </div>

      {/* Pickup Hours dynamic Card */}
      <div className="bg-secondary rounded-2xl p-6 mb-16 border border-border/10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-medium">Pickup Hours</h3>
        </div>
        <div className="space-y-2.5 text-sm">
          {hours.map((h) => (
            <div key={h.id} className="flex justify-between items-center">
              <span className="text-muted-foreground font-light">
                {h.dayRange}
              </span>
              <span className="font-semibold">{h.timeRange}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border font-light">
          All pickups are scheduled in 15-minute windows. Select your preferred
          slot at checkout.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="/logo.png"
            alt="Aquatic Emerald Logo"
            className="w-4 h-4 object-contain"
          />
          <span className="font-serif text-sm font-medium">
            Aquatic Emerald
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Aquatic Emerald · Hills District, Sydney
        </p>
      </div>
    </div>
  );
}
