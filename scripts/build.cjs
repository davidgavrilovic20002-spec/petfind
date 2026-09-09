const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'), dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist);
for(const name of fs.readdirSync(root)){
  if(name==='assets'||name==='clinic'||/\.(html|txt|xml|webmanifest|ico)$/.test(name)||name==='.nojekyll')fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
}
for(const name of ['index.html','account.html','clinic/index.html','clinic/record.html','clinic/clinical.html','clinic/operations.html','clinic/security.html']){
  const html=fs.readFileSync(path.join(dist,name),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){
    const ref=match[1];if(/^(https?:|mailto:|tel:|data:|#)/.test(ref))continue;
    const file=path.resolve(path.dirname(path.join(dist,name)),ref);
    if(!fs.existsSync(file))throw new Error(`${name}: missing ${ref}`);
  }
}
// clinic-data.js carries a BUILD constant it compares against the ?v= the HTML
// asked for, so it can tell a page it is stale. If the two ever drift, every
// freshly loaded page would accuse itself of being out of date -- so the drift
// is caught here rather than in production.
{
  const js = fs.readFileSync(path.join(root, 'assets/js/clinic-data.js'), 'utf8');
  const build = (js.match(/const BUILD = (\d+);/) || [])[1];
  if (!build) throw new Error('clinic-data.js: BUILD constant not found');
  const pins = new Set();
  for (const name of fs.readdirSync(dist).concat(fs.readdirSync(path.join(dist, 'clinic')).map(f => 'clinic/' + f))) {
    if (!/\.html$/.test(name)) continue;
    const html = fs.readFileSync(path.join(dist, name), 'utf8');
    for (const m of html.matchAll(/clinic-data\.js\?v=(\d+)/g)) pins.add(m[1]);
  }
  if (pins.size > 1) throw new Error('clinic-data.js pinned at several versions: ' + [...pins].join(', '));
  if (pins.size === 1 && [...pins][0] !== build) {
    throw new Error(`clinic-data.js BUILD is ${build} but the HTML pins ?v=${[...pins][0]} — every page would report itself stale`);
  }
}

console.log('Static build complete; homepage, account, clinic and record assets resolved.');
