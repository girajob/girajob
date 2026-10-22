import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Building2, Briefcase, LayoutDashboard, PlusCircle, QrCode, Wallet } from "lucide-react";
import { AppShell } from "@/components/shell";
import { meQuery } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/contratante")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.roles.includes("contractor")) throw redirect({ to: "/inicio" });
    if (!me.company && location.pathname !== "/contratante/empresa") throw redirect({ to: "/contratante/empresa" });
  },
  component: () => (
    <AppShell
      badge="Contratante"
      nav={[
        { to: "/contratante", label: "Painel", icon: LayoutDashboard, exact: true },
        { to: "/contratante/vagas", label: "Vagas", icon: Briefcase, exact: true },
        { to: "/contratante/vagas/nova", label: "Publicar", icon: PlusCircle },
        { to: "/contratante/qr", label: "QR Code", icon: QrCode },
        { to: "/contratante/empresa", label: "Empresa", icon: Building2 },
      ]}
    >
      <Outlet />
    </AppShell>
  ),
});
