import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader } from "@/components/gj";
import { errMsg, fmtShift } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/qr")({
  head: () => ({ meta: [{ title: "Identificar profissional — GiraJob" }] }),
  component: Qr,
});

type Res = { job_title: string; professional_name: string; starts_at: string; ends_at: string };

function Qr() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  async function check(e: React.FormEvent) {
    e.preventDefault();
    setRes(null);
    const { data, error } = await supabase.rpc("verify_qr_token", { _token: code.trim() });
    if (error) { toast.error(errMsg(error)); return; }
    setRes(data?.[0] ?? null);
  }
  return (
    <div className="max-w-xl">
      <PageHeader title="Identificar profissional" subtitle="Digite o código exibido abaixo do QR Code do profissional. A leitura pela câmera e o registro de presença chegam na próxima etapa." />
      <form onSubmit={check} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <Field label="Código"><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" /></Field>
        <Button variant="cta" disabled={!code.trim()}>Verificar</Button>
      </form>
      {res && (
        <div className="mt-4 animate-rise rounded-2xl bg-success-soft p-5 text-success">
          <CheckCircle2 className="size-7" />
          <p className="mt-2 font-bold">{res.professional_name} — contratação válida</p>
          <p className="text-sm">{res.job_title} · {fmtShift(res.starts_at, res.ends_at)}</p>
        </div>
      )}
    </div>
  );
}
