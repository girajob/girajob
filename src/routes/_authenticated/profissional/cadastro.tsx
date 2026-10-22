import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/gj";

export const Route = createFileRoute("/_authenticated/profissional/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro do profissional — GiraJob" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl p-6">
      <EmptyState icon={Construction} title="Cadastro do profissional" text="Esta área ainda está em construção." />
    </div>
  ),
});
