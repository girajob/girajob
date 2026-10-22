import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Logo } from "@/components/gj";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — GiraJob" },
      { name: "description", content: "Defina uma nova senha para sua conta GiraJob." },
      { property: "og:title", content: "Nova senha — GiraJob" },
      { property: "og:description", content: "Redefinição de senha." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Mínimo de 8 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Senha atualizada!");
    navigate({ to: "/inicio" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Logo />
        <h1 className="text-2xl font-extrabold">Defina sua nova senha</h1>
        <Field label="Nova senha"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
        <Button variant="cta" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar senha"}</Button>
      </form>
    </div>
  );
}
