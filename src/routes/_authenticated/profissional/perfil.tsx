import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/gj";

export const Route = createFileRoute("/_authenticated/profissional/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — GiraJob" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl p-6">
      <EmptyState icon={Construction} title="Meu perfil" text="Esta área ainda está em construção." />
    </div>
  ),
});
