import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { tenantOrigin } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn, formatCurrency } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const STEPS = [
  { n: "1", title: "Agrega lo que vendes", body: "Productos, servicios o propiedades, con foto y precio. También puedes importarlos desde Excel." },
  { n: "2", title: "Arma la cotización", body: "Toca los conceptos o elige la unidad. Cantidades, descuento, IVA o enganche: el cálculo es automático." },
  { n: "3", title: "Mándala por WhatsApp", body: "Un link con el PDF listo. Tu cliente la ve en el navegador, sin descargar nada." },
];

const FAQ = [
  {
    q: "¿Para qué tipo de negocio sirve?",
    a: "Para negocios de servicios (plomería, talleres, contratistas), de productos (muebles, ropa, maquillaje, papelería) y de propiedades (inmobiliarias y brokers). Cada giro tiene su módulo.",
  },
  {
    q: "¿Cuánto dura la prueba gratis?",
    a: "7 días, con todas las funciones de tu plan. No pedimos tarjeta para empezar.",
  },
  {
    q: "¿Cómo le llega la cotización a mi cliente?",
    a: "Le mandas un link por WhatsApp. Lo abre en el navegador y puede descargar el PDF; no necesita cuenta ni instalar nada.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Sí, en cualquier momento desde tu panel. Si subes de plan el cambio es inmediato; si bajas, se aplica al siguiente ciclo.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Con tarjeta o transferencia SPEI. Los precios están en pesos mexicanos.",
  },
  {
    q: "¿Mis datos y los de mis clientes están seguros?",
    a: "Cada negocio tiene su propio espacio aislado en la base de datos; nadie de otro negocio puede ver o escribir tu información.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin penalización, desde el portal de facturación de tu panel.",
  },
];

