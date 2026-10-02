import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const ids = { contractor: '11111111-1111-4111-8111-111111111111', other: '22222222-2222-4222-8222-222222222222', admin: '33333333-3333-4333-8333-333333333333', worker: '44444444-4444-4444-8444-444444444444', machineOwner: '55555555-5555-4555-8555-555555555555' }
const migration = readFileSync('backend/supabase/multi_service_provider_migration.sql', 'utf8')

test('multi-service migration and RLS enforce ownership and booking lifecycle', async (t) => {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `)
  // PGlite provides gen_random_uuid natively; the production-only extension is omitted.
  await db.exec(readFileSync('backend/supabase/schema.sql', 'utf8').replace('create extension if not exists pgcrypto;', ''))
  await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values
    ('${ids.contractor}','contractor@example.test','{"role":"contractor","full_name":"Test Contractor"}'),
    ('${ids.other}','customer@example.test','{"role":"customer","full_name":"Test Customer"}'),
    ('${ids.admin}','admin@example.test','{"role":"customer","full_name":"Test Admin"}'),
    ('${ids.worker}','worker@example.test','{"role":"worker","full_name":"Test Worker"}'),
    ('${ids.machineOwner}','owner@example.test','{"role":"machine_owner","full_name":"Test Owner"}');
    alter table public.profiles disable trigger profiles_protect_privileges;
    update public.profiles set role = 'admin' where id = '${ids.admin}';
    alter table public.profiles enable trigger profiles_protect_privileges;`)
  await db.exec(migration)
  await t.test('migration safely re-runs without removing existing accounts', async () => {
    await db.exec(migration)
    assert.equal((await db.query('select count(*)::int as count from public.profiles')).rows[0].count, 5)
  })
  const as = async (id, action) => {
    await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${id}';`)
    try { return await action() } finally { await db.exec('reset role') }
  }
  const insert = async (table, details) => {
    const keys = Object.keys(details)
    return (await db.query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(details))).rows[0]
  }
  const assets = {}
  await t.test('contractor creates all four listing types, including multiple managed workers', async () => {
    await as(ids.contractor, async () => {
      assets.machine = await insert('machines', { owner_id: ids.contractor, title: 'Excavator', machine_type: 'JCB', price: 100, price_unit: 'per day', city: 'Delhi', state: 'Delhi' })
      assets.tanker = await insert('tankers', { owner_id: ids.contractor, title: 'Water tanker', capacity: 1000, price: 50, price_unit: 'per day', city: 'Delhi', state: 'Delhi' })
      assets.material = await insert('materials', { supplier_id: ids.contractor, name: 'Cement', category: 'Cement', price: 10, unit: 'bag', quantity_available: 20, city: 'Delhi', state: 'Delhi' })
      assets.worker = await insert('worker_profiles', { provider_id: ids.contractor, display_name: 'Managed Driver', skill: 'Driver', daily_wage: 80, description: 'Keep this description', experience_years: 5, city: 'Delhi', state: 'Delhi' })
      await insert('worker_profiles', { provider_id: ids.contractor, display_name: 'Managed Mason', skill: 'Mason', daily_wage: 70, city: 'Delhi', state: 'Delhi' })
    })
  })
  await t.test('self-employed worker profiles remain valid', async () => {
    await as(ids.worker, async () => {
      const worker = await insert('worker_profiles', { user_id: ids.worker, skill: 'Driver', daily_wage: 90, city: 'Delhi', state: 'Delhi' })
      assert.equal(worker.provider_id, null)
    })
  })
  await t.test('contractor cannot impersonate a provider or self-approve', async () => {
    await as(ids.contractor, async () => {
      await assert.rejects(insert('machines', { owner_id: ids.other, title: 'Spoof', machine_type: 'JCB', price: 100, price_unit: 'per day', city: 'Delhi', state: 'Delhi' }), /row-level security/)
      await assert.rejects(db.query(`update public.machines set status = 'ACTIVE' where id = $1`, [assets.machine.id]), /administrator/)
      await assert.rejects(db.query('update public.worker_profiles set provider_id = $1 where id = $2', [ids.other, assets.worker.id]), /ownership/)
    })
  })
  await t.test('other accounts cannot edit or delete listings', async () => {
    await as(ids.other, async () => {
      for (const [table, asset] of [['machines', assets.machine], ['tankers', assets.tanker], ['materials', assets.material], ['worker_profiles', assets.worker]]) {
        assert.equal((await db.query(`update public.${table} set city = 'Changed' where id = $1 returning id`, [asset.id])).rows.length, 0)
        assert.equal((await db.query(`delete from public.${table} where id = $1 returning id`, [asset.id])).rows.length, 0)
      }
    })
  })
  await t.test('owner can edit and pause all asset types; coordinates are validated', async () => {
    await as(ids.contractor, async () => {
      for (const [table, asset] of [['machines', assets.machine], ['tankers', assets.tanker], ['materials', assets.material], ['worker_profiles', assets.worker]]) {
        const paused = table === 'worker_profiles' ? 'unavailable' : 'UNAVAILABLE'
        const available = table === 'worker_profiles' ? 'available' : 'AVAILABLE'
        assert.equal((await db.query(`update public.${table} set availability_status = $1, latitude = 0, longitude = 0 where id = $2 returning id`, [paused, asset.id])).rows.length, 1)
        await assert.rejects(db.query(`update public.${table} set latitude = 91 where id = $1`, [asset.id]), /listing_coordinates_check/)
        await db.query(`update public.${table} set availability_status = $1 where id = $2`, [available, asset.id])
      }
    })
  })
  await as(ids.admin, async () => {
    await db.query("update public.machines set status = 'ACTIVE' where id = $1", [assets.machine.id])
    await db.query("update public.tankers set status = 'ACTIVE' where id = $1", [assets.tanker.id])
  })
  const bookingDetails = (asset, type, requester = ids.other) => ({ customer_id: requester, provider_id: ids.contractor, item_type: type, item_id: asset.id, start_date: '2099-01-01', end_date: '2099-01-03', quantity: 2, total_price: 1 })
  const bookings = []
  await t.test('customer can book a contractor without seeing their private profile; stored totals override client totals', async () => {
    await as(ids.other, async () => {
      assert.equal((await db.query('select id from public.profiles where id = $1', [ids.contractor])).rows.length, 0)
      for (const [asset, type, expected] of [[assets.machine, 'MACHINE', 600], [assets.worker, 'WORKER', 480], [assets.tanker, 'TANKER', 300], [assets.material, 'MATERIAL', 20]]) {
        const booking = await insert('bookings', bookingDetails(asset, type))
        assert.equal(Number(booking.total_price), expected)
        bookings.push(booking)
      }
    })
  })
  await t.test('machine owners can request a managed driver', async () => {
    const booking = await as(ids.machineOwner, () => insert('bookings', bookingDetails(assets.worker, 'WORKER', ids.machineOwner)))
    assert.equal(booking.provider_id, ids.contractor)
  })
  await t.test('bookings reject forged providers, self-booking, unavailable workers, invalid initial status and excess material stock', async () => {
    await as(ids.other, async () => {
      await assert.rejects(insert('bookings', { ...bookingDetails(assets.worker, 'WORKER'), provider_id: ids.worker }), /provider is invalid/)
      await assert.rejects(insert('bookings', { ...bookingDetails(assets.worker, 'WORKER'), status: 'COMPLETED' }), /must be requested/)
      await assert.rejects(insert('bookings', { ...bookingDetails(assets.material, 'MATERIAL'), quantity: 100 }), /stock/)
    })
    await as(ids.contractor, async () => {
      await assert.rejects(insert('bookings', bookingDetails(assets.worker, 'WORKER', ids.contractor)), /provider is invalid/)
      await db.query("update public.worker_profiles set availability_status = 'working' where id = $1", [assets.worker.id])
    })
    await as(ids.other, () => assert.rejects(insert('bookings', bookingDetails(assets.worker, 'WORKER')), /unavailable/))
    await as(ids.contractor, () => db.query("update public.worker_profiles set availability_status = 'available' where id = $1", [assets.worker.id]))
  })
  await t.test('provider lifecycle completes; completed bookings cannot reopen', async () => {
    await as(ids.contractor, async () => {
      for (const status of ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']) await db.query('update public.bookings set status = $1 where id = $2', [status, bookings[0].id])
      await assert.rejects(db.query("update public.bookings set status = 'ACCEPTED' where id = $1", [bookings[0].id]), /Invalid booking status/)
    })
    await as(ids.other, () => assert.rejects(db.query("update public.bookings set status = 'CANCELLED' where id = $1", [bookings[0].id]), /only cancel active/))
  })
  await t.test('booked listings cannot be deleted via direct API; unbooked listings can', async () => {
    await as(ids.contractor, async () => {
      for (const [table, asset] of [['machines', assets.machine], ['tankers', assets.tanker], ['materials', assets.material], ['worker_profiles', assets.worker]]) await assert.rejects(db.query(`delete from public.${table} where id = $1`, [asset.id]), /booking history/)
      const unused = await insert('materials', { supplier_id: ids.contractor, name: 'Unused', category: 'Sand', price: 0, unit: 'ton', city: 'Delhi', state: 'Delhi' })
      assert.equal((await db.query('delete from public.materials where id = $1 returning id', [unused.id])).rows.length, 1)
    })
  })
  await t.test('a machine owner can review the driver they hired', async () => {
    const booking = (await db.query("select * from public.bookings where customer_id = $1 and item_type = 'WORKER'", [ids.machineOwner])).rows[0]
    await as(ids.contractor, async () => { for (const status of ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']) await db.query('update public.bookings set status = $1 where id = $2', [status, booking.id]) })
    await as(ids.machineOwner, () => insert('reviews', { booking_id: booking.id, reviewer_id: ids.machineOwner, reviewee_id: ids.contractor, rating: 5 }))
  })
  await db.close()
})
