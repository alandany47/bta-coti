/** Datos fiscales del negocio para poder facturarle (CFDI 4.0). Mismas reglas que la RPC `set_billing_profile` (0037). */

export const TAX_REGIMES: { code: string; label: string }[] = [
  { code: "601", label: "601 · General de Ley Personas Morales" },
  { code: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
  { code: "605", label: "605 · Sueldos y Salarios" },
  { code: "606", label: "606 · Arrendamiento" },
  { code: "612", label: "612 · Personas Físicas con Actividades Empresariales y Profesionales" },
  { code: "616", label: "616 · Sin obligaciones fiscales" },
  { code: "621", label: "621 · Incorporación Fiscal" },
  { code: "625", label: "625 · RESICO Plataformas Tecnológicas" },
  { code: "626", label: "626 · Régimen Simplificado de Confianza (RESICO)" },
];

export const CFDI_USES: { code: string; label: string }[] = [
  { code: "G03", label: "G03 · Gastos en general" },
  { code: "G01", label: "G01 · Adquisición de mercancías" },
  { code: "P01", label: "P01 · Por definir" },
  { code: "S01", label: "S01 · Sin efectos fiscales" },
];

export type BillingProfileInput = {
  rfc: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  cfdiUse: string;
  invoiceEmail: string;
};

const RFC_PATTERN = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeRfc(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

/** Valida y normaliza el cuerpo del PUT. Devuelve el mensaje de error (en español) o los datos limpios. */
export function parseBillingProfile(body: unknown): { error: string } | { data: BillingProfileInput } {
  if (!body || typeof body !== "object") return { error: "Datos inválidos." };
  const raw = body as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");

  const rfc = normalizeRfc(text("rfc"));
  if (!RFC_PATTERN.test(rfc)) return { error: "El RFC no es válido: 12 caracteres para empresas, 13 para personas físicas." };

  const legalName = text("legalName");
  if (legalName.length < 2 || legalName.length > 200) return { error: "Escribe la razón social tal como aparece en tu constancia fiscal." };

  const taxRegime = text("taxRegime");
  if (!TAX_REGIMES.some((r) => r.code === taxRegime)) return { error: "Elige tu régimen fiscal." };

  const postalCode = text("postalCode");
  if (!/^[0-9]{5}$/.test(postalCode)) return { error: "El código postal fiscal son 5 dígitos." };

  const cfdiUse = text("cfdiUse") || "G03";
  if (!CFDI_USES.some((u) => u.code === cfdiUse)) return { error: "Elige un uso de CFDI." };

  const invoiceEmail = text("invoiceEmail").toLowerCase();
  if (!EMAIL_PATTERN.test(invoiceEmail) || invoiceEmail.length > 254) return { error: "El correo para enviarte la factura no es válido." };

  return { data: { rfc, legalName, taxRegime, postalCode, cfdiUse, invoiceEmail } };
}
