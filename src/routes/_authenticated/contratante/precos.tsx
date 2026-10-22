import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { useMe } from "@/lib/session";
import { brl, errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/precos")({
  head: () => ({ meta: [{ title: "Meus preços — GiraJob" }] }),
  component: Precos,
});

function Precos() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const companyId = me?.company?.id;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useQuery({
    queryKey: ["price-catalog", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_catalog")
        .select("id, name, description, amount, active, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!name.trim()) { toast.error("Informe o nome do item"); return; }
    if (!Number.isFinite(value) || value < 0) { toast.error("Informe um valor válido"); return; }
    setBusy(true);
    const { error } = await supabase.from("price_catalog").insert({
      company_id: companyId!,
      name: name.trim(),
      description: description.trim() || null,
      amount: value,
    });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Item adicionado ao catálogo");
    setName(""); setDescription(""); setAmount("");
    qc.invalidateQueries({ queryKey: ["price-catalog", companyId] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("price_catalog").update({ active: !active }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["price-catalog", companyId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("price_catalog").delete().eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Item removido");
    qc.invalidateQueries({ queryKey: ["price-catalog", companyId] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus preços"
        subtitle="Cadastre o que sua empresa cobra pelos serviços. Se você tem um vendedor GiraJob, ele também pode negociar e registrar estes valores."
      />
      <form onSubmit={add} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Item *"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: Diária de garçom" /></Field>
          <Field label="Valor (R$) *"><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" /></Field>
        </div>
        <Field label="Descrição"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} placeholder="Detalhes do que está incluído, condições negociadas…" /></Field>
        <Button variant="cta" disabled={busy}><Plus /> {busy ? "Salvando…" : "Adicionar ao catálogo"}</Button>
      </form>
      {items.isLoading ? <Spinner /> : !items.data?.length ? (
        <EmptyState icon={Tags} title="Catálogo vazio" text="Cadastre acima os serviços e valores que sua empresa cobra." />
      ) : (
        <div className="space-y-3">
          {items.data.map((it) => (
            <div key={it.id} className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{it.name}</span>
                  <StatusPill status={it.active ? "published" : "closed"} label={it.active ? "Ativo" : "Inativo"} />
                </div>
                {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold">{brl(it.amount)}</span>
                <Button variant="outline" size="sm" onClick={() => toggle(it.id, it.active)}>{it.active ? "Desativar" : "Ativar"}</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(it.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
