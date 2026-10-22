import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, Building2, CalendarCheck, FileText, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, Spinner, StatCard } from "@/components/gj";
import { JOB_STATUS_LABEL } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Painel administrativo — GiraJob" }] }),
  component: Admin,
});

type Stats = { users: number; contractors: number; professionals: number; jobs_published: number; applications: number; bookings: number; jobs_by_status: Record<string, number> };

function Admin() {
  const [f, setF] = useState({ city: "", state: "", from: "", to: "" });
  const q = useQuery({
    queryKey: ["admin-stats", f],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats", {
        _city: f.city || undefined, _state: f.state.toUpperCase() || undefined,
        _from: f.from ? new Date(f.from).toISOString() : undefined,
        _to: f.to ? new Date(new Date(f.to).getTime() + 864e5).toISOString() : undefined,
      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const s = q.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Painel administrativo" subtitle="Números reais da plataforma" />
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-4">
        <Field label="Cidade"><Input value={f.city} onChange={set("city")} /></Field>
        <Field label="UF"><Input value={f.state} onChange={set("state")} maxLength={2} /></Field>
        <Field label="De"><Input type="date" value={f.from} onChange={set("from")} /></Field>
        <Field label="Até"><Input type="date" value={f.to} onChange={set("to")} /></Field>
      </div>
      {q.isLoading || !s ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Usuários" value={s.users} icon={Users} />
            <StatCard label="Contratantes" value={s.contractors} icon={Building2} />
            <StatCard label="Profissionais" value={s.professionals} icon={User} />
            <StatCard label="Vagas publicadas" value={s.jobs_published} icon={Briefcase} />
            <StatCard label="Candidaturas" value={s.applications} icon={FileText} />
            <StatCard label="Contratações" value={s.bookings} icon={CalendarCheck} />
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <h2 className="mb-3 font-bold">Vagas por status</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={Object.entries(JOB_STATUS_LABEL).map(([k, l]) => ({ name: l, total: s.jobs_by_status[k] ?? 0 }))}>
                  <XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
