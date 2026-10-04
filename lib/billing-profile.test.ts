import { describe, expect, it } from "vitest";
import { normalizeRfc, parseBillingProfile } from "./billing-profile";

const valid = { rfc: " xaxx 010101-000 ", legalName: "Mi Empresa SA de CV", taxRegime: "601", postalCode: "06600", cfdiUse: "G03", invoiceEmail: "Factura@Empresa.com" };

describe("billing profile", () => {
  it("normaliza el RFC", () => {
    expect(normalizeRfc(" xaxx 010101-000 ")).toBe("XAXX010101000");
  });
  it("acepta datos válidos y los limpia", () => {
    const result = parseBillingProfile(valid);
    expect("data" in result && result.data).toMatchObject({ rfc: "XAXX010101000", invoiceEmail: "factura@empresa.com" });
  });
  it("acepta RFC de persona moral (12)", () => {
    expect("data" in parseBillingProfile({ ...valid, rfc: "ABC010101AB1" })).toBe(true);
  });
  it.each([
    [{ rfc: "ABC" }],
    [{ legalName: "X" }],
    [{ taxRegime: "999" }],
    [{ postalCode: "6600" }],
    [{ cfdiUse: "ZZ9" }],
    [{ invoiceEmail: "sin-arroba" }],
  ])("rechaza %j", (patch) => {
    expect("error" in parseBillingProfile({ ...valid, ...patch })).toBe(true);
  });
  it("rechaza cuerpos que no son objetos", () => {
    expect("error" in parseBillingProfile(null)).toBe(true);
    expect("error" in parseBillingProfile("x")).toBe(true);
  });
});
