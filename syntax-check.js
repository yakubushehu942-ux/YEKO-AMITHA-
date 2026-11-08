const fs=require("fs"),path=require("path"),cp=require("child_process");
const roots=["netlify/functions","scripts"];
const list=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())walk(q);else if(q.endsWith(".js")&&!q.endsWith("syntax-check.js"))list.push(q);}}
roots.forEach(walk);
let failed=false;
for(const file of list){const r=cp.spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(r.status!==0){failed=true;console.error(r.stderr||r.stdout);}else console.log("OK",file);}
if(failed)process.exit(1);