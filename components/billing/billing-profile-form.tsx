"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CFDI_USES, TAX_REGIMES, type BillingProfileInput } from "@/lib/billing-profile";

const EMPTY: BillingProfileInput = { rfc: "", legalName: "", taxRegime: "601", postalCode: "", cfdiUse: "G03", invoiceEmail: "" };

/** Datos para facturarle al negocio (CFDI 4.0). Los textos deben coincidir con su constancia de situación fiscal. */
export function BillingProfileForm({
  tenantSlug,
  initial,
  defaultEmail,
}: {
  tenantSlug: string;
  initial: BillingProfileInput | null;
  defaultEmail: string;
}) {
  const [form, setForm] = useState<BillingProfileInput>(initial ?? { ...EMPTY, invoiceEmail: defaultEmail });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = (key: keyof BillingProfileInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/${tenantSlug}/billing/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      setMessage(res.ok ? { kind: "ok", text: "Datos fiscales guardados." } : { kind: "error", text: body.error ?? "No pudimos guardar." });
    } catch {
      setMessage({ kind: "error", text: "Sin conexión. Intenta de nuevo." });
    } finally {
      setPending(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  const label = "text-xs font-medium text-foreground-muted";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <div>
        <h2 className="text-sm font-medium text-ink">Datos fiscales para tu factura</h2>
        <p className="mt-1 text-xs text-ink-3">
          Cópialos de tu constancia de situación fiscal. Con ellos te emitimos la factura (CFDI) de tu suscripción.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <label htmlFor="rfc" className={label}>RFC</label>
          <Input id="rfc" value={form.rfc} onChange={set("rfc")} maxLength={16} autoCapitalize="characters" required />
        </div>
        <div className={field}>
          <label htmlFor="postalCode" className={label}>Código postal fiscal</label>
          <Input id="postalCode" value={form.postalCode} onChange={set("postalCode")} inputMode="numeric" maxLength={5} required />
        </div>
        <div className={`${field} sm:col-span-2`}>
          <label htmlFor="legalName" className={label}>Razón social</label>
          <Input id="legalName" value={form.legalName} onChange={set("legalName")} maxLength={200} required />
        </div>
        <div className={`${field} sm:col-span-2`}>
          <label htmlFor="taxRegime" className={label}>Régimen fiscal</label>
          <Select id="taxRegime" value={form.taxRegime} onChange={set("taxRegime")}>
            {TAX_REGIMES.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="cfdiUse" className={label}>Uso del CFDI</label>
          <Select id="cfdiUse" value={form.cfdiUse} onChange={set("cfdiUse")}>
            {CFDI_USES.map((u) => (
              <option key={u.code} value={u.code}>{u.label}</option>
            ))}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="invoiceEmail" className={label}>Correo para enviarte la factura</label>
          <Input id="invoiceEmail" type="email" value={form.invoiceEmail} onChange={set("invoiceEmail")} required />
        </div>
      </div>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-ok"}>
          {message.text}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar datos fiscales"}</Button>
      </div>
    </form>
  );
}
