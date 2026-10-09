"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { whatsappDigits } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

const LINKS = [
  { href: "/legal/terminos", label: "Términos" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/reembolsos", label: "Reembolsos" },
  { href: "/ayuda", label: "Ayuda" },
];

export function SiteFooter() {
  const pathname = usePathname();
  // Misma regla que todo el producto: 10 dígitos = México (52); sin lada, wa.me manda el mensaje a otro país.
  const supportDigits = SUPPORT_WHATSAPP.replace(/\D/g, "") ? whatsappDigits(SUPPORT_WHATSAPP) : "";
  return (
    <>
    {supportDigits ? (
      <a
        href={`https://wa.me/${supportDigits}?text=${encodeURIComponent(`Hola, tengo una duda sobre ${BRAND.name}.`)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed bottom-4 right-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper shadow-lg transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">¿Dudas? Escríbenos</span>
      </a>
    ) : null}
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-6 py-10 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. Hecho en México.
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn("hover:text-ink", pathname === item.href && "font-medium text-ink")}
            >
              {item.label}
            </Link>
          ))}
          {supportDigits ? (
            <a
              href={`https://wa.me/${supportDigits}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              Soporte por WhatsApp
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
    </>
  );
}
