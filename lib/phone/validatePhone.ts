import { defaultCountries, getActiveFormattingMask, getCountry } from "react-international-phone";

export type PhoneValue = {
  country?: string;
  dialCode?: string;
  e164?: string;
  nationalNumber?: string;
};

const DEFAULT_MASK = "............";
const E164_FALLBACK = /^\+?\d{8,16}$/;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function countMaskDigits(mask: string) {
  const matches = mask.match(/\./g);
  return matches ? matches.length : 0;
}

export function isPhoneValidByCountry(phone?: PhoneValue | null) {
  if (!phone?.e164) return false;
  const normalized = phone.e164.replace(/\s+/g, "");
  if (!E164_FALLBACK.test(normalized)) return false;

  const iso2 = (phone.country || "").trim().slice(0, 2).toLowerCase();
  const country = getCountry({ field: "iso2", value: iso2, countries: defaultCountries });
  if (!country) return true;

  const digits = digitsOnly(normalized);
  const mask = getActiveFormattingMask({ phone: digits, country, defaultMask: DEFAULT_MASK });
  const requiredDigits = countMaskDigits(mask);
  if (!requiredDigits) return true;

  let nationalDigits = digitsOnly(phone.nationalNumber || "");
  if (!nationalDigits) {
    nationalDigits = digits.startsWith(country.dialCode)
      ? digits.slice(country.dialCode.length)
      : digits;
  }

  return nationalDigits.length === requiredDigits;
}
