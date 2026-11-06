import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { DEFAULT_THEME, normalizeTheme } from "./theme";

describe("normalizeTheme", () => {
  it("keeps valid hex colors", () => {
    expect(normalizeTheme({ primary: "#123456" }).primary).toBe("#123456");
  });
  it("rejects invalid values and falls back to brand defaults", () => {
    expect(normalizeTheme({ cta: "red; background:url(x)" }).cta).toBe(DEFAULT_THEME.cta);
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
  });
});
