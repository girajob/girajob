import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/gj";
import { JobForm } from "@/components/job-form";

export const Route = createFileRoute("/_authenticated/contratante/vagas/nova")({
  head: () => ({ meta: [{ title: "Montar evento e publicar vaga — GiraJob" }, { name: "description", content: "Monte o quadro de funcionários do evento com seus cargos, preços, quantidades e horários." }, { property: "og:title", content: "Montar evento e publicar vaga — GiraJob" }, { property: "og:description", content: "Organize os cargos do evento e publique suas vagas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <div className="max-w-3xl">
      <PageHeader title="Publicar vaga" subtitle="Campos com * são obrigatórios para publicar." />
      <JobForm />
    </div>
  ),
});
