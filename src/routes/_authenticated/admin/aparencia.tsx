import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/gj";
import { Button } from "@/components/ui/button";
import { applyTheme, DEFAULT_THEME, fetchTheme, type BrandTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin/aparencia")({
  head: () => ({ meta: [{ title: "Aparência — GiraJob Admin" }] }),
  component: Appearance,
});

const FIELDS: { key: keyof BrandTheme; label: string; hint: string }[] = [
  { key: "primary", label: "Cor principal", hint: "Botões, links e destaques (turquesa)" },
  { key: "cta", label: "Cor de ação", hint: "Valores e chamadas importantes (laranja)" },
  { key: "lime", label: "Cor de realce", hint: "Detalhes e gráficos (verde-lima)" },
  { key: "navy", label: "Cor escura", hint: "Textos, menu lateral e fundos (azul-marinho)" },
];

function Appearance() {
  const [theme, setTheme] = useState<BrandTheme>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetchTheme().then(setTheme); }, []);
  const update = (t: BrandTheme) => { setTheme(t); applyTheme(t); };

  async function save(t: BrandTheme) {
    setSaving(true);
    const { error } = await supabase.rpc("set_platform_setting", { _key: "theme", _value: t });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar as cores.");
    toast.success("Cores salvas para toda a plataforma.");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Aparência" subtitle="Mude as cores do site, do portal do contratante e do app do profissional." />
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-4">
            <input type="color" value={theme[f.key]} onChange={(e) => update({ ...theme, [f.key]: e.target.value })}
              className="size-12 cursor-pointer rounded-xl border" aria-label={f.label} />
            <div className="flex-1">
              <div className="font-semibold">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.hint}</div>
            </div>
            <code className="text-xs uppercase text-muted-foreground">{theme[f.key]}</code>
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-hero p-5 text-primary-foreground">
        <div className="font-display text-xl font-extrabold">Prévia</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button>Botão principal</Button>
          <span className="rounded-xl bg-cta px-3 py-1.5 font-bold text-cta-foreground shadow-cta">R$ 250,00</span>
          <span className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">Confirmada</span>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={() => save(theme)} disabled={saving}>{saving ? "Salvando…" : "Salvar cores"}</Button>
        <Button variant="outline" onClick={() => { update(DEFAULT_THEME); void save(DEFAULT_THEME); }}>Restaurar padrão</Button>
      </div>
    </div>
  );
}
