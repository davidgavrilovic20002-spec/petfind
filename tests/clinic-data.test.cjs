const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/clinic-data.js'),'utf8');
const petId='11111111-1111-4111-8111-111111111111';
function setup({role='vet',scope='write',owner=false,signedIn=true,mfa=false,revoked=false,queryError=false}={}){
  const calls=[], inserts=[];
  const client={from(table){const filters=[];let inserted=null;const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},is(){return query;},order(){return query;},insert(row){inserted=row;return query;},then(resolve,reject){calls.push({table,filters});let data=[];
    if(queryError)return Promise.resolve({error:{message:'offline'}}).then(resolve,reject);
    if(inserted){inserts.push({table,row:inserted});data={id:inserted.id};}
    else if(table==='pets')data={id:petId,owner_id:owner?'user':'owner',name:'Luna'};
    else if(table==='vet_pet_access')data=revoked?[]:[{scope,pet_id:petId,pets:{id:petId,name:'Luna'}}];
    return Promise.resolve({data}).then(resolve,reject);},maybeSingle(){return query;},single(){return query;}};return query;}};
  const PFDB={client,getUser:async()=>signedIn?{id:'user'}:null,getProfile:async()=>({data:{id:'user',role}}),mfaAAL:async()=>({data:{currentLevel:'aal1',nextLevel:mfa?'aal2':'aal1'}})};
  const sandbox={window:{PFDB}};vm.runInNewContext(source,sandbox);return {api:sandbox.window.PFVet,calls,inserts};
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
