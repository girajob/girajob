import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/gj";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GiraJob — trabalho em eventos, bares e restaurantes" },
      { name: "description", content: "Profissionais encontram vagas em eventos e contratantes montam equipes com rapidez e segurança." },
      { property: "og:title", content: "GiraJob — trabalho em eventos, bares e restaurantes" },
      { property: "og:description", content: "Vagas de garçom, bartender, caixa, recepção e mais. Candidate-se ou contrate em minutos." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cta-soft px-3 py-1 text-xs font-bold text-cta">
            <Sparkles className="size-3.5" /> Renda extra no seu ritmo
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] md:text-6xl">
            O trabalho certo para <span className="text-cta">cada evento</span>.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Profissionais encontram vagas em festas, bares e restaurantes. Contratantes montam equipes confiáveis em minutos.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="cta"><Link to="/auth" search={{ mode: "signup" }}>Quero trabalhar <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ mode: "signup" }}>Quero contratar</Link></Button>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Bartender e garçonete sorrindo em um evento" width={1280} height={960} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
        </div>
      </section>
      <section className="bg-hero py-14">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 md:grid-cols-3">
          {[
            { i: Briefcase, t: "Vagas claras", d: "Valor, data, horário e local em destaque antes de você se candidatar." },
            { i: CalendarCheck, t: "Agenda sem conflitos", d: "O sistema impede contratações em horários sobrepostos." },
            { i: ShieldCheck, t: "Dados protegidos", d: "Seu endereço e documentos nunca ficam visíveis para contratantes." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl bg-card/95 p-5 shadow-card">
              <I className="size-6 text-cta" />
              <h3 className="mt-3 text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="py-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} GiraJob</footer>
    </div>
  );
}
