-- Revisión de Codex: borrar un ítem cuya foto sigue en una cotización vigente respondía siempre 500.
-- `delete_media` rechaza con `media_in_use` y `mark_media_detached` solo ponía `detached_at`; la fila
-- conservaba `item_id`, y como `media_item_id_fkey` (0015) no es en cascada, el DELETE del ítem fallaba.
-- Desprender de verdad = soltar también `item_id`: la fila y el objeto de R2 se quedan para las
-- cotizaciones congeladas y el cron diario (`retry_detached_media_deletes`) los borra al vencer.
create or replace function public.mark_media_detached(p_id uuid, p_tenant uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.media set detached_at = coalesce(detached_at, now()), item_id = null
  where id = p_id and tenant_id = p_tenant;
$$;

revoke execute on function public.mark_media_detached(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_media_detached(uuid, uuid) to service_role;
