import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Building2, Briefcase, ChartColumn, CircleDollarSign, LayoutDashboard, PlusCircle, QrCode, ShieldAlert, Tags, Wallet } from "lucide-react";
import { AppShell } from "@/components/shell";
import { meQuery, useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/contratante")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.roles.includes("contractor")) throw redirect({ to: "/inicio" });
    if (!me.company && location.pathname !== "/contratante/empresa") throw redirect({ to: "/contratante/empresa" });
  },
  component: ContractorShell,
});

function ContractorShell() {
  const { data: me } = useMe();
  const blocked = !!me?.company?.blocked;
  return (
    <AppShell
      badge="Contratante"
      nav={[
        { to: "/contratante", label: "Painel", icon: LayoutDashboard, exact: true },
        { to: "/contratante/vagas", label: "Vagas", icon: Briefcase, exact: true },
        { to: "/contratante/vagas/nova", label: "Publicar", icon: PlusCircle },
        { to: "/contratante/qr", label: "QR Code", icon: QrCode },
        { to: "/contratante/pagamentos", label: "Pagamentos", icon: Wallet },
        { to: "/contratante/financeiro", label: "Financeiro", icon: CircleDollarSign },
        { to: "/contratante/precos", label: "Meus preços", icon: Tags },
        { to: "/contratante/relatorios", label: "Relatórios", icon: ChartColumn },
        { to: "/contratante/empresa", label: "Empresa", icon: Building2 },
      ]}
    >
      {blocked && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive bg-destructive-soft p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <strong>Sistema bloqueado.</strong>{" "}
            {me?.company?.blocked_reason || "Há pendências financeiras na sua conta."} Você não pode publicar nem editar
            vagas no momento. Entre em contato com o suporte GiraJob para regularizar sua situação.
          </div>
        </div>
      )}
      <Outlet />
    </AppShell>
  );
}
