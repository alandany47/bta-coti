import { NextResponse } from "next/server";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import { originFromHeaders, tenantOrigin } from "@/lib/auth/redirects";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * "Probar el panel" sin registro (docs/DEMO.md §2): entra con la sesión compartida del usuario
 * demo de un negocio por plan (por defecto `demo-broker`, la vitrina principal, "Residencial Almendro"). La contraseña
 * vive en `DEMO_PASSWORD` — la misma que usa `reset_demo_data` al recrear los tenants de demo.
 */
const DEMO_ACCOUNTS = {
  esencial: { slug: "demo-esencial", email: "owner.esencial@demo.ayx.test" },
  catalogo: { slug: "demo-catalogo", email: "editor.catalogo@demo.ayx.test" },
  broker: { slug: "demo-broker", email: "editor.broker@demo.ayx.test" },
  brokerpro: { slug: "demo-brokerpro", email: "editor.brokerpro@demo.ayx.test" },
} as const;

export async function GET(request: Request) {
  const origin = originFromHeaders(request.headers);
  const host = request.headers.get("host") ?? "";

  const limit = await checkRateLimit("demo", getClientIp(request.headers));
  if (!limit.ok) {
    return NextResponse.redirect(new URL("/?error=demo_ocupada", origin));
  }

  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "La demo no está configurada." }, { status: 503 });
  }

  // `?plan=esencial|catalogo|broker|brokerpro` elige el negocio de ejemplo; sin plan, la vitrina principal.
  const url = new URL(request.url);
  const planParam = url.searchParams.get("plan") || "broker";
  const account = Object.hasOwn(DEMO_ACCOUNTS, planParam) ? DEMO_ACCOUNTS[planParam as keyof typeof DEMO_ACCOUNTS] : null;
  if (!account) return NextResponse.redirect(new URL("/?error=demo_plan", origin));

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) {
    return NextResponse.json({ error: "La demo no está disponible en este momento." }, { status: 503 });
  }

  return NextResponse.redirect(`${tenantOrigin(account.slug, host)}/panel${url.searchParams.get("present") ? "?present=1" : ""}`);
}
