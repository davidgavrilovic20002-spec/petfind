(function () {
  'use strict';
  const $=id=>document.getElementById(id), petId=new URLSearchParams(location.search).get('pet');
  let context=null, revision=0, saving=false, dirty=false, pendingId=null, submitted=false;
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
      target.append(article);
    }
  }
  function clear(){context=null;$('record').hidden=true;$('timeline').replaceChildren();$('editor').hidden=true;$('pet-name').textContent='';$('pet-detail').textContent='';}
  async function load(){
    if(saving)return;
    const run=++revision;clear();$('retry').hidden=true;$('signin').hidden=true;notice(T('Loading record…','Chargement du dossier…'));
    try{
      if(!window.PFVet)throw new Error(T('Cannot connect to PetFind. Check your connection and reload.','Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'));
      const result=await PFVet.records(petId);if(run!==revision)return;
      context=result;$('logout').hidden=false;$('pet-name').textContent=context.pet.name;document.title=T('Patient record — PetFind','Dossier du patient — PetFind');
      const sp=window.PFBreeds?PFBreeds.speciesLabel(context.pet.species,lang()):context.pet.species;
      const br=window.PFBreeds?PFBreeds.displayBreed(context.pet,lang()):context.pet.breed;
      $('pet-detail').textContent=[sp,br,context.pet.sex,context.pet.age].filter(Boolean).join(' · ');
      $('access').textContent=context.owner?T('Your pet’s record','Le dossier de votre animal')
        :context.writable?T('View & add records','Consulter et compléter'):T('Read-only access','Accès en lecture seule');
      $('back').href=context.owner?'../account.html':'index.html';
      $('back').textContent=context.owner?T('← My account','← Mon compte'):T('← Patient list','← Liste des patients');
      $('editor').hidden=!context.writable;$('record-layout').classList.toggle('read-only',!context.writable);$('record').hidden=false;renderTimeline();notice('');
      if(!context.writable){buildFields();}
    }catch(e){if(run!==revision)return;clear();buildFields();$('retry').hidden=false;$('signin').hidden=false;notice(e.message||T('Could not load this record. Try again.','Chargement du dossier impossible. Réessayez.'),true);}
  }
  $('kind').addEventListener('change',buildFields);
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
    if(context)renderTimeline();
  };
  buildFields();load();
})();
