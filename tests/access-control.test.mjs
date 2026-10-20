import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, beforeEach, after } from 'node:test';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'src/lib/access-policy.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const policyModule = { exports: {} };
new Function('exports', 'module', compiled)(policyModule.exports, policyModule);
const policy = policyModule.exports;
const admin = '00000000-0000-4000-8000-000000000001';
const user = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const course = '00000000-0000-4000-8000-000000000010';
let db;

async function identity(id = null, role = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [id || '', role]);
  if (role === 'authenticated' || role === 'anon') await db.exec(`set role ${role}`);
}

async function state(id = user) {
  return (await db.query('select status::text, expires_at::text as expiry, approved_at::text as approved_at from public.profiles where id=$1', [id])).rows[0];
}

async function change(action, options = {}) {
  const snapshot = options.snapshot || await state(options.id || user);
  return db.query('select public.manage_user_access($1::uuid,$2::text,$3::text,$4::timestamptz,$5::timestamptz,$6::integer,$7::boolean)', [
    options.id || user, action, snapshot.status, snapshot.expiry, options.expiry || null, options.days ?? null, options.noExpiry ?? false,
  ]);
}

async function rejectCode(work, code) {
  await assert.rejects(work, (error) => error.code === code);
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid(),auth.role() to anon,authenticated;
    create type public.profile_role as enum ('user','admin');
    create type public.profile_status as enum ('pending','approved','expired','suspended');
    create table public.profiles (
      id uuid primary key, role public.profile_role not null default 'user',
      status public.profile_status not null default 'pending', full_name text,
      created_at timestamptz not null default now(), approved_at timestamptz, expires_at timestamptz
    );
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    insert into public.profiles(id,role,status,full_name) values
      ('${admin}','admin','approved','Administrator'), ('${user}','user','pending','Researcher'), ('${other}','user','pending','Other Researcher');
  `);
  for (const file of ['resource-access.sql','courses-and-silo.sql','visit-analytics.sql','silo-and-reports.sql','research-discussions.sql','admin-access-control.sql']) {
    await db.exec(readFileSync(join(root, 'scripts', file), 'utf8'));
  }
  await db.exec(`
    alter table public.profiles enable row level security;
    grant select, update on public.profiles to authenticated;
    create policy profile_read on public.profiles for select to authenticated
      using (id=auth.uid() or public.is_platform_admin());
    -- Deliberately broad self-update permission tests that the new guard protects access fields.
    create policy profile_update on public.profiles for update to authenticated
      using (id=auth.uid() or public.is_platform_admin()) with check (id=auth.uid() or public.is_platform_admin());
    insert into public.courses(id,author_id,title,status) values ('${course}','${admin}','Access test course','published');
    insert into public.course_files(course_id,file_name,storage_path,size_bytes)
      values ('${course}','test.pdf','${course}/test.pdf',100);
    insert into storage.objects(bucket_id,name) values ('course-materials','${course}/test.pdf');
  `);
});

beforeEach(async () => {
  await identity();
  await db.exec(`update public.profiles set status='approved', expires_at=null where id='${admin}';
    update public.profiles set role='user', status='pending', approved_at=null, expires_at=null, full_name='Researcher' where id in ('${user}','${other}');
    delete from public.user_resource_access where user_id in ('${user}','${other}');
    insert into public.user_resource_access(user_id,resource_key) select '${user}', unnest(array['courses','software','silo']);`);
  await identity(admin, 'authenticated');
});

after(async () => { if (db) await db.close(); });

test('application checks deny pending, suspended, expired, invalid, and unconfigured access', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  for (const status of ['pending','suspended','expired']) assert.equal(policy.hasActiveAccess({ role:'user', status, expires_at:'infinity' }, now), false);
  for (const expires_at of [null,'invalid','-infinity','2026-10-04T12:00:00Z']) assert.equal(policy.hasActiveAccess({ role:'user', status:'approved', expires_at }, now), false);
  assert.equal(policy.hasActiveAccess({ role:'user', status:'approved', expires_at:'infinity' }, now), true);
  assert.equal(policy.hasActiveAccess({ role:'user', status:'approved', expires_at:'2026-10-05T12:00:00Z' }, now), true);
  assert.equal(policy.hasActiveAccess({ role:'admin', status:'approved', expires_at:null }, now), true);
  assert.equal(policy.hasActiveAccess({ role:'unknown', status:'approved', expires_at:'infinity' }, now), false);
  assert.equal(policy.formatAccessExpiry('infinity'), 'No expiry');
  assert.equal(policy.remainingAccessDays('infinity', now), null);
  assert.equal(policy.effectiveAccessStatus({ role:'user', status:'approved', expires_at:null }, now), 'expired');
});

test('Saudi time input round-trips and rejects invalid dates', () => {
  assert.equal(policy.expiryInputValue('2026-10-04T12:30:00Z'), '2026-10-04T15:30');
  assert.equal(policy.expiryInputToIso('2026-10-04T15:30'), '2026-10-04T12:30:00.000Z');
  assert.equal(policy.expiryInputToIso('2026-02-30T12:00'), null);
  assert.equal(policy.expiryInputToIso('invalid'), null);
});

test('ordinary users and anonymous callers cannot manage access', async () => {
  await identity(user, 'authenticated');
  await rejectCode(change('approve', { noExpiry:true }), '42501');
  await identity(null, 'anon');
  await rejectCode(db.query('select public.manage_user_access($1, $2, $3)', [user,'approve','pending']), '42501');
});

test('saving pending settings does not approve; approval preserves the chosen custom expiry', async () => {
  await change('set', { expiry:'2099-12-31T20:59:00Z' });
  assert.equal((await state()).status, 'pending');
  assert.equal((await state()).approved_at, null);
  await change('approve', { expiry:'2099-12-31T20:59:00Z' });
  const saved=await state();
  assert.equal(saved.status, 'approved');
  assert.ok(saved.approved_at);
  assert.equal(Date.parse(saved.expiry), Date.parse('2099-12-31T20:59:00Z'));
});

test('approval supports each preset duration from the approval time', async () => {
  for (const days of [7,30,90]) {
    await identity();
    await db.query("update public.profiles set status='pending', approved_at=null, expires_at=null where id=$1", [user]);
    await identity(admin, 'authenticated');
    await change('approve', { days });
    const saved=await state();
    assert.equal(Date.parse(saved.expiry)-Date.parse(saved.approved_at), days*86_400_000);
  }
});

test('no expiry works through existing PostgreSQL resource checks, RLS, and storage policies', async () => {
  await change('approve', { noExpiry:true });
  assert.equal((await state()).expiry, 'infinity');
  await identity(user,'authenticated');
  const allowed=(await db.query("select public.can_access_courses() as courses, public.can_access_silo() as silo, public.can_access_discussion_resource('courses') as discussions")).rows[0];
  assert.deepEqual(allowed, { courses:true, silo:true, discussions:true });
  assert.equal((await db.query('select id from public.courses')).rows.length, 1);
  assert.equal((await db.query("select name from storage.objects where bucket_id='course-materials'")).rows.length, 1);
  await db.query("select public.record_resource_visit('courses')");
  assert.equal((await db.query("select public.can_access_discussion_resource('datasets') as allowed")).rows[0].allowed, false);
  await rejectCode(change('set', { noExpiry:true }), '42501');
});

test('no expiry does not give users resource cards they were not granted', async () => {
  await change('approve', { id:other, noExpiry:true });
  await identity(other,'authenticated');
  assert.equal((await db.query('select public.can_access_courses() as allowed')).rows[0].allowed, false);
  assert.equal((await db.query('select id from public.courses')).rows.length, 0);
  assert.equal((await db.query('select name from storage.objects')).rows.length, 0);
  await rejectCode(db.query("select public.record_resource_visit('courses')"), '42501');
});

test('future extensions add to the saved expiry and preserve the original approval time', async () => {
  await change('approve', { expiry:'2099-01-01T00:00:00Z' });
  const before=await state();
  await change('extend', { days:7 });
  const after=await state();
  assert.equal(Date.parse(after.expiry)-Date.parse(before.expiry), 7*86_400_000);
  assert.equal(after.approved_at,before.approved_at);
});

test('expired extensions start from today and renew the account', async () => {
  await identity();
  await db.query("update public.profiles set status='expired', expires_at='2000-01-01' where id=$1",[user]);
  await identity(admin,'authenticated');
  const before=(await db.query('select now()::text as time')).rows[0].time;
  await change('extend', { days:30 });
  const after=await state();
  assert.equal(after.status,'approved');
  assert.ok(Date.parse(after.expiry)>=Date.parse(before)+30*86_400_000);
});

test('suspended accounts stay suspended when extended or saved and need an explicit resume', async () => {
  await change('approve', { days:7 });
  await change('suspend');
  await change('extend', { days:90 });
  assert.equal((await state()).status,'suspended');
  await change('set',{ noExpiry:true });
  assert.equal((await state()).status,'suspended');
  await identity(user,'authenticated');
  assert.equal((await db.query('select public.can_access_courses() as allowed')).rows[0].allowed,false);
  await identity(admin,'authenticated');
  await change('resume');
  assert.equal((await state()).status,'approved');
});

test('revocation immediately blocks even an account with no expiry', async () => {
  await change('approve', { noExpiry:true });
  await change('revoke');
  const saved=await state();
  assert.equal(saved.status,'expired');
  assert.notEqual(saved.expiry,'infinity');
  await identity(user,'authenticated');
  assert.equal((await db.query('select public.can_access_courses() as allowed')).rows[0].allowed,false);
});

test('profile guard blocks self-extension, self-approval, and self-promotion while allowing name edits', async () => {
  await identity(user,'authenticated');
  await rejectCode(db.query("update public.profiles set expires_at='infinity' where id=$1",[user]),'42501');
  await rejectCode(db.query("update public.profiles set status='approved' where id=$1",[user]),'42501');
  await rejectCode(db.query("update public.profiles set role='admin' where id=$1",[user]),'42501');
  await db.query('update public.profiles set full_name=$1 where id=$2',['Updated name',user]);
  assert.equal((await db.query('select full_name from public.profiles where id=$1',[user])).rows[0].full_name,'Updated name');
});

test('invalid dates, invalid durations, and administrator targets are rejected', async () => {
  await rejectCode(change('approve',{ expiry:'2000-01-01' }),'22023');
  await rejectCode(change('approve',{ expiry:'infinity' }),'22023');
  await rejectCode(change('approve',{ noExpiry:true,days:7 }),'22023');
  for (const days of [0,-1,3651]) await rejectCode(change('approve',{ days }),'22023');
  await rejectCode(change('set',{ id:admin,noExpiry:true }),'22023');
});

test('stale account snapshots cannot overwrite another administrator change', async () => {
  const snapshot=await state();
  await change('set',{ expiry:'2099-01-01T00:00:00Z' });
  await rejectCode(change('set',{ snapshot,noExpiry:true }),'40001');
  assert.notEqual((await state()).expiry,'infinity');
});

test('suspended administrators cannot manage other accounts', async () => {
  await identity();
  await db.query("update public.profiles set status='suspended' where id=$1",[admin]);
  await identity(admin,'authenticated');
  await rejectCode(db.query('select public.manage_user_access($1,$2,$3)',[user,'approve','pending']),'42501');
});

test('the migration can be rerun without changing accounts or resource grants', async () => {
  await change('approve',{ noExpiry:true });
  const saved=await state();
  await identity();
  const before=(await db.query('select count(*)::int as count from public.user_resource_access')).rows[0].count;
  await db.exec(readFileSync(join(root,'scripts/admin-access-control.sql'),'utf8'));
  assert.deepEqual(await state(),saved);
  assert.equal((await db.query('select count(*)::int as count from public.user_resource_access')).rows[0].count,before);
});
