(function(){
'use strict';
const $=id=>document.getElementById(id),api=window.PFClinicWork;
let who=null,pets=[],clinics=[],items=[],active=null,epoch=0,saving=false,dirty=false,request=null,factor=null,draftId=null;
// Clinical labels live in French in operations-data.js, which is also what the
// validator reports errors by. Translating at render time keeps that file and
// its tests untouched, and an untranslated label falls through readable.
const lang=()=>(window.PFI18n&&window.PFI18n.lang)||'fr';
const tr=s=>lang()==='en'&&window.PFClinicalEN&&window.PFClinicalEN[s]?window.PFClinicalEN[s]:s;
const trNote=s=>lang()==='en'&&window.PFClinicalNotesEN&&window.PFClinicalNotesEN[s]?window.PFClinicalNotesEN[s]:s;
const namesEN={scheduled:'Scheduled',arrived:'Arrived / admitted',exam_1:'Exam room 1',exam_2:'Exam room 2',exam_3:'Exam room 3',surgery:'Surgery / theatre',hospitalized:'Hospitalised',checkout:'Ready for checkout',cancelled:'Cancelled',no_show:'No-show',consultation:'Consultation',vaccination:'Vaccination',emergency:'Emergency',grooming:'Grooming',teleconsultation:'Teleconsultation'};
const names={scheduled:'Planifié',arrived:'Arrivé / admis',exam_1:'En consultation 1',exam_2:'En consultation 2',exam_3:'En consultation 3',surgery:'Chirurgie / bloc',hospitalized:'Hospitalisé',checkout:'Prêt pour la sortie',cancelled:'Annulé',no_show:'Absent',consultation:'Consultation',vaccination:'Vaccination',emergency:'Urgence',grooming:'Toilettage',teleconsultation:'Téléconsultation'};
function notice(s,error=false){$('op-notice').textContent=s;$('op-notice').classList.toggle('error',error);}
function fail(e){return ({revision_conflict:'Une version plus récente existe. Votre texte reste ici : copiez-le avant d’actualiser et de comparer les versions.',appointment_overlap:'Ce créneau est déjà occupé pour cette salle ou ce praticien.',clinic_membership_required:'Une affectation à la clinique est requise.',clinic_access_denied:'Accès refusé : vérifiez la double authentification et les droits sur le patient.',request_id_reused:'Cette tentative a déjà été utilisée avec un contenu différent.'})[e.message]||e.message||'Opération impossible. Réessayez.';}
const label=v=>(lang()==='en'?namesEN[v]:names[v])||v;
function show(id){for(const k of ['op-login','op-mfa','op-workspace'])$(k).hidden=k!==id;}
function clear(){who=null;pets=[];items=[];clinics=[];active=null;request=null;dirty=false;$('op-list').replaceChildren();$('op-history').replaceChildren();$('op-form').reset();$('op-fields').replaceChildren();$('op-editor').hidden=true;$('op-pet').replaceChildren();}
function option(value,text){const e=document.createElement('option');e.value=value;e.textContent=text;return e;}
function choice(){return pets.find(p=>p.id===$('op-pet').value);}
function writable(){return ['write','full'].includes(choice()?.scope);}
function close(){active=null;request=null;dirty=false;$('op-editor').hidden=true;$('op-form').reset();$('op-fields').replaceChildren();$('op-history').replaceChildren();}
function abandon(){return !dirty||window.confirm('Abandonner les modifications non enregistrées ?');}
async function route(){const run=++epoch;clear();show(null);notice('Vérification de la session…');
try{if(!window.PFDB||!api)throw new Error('Connexion indisponible. Rechargez la page.');const user=await PFDB.getUser();if(run!==epoch)return;$('op-logout').hidden=!user;if(!user){show('op-login');notice('');return;}
who=await api.identity();if(run!==epoch)return;const loaded=await Promise.all([PFVet.caseload(),api.clinics(who.user.id)]);if(run!==epoch)return;[pets,clinics]=loaded;
$('op-pet').replaceChildren(...pets.map(p=>option(p.id,p.name)));const requested=new URLSearchParams(location.search).get('pet');if(pets.some(p=>p.id===requested))$('op-pet').value=requested;
show('op-workspace');if(!pets.length){notice('Aucun patient disponible. Ajoutez un patient depuis la page Patients, ou demandez un partage au propriétaire.');$('op-new').disabled=true;return;}await load();
}catch(e){if(run!==epoch)return;if(e.code==='mfa_required'){const r=await PFDB.mfaList();if(run!==epoch)return;factor=r.data?.totp?.find(f=>f.status==='verified')?.id;show('op-mfa');$('op-mfa-form').hidden=!factor;$('op-enroll').hidden=!!factor;notice('La vérification en deux étapes protège l’accès aux nouvelles fiches.');}else{clear();show('op-login');notice(fail(e),true);}}}
async function load(){const petId=$('op-pet').value,kind=$('op-kind').value,run=++epoch;if(!petId)return;notice('Chargement des fiches…');$('op-new').disabled=!writable();$('op-list').replaceChildren();items=[];
try{const result=await api.list(petId,kind);if(run!==epoch)return;items=result;renderList();notice(items.length===200?'200 fiches récentes affichées. Les fiches plus anciennes restent conservées.':'');}catch(e){if(run===epoch)notice(fail(e),true);}}
function renderList(){const list=$('op-list');list.replaceChildren();if(!items.length){const p=document.createElement('p');p.className='empty';p.textContent='Aucune fiche enregistrée pour ce type.';list.append(p);return;}
for(const item of items){const card=document.createElement('article');card.className='record-entry';const title=document.createElement('h3');title.textContent=item.title;const meta=document.createElement('p');meta.className='small muted';meta.textContent='Version '+item.revision+' · '+new Date(item.updated_at).toLocaleString('fr-FR');const open=document.createElement('button');open.className='btn soft';open.textContent=writable()?(lang()==='en'?'Open / edit':'Ouvrir / modifier'):(lang()==='en'?'View':'Consulter');open.onclick=()=>{if(!saving&&abandon())edit(item);};card.append(title,meta);if(item.kind==='appointment'){const p=document.createElement('p');p.textContent=new Date(item.payload.starts_at).toLocaleString(lang()==='en'?'en-GB':'fr-FR')+' · '+item.payload.room+' · '+label(item.payload.status);card.append(p);}card.append(open);list.append(card);}}
window.PFI18nOnChange=function(){fillKinds();renderList();if(!$('op-editor').hidden)edit(active);};
function localDateTime(value){if(!value)return '';const d=new Date(value);if(isNaN(d))return '';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());}
async function edit(item){active=item||null;draftId=item?.id||crypto.randomUUID();request=null;dirty=false;const kind=$('op-kind').value,def=api.fields[kind];$('op-editor').hidden=false;$('op-editor-title').textContent=item?'Version '+item.revision:(lang()==='en'?'New sheet':'Nouvelle fiche');$('op-form').reset();$('op-form').elements.title.value=item?.title||tr(def.label);$('op-fields').replaceChildren();$('op-save-status').textContent='';$('op-kind-note').textContent=trNote(def.note);
for(const [key,label,type='text',required=false,options]of def.fields){const wrap=document.createElement('label');wrap.textContent=tr(label)+(required?' *':'');if(type==='textarea')wrap.className='wide';const el=document.createElement(type==='select'||type==='clinic'?'select':type==='textarea'?'textarea':'input');el.name=key;el.required=required;if(type==='select')el.append(...options.map(v=>option(v,label(v)!==v?label(v):tr(v))));else if(type==='clinic'){el.append(option('','Choisir la clinique'),...clinics.map(c=>option(c.clinic_id,c.clinics?.name||'Clinique')));if(!clinics.length)notice('Aucune clinique affectée. Un administrateur doit configurer votre appartenance pour les rendez-vous.',true);}else if(type!=='textarea'){el.type=type;if(type==='number'){el.min=options[0];el.max=options[1];el.step=['days','refills','bcs','fecal'].includes(key)?'1':'any';}}if(type==='text'||type==='textarea')el.maxLength=10000;
if(item?.payload[key]!==undefined)el.value=type==='datetime-local'?localDateTime(item.payload[key]):item.payload[key];el.disabled=!writable()||(item&&key==='clinic_id');wrap.append(el);$('op-fields').append(wrap);}
const frozen=!!api.fields[kind].deprecated;
$('op-form').elements.title.disabled=!writable()||frozen;$('op-save').hidden=!writable()||frozen;
if(frozen)for(const el of $('op-fields').querySelectorAll('input,select,textarea'))el.disabled=true;calculate();$('op-history').replaceChildren();
if(item){const run=epoch;try{const rows=await api.history(item.id);if(run!==epoch||active?.id!==item.id)return;for(const row of rows){const d=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Version '+row.revision+' · '+new Date(row.recorded_at).toLocaleString('fr-FR');const body=def.fields.map(([key,label])=>row.payload[key]!==undefined&&row.payload[key]!==''?label+': '+row.payload[key]:null).filter(Boolean);pre.textContent='Titre : '+row.title+'\nAuteur : '+row.actor_id+'\n'+body.join('\n');d.append(summary,pre);$('op-history').append(d);}}catch(e){$('op-history').textContent=fail(e);}}
}
function values(){const v=Object.fromEntries(new FormData($('op-form')));if(active?.kind==='appointment')v.clinic_id=active.payload.clinic_id;return v;}
function calculate(){const r=api.calculate($('op-kind').value,values());let s='';if(r?.mg!==undefined)s=r.mg.toLocaleString('fr-FR',{maximumSignificantDigits:6})+' mg / administration · '+r.ml.toLocaleString('fr-FR',{maximumSignificantDigits:6})+' mL / administration · '+r.totalMl.toLocaleString('fr-FR',{maximumSignificantDigits:6})+' mL au total';if(r?.mlPerHour!==undefined)s=r.mlPerHour.toLocaleString('fr-FR',{maximumSignificantDigits:6})+' mL/h';if(r?.total!==undefined)s='HT '+r.net.toFixed(2)+' € · TVA '+r.tax.toFixed(2)+' € · TTC '+r.total.toFixed(2)+' €';$('op-calculation').textContent=s;}
function fillKinds(){const sel=$('op-kind'),keep=sel.value;sel.replaceChildren(...Object.entries(api.fields).map(([k,v])=>option(k,tr(v.label))));if(keep)sel.value=keep;}
fillKinds();
$('op-form').oninput=()=>{dirty=true;if(request)request=null;calculate();};
$('op-form').onsubmit=async e=>{e.preventDefault();if(saving||!writable())return;const kind=$('op-kind').value,petId=$('op-pet').value;let v;try{v=api.validate(kind,values(),active?.payload.practitioner_id||who.user.id);}catch(err){$('op-save-status').textContent=fail(err);return;}
request ||= {p_id:active?.id||draftId,p_pet_id:petId,p_kind:kind,p_title:v.title,p_payload:v.payload,p_expected_revision:active?.revision||0,p_request_id:crypto.randomUUID()};saving=true;const run=epoch;const controls=Array.from(document.querySelectorAll('#op-workspace input,#op-workspace select,#op-workspace textarea,#op-workspace button'));const disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);$('op-save-status').textContent='Enregistrement…';
try{const saved=await api.save(request);if(run!==epoch)return;active=Array.isArray(saved)?saved[0]:saved;dirty=false;request=null;$('op-save-status').textContent='Enregistré en ligne · version '+active.revision;await load();if(active)await edit(active);}catch(err){if(run===epoch)$('op-save-status').textContent=fail(err);}finally{saving=false;controls.forEach((c,i)=>c.disabled=disabled[i]);}}
$('op-new').onclick=()=>{
  if(api.fields[$('op-kind').value]?.deprecated){notice(api.fields[$('op-kind').value].note,true);return;}
  if(!saving&&abandon())edit(null);
};$('op-close').onclick=()=>{if(!saving&&abandon())close();};
let previousPet='',previousKind=$('op-kind').value;
$('op-pet').onfocus=()=>previousPet=$('op-pet').value;
$('op-pet').onchange=async()=>{if(!abandon()){$('op-pet').value=previousPet;return;}close();previousPet=$('op-pet').value;await load();};
$('op-kind').onchange=async()=>{if(!abandon()){$('op-kind').value=previousKind;return;}close();previousKind=$('op-kind').value;await load();};
$('op-refresh').onclick=async()=>{if(abandon()){close();await load();}};
$('op-login-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await PFDB.signIn(e.target.email.value.trim(),e.target.password.value);if(r.error)throw r.error;e.target.password.value='';await route();}catch(err){notice('Connexion impossible. Vérifiez votre e-mail et votre mot de passe.',true);}finally{button.disabled=false;}};
$('op-mfa-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const r=await PFDB.mfaChallengeAndVerify(factor,e.target.code.value.trim());if(r.error)throw r.error;e.target.reset();await route();}catch(err){notice('Code non validé. Réessayez avec un nouveau code.',true);}finally{b.disabled=false;}};
$('op-logout').onclick=async()=>{if(saving||!abandon())return;const r=await PFDB.signOut();if(r.error){notice('Déconnexion impossible. Réessayez.',true);return;}++epoch;clear();show('op-login');$('op-logout').hidden=true;notice('Déconnecté.');};
if(window.PFDB)PFDB.onAuth(event=>{if(event==='SIGNED_OUT'){++epoch;clear();show('op-login');$('op-logout').hidden=true;notice('Session terminée.');}});
window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='';}});
window.addEventListener('pageshow',e=>{if(e.persisted)route();});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible'||!who||saving)return;const run=epoch;try{await api.identity();if($('op-pet').value){const c=await PFVet.recordContext($('op-pet').value);if(!c.writable&&dirty)throw new Error('Les droits d’écriture ont changé. Rechargez le dossier.');}}catch(e){if(run===epoch){++epoch;clear();show(null);notice(fail(e),true);}}});
route();
})();
