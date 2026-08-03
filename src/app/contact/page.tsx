import { getSellerWhatsApp, getLocations } from "@/lib/dataService";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/icons/SocialIcons";
import { FACEBOOK_URL, INSTAGRAM_URL, getWhatsAppUrl } from "@/lib/socialLinks";
import { MapPin } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export const revalidate = 60;

export default async function ContactPage() {
  const [whatsapp, locations] = await Promise.all([
    getSellerWhatsApp(),
    getLocations(),
  ]);

  const contactMethods = [
    whatsapp && {
      label: "WhatsApp",
      description: "Aquatic Emerald",
      href: getWhatsAppUrl(whatsapp),
      Icon: WhatsAppIcon,
    },
    {
      label: "Instagram",
      description: "@aquatic_emerald",
      href: INSTAGRAM_URL,
      Icon: InstagramIcon,
    },
    {
      label: "Facebook",
      description: "Aquatic Emerald",
      href: FACEBOOK_URL,
      Icon: FacebookIcon,
    },
  ].filter(Boolean) as {
    label: string;
    description: string;
    href: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }[];

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      {}
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3">
          Get In Touch
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">
          Contact Us
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">
          Questions about a plant, shrimp, or an order? Reach out on
          WhatsApp for the quickest reply, or find us on Instagram and
          Facebook.
        </p>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
        {contactMethods.map(({ label, description, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all duration-200"
          >
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm mb-0.5">{label}</h3>
              <p className="text-xs text-muted-foreground font-light truncate">
                {description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {}
      {locations.length > 0 && (
        <>
          <h2 className="font-serif text-2xl font-medium mb-6">
            Pickup Locations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </>
      )}
    </div>
  );
}
