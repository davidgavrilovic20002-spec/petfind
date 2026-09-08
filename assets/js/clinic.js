(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let patients = [], revision = 0, factor = null;
  function notice(message, error) { $('notice').textContent = message || ''; $('notice').classList.toggle('error', !!error); }
  function show(id) { for (const view of ['login','mfa','workspace']) $(view).hidden = view !== id; }
  function render() {
    const term = $('search').value.trim().toLocaleLowerCase();
    const visible = patients.filter(p => [p.name,p.breed,p.species].join(' ').toLocaleLowerCase().includes(term));
    $('patient-count').textContent = patients.length;
    const list = $('patient-list'); list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      const heading = document.createElement('h2'); heading.textContent = patients.length ? 'No matching patients' : 'Your patient list starts here';
      const detail = document.createElement('p'); detail.className = 'muted'; detail.textContent = patients.length ? 'Try a different name, species or breed.' : 'Ask an owner to open their PetFind account and grant access using your veterinary email. Then refresh this list.';
      empty.append(heading,detail); list.append(empty); return;
    }
    for (const pet of visible) {
      const card = document.createElement('a'); card.className = 'patient-card'; card.href = 'record.html?pet=' + encodeURIComponent(pet.id);
      const avatar = document.createElement('span'); avatar.className='patient-avatar'; avatar.textContent=(pet.name || '?').slice(0,1); avatar.setAttribute('aria-hidden','true');
      const info = document.createElement('div'), heading = document.createElement('h2'), detail = document.createElement('p'), badge = document.createElement('span'), arrow = document.createElement('span');
      heading.textContent=pet.name; detail.textContent=[pet.species,pet.breed,pet.age].filter(Boolean).join(' · ') || 'Patient'; detail.className='muted';
      badge.className='badge'; badge.textContent=pet.scope === 'read' ? 'View records' : 'View & add records'; arrow.className='arrow'; arrow.textContent='→';
      info.append(heading,detail,badge); card.append(avatar,info,arrow); list.append(card);
    }
  }
  async function route() {
    const run = ++revision; patients=[]; $('patient-list').replaceChildren(); show(null); notice('Loading your workspace…');
    try {
      if (!window.PFVet) throw new Error('Cannot connect to PetFind. Check your connection and reload.');
      const user=await PFDB.getUser(); if (run!==revision) return;
      $('logout').hidden=!user;
      if (!user) { show('login'); notice(''); return; }
      const who=await PFVet.vetIdentity();
      const rows=await PFVet.caseload(); if (run!==revision) return;
      patients=rows; $('vet-name').textContent=who.profile.full_name || user.email; $('clinic-name').textContent='VET WORKSPACE';
      render(); show('workspace'); notice('');
      PFVet.clinics().then(clinics => { if (run===revision && clinics.length) $('clinic-name').textContent=clinics.map(c=>c.clinics?.name).filter(Boolean).join(' · '); }).catch(()=>{});
    } catch(error) {
      if (run!==revision) return;
      if (error.code==='mfa_required') {
        try {
          const result=await PFDB.mfaList(); if(result.error) throw result.error;
          factor=result.data.totp.find(f=>f.status==='verified')?.id;
          if (!factor) throw new Error('Open Owner account to complete account verification.');
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
    catch(e){notice('Could not verify the code. Try a new code.',true);} finally{button.disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{++revision; patients=[]; $('patient-list').replaceChildren(); show(null); try{const r=await PFDB.signOut();if(r.error)throw r.error;await route();}catch(e){notice('Could not sign out. Please retry.',true);}});
  $('refresh').addEventListener('click',route); $('search').addEventListener('input',render);
  if(window.PFDB) PFDB.onAuth((event)=>{if(event==='SIGNED_OUT'){++revision;patients=[];$('patient-list').replaceChildren();show('login');$('logout').hidden=true;notice('');}});
  window.addEventListener('pageshow', event=>{if(event.persisted) route();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!$('workspace').hidden)route();});
  route();
})();
