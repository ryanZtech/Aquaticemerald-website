"use client";

import { useState } from "react";
import { cn } from "@/app/components/ui/utils";
import { countryName, findCountryByPhone, flagUrl } from "@/lib/phoneCountries";

interface SellerPhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Seller WhatsApp number input.
 *
 * The "+" and the field are one control (no seam between two boxes), and as
 * the number is typed the country calling code is matched so the "+" segment
 * widens with a transition to reveal that country's flag.
 */
export default function SellerPhoneInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: SellerPhoneInputProps) {
  const [failedFlag, setFailedFlag] = useState<string | null>(null);
  const country = findCountryByPhone(value);
  const showFlag = Boolean(country) && failedFlag !== country?.iso2;
  const label = country ? countryName(country.iso2) : "country code not recognised yet";

  return (
    <div
      className={cn(
        "flex h-9 items-stretch overflow-hidden rounded-md border border-input bg-input-background",
        "transition-[border-color,box-shadow] duration-200",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      <div
        className="flex items-center overflow-hidden pl-2.5 text-sm text-muted-foreground select-none"
        title={country ? `${label} (+${country.dial})` : undefined}
      >
        <span aria-hidden="true">+</span>
        <span
          aria-hidden="true"
          className={cn(
            "flex items-center overflow-hidden transition-all duration-300 ease-out",
            showFlag ? "w-8 opacity-100" : "w-0 opacity-0",
          )}
        >
          {showFlag && country && (
            <img
              src={flagUrl(country.iso2)}
              alt=""
              className="ml-1.5 h-3.5 w-5 rounded-[2px] object-cover ring-1 ring-black/10"
              onError={() => setFailedFlag(country.iso2)}
            />
          )}
        </span>
      </div>
      <span className="sr-only">{label}</span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent pr-3 pl-2 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
