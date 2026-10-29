import { getSellerWhatsApp } from "@/lib/dataService";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/icons/SocialIcons";
import { FACEBOOK_URL, INSTAGRAM_URL, getWhatsAppUrl } from "@/lib/socialLinks";
import ContactForm from "@/components/ContactForm";
import type { ComponentType, SVGProps } from "react";

export const revalidate = 60;
export const metadata = { title: "Contact", description: "Get in touch with Aquatic Emerald.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const whatsapp = await getSellerWhatsApp();

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
      <div className="grid grid-cols-3 gap-3 mb-12">
        {contactMethods.map(({ label, description, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 bg-card border border-border rounded-2xl px-2 py-4 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-colors duration-200 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 w-full">
              <h3 className="font-medium text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground font-light truncate">
                {description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {}
      <div>
        <h2 className="font-serif text-2xl font-medium mb-4">
          Or send us a message
        </h2>
        <ContactForm />
      </div>
    </div>
  );
}
