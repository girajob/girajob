import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, Tag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Spinner, StatusPill } from "@/components/gj";
import { jobQuery, myApplicationsQuery } from "@/lib/pro-queries";
import { useMediaUrl } from "@/lib/media";
import { brl, errMsg, fmtDate, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profissional/vagas/$id")({
  head: () => ({ meta: [{ title: "Detalhes da vaga — GiraJob" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const job = useQuery(jobQuery(id));
  const mine = useQuery(myApplicationsQuery);
  const banner = useMediaUrl(job.data?.banner_url);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.rpc("track_job_event", { _job: id, _type: "view" }); }, [id]);

  if (job.isLoading) return <Spinner />;
  const j = job.data;
  if (!j) return <EmptyState icon={Tag} title="Vaga não encontrada" />;
  const app = mine.data?.find((a) => a.job_id === id && a.status !== "withdrawn");
  const accepting = j.status === "published" && new Date(j.starts_at) > new Date()
    && (!j.application_deadline || new Date(j.application_deadline) > new Date());

  async function apply() {
    setBusy(true);
    const { error } = await supabase.rpc("apply_to_job", { _job: id, _message: msg });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    setOpen(false);
    toast.success("Candidatura enviada!");
    qc.invalidateQueries({ queryKey: ["my-applications"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/profissional/explorar" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" /> Voltar</Link>
      <div className="relative h-44 overflow-hidden rounded-3xl bg-hero">
        {banner && <img src={banner} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute left-4 top-4"><StatusPill status={j.status} /></div>
      </div>
      <div>
        <h1 className="text-3xl font-extrabold">{j.title}</h1>
        <p className="text-muted-foreground">{j.venue_name} · {j.companies?.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-3">
        <Info icon={CalendarDays} label="Data" value={fmtDate(j.starts_at)} />
        <Info icon={Clock} label="Horário" value={`${fmtTime(j.starts_at)}–${fmtTime(j.ends_at)}`} />
        <Info icon={MapPin} label="Local" value={`${j.city}/${j.state}`} />
        <Info icon={Tag} label="Categoria" value={j.professional_categories?.name ?? "Geral"} />
        <Info icon={Users} label="Vagas" value={String(j.positions)} />
        <div><div className="text-xs font-semibold text-muted-foreground">Remuneração</div><div className="font-display text-2xl font-extrabold text-cta">{brl(j.pay_amount)}</div></div>
      </div>
      {[["Descrição", j.description], ["Requisitos", j.requirements], ["Benefícios", j.benefits]].map(([t, v]) => v ? (
        <section key={t}><h2 className="mb-1 text-lg font-bold">{t}</h2><p className="whitespace-pre-line text-sm">{v}</p></section>
      ) : null)}
      {j.application_deadline && <p className="text-sm text-muted-foreground">Candidaturas até {fmtDate(j.application_deadline)} às {fmtTime(j.application_deadline)}</p>}
      <p className="text-xs text-muted-foreground">O endereço completo é informado após a contratação.</p>
      <div className="sticky bottom-20 md:bottom-4">
        {app ? (
          <div className="flex items-center gap-2 rounded-2xl bg-success-soft p-4 font-semibold text-success">
            <CheckCircle2 className="size-5" /> Você já se candidatou · <StatusPill status={app.status} />
          </div>
        ) : (
          <Button variant="cta" size="lg" className="w-full" disabled={!accepting}
            onClick={() => { setOpen(true); supabase.rpc("track_job_event", { _job: id, _type: "apply_started" }); }}>
            {accepting ? "Candidatar-se" : "Esta vaga não está aceitando candidaturas"}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar candidatura</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{j.title} · {fmtDate(j.starts_at)} {fmtTime(j.starts_at)}–{fmtTime(j.ends_at)} · {brl(j.pay_amount)}</p>
          <Textarea placeholder="Mensagem para o contratante (opcional)" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={1000} />
          <DialogFooter><Button variant="cta" disabled={busy} onClick={apply}>{busy ? "Enviando…" : "Enviar candidatura"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ icon: I, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><I className="size-3.5" />{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
