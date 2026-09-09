const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(){
 const nodes={};const node=id=>nodes[id]||(nodes[id]={textContent:'',innerHTML:''});
 const document={getElementById:node,querySelectorAll:()=>[]};
 let source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/clinical.js'),'utf8');
 source=source.replace(/render\(\);\s*\}\)\(\);\s*$/,`globalThis.api={agenda,intake,soap,specialties,lab,france,appointment,addDays,bsa,appointments,chart,opts,remember,restore,setView:v=>view=v,setDate:v=>date=v,setPage:v=>page=v};})();`);
 const context={document,FormData:class{constructor(f){return Object.entries(f.values)[Symbol.iterator]();}},Date};vm.createContext(context);vm.runInContext(source,context);return {api:context.api,nodes,node};
}
test('all six modules render without an exception and disclose demo/integration limitations',()=>{const {api}=harness();for(const name of ['agenda','intake','soap','specialties','lab','france'])assert.ok(api[name]().length>100);assert.match(api.soap(),/Non connectée/);assert.match(api.lab(),/Aucun serveur PACS connecté/);assert.match(api.france(),/pas une certification/);});
test('calendar groups by date, room, practitioner and surgery, and excludes other dates',()=>{const {api}=harness();api.setDate(api.appointments[0].date);for(const view of ['Jour','Semaine','Salles','Praticiens','Bloc opératoire']){api.setView(view);const html=api.agenda();assert.match(html,/Milo/);if(view==='Bloc opératoire')assert.doesNotMatch(html,/Camille Exemple/);}api.setView('Jour');api.setDate('2040-01-01');assert.doesNotMatch(api.agenda(),/Camille Exemple/);});
test('appointment data and selection values are escaped before HTML insertion',()=>{const {api}=harness();const html=api.appointment({...api.appointments[0],pet:'<img src=x onerror=alert(1)>',owner:'<script>x</script>'});assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);assert.doesNotMatch(api.opts(['<script>']),/<script>/);});
test('date arithmetic crosses leap day and year boundaries',()=>{const {api}=harness();assert.equal(api.addDays('2024-02-28',1),'2024-02-29');assert.equal(api.addDays('2026-12-31',1),'2027-01-01');});
test('body surface calculations match reference points and reject invalid inputs',()=>{const {api}=harness();assert.equal(api.bsa(4,'Chat').toFixed(3),'0.252');assert.equal(api.bsa(10,'Chien').toFixed(2),'0.47');for(const value of [0,-1,NaN,Infinity,121])assert.equal(api.bsa(value,'Chien'),null);assert.equal(api.bsa(10,'Équin'),null);});
test('clinical demonstration has no persistence, patient API or microphone/network access',()=>{const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/clinical.js'),'utf8');assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|getUserMedia|SpeechRecognition|PFDB|PFVet/);});
