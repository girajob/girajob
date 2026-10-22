import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/gj";

export const Route = createFileRoute("/_authenticated/profissional/vagas/$id")({
  head: () => ({ meta: [{ title: "Detalhes da vaga — GiraJob" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl p-6">
      <EmptyState icon={Construction} title="Detalhes da vaga" text="Esta área ainda está em construção." />
    </div>
  ),
});
