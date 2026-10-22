import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { CalendarDays, Compass, FileText, Home, User } from "lucide-react";
import { AppShell } from "@/components/shell";
import { meQuery } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/profissional")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.roles.includes("professional")) throw redirect({ to: "/inicio" });
    const free = ["/profissional/cadastro", "/profissional/perfil"];
    if (me.profile?.status === "incomplete" && !free.includes(location.pathname))
      throw redirect({ to: "/profissional/cadastro" });
  },
  component: () => (
    <AppShell
      badge="Profissional"
      nav={[
        { to: "/profissional", label: "Início", icon: Home, exact: true },
        { to: "/profissional/explorar", label: "Explorar", icon: Compass },
        { to: "/profissional/candidaturas", label: "Candidaturas", icon: FileText },
        { to: "/profissional/agenda", label: "Agenda", icon: CalendarDays },
        { to: "/profissional/perfil", label: "Perfil", icon: User },
      ]}
    >
      <Outlet />
    </AppShell>
  ),
});
