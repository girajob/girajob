import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, Spinner } from "@/components/gj";
import { useMe } from "@/lib/session";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/empresa")({
  head: () => ({ meta: [{ title: "Minha empresa — GiraJob" }] }),
  component: Company,
});

function Company() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", document: "", phone: "", city: "", state: "", description: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = me?.company;
    if (c) setF({ name: c.name, document: c.document ?? "", phone: c.phone ?? "", city: c.city ?? "", state: c.state ?? "", description: c.description ?? "" });
  }, [me?.company]);
  if (isLoading || !me) return <Spinner />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) { toast.error("Informe o nome da empresa"); return; }
    if (f.state && !/^[A-Za-z]{2}$/.test(f.state)) { toast.error("Use a sigla do estado (ex.: SP)"); return; }
    setBusy(true);
    const row = { ...f, name: f.name.trim(), state: f.state.toUpperCase() || null };
    const { error } = me!.company
      ? await supabase.from("companies").update(row).eq("id", me!.company.id)
      : await supabase.from("companies").insert({ ...row, owner_id: me!.user.id });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Empresa salva!");
    const first = !me!.company;
    await qc.invalidateQueries({ queryKey: ["me"] });
    if (first) navigate({ to: "/contratante" });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={me.company ? "Minha empresa" : "Cadastre sua empresa"} subtitle="Essas informações aparecem nas suas vagas." />
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <Field label="Nome da empresa *"><Input value={f.name} onChange={set("name")} maxLength={120} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CNPJ/CPF"><Input value={f.document} onChange={set("document")} maxLength={20} /></Field>
          <Field label="Telefone"><Input value={f.phone} onChange={set("phone")} maxLength={20} /></Field>
          <Field label="Cidade"><Input value={f.city} onChange={set("city")} maxLength={80} /></Field>
          <Field label="Estado (UF)"><Input value={f.state} onChange={set("state")} maxLength={2} /></Field>
        </div>
        <Field label="Sobre"><Textarea value={f.description} onChange={set("description")} maxLength={1000} /></Field>
        <Button variant="cta" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
      </form>
    </div>
  );
}
