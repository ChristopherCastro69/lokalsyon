// URL-safe slug from a display name. Intentionally minimal — no external
// transliteration library. Handles common Filipino shop-name punctuation
// like "&", apostrophes, slashes, and accented characters.
//
//   slugify("Jane & Mark's Boutique")       → "jane-and-marks-boutique"
//   slugify("Sari-Sari Store #4")           → "sari-sari-store-4"
//   slugify("Niño's Footwear / Apparel")    → "ninos-footwear-apparel"
//   slugify("   ")                          → ""

export function slugify(text: string): string {
  return text
    // Normalize diacritics (é → e, ñ → n) so Spanish/Filipino names map cleanly.
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Expand "&" to "and" before stripping punctuation so "Jane & Mark" → "jane-and-mark".
    .replace(/\s*&\s*/g, " and ")
    // Anything that's not a-z, 0-9, space, or hyphen becomes a space.
    .replace(/[^a-z0-9\s-]/g, " ")
    // Collapse whitespace runs.
    .replace(/\s+/g, "-")
    // Collapse consecutive hyphens.
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens.
    .replace(/^-+|-+$/g, "")
    // Cap length — Postgres column is `text` but long slugs make ugly URLs.
    .slice(0, 40)
    // If the slice landed on a trailing hyphen, strip it.
    .replace(/-+$/g, "");
}
