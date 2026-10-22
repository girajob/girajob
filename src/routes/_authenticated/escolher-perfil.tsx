import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/gj";
import { errMsg } from "@/lib/format";
import { homeFor, meQuery } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/escolher-perfil")({
  head: () => ({ meta: [{ title: "Escolha seu perfil — GiraJob" }] }),
  component: Choose,
});

function Choose() {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function pick(t: "professional" | "contractor") {
    setBusy(true);
    const { error } = await supabase.rpc("choose_account_type", { _type: t });
    if (error) { setBusy(false); toast.error(errMsg(error)); return; }
    const me = await qc.fetchQuery({ ...meQuery, staleTime: 0 });
    navigate({ to: homeFor(me), replace: true });
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-6">
      <Logo />
      <h1 className="mt-4 text-3xl font-extrabold">Como você vai usar o GiraJob?</h1>
      <p className="mt-1 text-muted-foreground">Essa escolha define sua área na plataforma.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { t: "professional" as const, i: Briefcase, h: "Quero trabalhar", d: "Encontrar vagas, me candidatar e organizar minha agenda." },
          { t: "contractor" as const, i: Building2, h: "Quero contratar", d: "Publicar vagas e selecionar profissionais para meus eventos." },
        ].map(({ t, i: I, h, d }) => (
          <button key={t} disabled={busy} onClick={() => pick(t)}
            className="animate-rise rounded-2xl border-2 bg-card p-6 text-left shadow-card transition hover:border-cta disabled:opacity-60">
            <I className="size-8 text-cta" />
            <h2 className="mt-4 text-xl font-bold">{h}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
