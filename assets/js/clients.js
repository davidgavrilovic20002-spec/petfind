/* ============================================================
   PetFind — clinic client master file (migration 0034)

   A clinic_client is the CLINIC's record of a person, typed by
   the clinic. It is deliberately not connected to that person's
   PetFind account: profile_id is outside the column grant, so
   nothing here can assert "this client is that account", and
   nothing here reads owner data out of the platform.
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const lang = () => (window.PFI18n && window.PFI18n.lang) || 'fr';
  const T = (en, fr) => lang() === 'fr' ? fr : en;

  let clients = [], caseload = [], epoch = 0, editing = null, saving = false, timer = null;

  const billing = s => ({
    good_standing: T('Good standing', 'À jour'), credit_hold: T('Credit hold', 'Encours bloqué'),
    payment_plan: T('Payment plan', 'Échéancier'), vip: T('VIP', 'VIP'),
    bad_debt: T('Bad debt', 'Impayé')
  }[s] || s);
  const relation = s => ({
    owner: T('Owner', 'Propriétaire'), co_owner: T('Co-owner', 'Copropriétaire'),
    contact: T('Contact', 'Contact')
  }[s] || s);

  function notice(msg, error) { $('cli-notice').textContent = msg || ''; $('cli-notice').classList.toggle('error', !!error); }
  function formNotice(msg, error) { $('cli-form-notice').textContent = msg || ''; $('cli-form-notice').classList.toggle('error', !!error); }

  function fail(e) {
    const map = {
      clinic_membership_required: T('You are not a member of this clinic.', "Vous n'êtes pas rattaché à cette clinique."),
      not_found: T('That client no longer exists.', "Ce client n'existe plus.")
    };
    const msg = (e && e.message) || '';
    if (map[msg]) return map[msg];
    if (/row-level security/i.test(msg)) return T('You do not have access to that record.', "Vous n'avez pas accès à cette fiche.");
    if (/duplicate key/i.test(msg) && /primary/i.test(msg)) return T('That animal already has a primary contact. Clear it first.', 'Cet animal a déjà un contact principal. Retirez-le d’abord.');
    if (/duplicate key/i.test(msg)) return T('That animal is already linked to this client.', 'Cet animal est déjà rattaché à ce client.');
    return msg || T('The action could not be completed.', "L'action n'a pas pu être effectuée.");
  }

  /* ---------- list ---------- */
  function render() {
    const host = $('cli-list'); host.replaceChildren();
    if (!clients.length) {
      const p = document.createElement('p'); p.className = 'empty';
      p.textContent = $('cli-search').value.trim()
        ? T('No client matches that name.', 'Aucun client ne correspond à ce nom.')
        : T('No clients yet. "New client" adds the first.', 'Aucun client pour le moment. « Nouveau client » crée le premier.');
      host.append(p); return;
    }
    for (const c of clients) {
      const card = document.createElement('article'); card.className = 'cli-card';
      const head = document.createElement('div'); head.className = 'cli-head';
      const h = document.createElement('h3'); h.textContent = c.display_name;
      const tag = document.createElement('span');
      tag.className = 'badge cli-billing cli-' + c.billing_status;
      tag.textContent = billing(c.billing_status);
      head.append(h, tag);

      const contact = document.createElement('p'); contact.className = 'muted small';
      contact.textContent = [c.phone, c.phone_alt, c.email,
        [c.postal_code, c.city].filter(Boolean).join(' '), c.siret ? 'SIRET ' + c.siret : null]
        .filter(Boolean).join(' · ') || T('No contact details recorded.', 'Aucune coordonnée enregistrée.');

      const animals = document.createElement('div'); animals.className = 'cli-animals';
      animals.textContent = T('Loading animals…', 'Chargement des animaux…');

      const actions = document.createElement('div'); actions.className = 'head-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn soft';
      edit.textContent = T('Edit', 'Modifier');
      edit.addEventListener('click', () => openForm(c));
      const link = document.createElement('button'); link.type = 'button'; link.className = 'btn ghost';
      link.textContent = T('Link an animal', 'Rattacher un animal');
      link.addEventListener('click', () => linkAnimal(c, animals));
      actions.append(edit, link);

      card.append(head, contact, animals, actions);
      host.append(card);
      loadAnimals(c, animals);
    }
  }

  async function loadAnimals(client, host) {
    try {
      const rows = await PFVet.clientAnimals(client.id);
      host.replaceChildren();
      if (!rows.length) {
        const p = document.createElement('span'); p.className = 'muted small';
        p.textContent = T('No animal linked yet.', 'Aucun animal rattaché.');
        host.append(p); return;
      }
      for (const a of rows) {
        const chip = document.createElement('span'); chip.className = 'cli-pet';
        const name = document.createElement('strong');
        // A pet this vet cannot read is still counted -- the link is a fact
        // about the client -- but never named.
        name.textContent = a.visible ? (a.pet_name || T('Animal', 'Animal')) : T('Not shared with you', 'Non partagé');
        chip.append(name);
        const meta = document.createElement('span');
        meta.textContent = ' · ' + relation(a.relation) + (a.is_primary ? ' · ' + T('primary', 'principal') : '');
        chip.append(meta);
        if (a.visible && a.alerts > 0) {
          const al = document.createElement('span'); al.className = 'cli-alert';
          al.textContent = a.alerts + ' ' + T('alert(s)', 'alerte(s)');
          chip.append(al);
        }
        if (a.visible && a.pet_id) {
          const open = document.createElement('a'); open.href = 'record.html?pet=' + encodeURIComponent(a.pet_id);
          open.textContent = T('record', 'dossier'); open.className = 'cli-link';
          chip.append(open);
        }
        const drop = document.createElement('button'); drop.type = 'button'; drop.className = 'cli-unlink';
        drop.textContent = '×'; drop.title = T('Unlink', 'Détacher');
        drop.addEventListener('click', async () => {
          if (!window.confirm(T('Unlink this animal from ' + client.display_name + '? The animal and its record are untouched.',
                                'Détacher cet animal de ' + client.display_name + ' ? L’animal et son dossier ne sont pas modifiés.'))) return;
          try { await PFVet.unlinkClientPet(client.id, a.pet_id); await loadAnimals(client, host); }
          catch (e) { notice(fail(e), true); }
        });
        chip.append(drop);
        host.append(chip);
      }
    } catch (e) {
      host.replaceChildren();
      const p = document.createElement('span'); p.className = 'muted small'; p.textContent = fail(e);
      host.append(p);
    }
  }

  async function linkAnimal(client, host) {
    if (!caseload.length) { notice(T('You have no patients to link yet.', "Vous n'avez encore aucun patient à rattacher."), true); return; }
    const names = caseload.map((p, i) => (i + 1) + '. ' + p.name).join('\n');
    const pick = window.prompt(T('Link which animal to ' + client.display_name + '?\nEnter its number:\n\n',
                                 'Quel animal rattacher à ' + client.display_name + ' ?\nSaisissez son numéro :\n\n') + names);
    if (pick === null) return;
    const idx = parseInt(String(pick).trim(), 10);
    if (!(idx >= 1 && idx <= caseload.length)) { notice(T('That is not one of the numbers listed.', "Ce numéro ne figure pas dans la liste."), true); return; }
    const pet = caseload[idx - 1];
    const primary = window.confirm(T('Is ' + client.display_name + ' the primary contact for ' + pet.name + '?',
                                     client.display_name + ' est-il le contact principal de ' + pet.name + ' ?'));
    try { await PFVet.linkClientPet(client.id, pet.id, 'owner', primary); notice(''); await loadAnimals(client, host); }
    catch (e) { notice(fail(e), true); }
  }

  /* ---------- form ---------- */
  function openForm(client) {
    editing = client || null;
    const f = $('cli-form');
    f.hidden = false; f.reset(); formNotice('');
    $('cli-form-title').textContent = client ? T('Edit client', 'Modifier le client') : T('New client', 'Nouveau client');
    if (client) {
      for (const k of ['display_name','phone','phone_alt','email','address','postal_code','city','siret','notes','billing_status']) {
        if (f.elements[k]) f.elements[k].value = client[k] == null ? '' : client[k];
      }
    }
    f.elements.display_name.focus();
    f.scrollIntoView({ block: 'nearest' });
  }
  function closeForm() { editing = null; $('cli-form').hidden = true; $('cli-form').reset(); formNotice(''); }

  /* ---------- loading ---------- */
  async function load() {
    const run = ++epoch, clinicId = $('cli-clinic').value;
    if (!clinicId) { notice(T('No clinic is linked to your account. An administrator must add you to one.', "Aucune clinique n'est rattachée à votre compte. Un administrateur doit vous y ajouter."), true); return; }
    notice(T('Loading clients…', 'Chargement des clients…'));
    try {
      const rows = await PFVet.clients(clinicId, $('cli-search').value);
      if (run !== epoch) return;
      clients = rows; render(); notice('');
    } catch (e) { if (run === epoch) { clients = []; render(); notice(fail(e), true); } }
  }

  async function boot() {
    try {
      const user = await PFDB.getUser();
      if (!user) { $('cli').hidden = true; $('cli-signin').hidden = false; notice(T('Sign in to open the client file.', 'Connectez-vous pour ouvrir le fichier client.')); return; }
      $('logout').hidden = false;
      await PFVet.vetIdentity();
      const list = $('cli-clinic'); list.replaceChildren();
      for (const row of await PFVet.clinics()) {
        const o = document.createElement('option');
        o.value = row.clinic_id || (row.clinics && row.clinics.id) || '';
        o.textContent = (row.clinics && row.clinics.name) || T('Clinic', 'Clinique');
        if (o.value) list.append(o);
      }
      caseload = await PFVet.caseload().catch(() => []);
      $('cli').hidden = false; $('cli-signin').hidden = true;
      await load();
    } catch (e) { $('cli').hidden = true; $('cli-signin').hidden = false; notice(fail(e), true); }
  }

  $('cli-new').addEventListener('click', () => openForm(null));
  $('cli-cancel').addEventListener('click', closeForm);
  $('cli-refresh').addEventListener('click', load);
  $('cli-clinic').addEventListener('change', () => { closeForm(); load(); });
  $('cli-search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  $('cli-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    saving = true; $('cli-save').disabled = true; formNotice(T('Saving…', 'Enregistrement…'));
    try {
      const f = event.currentTarget, values = Object.fromEntries(new FormData(f));
      await PFVet.saveClient($('cli-clinic').value, values, editing && editing.id);
      saving = false; closeForm(); await load();
      notice(T('Client saved.', 'Client enregistré.'));
    } catch (e) { saving = false; formNotice(fail(e), true); }
    finally { $('cli-save').disabled = false; }
  });
  $('logout').addEventListener('click', async () => {
    try { const r = await PFDB.signOut(); if (r.error) throw r.error; location.href = 'index.html'; }
    catch (e) { notice(T('Could not sign out. Please retry.', 'Déconnexion impossible. Réessayez.'), true); }
  });
  window.PFI18nOnChange = function () { if (!$('cli').hidden) render(); };

  if (window.PFDB && window.PFVet) boot();
  else notice(T('Cannot connect to PetFind. Check your connection and reload.', 'Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'), true);
})();
