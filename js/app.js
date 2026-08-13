// Axiom portal — auth, keys, premium, admin
const DB={users:'ax_u',used:'ax_uk',gen:'ax_gk',pgen:'ax_pk',sess:'ax_s'};
const SECRET='axiom::v1::7f3aK9-2mQ8xZ-signing';
const PSECRET='axiom::v1::pRm-9xKz4W-premium';
const ADMIN='coco890';

const $=id=>document.getElementById(id);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{toast('Storage blocked','err')}};
const val=id=>$(id).value;

// hashing
function cyrb53(s,seed=0){let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0')}
async function sha(s){if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}return cyrb53(s)}
function mksalt(){const a=new Uint8Array(16);crypto.getRandomValues(a);return[...a].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function hpw(pw,s){return sha(s+'::'+pw)}

// keys
const KC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function rblk(n){const a=new Uint8Array(n);crypto.getRandomValues(a);let s='';for(let i=0;i<n;i++)s+=KC[a[i]%KC.length];return s}
async function mkkey(type){
  const pre=type==='premium'?'AXPRE':'AXIOM';
  const sec=type==='premium'?PSECRET:SECRET;
  const p1=rblk(5),p2=rblk(5);
  const sig=(await sha(sec+'|'+p1+p2)).slice(0,5).toUpperCase();
  return`${pre}-${p1}-${p2}-${sig}`;
}
async function chkkey(raw){
  const s=(raw||'').trim().toUpperCase();
  const m=/^(AXIOM|AXPRE)-([A-Z0-9]{5})-([A-Z0-9]{5})-([A-Z0-9]{5})$/.exec(s);
  if(!m)return{ok:false};
  const sec=m[1]==='AXPRE'?PSECRET:SECRET;
  const sig=(await sha(sec+'|'+m[2]+m[3])).slice(0,5).toUpperCase();
  return{ok:sig===m[4],prem:m[1]==='AXPRE'};
}

// ui
function showScr(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active')}
function msg(id,t,cls){const e=$(id);e.textContent=t;e.className='msg show '+(cls||'err')}
function clr(id){$(id).className='msg'}
function peek(id,b){const i=$(id);const p=i.type==='password';i.type=p?'text':'password';b.textContent=p?'hide':'show'}
function toast(t,type){const w=$('toasts');const el=document.createElement('div');el.className='toast '+(type||'ok');el.innerHTML='<span class="td"></span>'+t;w.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transition='.25s';setTimeout(()=>el.remove(),250)},2200)}
function switchTab(w){const l=w==='login';$('tab-login').classList.toggle('on',l);$('tab-reg').classList.toggle('on',!l);$('form-login').style.display=l?'block':'none';$('form-reg').style.display=l?'none':'block';clr('auth-msg')}

// nav
function enter(user){
  const users=load(DB.users,{});const rec=users[user];if(!rec)return;
  const isAdmin=rec.role==='admin';
  $('auth-wrap').style.display='none';
  $('bar').style.display='none';
  $('bg').style.display='none';
  $('app').classList.add('active');
  $('logout-btn').style.display='block';
  if(isAdmin){$('fab').classList.add('on');renderAll()}
}

function route(user){
  const users=load(DB.users,{});const rec=users[user];
  if(!rec){logout();return}
  if(rec.role==='admin'||rec.whitelisted){enter(user)}
  else{$('gate-name').textContent=user;clr('gate-msg');$('wl-key').value='';showScr('screen-gate')}
}

function logout(){
  try{localStorage.removeItem(DB.sess)}catch{}
  ['li-user','li-pass','rg-user','rg-pass','rg-pass2'].forEach(id=>{const el=$(id);if(el)el.value=''});
  switchTab('login');
  $('app').classList.remove('active');
  $('fab').classList.remove('on');
  $('logout-btn').style.display='none';
  $('admin').classList.remove('active');
  $('auth-wrap').style.display='flex';
  $('bar').style.display='flex';
  $('bg').style.display='block';
  showScr('screen-auth');
}

// auth
async function doReg(e){e.preventDefault();
  const u=val('rg-user').trim(),p=val('rg-pass'),p2=val('rg-pass2');
  if(u.length<3||u.length>20)return msg('auth-msg','Username must be 3-20 characters.');
  if(!/^[A-Za-z0-9_.-]+$/.test(u))return msg('auth-msg','Letters, numbers, _ . - only.');
  if(p.length<6)return msg('auth-msg','Password needs 6+ characters.');
  if(p!==p2)return msg('auth-msg','Passwords don\'t match.');
  const users=load(DB.users,{});
  if(Object.keys(users).some(k=>k.toLowerCase()===u.toLowerCase()))return msg('auth-msg','Taken.');
  const s=mksalt(),isA=u.toLowerCase()===ADMIN;
  users[u]={salt:s,hash:await hpw(p,s),role:isA?'admin':'member',whitelisted:isA,premium:false,created:Date.now()};
  save(DB.users,users);toast('Account created');
  save(DB.sess,u);route(u);
}

