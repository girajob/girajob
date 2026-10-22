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
import { fetchCep, fetchCnpj } from "@/lib/br-lookup";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/empresa")({
  head: () => ({ meta: [{ title: "Minha empresa — GiraJob" }] }),
  component: Company,
});

const empty = { name: "", document: "", phone: "", city: "", state: "", description: "", postal_code: "", address_line: "", address_number: "", address_complement: "", address_district: "" };

function Company() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  useEffect(() => {
    const c = me?.company;
    if (c) setF({
      name: c.name, document: c.document ?? "", phone: c.phone ?? "", city: c.city ?? "", state: c.state ?? "", description: c.description ?? "",
      postal_code: c.postal_code ?? "", address_line: c.address_line ?? "", address_number: c.address_number ?? "",
      address_complement: c.address_complement ?? "", address_district: c.address_district ?? "",
    });
  }, [me?.company]);
  if (isLoading || !me) return <Spinner />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function lookupCnpj() {
    const digits = f.document.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setLooking(true);
    const info = await fetchCnpj(digits);
    setLooking(false);
    if (!info) { toast.error("CNPJ não encontrado"); return; }
    setF((p) => ({
      ...p,
      name: p.name.trim() || info.nome_fantasia || info.razao_social,
      postal_code: p.postal_code || info.cep,
      address_line: p.address_line || info.logradouro,
      address_district: p.address_district || info.bairro,
      city: p.city || info.municipio,
      state: p.state || info.uf,
    }));
    toast.success("Dados da empresa preenchidos pelo CNPJ");
  }

  async function lookupCep() {
    const digits = f.postal_code.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLooking(true);
    const info = await fetchCep(digits);
    setLooking(false);
    if (!info) { toast.error("CEP não encontrado"); return; }
    setF((p) => ({ ...p, address_line: info.logradouro || p.address_line, address_district: info.bairro || p.address_district, city: info.localidade || p.city, state: info.uf || p.state }));
    toast.success("Endereço preenchido — falta só o número");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) { toast.error("Informe o nome da empresa"); return; }
    if (f.state && !/^[A-Za-z]{2}$/.test(f.state)) { toast.error("Use a sigla do estado (ex.: SP)"); return; }
    setBusy(true);
    const row = {
      ...f, name: f.name.trim(), state: f.state.toUpperCase() || null,
      postal_code: f.postal_code || null, address_line: f.address_line || null, address_number: f.address_number || null,
      address_complement: f.address_complement || null, address_district: f.address_district || null,
    };
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
        <Field label="CNPJ" hint="Digite os 14 números e saia do campo: a razão social e o endereço são preenchidos automaticamente.">
          <Input value={f.document} onChange={set("document")} onBlur={lookupCnpj} maxLength={20} inputMode="numeric" placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Nome da empresa *"><Input value={f.name} onChange={set("name")} maxLength={120} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone"><Input value={f.phone} onChange={set("phone")} maxLength={20} /></Field>
          <Field label="CEP" hint="Preenche rua, bairro e cidade sozinho.">
            <Input value={f.postal_code} onChange={set("postal_code")} onBlur={lookupCep} maxLength={9} inputMode="numeric" placeholder="00000-000" />
          </Field>
          <Field label="Rua"><Input value={f.address_line} onChange={set("address_line")} maxLength={120} /></Field>
          <Field label="Bairro"><Input value={f.address_district} onChange={set("address_district")} maxLength={80} /></Field>
          <Field label="Número"><Input value={f.address_number} onChange={set("address_number")} maxLength={10} /></Field>
          <Field label="Complemento"><Input value={f.address_complement} onChange={set("address_complement")} maxLength={60} placeholder="Opcional" /></Field>
          <Field label="Cidade"><Input value={f.city} onChange={set("city")} maxLength={80} /></Field>
          <Field label="Estado (UF)"><Input value={f.state} onChange={set("state")} maxLength={2} /></Field>
        </div>
        <Field label="Sobre"><Textarea value={f.description} onChange={set("description")} maxLength={1000} /></Field>
        <Button variant="cta" disabled={busy || looking}>{busy ? "Salvando…" : looking ? "Consultando…" : "Salvar"}</Button>
      </form>
    </div>
  );
}
