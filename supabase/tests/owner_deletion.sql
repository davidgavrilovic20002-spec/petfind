-- Run in a disposable local database with the project schema and auth test stubs.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-1111-1111-111111111111','delete-test-a@example.test'),
 ('22222222-2222-2222-2222-222222222222','delete-test-b@example.test');
insert into public.pets(id,owner_id,name) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','B');
insert into public.pet_tags(pet_id,public_slug,tag_uid) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','delete-test-a','delete-test-a'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','delete-test-a2','delete-test-a2'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','delete-test-b','delete-test-b');
insert into public.orders(owner_id,tag_uid) values ('11111111-1111-1111-1111-111111111111','delete-test-a');
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
set local role authenticated;
do $$ begin
  begin
    perform public.delete_my_tag('delete-test-b');
    raise exception 'TEST FAILED: deleted another owner tag';
  exception when raise_exception then
    if sqlerrm <> 'Tag not found or access denied' then raise; end if;
  end;
  begin
    perform public.delete_my_account('wrong@example.test');
    raise exception 'TEST FAILED: wrong confirmation accepted';
  exception when raise_exception then
    if sqlerrm <> 'Confirmation does not match your email' then raise; end if;
  end;
end $$;
select public.delete_my_tag('delete-test-a');
reset role;
do $$ begin
  assert not exists(select 1 from public.pet_tags where public_slug='delete-test-a');
  assert exists(select 1 from public.pets where name='A');
  assert not exists(select 1 from public.orders where tag_uid='delete-test-a');
end $$;
set local role authenticated;
select public.delete_my_account('delete-test-a@example.test');
reset role;
do $$ begin
  assert not exists(select 1 from auth.users where email='delete-test-a@example.test');
  assert not exists(select 1 from public.profiles where id='11111111-1111-1111-1111-111111111111');
  assert not exists(select 1 from public.pets where name='A');
  assert not exists(select 1 from public.pet_tags where public_slug='delete-test-a2');
  assert not exists(select 1 from public.orders where owner_id='11111111-1111-1111-1111-111111111111');
  assert exists(select 1 from public.pet_tags where public_slug='delete-test-b');
  assert exists(select 1 from auth.users where email='delete-test-b@example.test');
  assert not has_function_privilege('anon','public.delete_my_account(text)','execute');
  assert not has_function_privilege('anon','public.delete_my_tag(text)','execute');
end $$;
rollback;
