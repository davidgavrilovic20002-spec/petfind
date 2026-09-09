(function () {
  'use strict';
  const $=id=>document.getElementById(id), petId=new URLSearchParams(location.search).get('pet');
  let context=null, revision=0, saving=false, dirty=false, pendingId=null, submitted=false, alerts=[], vitals=[];
  // Language follows the header switcher (shared pf_lang with the owner site).
  const lang=()=>(window.PFI18n&&window.PFI18n.lang)||'fr';
  const T=(en,fr)=>lang()==='fr'?fr:en;
  const labels=()=>({vaccination:T('Vaccination','Vaccination'),diagnosis:T('Diagnosis','Diagnostic'),prescription:T('Prescription','Prescription')});
  const statusLabel=v=>({active:T('Active','Actif'),resolved:T('Resolved','Résolu'),chronic:T('Chronic','Chronique')}[v]||v);
  // Field labels are rebuilt on every language change, so they are a function
  // of the current language rather than a frozen table.
  const fields=()=>({
    vaccination:[['vaccine_type',T('Vaccine','Vaccin'),'text',true],['product_name',T('Product name','Nom du produit')],['batch_lot',T('Batch / lot','Lot')],['administered_at',T('Given on','Administré le'),'date',true],['valid_until',T('Valid until','Valable jusqu\'au'),'date']],
    diagnosis:[['condition',T('Condition','Affection'),'text',true],['diagnosed_at',T('Diagnosed on','Diagnostiqué le'),'date',true],['status',T('Status','Statut'),'select',true],['notes',T('Clinical notes','Notes cliniques'),'textarea']],
    prescription:[['medication',T('Medication','Médicament'),'text',true],['dose_amount',T('Dose amount','Dose'),'number'],['dose_unit',T('Dose unit (mg, mL, tablet…)','Unité de dose (mg, mL, comprimé…)')],['route',T('Route (oral, topical…)','Voie (orale, cutanée…)')],['frequency',T('Frequency','Fréquence')],['start_date',T('Start date','Début'),'date',true],['end_date',T('End date','Fin'),'date'],['instructions',T('Instructions','Instructions'),'textarea']]
  });
  function date(value){return value?new Date(value+'T12:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'';}
  function notice(message,error){$('notice').textContent=message||'';$('notice').classList.toggle('error',!!error);}
  function saveNotice(message,error){$('save-notice').textContent=message||'';$('save-notice').classList.toggle('error',!!error);}
  function buildFields(){
    const target=$('entry-fields'); target.replaceChildren(); pendingId=null;submitted=false;dirty=false;saveNotice('');
    for(const [name,title,type='text',required=false] of fields()[$('kind').value]){
      const label=document.createElement('label'); label.textContent=title+(required?' *':'');
      const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');input.name=name;input.required=required;
      if(type==='select') for(const value of ['active','resolved','chronic']){const option=document.createElement('option');option.value=value;option.textContent=statusLabel(value);input.append(option);}
      else if(type!=='textarea'){input.type=type;if(type==='date'&&required){const today=new Date();input.value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');} if(type==='number'){input.min='0.000001';input.step='any';}}
      if(type==='text'||type==='textarea')input.maxLength=type==='textarea'?10000:500;
      label.append(input);target.append(label);
    }
  }
  function renderTimeline(){
    const target=$('timeline');target.replaceChildren();if(!context)return;
    const entries=context.entries.filter(e=>$('filter').value==='all'||e.kind===$('filter').value);
    if(!entries.length){const empty=document.createElement('p');empty.className='empty';
      const what=$('filter').value==='all'?T('medical','médicale'):labels()[$('filter').value].toLowerCase();
      empty.textContent=T('No '+what+' records yet.','Aucune entrée '+what+' pour le moment.');target.append(empty);return;}
    for(const entry of entries){
      const article=document.createElement('article');article.className='record-entry';
      const meta=document.createElement('div');meta.className='entry-meta';const kind=document.createElement('span'),time=document.createElement('time');kind.textContent=labels()[entry.kind];time.dateTime=entry.date;time.textContent=date(entry.date);meta.append(kind,time);
      const heading=document.createElement('h3');heading.textContent=entry.title;article.append(meta,heading);
      function detail(label,value){if(value==null||value==='')return;const p=document.createElement('p');p.textContent=(label?label+': ':'')+value;article.append(p);}
      if(entry.kind==='vaccination'){detail(T('Product','Produit'),entry.product_name);detail(T('Batch / lot','Lot'),entry.batch_lot);detail(T('Valid until','Valable jusqu\'au'),date(entry.valid_until));}
      if(entry.kind==='diagnosis'){detail(T('Status','Statut'),statusLabel(entry.status));detail('',entry.notes);}
      if(entry.kind==='prescription'){detail(T('Dose','Dose'),[entry.dose_amount,entry.dose_unit].filter(v=>v!=null).join(' '));detail(T('Route','Voie'),entry.route);detail(T('Frequency','Fréquence'),entry.frequency);detail(T('End date','Fin'),date(entry.end_date));detail('',entry.instructions);}
      // Only offered to someone who could have written the entry in the first
      // place. The owner reads the timeline here too and must not be able to
      // retract their vet's clinical entries.
      if(context.writable){
        const actions=document.createElement('div');actions.className='entry-actions';
        const remove=document.createElement('button');remove.type='button';
        remove.textContent=T('Withdraw this entry','Retirer cette entrée');
        remove.addEventListener('click',()=>withdraw(entry,remove));
        actions.append(remove);article.append(actions);
      }
      target.append(article);
    }
  }
  async function withdraw(entry,button){
    if(saving)return;
    // Says what actually happens -- the entry stops being shown, it is not
    // erased -- so nobody withdraws a real treatment thinking it is reversible
    // only by support, or leaves a wrong one up thinking deletion is forever.
    if(!window.confirm(T(
      'Withdraw this '+labels()[entry.kind].toLowerCase()+'? It stops showing in the record for you and the owner. It is kept, not erased, and it is removed from the anonymised research set.',
      'Retirer cette entrée ('+labels()[entry.kind].toLowerCase()+') ? Elle n\'apparaîtra plus dans le dossier, ni pour vous ni pour le propriétaire. Elle est conservée, pas effacée, et elle est retirée du jeu de recherche anonymisé.')))return;
    saving=true;button.disabled=true;const run=revision;
    try{
      await PFVet.withdrawRecord(petId,entry.kind,entry.id);
      saving=false;
      if(run===revision){await load();notice(T('Entry withdrawn.','Entrée retirée.'));}
    }catch(e){
      saving=false;button.disabled=false;
      if(run===revision)notice(e.message||T('Could not withdraw this entry. Try again.','Impossible de retirer cette entrée. Réessayez.'),true);
    }
  }

  async function removePatient(){
    if(saving||!context)return;
    const button=$('remove-patient'), name=context.pet.name||T('this patient','ce patient');
    // Two different acts, so two different questions. Getting these the wrong
    // way round would either destroy a record or silently leave one behind.
    const ask=context.unclaimed
      ? T('Remove '+name+'? This patient has no owner yet, so their record goes with them and the claim code stops working.',
          'Supprimer '+name+' ? Ce patient n\'a pas encore de propriétaire : son dossier part avec lui et le code de récupération cesse de fonctionner.')
      : T('Remove '+name+' from your list? The pet and its record stay with the owner — you are giving up your own access, and only they can grant it again.',
          'Retirer '+name+' de votre liste ? L\'animal et son dossier restent chez le propriétaire : vous renoncez à votre accès, et lui seul peut vous le redonner.');
    if(!window.confirm(ask))return;
    saving=true;button.disabled=true;
    try{
      const outcome=await PFVet.removePatient(petId);
      saving=false;
      try{sessionStorage.setItem('pf_clinic_notice',outcome==='removed'
        ? T(name+' was removed.',name+' a été supprimé.')
        : T(name+' is no longer on your list.',name+' ne figure plus dans votre liste.'));}catch(e){}
      location.href='index.html';
    }catch(e){
      saving=false;button.disabled=false;
      notice(e.message||T('Could not remove this patient. Try again.','Impossible de retirer ce patient. Réessayez.'),true);
    }
  }

  const triageLabel=v=>({red:T('Red — resuscitation','Rouge — réanimation'),orange:T('Orange — very urgent','Orange — très urgent'),yellow:T('Yellow — urgent','Jaune — urgent'),green:T('Green — standard','Vert — standard')}[v]||'');
  const mcsLabel=v=>({normal:T('Normal','Normal'),mild:T('Mild loss','Perte légère'),moderate:T('Moderate loss','Perte modérée'),severe:T('Severe loss','Perte sévère')}[v]||'');

  function renderVitals(){
    const cur=$('vitals-current'); cur.replaceChildren();
    $('vitals-new').hidden=!(context&&context.writable&&!context.owner);
    if(!vitals.length){
      const p=document.createElement('p');p.className='vitals-empty';
      p.textContent=T('No vitals recorded yet.','Aucune constante enregistrée.');
      cur.append(p); $('vitals-chart').replaceChildren(); return;
    }
    const latest=vitals[0];
    const item=(label,value,extra)=>{
      if(value==null||value==='')return;
      const d=document.createElement('div');d.className='v-item';
      const b=document.createElement('strong');b.textContent=value;
      const s=document.createElement('span');s.textContent=label;
      d.append(b,s); if(extra)d.classList.add(extra); cur.append(d);
    };
    item(T('Weight','Poids'), latest.weight_kg!=null?latest.weight_kg+' kg':null);
    item(T('BCS','BCS'), latest.bcs!=null?latest.bcs+'/9':null);
    item(T('MCS','MCS'), mcsLabel(latest.mcs)||null);
    item(T('Temperature','Température'), latest.temperature!=null?latest.temperature+' °C':null);
    if(latest.triage){
      const d=document.createElement('div');d.className='v-item';
      const b=document.createElement('strong');b.className='v-triage v-'+latest.triage;
      b.textContent=triageLabel(latest.triage);
      const s=document.createElement('span');s.textContent=T('Triage','Triage')+' · '+date(String(latest.recorded_at).slice(0,10));
      d.append(b,s); cur.append(d);
    }
    renderWeightChart();
  }

  // One polyline, drawn by hand. A charting library would be many times the
  // size of the thing it draws, and this has to work offline in a clinic.
  function renderWeightChart(){
    const host=$('vitals-chart'); host.replaceChildren();
    const pts=vitals.filter(v=>v.weight_kg!=null)
      .map(v=>({t:new Date(v.recorded_at).getTime(),w:Number(v.weight_kg)}))
      .filter(v=>Number.isFinite(v.t)&&Number.isFinite(v.w))
      .sort((a,b)=>a.t-b.t);
    if(pts.length<2){host.setAttribute('aria-label','');return;}
    const W=600,H=96,pad=26;
    const t0=pts[0].t,t1=pts[pts.length-1].t;
    const lo=Math.min(...pts.map(p=>p.w)),hi=Math.max(...pts.map(p=>p.w));
    const span=(hi-lo)||1;
    const x=p=>pad+((p.t-t0)/((t1-t0)||1))*(W-pad*2);
    const y=p=>H-pad+ -((p.w-lo)/span)*(H-pad*2)+ (pad-pad);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.setAttribute('preserveAspectRatio','none');
    const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    line.setAttribute('class','vc-line');
    line.setAttribute('points',pts.map(p=>x(p)+','+y(p)).join(' '));
    svg.append(line);
    for(const p of pts){
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('class','vc-dot');c.setAttribute('cx',x(p));c.setAttribute('cy',y(p));c.setAttribute('r','2.5');
      svg.append(c);
    }
    const tag=(tx,ty,text,anchor)=>{
      const el=document.createElementNS('http://www.w3.org/2000/svg','text');
      el.setAttribute('class','vc-label');el.setAttribute('x',tx);el.setAttribute('y',ty);
      if(anchor)el.setAttribute('text-anchor',anchor);
      el.textContent=text;svg.append(el);
    };
    // Weights hug the left edge, dates sit clear below the plot: at the
    // bottom-left they were landing on top of each other.
    tag(2,12,hi+' kg'); tag(2,H-pad+4,lo+' kg');
    tag(pad,H+10,new Date(t0).toLocaleDateString(lang()==='fr'?'fr-FR':'en-GB',{month:'short',year:'2-digit'}));
    tag(W-pad,H+10,new Date(t1).toLocaleDateString(lang()==='fr'?'fr-FR':'en-GB',{month:'short',year:'2-digit'}),'end');
    host.append(svg);
    host.setAttribute('aria-label',T('Weight from ','Poids de ')+pts[0].w+' kg '+T('to ','à ')+pts[pts.length-1].w+' kg');
  }

  const alertKinds=()=>({behaviour:T('Behaviour','Comportement'),allergy:T('Drug allergy','Allergie médicamenteuse'),medical:T('Medical','Médical'),anaesthetic:T('Anaesthetic risk','Risque anesthésique'),quarantine:T('Quarantine','Quarantaine'),other:T('Other','Autre')});

  function renderAlerts(){
    const host=$('alert-banner');host.replaceChildren();
    if(!alerts.length){host.hidden=true;return;}
    host.hidden=false;
    // critical first: if a vet reads only the top line it must be the worst one
    const order={critical:0,warning:1,info:2};
    for(const a of [...alerts].sort((x,y)=>order[x.severity]-order[y.severity])){
      const row=document.createElement('div');row.className='alert-item alert-'+a.severity;
      const body=document.createElement('div');
      const what=document.createElement('span');what.className='alert-what';
      what.textContent=(alertKinds()[a.kind]||a.kind)+' · '+a.label;
      body.append(what);
      if(a.detail){const d=document.createElement('div');d.className='alert-detail';d.textContent=a.detail;body.append(d);}
      row.append(body);
      if(context&&context.writable&&!context.owner){
        const clear=document.createElement('button');clear.type='button';clear.className='alert-clear';
        clear.textContent=T('Clear','Lever');
        clear.addEventListener('click',()=>clearAlert(a,clear));
        row.append(clear);
      }
      host.append(row);
    }
  }

  async function clearAlert(a,button){
    if(saving)return;
    if(!window.confirm(T('Clear "'+a.label+'"? It stops showing on this record. It is kept, with who cleared it and when.',
                         'Lever « '+a.label+' » ? Elle n\'apparaîtra plus sur ce dossier. Elle est conservée, avec l\'auteur et la date de la levée.')))return;
    saving=true;button.disabled=true;const run=revision;
    try{await PFVet.resolveAlert(a.id);saving=false;if(run===revision)await load();}
    catch(e){saving=false;button.disabled=false;if(run===revision)notice(e.message||T('Could not clear this alert.','Impossible de lever cette alerte.'),true);}
  }

  function clear(){context=null;alerts=[];vitals=[];$('vitals-form').hidden=true;$('vitals-new').hidden=true;$('alert-banner').hidden=true;$('alert-banner').replaceChildren();$('alert-form').hidden=true;$('alert-new').hidden=true;$('remove-patient').hidden=true;$('record').hidden=true;$('timeline').replaceChildren();$('editor').hidden=true;$('pet-name').textContent='';$('pet-detail').textContent='';}
  async function load(){
    if(saving)return;
    const run=++revision;clear();$('retry').hidden=true;$('signin').hidden=true;notice(T('Loading record…','Chargement du dossier…'));
    try{
      if(!window.PFVet)throw new Error(T('Cannot connect to PetFind. Check your connection and reload.','Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'));
      const result=await PFVet.records(petId);if(run!==revision)return;
      // Alerts are fetched separately so a failure here cannot blank the whole
      // record -- but a silent empty banner would be a lie, so it is reported.
      let alertError=null;
      try{alerts=await PFVet.alerts(petId);}catch(e){alerts=[];alertError=e;}
      try{vitals=await PFVet.vitals(petId);}catch(e){vitals=[];}
      if(run!==revision)return;
      context=result;if($('clinical-forms')){$('clinical-forms').href='operations.html?pet='+encodeURIComponent(petId);$('clinical-forms').hidden=!!context.owner;}$('logout').hidden=false;$('pet-name').textContent=context.pet.name;document.title=T('Patient record — PetFind','Dossier du patient — PetFind');
      const sp=window.PFBreeds?PFBreeds.speciesLabel(context.pet.species,lang()):context.pet.species;
      const br=window.PFBreeds?PFBreeds.displayBreed(context.pet,lang()):context.pet.breed;
      const neuter={intact:T('Entire','Entier'),neutered:T('Neutered','Stérilisé'),unknown:''}[context.pet.neutered]||'';
      const sexBits=[context.pet.sex,neuter].filter(Boolean).join(' · ');
      $('pet-detail').textContent=[sp,br,context.pet.coat,sexBits,age(context.pet)||context.pet.age].filter(Boolean).join(' · ');
      renderIds();
      $('access').textContent=context.owner?T('Your pet’s record','Le dossier de votre animal')
        :context.writable?T('View & add records','Consulter et compléter'):T('Read-only access','Accès en lecture seule');
      $('back').href=context.owner?'../account.html':'index.html';
      $('back').textContent=context.owner?T('← My account','← Mon compte'):T('← Patient list','← Liste des patients');
      // The owner is not a vet, so vet_remove_patient() would refuse them.
      PFVet.logAccess(petId, 'record');
      renderAlerts(); renderVitals();
      if(alertError)notice(T('The safety alerts could not be loaded. Treat this record as incomplete and refresh.',
                             'Les alertes de sécurité n\'ont pas pu être chargées. Considérez ce dossier comme incomplet et actualisez.'),true);
      $('alert-new').hidden=!(context.writable&&!context.owner);
      $('remove-patient').hidden=context.owner;
      $('remove-patient').textContent=context.unclaimed
        ? T('Remove patient','Supprimer le patient')
        : T('Remove from my list','Retirer de ma liste');
      $('editor').hidden=!context.writable;$('record-layout').classList.toggle('read-only',!context.writable);$('record').hidden=false;renderTimeline();notice('');
      if(!context.writable){buildFields();}
    }catch(e){
      if(run!==revision)return;clear();buildFields();
      if(e&&e.code==='mfa_setup_required'){
        $('retry').hidden=true;$('signin').hidden=false;
        $('signin').href='security.html';
        $('signin').textContent=T('Open Account security','Ouvrir Sécurité du compte');
        notice(e.message,true);return;
      }
      $('retry').hidden=false;$('signin').hidden=false;
      notice(e.message||T('Could not load this record. Try again.','Chargement du dossier impossible. Réessayez.'),true);}
  }
  // Calculated age beats a free-text one when a birthdate is on file: "3 ans"
  // typed in 2024 is wrong by now, and a dose depends on it.
  function age(pet){
    if(!pet.birthdate)return '';
    const b=new Date(pet.birthdate+'T12:00:00');if(isNaN(b))return '';
    let m=(new Date().getFullYear()-b.getFullYear())*12+(new Date().getMonth()-b.getMonth());
    if(new Date().getDate()<b.getDate())m--;
    if(m<0)return '';
    const y=Math.floor(m/12),r=m%12;
    if(y<1)return m+' '+T('months','mois');
    return y+' '+T(y>1?'years':'year','an'+(y>1?'s':''))+(r?' '+r+' '+T('months','mois'):'');
  }

  function renderIds(){
    const host=$('patient-ids');host.replaceChildren();
    const p=context.pet;
    const bits=[[T('Microchip','Puce'),p.icad_number],[T('Tattoo','Tatouage'),p.tattoo],
                [T('EU passport','Passeport UE'),p.eu_passport],[T('Registry','Registre'),p.registry_ref]];
    for(const [label,value] of bits){
      if(!value)continue;
      const s=document.createElement('span');const b=document.createElement('strong');
      b.textContent=value;s.append(label+' ',b);host.append(s);
    }
    host.hidden=!host.childElementCount;
  }

  $('kind').addEventListener('change',buildFields);
  $('remove-patient').addEventListener('click',removePatient);
  $('vitals-new').addEventListener('click',()=>{const f=$('vitals-form');f.hidden=!f.hidden;if(!f.hidden)f.elements.weight_kg.focus();else f.reset();});
  $('vitals-cancel').addEventListener('click',()=>{$('vitals-form').hidden=true;$('vitals-form').reset();$('vitals-notice').textContent='';});
  $('vitals-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(saving||!context||!context.writable)return;
    const form=event.currentTarget,button=form.querySelector('button[type=submit]');
    saving=true;button.disabled=true;$('vitals-notice').textContent=T('Saving…','Enregistrement…');
    try{
      await PFVet.recordVitals(petId,Object.fromEntries(new FormData(form)));
      saving=false;form.reset();form.hidden=true;$('vitals-notice').textContent='';
      vitals=await PFVet.vitals(petId);renderVitals();
      notice(T('Vitals recorded.','Constantes enregistrées.'));
    }catch(e){
      saving=false;
      $('vitals-notice').textContent=e.message||T('Could not save these vitals.','Impossible d\'enregistrer ces constantes.');
      $('vitals-notice').classList.add('error');
    }finally{button.disabled=false;}
  });
  $('alert-new').addEventListener('click',()=>{const f=$('alert-form');f.hidden=!f.hidden;if(!f.hidden)f.elements.label.focus();else f.reset();});
  $('alert-cancel').addEventListener('click',()=>{$('alert-form').hidden=true;$('alert-form').reset();});
  $('alert-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(saving||!context||!context.writable)return;
    const form=event.currentTarget,button=form.querySelector('button[type=submit]');
    saving=true;button.disabled=true;const run=revision;
    try{
      await PFVet.raiseAlert(petId,{kind:form.kind.value,severity:form.severity.value,
                                    label:form.label.value,detail:form.detail.value});
      saving=false;
      if(run===revision){form.reset();form.parentElement&&($('alert-form').hidden=true);await load();notice(T('Alert added.','Alerte ajoutée.'));}
    }catch(e){
      saving=false;
      if(run===revision)notice(e.message||T('Could not add this alert. Try again.','Impossible d\'ajouter cette alerte. Réessayez.'),true);
    }finally{button.disabled=false;}
  });
  $('entry-form').addEventListener('input',()=>{dirty=true;if(!submitted)pendingId=null;});
  $('filter').addEventListener('change',renderTimeline);$('refresh').addEventListener('click',load);$('retry').addEventListener('click',load);
  $('entry-form').addEventListener('submit',async event=>{
    event.preventDefault();if(saving||!context?.writable)return;
    const kind=$('kind').value, values=Object.fromEntries(new FormData(event.currentTarget));
    try{PFVet.payload(kind,values);}catch(e){saveNotice(e.message,true);return;}
    saving=true;const run=revision;pendingId ||= crypto.randomUUID();submitted=true;
    const controls=Array.from(event.currentTarget.querySelectorAll('input,select,textarea,button'));controls.forEach(c=>c.disabled=true);saveNotice(T('Saving…','Enregistrement…'));
    let saved=false;
    try{await PFVet.addRecord(petId,kind,values,pendingId);saved=true;}
    catch(e){
      if(run===revision)saveNotice(e.code==='23505'
        ?T('This entry was already saved. Refresh the record to check it.','Cette entrée a déjà été enregistrée. Actualisez le dossier pour la vérifier.')
        :e.message||T('Could not confirm the save. Retry to check this entry without creating a duplicate.','Enregistrement non confirmé. Réessayez pour vérifier cette entrée sans créer de doublon.'),true);
    }
    finally{saving=false;controls.forEach(c=>c.disabled=false);}
    if(run!==revision)return;
    if(saved){buildFields();await load();if(context)saveNotice(T('Record saved. The owner can now see it.','Entrée enregistrée. Le propriétaire peut désormais la voir.'));else notice(T('Record saved, but the timeline could not be refreshed. Try again.','Entrée enregistrée, mais l\'historique n\'a pas pu être actualisé. Réessayez.'),true);}
  });
  $('logout').addEventListener('click',async()=>{++revision;clear();buildFields();try{const r=await PFDB.signOut();if(r.error)throw r.error;location.href='index.html';}catch(e){notice(T('Could not sign out. Please retry.','Déconnexion impossible. Réessayez.'),true);}});
  if(window.PFDB)PFDB.onAuth(event=>{if(event==='SIGNED_OUT'){++revision;clear();buildFields();document.title=T('Patient record — PetFind','Dossier du patient — PetFind');$('signin').hidden=false;notice(T('You have signed out.','Vous êtes déconnecté.'));}});
  window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&context)load();});
  window.PFI18nOnChange=function(){
    // Preserve anything half-typed: only relabel, never wipe the form.
    const form=$('entry-form'), kept=Object.fromEntries(new FormData(form));
    buildFields();
    for(const [k,v] of Object.entries(kept)) if(form.elements[k]&&v) form.elements[k].value=v;
    if(context){renderTimeline();renderAlerts();renderVitals();}
  };
  buildFields();load();
})();
