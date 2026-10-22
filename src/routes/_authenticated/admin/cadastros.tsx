import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, UserRound, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { errMsg, fmtDate, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cadastros")({
  head: () => ({ meta: [{ title: "Novos cadastros — GiraJob" }] }),
  component: Cadastros,
});

type Reg = {
  kind: string;
  id: string;
  name: string | null;
  account_type: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  professional: "Profissional",
  contractor: "Contratante",
  admin: "Administrador",
  seller: "Vendedor",
};

function Cadastros() {
  const qc = useQueryClient();
  const [days, setDays] = useState(7);
  const [busyId, setBusyId] = useState<string | null>(null);

  const regs = useQuery({
    queryKey: ["admin-registrations", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_new_registrations", { _days: days });
      if (error) throw error;
      return data as Reg[];
    },
  });

  async function makeSeller(id: string) {
    setBusyId(id);
    const { error } = await supabase.rpc("set_user_role", { _user: id, _role: "seller" });
    setBusyId(null);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Papel de vendedor concedido");
    qc.invalidateQueries({ queryKey: ["admin-registrations"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novos cadastros"
        subtitle="Pessoas e empresas que chegaram recentemente à plataforma."
        action={
          <div className="flex gap-2">
            {[7, 30].map((d) => (
              <Button key={d} variant={days === d ? "cta" : "outline"} size="sm" onClick={() => setDays(d)}>
                Últimos {d} dias
              </Button>
            ))}
          </div>
        }
      />
      {regs.isLoading ? <Spinner /> : !regs.data?.length ? (
        <EmptyState icon={UserPlus} title="Nenhum cadastro no período" text="Amplie o período para ver cadastros mais antigos." />
      ) : (
        <div className="space-y-2">
          {regs.data.map((r) => (
            <div key={`${r.kind}-${r.id}`} className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  {r.kind === "company" ? <Building2 className="size-5" /> : <UserRound className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{r.name ?? "Sem nome"}</span>
                    <StatusPill
                      status={r.kind === "company" ? "filled" : "applied"}
                      label={r.kind === "company" ? "Empresa" : TYPE_LABEL[r.account_type ?? ""] ?? "Novo usuário"}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.city ? `${r.city}/${r.state}` : "Local não informado"} · {fmtDate(r.created_at)} {fmtTime(r.created_at)}
                  </div>
                </div>
              </div>
              {r.kind === "profile" && (
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => makeSeller(r.id)}>
                  <UserCheck className="size-4" /> {busyId === r.id ? "Concedendo…" : "Tornar vendedor"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
