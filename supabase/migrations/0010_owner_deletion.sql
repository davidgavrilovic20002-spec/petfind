-- Run once in the Supabase SQL Editor, after migrations 0001–0009.
-- Installing these functions does not delete any data.
begin;

create or replace function public.delete_my_tag(p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_tag public.pet_tags%rowtype;
begin
  if v_user is null or not exists (select 1 from auth.users where id = v_user) then
    raise exception 'Sign in required';
  end if;
  select t.* into v_tag from public.pet_tags t
    join public.pets p on p.id = t.pet_id
    where t.public_slug = p_slug and p.owner_id = v_user for update of t;
  if not found then raise exception 'Tag not found or access denied'; end if;
  -- Keep purchase history, but prevent the deleted tag appearing as unlinked.
  update public.orders set tag_uid = null
    where owner_id = v_user and tag_uid = v_tag.tag_uid;
  delete from public.pet_tags where id = v_tag.id;
end;
$$;
revoke all on function public.delete_my_tag(text) from public, anon;
grant execute on function public.delete_my_tag(text) to authenticated;

create or replace function public.delete_my_account(p_confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_email text;
begin
  select email into v_email from auth.users where id = v_user for update;
  if v_user is null or v_email is null then raise exception 'Sign in required'; end if;
  if lower(trim(p_confirmation)) is distinct from lower(v_email) then
    raise exception 'Confirmation does not match your email';
  end if;
  -- Do not remove the billing link while an external subscription can charge.
  if exists (select 1 from public.subscriptions where owner_id = v_user
    and stripe_subscription_id is not null and status not in ('canceled', 'incomplete_expired')) then
    raise exception 'Cancel your paid subscription before deleting your account';
  end if;
  -- Storage files need the Storage API; never orphan files by deleting metadata.
  if exists (select 1 from storage.objects where owner_id = v_user::text) then
    raise exception 'Please contact support to remove your uploaded files before account deletion';
  end if;
  delete from public.pet_tags where pet_id in
    (select id from public.pets where owner_id = v_user);
  delete from public.pets where owner_id = v_user;
  -- Remove non-cascading references and preserve other owners’ clinical records.
  delete from public.vet_pet_access where granted_by = v_user;
  update public.vaccinations set administered_by = null where administered_by = v_user;
  update public.diagnoses set vet_id = null where vet_id = v_user;
  update public.prescriptions set prescriber_id = null where prescriber_id = v_user;
  update public.record_attachments set uploaded_by = null where uploaded_by = v_user;
  delete from public.appointments where owner_id = v_user;
  update public.appointments set vet_id = null where vet_id = v_user;
  delete from public.orders where owner_id = v_user;
  -- Profiles, subscriptions, consents, notifications and ratings cascade.
  delete from auth.users where id = v_user;
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
commit;
