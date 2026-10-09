import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

async function render(whatsapp: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPPORT_WHATSAPP", whatsapp);
  const { SiteFooter } = await import("./site-footer");
  return renderToStaticMarkup(<SiteFooter />);
}

afterEach(() => vi.unstubAllEnvs());

describe("SiteFooter · chat de dudas", () => {
  it("sin número configurado no pinta el botón flotante", async () => {
    const html = await render("");
    expect(html).not.toContain("Escríbenos por WhatsApp");
    expect(html).not.toContain("wa.me");
  });

  it("un número de 10 dígitos se manda a México (52) y trae mensaje", async () => {
    const html = await render("55 1234 5678");
    expect(html).toContain("https://wa.me/525512345678?text=");
    expect(html).toContain("Escríbenos por WhatsApp");
  });

  it("respeta un número con lada de país", async () => {
    const html = await render("+1 415 555 0100");
    expect(html).toContain("https://wa.me/14155550100?text=");
  });
});
