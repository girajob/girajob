import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Save, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { useMe } from "@/lib/session";
import { brl, errMsg } from "@/lib/format";
import { priceCatalogQuery } from "@/lib/price-catalog";

export const Route = createFileRoute("/_authenticated/contratante/precos")({
  head: () => ({ meta: [{ title: "Cargos e meus preços — GiraJob" }, { name: "description", content: "Cadastre e edite cargos e valores para montar o quadro de funcionários dos seus eventos." }, { property: "og:title", content: "Cargos e meus preços — GiraJob" }, { property: "og:description", content: "Seu catálogo de cargos e valores para eventos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const items = useQuery(priceCatalogQuery(companyId));

  function reset() {
    setEditingId(null); setName(""); setDescription(""); setAmount("");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) { toast.error("Cadastre sua empresa primeiro"); return; }
    const value = Number(amount.replace(",", "."));
    if (!name.trim()) { toast.error("Informe o nome do item"); return; }
    if (!Number.isFinite(value) || value < 0) { toast.error("Informe um valor válido"); return; }
    setBusy(true);
    const row = {
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      amount: value,
    };
    const { error } = editingId
      ? await supabase.from("price_catalog").update(row).eq("id", editingId).eq("company_id", companyId)
      : await supabase.from("price_catalog").insert(row);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(editingId ? "Preço atualizado" : "Item adicionado ao catálogo");
    reset();
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
        subtitle="Cargos e valores por pessoa"
      />
      <form onSubmit={add} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Cargo ou serviço *"><Input aria-label="Cargo ou serviço" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: Garçom, Caixa, Faxineiro" /></Field>
          <Field label="Valor (R$) *"><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" /></Field>
        </div>
        <Field label="Descrição"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} placeholder="Detalhes do que está incluído, condições negociadas…" /></Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="cta" disabled={busy}>{editingId ? <Save /> : <Plus />} {busy ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar ao catálogo"}</Button>
          {editingId && <Button type="button" variant="outline" onClick={reset} disabled={busy}><X /> Cancelar edição</Button>}
        </div>
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
                <Button variant="outline" size="sm" aria-label={`Editar ${it.name}`} onClick={() => { setEditingId(it.id); setName(it.name); setDescription(it.description ?? ""); setAmount(String(it.amount)); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="size-4" /> Editar</Button>
                <Button variant="outline" size="sm" onClick={() => toggle(it.id, it.active)}>{it.active ? "Desativar" : "Ativar"}</Button>
                <Button variant="ghost" size="sm" aria-label={`Excluir ${it.name}`} onClick={() => remove(it.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