export default async function MarketingHome() {
  const supabase = createServerSupabaseClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("code, name, price_month, sort")
    .eq("public", true)
    .order("sort");

  const brokerFrom = plans?.find((p) => p.code === "broker")?.price_month;
  const esencialFrom = plans?.find((p) => p.code === "esencial")?.price_month;
  const catalogoFrom = plans?.find((p) => p.code === "catalogo")?.price_month;

  // Cada giro enseña un negocio de ejemplo real (docs/DEMO.md §4.1): el panel interactivo
  // (`/demo/entrar?plan=…`, sesión compartida, no se guarda nada) y su vitrina pública. Los enlaces
  // de vitrina son del subdominio del tenant, así que se arman con el host.
  const host = (await headers()).get("host") ?? "";
  const modules = [
    {
      name: "Servicios",
      plan: "Esencial",
      body: "Cotiza con varios conceptos, cantidades, descuento por línea e IVA.",
      examples: "Plomería, talleres, contratistas, limpieza, técnicos.",
      from: esencialFrom,
      image: "/marketing/hero-servicios-storefront-v3.jpg",
      alt: "Catálogo público de servicios del módulo Servicios",
      panel: "/demo/entrar?plan=esencial",
      storefront: tenantOrigin("demo-esencial", host),
    },
    {
      name: "Productos",
      plan: "Catálogo",
      body: "Productos con foto y precio, vitrina con búsqueda y cotización por WhatsApp.",
      examples: "Venta de muebles, ropa, maquillaje, joyería, papelería.",
      from: catalogoFrom,
      image: "/marketing/hero-catalogo-storefront-v3.jpg",
      alt: "Catálogo público de productos del módulo Catálogo",
      panel: "/demo/entrar?plan=catalogo",
      storefront: tenantOrigin("demo-catalogo", host),
    },
    {
      name: "Propiedades",
      plan: "Broker",
      body: "Propiedades, enganches y mensualidades, cotización en un clic.",
      examples: "Inmobiliarias, desarrolladores, brokers, preventa y renta.",
      from: brokerFrom,
      image: "/marketing/hero-broker-storefront-v2.jpg",
      alt: "Catálogo de propiedades del módulo Broker",
      panel: "/demo/entrar?plan=broker",
      storefront: tenantOrigin("demo-broker", host),
    },
  ];

  // Capturas reales del panel de los negocios de ejemplo (docs/DEMO.md §4.1).
  const inside = [
    {
      title: "Cotiza servicios tocando conceptos",
      body: "Cantidad, descuento por línea e IVA; el total se calcula solo.",
      image: "/marketing/panel-cotizar-servicios-v2.jpg",
      alt: "Panel de cotización de servicios de una plomería, con tres conceptos agregados",
      href: "/demo/entrar?plan=esencial",
    },
    {
      title: "Tu catálogo, con fotos y precios",
      body: "Da de alta productos y servicios desde el celular. Lo que publiques sale en tu vitrina.",
      image: "/marketing/panel-catalogo-editor.jpg",
      alt: "Editor de catálogo de una mueblería con fotos y precios",
      href: "/demo/entrar?plan=catalogo",
    },
    {
      title: "Una cotización con tu marca",
      body: "Tres plantillas para la página que recibe tu cliente y para el PDF, con tu logo y color.",
      image: "/marketing/panel-plantillas.jpg",
      alt: "Selector de plantillas de cotización con vista previa",
      href: "/demo/entrar?plan=brokerpro",
    },
    {
      title: "Cartera de propiedades",
      body: "Estado de cada unidad y cotización con enganche y mensualidades en un paso.",
      image: "/marketing/panel-cartera-broker.jpg",
      alt: "Cartera de propiedades de una inmobiliaria en el panel",
      href: "/demo/entrar?plan=broker",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    url: `https://${BRAND.domain}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "es-MX",
    description:
      "Sistema para hacer cotizaciones en segundos y de manera sencilla, para negocios de servicios, productos y propiedades.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-[1120px] px-6 pt-16 pb-20 sm:pt-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent sm:text-sm sm:tracking-[0.12em]">
              Cotizaciones · Servicios · Productos · Propiedades
            </p>
            <h1 className="mt-3 font-display text-[44px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[60px]">
              Cotizaciones que cierran ventas.
            </h1>
            <p className="mt-4 text-lg text-ink-2">
              Listas en 60 segundos, con el cálculo correcto cada vez. Para negocios de servicios, de productos y de
              propiedades. Sin hojas de cálculo, sin errores de dedo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/registro" className={buttonVariants({ size: "lg" })}>
                Prueba 7 días gratis
              </Link>
              <Link href="/demo/entrar" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                Ver demo en vivo
              </Link>
            </div>
          </div>

          {/* Una sola imagen que resume lo que hacemos: las tres cotizaciones lado a lado. */}
          <div className="mt-14 flex items-end justify-center gap-3 sm:gap-5">
            <figure className="hidden w-[32%] sm:block">
              <div className="overflow-hidden rounded-xl border border-line shadow-lg">
                <Image
                  src="/marketing/panel-cotizar-servicios-v2.jpg"
                  alt={`Cotización de servicios de una plomería hecha en ${BRAND.name}`}
                  width={1100}
                  height={825}
                  sizes="(min-width: 640px) 32vw, 0px"
                  className="aspect-[4/3] w-full object-cover object-top"
                  priority
                />
              </div>
              <figcaption className="mt-3 text-center text-sm font-medium text-ink">Servicios</figcaption>
            </figure>
            <figure className="w-[62%] sm:w-[36%]">
              <div className="overflow-hidden rounded-xl border border-line shadow-lg sm:-translate-y-6">
                <Image
                  src="/marketing/hero-catalogo-storefront-v3.jpg"
                  alt={`Catálogo de productos de una mueblería con cotización, hecho en ${BRAND.name}`}
                  width={1800}
                  height={1350}
                  sizes="(min-width: 640px) 36vw, 62vw"
                  className="aspect-[4/3] w-full object-cover object-top"
                  priority
                />
              </div>
              <figcaption className="mt-3 text-center text-sm font-medium text-ink sm:-translate-y-6">Productos</figcaption>
            </figure>
            <figure className="relative w-[34%] max-w-[190px] sm:w-[18%]">
              <div className="overflow-hidden rounded-xl border border-line shadow-lg">
                <Image
                  src="/marketing/hero-cotizacion-mobile-v2.jpg"
                  alt={`Cotización de una propiedad en celular, hecha en ${BRAND.name}`}
                  width={292}
                  height={634}
                  sizes="(min-width: 640px) 18vw, 34vw"
                  className="w-full"
                  priority
                />
              </div>
              <figcaption className="mt-3 text-center text-sm font-medium text-ink">Propiedades</figcaption>
            </figure>
          </div>
        </section>

        {/* Qué es */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-14 sm:py-20">
            <h2 className="max-w-3xl font-display text-[30px] font-medium leading-[1.2] tracking-[-0.01em] text-ink sm:text-[40px]">
              Un sistema que te permite hacer cotizaciones en segundos, de manera sencilla.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-2">
              Agregas lo que vendes, tocas lo que tu cliente pidió y le mandas un link con el PDF listo. {BRAND.name} hace
              las cuentas, guarda el historial y te muestra cuántas veces la abrieron.
            </p>
          </div>
        </section>

        {/* Tres módulos */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-16">
            <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">Un módulo por cada giro</h2>
            <p className="mt-2 max-w-2xl text-ink-2">
              Si vendes muebles, ropa o maquillaje, ofreces servicios de plomería o manejas propiedades, eliges el
              módulo de lo que vendes y cotizas igual de rápido.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {modules.map((module) => (
                <div
                  key={module.name}
                  className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper"
                >
                  {/* El degradado del borde inferior avisa que la captura sigue: sin él la miniatura parecía cortada a media fila. */}
                  <a href={module.storefront} className="relative block border-b border-line" tabIndex={-1} aria-hidden>
                    <Image
                      src={module.image}
                      alt={module.alt}
                      width={752}
                      height={564}
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="aspect-[4/3] w-full object-cover object-top"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper to-transparent"
                    />
                  </a>
                  <div className="flex flex-1 flex-col gap-1 p-5">
                    <h3 className="font-medium text-ink">{module.name}</h3>
                    <p className="text-sm text-ink-2">{module.body}</p>
                    <p className="mt-1 text-sm text-ink-3">Ideal para: {module.examples}</p>
                    {module.from ? (
                      <p className="mt-2 text-sm text-ink-2">
                        Plan {module.plan} · desde {formatCurrency(module.from)}/mes
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-col gap-1 pt-3 text-sm font-medium text-accent">
                      <a href={module.panel} className="hover:underline">
                        Probar el panel de ejemplo →
                      </a>
                      <a href={module.storefront} className="hover:underline">
                        Ver la vitrina de ejemplo →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Por dentro de la app */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-16">
            <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">Así se ve por dentro</h2>
            <p className="mt-2 max-w-2xl text-ink-2">
              Capturas reales de los negocios de ejemplo. Cada una abre ese panel para que lo pruebes tú.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {inside.map((shot) => (
                <a key={shot.title} href={shot.href} className="group flex flex-col gap-3">
                  <div className="overflow-hidden rounded-lg border border-line shadow-lg transition-colors group-hover:border-ink-3">
                    <Image
                      src={shot.image}
                      alt={shot.alt}
                      width={1100}
                      height={825}
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="aspect-[4/3] w-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-ink">{shot.title}</h3>
                    <p className="mt-1 text-sm text-ink-2">{shot.body}</p>
                    <span className="mt-1 inline-block text-sm font-medium text-accent group-hover:underline">
                      Probarlo →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-16">
            <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">Cómo funciona</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col gap-2">
                  <span className="font-display text-2xl text-accent">{step.n}</span>
                  <h3 className="font-medium text-ink">{step.title}</h3>
                  <p className="text-sm text-ink-2">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo en vivo */}
        <section className="border-t border-line bg-ink">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-6 py-16">
            <div>
              <h2 className="font-display text-[24px] font-medium text-paper">Pruébalo sin registrarte</h2>
              <p className="mt-2 max-w-2xl text-sm text-paper/70">
                Elige un giro y entra al panel de un negocio de ejemplo. Arma una cotización de prueba, con PDF y
                WhatsApp. No se guarda nada.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                ["Servicios", "esencial"],
                ["Catálogo", "catalogo"],
                ["Broker", "broker"],
                ["Broker Pro", "brokerpro"],
              ].map(([label, plan]) => (
                <Link
                  key={plan}
                  href={`/demo/entrar?plan=${plan}`}
                  className={cn(buttonVariants({ size: "lg" }), "bg-paper text-ink hover:bg-sunken")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Precios resumidos */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-16">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">Precios</h2>
              <Link href="/precios" className="text-sm text-accent hover:underline">
                Ver todos los planes →
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              {(plans ?? []).map((plan) => (
                <div key={plan.code} className="rounded-lg border border-line p-5">
                  <p className="font-medium text-ink">{plan.name}</p>
                  <p className="mt-1 text-sm text-ink-2">{formatCurrency(Number(plan.price_month))}/mes</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-16">
            <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">Preguntas frecuentes</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-ink">{item.q}</h3>
                  <p className="mt-1 text-sm text-ink-2">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-4 px-6 py-20 text-center">
            <h2 className="font-display text-[32px] font-medium leading-[1.15] text-ink">
              Tu primera cotización, lista hoy.
            </h2>
            <Link href="/registro" className={buttonVariants({ size: "lg" })}>
              Prueba 7 días gratis
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
