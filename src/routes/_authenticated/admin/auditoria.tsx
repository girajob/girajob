import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, CircleCheck, ScrollText, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { brl, errMsg, fmtDate, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  head: () => ({ meta: [{ title: "Clientes e auditoria — GiraJob" }] }),
  component: Auditoria,
});

type Client = {
  company_id: string;
  company_name: string;
  owner_name: string | null;
  owner_email: string | null;
  city: string | null;
  state: string | null;
  blocked: boolean;
  blocked_reason: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  current_period_end: string | null;
  pending_amount: number;
  paid_total: number;
  last_payment_at: string | null;
  seller_name: string | null;
};

const SUB_LABEL: Record<string, string> = { pending: "Pendente", active: "Ativa", past_due: "Em atraso", cancelled: "Cancelada" };

const ACTION_LABEL: Record<string, string> = {
  qr_scanned: "QR Code verificado",
  check_in: "Entrada registrada",
  payment_list_generated: "Lista de pagamento gerada",
  setting_changed: "Configuração alterada",
  hire_confirmed: "Contratação confirmada",
  application_status: "Status de candidatura alterado",
  company_blocked: "Empresa bloqueada",
  company_unblocked: "Empresa desbloqueada",
  role_granted: "Papel concedido",
  payout_requested: "Repasse GiraJob solicitado",
};

function Auditoria() {
  const qc = useQueryClient();
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_client_status");
      if (error) throw error;
      return data as Client[];
    },
  });

  const logs = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, details, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function setBlocked(companyId: string, blocked: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("set_company_blocked", {
      _company: companyId,
      _blocked: blocked,
      _reason: blocked ? reason.trim() || "Mensalidade em atraso" : undefined,
    });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(blocked ? "Cliente bloqueado" : "Cliente desbloqueado");
    setBlockingId(null);
    setReason("");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
  }

  function situation(c: Client): { status: string; label: string } {
    if (c.blocked) return { status: "blocked", label: "Bloqueado" };
    if (Number(c.pending_amount) > 0 || c.subscription_status === "past_due") return { status: "paused", label: "Inadimplente" };
    return { status: "published", label: "Adimplente" };
  }

  const rows = clients.data ?? [];
  const inadimplentes = rows.filter((c) => situation(c).label !== "Adimplente").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes e auditoria"
        subtitle="Situação financeira de cada contratante: quem está em dia, quem deve e quem está bloqueado."
      />
      {clients.isLoading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={CircleCheck} title="Nenhum cliente ainda" text="As empresas cadastradas aparecem aqui com a situação de pagamento." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {rows.length} cliente(s) · <strong className="text-warning">{inadimplentes} com pendências ou bloqueio</strong>
          </p>
          <div className="space-y-3">
            {rows.map((c) => {
              const sit = situation(c);
              return (
                <div key={c.company_id} className="animate-rise space-y-3 rounded-2xl border bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{c.company_name}</span>
                        <StatusPill status={sit.status} label={sit.label} />
                        {c.subscription_status && (
                          <StatusPill
                            status={c.subscription_status === "active" ? "published" : c.subscription_status === "past_due" ? "paused" : "draft"}
                            label={`Assinatura ${SUB_LABEL[c.subscription_status] ?? c.subscription_status}`}
                          />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.owner_name ?? "—"} · {c.owner_email ?? "—"}
                        {c.city ? ` · ${c.city}/${c.state}` : ""}
                        {c.seller_name ? ` · Vendedor: ${c.seller_name}` : ""}
                      </div>
                      {c.blocked && c.blocked_reason && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                          <ShieldAlert className="size-3.5" /> Motivo do bloqueio: {c.blocked_reason}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div>
                        Pendente: <strong className={Number(c.pending_amount) > 0 ? "text-warning" : ""}>{brl(c.pending_amount)}</strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pago: {brl(c.paid_total)}
                        {c.last_payment_at ? ` · último em ${fmtDate(c.last_payment_at)}` : ""}
                        {c.current_period_end ? ` · vigência até ${fmtDate(c.current_period_end)}` : ""}
                      </div>
                    </div>
                  </div>
                  {blockingId === c.company_id ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3">
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo do bloqueio (ex.: mensalidade em atraso)"
                        className="max-w-sm"
                      />
                      <Button variant="destructive" size="sm" disabled={busy} onClick={() => setBlocked(c.company_id, true)}>
                        <Ban className="size-4" /> Confirmar bloqueio
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setBlockingId(null); setReason(""); }}>Cancelar</Button>
                    </div>
                  ) : (
                    <div>
                      {c.blocked ? (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setBlocked(c.company_id, false)}>
                          <CircleCheck className="size-4" /> Desbloquear cliente
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setBlockingId(c.company_id)}>
                          <Ban className="size-4" /> Bloquear cliente
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Registros de auditoria</h2>
        {logs.isLoading ? <Spinner /> : !logs.data?.length ? (
          <EmptyState icon={ScrollText} title="Nenhum registro ainda" text="Ações como contratações, check-ins e bloqueios aparecem aqui." />
        ) : (
          <div className="space-y-2">
            {logs.data.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-card">
                <div>
                  <span className="font-bold">{ACTION_LABEL[l.action] ?? l.action}</span>
                  <span className="ml-2 text-muted-foreground">{l.entity}</span>
                </div>
                <span className="text-xs text-muted-foreground">{fmtDate(l.created_at)} {fmtTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
