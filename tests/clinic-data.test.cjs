const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/clinic-data.js'),'utf8');
const petId='11111111-1111-4111-8111-111111111111';
function setup({role='vet',scope='write',owner=false,signedIn=true,mfa=false,revoked=false,queryError=false,walkIns=[],rpcResult='claimed-pet-id'}={}){
  const calls=[], inserts=[], rpcs=[];
  const client={rpc(name,args){rpcs.push({name,args});return Promise.resolve({data:rpcResult});},from(table){const filters=[];let inserted=null,one=false;const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},is(k,v){filters.push([k,v]);return query;},order(){return query;},insert(row){inserted=row;return query;},then(resolve,reject){calls.push({table,filters});let data=[];
    if(queryError)return Promise.resolve({error:{message:'offline'}}).then(resolve,reject);
    if(inserted){inserts.push({table,row:inserted});data={id:inserted.id};}
    else if(table==='pets')data=one?{id:petId,owner_id:owner?'user':'owner',created_by_vet:null,name:'Luna'}:walkIns;
    else if(table==='vet_pet_access')data=revoked?[]:[{scope,pet_id:petId,pets:{id:petId,name:'Luna'}}];
    return Promise.resolve({data}).then(resolve,reject);},maybeSingle(){one=true;return query;},single(){one=true;return query;}};return query;}};
  const PFDB={client,getUser:async()=>signedIn?{id:'user'}:null,getProfile:async()=>({data:{id:'user',role}}),mfaAAL:async()=>({data:{currentLevel:'aal1',nextLevel:mfa?'aal2':'aal1'}})};
  const sandbox={window:{PFDB}};vm.runInNewContext(source,sandbox);return {api:sandbox.window.PFVet,calls,inserts,rpcs};
}
const vaccination={vaccine_type:' Rabies ',administered_at:'2026-09-08',valid_until:'2027-09-08'};
test('signed-out and MFA-pending sessions cannot query records',async()=>{
  for(const options of [{signedIn:false},{mfa:true}]){const {api,calls}=setup(options);await assert.rejects(api.records(petId));assert.equal(calls.length,0);}
});
test('owner role cannot enter vet workspace',async()=>{const {api,calls}=setup({role:'owner'});await assert.rejects(api.caseload(),/approved veterinary/);assert.equal(calls.length,0);});
test('read-only, revoked and owner contexts cannot use vet record writer',async()=>{
  for(const options of [{scope:'read'},{revoked:true},{owner:true,role:'owner'}]){const {api,inserts}=setup(options);await assert.rejects(api.addRecord(petId,'vaccination',vaccination,'entry'));assert.equal(inserts.length,0);}
});
test('record insert binds author and pet to verified context and strips unexpected fields',async()=>{
  const {api,inserts}=setup();await api.addRecord(petId,'vaccination',{...vaccination,administered_by:'attacker',pet_id:'other',official_synced:true},'stable-id');
  assert.equal(inserts.length,1);assert.equal(inserts[0].row.administered_by,'user');assert.equal(inserts[0].row.pet_id,petId);assert.equal(inserts[0].row.id,'stable-id');assert.equal(inserts[0].row.vaccine_type,'Rabies');assert.equal(inserts[0].row.official_synced,undefined);
});
test('validation rejects impossible dates, reversed dates and invalid doses',()=>{
  const {api}=setup();assert.throws(()=>api.payload('vaccination',{...vaccination,administered_at:'2026-02-30'}));assert.throws(()=>api.payload('vaccination',{...vaccination,valid_until:'2025-01-01'}));
  for(const dose of ['-1','Infinity','0','abc'])assert.throws(()=>api.payload('prescription',{medication:'Test',start_date:'2026-09-08',dose_amount:dose,dose_unit:'mg'}));
  assert.throws(()=>api.payload('prescription',{medication:'Test',start_date:'2026-09-08',dose_amount:'1'}));
});
test('caseload queries active grants for current vet',async()=>{const {api,calls}=setup();assert.equal((await api.caseload()).length,1);assert.deepEqual(calls[0].filters,[['vet_id','user'],['status','active']]);});
test('server errors remain errors rather than empty successful caseloads',async()=>{const {api}=setup({queryError:true});await assert.rejects(api.caseload(),e=>e.message==='offline');});
test('missing/malformed pet links make no backend calls',async()=>{const {api,calls}=setup();await assert.rejects(api.records(null));await assert.rejects(api.records('bad'));assert.equal(calls.length,0);});
test('owner can read timeline, with editor disabled',async()=>{const {api}=setup({owner:true,role:'owner'});const result=await api.records(petId);assert.equal(result.owner,true);assert.equal(result.writable,false);});
test('caseload includes unclaimed patients this vet created',async()=>{
  const walkIn={id:'22222222-2222-4222-8222-222222222222',name:'Milo',claim_code:'PF-ABCD-2345'};
  const {api}=setup({walkIns:[walkIn]});const list=await api.caseload();
  assert.equal(list.length,2);const mine=list.find(p=>p.id===walkIn.id);
  assert.equal(mine.unclaimed,true);assert.equal(mine.claim_code,'PF-ABCD-2345');
});
test('createPatient binds the creating vet to the session, not to caller input',async()=>{
  const {api,inserts}=setup();await api.createPatient({name:' Milo ',species:'dog',sex:'nonsense',created_by_vet:'attacker',owner_id:'attacker'});
  assert.equal(inserts.length,1);const row=inserts[0].row;
  assert.equal(row.created_by_vet,'user');assert.equal(row.name,'Milo');
  assert.equal(row.sex,null);assert.equal(row.owner_id,undefined);
});
test('createPatient refuses a blank name and a non-vet account',async()=>{
  const {api,inserts}=setup();await assert.rejects(api.createPatient({name:'   '}),/patient name/);
  const owner=setup({role:'owner'});await assert.rejects(owner.api.createPatient({name:'Milo'}),/approved veterinary/);
  assert.equal(inserts.length,0);assert.equal(owner.inserts.length,0);
});
test('claimRecord validates the code shape before reaching the backend',async()=>{
  const {api,rpcs}=setup({role:'owner'});
  for(const bad of ['','nope','PF-0000-1111','PF-ABC-DEFG'])await assert.rejects(api.claimRecord(bad),/PF-XXXX-XXXX/);
  assert.equal(rpcs.length,0);
  assert.equal(await api.claimRecord('  pf-abcd-2345 '),'claimed-pet-id');
  assert.equal(rpcs[0].name,'claim_pet_record');assert.equal(rpcs[0].args.p_code,'PF-ABCD-2345');
});
