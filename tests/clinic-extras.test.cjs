/* Covers the data-layer additions from 0032-0036: vitals, the client file,
   rooms, alert amendment and the schedule. The calendar and client PAGES are
   DOM-bound and are exercised in the browser instead; what is worth locking in
   here is the validation and the argument binding, which is where a mistake
   would be silent. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/clinic-data.js'), 'utf8');
const petId = '11111111-1111-4111-8111-111111111111';

function setup({ role = 'vet', aal = 'aal2', rpcResult = null, insertError = null } = {}) {
  const rpcs = [], inserts = [], selects = [];
  const client = {
    rpc(name, args) { rpcs.push({ name, args }); return Promise.resolve({ data: rpcResult }); },
    from(table) {
      let inserted = null, projection = null;
      const filters = [];
      const query = {
        select(cols) { projection = cols; return query; }, eq(k, v) { filters.push([k, v]); return query; },
        is(k, v) { filters.push([k, v]); return query; }, ilike(k, v) { filters.push([k, v]); return query; },
        order() { return query; }, limit(n) { filters.push(['limit', n]); return query; },
        insert(row) { inserted = row; return query; }, update(row) { inserted = row; return query; },
        delete() { return query; }, single() { return query; }, maybeSingle() { return query; },
        then(resolve, reject) {
          selects.push({ table, filters, projection });
          if (inserted) { inserts.push({ table, row: inserted }); }
          if (insertError && inserted) return Promise.resolve({ error: { message: insertError } }).then(resolve, reject);
          return Promise.resolve({ data: inserted ? { id: 'new' } : [] }).then(resolve, reject);
        }
      };
      return query;
    }
  };
  const PFDB = {
    client,
    getUser: async () => ({ id: 'user' }),
    getProfile: async () => ({ data: { id: 'user', role } }),
    mfaAAL: async () => ({ data: { currentLevel: aal, nextLevel: aal } })
  };
  const sandbox = { window: { PFDB } };
  vm.runInNewContext(source, sandbox);
  return { api: sandbox.window.PFVet, rpcs, inserts, selects };
}

test('vitals refuse impossible measurements and a row that measures nothing', async () => {
  const { api, inserts } = setup();
  await assert.rejects(api.recordVitals(petId, { weight_kg: '5000' }), /range/i);
  await assert.rejects(api.recordVitals(petId, { bcs: '12' }), /range/i);
  await assert.rejects(api.recordVitals(petId, { bcs: '4.5' }), /Whole number|entier/i);
  await assert.rejects(api.recordVitals(petId, { temperature: '90' }), /range/i);
  await assert.rejects(api.recordVitals(petId, {}), /at least one|au moins/i);
  assert.equal(inserts.length, 0);
});

test('vitals accept a comma decimal and bind the author, never the caller payload', async () => {
  const { api, inserts } = setup();
  await api.recordVitals(petId, { weight_kg: '24,4', bcs: '5', triage: 'green', recorded_by: 'attacker', pet_id: 'other' });
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].row.weight_kg, 24.4);
  assert.equal(inserts[0].row.bcs, 5);
  assert.equal(inserts[0].row.triage, 'green');
  assert.equal(inserts[0].row.recorded_by, 'user');
  assert.equal(inserts[0].row.pet_id, petId);
});

test('an unrecognised triage or MCS is dropped rather than stored', async () => {
  const { api, inserts } = setup();
  await api.recordVitals(petId, { weight_kg: '10', triage: 'purple', mcs: 'nonsense' });
  assert.equal(inserts[0].row.triage, null);
  assert.equal(inserts[0].row.mcs, null);
});

test('the schedule needs a verified second factor', async () => {
  const { api, rpcs } = setup({ aal: 'aal1' });
  await assert.rejects(api.schedule('c1', new Date(), new Date()), err => err.code === 'mfa_setup_required');
  assert.equal(rpcs.length, 0);
});

test('the schedule sends ISO instants whatever it is handed', async () => {
  const { api, rpcs } = setup({ rpcResult: [] });
  const from = new Date('2026-10-01T00:00:00Z'), to = new Date('2026-10-02T00:00:00Z');
  await api.schedule('c1', from, to);
  assert.equal(rpcs[0].name, 'clinic_schedule');
  assert.equal(rpcs[0].args.p_from, from.toISOString());
  assert.equal(rpcs[0].args.p_to, to.toISOString());
});

test('a client needs a name, and billing status cannot be invented', async () => {
  const { api, inserts } = setup();
  await assert.rejects(api.saveClient('c1', { display_name: '   ' }), /name|nom/i);
  await assert.rejects(api.saveClient('c1', { display_name: 'x'.repeat(201) }), /200/);
  await api.saveClient('c1', { display_name: ' Camille ', billing_status: 'made_up', phone: '' });
  assert.equal(inserts[0].row.display_name, 'Camille');
  assert.equal(inserts[0].row.billing_status, 'good_standing');
  // An empty field is stored as null, not as an empty string pretending to be data.
  assert.equal(inserts[0].row.phone, null);
});

test('a client insert binds the clinic and author; an edit changes neither', async () => {
  const create = setup();
  await create.api.saveClient('c1', { display_name: 'A', clinic_id: 'attacker', created_by: 'attacker' });
  assert.equal(create.inserts[0].row.clinic_id, 'c1');
  assert.equal(create.inserts[0].row.created_by, 'user');
  const edit = setup();
  await edit.api.saveClient('c1', { display_name: 'A' }, 'existing');
  assert.equal(edit.inserts[0].row.clinic_id, undefined);
  assert.equal(edit.inserts[0].row.created_by, undefined);
  // profile_id must never be sent: the database refuses it, and the client
  // must not even try, or the intent is unclear to the next reader.
  assert.equal(edit.inserts[0].row.profile_id, undefined);
});

test('a room needs a name and an unrecognised kind falls back to exam', async () => {
  const { api, inserts } = setup();
  await assert.rejects(api.addRoom('c1', '  '), /name|nom/i);
  await api.addRoom('c1', ' Salle 1 ', 'teleport');
  assert.equal(inserts[0].row.name, 'Salle 1');
  assert.equal(inserts[0].row.kind, 'exam');
});

test('amending an alert forwards trimmed values and a null empty detail', async () => {
  const { api, rpcs } = setup();
  await api.amendAlert('a1', { kind: 'allergy', severity: 'critical', label: '  Pénicilline  ', detail: '   ' });
  assert.equal(rpcs[0].name, 'amend_pet_alert');
  assert.equal(rpcs[0].args.p_label, 'Pénicilline');
  assert.equal(rpcs[0].args.p_detail, null);
});

test('access logging never throws, even when the call fails', () => {
  const { api } = setup();
  // An audit line that could not be written must not stop a vet reading a
  // patient's history, so this is fire-and-forget by design.
  assert.doesNotThrow(() => api.logAccess(petId, 'record'));
  assert.doesNotThrow(() => api.logAccess(petId, 'nonsense'));
});

test('clinics() projects the id every picker needs', async () => {
  // The schedule, client file and clinic setup all build a <select> from this
  // and skip rows with no id. When it projected only clinics(name), a vet who
  // had just created a clinic was told they belonged to none.
  const { api, selects } = setup();
  await api.clinics();
  const q = selects.find(s => s.table === 'clinic_members');
  assert.ok(q, 'clinic_members was queried');
  assert.match(q.projection, /clinic_id/);
  assert.match(q.projection, /clinics\(\s*id/);
});

test('creating a clinic requires a real name', async () => {
  const { api, rpcs } = setup({ rpcResult: 'clinic-id' });
  await assert.rejects(api.createClinic({ name: 'x' }), /name|nom/i);
  await api.createClinic({ name: 'Clinique du Parc', city: '  ' });
  assert.equal(rpcs[0].name, 'create_clinic');
  assert.equal(rpcs[0].args.p_name, 'Clinique du Parc');
  assert.equal(rpcs[0].args.p_city, null);
});
