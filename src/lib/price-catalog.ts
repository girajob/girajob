import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const priceCatalogQuery = (companyId: string | undefined) => queryOptions({
  queryKey: ["price-catalog", companyId],
  enabled: !!companyId,
  queryFn: async () => {
    if (!companyId) return [];
    const { data, error } = await supabase.from("price_catalog").select("id, name, description, amount, active, created_at").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});