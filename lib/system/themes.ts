export const systemThemes = [
  { key: "nebula", zh: "ÐÇÔÆ", en: "Nebula" },
  { key: "midnight", zh: "ÉîÒ¹", en: "Midnight" },
  { key: "aurora", zh: "¼«¹â", en: "Aurora" },
  { key: "ember", zh: "Óà½ý", en: "Ember" },
  { key: "jade", zh: "ôä´ä", en: "Jade" },
  { key: "dune", zh: "É³Çð", en: "Dune" },
  { key: "arctic", zh: "¼«µØ", en: "Arctic" },
  { key: "ruby", zh: "ºì±¦", en: "Ruby" },
  { key: "sapphire", zh: "À¶±¦", en: "Sapphire" },
  { key: "emerald", zh: "´äÂÌ", en: "Emerald" },
  { key: "amber", zh: "çúçê", en: "Amber" },
  { key: "tech", zh: "¿Æ¼¼", en: "Tech" },
  { key: "onyx", zh: "ºÚê×", en: "Onyx" }
] as const;

export type SystemTheme = (typeof systemThemes)[number]["key"];

export function isSystemTheme(value: string): value is SystemTheme {
  return systemThemes.some((item) => item.key === value);
}
