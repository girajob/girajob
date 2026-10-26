import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { myApplicationsQuery } from "@/lib/pro-queries";
import { brl, errMsg, fmtShift } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profissional/candidaturas")({
  head: () => ({ meta: [{ title: "Minhas candidaturas — GiraJob" }] }),
  component: Apps,
});

function Apps() {
  const q = useQuery(myApplicationsQuery);
  const qc = useQueryClient();
  async function withdraw(id: string) {
    const { error } = await supabase.rpc("withdraw_application", { _app: id });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Candidatura retirada");
    qc.invalidateQueries({ queryKey: ["my-applications"] });
  }
  return (
    <div>
      <PageHeader title="Minhas candidaturas" />
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon={FileText} title="Você ainda não se candidatou" text="Explore as vagas e envie sua primeira candidatura."
          action={<Button asChild variant="cta"><Link to="/profissional/explorar">Explorar vagas</Link></Button>} />
      ) : (
        <div className="space-y-3">
          {q.data.map((a) => a.jobs && (
            <div key={a.id} className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
              <Link to="/profissional/vagas/$id" params={{ id: a.job_id }} className="min-w-0">
                <div className="font-bold">{a.jobs.title}</div>
                {a.job_roles && <div className="font-semibold text-primary">{a.job_roles.label} · entrada {a.job_roles.entry_time?.slice(0,5)}</div>}
                <div className="text-sm text-muted-foreground">{fmtShift(a.jobs.starts_at, a.jobs.ends_at)} · {a.jobs.city} · {brl(a.job_roles?.pay_amount ?? a.jobs.pay_amount)}</div>
              </Link>
              <div className="flex items-center gap-2">
                <StatusPill status={a.status} />
                {["applied", "in_review", "approved"].includes(a.status) && (
                  <Button size="sm" variant="ghost" onClick={() => withdraw(a.id)}>Retirar</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
