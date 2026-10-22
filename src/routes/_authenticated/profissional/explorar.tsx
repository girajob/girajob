import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState, Field, JobCard, PageHeader, Spinner } from "@/components/gj";
import { categoriesQuery, openJobsQuery } from "@/lib/pro-queries";
import { useMe } from "@/lib/session";
import { haversineKm } from "@/lib/jobs";
import { toDateInput } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profissional/explorar")({
  head: () => ({ meta: [{ title: "Explorar vagas — GiraJob" }] }),
  component: Explore,
});

const sel = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

function Explore() {
  const { data: me } = useMe();
  const jobs = useQuery(openJobsQuery);
  const cats = useQuery(categoriesQuery);
  const [f, setF] = useState({ cat: "", city: "", date: "", minPay: "", maxKm: "" });
  const p = me?.profile;
  const rows = useMemo(() => {
    return (jobs.data ?? [])
      .map((j) => ({
        j,
        km: p?.approx_lat != null && j.approx_lat != null ? haversineKm(+p.approx_lat, +p.approx_lng!, +j.approx_lat, +j.approx_lng!) : null,
      }))
      .filter(({ j, km }) =>
        (!f.cat || j.category_id === f.cat) &&
        (!f.city || j.city.toLowerCase().includes(f.city.toLowerCase())) &&
        (!f.date || toDateInput(j.starts_at) === f.date) &&
        (!f.minPay || Number(j.pay_amount) >= Number(f.minPay)) &&
        (!f.maxKm || (km != null && km <= Number(f.maxKm))));
  }, [jobs.data, f, p]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div>
      <PageHeader title="Explorar vagas" subtitle="Inclui oportunidades em outras cidades." />
      <div className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Categoria">
          <select className={sel} value={f.cat} onChange={set("cat")}>
            <option value="">Todas</option>
            {cats.data?.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Cidade"><Input value={f.city} onChange={set("city")} placeholder="Qualquer" /></Field>
        <Field label="Data"><Input type="date" value={f.date} onChange={set("date")} /></Field>
        <Field label="Pagamento mín."><Input type="number" min={0} value={f.minPay} onChange={set("minPay")} placeholder="R$" /></Field>
        <Field label="Distância máx." hint={p?.approx_lat == null ? "Ative a localização no perfil" : undefined}>
          <Input type="number" min={1} value={f.maxKm} onChange={set("maxKm")} placeholder="km" disabled={p?.approx_lat == null} />
        </Field>
        <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => setF({ cat: "", city: "", date: "", minPay: "", maxKm: "" })}>Limpar</Button></div>
      </div>
      {jobs.isLoading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={SearchX} title="Nenhuma vaga com esses filtros" text="Tente ampliar a busca." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ j, km }) => <JobCard key={j.id} job={j} distanceKm={km} />)}
        </div>
      )}
    </div>
  );
}
