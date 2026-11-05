import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/components/gj";
import { fmtDate, fmtTime } from "@/lib/format";

export function StatusHistory({ entity, id }: { entity: "application" | "job"; id: string }) {
  const q = useQuery({
    queryKey: ["status-history", entity, id],
    queryFn: async () => {
      const { data, error } = await supabase.from("status_history").select("*")
        .eq("entity", entity).eq("entity_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  if (!q.data?.length) return null;
  return (
    <ol className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
      {q.data.map((h) => (
        <li key={h.id} className="flex items-center gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <StatusPill status={h.to_status as any} />
          <span>{fmtDate(h.created_at)} às {fmtTime(h.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}
