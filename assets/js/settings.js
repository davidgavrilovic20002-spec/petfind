/* ============================================================
   PetFind — clinic setup (migrations 0032 / 0036)

   Until this page existed, clinics and clinic_members could only
   be written with the service role, so a new practice could not
   use the schedule or the client file at all without asking
   somebody to run SQL. create_clinic() makes the caller the
   first member, which is the only way a first member can exist.
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const lang = () => (window.PFI18n && window.PFI18n.lang) || 'fr';
  const T = (en, fr) => lang() === 'fr' ? fr : en;

  let clinics = [], busy = false;

  const kindLabel = k => ({
    exam: T('Consulting room', 'Salle de consultation'), surgery: T('Operating theatre', 'Bloc opératoire'),
    imaging: T('Imaging', 'Imagerie'), hospital: T('Hospitalisation', 'Hospitalisation'),
    other: T('Other', 'Autre')
  }[k] || k);

  function notice(msg, error) { $('cs-notice').textContent = msg || ''; $('cs-notice').classList.toggle('error', !!error); }

  function fail(e) {
    const map = {
      not_a_vet: T('Only a veterinary account can set up a clinic.', 'Seul un compte vétérinaire peut configurer une clinique.'),
      invalid_name: T('Give the clinic a name of 2 to 200 characters.', 'Donnez à la clinique un nom de 2 à 200 caractères.'),
      too_many_clinics: T('This account already belongs to ten clinics.', 'Ce compte appartient déjà à dix cliniques.'),
      clinic_membership_required: T('You are not a member of this clinic.', "Vous n'êtes pas rattaché à cette clinique."),
      no_such_vet: T('No veterinary account matches that address. Ask them to sign up first, or check the spelling.',
                     "Aucun compte vétérinaire ne correspond à cette adresse. Demandez-lui de s'inscrire, ou vérifiez l'orthographe."),
      mfa_setup_required: null
    };
    const msg = (e && e.message) || '';
    if (map[msg]) return map[msg];
    if (/duplicate key/i.test(msg)) return T('That room already exists in this clinic.', 'Cette salle existe déjà dans cette clinique.');
    if (/row-level security/i.test(msg)) return T('You do not have access to that clinic.', "Vous n'avez pas accès à cette clinique.");
    return msg || T('The action could not be completed.', "L'action n'a pas pu être effectuée.");
  }

  function current() { return $('cs-clinic').value; }

  async function renderRooms() {
    const host = $('cs-room-list'); host.replaceChildren();
    try {
      const rooms = await PFVet.rooms(current());
      if (!rooms.length) {
        const p = document.createElement('span'); p.className = 'muted small';
        p.textContent = T('No rooms yet. Add the first below.', 'Aucune salle. Ajoutez la première ci-dessous.');
        host.append(p); return;
      }
      for (const r of rooms) {
        const chip = document.createElement('span'); chip.className = 'cs-chip';
        const n = document.createElement('strong'); n.textContent = r.name;
        const k = document.createElement('span'); k.textContent = ' · ' + kindLabel(r.kind);
        const drop = document.createElement('button'); drop.type = 'button'; drop.className = 'cli-unlink';
        drop.textContent = '×'; drop.title = T('Retire this room', 'Retirer cette salle');
        drop.addEventListener('click', async () => {
          // Retired, never deleted: appointments already booked in it must keep
          // naming the room they happened in.
          if (!window.confirm(T('Retire "' + r.name + '"? Past appointments keep it; it stops being offered for new ones.',
                                'Retirer « ' + r.name + ' » ? Les rendez-vous passés la conservent ; elle ne sera plus proposée.'))) return;
          try { await PFVet.retireRoom(r.id); await renderRooms(); notice(''); }
          catch (e) { notice(fail(e), true); }
        });
        chip.append(n, k, drop); host.append(chip);
      }
    } catch (e) {
      const p = document.createElement('span'); p.className = 'muted small'; p.textContent = fail(e); host.append(p);
    }
  }

  async function renderTeam() {
    const host = $('cs-team-list'); host.replaceChildren();
    try {
      const team = await PFVet.colleagues(current());
      if (!team.length) {
        const p = document.createElement('span'); p.className = 'muted small';
        p.textContent = T('No practitioners listed.', 'Aucun praticien.'); host.append(p); return;
      }
      for (const m of team) {
        const chip = document.createElement('span'); chip.className = 'cs-chip';
        const n = document.createElement('strong');
        n.textContent = (m.profiles && m.profiles.full_name) || T('Practitioner', 'Praticien');
        chip.append(n);
        if (m.title) { const t = document.createElement('span'); t.textContent = ' · ' + m.title; chip.append(t); }
        host.append(chip);
      }
    } catch (e) {
      const p = document.createElement('span'); p.className = 'muted small'; p.textContent = fail(e); host.append(p);
    }
  }

  async function refresh() {
    if (!current()) return;
    await Promise.all([renderRooms(), renderTeam()]);
  }

  async function loadClinics() {
    clinics = await PFVet.clinics();
    const list = $('cs-clinic'); list.replaceChildren();
    for (const row of clinics) {
      const o = document.createElement('option');
      o.value = row.clinic_id || (row.clinics && row.clinics.id) || '';
      o.textContent = (row.clinics && row.clinics.name) || T('Clinic', 'Clinique');
      if (o.value) list.append(o);
    }
    const has = list.options.length > 0;
    $('cs-body').hidden = !has;
    $('cs-none').hidden = has;
    if (has) await refresh();
  }

  async function boot() {
    try {
      const user = await PFDB.getUser();
      if (!user) { $('cs').hidden = true; $('cs-signin').hidden = false; notice(T('Sign in to set up your clinic.', 'Connectez-vous pour configurer votre clinique.')); return; }
      $('logout').hidden = false;
      await PFVet.vetIdentity();
      $('cs').hidden = false; $('cs-signin').hidden = true;
      await loadClinics();
      notice('');
    } catch (e) {
      $('cs').hidden = true; $('cs-signin').hidden = false;
      if (e && e.code === 'mfa_setup_required') {
        notice(e.message, true);
        $('cs-signin').hidden = false;
        const link = $('cs-signin').querySelector('a');
        link.href = 'security.html'; link.textContent = T('Open Account security', 'Ouvrir Sécurité du compte');
        return;
      }
      notice(fail(e), true);
    }
  }

  $('cs-clinic').addEventListener('change', refresh);
  $('cs-add-clinic').addEventListener('click', () => { $('cs-none').hidden = false; $('cs-create-form').elements.name.focus(); });

  $('cs-create-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; const b = event.currentTarget.querySelector('button'); b.disabled = true;
    notice(T('Creating…', 'Création…'));
    try {
      await PFVet.createClinic(Object.fromEntries(new FormData(event.currentTarget)));
      event.currentTarget.reset(); $('cs-none').hidden = true;
      await loadClinics();
      notice(T('Clinic created. Add its rooms next — the schedule needs them.', 'Clinique créée. Ajoutez ses salles : l’agenda en a besoin.'));
    } catch (e) { notice(fail(e), true); }
    finally { busy = false; b.disabled = false; }
  });

  $('cs-room-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; const b = event.currentTarget.querySelector('button'); b.disabled = true;
    try {
      const f = event.currentTarget;
      await PFVet.addRoom(current(), f.elements.name.value, f.elements.kind.value);
      f.reset(); await renderRooms(); notice('');
    } catch (e) { notice(fail(e), true); }
    finally { busy = false; b.disabled = false; }
  });

  $('cs-team-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; const b = event.currentTarget.querySelector('button'); b.disabled = true;
    try {
      const f = event.currentTarget;
      await PFVet.addClinicMember(current(), f.elements.email.value, f.elements.title.value);
      f.reset(); await renderTeam();
      notice(T('Practitioner added.', 'Praticien ajouté.'));
    } catch (e) { notice(fail(e), true); }
    finally { busy = false; b.disabled = false; }
  });

  $('logout').addEventListener('click', async () => {
    try { const r = await PFDB.signOut(); if (r.error) throw r.error; location.href = 'index.html'; }
    catch (e) { notice(T('Could not sign out. Please retry.', 'Déconnexion impossible. Réessayez.'), true); }
  });
  window.PFI18nOnChange = function () { if (!$('cs').hidden) refresh(); };

  if (window.PFDB && window.PFVet) boot();
  else notice(T('Cannot connect to PetFind. Check your connection and reload.', 'Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'), true);
})();
