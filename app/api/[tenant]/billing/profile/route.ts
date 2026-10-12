import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth/api";
import { parseBillingProfile } from "@/lib/billing-profile";

/**
 * Datos fiscales del negocio (0037): solo el dueño los lee y los escribe, y siempre con el cliente de
 * sesión (RLS + RPC `set_billing_profile`). `anyStatus`: un negocio suspendido también puede dejar sus
 * datos para su factura, igual que el resto de `billing/*`.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug, "owner", { anyStatus: true });
  if (access instanceof NextResponse) return access;
  const { supabase, tenant } = access;

  const parsed = parseBillingProfile(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data } = parsed;

  const { error } = await supabase.rpc("set_billing_profile", {
    p_tenant: tenant.id,
    p_rfc: data.rfc,
    p_legal_name: data.legalName,
    p_tax_regime: data.taxRegime,
    p_postal_code: data.postalCode,
    p_cfdi_use: data.cfdiUse,
    p_invoice_email: data.invoiceEmail,
  });
  if (error) {
    if (error.message.includes("demo_readonly")) {
      return NextResponse.json({ error: "En la demo no se guardan datos." }, { status: 403 });
    }
    if (error.message.includes("not_authorized")) {
      return NextResponse.json({ error: "Solo el dueño del negocio puede cambiar los datos fiscales." }, { status: 403 });
    }
    if (error.code === "22023") {
      return NextResponse.json({ error: "Revisa los datos fiscales: alguno no es válido." }, { status: 400 });
    }
    return NextResponse.json({ error: "No pudimos guardar los datos fiscales." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
