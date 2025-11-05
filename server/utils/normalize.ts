// server/utils/normalize.ts

/**
 * Normalize phone number for international support
 * Handles US, Canada, Philippines, and other international formats
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  // Handle common international formats
  
  // ✅ US/Canada: +1 (10 digits) → 1XXXXXXXXXX
  if (digits.startsWith("1") && digits.length === 11) {
    return digits; // Already normalized: 1XXXXXXXXXX
  }
  
  // ✅ Philippines: +63 (10 digits) → 63XXXXXXXXXX
  if (digits.startsWith("63") && digits.length === 12) {
    return digits; // Already normalized: 63XXXXXXXXXX
  }
  
  // ✅ Philippines local format: 09XX XXX XXXX → 63XXXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    return "63" + digits.slice(1); // Remove leading 0, add 63
  }
  
  // ✅ US/Canada local format: (555) 123-4567 → 1XXXXXXXXXX
  if (!digits.startsWith("1") && digits.length === 10) {
    // Could be US/Canada local number
    return "1" + digits; // Assume US/Canada, add +1
  }
  
  // ✅ UK: +44 (10 digits after code) → 44XXXXXXXXXX
  if (digits.startsWith("44") && digits.length >= 12) {
    return digits;
  }
  
  // ✅ Australia: +61 (9 digits after code) → 61XXXXXXXXX
  if (digits.startsWith("61") && digits.length >= 11) {
    return digits;
  }
  
  // ✅ Generic international: keep as-is if starts with country code
  // Assume valid if 10+ digits and starts with a country code pattern
  if (digits.length >= 10) {
    return digits;
  }
  
  // ✅ Fallback: return original digits (let validation handle it)
  return digits;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Must have at least 10 digits (minimum international format)
  if (normalized.length < 10) return false;
  
  // Check common country codes
  const validCountryCodes = [
    "1",   // US/Canada
    "44",  // UK
    "61",  // Australia
    "63",  // Philippines
    "64",  // New Zealand
    "81",  // Japan
    "86",  // China
    "91",  // India
    // Add more as needed
  ];
  
  // Check if starts with a known country code
  return validCountryCodes.some(code => normalized.startsWith(code));
}

/**
 * Normalize email to lowercase and trim whitespace
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  
  return email.trim().toLowerCase();
}

/**
 * Format phone number for display (human-readable)
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  
  // ✅ US/Canada: +1 (555) 123-4567
  if (normalized.startsWith("1") && normalized.length === 11) {
    return `+1 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  }
  
  // ✅ Philippines: +63 912 345 6789
  if (normalized.startsWith("63") && normalized.length === 12) {
    return `+${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`;
  }
  
  // ✅ UK: +44 20 1234 5678
  if (normalized.startsWith("44") && normalized.length >= 12) {
    return `+${normalized.slice(0, 2)} ${normalized.slice(2, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8)}`;
  }
  
  // ✅ Generic: +XX XXX XXX XXXX
  if (normalized.length >= 10) {
    // Add + and space every 3-4 digits
    return `+${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Detect country from phone number
 */
export function detectCountryFromPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (normalized.startsWith("1")) return "US/CA";
  if (normalized.startsWith("44")) return "UK";
  if (normalized.startsWith("61")) return "AU";
  if (normalized.startsWith("63")) return "PH";
  if (normalized.startsWith("64")) return "NZ";
  
  return "UNKNOWN";
}