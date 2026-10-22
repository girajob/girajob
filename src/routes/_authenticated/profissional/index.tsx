import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Compass, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, JobCard, Spinner } from "@/components/gj";
import { useMe } from "@/lib/session";
import { myBookingsQuery, openJobsQuery } from "@/lib/pro-queries";
import { fmtShift } from "@/lib/format";
import { haversineKm, PROFILE_STATUS_LABEL } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/profissional/")({
  head: () => ({ meta: [{ title: "Início — GiraJob" }] }),
  component: ProHome,
});

function ProHome() {
  const { data: me } = useMe();
  const jobs = useQuery(openJobsQuery);
  const bookings = useQuery(myBookingsQuery);
  const p = me?.profile;
  const next = bookings.data?.find((b) => b.status === "confirmed" && new Date(b.ends_at) > new Date());
  return (
    <div className="space-y-8">
      <section className="animate-rise rounded-3xl bg-hero p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Olá, {p?.full_name?.split(" ")[0] ?? "profissional"} 👋</p>
        <h1 className="mt-1 text-3xl font-extrabold">Bora girar uma renda hoje?</h1>
        {p && p.status !== "approved" && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-card/15 px-3 py-1 text-xs font-bold">
            <Hourglass className="size-3.5" /> {PROFILE_STATUS_LABEL[p.status]}
          </p>
        )}
        {next && (
          <Link to="/profissional/agenda" className="mt-5 block rounded-2xl bg-card p-4 text-card-foreground">
            <span className="flex items-center gap-2 text-xs font-bold text-cta"><CalendarCheck className="size-4" /> Próximo trabalho</span>
            <span className="mt-1 block font-bold">{next.jobs?.title}</span>
            <span className="text-sm text-muted-foreground">{fmtShift(next.starts_at, next.ends_at)}</span>
          </Link>
        )}
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Vagas abertas</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/profissional/explorar">Ver todas</Link></Button>
        </div>
        {jobs.isLoading ? <Spinner /> : !jobs.data?.length ? (
          <EmptyState icon={Compass} title="Nenhuma vaga aberta agora" text="Novas oportunidades aparecem aqui assim que forem publicadas." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.data.slice(0, 6).map((j) => (
              <JobCard key={j.id} job={j}
                distanceKm={p?.approx_lat != null && j.approx_lat != null ? haversineKm(+p.approx_lat, +p.approx_lng!, +j.approx_lat, +j.approx_lng!) : null} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
