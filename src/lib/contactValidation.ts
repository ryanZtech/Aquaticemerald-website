export function isValidEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.length <= 40 && /^[+\d\s().-]+$/.test(trimmed) && digits.length >= 8 && digits.length <= 15;
}
