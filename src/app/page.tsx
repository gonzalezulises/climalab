import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Target, CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              CL
            </div>
            <span className="text-lg font-semibold">ClimaLab</span>
          </div>
          <Button asChild size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Diagnóstico de clima organizacional
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Mide lo que importa en tu organización
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          ClimaLab es una plataforma de diagnóstico de clima organizacional que transforma datos en
          decisiones accionables sobre tu gente.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">
              Ver demostración
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#para-que-sirve">
              Conocer más
              <ChevronDown className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* ¿Para qué sirve? */}
      <section id="para-que-sirve" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">¿Para qué sirve?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Mide</CardTitle>
                <CardDescription className="text-sm">
                  Diagnóstico de 6 indicadores clave de clima en menos de 10 minutos por persona
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Entiende</CardTitle>
                <CardDescription className="text-sm">
                  Visualiza resultados por área, antigüedad y perfiles de compromiso de forma
                  inmediata
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Actúa</CardTitle>
                <CardDescription className="text-sm">
                  Recibe recomendaciones basadas en evidencia para intervenir donde más importa
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ¿Para quién? */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">¿Para quién?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Empresas de 20 a 500+ colaboradores que quieren gestionar su clima con datos, no con
            intuición. Ideal para Recursos Humanos, Gerencia General y equipos de transformación
            organizacional.
          </p>
        </div>
      </section>

      {/* ¿Qué resultados puedes esperar? */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            ¿Qué resultados puedes esperar?
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              "Un diagnóstico claro con indicadores diseñados con rigor científico",
              "Identificación de perfiles de compromiso en tu organización",
              "Comparativas por área, antigüedad y segmentos",
              "Recomendaciones accionables para mejorar el clima",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ClimaLab. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
