import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const JOB_SELECT = "*, professional_categories(name), companies(name)";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("professional_categories").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const openJobsQuery = queryOptions({
  queryKey: ["jobs", "open"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("jobs").select(JOB_SELECT)
      .eq("status", "published").gt("starts_at", new Date().toISOString())
      .order("starts_at").limit(200);
    if (error) throw error;
    return data;
  },
});

export const jobQuery = (id: string) =>
  queryOptions({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myApplicationsQuery = queryOptions({
  queryKey: ["my-applications"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("applications").select(`*, job_roles(label, pay_amount, entry_time), jobs(${JOB_SELECT})`)
      .eq("professional_id", u.user?.id ?? "").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const myBookingsQuery = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("bookings").select(`*, jobs(${JOB_SELECT})`)
      .eq("professional_id", u.user?.id ?? "").order("starts_at");
    if (error) throw error;
    return data;
  },
});
