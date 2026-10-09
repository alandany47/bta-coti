import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de cancelación y reembolsos",
};

const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/[^\d]/g, "");

export default function ReembolsosPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[640px] px-6 py-16">
          <div className="mb-8 rounded-md border border-warn/30 bg-warn/10 p-4 text-sm text-ink">
            <strong>Borrador — pendiente de revisión legal.</strong> Este texto todavía no fue
            revisado por un abogado y no debe usarse para cobrar a clientes reales hasta que se apruebe.
          </div>

          <h1 className="font-display text-[32px] font-medium text-ink">Cancelación y reembolsos</h1>
          <p className="mt-2 text-sm text-ink-2">Última actualización: [pendiente].</p>

          <div className="mt-8 flex flex-col gap-6 text-ink-2">
            <section id="prueba">
              <h2 className="font-display text-[20px] font-medium text-ink">1. Prueba gratuita</h2>
              <p className="mt-1">
                Los primeros 7 días son gratis y no pedimos tarjeta. Si no eliges un plan, la cuenta se suspende
                sin cobro alguno y sin borrar tus datos.
              </p>
            </section>
            <section id="cancelar">
              <h2 className="font-display text-[20px] font-medium text-ink">2. Cancelar tu plan</h2>
              <p className="mt-1">
                Puedes cancelar cuando quieras desde Panel → Facturación. No se hace ningún cobro posterior y
                tu cuenta sigue funcionando hasta el último día del periodo que ya pagaste (mensual o anual).
              </p>
            </section>
            <section id="reembolsos">
              <h2 className="font-display text-[20px] font-medium text-ink">3. Reembolsos</h2>
              <ul className="mt-1 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-ink">Primer cobro:</strong> si pagaste un plan por primera vez y no te
                  sirvió, pide el reembolso completo dentro de los primeros 7 días naturales después del cobro.
                </li>
                <li>
                  <strong className="text-ink">Cobros duplicados o por error nuestro:</strong> los devolvemos en su
                  totalidad, sin importar cuándo se avisen.
                </li>
                <li>
                  <strong className="text-ink">Renovaciones y cambios de plan:</strong> no hay reembolso del periodo
                  ya iniciado; por eso conviene cancelar antes de la fecha de renovación. Si bajas de plan, el
                  cambio aplica al siguiente periodo.
                </li>
              </ul>
            </section>
            <section id="como-pedirlo">
              <h2 className="font-display text-[20px] font-medium text-ink">4. Cómo pedirlo</h2>
              <p className="mt-1">
                Escríbenos
                {SUPPORT_WHATSAPP ? (
                  <>
                    {" "}por{" "}
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      WhatsApp
                    </a>
                  </>
                ) : (
                  " por el canal de soporte de tu panel"
                )}{" "}
                con el nombre de tu negocio y la fecha del cobro. Respondemos en 2 días hábiles.
              </p>
            </section>
            <section id="plazos">
              <h2 className="font-display text-[20px] font-medium text-ink">5. En cuánto tiempo llega</h2>
              <p className="mt-1">
                Los pagos con tarjeta se devuelven a la misma tarjeta; el banco tarda de 5 a 10 días hábiles en
                reflejarlo. Los pagos por transferencia SPEI se devuelven a la cuenta que hizo el pago.
              </p>
            </section>
            <p className="border-t border-line pt-4 text-sm">
              Esta política complementa los{" "}
              <Link href="/legal/terminos" className="text-accent underline underline-offset-2">
                Términos de servicio
              </Link>{" "}
              de {BRAND.name}.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
