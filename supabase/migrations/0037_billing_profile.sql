-- Datos fiscales del cliente (RFC y compañía) para poder emitirle factura (CFDI 4.0). Stripe no emite CFDI:
-- por ahora la factura se hace a mano o con un PAC, y este perfil es lo que se necesita.
-- Tabla aparte (no columnas de `tenants`) porque `tenants` se lee con anon por allow-list de columnas y esto
-- es un dato privado del dueño: RLS solo deja leerlo al dueño; escribir, solo por RPC.
create table public.tenant_billing_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  rfc text not null check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  tax_regime text not null check (tax_regime ~ '^[0-9]{3}$'),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  cfdi_use text not null default 'G03' check (cfdi_use ~ '^[A-Z]{1,2}[0-9]{2}$'),
  invoice_email text not null check (invoice_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' and char_length(invoice_email) <= 254),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.tenant_billing_profiles enable row level security;

create policy billing_profile_owner_select on public.tenant_billing_profiles
  for select to authenticated
  using (public.is_member(tenant_id, 'owner'));

revoke all on public.tenant_billing_profiles from public, anon, authenticated;
grant select on public.tenant_billing_profiles to authenticated;
grant all on public.tenant_billing_profiles to service_role;

-- set_billing_profile: solo el dueño (aunque el tenant esté suspendido: es la página donde paga). Normaliza
-- el RFC a mayúsculas sin espacios y valida formato; la demo no guarda nada.
create or replace function public.set_billing_profile(
  p_tenant uuid, p_rfc text, p_legal_name text, p_tax_regime text,
  p_postal_code text, p_cfdi_use text, p_invoice_email text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfc text := upper(regexp_replace(coalesce(p_rfc, ''), '[[:space:]-]', '', 'g'));
  v_name text := btrim(coalesce(p_legal_name, ''));
  v_email text := lower(btrim(coalesce(p_invoice_email, '')));
begin
  if not public.is_member(p_tenant, 'owner') then
    raise exception 'not_authorized';
  end if;
  if exists (select 1 from public.tenants t where t.id = p_tenant and t.is_demo) then
    raise exception 'demo_readonly' using errcode = '42501';
  end if;
  if v_rfc !~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$' then
    raise exception 'invalid_rfc' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 200 then
    raise exception 'invalid_legal_name' using errcode = '22023';
  end if;
  if coalesce(p_tax_regime, '') !~ '^[0-9]{3}$' then
    raise exception 'invalid_tax_regime' using errcode = '22023';
  end if;
  if coalesce(p_postal_code, '') !~ '^[0-9]{5}$' then
    raise exception 'invalid_postal_code' using errcode = '22023';
  end if;
  if coalesce(p_cfdi_use, '') !~ '^[A-Z]{1,2}[0-9]{2}$' then
    raise exception 'invalid_cfdi_use' using errcode = '22023';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  insert into public.tenant_billing_profiles
    (tenant_id, rfc, legal_name, tax_regime, postal_code, cfdi_use, invoice_email, updated_at, updated_by)
  values (p_tenant, v_rfc, v_name, p_tax_regime, p_postal_code, p_cfdi_use, v_email, now(), auth.uid())
  on conflict (tenant_id) do update set
    rfc = excluded.rfc, legal_name = excluded.legal_name, tax_regime = excluded.tax_regime,
    postal_code = excluded.postal_code, cfdi_use = excluded.cfdi_use, invoice_email = excluded.invoice_email,
    updated_at = now(), updated_by = auth.uid();
end;
$$;

revoke execute on function public.set_billing_profile(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.set_billing_profile(uuid, text, text, text, text, text, text) to authenticated;
