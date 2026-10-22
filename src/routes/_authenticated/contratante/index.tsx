import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarDays, CheckCircle2, Eye, MousePointerClick, Target, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, PageHeader, Spinner, StatCard, StatusPill } from "@/components/gj";
import { useMe } from "@/lib/session";
import { companyEventsQuery, companyJobsQuery } from "@/lib/contractor-queries";
import { fillRate } from "@/lib/jobs";
import { fmtShift } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/")({
  head: () => ({ meta: [{ title: "Painel do contratante — GiraJob" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const cid = me?.company?.id ?? "";
  const jobs = useQuery({ ...companyJobsQuery(cid), enabled: !!cid });
  const events = useQuery({ ...companyEventsQuery(cid), enabled: !!cid });
  if (jobs.isLoading || !jobs.data) return <Spinner />;
  const list = jobs.data;
  const published = list.filter((j) => j.status !== "draft");
  const open = list.filter((j) => j.status === "published");
  const apps = list.flatMap((j) => j.applications);
  const selected = apps.filter((a) => a.status === "approved").length;
  const hired = list.flatMap((j) => j.bookings).filter((b) => b.status !== "cancelled").length;
  const goal = published.reduce((s, j) => s + j.positions, 0);
  const views = events.data?.filter((e) => e.event_type === "view").length ?? 0;
  const clicks = events.data?.filter((e) => e.event_type === "click" || e.event_type === "apply_started").length ?? 0;
  const upcoming = list.filter((j) => j.status !== "draft" && new Date(j.starts_at) > new Date())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)).slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader title={me?.company?.name ?? "Painel"} subtitle="Resumo das suas vagas"
        action={<Button asChild variant="cta"><Link to="/contratante/vagas/nova">Publicar vaga</Link></Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Publicadas" value={published.length} icon={Briefcase} />
        <StatCard label="Abertas" value={open.length} icon={CheckCircle2} />
        <StatCard label="Candidaturas" value={apps.length} icon={Users} />
        <StatCard label="Selecionados" value={selected} icon={UserCheck} />
        <StatCard label="Contratações" value={hired} icon={CalendarDays} />
        <StatCard label="Preenchimento" value={`${fillRate(hired, goal)}%`} icon={Target} hint={`${hired} de ${goal} vagas`} />
        <StatCard label="Visualizações" value={views} icon={Eye} hint="Únicas por pessoa/dia" />
        <StatCard label="Cliques" value={clicks} icon={MousePointerClick} />
      </div>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Próximos eventos</h2>
        {!upcoming.length ? (
          <EmptyState icon={CalendarDays} title="Nenhum evento futuro" text="Publique uma vaga para começar a receber candidatos."
            action={<Button asChild variant="cta"><Link to="/contratante/vagas/nova">Publicar vaga</Link></Button>} />
        ) : (
          <div className="space-y-3">
            {upcoming.map((j) => {
              const h = j.bookings.filter((b) => b.status !== "cancelled").length;
              return (
                <Link key={j.id} to="/contratante/vagas/$id" params={{ id: j.id }}
                  className="block rounded-2xl border bg-card p-4 shadow-card transition hover:border-primary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold">{j.title}</div>
                      <div className="text-sm text-muted-foreground">{fmtShift(j.starts_at, j.ends_at)} · {j.city}</div>
                    </div>
                    <StatusPill status={j.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                    <Progress value={fillRate(h, j.positions)} className="h-2" />
                    <span className="whitespace-nowrap">{h}/{j.positions}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
