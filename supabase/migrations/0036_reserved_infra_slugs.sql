-- T10/T34 — Subdominios que el dominio comodín (`*.ayxco.app`) no debe regalar a un negocio porque ya los
-- usa la infraestructura: `send` (el correo de Resend vive en send.ayxco.app: MX y SPF), `resend`,
-- `ns1`/`ns2`, `smtp`, `mx`, `email`, `webmail` y los entornos `preview`/`staging`/`dev`
-- (`preview.ayxco.app` es el dominio raíz de los previews). Un negocio con uno de estos nombres tendría una
-- vitrina que nunca resuelve (el registro MX/TXT existe y el comodín no aplica a ese nombre).
-- Preflight (hallazgo de Codex): si un negocio ya usa uno de estos nombres, reservarlo lo dejaría sin vitrina
-- sin avisar. Mejor abortar y renombrarlo antes. (Revisado el 2026-10-04: ningún tenant los usa.)
do $$
declare v_conflict text;
begin
  select string_agg(slug, ', ') into v_conflict
  from public.tenants
  where slug in ('send','resend','ns1','ns2','smtp','mx','email','correo','webmail','preview','staging','dev');
  if v_conflict is not null then
    raise exception 'tenants que usan slugs de infraestructura reservados: %. Renómbralos antes de aplicar 0036.', v_conflict;
  end if;
end $$;

insert into public.blocked_terms (term, kind)
select public.normalize_slug(t), 'reserved'
from (values
  ('send'), ('resend'), ('ns1'), ('ns2'), ('smtp'), ('mx'), ('email'), ('correo'), ('webmail'),
  ('preview'), ('staging'), ('dev')
) as v(t)
on conflict (term) do nothing;
