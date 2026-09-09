/* PetFind clinic/owner record helpers. Uses the existing PFDB client and 0012 RLS.
 * No elevated key, role updates, or persistent cache of medical records. */
(function (global) {
  'use strict';
  if (!global.PFDB) return;
  const db = global.PFDB, client = db.client;
  const T = (en, fr) => (global.PFI18n && global.PFI18n.lang === 'fr') ? fr : en;
  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  async function identity() {
    const user = await db.getUser();
    if (!user) throw new Error(T('Sign in to continue.', 'Connectez-vous pour continuer.'));
    const aal = unwrap(await db.mfaAAL());
    if (!aal || (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')) {
      const error = new Error(T('Verify your authenticator code to continue.', "Saisissez le code de votre application d'authentification pour continuer.")); error.code = 'mfa_required'; throw error;
    }
    const profile = unwrap(await db.getProfile());
    if (!profile || profile.deleted_at) throw new Error(T('This account is unavailable.', 'Ce compte est indisponible.'));
    return { user, profile };
  }
  async function vetIdentity() {
    const who = await identity();
    if (who.profile.role !== 'vet') throw new Error(T('This workspace needs an approved veterinary account. Use Owner account to manage your pets.', 'Cet espace nécessite un compte vétérinaire validé. Utilisez un compte propriétaire pour gérer vos animaux.'));
    return who;
  }
  async function caseload() {
    const who = await vetIdentity();
    const grants = unwrap(await client.from('vet_pet_access').select('id,scope,pet_id,pets(id,name,species,breed,breed_id,sex,age,deleted_at,breeds(name_fr,name_en,aliases,is_generic))')
      .eq('vet_id', who.user.id).eq('status', 'active')) || [];
    const byPet = new Map();
    for (const grant of grants) {
      const pet = grant.pets;
      if (!pet || pet.deleted_at) continue;
      const previous = byPet.get(pet.id);
      if (!previous || grant.scope === 'write' || grant.scope === 'full') byPet.set(pet.id, { ...pet, scope: grant.scope });
    }
    const walkIns = unwrap(await client.from('pets')
      .select('id,name,species,breed,breed_id,sex,age,deleted_at,claim_code,breeds(name_fr,name_en,aliases,is_generic)')
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
    if (!def) throw new Error(T('Choose a record type.', "Choisissez un type d'entrée."));
    const row = {};
    for (const field of def.fields) row[field] = values[field] == null || String(values[field]).trim() === '' ? null : String(values[field]).trim();
    if (!row[def.title]) throw new Error(T('Enter the record name.', "Saisissez le nom de l'entrée."));
    if (!validDate(row[def.date])) throw new Error(T('Enter a valid record date.', 'Saisissez une date valide.'));
    const end = row.valid_until || row.end_date;
    if (end && (!validDate(end) || end < row[def.date])) throw new Error(T('The end date must be on or after the record date.', "La date de fin doit être postérieure ou égale à la date de l'entrée."));
    if (kind === 'diagnosis' && !['active','resolved','chronic'].includes(row.status)) throw new Error(T('Choose a diagnosis status.', 'Choisissez un statut de diagnostic.'));
    if (kind === 'prescription' && row.dose_amount !== null) {
      row.dose_amount = Number(row.dose_amount);
      if (!Number.isFinite(row.dose_amount) || row.dose_amount <= 0 || !row.dose_unit) throw new Error(T('Enter a positive dose and its unit.', 'Saisissez une dose positive et son unité.'));
    }
    return row;
  }
  async function recordContext(petId) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(petId || '')) throw new Error(T('Open a patient from your list to view their record.', 'Ouvrez un patient depuis votre liste pour voir son dossier.'));
    const who = await identity();
    const pet = unwrap(await client.from('pets').select('id,owner_id,created_by_vet,claim_code,name,species,breed,breed_id,sex,age,birthdate,coat,tattoo,eu_passport,registry_ref,neutered,breeds(name_fr,name_en,is_generic)').eq('id', petId).is('deleted_at', null).maybeSingle());
    if (!pet) throw new Error(T('This record is unavailable. Access may have been revoked.', "Ce dossier est indisponible. L'accès a peut-être été révoqué."));
    const owner = pet.owner_id === who.user.id;
    const unclaimed = pet.owner_id === null && pet.created_by_vet === who.user.id;
    let writable = false;
    if (!owner) {
      if (who.profile.role !== 'vet') throw new Error(T('This record is unavailable.', 'Ce dossier est indisponible.'));
      if (unclaimed) {
        // A patient this vet created and nobody has claimed yet: theirs to write
        // until an owner takes it over, at which point the grant decides.
        writable = true;
      } else {
        const grants = unwrap(await client.from('vet_pet_access').select('scope').eq('pet_id', petId).eq('vet_id', who.user.id).eq('status','active')) || [];
        if (!grants.length) throw new Error(T('This record is unavailable. Access may have been revoked.', "Ce dossier est indisponible. L'accès a peut-être été révoqué."));
        writable = grants.some(g => g.scope === 'write' || g.scope === 'full');
      }
    }
    return { ...who, pet, owner, unclaimed, writable };
  }
  async function records(petId) {
    const context = await recordContext(petId);
    const groups = await Promise.all(Object.entries(definitions).map(async ([kind,def]) => {
      const rows = unwrap(await client.from(def.table).select('*').eq('pet_id',petId)
        .is('withdrawn_at',null).order(def.date,{ascending:false})) || [];
      return rows.map(row => ({ ...row, kind, date:row[def.date], title:row[def.title] }));
    }));
    return { ...context, entries:groups.flat().sort((a,b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)) };
  }
  async function addRecord(petId, kind, values, entryId) {
    const row = payload(kind, values);
    const context = await recordContext(petId);
    if (!context.writable) throw new Error(T('You do not have permission to add records for this pet.', "Vous n'êtes pas autorisé à ajouter des entrées pour cet animal."));
    row.id = entryId; row.pet_id = petId; row[definitions[kind].author] = context.user.id;
    // Stable UUID supplied by the form prevents a retry after a lost response
    // from creating the same entry twice. Never upsert: existing records stay intact.
    return unwrap(await client.from(definitions[kind].table).insert(row).select('id').single());
  }
  async function ownerGrants(petId) {
    const who = await identity();
    const pet = unwrap(await client.from('pets').select('id').eq('id',petId).eq('owner_id',who.user.id).is('deleted_at',null).maybeSingle());
    if (!pet) throw new Error(T('Only the pet owner can manage access.', "Seul le propriétaire de l'animal peut gérer les accès."));
    return unwrap(await client.from('vet_pet_access').select('id,vet_id,scope,status,created_at').eq('pet_id',petId).eq('status','active').order('created_at',{ascending:false})) || [];
  }
  // Create a walk-in patient with no owner yet. The database issues the claim
  // code (0014); the vet reads it back and hands it to the owner.
  async function createPatient(fields) {
    const who = await vetIdentity();
    const name = String(fields.name || '').trim();
    if (!name) throw new Error(T('Enter the patient name.', 'Saisissez le nom du patient.'));
    const sex = ['female','male','unknown'].includes(fields.sex) ? fields.sex : null;
    const birthdate = String(fields.birthdate || '').trim();
    if (birthdate && !validDate(birthdate)) throw new Error(T('Enter a valid date of birth.', 'Saisissez une date de naissance valide.'));
    const text = key => {
      const value = String(fields[key] == null ? '' : fields[key]).trim();
      return value === '' ? null : value;
    };
    // Goes through create_patient() (0021) rather than a direct insert: the
    // INSERT policy refused a request that met every one of its conditions and
    // the cause was never found, so the rule is enforced inside a SECURITY
    // DEFINER function instead -- the same pattern claim_pet_record() uses.
    // p_breed_id (0026) carries an explicit pick from the breed list. It stays
    // optional: with it null the trigger still resolves whatever was typed, and
    // text that matches nothing saves exactly as the vet entered it.
    const rows = unwrap(await client.rpc('create_patient', {
      p_name: name,
      p_species: text('species'), p_breed: text('breed'),
      p_breed_id: fields.breed_id || null, p_sex: sex,
      p_birthdate: birthdate || null, p_icad: text('icad_number')
    }));
    return Array.isArray(rows) ? rows[0] : rows;
  }


  // Owner side: redeem the code the vet handed over.
  async function claimRecord(code) {
    await identity();
    const clean = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^PF-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(clean)) throw new Error(T('Enter a claim code that looks like PF-XXXX-XXXX.', 'Saisissez un code de récupération au format PF-XXXX-XXXX.'));
    return unwrap(await client.rpc('claim_pet_record', { p_code: clean }));
  }

  // Retract one entry. The database decides who may (can_write_pet, the same
  // rule the dropped DELETE policies used); this check is only so the UI can
  // fail fast with a readable message instead of a raw RPC error.
  async function withdrawRecord(petId, kind, entryId) {
    const context = await recordContext(petId);
    if (!context.writable) throw new Error(T('You do not have permission to change this record.', "Vous n'êtes pas autorisé à modifier ce dossier."));
    if (!definitions[kind]) throw new Error(T('Choose a record type.', "Choisissez un type d'entrée."));
    await client.rpc('withdraw_record', { p_kind: kind, p_id: entryId })
      .then(r => { if (r.error) throw r.error; });
    return true;
  }

  // Take a patient off this vet's list. Returns 'removed' for an unclaimed
  // patient they created, or 'unlinked' when they have simply stepped back
  // from an owner's pet -- the caller needs to know which, because they mean
  // very different things to say out loud.
  async function removePatient(petId) {
    await vetIdentity();
    return unwrap(await client.rpc('vet_remove_patient', { p_pet_id: petId }));
  }

  // Safety alerts (0029). Read by anyone who can read the pet -- an owner
  // should know their animal is flagged. Raised and cleared only by a vet with
  // write access, which the database enforces independently.
  async function alerts(petId) {
    await identity();
    return unwrap(await client.from('pet_alerts')
      .select('id,kind,severity,label,detail,created_at,resolved_at')
      .eq('pet_id', petId).is('resolved_at', null)
      .order('severity', { ascending: true }).order('created_at', { ascending: false })) || [];
  }
  async function raiseAlert(petId, fields) {
    const who = await vetIdentity();
    const label = String(fields.label || '').trim();
    if (!label) throw new Error(T('Describe the alert in a few words.', "Décrivez l'alerte en quelques mots."));
    if (label.length > 120) throw new Error(T('Keep the alert under 120 characters.', "Limitez l'alerte à 120 caractères."));
    const kind = ['behaviour','allergy','medical','anaesthetic','quarantine','other'].includes(fields.kind) ? fields.kind : 'other';
    const severity = ['critical','warning','info'].includes(fields.severity) ? fields.severity : 'warning';
    const detail = String(fields.detail || '').trim() || null;
    return unwrap(await client.from('pet_alerts')
      .insert({ pet_id: petId, kind, severity, label, detail, created_by: who.user.id })
      .select('id').single());
  }
  async function resolveAlert(alertId) {
    await vetIdentity();
    await client.rpc('resolve_pet_alert', { p_id: alertId })
      .then(r => { if (r.error) throw r.error; });
    return true;
  }

  // ---- clinic diary (0032-0033) -------------------------------------------
  // The schedule comes from an RPC rather than a table read on purpose: RLS on
  // clinic_work_items only shows a vet their OWN patients, so a calendar built
  // on the table would show a room as free while a colleague had it booked.
  // clinic_schedule() returns every slot and blanks the identity of the ones
  // this vet is not entitled to see (visible === false).
  async function schedule(clinicId, from, to) {
    await vetIdentity();
    return unwrap(await client.rpc('clinic_schedule', {
      p_clinic: clinicId,
      p_from: from instanceof Date ? from.toISOString() : from,
      p_to:   to   instanceof Date ? to.toISOString()   : to
    })) || [];
  }
  async function rooms(clinicId) {
    await vetIdentity();
    return unwrap(await client.from('clinic_rooms')
      .select('id,name,kind,sort_order,active')
      .eq('clinic_id', clinicId).eq('active', true)
      .order('sort_order', { ascending: true }).order('name', { ascending: true })) || [];
  }
  async function colleagues(clinicId) {
    await vetIdentity();
    return unwrap(await client.from('clinic_members')
      .select('vet_id,title,profiles(full_name)')
      .eq('clinic_id', clinicId)) || [];
  }

  // ---- client master file (0034) ------------------------------------------
  async function clients(clinicId, term) {
    await vetIdentity();
    let q = client.from('clinic_clients')
      .select('id,display_name,phone,phone_alt,email,address,postal_code,city,siret,billing_status,notes,updated_at')
      .eq('clinic_id', clinicId).is('archived_at', null);
    const clean = String(term || '').trim();
    if (clean) q = q.ilike('display_name', '%' + clean.replace(/[%_]/g, '') + '%');
    return unwrap(await q.order('display_name', { ascending: true }).limit(200)) || [];
  }
  async function saveClient(clinicId, fields, clientId) {
    const who = await vetIdentity();
    const name = String(fields.display_name || '').trim();
    if (!name) throw new Error(T('Enter the client name.', 'Saisissez le nom du client.'));
    if (name.length > 200) throw new Error(T('Keep the name under 200 characters.', 'Limitez le nom à 200 caractères.'));
    const allowed = ['good_standing','credit_hold','payment_plan','vip','bad_debt'];
    const row = {
      display_name: name,
      address: text(fields.address), postal_code: text(fields.postal_code), city: text(fields.city),
      phone: text(fields.phone), phone_alt: text(fields.phone_alt), email: text(fields.email),
      siret: text(fields.siret), notes: text(fields.notes),
      billing_status: allowed.includes(fields.billing_status) ? fields.billing_status : 'good_standing'
    };
    if (clientId) {
      return unwrap(await client.from('clinic_clients').update(row).eq('id', clientId).select('id').single());
    }
    row.clinic_id = clinicId; row.created_by = who.user.id;
    return unwrap(await client.from('clinic_clients').insert(row).select('id').single());
  }
  async function clientAnimals(clientId) {
    await vetIdentity();
    return unwrap(await client.rpc('clinic_client_animals', { p_client: clientId })) || [];
  }
  async function linkClientPet(clientId, petId, relation, isPrimary) {
    await vetIdentity();
    return unwrap(await client.from('clinic_client_pets')
      .insert({ client_id: clientId, pet_id: petId,
                relation: ['owner','co_owner','contact'].includes(relation) ? relation : 'owner',
                is_primary: !!isPrimary })
      .select('pet_id').single());
  }
  async function unlinkClientPet(clientId, petId) {
    await vetIdentity();
    const r = await client.from('clinic_client_pets').delete().eq('client_id', clientId).eq('pet_id', petId);
    if (r.error) throw r.error;
    return true;
  }
  function text(v) { const s = String(v == null ? '' : v).trim(); return s === '' ? null : s; }

  global.PFVet = {
    alerts, raiseAlert, resolveAlert,
    schedule, rooms, colleagues,
    clients, saveClient, clientAnimals, linkClientPet, unlinkClientPet,
    identity, vetIdentity, caseload, recordContext, records, addRecord, payload, definitions, ownerGrants,
    createPatient, claimRecord, withdrawRecord, removePatient,
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
      if (!row) throw new Error(T('Access could not be revoked. Refresh and try again.', "L'accès n'a pas pu être révoqué. Actualisez et réessayez."));
      return row;
    }
  };
})(window);
