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
console.log('Static build complete; homepage, account, clinic and record assets resolved.');
