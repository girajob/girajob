import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: profile }, { data: roles }, { data: company }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("companies").select("*").eq("owner_id", u.user.id).maybeSingle(),
    ]);
    return {
      user: u.user,
      profile: profile as Profile | null,
      roles: (roles ?? []).map((r) => r.role as AppRole),
      company,
    };
  },
});

export function useMe() {
  return useQuery(meQuery);
}

export function homeFor(me: { profile: Profile | null; roles: AppRole[]; company: unknown } | null) {
  if (!me) return "/auth";
  if (me.roles.includes("admin")) return "/admin";
  if (!me.profile?.account_type) return "/escolher-perfil";
  if (me.profile.account_type === "contractor") return me.company ? "/contratante" : "/contratante/empresa";
  return me.profile.status === "incomplete" ? "/profissional/cadastro" : "/profissional";
}
