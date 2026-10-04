-- Tests de 0037 (datos fiscales). Correr con: supabase db query --linked -f (rollback forzado) o supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001501', 'f1@test.local'),
  ('00000000-0000-0000-0000-000000001502', 'f2@test.local'),
  ('00000000-0000-0000-0000-000000001503', 'f3@test.local');
select set_config('t.a', public.provision_tenant('00000000-0000-0000-0000-000000001501', 'Fiscal A', 'fiscal-a', 'esencial', 'active', null, 'admin', 'manual')::text, true);
select set_config('t.b', public.provision_tenant('00000000-0000-0000-0000-000000001503', 'Fiscal B', 'fiscal-b', 'esencial', 'active', null, 'admin', 'manual')::text, true);
alter table public.tenant_members disable trigger tenant_members_users_guard;
insert into public.tenant_members (tenant_id, user_id, role) values (current_setting('t.a')::uuid, '00000000-0000-0000-0000-000000001502', 'editor');
alter table public.tenant_members enable trigger tenant_members_users_guard;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000001501","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(format($$select public.set_billing_profile(%L, ' xaxx 010101-000 ', 'Mi Empresa SA de CV', '601', '06600', 'G03', 'Factura@Empresa.com')$$, current_setting('t.a')), 'el dueño guarda sus datos');
select is((select rfc from public.tenant_billing_profiles), 'XAXX010101000', 'RFC normalizado a mayúsculas sin espacios');
select is((select invoice_email from public.tenant_billing_profiles), 'factura@empresa.com', 'correo en minúsculas');
select lives_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'Mi Empresa SA de CV', '601', '06600', 'G03', 'otro@empresa.com')$$, current_setting('t.a')), 'guardar de nuevo actualiza');
select is((select count(*)::int from public.tenant_billing_profiles), 1, 'sigue habiendo una sola fila');
select throws_ok(format($$select public.set_billing_profile(%L, 'ABC', 'X Y', '601', '06600', 'G03', 'a@b.co')$$, current_setting('t.a')), '22023', 'invalid_rfc', 'RFC inválido');
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', '601', '6600', 'G03', 'a@b.co')$$, current_setting('t.a')), '22023', 'invalid_postal_code', 'CP de 4 dígitos');
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', '601', '06600', 'G03', 'sin-arroba')$$, current_setting('t.a')), '22023', 'invalid_email', 'correo inválido');
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', 'abc', '06600', 'G03', 'a@b.co')$$, current_setting('t.a')), '22023', 'invalid_tax_regime', 'régimen inválido');
select throws_ok($$insert into public.tenant_billing_profiles (tenant_id, rfc, legal_name, tax_regime, postal_code, invoice_email) values (gen_random_uuid(), 'XAXX010101000', 'X Y', '601', '06600', 'a@b.co')$$, '42501', null, 'sin escritura directa a la tabla');
reset role;

-- editor: no escribe ni lee
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000001502","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', '601', '06600', 'G03', 'a@b.co')$$, current_setting('t.a')), 'P0001', 'not_authorized', 'un editor no guarda datos fiscales');
select is((select count(*)::int from public.tenant_billing_profiles), 0, 'un editor no los ve');
reset role;

-- otro dueño: ni ve ni escribe los de A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000001503","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.tenant_billing_profiles), 0, 'otro negocio no ve los datos de A');
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', '601', '06600', 'G03', 'a@b.co')$$, current_setting('t.a')), 'P0001', 'not_authorized', 'ni escribe en A');
reset role;

set local role anon;
select throws_ok(format($$select public.set_billing_profile(%L, 'XAXX010101000', 'X Y', '601', '06600', 'G03', 'a@b.co')$$, current_setting('t.a')), '42501', null, 'anon no puede ejecutarla');
reset role;

select * from finish();
