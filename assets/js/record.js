(function () {
  'use strict';
  const $=id=>document.getElementById(id), petId=new URLSearchParams(location.search).get('pet');
  let context=null, revision=0, saving=false, dirty=false, pendingId=null, submitted=false;
  const labels={vaccination:'Vaccination',diagnosis:'Diagnosis',prescription:'Prescription'};
  const fields={
    vaccination:[['vaccine_type','Vaccine','text',true],['product_name','Product name'],['batch_lot','Batch / lot'],['administered_at','Given on','date',true],['valid_until','Valid until','date']],
    diagnosis:[['condition','Condition','text',true],['diagnosed_at','Diagnosed on','date',true],['status','Status','select',true],['notes','Clinical notes','textarea']],
    prescription:[['medication','Medication','text',true],['dose_amount','Dose amount','number'],['dose_unit','Dose unit (mg, mL, tablet…)'],['route','Route (oral, topical…)'],['frequency','Frequency'],['start_date','Start date','date',true],['end_date','End date','date'],['instructions','Instructions','textarea']]
  };
  function date(value){return value?new Date(value+'T12:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'';}
  function notice(message,error){$('notice').textContent=message||'';$('notice').classList.toggle('error',!!error);}
  function saveNotice(message,error){$('save-notice').textContent=message||'';$('save-notice').classList.toggle('error',!!error);}
  function buildFields(){
    const target=$('entry-fields'); target.replaceChildren(); pendingId=null;submitted=false;dirty=false;saveNotice('');
    for(const [name,title,type='text',required=false] of fields[$('kind').value]){
      const label=document.createElement('label'); label.textContent=title+(required?' *':'');
      const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');input.name=name;input.required=required;
      if(type==='select') for(const value of ['active','resolved','chronic']){const option=document.createElement('option');option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);input.append(option);}
      else if(type!=='textarea'){input.type=type;if(type==='date'&&required){const today=new Date();input.value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');} if(type==='number'){input.min='0.000001';input.step='any';}}
      if(type==='text'||type==='textarea')input.maxLength=type==='textarea'?10000:500;
      label.append(input);target.append(label);
    }
  }
  function renderTimeline(){
    const target=$('timeline');target.replaceChildren();if(!context)return;
    const entries=context.entries.filter(e=>$('filter').value==='all'||e.kind===$('filter').value);
    if(!entries.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No '+($('filter').value==='all'?'medical':labels[$('filter').value].toLowerCase())+' records yet.';target.append(empty);return;}
    for(const entry of entries){
      const article=document.createElement('article');article.className='record-entry';
      const meta=document.createElement('div');meta.className='entry-meta';const kind=document.createElement('span'),time=document.createElement('time');kind.textContent=labels[entry.kind];time.dateTime=entry.date;time.textContent=date(entry.date);meta.append(kind,time);
      const heading=document.createElement('h3');heading.textContent=entry.title;article.append(meta,heading);
      function detail(label,value){if(value==null||value==='')return;const p=document.createElement('p');p.textContent=(label?label+': ':'')+value;article.append(p);}
      if(entry.kind==='vaccination'){detail('Product',entry.product_name);detail('Batch / lot',entry.batch_lot);detail('Valid until',date(entry.valid_until));}
      if(entry.kind==='diagnosis'){detail('Status',entry.status);detail('',entry.notes);}
      if(entry.kind==='prescription'){detail('Dose',[entry.dose_amount,entry.dose_unit].filter(v=>v!=null).join(' '));detail('Route',entry.route);detail('Frequency',entry.frequency);detail('End date',date(entry.end_date));detail('',entry.instructions);}
      target.append(article);
    }
  }
  function clear(){context=null;$('record').hidden=true;$('timeline').replaceChildren();$('editor').hidden=true;$('pet-name').textContent='';$('pet-detail').textContent='';}
  async function load(){
    if(saving)return;
    const run=++revision;clear();$('retry').hidden=true;$('signin').hidden=true;notice('Loading record…');
    try{
      if(!window.PFVet)throw new Error('Cannot connect to PetFind. Check your connection and reload.');
      const result=await PFVet.records(petId);if(run!==revision)return;
      context=result;$('logout').hidden=false;$('pet-name').textContent=context.pet.name;document.title='Patient record — PetFind';
      $('pet-detail').textContent=[context.pet.species,context.pet.breed,context.pet.sex,context.pet.age].filter(Boolean).join(' · ');
      $('access').textContent=context.owner?'Your pet’s record':context.writable?'View & add records':'Read-only access';
      $('back').href=context.owner?'../account.html':'index.html';$('back').textContent=context.owner?'← My account':'← Patient list';
      $('editor').hidden=!context.writable;$('record-layout').classList.toggle('read-only',!context.writable);$('record').hidden=false;renderTimeline();notice('');
      if(!context.writable){buildFields();}
    }catch(e){if(run!==revision)return;clear();buildFields();$('retry').hidden=false;$('signin').hidden=false;notice(e.message||'Could not load this record. Try again.',true);}
  }
  $('kind').addEventListener('change',buildFields);
  $('entry-form').addEventListener('input',()=>{dirty=true;if(!submitted)pendingId=null;});
  $('filter').addEventListener('change',renderTimeline);$('refresh').addEventListener('click',load);$('retry').addEventListener('click',load);
  $('entry-form').addEventListener('submit',async event=>{
    event.preventDefault();if(saving||!context?.writable)return;
    const kind=$('kind').value, values=Object.fromEntries(new FormData(event.currentTarget));
    try{PFVet.payload(kind,values);}catch(e){saveNotice(e.message,true);return;}
    saving=true;const run=revision;pendingId ||= crypto.randomUUID();submitted=true;
    const controls=Array.from(event.currentTarget.querySelectorAll('input,select,textarea,button'));controls.forEach(c=>c.disabled=true);saveNotice('Saving…');
    let saved=false;
    try{await PFVet.addRecord(petId,kind,values,pendingId);saved=true;}
    catch(e){
      if(run===revision)saveNotice(e.code==='23505'?'This entry was already saved. Refresh the record to check it.':e.message||'Could not confirm the save. Retry to check this entry without creating a duplicate.',true);
    }
    finally{saving=false;controls.forEach(c=>c.disabled=false);}
    if(run!==revision)return;
    if(saved){buildFields();await load();if(context)saveNotice('Record saved. The owner can now see it.');else notice('Record saved, but the timeline could not be refreshed. Try again.',true);}
  });
  $('logout').addEventListener('click',async()=>{++revision;clear();buildFields();try{const r=await PFDB.signOut();if(r.error)throw r.error;location.href='index.html';}catch(e){notice('Could not sign out. Please retry.',true);}});
  if(window.PFDB)PFDB.onAuth(event=>{if(event==='SIGNED_OUT'){++revision;clear();buildFields();document.title='Patient record — PetFind';$('signin').hidden=false;notice('You have signed out.');}});
  window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&context)load();});
  buildFields();load();
})();
