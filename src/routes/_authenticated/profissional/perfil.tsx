import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Spinner, StatusPill } from "@/components/gj";
import { useSignOut } from "@/components/shell";
import { useMe } from "@/lib/session";
import { useMediaUrl } from "@/lib/media";
import { PROFILE_STATUS_LABEL } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/profissional/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — GiraJob" }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const avatar = useMediaUrl(me?.profile?.avatar_url);
  const p = me?.profile;
  if (!p) return <Spinner />;
  return (
    <div className="max-w-xl">
      <PageHeader title="Meu perfil" />
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-primary-soft font-display text-2xl font-extrabold text-primary">
            {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : (p.full_name ?? "?").charAt(0)}
          </div>
          <div>
            <div className="text-xl font-bold">{p.full_name}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{p.city ?? "—"}{p.state ? `/${p.state}` : ""}</div>
            <div className="mt-1"><StatusPill status={p.status} label={PROFILE_STATUS_LABEL[p.status]} /></div>
          </div>
        </div>
        {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}
        {!!p.skills.length && <div className="mt-3 flex flex-wrap gap-1">{p.skills.map((s) => <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{s}</span>)}</div>}
      </div>
      <div className="mt-4 flex gap-3">
        <Button asChild variant="outline"><Link to="/profissional/cadastro"><Pencil /> Editar cadastro</Link></Button>
        <Button variant="ghost" onClick={signOut}><LogOut /> Sair</Button>
      </div>
    </div>
  );
}
