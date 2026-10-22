import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { Progress } from "@/components/ui/progress";
import { useMe } from "@/lib/session";
import { companyJobsQuery } from "@/lib/contractor-queries";
import { fillRate, JOB_STATUS_LABEL } from "@/lib/jobs";
import { brl, fmtShift } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contratante/vagas/")({
  head: () => ({ meta: [{ title: "Minhas vagas — GiraJob" }] }),
  component: Jobs,
});

function Jobs() {
  const { data: me } = useMe();
  const cid = me?.company?.id ?? "";
  const q = useQuery({ ...companyJobsQuery(cid), enabled: !!cid });
  const [tab, setTab] = useState<string>("all");
  if (q.isLoading || !q.data) return <Spinner />;
  const rows = q.data.filter((j) => tab === "all" || j.status === tab);
  return (
    <div>
      <PageHeader title="Minhas vagas" action={<Button asChild variant="cta"><Link to="/contratante/vagas/nova">Nova vaga</Link></Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "draft", "published", "paused", "filled", "closed"].map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={cn("rounded-full border px-3 py-1 text-sm font-semibold", tab === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {s === "all" ? "Todas" : JOB_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {!rows.length ? <EmptyState icon={Briefcase} title="Nenhuma vaga aqui" /> : (
        <div className="space-y-3">
          {rows.map((j) => {
            const h = j.bookings.filter((b) => b.status !== "cancelled").length;
            return (
              <Link key={j.id} to="/contratante/vagas/$id" params={{ id: j.id }} className="block rounded-2xl border bg-card p-4 shadow-card hover:border-primary">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold">{j.title}</div>
                    <div className="text-sm text-muted-foreground">{fmtShift(j.starts_at, j.ends_at)} · {j.city}/{j.state} · {brl(j.pay_amount)}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold">{j.applications.length} candidatos</span>
                    <StatusPill status={j.status} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                  <Progress value={fillRate(h, j.positions)} className="h-2" /><span>{h}/{j.positions}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
