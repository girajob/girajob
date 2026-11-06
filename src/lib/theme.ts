import { supabase } from "@/integrations/supabase/client";

export type BrandTheme = { primary: string; cta: string; lime: string; navy: string };

export const DEFAULT_THEME: BrandTheme = { primary: "#00BFA6", cta: "#FF6B3D", lime: "#C8FF5B", navy: "#0B2342" };

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Accepts only well-formed hex colors; anything else falls back to the default. */
export function normalizeTheme(raw: unknown): BrandTheme {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof BrandTheme) => (typeof r[k] === "string" && HEX.test(r[k] as string) ? (r[k] as string) : DEFAULT_THEME[k]);
  return { primary: pick("primary"), cta: pick("cta"), lime: pick("lime"), navy: pick("navy") };
}

const soft = (c: string, pct = 12) => `color-mix(in oklab, ${c} ${pct}%, white)`;

/** CSS variable overrides derived from the four brand colors. */
export function themeVars(t: BrandTheme): Record<string, string> {
  return {
    "--primary": t.primary,
    "--primary-soft": soft(t.primary),
    "--ring": t.primary,
    "--chart-1": t.primary,
    "--sidebar-primary": t.primary,
    "--sidebar-ring": t.primary,
    "--cta": t.cta,
    "--cta-soft": soft(t.cta),
    "--chart-2": t.cta,
    "--shadow-cta": `0 10px 24px -10px color-mix(in oklab, ${t.cta} 60%, transparent)`,
    "--accent": soft(t.lime, 35),
    "--chart-3": t.lime,
    "--sidebar-accent-foreground": t.lime,
    "--navy": t.navy,
    "--foreground": t.navy,
    "--card-foreground": t.navy,
    "--popover-foreground": t.navy,
    "--secondary-foreground": t.navy,
    "--chart-4": t.navy,
    "--sidebar": t.navy,
    "--sidebar-accent": `color-mix(in oklab, ${t.navy} 85%, white)`,
    "--sidebar-border": `color-mix(in oklab, ${t.navy} 85%, white)`,
    "--gradient-hero": `linear-gradient(135deg, ${t.navy}, color-mix(in oklab, ${t.navy} 50%, ${t.primary}) 55%, ${t.primary})`,
  };
}

export function applyTheme(t: BrandTheme) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars(t))) root.style.setProperty(k, v);
}

export async function fetchTheme(): Promise<BrandTheme> {
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "theme").maybeSingle();
  return normalizeTheme(data?.value);
}
