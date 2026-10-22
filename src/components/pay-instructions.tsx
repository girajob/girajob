import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/gj";
import { brl } from "@/lib/format";

type Instructions = {
  payment_id: string;
  amount: number;
  status: string;
  pix_key: string;
  boleto: string;
  reference: string;
};

export function PayInstructionsDialog({
  paymentId,
  open,
  onOpenChange,
}: {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const q = useQuery({
    queryKey: ["pay-instructions", paymentId],
    enabled: open && !!paymentId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("payment_instructions", { _payment: paymentId! });
      if (error) throw error;
      return data as unknown as Instructions;
    },
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const d = q.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" /> Pagamento à GiraJob
          </DialogTitle>
        </DialogHeader>
        {q.isLoading || !d ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary-soft p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Valor a transferir</div>
              <div className="font-display text-3xl font-extrabold text-primary">{brl(d.amount)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Referência: {d.reference}</div>
            </div>
            {d.pix_key ? (
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Chave Pix da GiraJob</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl border bg-muted px-3 py-2 text-sm">{d.pix_key}</code>
                  <Button variant="outline" size="sm" onClick={() => copy(d.pix_key, "Chave Pix")}>
                    <Copy className="size-4" /> Copiar
                  </Button>
                </div>
              </div>
            ) : null}
            {d.boleto ? (
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Boleto</div>
                <p className="rounded-xl border bg-muted px-3 py-2 text-sm text-muted-foreground">{d.boleto}</p>
              </div>
            ) : null}
            {!d.pix_key && !d.boleto && (
              <p className="rounded-xl border bg-muted px-3 py-2 text-sm text-muted-foreground">
                As instruções de pagamento ainda não foram configuradas. Entre em contato com o suporte GiraJob.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Após a transferência, informe a referência <strong>{d.reference}</strong> no comprovante. A GiraJob confirma o
              recebimento e realiza o pagamento dos contratados.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PayInstructionsButton({ paymentId, label = "Como pagar" }: { paymentId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="size-4" /> {label}
      </Button>
      <PayInstructionsDialog paymentId={paymentId} open={open} onOpenChange={setOpen} />
    </>
  );
}
