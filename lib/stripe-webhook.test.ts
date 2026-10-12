import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

type StatusResult = { ok: true; slug: string } | { ok: false; code: "reason_required" | "not_found" | "error" };

const { setTenantStatus, logAudit } = vi.hoisted(() => ({
  setTenantStatus: vi.fn(async (): Promise<StatusResult> => ({ ok: true, slug: "tenant-x" })),
  logAudit: vi.fn(async () => {}),
}));
vi.mock("@/lib/admin-status", () => ({ setTenantStatus, logAudit }));

const { handleStripeEvent } = await import("./stripe-webhook");

type Row = Record<string, unknown>;

function fakeSupabase(initial: { stripe_events?: Row[]; subscriptions?: Row[]; plans?: Row[]; tenants?: Row[] } = {}) {
  const tables: Record<string, Row[]> = {
    stripe_events: initial.stripe_events ?? [],
    subscriptions: initial.subscriptions ?? [],
    plans: initial.plans ?? [],
    tenants: initial.tenants ?? [],
  };
  const client = {
    tables,
    from(name: string) {
      const rows = tables[name];
      return {
        insert: async (row: Row) => {
          if (name === "stripe_events" && rows.some((r) => r.id === row.id)) {
            return { error: { code: "23505" } };
          }
          rows.push(row);
          return { error: null };
        },
        update: (patch: Row) => ({
          eq: async (col: string, value: unknown) => {
            for (const row of rows) if (row[col] === value) Object.assign(row, patch);
            return { error: null };
          },
        }),
        upsert: async (row: Row) => {
          const idx = rows.findIndex((r) => r.tenant_id === row.tenant_id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
          else rows.push(row);
          return { error: null };
        },
        select: () => ({
          eq: (col: string, value: unknown) => ({
            maybeSingle: async () => ({ data: rows.find((r) => r[col] === value) ?? null, error: null }),
          }),
          or: () => ({
            maybeSingle: async () => {
              // usado solo por planIdForPrice; basta con la primera coincidencia por price id
              const match = rows.find((r) => r.stripe_price_month || r.stripe_price_year);
              return { data: match ?? null, error: null };
            },
          }),
        }),
      };
    },
  };
  return client as never;
}

function fakeEvent(id: string, type: string, object: unknown, created = 1_900_000_000): Stripe.Event {
  return { id, type, created, data: { object } } as unknown as Stripe.Event;
}

beforeEach(() => {
  setTenantStatus.mockClear();
  logAudit.mockClear();
});

describe("handleStripeEvent", () => {
  it("no reprocesa un evento cuya id ya está en stripe_events", async () => {
    const supabase = fakeSupabase({ stripe_events: [{ id: "evt_1", type: "invoice.paid" }] });
    await handleStripeEvent(fakeEvent("evt_1", "invoice.paid", {}), supabase);
    expect(setTenantStatus).not.toHaveBeenCalled();
  });

  it("checkout.session.completed activa el tenant solo si ya se pagó", async () => {
    const supabase = fakeSupabase({ tenants: [{ id: "tenant-1" }] });
    const session = { client_reference_id: "tenant-1", payment_status: "paid", metadata: {} };
    await handleStripeEvent(fakeEvent("evt_2", "checkout.session.completed", session), supabase);
    expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "active", null, null);
  });

  it("checkout.session.completed NO activa si el pago sigue pendiente (OXXO/SPEI vía voucher)", async () => {
    const supabase = fakeSupabase({ tenants: [{ id: "tenant-1" }] });
    const session = { client_reference_id: "tenant-1", payment_status: "unpaid", metadata: {} };
    await handleStripeEvent(fakeEvent("evt_2b", "checkout.session.completed", session), supabase);
    expect(setTenantStatus).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated guarda la fila y liga customer/plan al tenant (Checkout o SPEI directo)", async () => {
    const supabase = fakeSupabase({
      plans: [{ id: "plan-esencial", stripe_price_month: "price_esencial_month", stripe_price_year: "price_esencial_year" }],
      tenants: [{ id: "tenant-1" }],
    });
    const sub = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      collection_method: "charge_automatically",
      cancel_at_period_end: false,
      metadata: { tenant_id: "tenant-1" },
      items: { data: [{ price: { id: "price_esencial_month" }, current_period_end: 1893456000 }] },
    };
    await handleStripeEvent(fakeEvent("evt_3", "customer.subscription.updated", sub), supabase);

    const tables = (supabase as never as { tables: { subscriptions: Row[]; tenants: Row[] } }).tables;
    expect(tables.subscriptions[0]).toMatchObject({ tenant_id: "tenant-1", stripe_subscription_id: "sub_1", status: "active" });
    expect(tables.tenants[0]).toMatchObject({ plan_id: "plan-esencial", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" });
  });

  it("customer.subscription.deleted cancela la suscripción, limpia el tenant y permite volver a suscribirse", async () => {
    const supabase = fakeSupabase({
      subscriptions: [{ tenant_id: "tenant-1", stripe_subscription_id: "sub_1", status: "active" }],
      tenants: [{ id: "tenant-1", stripe_subscription_id: "sub_1" }],
    });
    const sub = { id: "sub_1", metadata: { tenant_id: "tenant-1" } };
    await handleStripeEvent(fakeEvent("evt_4", "customer.subscription.deleted", sub), supabase);

    const tables = (supabase as never as { tables: { subscriptions: Row[]; tenants: Row[] } }).tables;
    expect(tables.subscriptions[0]).toMatchObject({ status: "canceled" });
    expect(tables.tenants[0]).toMatchObject({ stripe_subscription_id: null });
    expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "canceled", "subscription_deleted", null);
  });

  it("invoice.payment_failed pone el tenant en past_due buscando por la suscripción", async () => {
    const supabase = fakeSupabase({ subscriptions: [{ tenant_id: "tenant-1", stripe_subscription_id: "sub_1" }] });
    const invoice = { parent: { subscription_details: { subscription: "sub_1" } } };
    await handleStripeEvent(fakeEvent("evt_5", "invoice.payment_failed", invoice), supabase);

    expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "past_due", "payment_failed", null);
  });

  it("invoice.paid sin suscripción asociada no llama a setTenantStatus", async () => {
    const supabase = fakeSupabase();
    const invoice = { parent: null };
    await handleStripeEvent(fakeEvent("evt_6", "invoice.paid", invoice), supabase);
    expect(setTenantStatus).not.toHaveBeenCalled();
  });

  it("invoice.paid resuelve el tenant por el metadata de la suscripción aunque no exista fila en `subscriptions` todavía", async () => {
    // Stripe no garantiza el orden de entrega: esto simula que invoice.paid llegó ANTES que
    // customer.subscription.created hubiera guardado la fila local.
    const supabase = fakeSupabase();
    const invoice = { parent: { subscription_details: { subscription: "sub_sin_fila", metadata: { tenant_id: "tenant-1" } } } };
    await handleStripeEvent(fakeEvent("evt_6b", "invoice.paid", invoice), supabase);
    expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "active", null, null);
  });

  it("invoice.paid NO reactiva a un tenant que el admin suspendió con un motivo escrito", async () => {
    const supabase = fakeSupabase({ tenants: [{ id: "tenant-1", status: "suspended", status_reason: "abuso: contenido ilegal" }] });
    const invoice = { parent: { subscription_details: { subscription: "sub_1", metadata: { tenant_id: "tenant-1" } } } };
    await handleStripeEvent(fakeEvent("evt_6d", "invoice.paid", invoice), supabase);
    expect(setTenantStatus).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith("stripe.reactivation_skipped", "tenant-1", null, { status: "suspended", reason: "abuso: contenido ilegal" });
  });

  it("invoice.paid sí reactiva una suspensión del sistema (falta de pago, prueba vencida, cancelación previa)", async () => {
    for (const [i, reason] of ["payment_failed", "trial_expired", "subscription_deleted"].entries()) {
      setTenantStatus.mockClear();
      const status = reason === "subscription_deleted" ? "canceled" : "suspended";
      const supabase = fakeSupabase({ tenants: [{ id: "tenant-1", status, status_reason: reason }] });
      const invoice = { parent: { subscription_details: { subscription: "sub_1", metadata: { tenant_id: "tenant-1" } } } };
      await handleStripeEvent(fakeEvent(`evt_6e${i}`, "invoice.paid", invoice), supabase);
      expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "active", null, null);
    }
  });

  it("invoice.overdue pone en past_due una suscripción SPEI que nunca se pagó", async () => {
    const supabase = fakeSupabase({ subscriptions: [{ tenant_id: "tenant-1", stripe_subscription_id: "sub_spei" }] });
    const invoice = { parent: { subscription_details: { subscription: "sub_spei" } } };
    await handleStripeEvent(fakeEvent("evt_6c", "invoice.overdue", invoice), supabase);
    expect(setTenantStatus).toHaveBeenCalledWith("tenant-1", "past_due", "payment_failed", null);
  });

  it("charge.dispute.created deja auditoría sin tenant_id (no viaja en el objeto)", async () => {
    const supabase = fakeSupabase();
    const dispute = { id: "dp_1", amount: 50000, charge: "ch_1" };
    await handleStripeEvent(fakeEvent("evt_7", "charge.dispute.created", dispute), supabase);
    expect(logAudit).toHaveBeenCalledWith("stripe.dispute_created", null, null, { dispute_id: "dp_1", amount: 50000, charge: "ch_1" });
  });

  it("solo marca el evento como procesado DESPUÉS de aplicar sus efectos, y no antes", async () => {
    const supabase = fakeSupabase({ tenants: [{ id: "tenant-1" }] });
    const session = { client_reference_id: "tenant-1", payment_status: "paid", metadata: {} };
    const tables = (supabase as never as { tables: { stripe_events: Row[] } }).tables;

    await handleStripeEvent(fakeEvent("evt_8", "checkout.session.completed", session), supabase);
    expect(tables.stripe_events).toHaveLength(1);
    expect(setTenantStatus).toHaveBeenCalledTimes(1);

    // un reintento de Stripe con el mismo evento ya no vuelve a procesar
    await handleStripeEvent(fakeEvent("evt_8", "checkout.session.completed", session), supabase);
    expect(setTenantStatus).toHaveBeenCalledTimes(1);
  });

  it("si setTenantStatus falla, revienta y NO marca el evento como procesado (para que Stripe reintente)", async () => {
    setTenantStatus.mockResolvedValueOnce({ ok: false, code: "error" });
    const supabase = fakeSupabase({ tenants: [{ id: "tenant-1" }] });
    const session = { client_reference_id: "tenant-1", payment_status: "paid", metadata: {} };

    await expect(handleStripeEvent(fakeEvent("evt_9", "checkout.session.completed", session), supabase)).rejects.toThrow();
    expect((supabase as never as { tables: { stripe_events: Row[] } }).tables.stripe_events).toHaveLength(0);
  });
  describe("orden de eventos entre suscripciones (revisión de Codex)", () => {
    const tenantsAndRows = () =>
      fakeSupabase({
        plans: [{ id: "plan-nuevo", stripe_price_month: "price_nuevo", stripe_price_year: null }],
        // el tenant ya pasó a sub_nueva; la fila se guardó en 1_900_000_100 s
        subscriptions: [{ tenant_id: "tenant-1", stripe_subscription_id: "sub_nueva", status: "active", updated_at: new Date(1_900_000_100_000).toISOString() }],
        tenants: [{ id: "tenant-1", stripe_subscription_id: "sub_nueva", plan_id: "plan-nuevo" }],
      });
    const oldSub = (status: string) => ({
      id: "sub_vieja",
      customer: "cus_1",
      status,
      collection_method: "charge_automatically",
      cancel_at_period_end: false,
      metadata: { tenant_id: "tenant-1" },
      items: { data: [{ price: { id: "price_viejo" }, current_period_end: 1893456000 }] },
    });

    it("un .updated retrasado de la suscripción vieja NO pisa la nueva", async () => {
      const supabase = tenantsAndRows();
      await handleStripeEvent(fakeEvent("evt_s1", "customer.subscription.updated", oldSub("active"), 1_900_000_000), supabase);
      const tables = (supabase as never as { tables: { subscriptions: Row[]; tenants: Row[] } }).tables;
      expect(tables.subscriptions[0]).toMatchObject({ stripe_subscription_id: "sub_nueva", status: "active" });
      expect(tables.tenants[0]).toMatchObject({ stripe_subscription_id: "sub_nueva", plan_id: "plan-nuevo" });
    });

    it("si no es demostrablemente viejo, revienta para que Stripe reintente y no marca el evento", async () => {
      const supabase = tenantsAndRows();
      await expect(
        handleStripeEvent(fakeEvent("evt_s2", "customer.subscription.created", oldSub("active"), 1_900_000_500), supabase),
      ).rejects.toThrow();
      expect((supabase as never as { tables: { stripe_events: Row[] } }).tables.stripe_events).toHaveLength(0);
    });

    it("una suscripción nueva sí reemplaza a una ya terminada", async () => {
      const supabase = fakeSupabase({
        subscriptions: [{ tenant_id: "tenant-1", stripe_subscription_id: "sub_vieja", status: "canceled", updated_at: new Date(1_900_000_000_000).toISOString() }],
        tenants: [{ id: "tenant-1", stripe_subscription_id: "sub_vieja" }],
      });
      const sub = { ...oldSub("active"), id: "sub_nueva" };
      await handleStripeEvent(fakeEvent("evt_s3", "customer.subscription.created", sub, 1_900_000_500), supabase);
      const tables = (supabase as never as { tables: { subscriptions: Row[] } }).tables;
      expect(tables.subscriptions[0]).toMatchObject({ stripe_subscription_id: "sub_nueva", status: "active" });
    });

    it("un .deleted retrasado de la suscripción vieja NO cancela al tenant que ya tiene otra vigente", async () => {
      const supabase = tenantsAndRows();
      await handleStripeEvent(fakeEvent("evt_s4", "customer.subscription.deleted", oldSub("canceled"), 1_900_000_000), supabase);
      const tables = (supabase as never as { tables: { subscriptions: Row[]; tenants: Row[] } }).tables;
      expect(tables.tenants[0]).toMatchObject({ stripe_subscription_id: "sub_nueva" });
      expect(tables.subscriptions[0]).toMatchObject({ status: "active" });
      expect(setTenantStatus).not.toHaveBeenCalled();
    });
  });
});
