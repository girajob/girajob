import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileX } from "lucide-react";
import { EmptyState, PageHeader, Spinner } from "@/components/gj";
import { JobForm } from "@/components/job-form";
import { jobQuery } from "@/lib/pro-queries";

export const Route = createFileRoute("/_authenticated/contratante/vagas/$id_/editar")({
  head: () => ({ meta: [{ title: "Editar quadro e vaga — GiraJob" }, { name: "description", content: "Atualize os cargos, valores e horários do seu evento GiraJob." }, { property: "og:title", content: "Editar quadro e vaga — GiraJob" }, { property: "og:description", content: "Revise seu quadro de funcionários e os dados da vaga." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const q = useQuery(jobQuery(id));
  if (q.isLoading) return <Spinner />;
  if (!q.data || q.data.status === "closed") return <EmptyState icon={FileX} title="Esta vaga não pode ser editada" />;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar vaga" />
      <JobForm job={q.data} />
    </div>
  );
}
