-- Align the newly added clinical forms with the existing patient record rules.
-- Retains approved-vet, AAL2 and non-deleted-patient checks. Reuses the deployed
-- can_read_pet/can_write_pet rules, including unclaimed patients created by a vet.
begin;
create or replace function public.clinic_work_access(p_pet uuid,p_write boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2'
  and exists(select 1 from public.profiles where id=auth.uid() and role='vet' and deleted_at is null)
  and exists(select 1 from public.pets where id=p_pet and deleted_at is null)
  and case when p_write then public.can_write_pet(p_pet) else public.can_read_pet(p_pet) end;
$$;
revoke all on function public.clinic_work_access(uuid,boolean) from public,anon;
grant execute on function public.clinic_work_access(uuid,boolean) to authenticated;
commit;
