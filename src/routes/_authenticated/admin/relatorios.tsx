import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgePercent, CalendarCheck, CircleDollarSign, LogIn, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Spinner, StatCard } from "@/components/gj";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatório de receitas — GiraJob" }] }),
  component: Relatorios,
});

type Report = {
  gmv: number; revenue: number; revenue_pending: number; revenue_paid: number;
  pro_fees: number; contractor_fees: number;
  payments_count: number; checkins: number; bookings: number;
  by_company: { name: string; gmv: number; revenue: number; n: number }[];
};

function Relatorios() {
  const [f, setF] = useState({ from: "", to: "" });
  const q = useQuery({
    queryKey: ["admin-revenue", f],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_revenue_report", {
        ...(f.from ? { _from: new Date(f.from).toISOString() } : {}),
        ...(f.to ? { _to: new Date(new Date(f.to).getTime() + 864e5).toISOString() } : {}),
      });
      if (error) throw error;
      return data as unknown as Report;
    },
  });
  const r = q.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Relatório de receitas" subtitle="Quanto a plataforma ganha com as operações, por período" />
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2">
        <Field label="De"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Até"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      </div>
      {q.isLoading || !r ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Receita da plataforma" value={brl(r.revenue)} icon={TrendingUp} hint={`${brl(r.revenue_paid)} recebidos · ${brl(r.revenue_pending)} pendentes`} />
            <StatCard label="Volume movimentado" value={brl(r.gmv)} icon={CircleDollarSign} hint="soma dos serviços contratados" />
            <StatCard label="Operações" value={r.payments_count} icon={Wallet} hint={`${r.bookings} contratações · ${r.checkins} entradas validadas`} />
            <StatCard label="Taxas dos profissionais" value={brl(r.pro_fees)} icon={BadgePercent} hint="descontadas do valor pago ao profissional" />
            <StatCard label="Taxas dos contratantes" value={brl(r.contractor_fees)} icon={BadgePercent} hint="somadas ao valor cobrado da empresa" />
            <StatCard label="Entradas validadas" value={r.checkins} icon={LogIn} hint="check-ins por QR Code no período" />
          </div>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><CalendarCheck className="size-5" /> Receita por empresa</h2>
            {!r.by_company.length ? (
              <EmptyState icon={CircleDollarSign} title="Nenhuma operação no período" text="Quando listas de pagamento forem geradas, a receita por empresa aparece aqui." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Empresa</th><th className="p-3">Operações</th><th className="p-3">Volume</th><th className="p-3">Receita (taxas)</th></tr>
                  </thead>
                  <tbody>
                    {r.by_company.map((c) => (
                      <tr key={c.name} className="border-t">
                        <td className="p-3 font-semibold">{c.name}</td>
                        <td className="p-3">{c.n}</td>
                        <td className="p-3">{brl(c.gmv)}</td>
                        <td className="p-3 font-bold text-primary">{brl(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
