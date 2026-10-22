import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/gj";
import { Button } from "@/components/ui/button";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

/** Mobile: bottom tab bar. Desktop: dark sidebar. */
export function AppShell({ nav, children, badge }: { nav: NavItem[]; children: ReactNode; badge?: string }) {
  const signOut = useSignOut();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="px-2 py-2"><Logo light /></div>
        {badge && <span className="mx-2 mt-1 w-fit rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-bold">{badge}</span>}
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.exact }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold opacity-80 transition hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent !opacity-100 text-sidebar-primary" }}>
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut /> Sair
        </Button>
      </aside>
      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sair"><LogOut /></Button>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
        {nav.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.exact }}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "!text-primary" }}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
