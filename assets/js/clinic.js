(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let patients = [], revision = 0, factor = null, breedPicker = null;
  // Language follows the switcher in the header, which shares pf_lang with the
  // owner site. Falls back to French, the site's main language. Breed names
  // resolve from either language, so a vet who reads the English UI can still
  // type "Bouledogue francais" and match.
  const lang = () => (window.PFI18n && window.PFI18n.lang) || 'fr';
  const T = (en, fr) => lang() === 'fr' ? fr : en;
  const label = pet => window.PFBreeds ? PFBreeds.speciesLabel(pet.species, lang()) : pet.species;
  const breedOf = pet => window.PFBreeds ? PFBreeds.displayBreed(pet, lang()) : pet.breed;
  function notice(message, error) { $('notice').textContent = message || ''; $('notice').classList.toggle('error', !!error); }
  // The markup ships the English string for first paint; own it from here on so
  // a language switch cannot overwrite a live status with a stale static one.
  notice(T('Checking your session…', 'Vérification de votre session…'));
  function show(id) { for (const view of ['login','mfa','workspace']) $(view).hidden = view !== id; }
  function render() {
    const term = $('search').value.trim().toLocaleLowerCase();
    const visible = patients.filter(p => (window.PFBreeds
      ? PFBreeds.searchText(p, lang())
      : [p.name,p.breed,p.species].join(' ').toLocaleLowerCase()).includes(term));
    $('patient-count').textContent = patients.length;
    const list = $('patient-list'); list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      const heading = document.createElement('h2'); heading.textContent = patients.length
        ? T('No matching patients', 'Aucun patient correspondant')
        : T('Your patient list starts here', 'Votre liste de patients commence ici');
      const detail = document.createElement('p'); detail.className = 'muted'; detail.textContent = patients.length
        ? T('Try a different name, species or breed. Nicknames work too — "frenchie" and "bouledogue" find the same patients.',
            'Essayez un autre nom, espèce ou race. Les surnoms fonctionnent aussi : « frenchie » et « bouledogue » trouvent les mêmes patients.')
        : T('Ask an owner to open their PetFind account and grant access using your veterinary email. Then refresh this list.',
            'Demandez à un propriétaire d\'ouvrir son compte PetFind et de vous donner accès avec votre e-mail vétérinaire, puis actualisez cette liste.');
      empty.append(heading,detail); list.append(empty); return;
    }
    for (const pet of visible) {
      const card = document.createElement('a'); card.className = 'patient-card'; card.href = 'record.html?pet=' + encodeURIComponent(pet.id);
      const avatar = document.createElement('span'); avatar.className='patient-avatar'; avatar.textContent=(pet.name || '?').slice(0,1); avatar.setAttribute('aria-hidden','true');
      const info = document.createElement('div'), heading = document.createElement('h2'), detail = document.createElement('p'), badge = document.createElement('span'), arrow = document.createElement('span');
      heading.textContent=pet.name; detail.textContent=[label(pet),breedOf(pet),pet.age].filter(Boolean).join(' · ') || T('Patient','Patient'); detail.className='muted';
      badge.className='badge'; badge.textContent=pet.unclaimed
        ? (T('Unclaimed · ','Non récupéré · ') + (pet.claim_code || T('no code','sans code')))
        : (pet.scope === 'read' ? T('View records','Consulter le dossier') : T('View & add records','Consulter et compléter')); if(pet.unclaimed) badge.classList.add('unclaimed'); arrow.className='arrow'; arrow.textContent='→';
      info.append(heading,detail,badge); card.append(avatar,info,arrow); list.append(card);
    }
  }
  async function route() {
    const run = ++revision; patients=[]; $('patient-list').replaceChildren(); show(null); notice(T('Loading your workspace…','Chargement de votre espace…'));
    try {
      if (!window.PFVet) throw new Error(T('Cannot connect to PetFind. Check your connection and reload.','Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'));
      const user=await PFDB.getUser(); if (run!==revision) return;
      $('logout').hidden=!user;
      if (!user) { show('login'); notice(''); return; }
      const who=await PFVet.vetIdentity();
      const rows=await PFVet.caseload(); if (run!==revision) return;
      patients=rows; $('vet-name').textContent=who.profile.full_name || user.email; $('clinic-name').textContent='VET WORKSPACE';
      render(); show('workspace');
      // A patient removed from the record page redirects back here and leaves
      // its confirmation behind, so the vet sees the result of what they did
      // rather than a silently shorter list.
      let handoff=null;
      try{handoff=sessionStorage.getItem('pf_clinic_notice');sessionStorage.removeItem('pf_clinic_notice');}catch(e){}
      notice(handoff||'');
      PFVet.clinics().then(clinics => { if (run===revision && clinics.length) $('clinic-name').textContent=clinics.map(c=>c.clinics?.name).filter(Boolean).join(' · '); }).catch(()=>{});
    } catch(error) {
      if (run!==revision) return;
      if (error && error.code === 'mfa_setup_required') {
        show('login');
        notice(error.message, true);
        const link = document.createElement('a');
        link.href = 'security.html'; link.className = 'btn primary';
        link.textContent = T('Open Account security', 'Ouvrir Sécurité du compte');
        $('notice').append(document.createElement('br'), link);
        return;
      }
      if (error.code==='mfa_required') {
        try {
          const result=await PFDB.mfaList(); if(result.error) throw result.error;
          factor=result.data.totp.find(f=>f.status==='verified')?.id;
          if (!factor) throw new Error(T('Open Account security to complete verification.','Ouvrez Sécurité du compte pour terminer la vérification.'));
          show('mfa'); notice(''); return;
        } catch(e) { notice(e.message,true); return; }
      }
      notice(error.message || 'Could not load your workspace. Reload to try again.',true);
    }
  }
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget, button=form.querySelector('button'); button.disabled=true; notice('Signing in…');
    try { const result=await PFDB.signIn(form.email.value.trim(),form.password.value); if(result.error) throw result.error; form.password.value=''; await route(); }
    catch(e){ notice('Sign-in failed. Check your email and password, then try again.',true); show('login'); }
    finally{button.disabled=false;}
  });
  $('mfa-form').addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget,button=form.querySelector('button'); button.disabled=true;
    try {const result=await PFDB.mfaChallengeAndVerify(factor,form.code.value.trim()); if(result.error) throw result.error; form.reset(); await route();}
    catch(e){notice(T('Could not verify the code. Try a new code.','Code non vérifié. Essayez un nouveau code.'),true);} finally{button.disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{++revision; patients=[]; $('patient-list').replaceChildren(); show(null); try{const r=await PFDB.signOut();if(r.error)throw r.error;await route();}catch(e){notice(T('Could not sign out. Please retry.','Déconnexion impossible. Réessayez.'),true);}});
  function showForm(open) {
    $('new-patient-form').hidden = !open; $('claim-panel').hidden = true;
    $('new-patient-notice').textContent = '';
    if (open) $('new-patient-form').name.focus();
    else { $('new-patient-form').reset(); if (breedPicker) breedPicker.refresh(); }
  }
  $('new-patient').addEventListener('click',()=>showForm($('new-patient-form').hidden));
  $('cancel-patient').addEventListener('click',()=>showForm(false));
  $('claim-done').addEventListener('click',()=>{$('claim-panel').hidden=true;});
  $('new-patient-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget, button=$('create-patient'), note=$('new-patient-notice');
    button.disabled=true; note.classList.remove('error'); note.textContent=T('Creating…','Création…');
    try {
      const picked = breedPicker ? breedPicker.current() : null;
      const pet=await PFVet.createPatient({
        name:form.name.value, species:form.species.value, breed:form.breed.value,
        breed_id: picked ? picked.id : null,
        sex:form.sex.value, birthdate:form.birthdate.value, icad_number:form.icad_number.value
      });
      form.reset(); $('new-patient-form').hidden=true; note.textContent='';
      $('claim-code').textContent=pet.claim_code || T('(no code issued)','(aucun code émis)');
      $('claim-panel').hidden=false;
      await route();
    } catch(e) {
      note.textContent=e.message || T('Could not create the patient. Try again.','Création du patient impossible. Réessayez.'); note.classList.add('error');
    } finally { button.disabled=false; }
  });
  if (window.PFBreeds) {
    const form = $('new-patient-form');
    breedPicker = PFBreeds.bind({
      speciesEl: form.species, breedEl: form.breed,
      listEl: $('breed-list'), hintEl: $('breed-hint'),
      lang: lang
    });
  }
  window.PFI18nOnChange = function () {
    if (breedPicker) breedPicker.refresh();
    if (!$('workspace').hidden) render();
  };
  $('refresh').addEventListener('click',route); $('search').addEventListener('input',render);
  if(window.PFDB) PFDB.onAuth((event)=>{if(event==='SIGNED_OUT'){++revision;patients=[];$('patient-list').replaceChildren();show('login');$('logout').hidden=true;notice('');}});
  window.addEventListener('pageshow', event=>{if(event.persisted) route();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!$('workspace').hidden)route();});
  route();
})();
