import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgePercent, CircleDollarSign, CreditCard, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Spinner, StatCard, StatusPill } from "@/components/gj";
import { brl, errMsg, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — GiraJob" }] }),
  component: Financeiro,
});

type Stats = {
  payments_by_status: Record<string, number>;
  gross_pending: number; gross_paid: number; fees_paid: number;
  subscriptions_by_status: Record<string, number>;
  service_fee_pct: number;
  contractor_fee_pct: number;
};

const PAY_LABEL: Record<string, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", cancelled: "Cancelado" };
const SUB_LABEL: Record<string, string> = { pending: "Pendente", active: "Ativa", past_due: "Em atraso", cancelled: "Cancelada" };

function Financeiro() {
  const qc = useQueryClient();
  const [fee, setFee] = useState("");
  const [conFee, setConFee] = useState("");
  const stats = useQuery({
    queryKey: ["admin-fin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_financial_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, kind, status, method, gross_amount, fee_amount, net_amount, created_at, companies(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const subs = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan, status, amount, current_period_end, companies(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function saveFee(key: "service_fee_pct" | "contractor_fee_pct", raw: string, clear: () => void) {
    const pct = Number(raw.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { toast.error("Informe um percentual entre 0 e 100"); return; }
    const { error } = await supabase.rpc("set_platform_setting", { _key: key, _value: pct });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Taxa atualizada");
    clear();
    qc.invalidateQueries({ queryKey: ["admin-fin"] });
  }

  const s = stats.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Pagamentos de serviços, assinaturas e taxa da plataforma" />
      {stats.isLoading || !s ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="A receber (bruto)" value={brl(s.gross_pending)} icon={CircleDollarSign} hint={`${s.payments_by_status["pending"] ?? 0} pagamento(s) pendente(s)`} />
            <StatCard label="Recebido (bruto)" value={brl(s.gross_paid)} icon={CreditCard} />
            <StatCard label="Taxas recebidas" value={brl(s.fees_paid)} icon={BadgePercent} />
            <StatCard label="Assinaturas ativas" value={s.subscriptions_by_status["active"] ?? 0} icon={RefreshCcw} hint={`${s.subscriptions_by_status["pending"] ?? 0} pendente(s)`} />
          </div>
          <form onSubmit={saveFee} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-card">
            <Field label="Taxa da plataforma sobre serviços (%)" hint={`Atual: ${s.service_fee_pct}% — aplicada nas próximas listas de pagamento geradas`}>
              <Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder={String(s.service_fee_pct)} className="w-32" inputMode="decimal" />
            </Field>
            <Button variant="cta" disabled={!fee.trim()}>Salvar taxa</Button>
          </form>
        </>
      )}
      <section>
        <h2 className="mb-3 text-lg font-extrabold">Pagamentos</h2>
        {payments.isLoading ? <Spinner /> : !payments.data?.length ? (
          <EmptyState icon={CircleDollarSign} title="Nenhum pagamento ainda" text="As listas de pagamento geradas pelos contratantes aparecem aqui." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Empresa</th><th className="p-3">Tipo</th><th className="p-3">Bruto</th><th className="p-3">Taxa</th><th className="p-3">Líquido</th><th className="p-3">Status</th><th className="p-3">Data</th></tr>
              </thead>
              <tbody>
                {payments.data.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-semibold">{p.companies?.name ?? "—"}</td>
                    <td className="p-3">{p.kind === "service" ? "Serviço" : "Assinatura"}</td>
                    <td className="p-3">{brl(p.gross_amount)}</td>
                    <td className="p-3">{brl(p.fee_amount)}</td>
                    <td className="p-3">{brl(p.net_amount)}</td>
                    <td className="p-3"><StatusPill status={p.status} label={PAY_LABEL[p.status]} /></td>
                    <td className="p-3">{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-extrabold">Assinaturas</h2>
        {subs.isLoading ? <Spinner /> : !subs.data?.length ? (
          <EmptyState icon={RefreshCcw} title="Nenhuma assinatura" text="Os planos dos contratantes aparecem aqui quando a cobrança for ativada." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Empresa</th><th className="p-3">Plano</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3">Vigência</th></tr>
              </thead>
              <tbody>
                {subs.data.map((s2) => (
                  <tr key={s2.id} className="border-t">
                    <td className="p-3 font-semibold">{s2.companies?.name ?? "—"}</td>
                    <td className="p-3">{s2.plan}</td>
                    <td className="p-3">{brl(s2.amount)}</td>
                    <td className="p-3"><StatusPill status={s2.status} label={SUB_LABEL[s2.status]} /></td>
                    <td className="p-3">{s2.current_period_end ? fmtDate(s2.current_period_end) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
