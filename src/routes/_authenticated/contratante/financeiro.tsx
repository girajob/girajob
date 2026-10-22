import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Spinner, StatCard, StatusPill } from "@/components/gj";
import { PayInstructionsButton } from "@/components/pay-instructions";
import { useMe } from "@/lib/session";
import { brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — GiraJob" }] }),
  component: Financeiro,
});

const PAY_LABEL: Record<string, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", cancelled: "Cancelado" };
const SUB_LABEL: Record<string, string> = { pending: "Pendente", active: "Ativa", past_due: "Em atraso", cancelled: "Cancelada" };

function Financeiro() {
  const { data: me } = useMe();
  const companyId = me?.company?.id;

  const payments = useQuery({
    queryKey: ["my-payments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, kind, status, method, gross_amount, fee_amount, net_amount, total_charge, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const subs = useQuery({
    queryKey: ["my-subs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan, status, amount, current_period_end, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = payments.data ?? [];
  const totalPending = rows.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.total_charge || p.gross_amount), 0);
  const totalPaid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.total_charge || p.gross_amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Suas mensalidades e os pagamentos dos serviços contratados." />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="A pagar" value={brl(totalPending)} icon={CircleDollarSign} hint="listas de pagamento pendentes" />
        <StatCard label="Pago" value={brl(totalPaid)} icon={CircleDollarSign} />
      </div>
      <section>
        <h2 className="mb-3 text-lg font-extrabold">Mensalidades</h2>
        {subs.isLoading ? <Spinner /> : !subs.data?.length ? (
          <EmptyState icon={RefreshCcw} title="Nenhuma assinatura" text="Quando os planos forem ativados, suas mensalidades aparecem aqui." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Plano</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3">Vigência</th></tr>
              </thead>
              <tbody>
                {subs.data.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-semibold">{s.plan}</td>
                    <td className="p-3">{brl(s.amount)}</td>
                    <td className="p-3"><StatusPill status={s.status} label={SUB_LABEL[s.status]} /></td>
                    <td className="p-3">{s.current_period_end ? fmtDate(s.current_period_end) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-extrabold">Pagamentos de serviços</h2>
        {payments.isLoading ? <Spinner /> : !rows.length ? (
          <EmptyState icon={CircleDollarSign} title="Nenhum pagamento" text="Gere a lista de pagamento de uma vaga na tela Pagamentos." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Data</th><th className="p-3">Serviço</th><th className="p-3">Sua taxa</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{fmtDate(p.created_at)}</td>
                    <td className="p-3">{brl(p.gross_amount)}</td>
                    <td className="p-3">{brl(Number(p.total_charge || 0) - Number(p.gross_amount))}</td>
                    <td className="p-3 font-semibold">{brl(Number(p.total_charge || 0) || p.gross_amount)}</td>
                    <td className="p-3"><StatusPill status={p.status} label={PAY_LABEL[p.status]} /></td>
                    <td className="p-3">{p.status === "pending" && <PayInstructionsButton paymentId={p.id} />}</td>
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
