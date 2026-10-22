import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, Spinner, StatusPill } from "@/components/gj";
import { myBookingsQuery } from "@/lib/pro-queries";
import { brl, errMsg, fmtShift } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profissional/agenda")({
  head: () => ({ meta: [{ title: "Minha agenda — GiraJob" }] }),
  component: Agenda,
});

function Agenda() {
  const q = useQuery(myBookingsQuery);
  const [qr, setQr] = useState<string | null>(null);
  async function showQr(id: string) {
    const { data, error } = await supabase.rpc("get_booking_qr", { _booking: id });
    if (error || !data) { toast.error(error ? errMsg(error) : "QR Code indisponível"); return; }
    setQr(data);
  }
  const now = new Date();
  const upcoming = q.data?.filter((b) => new Date(b.ends_at) > now) ?? [];
  const past = q.data?.filter((b) => new Date(b.ends_at) <= now) ?? [];
  return (
    <div>
      <PageHeader title="Minha agenda" subtitle="Trabalhos confirmados" />
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon={CalendarDays} title="Nenhum trabalho confirmado" text="Quando um contratante confirmar sua contratação, ela aparece aqui." />
      ) : (
        <div className="space-y-6">
          {[["Próximos", upcoming], ["Histórico", past]].map(([t, list]) => (list as typeof upcoming).length ? (
            <section key={t as string}>
              <h2 className="mb-3 text-lg font-extrabold">{t as string}</h2>
              <div className="space-y-3">
                {(list as typeof upcoming).map((b) => (
                  <div key={b.id} className="animate-rise rounded-2xl border bg-card p-4 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold">{b.jobs?.title}</div>
                        <div className="text-sm text-muted-foreground">{fmtShift(b.starts_at, b.ends_at)} · {brl(b.jobs?.pay_amount)}</div>
                        <div className="mt-1 flex items-center gap-1 text-sm"><MapPin className="size-3.5" />{b.jobs?.address ?? b.jobs?.venue_name} · {b.jobs?.city}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={b.status} label={b.status === "confirmed" ? "Confirmado" : undefined} />
                        {b.status === "confirmed" && new Date(b.ends_at) > now && (
                          <Button size="sm" variant="outline" onClick={() => showQr(b.id)}><QrCode /> QR Code</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null)}
        </div>
      )}
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sua identificação</DialogTitle></DialogHeader>
          {qr && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-card p-3"><QRCodeSVG value={qr} size={220} /></div>
              <code className="break-all text-center text-xs">{qr}</code>
              <p className="text-center text-xs text-muted-foreground">Mostre ao contratante na chegada. O código não contém seus dados pessoais.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
