import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Spinner } from "@/components/gj";
import { categoriesQuery } from "@/lib/pro-queries";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — GiraJob" }] }),
  component: Cats,
});

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Cats() {
  const q = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) { toast.error("Nome muito curto"); return; }
    const { error } = await supabase.from("professional_categories").insert({ name: n, slug: slugify(n) });
    if (error) { toast.error(errMsg(error)); return; }
    setName(""); toast.success("Categoria criada"); refresh();
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("professional_categories").update({ active }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    refresh();
  }
  return (
    <div className="max-w-xl">
      <PageHeader title="Categorias profissionais" />
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <Button variant="cta">Adicionar</Button>
      </form>
      {q.isLoading ? <Spinner /> : (
        <div className="divide-y rounded-2xl border bg-card shadow-card">
          {q.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3">
              <span className="font-semibold">{c.name}</span>
              <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} aria-label={`Ativar ${c.name}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
