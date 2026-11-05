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
  const [view, setView] = useState<"board" | "list">("board");
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

  async function batchAction(ids: string[], action: Action) {
    let ok = 0; const fails: string[] = [];
    for (const appId of ids) {
      const { error } = action === "hire"
        ? await supabase.rpc("confirm_hire", { _app: appId })
        : await supabase.rpc("set_application_status", { _app: appId, _status: action });
      if (error) fails.push(errMsg(error)); else ok++;
    }
    if (ok) toast.success(`${ok} candidatura(s) atualizada(s)`);
    if (fails.length) toast.error(`${fails.length} não puderam ser atualizadas: ${fails[0]}`);
    refresh();
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
          <>
            <div className="mb-3 inline-flex rounded-lg border bg-card p-1 text-sm font-semibold">
              {(["board", "list"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {v === "board" ? "Quadro" : "Lista"}
                </button>
              ))}
            </div>
            {view === "board" ? (
              <ApplicantBoard apps={apps.data.filter((a) => !roleFilter || a.job_role_id === roleFilter)} onBatch={batchAction} />
            ) : (
              <div className="space-y-3">
                {apps.data.filter((a) => !roleFilter || a.job_role_id===roleFilter).map((a) => <Applicant key={a.application_id} a={a} onAction={appAction} />)}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

type Row = RoleApplicant;
type Action = "in_review" | "approved" | "rejected" | "hire";

const COLUMNS: { key: string; title: string; statuses: string[]; actions: { a: Action; label: string }[] }[] = [
  { key: "new", title: "Novos", statuses: ["applied"], actions: [{ a: "in_review", label: "Em análise" }, { a: "approved", label: "Aprovar" }, { a: "rejected", label: "Recusar" }] },
  { key: "review", title: "Em análise", statuses: ["in_review"], actions: [{ a: "approved", label: "Aprovar" }, { a: "rejected", label: "Recusar" }] },
  { key: "approved", title: "Aprovados", statuses: ["approved"], actions: [{ a: "hire", label: "Contratar" }, { a: "rejected", label: "Recusar" }] },
  { key: "hired", title: "Contratados", statuses: ["hired"], actions: [] },
  { key: "out", title: "Recusados / desistentes", statuses: ["rejected", "withdrawn"], actions: [] },
];

function ApplicantBoard({ apps, onBatch }: { apps: Row[]; onBatch: (ids: string[], a: Action) => Promise<void> }) {
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const toggle = (col: string, id: string) => setSel((s) => {
    const cur = s[col] ?? [];
    return { ...s, [col]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
  });
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((c) => {
        const items = apps.filter((a) => c.statuses.includes(a.status));
        const chosen = (sel[c.key] ?? []).filter((id) => items.some((i) => i.application_id === id));
        const allOn = items.length > 0 && chosen.length === items.length;
        return (
          <div key={c.key} className="w-64 shrink-0 rounded-2xl border bg-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">{c.title}</span>
              <span className="rounded-full bg-card px-2 text-xs font-semibold">{items.length}</span>
            </div>
            {c.actions.length > 0 && items.length > 0 && (
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={allOn}
                  onChange={() => setSel((s) => ({ ...s, [c.key]: allOn ? [] : items.map((i) => i.application_id) }))} />
                Selecionar todos
              </label>
            )}
            {chosen.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1 rounded-xl bg-card p-2">
                <span className="w-full text-xs font-semibold">{chosen.length} selecionado(s)</span>
                {c.actions.map((x) => (
                  <Button key={x.a} size="sm" disabled={busy} variant={x.a === "rejected" ? "ghost" : x.a === "hire" ? "cta" : "secondary"}
                    onClick={async () => { setBusy(true); await onBatch(chosen, x.a); setSel((s) => ({ ...s, [c.key]: [] })); setBusy(false); }}>
                    {x.label}
                  </Button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {items.map((a) => (
                <label key={a.application_id} className="block cursor-pointer rounded-xl border bg-card p-2 text-sm shadow-card">
                  <div className="flex items-start gap-2">
                    {c.actions.length > 0 && <input type="checkbox" className="mt-1" checked={chosen.includes(a.application_id)} onChange={() => toggle(c.key, a.application_id)} />}
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{a.full_name ?? "Profissional"}</div>
                      {a.role_label && <div className="text-xs font-semibold text-primary">{a.role_label} · {brl(a.role_pay_amount)}</div>}
                      <div className="text-xs text-muted-foreground">{a.avg_rating ? `★ ${a.avg_rating}` : "Sem avaliações"}{a.distance_km != null ? ` · ~${a.distance_km} km` : ""}</div>
                      {a.has_conflict && a.status !== "hired" && <div className="text-xs font-bold text-warning">Conflito de horário</div>}
                    </div>
                  </div>
                </label>
              ))}
              {!items.length && <p className="py-4 text-center text-xs text-muted-foreground">Vazio</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
