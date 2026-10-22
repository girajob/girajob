import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Tag, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, fmtTime } from "@/lib/format";
import { JOB_STATUS_LABEL, APP_STATUS_LABEL } from "@/lib/jobs";
import { useMediaUrl } from "@/lib/media";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("font-display text-xl font-extrabold tracking-tight", light ? "text-primary-foreground" : "text-primary", className)}>
      Gira<span className="text-cta">Job</span>
    </span>
  );
}

const tone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success-soft text-success",
  paused: "bg-warning-soft text-warning",
  closed: "bg-destructive-soft text-destructive",
  filled: "bg-primary-soft text-primary",
  applied: "bg-primary-soft text-primary",
  in_review: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  hired: "bg-cta-soft text-cta",
  confirmed: "bg-success-soft text-success",
  cancelled: "bg-destructive-soft text-destructive",
  incomplete: "bg-muted text-muted-foreground",
  pending_verification: "bg-warning-soft text-warning",
  blocked: "bg-destructive-soft text-destructive",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", tone[status] ?? "bg-muted")}>
      {label ?? JOB_STATUS_LABEL[status] ?? APP_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="animate-rise flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string }) {
  return (
    <div className="animate-rise rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <Icon className="size-4" />
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type JobCardData = {
  id: string;
  title: string;
  venue_name: string;
  city: string;
  state: string;
  starts_at: string;
  ends_at: string;
  pay_amount: number;
  status: string;
  banner_url: string | null;
  positions: number;
  professional_categories?: { name: string } | null;
  companies?: { name: string } | null;
};

export function JobCard({ job, distanceKm, footer }: { job: JobCardData; distanceKm?: number | null; footer?: ReactNode }) {
  const banner = useMediaUrl(job.banner_url);
  return (
    <article className="animate-rise overflow-hidden rounded-2xl border bg-card shadow-card transition hover:-translate-y-0.5">
      <Link to="/profissional/vagas/$id" params={{ id: job.id }} className="block"
        onClick={() => { if (job.id !== "preview") void supabase.rpc("track_job_event", { _job: job.id, _type: "click" }); }}>
        <div className="relative h-28 bg-hero">
          {banner && <img src={banner} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="absolute left-3 top-3"><StatusPill status={job.status} /></div>
          <div className="absolute bottom-3 right-3 rounded-xl bg-cta px-3 py-1 font-display text-lg font-extrabold text-cta-foreground shadow-cta">
            {brl(job.pay_amount)}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div>
            <h3 className="text-lg font-bold leading-tight">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.venue_name || job.companies?.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-primary" />{fmtDate(job.starts_at)}</span>
            <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" />{fmtTime(job.starts_at)}–{fmtTime(job.ends_at)}</span>
            <span className="flex items-center gap-1.5"><Tag className="size-4 text-primary" />{job.professional_categories?.name ?? "Geral"}</span>
            <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{job.city}/{job.state}{distanceKm != null ? ` · ${distanceKm} km` : ""}</span>
          </div>
        </div>
      </Link>
      {footer && <div className="border-t px-4 py-3">{footer}</div>}
    </article>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string | undefined; hint?: string | undefined; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="block text-xs font-semibold text-destructive">{error}</span> : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
