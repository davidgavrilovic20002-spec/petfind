/* PetFind clinic/owner record helpers. Uses the existing PFDB client and 0012 RLS.
 * No elevated key, role updates, or persistent cache of medical records. */
(function (global) {
  'use strict';
  if (!global.PFDB) return;
  const db = global.PFDB, client = db.client;
  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  async function identity() {
    const user = await db.getUser();
    if (!user) throw new Error('Sign in to continue.');
    const aal = unwrap(await db.mfaAAL());
    if (!aal || (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')) {
      const error = new Error('Verify your authenticator code to continue.'); error.code = 'mfa_required'; throw error;
    }
    const profile = unwrap(await db.getProfile());
    if (!profile || profile.deleted_at) throw new Error('This account is unavailable.');
    return { user, profile };
  }
  async function vetIdentity() {
    const who = await identity();
    if (who.profile.role !== 'vet') throw new Error('This workspace needs an approved veterinary account. Use Owner account to manage your pets.');
    return who;
  }
  async function caseload() {
    const who = await vetIdentity();
    const grants = unwrap(await client.from('vet_pet_access').select('id,scope,pet_id,pets(id,name,species,breed,sex,age,deleted_at)')
      .eq('vet_id', who.user.id).eq('status', 'active')) || [];
    const byPet = new Map();
    for (const grant of grants) {
      const pet = grant.pets;
      if (!pet || pet.deleted_at) continue;
      const previous = byPet.get(pet.id);
      if (!previous || grant.scope === 'write' || grant.scope === 'full') byPet.set(pet.id, { ...pet, scope: grant.scope });
    }
    const walkIns = unwrap(await client.from('pets')
      .select('id,name,species,breed,sex,age,deleted_at,claim_code')
      .is('owner_id', null).eq('created_by_vet', who.user.id)) || [];
    for (const pet of walkIns) {
      if (pet.deleted_at) continue;
      byPet.set(pet.id, { ...pet, scope: 'full', unclaimed: true });
    }
    return Array.from(byPet.values()).sort((a,b) => a.name.localeCompare(b.name));
  }
  const definitions = {
    vaccination: { table:'vaccinations', date:'administered_at', title:'vaccine_type', author:'administered_by', fields:['vaccine_type','product_name','batch_lot','administered_at','valid_until'] },
    diagnosis: { table:'diagnoses', date:'diagnosed_at', title:'condition', author:'vet_id', fields:['condition','notes','status','diagnosed_at'] },
    prescription: { table:'prescriptions', date:'start_date', title:'medication', author:'prescriber_id', fields:['medication','dose_amount','dose_unit','route','frequency','start_date','end_date','instructions'] }
  };
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function payload(kind, values) {
    const def = definitions[kind];
    if (!def) throw new Error('Choose a record type.');
    const row = {};
    for (const field of def.fields) row[field] = values[field] == null || String(values[field]).trim() === '' ? null : String(values[field]).trim();
    if (!row[def.title]) throw new Error('Enter the record name.');
    if (!validDate(row[def.date])) throw new Error('Enter a valid record date.');
    const end = row.valid_until || row.end_date;
    if (end && (!validDate(end) || end < row[def.date])) throw new Error('The end date must be on or after the record date.');
    if (kind === 'diagnosis' && !['active','resolved','chronic'].includes(row.status)) throw new Error('Choose a diagnosis status.');
    if (kind === 'prescription' && row.dose_amount !== null) {
      row.dose_amount = Number(row.dose_amount);
      if (!Number.isFinite(row.dose_amount) || row.dose_amount <= 0 || !row.dose_unit) throw new Error('Enter a positive dose and its unit.');
    }
    return row;
  }
  async function recordContext(petId) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(petId || '')) throw new Error('Open a patient from your list to view their record.');
    const who = await identity();
    const pet = unwrap(await client.from('pets').select('id,owner_id,created_by_vet,claim_code,name,species,breed,sex,age,birthdate').eq('id', petId).is('deleted_at', null).maybeSingle());
    if (!pet) throw new Error('This record is unavailable. Access may have been revoked.');
    const owner = pet.owner_id === who.user.id;
    const unclaimed = pet.owner_id === null && pet.created_by_vet === who.user.id;
    let writable = false;
    if (!owner) {
      if (who.profile.role !== 'vet') throw new Error('This record is unavailable.');
      if (unclaimed) {
        // A patient this vet created and nobody has claimed yet: theirs to write
        // until an owner takes it over, at which point the grant decides.
        writable = true;
      } else {
        const grants = unwrap(await client.from('vet_pet_access').select('scope').eq('pet_id', petId).eq('vet_id', who.user.id).eq('status','active')) || [];
        if (!grants.length) throw new Error('This record is unavailable. Access may have been revoked.');
        writable = grants.some(g => g.scope === 'write' || g.scope === 'full');
      }
    }
    return { ...who, pet, owner, unclaimed, writable };
  }
  async function records(petId) {
    const context = await recordContext(petId);
    const groups = await Promise.all(Object.entries(definitions).map(async ([kind,def]) => {
      const rows = unwrap(await client.from(def.table).select('*').eq('pet_id',petId).order(def.date,{ascending:false})) || [];
      return rows.map(row => ({ ...row, kind, date:row[def.date], title:row[def.title] }));
    }));
    return { ...context, entries:groups.flat().sort((a,b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)) };
  }
  async function addRecord(petId, kind, values, entryId) {
    const row = payload(kind, values);
    const context = await recordContext(petId);
    if (!context.writable) throw new Error('You do not have permission to add records for this pet.');
    row.id = entryId; row.pet_id = petId; row[definitions[kind].author] = context.user.id;
    // Stable UUID supplied by the form prevents a retry after a lost response
    // from creating the same entry twice. Never upsert: existing records stay intact.
    return unwrap(await client.from(definitions[kind].table).insert(row).select('id').single());
  }
  async function ownerGrants(petId) {
    const who = await identity();
    const pet = unwrap(await client.from('pets').select('id').eq('id',petId).eq('owner_id',who.user.id).is('deleted_at',null).maybeSingle());
    if (!pet) throw new Error('Only the pet owner can manage access.');
    return unwrap(await client.from('vet_pet_access').select('id,vet_id,scope,status,created_at').eq('pet_id',petId).eq('status','active').order('created_at',{ascending:false})) || [];
  }
  // Create a walk-in patient with no owner yet. The database issues the claim
  // code (0014); the vet reads it back and hands it to the owner.
  async function createPatient(fields) {
    const who = await vetIdentity();
    const name = String(fields.name || '').trim();
    if (!name) throw new Error('Enter the patient name.');
    const sex = ['female','male','unknown'].includes(fields.sex) ? fields.sex : null;
    const birthdate = String(fields.birthdate || '').trim();
    if (birthdate && !validDate(birthdate)) throw new Error('Enter a valid date of birth.');
    const text = key => {
      const value = String(fields[key] == null ? '' : fields[key]).trim();
      return value === '' ? null : value;
    };
    return unwrap(await client.from('pets').insert({
      name, species: text('species'), breed: text('breed'), sex,
      birthdate: birthdate || null, icad_number: text('icad_number'),
      created_by_vet: who.user.id
    }).select('id,name,claim_code').single());
  }

  // Owner side: redeem the code the vet handed over.
  async function claimRecord(code) {
    await identity();
    const clean = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^PF-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(clean)) throw new Error('Enter a claim code that looks like PF-XXXX-XXXX.');
    return unwrap(await client.rpc('claim_pet_record', { p_code: clean }));
  }

  global.PFVet = {
    identity, vetIdentity, caseload, recordContext, records, addRecord, payload, definitions, ownerGrants,
    createPatient, claimRecord,
    clinics: async function () {
      const who = await vetIdentity();
      return unwrap(await client.from('clinic_members').select('clinics(name)').eq('vet_id',who.user.id)) || [];
    },
    grant: async function (petId,email,scope) {
      await identity();
      return unwrap(await client.rpc('grant_vet_access',{p_pet_id:petId,p_vet_email:email.trim(),p_scope:scope}));
    },
    revoke: async function (petId,grantId) {
      const who = await identity();
      const row = unwrap(await client.from('vet_pet_access').update({status:'revoked',revoked_at:new Date().toISOString(),granted_by:who.user.id})
        .eq('id',grantId).eq('pet_id',petId).select('id').maybeSingle());
      if (!row) throw new Error('Access could not be revoked. Refresh and try again.');
      return row;
    }
  };
})(window);
