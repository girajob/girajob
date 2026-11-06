import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ChartColumn, CircleDollarSign, LayoutDashboard, Palette, ScrollText, Tags, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/shell";
import { meQuery } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    // UI gate only; every admin read/write is re-checked in the database.
    if (!me?.roles.includes("admin")) throw redirect({ to: "/inicio" });
  },
  component: () => (
    <AppShell badge="Administrador" nav={[
      { to: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
      { to: "/admin/cadastros", label: "Cadastros", icon: UserPlus },
      { to: "/admin/usuarios", label: "Usuários", icon: Users },
      { to: "/admin/categorias", label: "Categorias", icon: Tags },
      { to: "/admin/financeiro", label: "Financeiro", icon: CircleDollarSign },
      { to: "/admin/relatorios", label: "Relatórios", icon: ChartColumn },
      { to: "/admin/auditoria", label: "Clientes", icon: ScrollText },
      { to: "/admin/aparencia", label: "Aparência", icon: Palette },
    ]}>
      <Outlet />
    </AppShell>
  ),
});
