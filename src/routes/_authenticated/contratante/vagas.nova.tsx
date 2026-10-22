import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/gj";
import { JobForm } from "@/components/job-form";

export const Route = createFileRoute("/_authenticated/contratante/vagas/nova")({
  head: () => ({ meta: [{ title: "Publicar vaga — GiraJob" }] }),
  component: () => (
    <div className="max-w-3xl">
      <PageHeader title="Publicar vaga" subtitle="Campos com * são obrigatórios para publicar." />
      <JobForm />
    </div>
  ),
});
