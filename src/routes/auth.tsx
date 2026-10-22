import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Logo } from "@/components/gj";
import { errMsg } from "@/lib/format";
import { homeFor, meQuery } from "@/lib/session";

const search = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Entrar — GiraJob" },
      { name: "description", content: "Entre ou crie sua conta GiraJob." },
      { property: "og:title", content: "Entrar — GiraJob" },
      { property: "og:description", content: "Acesse sua conta de profissional ou contratante." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passSchema = z.string().min(8, "Mínimo de 8 caracteres").max(72);

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState(initial ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function goHome() {
    const me = await qc.fetchQuery({ ...meQuery, staleTime: 0 });
    navigate({ to: homeFor(me), replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) goHome(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    if (!em.success) return toast.error(em.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Enviamos um link para redefinir sua senha.");
        return;
      }
      const pw = passSchema.safeParse(password);
      if (!pw.success) return toast.error(pw.error.issues[0].message);
      if (mode === "signup") {
        if (name.trim().length < 2) return toast.error("Informe seu nome");
        const { data, error } = await supabase.auth.signUp({
          email: em.data, password: pw.data,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) { setSent("Confirme seu e-mail pelo link que enviamos para entrar."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: pw.data });
        if (error) throw new Error(error.message.includes("Invalid") ? "E-mail ou senha incorretos" : error.message);
      }
      await goHome();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) return toast.error("Não foi possível entrar com Google");
    if (r.redirected) return;
    await goHome();
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-hero p-10 md:flex md:flex-col md:justify-between">
        <Logo light className="text-3xl" />
        <p className="max-w-sm font-display text-4xl font-extrabold leading-tight text-primary-foreground">
          Vagas para eventos, festas, bares e restaurantes.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-rise">
          <Logo className="md:hidden" />
          <h1 className="mt-4 text-3xl font-extrabold">
            {mode === "signup" ? "Criar conta" : mode === "forgot" ? "Recuperar senha" : "Bem-vindo de volta"}
          </h1>
          {sent ? (
            <div className="mt-6 rounded-2xl bg-success-soft p-4 text-sm font-semibold text-success">{sent}</div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <Field label="Nome completo"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
              )}
              <Field label="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
              {mode !== "forgot" && (
                <Field label="Senha"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></Field>
              )}
              <Button type="submit" variant="cta" className="w-full" size="lg" disabled={busy}>
                {busy ? "Aguarde…" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"}
              </Button>
              {mode !== "forgot" && (
                <Button type="button" variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
              )}
            </form>
          )}
          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === "signin" && (
              <>
                <button className="font-semibold text-primary" onClick={() => setMode("forgot")}>Esqueci minha senha</button>
                <p>Novo por aqui? <button className="font-bold text-cta" onClick={() => setMode("signup")}>Criar conta</button></p>
              </>
            )}
            {mode !== "signin" && (
              <button className="font-semibold text-primary" onClick={() => { setMode("signin"); setSent(null); }}>Já tenho conta — entrar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
