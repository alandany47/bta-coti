import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const title = `${BRAND.name} · Cotizaciones en segundos para servicios, productos y propiedades`;
const description =
  "Sistema para hacer cotizaciones en segundos y de manera sencilla: venta de muebles, servicios de plomería, ropa, maquillaje, inmobiliarias y más. Catálogo, PDF y envío por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.domain}`),
  title: { default: title, template: `%s · ${BRAND.name}` },
  description,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: BRAND.name,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${instrumentSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
