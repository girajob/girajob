import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, JobCard } from "@/components/gj";
import { categoriesQuery } from "@/lib/pro-queries";
import { buildShift, validateJob, type JobFormInput } from "@/lib/jobs";
import { errMsg, toDateInput, toTimeInput } from "@/lib/format";
import { uploadMedia } from "@/lib/media";
import { useMe } from "@/lib/session";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
const sel = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

function fromJob(j?: Job | null): JobFormInput {
  return {
    title: j?.title ?? "", category_id: j?.category_id ?? "", description: j?.description ?? "",
    venue_name: j?.venue_name ?? "", positions: j?.positions ?? 1, address: j?.address ?? "",
    city: j?.city ?? "", state: j?.state ?? "",
    date: j ? toDateInput(j.starts_at) : "", start_time: j ? toTimeInput(j.starts_at) : "18:00",
    end_time: j ? toTimeInput(j.ends_at) : "23:00", pay_amount: j ? Number(j.pay_amount) : 0,
    requirements: j?.requirements ?? "", benefits: j?.benefits ?? "",
    deadline_date: j?.application_deadline ? toDateInput(j.application_deadline) : "",
    deadline_time: j?.application_deadline ? toTimeInput(j.application_deadline) : "",
  };
}

export function JobForm({ job }: { job?: Job | null }) {
  const { data: me } = useMe();
  const cats = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<JobFormInput>(fromJob(job));
  const [payer, setPayer] = useState<"company" | "girajob">(job?.payer === "girajob" ? "girajob" : "company");
  const [banner, setBanner] = useState<string | null>(job?.banner_url ?? null);
  const [errors, setErrors] = useState<ReturnType<typeof validateJob>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const set = (k: keyof JobFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === "positions" || k === "pay_amount" ? Number(e.target.value) : e.target.value });
  const shift = f.date && f.start_time && f.end_time ? buildShift(f.date, f.start_time, f.end_time) : null;
  const editingLive = job && job.status !== "draft";

  async function onBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    try { setBanner(await uploadMedia(me.user.id, file, "banner")); toast.success("Banner enviado"); }
    catch (err) { toast.error(errMsg(err)); }
  }

  async function save(publish: boolean) {
    const errs = validateJob(f, { publishing: publish || !!editingLive });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Revise os campos destacados"); return; }
    const s = buildShift(f.date, f.start_time, f.end_time);
    const row = {
      title: f.title.trim(), category_id: f.category_id || null, description: f.description.trim(),
      venue_name: f.venue_name.trim(), positions: f.positions, address: f.address.trim() || null,
      city: f.city.trim(), state: f.state.trim().toUpperCase(), starts_at: s.starts_at.toISOString(),
      ends_at: s.ends_at.toISOString(), pay_amount: f.pay_amount, requirements: f.requirements.trim() || null,
      benefits: f.benefits.trim() || null, banner_url: banner, payer,
      application_deadline: f.deadline_date ? new Date(`${f.deadline_date}T${f.deadline_time || "23:59"}:00`).toISOString() : null,
      ...(publish ? { status: "published" as const } : {}),
    };
    setBusy(true);
    const res = job
      ? await supabase.from("jobs").update(row).eq("id", job.id).select("id").single()
      : await supabase.from("jobs").insert({ ...row, company_id: me!.company!.id }).select("id").single();
    setBusy(false);
    if (res.error) { toast.error(errMsg(res.error)); return; }
    toast.success(publish ? "Vaga publicada!" : "Alterações salvas");
    qc.invalidateQueries();
    navigate({ to: "/contratante/vagas/$id", params: { id: res.data.id } });
  }

  const cat = cats.data?.find((c) => c.id === f.category_id);
  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <Field label="Título *" error={errors.title}><Input value={f.title} onChange={set("title")} maxLength={120} placeholder="Ex.: Garçom para casamento" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria *" error={errors.category_id}>
            <select className={sel} value={f.category_id} onChange={set("category_id")}>
              <option value="">Escolha…</option>
              {cats.data?.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Evento ou estabelecimento *" error={errors.venue_name}><Input value={f.venue_name} onChange={set("venue_name")} maxLength={120} /></Field>
        </div>
        <Field label="Descrição *" error={errors.description}><Textarea value={f.description} onChange={set("description")} maxLength={3000} rows={4} /></Field>
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Data *" error={errors.date}><Input type="date" value={f.date} onChange={set("date")} /></Field>
          <Field label="Início *" error={errors.start_time}><Input type="time" value={f.start_time} onChange={set("start_time")} /></Field>
          <Field label="Término *" error={errors.end_time}><Input type="time" value={f.end_time} onChange={set("end_time")} /></Field>
        </div>
        {shift?.crossesMidnight && (
          <p className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
            <Moon className="size-4" /> O serviço termina no dia seguinte.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Profissionais necessários *" error={errors.positions}><Input type="number" min={1} max={500} value={f.positions} onChange={set("positions")} /></Field>
          <Field label="Remuneração por pessoa (R$) *" error={errors.pay_amount}><Input type="number" min={0} step="0.01" value={f.pay_amount} onChange={set("pay_amount")} /></Field>
          <Field label="Prazo de candidatura" error={errors.deadline_date}><Input type="date" value={f.deadline_date} onChange={set("deadline_date")} /></Field>
        </div>
        <Field label="Endereço" hint="Mostrado somente para os contratados."><Input value={f.address} onChange={set("address")} maxLength={200} /></Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Cidade *" error={errors.city}><Input value={f.city} onChange={set("city")} maxLength={80} /></Field>
          <Field label="UF *" error={errors.state}><Input value={f.state} onChange={set("state")} maxLength={2} /></Field>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-card">
        <span className="text-sm font-semibold">Quem paga os contratados? *</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setPayer("company")}
            className={`rounded-xl border p-4 text-left text-sm transition ${payer === "company" ? "border-primary bg-primary-soft" : "bg-card"}`}>
            <span className="block font-bold">Minha empresa paga diretamente</span>
            <span className="mt-1 block text-xs text-muted-foreground">Você acerta o valor com cada profissional por conta própria.</span>
          </button>
          <button type="button" onClick={() => setPayer("girajob")}
            className={`rounded-xl border p-4 text-left text-sm transition ${payer === "girajob" ? "border-primary bg-primary-soft" : "bg-card"}`}>
            <span className="block font-bold">A GiraJob paga por mim</span>
            <span className="mt-1 block text-xs text-muted-foreground">Você transfere o valor total à GiraJob (Pix ou boleto) e nós pagamos os contratados.</span>
          </button>
        </div>
        {payer === "girajob" && (
          <p className="rounded-xl bg-cta-soft px-3 py-2 text-sm font-semibold text-cta">
            Após as contratações, gere a cobrança na tela Pagamentos — você receberá a chave Pix ou o boleto para transferir o valor à GiraJob.
          </p>
        )}
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <Field label="Requisitos"><Textarea value={f.requirements} onChange={set("requirements")} maxLength={2000} /></Field>
        <Field label="Benefícios"><Textarea value={f.benefits} onChange={set("benefits")} maxLength={2000} /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
          <ImagePlus className="size-5" /> {banner ? "Trocar banner" : "Adicionar banner do evento"}
          <input type="file" accept="image/*" className="hidden" onChange={onBanner} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setPreview(true)}>Pré-visualizar</Button>
        {!editingLive && <Button variant="secondary" disabled={busy} onClick={() => save(false)}>Salvar rascunho</Button>}
        {editingLive
          ? <Button variant="cta" disabled={busy} onClick={() => save(false)}>Salvar alterações</Button>
          : <Button variant="cta" disabled={busy} onClick={() => save(true)}>Publicar vaga</Button>}
      </div>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent>
          <DialogHeader><DialogTitle>Como os profissionais verão</DialogTitle></DialogHeader>
          <JobCard job={{
            id: job?.id ?? "preview", title: f.title || "Título da vaga", venue_name: f.venue_name, city: f.city || "Cidade",
            state: f.state.toUpperCase() || "UF", starts_at: (shift?.starts_at ?? new Date()).toISOString(),
            ends_at: (shift?.ends_at ?? new Date()).toISOString(), pay_amount: f.pay_amount, status: "published",
            banner_url: banner, positions: f.positions, professional_categories: cat ? { name: cat.name } : null,
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
