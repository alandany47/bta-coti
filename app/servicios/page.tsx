import type { Metadata } from "next";
import { headers } from "next/headers";
import { tenantOrigin } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ModuleLanding } from "@/components/marketing/module-landing";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Cotiza servicios y materiales con desglose por línea.",
};

export default async function ServiciosPage() {
  const supabase = createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("code, price_month")
    .eq("code", "esencial")
    .eq("public", true)
    .maybeSingle();

  const host = (await headers()).get("host") ?? "";

  return (
    <>
      <SiteHeader />
      <ModuleLanding
        eyebrow="Módulo Servicios"
        title="Publica tu catálogo de servicios"
        description="Organiza tus servicios y materiales por categoría en una página pública compartible. Para talleres, contratistas y negocios de servicio."
        status="available"
        screenshotSrc="/marketing/hero-servicios-storefront-v3.jpg"
        screenshotAlt="Catálogo público de servicios, ejemplo de una plomería"
        planCode="esencial"
        priceMonth={plan ? Number(plan.price_month) : 199}
        demos={[
          { label: "Probar el panel de ejemplo", href: "/demo/entrar?plan=esencial" },
          { label: "Ver la vitrina de ejemplo", href: tenantOrigin("demo-esencial", host) },
        ]}
        features={[
          "Catálogo de servicios y materiales por categoría",
          "Página pública compartible, sin que tu cliente necesite cuenta",
          "Cotización con varios conceptos: cantidad, descuento por línea e IVA",
          "PDF y envío por WhatsApp, con la plantilla que elijas",
        ]}
      />
      <SiteFooter />
    </>
  );
}