async function doLog(e){e.preventDefault();
  const u=val('li-user').trim(),p=val('li-pass');const users=load(DB.users,{});
  const key=Object.keys(users).find(k=>k.toLowerCase()===u.toLowerCase());
  if(!key)return msg('auth-msg','Not found.');
  const rec=users[key];
  if(await hpw(p,rec.salt)!==rec.hash)return msg('auth-msg','Wrong password.');
  if(key.toLowerCase()===ADMIN&&rec.role!=='admin'){rec.role='admin';rec.whitelisted=true;users[key]=rec;save(DB.users,users)}
  save(DB.sess,key);toast('Welcome back');route(key);
}

async function doWL(e){e.preventDefault();
  const raw=val('wl-key');
  const r=await chkkey(raw);
  if(!r.ok)return msg('gate-msg','Invalid key.');
  const key=raw.trim().toUpperCase(),used=load(DB.used,{}),me=load(DB.sess,null);
  if(used[key]&&used[key].toLowerCase()!==me.toLowerCase())return msg('gate-msg','Already claimed.');
  used[key]=me;save(DB.used,used);
  const users=load(DB.users,{});
  users[me].whitelisted=true;
  if(r.prem)users[me].premium=true;
  save(DB.users,users);
  toast(r.prem?'Premium unlocked':'Whitelisted');route(me);
}

// admin
function toggleAdmin(){$('admin').classList.toggle('active');renderAll()}

let lastK='',lastPK='';
async function genKey(type){
  const k=await mkkey(type);
  if(type==='premium'){
    lastPK=k;$('pk-out').textContent=k;
    const l=load(DB.pgen,[]);l.unshift(k);save(DB.pgen,l);renderPK();
  }else{
    lastK=k;$('k-out').textContent=k;
    const l=load(DB.gen,[]);l.unshift(k);save(DB.gen,l);renderK();
  }
  toast('Key generated');
}
function cpK(){if(!lastK)return toast('Generate first','err');navigator.clipboard.writeText(lastK).then(()=>toast('Copied')).catch(()=>toast('Failed','err'))}
function cpPK(){if(!lastPK)return toast('Generate first','err');navigator.clipboard.writeText(lastPK).then(()=>toast('Copied')).catch(()=>toast('Failed','err'))}

function renderKL(dbk,boxId,bc,bl){
  const list=load(dbk,[]),used=load(DB.used,{}),box=$(boxId);
  if(!list.length){box.innerHTML='<div class="krow"><span class="no">None yet.</span></div>';return}
  box.innerHTML=list.slice(0,20).map(k=>{
    const cl=used[k];
    const st=cl?`<span class="yes">● ${cl}</span>`:`<span class="no">○</span>`;
    return`<div class="krow"><code>${k}</code><span class="badge ${bc}">${bl}</span>${st}<button class="cpb" onclick="navigator.clipboard.writeText('${k}').then(()=>toast('Copied'))">copy</button></div>`;
  }).join('');
}
function renderK(){renderKL(DB.gen,'k-log','s','STD')}
function renderPK(){renderKL(DB.pgen,'pk-log','p','PREM')}

function renderUsers(){
  const users=load(DB.users,{}),box=$('u-list');
  const entries=Object.entries(users);
  if(!entries.length){box.innerHTML='<span class="no" style="font-size:9px">No accounts.</span>';return}
  box.innerHTML=entries.map(([n,r])=>{
    let tags='';
    if(r.role==='admin')tags+='<span class="rtag ow">OWNER</span>';
    else tags+='<span class="rtag mb">member</span>';
    if(r.premium)tags+='<span class="rtag pm">PREMIUM</span>';
    const w=r.whitelisted?'<span class="wly">✓</span>':'<span class="wln">✗</span>';
    return`<div class="urow"><div><b>${n}</b>${tags}</div>${w}</div>`;
  }).join('');
}

function renderAll(){renderK();renderPK();renderUsers()}

async function adminMk(e){e.preventDefault();
  const u=val('ac-user').trim(),p=val('ac-pass'),wl=$('ac-wl').checked,pm=$('ac-prem').checked;
  if(u.length<3||u.length>20)return msg('ac-msg','3-20 characters.');
  if(!/^[A-Za-z0-9_.-]+$/.test(u))return msg('ac-msg','Invalid characters.');
  if(p.length<6)return msg('ac-msg','Min 6 characters.');
  const users=load(DB.users,{});
  if(Object.keys(users).some(k=>k.toLowerCase()===u.toLowerCase()))return msg('ac-msg','Exists.');
  const s=mksalt(),isA=u.toLowerCase()===ADMIN;
  users[u]={salt:s,hash:await hpw(p,s),role:isA?'admin':'member',whitelisted:isA||wl,premium:pm,created:Date.now()};
  save(DB.users,users);msg('ac-msg','Created '+u,'ok');toast('Created: '+u);
  $('ac-user').value='';$('ac-pass').value='';renderUsers();
}

// clock
function tick(){const d=new Date();$('bclk').textContent=d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
tick();setInterval(tick,30000);

// boot
(function(){
  const s=load(DB.sess,null),users=load(DB.users,{});
  if(s&&users[s])route(s);else showScr('screen-auth');
})();

// expose to html onclick handlers
window.switchTab=switchTab;window.peek=peek;window.doLog=doLog;window.doReg=doReg;window.doWL=doWL;
window.logout=logout;window.toggleAdmin=toggleAdmin;window.genKey=genKey;window.cpK=cpK;window.cpPK=cpPK;
window.adminMk=adminMk;window.toast=toast;
