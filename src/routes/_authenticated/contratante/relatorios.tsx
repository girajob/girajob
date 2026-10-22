import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChartColumn, CircleDollarSign, LogIn, Plus, Trash2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { brl, errMsg, fmtDate, fmtShift } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contratante/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios de eventos — GiraJob" }] }),
  component: Relatorios,
});

type Row = {
  job_id: string; title: string; starts_at: string; status: string; positions: number;
  hired: number; checkins: number; labor_cost: number; pro_payout: number; fees: number;
  revenue: number; balance: number;
};

type Revenue = { id: string; description: string; amount: number; created_at: string };

function Relatorios() {
  const qc = useQueryClient();
  const report = useQuery({
    queryKey: ["contractor-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contractor_events_report");
      if (error) throw error;
      return data as Row[];
    },
  });
  const [open, setOpen] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const revenues = useQuery({
    queryKey: ["event-revenues", open],
    enabled: !!open,
    queryFn: async () => {
      const { data, error } = await supabase.from("event_revenues").select("id, description, amount, created_at").eq("job_id", open!).order("created_at");
      if (error) throw error;
      return data as Revenue[];
    },
  });

  async function addRevenue(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    const { error } = await supabase.rpc("add_event_revenue", { _job: open!, _description: desc, _amount: value });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Receita registrada");
    setDesc(""); setAmount("");
    qc.invalidateQueries({ queryKey: ["event-revenues", open] });
    qc.invalidateQueries({ queryKey: ["contractor-report"] });
  }

  async function removeRevenue(id: string) {
    const { error } = await supabase.rpc("delete_event_revenue", { _id: id });
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["event-revenues", open] });
    qc.invalidateQueries({ queryKey: ["contractor-report"] });
  }

  const rows = report.data ?? [];
  const tot = rows.reduce((a, r) => ({
    cost: a.cost + Number(r.labor_cost), rev: a.rev + Number(r.revenue), bal: a.bal + Number(r.balance),
    hired: a.hired + Number(r.hired), checkins: a.checkins + Number(r.checkins),
  }), { cost: 0, rev: 0, bal: 0, hired: 0, checkins: 0 });
  const done = rows.filter((r) => new Date(r.starts_at) < new Date()).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios de eventos" subtitle="Equipe contratada, custos, receitas e resultado de cada evento." />
      {report.isLoading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={ChartColumn} title="Nenhum evento ainda" text="Publique uma vaga e contrate profissionais para ver a análise aqui." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 shadow-card"><div className="text-xs font-semibold uppercase text-muted-foreground">Eventos</div><div className="mt-1 font-display text-2xl font-extrabold">{rows.length}</div><div className="text-xs text-muted-foreground">{done} já realizados</div></div>
            <div className="rounded-2xl border bg-card p-4 shadow-card"><div className="text-xs font-semibold uppercase text-muted-foreground">Equipe</div><div className="mt-1 font-display text-2xl font-extrabold">{tot.hired}</div><div className="text-xs text-muted-foreground">{tot.checkins} entradas validadas</div></div>
            <div className="rounded-2xl border bg-card p-4 shadow-card"><div className="text-xs font-semibold uppercase text-muted-foreground">Custos</div><div className="mt-1 font-display text-2xl font-extrabold">{brl(tot.cost)}</div><div className="text-xs text-muted-foreground">equipe + taxas</div></div>
            <div className="rounded-2xl border bg-card p-4 shadow-card"><div className="text-xs font-semibold uppercase text-muted-foreground">Resultado</div><div className={cn("mt-1 font-display text-2xl font-extrabold", tot.bal >= 0 ? "text-success" : "text-destructive")}>{brl(tot.bal)}</div><div className="text-xs text-muted-foreground">receitas {brl(tot.rev)} − custos</div></div>
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.job_id} className="animate-rise rounded-2xl border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-bold">{r.title} <StatusPill status={r.status} /></div>
                    <div className="text-sm text-muted-foreground">{fmtDate(r.starts_at)}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpen(open === r.job_id ? null : r.job_id)}>
                    <CircleDollarSign /> {open === r.job_id ? "Fechar" : "Receitas e custos"}
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <span className="flex items-center gap-1.5"><Users className="size-4 text-primary" />{r.hired}/{r.positions} contratados</span>
                  <span className="flex items-center gap-1.5"><LogIn className="size-4 text-primary" />{r.checkins} entradas</span>
                  <span className="flex items-center gap-1.5"><TrendingDown className="size-4 text-destructive" />Custo {brl(r.labor_cost)}</span>
                  <span className={cn("flex items-center gap-1.5 font-bold", r.balance >= 0 ? "text-success" : "text-destructive")}>
                    <TrendingUp className="size-4" />{brl(r.balance)}
                  </span>
                </div>
                {open === r.job_id && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-muted p-3">Pagamento à equipe: <strong>{brl(r.pro_payout)}</strong></div>
                      <div className="rounded-xl bg-muted p-3">Taxas da plataforma: <strong>{brl(r.fees)}</strong></div>
                      <div className="rounded-xl bg-muted p-3">Custo total: <strong>{brl(r.labor_cost)}</strong></div>
                    </div>
                    <h3 className="font-bold">Receitas do evento</h3>
                    {revenues.isLoading ? <Spinner /> : !revenues.data?.length ? (
                      <p className="text-sm text-muted-foreground">Nenhuma receita registrada. Adicione abaixo (bilheteria, bar, patrocínio…).</p>
                    ) : (
                      <div className="space-y-2">
                        {revenues.data.map((v) => (
                          <div key={v.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                            <span>{v.description}</span>
                            <span className="flex items-center gap-2 font-bold">{brl(v.amount)}
                              <button onClick={() => removeRevenue(v.id)} aria-label="Remover" className="text-destructive"><Trash2 className="size-4" /></button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={addRevenue} className="flex flex-wrap items-end gap-2">
                      <Field label="Descrição"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Bilheteria" maxLength={80} /></Field>
                      <Field label="Valor (R$)"><Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" className="w-28" /></Field>
                      <Button variant="cta" disabled={!desc.trim() || !amount.trim()}><Plus /> Adicionar</Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
