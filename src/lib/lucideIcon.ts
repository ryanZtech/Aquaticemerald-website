import * as LucideIcons from "lucide-react";
import { Package } from "lucide-react";

type LucideModule = typeof LucideIcons;
type LucideIconComponent = LucideModule[keyof LucideModule];

function toPascalCase(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function normalizeLucideIconName(value?: string) {
  if (!value) return "Package";
  return toPascalCase(value) || "Package";
}

export function getLucideIconByName(value?: string) {
  const normalized = normalizeLucideIconName(value);
  const icon = (LucideIcons as any)[normalized];

  if (typeof icon === "function" || (icon && typeof icon === "object")) {
    return icon as LucideIconComponent;
  }

  return Package;
}
