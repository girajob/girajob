import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CircleDollarSign, MapPin, Pencil, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { applicantsQuery, type RoleApplicant } from "@/lib/contractor-queries";
import { useState } from "react";
import { jobQuery } from "@/lib/pro-queries";
import { StatusHistory } from "@/components/status-history";
import { useMediaUrl } from "@/lib/media";
import { brl, errMsg, fmtShift } from "@/lib/format";
import { fillRate } from "@/lib/jobs";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/contratante/vagas/$id")({
  head: () => ({ meta: [{ title: "Gerenciar vaga — GiraJob" }] }),
  component: ManageJob,
});

type JobStatus = Database["public"]["Enums"]["job_status"];

function ManageJob() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const job = useQuery(jobQuery(id));
  const apps = useQuery(applicantsQuery(id));
  const [roleFilter, setRoleFilter] = useState("");
  const refresh = () => { qc.invalidateQueries(); };

  async function setStatus(status: JobStatus) {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Vaga atualizada"); refresh();
  }
  async function appAction(appId: string, action: "in_review" | "approved" | "rejected" | "hire") {
    const { error } = action === "hire"
      ? await supabase.rpc("confirm_hire", { _app: appId })
      : await supabase.rpc("set_application_status", { _app: appId, _status: action });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(action === "hire" ? "Contratação confirmada!" : "Candidatura atualizada"); refresh();
  }

  if (job.isLoading) return <Spinner />;
  const j = job.data;
  if (!j) return <EmptyState icon={Users} title="Vaga não encontrada" />;
  const hired = apps.data?.filter((a) => a.status === "hired").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title={j.title} subtitle={`${fmtShift(j.starts_at, j.ends_at)} · ${j.city}/${j.state} · ${brl(j.pay_amount)}`}
        action={<StatusPill status={j.status} />} />
      <div className="flex flex-wrap gap-2">
        {j.status !== "closed" && (
          <Button asChild variant="outline"><Link to="/contratante/vagas/$id/editar" params={{ id }}><Pencil /> Editar</Link></Button>
        )}
        <Button asChild variant="outline"><Link to="/contratante/pagamentos"><CircleDollarSign /> Pagamentos</Link></Button>
        {j.status === "draft" && <Button variant="cta" onClick={() => setStatus("published")}>Publicar</Button>}
        {j.status === "published" && <Button variant="secondary" onClick={() => setStatus("paused")}>Pausar</Button>}
        {j.status === "paused" && <Button variant="cta" onClick={() => setStatus("published")}>Reabrir</Button>}
        {j.status !== "closed" && j.status !== "draft" && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive">Encerrar</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar esta vaga?</AlertDialogTitle>
                <AlertDialogDescription>Ela deixará de aceitar candidaturas e não poderá ser reaberta.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStatus("closed")}>Encerrar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Preenchimento</span><span>{hired}/{j.positions}</span></div>
        <Progress value={fillRate(hired, j.positions)} />
      </div>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Candidatos</h2>
        {!!apps.data?.some((a) => a.job_role_id) && <select aria-label="Filtrar candidatos por cargo" className="mb-3 h-10 rounded-lg border border-input bg-card px-3 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="">Todos os cargos</option>{Array.from(new Map(apps.data.filter((a) => a.job_role_id).map((a) => [a.job_role_id,a.role_label])).entries()).map(([id,label]) => <option key={id} value={id ?? ""}>{label}</option>)}</select>}
        {apps.isLoading ? <Spinner /> : !apps.data?.length ? (
          <EmptyState icon={Users} title="Nenhum candidato ainda" text="Quando alguém se candidatar, aparecerá aqui." />
        ) : (
          <div className="space-y-3">
            {apps.data.filter((a) => !roleFilter || a.job_role_id===roleFilter).map((a) => <Applicant key={a.application_id} a={a} onAction={appAction} />)}
          </div>
        )}
      </section>
    </div>
  );
}

type Row = RoleApplicant;

function Applicant({ a, onAction }: { a: Row; onAction: (id: string, act: "in_review" | "approved" | "rejected" | "hire") => void }) {
  const avatar = useMediaUrl(a.avatar_url);
  const locked = a.status === "hired" || a.status === "rejected";
  return (
    <div className="animate-rise rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft font-display text-xl font-extrabold text-primary">
          {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : (a.full_name ?? "?").charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{a.full_name ?? "Profissional"}</span>
            <StatusPill status={a.status} />
          </div>
          {a.role_label && <div className="mt-1 text-sm font-semibold text-primary">{a.role_label} · {brl(a.role_pay_amount)} · {fmtShift(a.role_starts_at,a.role_starts_at).split("–")[0]}</div>}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-3.5" />{a.city ?? "—"}{a.state ? `/${a.state}` : ""}{a.distance_km != null ? ` · ~${a.distance_km} km` : ""}</span>
            <span className="flex items-center gap-1"><Star className="size-3.5" />{a.avg_rating ?? "Sem avaliações"}</span>
          </div>
          {!!a.categories?.length && <div className="mt-2 flex flex-wrap gap-1">{a.categories.map((c) => <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{c}</span>)}</div>}
          {a.message && <p className="mt-2 text-sm">“{a.message}”</p>}
          <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-primary">Histórico</summary><StatusHistory entity="application" id={a.application_id} /></details>
          {a.has_conflict && a.status !== "hired" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-warning"><AlertTriangle className="size-3.5" /> Já tem outro trabalho confirmado nesse horário</p>
          )}
        </div>
      </div>
      {!locked && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {a.status === "applied" && <Button size="sm" variant="outline" onClick={() => onAction(a.application_id, "in_review")}>Em análise</Button>}
          {a.status !== "approved" && <Button size="sm" variant="secondary" onClick={() => onAction(a.application_id, "approved")}>Aprovar</Button>}
          {a.status === "approved" && <Button size="sm" variant="cta" onClick={() => onAction(a.application_id, "hire")}>Confirmar contratação</Button>}
          <Button size="sm" variant="ghost" onClick={() => onAction(a.application_id, "rejected")}>Recusar</Button>
        </div>
      )}
    </div>
  );
}
