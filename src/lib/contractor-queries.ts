import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const companyJobsQuery = (companyId: string) =>
  queryOptions({
    queryKey: ["company-jobs", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, professional_categories(name), applications(id, status), bookings(id, status)")
        .eq("company_id", companyId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const companyEventsQuery = (companyId: string) =>
  queryOptions({
    queryKey: ["company-events", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_analytics_events")
        .select("event_type, job_id, jobs!inner(company_id)")
        .eq("jobs.company_id", companyId);
      if (error) throw error;
      return data;
    },
  });

export const applicantsQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["applicants", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("job_applicants", { _job: jobId });
      if (error) throw error;
      return data;
    },
  });
