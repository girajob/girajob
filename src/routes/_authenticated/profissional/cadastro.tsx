import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Crosshair, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Field, Spinner } from "@/components/gj";
import { useMe } from "@/lib/session";
import { categoriesQuery } from "@/lib/pro-queries";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/profissional/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro do profissional — GiraJob" }] }),
  component: Wizard,
});

const STEPS = ["Dados pessoais", "Endereço", "Foto", "Categorias", "Experiência", "Documentos", "Termos"];

function Wizard() {
  const { data: me, isLoading } = useMe();
  const cats = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ full_name: "", phone: "", birth_date: "", address_line: "", postal_code: "", city: "", state: "", bio: "", skills: "", experience_years: "" });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [doc, setDoc] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const avatarUrl = useMediaUrl(avatar);

  useEffect(() => {
    const p = me?.profile;
    if (!p) return;
    setF({ full_name: p.full_name ?? "", phone: p.phone ?? "", birth_date: p.birth_date ?? "", address_line: p.address_line ?? "",
      postal_code: p.postal_code ?? "", city: p.city ?? "", state: p.state ?? "", bio: p.bio ?? "", skills: p.skills.join(", "),
      experience_years: p.experience_years?.toString() ?? "" });
    setLat(p.approx_lat != null ? Number(p.approx_lat) : null);
    setLng(p.approx_lng != null ? Number(p.approx_lng) : null);
    setAvatar(p.avatar_url);
    setStep(Math.min(7, Math.max(1, p.onboarding_step)));
    supabase.from("professional_categories_map").select("category_id").eq("professional_id", p.id)
      .then(({ data }) => setPicked((data ?? []).map((d) => d.category_id)));
  }, [me?.profile]);

  if (isLoading || !me?.profile) return <Spinner />;
  const uid = me.user.id;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function validate(): string | null {
    if (step === 1) {
      if (f.full_name.trim().length < 3) return "Informe seu nome completo";
      if (!/^[\d\s()+-]{10,20}$/.test(f.phone)) return "Telefone inválido";
      if (!f.birth_date) return "Informe sua data de nascimento";
      const age = (Date.now() - new Date(f.birth_date).getTime()) / (365.25 * 864e5);
      if (age < 18) return "É preciso ter 18 anos ou mais";
    }
    if (step === 2) {
      if (!f.city.trim()) return "Informe a cidade";
      if (!/^[A-Za-z]{2}$/.test(f.state)) return "Use a sigla do estado (ex.: SP)";
    }
    if (step === 4 && !picked.length) return "Escolha ao menos uma categoria";
    if (step === 7 && !terms) return "Aceite os termos para concluir";
    return null;
  }

  async function next() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const patch: Database["public"]["Tables"]["profiles"]["Update"] = { onboarding_step: Math.min(7, step + 1) };
      if (step === 1) Object.assign(patch, { full_name: f.full_name.trim(), phone: f.phone.trim(), birth_date: f.birth_date });
      if (step === 2) Object.assign(patch, { address_line: f.address_line.trim() || null, postal_code: f.postal_code.trim() || null, city: f.city.trim(), state: f.state.toUpperCase(), approx_lat: lat, approx_lng: lng });
      if (step === 3) Object.assign(patch, { avatar_url: avatar });
      if (step === 4) {
        const { error: d } = await supabase.from("professional_categories_map").delete().eq("professional_id", uid);
        if (d) throw d;
        const { error: i } = await supabase.from("professional_categories_map").insert(picked.map((c) => ({ professional_id: uid, category_id: c })));
        if (i) throw i;
      }
      if (step === 5) Object.assign(patch, { bio: f.bio.trim() || null, skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20), experience_years: f.experience_years ? Number(f.experience_years) : null });
      if (step === 7) Object.assign(patch, { terms_accepted_at: new Date().toISOString(), status: "pending_verification" });
      const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
      if (error) throw error;
      if (step === 7) {
        await qc.invalidateQueries({ queryKey: ["me"] });
        toast.success("Cadastro concluído! Você já pode se candidatar.");
        navigate({ to: "/profissional" });
      } else setStep(step + 1);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(Math.round(p.coords.latitude * 100) / 100); setLng(Math.round(p.coords.longitude * 100) / 100); toast.success("Localização aproximada salva"); },
      () => toast.error("Não foi possível obter a localização"),
    );
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setAvatar(await uploadMedia(uid, file, "avatar")); } catch (err) { toast.error(errMsg(err)); }
  }
  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo maior que 10 MB"); return; }
    const path = `${uid}/documento-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) { toast.error(errMsg(error)); return; }
    setDoc(file.name); toast.success("Documento enviado com segurança");
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold text-muted-foreground">Etapa {step} de 7</p>
      <h1 className="text-2xl font-extrabold">{STEPS[step - 1]}</h1>
      <Progress value={(step / 7) * 100} className="mt-3" />
      <div className="mt-6 space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        {step === 1 && <>
          <Field label="Nome completo"><Input value={f.full_name} onChange={set("full_name")} maxLength={120} /></Field>
          <Field label="Celular"><Input value={f.phone} onChange={set("phone")} placeholder="(11) 99999-9999" maxLength={20} /></Field>
          <Field label="Data de nascimento"><Input type="date" value={f.birth_date} onChange={set("birth_date")} /></Field>
        </>}
        {step === 2 && <>
          <Field label="Endereço" hint="Nunca é mostrado aos contratantes."><Input value={f.address_line} onChange={set("address_line")} maxLength={200} /></Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
            <Field label="CEP"><Input value={f.postal_code} onChange={set("postal_code")} maxLength={9} /></Field>
            <Field label="Cidade"><Input value={f.city} onChange={set("city")} maxLength={80} /></Field>
            <Field label="UF"><Input value={f.state} onChange={set("state")} maxLength={2} /></Field>
          </div>
          <Button type="button" variant="outline" onClick={locate}><Crosshair /> {lat != null ? "Localização aproximada salva" : "Usar minha localização aproximada"}</Button>
          <p className="text-xs text-muted-foreground">Usada só para calcular distâncias (arredondada a ~1 km).</p>
        </>}
        {step === 3 && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-32 place-items-center overflow-hidden rounded-3xl bg-primary-soft text-primary">
              {avatarUrl ? <img src={avatarUrl} alt="Sua foto" className="size-full object-cover" /> : <Upload className="size-8" />}
            </div>
            <label className="cursor-pointer font-semibold text-primary">Escolher foto<input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} /></label>
          </div>
        )}
        {step === 4 && (
          <div className="flex flex-wrap gap-2">
            {cats.data?.filter((c) => c.active).map((c) => {
              const on = picked.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}
                  className={cn("flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold", on ? "border-cta bg-cta-soft text-cta" : "bg-card")}>
                  {on && <Check className="size-4" />}{c.name}
                </button>
              );
            })}
          </div>
        )}
        {step === 5 && <>
          <Field label="Anos de experiência"><Input type="number" min={0} max={80} value={f.experience_years} onChange={set("experience_years")} /></Field>
          <Field label="Habilidades" hint="Separe por vírgula"><Input value={f.skills} onChange={set("skills")} placeholder="Coquetelaria, inglês, atendimento VIP" /></Field>
          <Field label="Sobre você"><Textarea value={f.bio} onChange={set("bio")} maxLength={1000} /></Field>
        </>}
        {step === 6 && <>
          <p className="text-sm">Envie um documento com foto (RG ou CNH). Ele fica em armazenamento privado e nunca é exibido para contratantes.</p>
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-primary"><Upload className="size-5" />{doc ?? "Enviar documento"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadDoc} /></label>
          <p className="rounded-xl bg-warning-soft p-3 text-xs font-semibold text-warning">A verificação de identidade será feita por um serviço especializado. Até lá, seu cadastro fica como "Aguardando verificação".</p>
        </>}
        {step === 7 && (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
            Li e aceito os Termos de Uso e a Política de Privacidade do GiraJob.
          </label>
        )}
      </div>
      <div className="mt-5 flex justify-between">
        <Button variant="ghost" disabled={step === 1 || busy} onClick={() => setStep(step - 1)}>Voltar</Button>
        <Button variant="cta" disabled={busy} onClick={next}>{busy ? "Salvando…" : step === 7 ? "Concluir cadastro" : step === 6 || step === 3 ? "Continuar" : "Próximo"}</Button>
      </div>
    </div>
  );
}
