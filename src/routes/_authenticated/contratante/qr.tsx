import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader } from "@/components/gj";
import { errMsg, fmtShift, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratante/qr")({
  head: () => ({ meta: [{ title: "Identificar profissional — GiraJob" }] }),
  component: Qr,
});

type Res = { booking_id: string; job_title: string; professional_name: string; starts_at: string; ends_at: string };

function Qr() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setRes(null); setCheckedInAt(null);
    const { data, error } = await supabase.rpc("verify_qr_token", { _token: code.trim() });
    if (error) { toast.error(errMsg(error)); return; }
    setRes(data?.[0] ?? null);
    if (!data?.[0]) toast.error("QR Code não reconhecido");
  }

  async function checkIn() {
    setBusy(true);
    const { data, error } = await supabase.rpc("check_in_booking", { _token: code.trim() });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    setCheckedInAt(data?.[0]?.checked_in_at ?? new Date().toISOString());
    toast.success("Entrada registrada!");
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Identificar profissional" subtitle="Digite o código exibido abaixo do QR Code do profissional para validar a contratação e registrar a entrada. A leitura pela câmera chega na próxima etapa." />
      <form onSubmit={check} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <Field label="Código"><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" /></Field>
        <Button variant="cta" disabled={!code.trim()}>Verificar</Button>
      </form>
      {res && (
        <div className="mt-4 animate-rise rounded-2xl bg-success-soft p-5 text-success">
          <CheckCircle2 className="size-7" />
          <p className="mt-2 font-bold">{res.professional_name} — contratação válida</p>
          <p className="text-sm">{res.job_title} · {fmtShift(res.starts_at, res.ends_at)}</p>
          {checkedInAt ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2 text-sm font-bold">
              <LogIn className="size-4" /> Entrada registrada às {fmtTime(checkedInAt)}
            </p>
          ) : (
            <Button className="mt-3" variant="cta" onClick={checkIn} disabled={busy}>
              <LogIn /> {busy ? "Registrando…" : "Registrar entrada"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
