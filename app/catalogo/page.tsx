import type { Metadata } from "next";
import { headers } from "next/headers";
import { tenantOrigin } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ModuleLanding } from "@/components/marketing/module-landing";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Publica tu catálogo de productos, compartible con un link.",
};

export default async function CatalogoPage() {
  const supabase = createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("code, price_month")
    .eq("code", "catalogo")
    .eq("public", true)
    .maybeSingle();

  const host = (await headers()).get("host") ?? "";

  return (
    <>
      <SiteHeader />
      <ModuleLanding
        eyebrow="Módulo Catálogo"
        title="Publica tu catálogo de productos"
        description="Tus productos organizados por categoría en una página pública compartible con un link. Para tiendas y mayoristas."
        status="available"
        screenshotSrc="/marketing/hero-catalogo-storefront-v3.jpg"
        screenshotAlt="Catálogo público de productos, ejemplo de una mueblería"
        planCode="catalogo"
        priceMonth={plan ? Number(plan.price_month) : 399}
        demos={[
          { label: "Probar el panel de ejemplo", href: "/demo/entrar?plan=catalogo" },
          { label: "Ver la vitrina de ejemplo", href: tenantOrigin("demo-catalogo", host) },
        ]}
        features={[
          "Catálogo de productos por categoría, con precio y unidad",
          "Página pública compartible con un link, sin que tu cliente necesite cuenta",
          "Editor en tu panel: alta de productos y servicios con fotos, precio y categoría",
          "Tu cliente arma \"Mi cotización\" y te la manda por WhatsApp; tú cotizas servicios con PDF",
        ]}
      />
      <SiteFooter />
    </>
  );
}
