import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CircleDollarSign, LogIn, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { useMe } from "@/lib/session";
import { companyJobsQuery } from "@/lib/contractor-queries";
import { brl, errMsg, fmtShift, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — GiraJob" }] }),
  component: Payments,
});

type Row = {
  booking_id: string; professional_name: string; booking_status: string;
  checked_in_at: string | null; gross: number; payment_id: string | null;
  payment_status: string | null; fee: number | null; net: number | null;
  pro_fee: number | null; contractor_fee: number | null; total_charge: number | null;
};

const PAY_LABEL: Record<string, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", cancelled: "Cancelado" };

function Payments() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const jobs = useQuery({ ...companyJobsQuery(me?.company?.id ?? ""), enabled: !!me?.company?.id });
  const [jobId, setJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["payment-list", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("job_payment_list", { _job: jobId! });
      if (error) throw error;
      return data as Row[];
    },
  });

  async function generate() {
    if (!jobId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("generate_payment_list", { _job: jobId });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(data > 0 ? `${data} pagamento(s) gerado(s)` : "Nenhum pagamento novo — todos já estavam na lista");
    qc.invalidateQueries({ queryKey: ["payment-list", jobId] });
  }

  const withHires = jobs.data?.filter((j) => (j.bookings ?? []).some((b) => b.status !== "cancelled")) ?? [];
  const selected = jobs.data?.find((j) => j.id === jobId);
  const rows = list.data ?? [];
  const pendingCheckin = rows.filter((r) => !r.checked_in_at).length;
  const totalGross = rows.filter((r) => r.payment_id).reduce((s, r) => s + Number(r.gross), 0);
  const totalNet = rows.filter((r) => r.payment_id).reduce((s, r) => s + Number(r.net ?? 0), 0);
  const totalCharge = rows.filter((r) => r.payment_id).reduce((s, r) => s + Number(r.total_charge ?? r.gross), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Pagamentos" subtitle="Gere a lista de pagamento de cada vaga a partir das entradas validadas por QR Code." />
      {jobs.isLoading ? <Spinner /> : !withHires.length ? (
        <EmptyState icon={Wallet} title="Nenhuma contratação ainda" text="Quando você contratar profissionais para uma vaga, ela aparece aqui." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {withHires.map((j) => (
              <button key={j.id} onClick={() => setJobId(j.id)}
                className={`rounded-xl border px-4 py-2 text-left text-sm font-semibold shadow-card transition ${jobId === j.id ? "border-primary bg-primary-soft text-primary" : "bg-card"}`}>
                {j.title}
                <span className="block text-xs font-normal text-muted-foreground">{fmtShift(j.starts_at, j.ends_at)}</span>
              </button>
            ))}
          </div>
          {!jobId ? (
            <EmptyState icon={CircleDollarSign} title="Selecione uma vaga" text="Escolha acima a vaga para ver contratados, entradas e gerar a lista de pagamento." />
          ) : list.isLoading ? <Spinner /> : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
                <div>
                  <div className="font-bold">{selected?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {rows.length} contratado(s) · {rows.length - pendingCheckin} com entrada validada
                    {pendingCheckin > 0 && ` · ${pendingCheckin} aguardando check-in`}
                  </div>
                </div>
                <Button variant="cta" onClick={generate} disabled={busy || rows.every((r) => r.payment_id) || rows.every((r) => !r.checked_in_at)}>
                  <CircleDollarSign /> {busy ? "Gerando…" : "Gerar lista de pagamento"}
                </Button>
              </div>
              {!rows.length ? (
                <EmptyState icon={Wallet} title="Nenhum contratado nesta vaga" />
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.booking_id} className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
                      <div>
                        <div className="font-bold">{r.professional_name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          {r.checked_in_at ? (
                            <span className="flex items-center gap-1 font-semibold text-success"><LogIn className="size-3.5" /> Entrada às {fmtTime(r.checked_in_at)}</span>
                          ) : (
                            <span className="text-warning">Entrada ainda não registrada</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold">{brl(r.gross)}</div>
                        {r.payment_id ? (
                          <div className="text-xs text-muted-foreground">
                            profissional recebe {brl(r.net ?? 0)} (taxa {brl(r.pro_fee ?? 0)}) · sua taxa {brl(r.contractor_fee ?? 0)} · <strong>total a pagar {brl(r.total_charge ?? r.gross)}</strong>{" "}
                            <StatusPill status={r.payment_status ?? "pending"} label={PAY_LABEL[r.payment_status ?? "pending"]} />
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">fora da lista de pagamento</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {totalGross > 0 && (
                    <div className="flex flex-wrap justify-between gap-2 rounded-2xl bg-primary-soft p-4 text-primary">
                      <span className="font-bold">Total da lista</span>
                      <span className="font-display font-extrabold">{brl(totalGross)} bruto · {brl(totalNet)} líquido</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Os pagamentos ficam como “Pendente” até a integração com o provedor de cobrança (Pix/boleto). Nenhum valor é movimentado nesta fase.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
