import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Spinner } from "@/components/gj";
import { fmtDate, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — GiraJob" }] }),
  component: Auditoria,
});

const ACTION_LABEL: Record<string, string> = {
  qr_scanned: "QR Code verificado",
  check_in: "Entrada registrada",
  payment_list_generated: "Lista de pagamento gerada",
  setting_changed: "Configuração alterada",
  hire_confirmed: "Contratação confirmada",
  application_status: "Status de candidatura alterado",
};

function Auditoria() {
  const q = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, details, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Ações sensíveis registradas na plataforma" />
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon={ScrollText} title="Nenhum registro ainda" text="Ações como contratações, check-ins e geração de pagamentos aparecem aqui." />
      ) : (
        <div className="space-y-2">
          {q.data.map((l) => (
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
    </div>
  );
}
