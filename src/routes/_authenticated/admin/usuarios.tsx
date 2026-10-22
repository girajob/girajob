import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PageHeader, Spinner, StatusPill } from "@/components/gj";
import { PROFILE_STATUS_LABEL } from "@/lib/jobs";
import { errMsg } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — GiraJob" }] }),
  component: UsersPage,
});

type Status = Database["public"]["Enums"]["profile_status"];
const TYPE: Record<string, string> = { contractor: "Contratante", professional: "Profissional", admin: "Admin" };

function UsersPage() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", search ? { _search: search } : {});
      if (error) throw error;
      return data;
    },
  });
  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.rpc("admin_set_profile_status", { _user: id, _status: status });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  return (
    <div>
      <PageHeader title="Usuários" />
      <Input placeholder="Buscar por nome ou cidade" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />
      {q.isLoading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Cidade</th><th className="p-3">Status</th><th className="p-3">Ação</th></tr>
            </thead>
            <tbody>
              {q.data?.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-semibold">{u.full_name ?? "—"}{u.is_admin && <span className="ml-2 text-xs text-cta">admin</span>}</td>
                  <td className="p-3">{u.account_type ? TYPE[u.account_type] : "—"}</td>
                  <td className="p-3">{u.city ?? "—"}{u.state ? `/${u.state}` : ""}</td>
                  <td className="p-3"><StatusPill status={u.status} label={PROFILE_STATUS_LABEL[u.status]} /></td>
                  <td className="p-3">
                    <select className="h-8 rounded-lg border bg-card px-2" value={u.status} onChange={(e) => setStatus(u.id, e.target.value as Status)}>
                      {Object.entries(PROFILE_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
