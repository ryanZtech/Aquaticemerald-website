import Link from "next/link";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "./icons/SocialIcons";
import { FACEBOOK_URL, INSTAGRAM_URL, getWhatsAppUrl } from "@/lib/socialLinks";

interface FooterProps {
  whatsapp?: string;
}

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/guides", label: "Guides" },
  { href: "/info", label: "Info" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Footer({ whatsapp }: FooterProps) {
  const socialLinks = [
    {
      href: INSTAGRAM_URL,
      label: "Instagram",
      Icon: InstagramIcon,
    },
    {
      href: FACEBOOK_URL,
      label: "Facebook",
      Icon: FacebookIcon,
    },
    ...(whatsapp
      ? [
          {
            href: getWhatsAppUrl(whatsapp),
            label: "WhatsApp",
            Icon: WhatsAppIcon,
          },
        ]
      : []),
  ];

  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-8 sm:flex-row sm:items-start sm:justify-between sm:text-left">
        {}
        <div className="flex flex-col items-center sm:items-start gap-3 max-w-xs">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Aquatic Emerald Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-serif text-base font-medium">
              Aquatic{" "}
              <em className="not-italic text-primary font-semibold">
                Emerald
              </em>
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Home-grown freshwater plants, shrimp and snails for the planted
            aquarium hobbyist. Hills District, Sydney.
          </p>
        </div>

        {}
        <div className="flex flex-row gap-10 sm:gap-16">
          {}
          <nav className="flex flex-col items-start text-left gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Explore
            </span>
            <div className="flex flex-col gap-2">
              {EXPLORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {}
          <div className="flex flex-col items-start text-left gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Follow &amp; Message
            </span>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-muted-foreground text-center">
        © 2026 Aquatic Emerald · Hills District, Sydney · All sales subject to
        availability
      </p>
    </footer>
  );
}
