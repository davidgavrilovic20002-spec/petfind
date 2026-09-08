(function(){
  'use strict';
  const knownEmails=new Map();
  const L=(en,fr)=>window.PFI18n?.lang==='en'?en:fr;
  window.PFOwnerHealth={
    mount:function(host,pet){
      const section=document.createElement('details');section.className='owner-health';
      const summary=document.createElement('summary');summary.textContent=L('Health record & vet access','Dossier de santé et accès vétérinaire');section.append(summary);
      const actions=document.createElement('div');actions.className='health-actions';const record=document.createElement('a');record.className='btn soft';record.href='clinic/record.html?pet='+encodeURIComponent(pet.id);record.textContent=L('View health record','Voir le dossier de santé');actions.append(record);section.append(actions);
      const intro=document.createElement('p');intro.className='muted';intro.textContent=L('Share this pet’s health record with an approved vet using their account email. You can revoke access at any time.','Partagez le dossier de cet animal avec un vétérinaire approuvé via son e-mail de compte. Vous pouvez révoquer son accès à tout moment.');section.append(intro);
      const message=document.createElement('p');message.className='notice';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
      function notice(text,error){message.textContent=text;message.classList.toggle('error',!!error);}
      const form=document.createElement('form');
      const emailLabel=document.createElement('label');emailLabel.textContent=L('Vet’s account email','E-mail du compte vétérinaire');const email=document.createElement('input');email.type='email';email.required=true;email.autocomplete='off';emailLabel.append(email);
      const scopeLabel=document.createElement('label');scopeLabel.textContent=L('Permission','Autorisation');const scope=document.createElement('select');
      for(const [value,label] of [['write',L('View & add records','Consulter et ajouter des soins')],['read',L('View only','Consultation seule')]]){const option=document.createElement('option');option.value=value;option.textContent=label;scope.append(option);}scopeLabel.append(scope);
      const submit=document.createElement('button');submit.className='btn primary';submit.type='submit';submit.textContent=L('Grant access','Autoriser l’accès');form.append(emailLabel,scopeLabel,submit);section.append(form,message);
      const title=document.createElement('h4');title.textContent=L('Active access','Accès actifs');section.append(title);const list=document.createElement('div');section.append(list);
      const refresh=document.createElement('button');refresh.type='button';refresh.className='btn ghost';refresh.textContent=L('Refresh access','Actualiser les accès');section.append(refresh);
      let version=0;
      async function load(){
        const run=++version;list.replaceChildren();refresh.disabled=true;
        try{
          if(!window.PFVet)throw new Error(L('Service unavailable. Reload the page.','Service indisponible. Rechargez la page.'));
          const grants=await PFVet.ownerGrants(pet.id);if(run!==version||!host.isConnected)return;
          if(!grants.length){const empty=document.createElement('p');empty.textContent=L('No vet currently has access.','Aucun vétérinaire n’a accès actuellement.');empty.className='muted';list.append(empty);}
          for(const grant of grants){
            const row=document.createElement('div');row.className='access-row';const info=document.createElement('div'),name=document.createElement('p'),detail=document.createElement('p');
            name.textContent=knownEmails.get(grant.id)||L('Vet ID: ','Identifiant vétérinaire : ')+(grant.vet_id||'—');
            detail.className='muted';detail.textContent=(grant.scope==='read'?L('View only','Consultation seule'):L('View & add records','Consultation et ajout'))+' · '+new Date(grant.created_at).toLocaleDateString();info.append(name,detail);
            const revoke=document.createElement('button');revoke.type='button';revoke.className='btn danger';revoke.textContent=L('Revoke','Révoquer');revoke.setAttribute('aria-label',L('Revoke access for ','Révoquer l’accès de ')+name.textContent);
            revoke.addEventListener('click',async()=>{revoke.disabled=true;notice(L('Revoking…','Révocation…'));try{await PFVet.revoke(pet.id,grant.id);if(!host.isConnected)return;notice(L('Access revoked. Existing records remain in your pet’s history.','Accès révoqué. Les soins existants restent dans l’historique de votre animal.'));await load();}catch(e){notice(e.message||L('Could not revoke access.','Impossible de révoquer l’accès.'),true);}finally{revoke.disabled=false;}});
            row.append(info,revoke);list.append(row);
          }
        }catch(e){if(run===version)notice(e.message||L('Could not load access.','Impossible de charger les accès.'),true);}finally{if(run===version)refresh.disabled=false;}
      }
      form.addEventListener('submit',async event=>{
        event.preventDefault();submit.disabled=true;email.disabled=true;scope.disabled=true;notice(L('Granting access…','Autorisation en cours…'));
        try{const id=await PFVet.grant(pet.id,email.value,scope.value);knownEmails.set(id,email.value.trim());if(!host.isConnected)return;notice(L('Access granted. The vet can refresh their patient list.','Accès autorisé. Le vétérinaire peut actualiser sa liste de patients.'));email.value='';await load();}
        catch(e){notice(/vet_not_found/.test(e.message)?L('No approved vet was found with that email. Check the address with your vet.','Aucun vétérinaire approuvé ne correspond à cet e-mail. Vérifiez l’adresse avec votre vétérinaire.'):e.message||L('Could not grant access.','Impossible d’autoriser l’accès.'),true);}
        finally{submit.disabled=false;email.disabled=false;scope.disabled=false;}
      });
      section.addEventListener('toggle',()=>{if(section.open)load();});refresh.addEventListener('click',()=>{notice('');load();});host.append(section);
    }
  };
  if(window.PFDB)PFDB.onAuth(event=>{if(event==='SIGNED_OUT'){knownEmails.clear();document.querySelectorAll('.owner-health').forEach(el=>el.remove());}});
})();
