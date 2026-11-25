'use strict';
const KEY='lifeos_data',$=s=>document.querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,9);
const iso=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const today=()=>iso();
const addDays=(s,n)=>{const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return iso(d)};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
const fmt=(s,o)=>new Date(s+'T12:00').toLocaleDateString('fr-FR',o||{day:'numeric',month:'short'});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const COLORS=['#5eead4','#93c5fd','#c4b5fd','#fca5a5','#fcd34d','#86efac','#f9a8d4'];
const MAST=['Pas vu','Fragile','Moyen','Correct','Solide','Maîtrisé'],INT=[1,3,7,14,30];
const TABS=[['today','Aujourd’hui','◉'],['studies','Études','✎'],['habits','Habitudes','✓'],['settings','Réglages','⚙']];

/* ---------- Stockage ---------- */
const norm=o=>Object.assign({version:1,lastBackup:null,habits:[],logs:{},subjects:[],priorities:{}},o);
function load(){try{const r=JSON.parse(localStorage.getItem(KEY));if(r&&r.version)return norm(r)}catch(e){}
 return norm({subjects:[{id:uid(),name:'Mathématiques',color:COLORS[0],chapters:[],tests:[]},{id:uid(),name:'Physique-Chimie',color:COLORS[1],chapters:[],tests:[]}]})}
let D=load(),view='today',sid=null,hid=null,mo=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){toast('Sauvegarde impossible : espace plein')}}
function toast(m){const t=$('#toast');t.textContent=m;t.className='on';clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',2200)}

/* ---------- Habitudes ---------- */
const done=(h,d)=>(D.logs[d]||[]).includes(h);
function toggle(h,d){const l=D.logs[d]=D.logs[d]||[],i=l.indexOf(h);i<0?l.push(h):l.splice(i,1);if(!l.length)delete D.logs[d];save()}
function weekCount(h){const wd=(new Date().getDay()+6)%7;let c=0;for(let i=0;i<=wd;i++)if(done(h,addDays(today(),-i)))c++;return c}
function streak(h){let d=today(),n=0;if(!done(h,d))d=addDays(d,-1);while(done(h,d)){n++;d=addDays(d,-1)}return n}
function rate(id){const h=D.habits.find(x=>x.id===id),span=Math.min(30,daysBetween(h.createdAt,today())+1);let n=0;for(let i=0;i<span;i++)if(done(id,addDays(today(),-i)))n++;return Math.min(100,Math.round(n/span*100))}
const habRow=h=>{const d=done(h.id,today());return `<div class="card row hab ${d?'on':''}" style="--c:${h.color}"><button class="chk" data-act="tog" data-id="${h.id}" aria-label="Valider ${esc(h.name)}">${d?'✓':''}</button><div class="sp" data-act="hdetail" data-id="${h.id}"><b>${esc(h.name)}</b><div class="sub">${weekCount(h.id)}/${h.goal} cette semaine · série ${streak(h.id)} j</div></div></div>`};

/* ---------- Études ---------- */
const hasG=t=>t.grade!==''&&t.grade!=null&&!isNaN(t.grade);
function avg(s){let n=0,w=0;s.tests.filter(hasG).forEach(x=>{n+=x.grade/x.max*20*x.coef;w+=x.coef});return w?n/w:null}
const nextTest=s=>s.tests.filter(t=>t.date>=today()&&!hasG(t)).sort((a,b)=>a.date.localeCompare(b.date))[0];
function prio(s,c){const late=c.nextReview?Math.max(0,Math.min(10,daysBetween(c.nextReview,today()))):3,nt=nextTest(s),prox=nt?Math.max(0,14-daysBetween(today(),nt.date))/2:0;return (5-c.mastery)*2+late+prox}
const getS=()=>D.subjects.find(x=>x.id===sid),getC=id=>getS().chapters.find(c=>c.id===id);
function chart(s){const p=s.tests.filter(hasG).sort((a,b)=>a.date.localeCompare(b.date)).map(t=>t.grade/t.max*20);
 if(p.length<2)return '<div class="sub" style="margin-top:8px">Le graphique apparaît dès 2 notes saisies.</div>';
 const W=300,H=90,x=i=>8+i*(W-16)/(p.length-1),y=v=>H-8-v/20*(H-16);
 return `<svg viewBox="0 0 ${W} ${H}" class="chart"><line x1="0" x2="${W}" y1="${y(10)}" y2="${y(10)}" stroke="#222831" stroke-dasharray="3 4"/><polyline points="${p.map((v,i)=>x(i)+','+y(v)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${p.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.color}"/>`).join('')}</svg>`}
const ring=(p,s=64,t=7)=>{const r=(s-t)/2,c=2*Math.PI*r,m=s/2;return `<svg width="${s}" height="${s}"><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="#222831" stroke-width="${t}"/><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="#5eead4" stroke-width="${t}" stroke-linecap="round" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 ${m} ${m})"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="#E8ECF1" font-size="${s/4.4}" font-weight="600">${Math.round(p*100)}%</text></svg>`};
const empty=(t,s)=>`<div class="card empty"><b>${t}</b><div class="sub">${s}</div></div>`;

/* ---------- Vues ---------- */
function vToday(){
 const t=today(),hs=D.habits,dn=hs.filter(h=>done(h.id,t)).length,pr=D.priorities[t]||[],bk=D.lastBackup;
 const tests=D.subjects.flatMap(s=>s.tests.filter(x=>x.date>=t&&!hasG(x)).map(x=>({x,s}))).sort((a,b)=>a.x.date.localeCompare(b.x.date)).slice(0,3);
 const ch=D.subjects.flatMap(s=>s.chapters.filter(c=>c.mastery<5).map(c=>({c,s,p:prio(s,c)}))).sort((a,b)=>b.p-a.p).slice(0,3);
 return `<h1>Aujourd’hui</h1><div class="sub">${cap(fmt(t,{weekday:'long',day:'numeric',month:'long'}))}</div>
 ${(!bk||daysBetween(bk,t)>=7)&&(hs.length||D.subjects.some(s=>s.chapters.length))?`<div class="card" data-act="tab" data-id="settings"><b>Pense à sauvegarder</b><div class="sub">${bk?'Dernier export il y a '+daysBetween(bk,t)+' jours.':'Aucun export effectué.'}</div></div>`:''}
 <h2>Mes trois priorités</h2><div class="card">${[0,1,2].map(i=>`<div class="row pr"><span class="n">${i+1}</span><input class="plain" data-pr="${i}" value="${esc(pr[i]||'')}" placeholder="Priorité ${i+1}"></div>`).join('')}</div>
 <h2>Habitudes à valider</h2>${hs.length?`<div class="card row"><div>${ring(dn/hs.length)}</div><div class="sp"><b>${dn} sur ${hs.length}</b> validées<div class="sub">Un tap pour valider.</div></div></div>`+hs.map(habRow).join(''):empty('Aucune habitude','Crée la première dans l’onglet Habitudes.')}
 <h2>Prochains contrôles</h2>${tests.length?tests.map(({x,s})=>`<div class="card row" style="--c:${s.color}" data-act="sopen" data-id="${s.id}"><i class="dot"></i><div class="sp"><b>${esc(x.title)}</b><div class="sub">${esc(s.name)}</div></div><div class="avg">${daysBetween(t,x.date)===0?'Aujourd’hui':'J-'+daysBetween(t,x.date)}</div></div>`).join(''):empty('Aucun contrôle prévu','Ajoute-les dans une matière.')}
 <h2>À retravailler en priorité</h2>${ch.length?ch.map(({c,s})=>`<div class="card row" style="--c:${s.color}" data-act="sopen" data-id="${s.id}"><i class="dot"></i><div class="sp"><b>${esc(c.title)}</b><div class="sub">${esc(s.name)} · ${MAST[c.mastery]}</div></div></div>`).join(''):empty('Rien à signaler','Ajoute des chapitres pour voir tes priorités.')}
 <h2>Séances prévues</h2><div class="card sub">Le suivi du sport arrive dans la prochaine version.</div>`}

function vHabits(){
 if(hid){const h=D.habits.find(x=>x.id===hid);if(h)return vHabit(h);hid=null}
 return `<div class="row"><h1 class="sp">Habitudes</h1><button class="btn sm" data-act="hadd">+ Ajouter</button></div>
 <h2>Aujourd’hui</h2>${D.habits.length?D.habits.map(habRow).join(''):empty('Aucune habitude','Appuie sur « + Ajouter » pour créer la première.')}`}

function vHabit(h){
 const m=new Date();m.setDate(1);m.setMonth(m.getMonth()+mo);const y=m.getFullYear(),mm=m.getMonth(),n=new Date(y,mm+1,0).getDate();
 let cells='<i></i>'.repeat((m.getDay()+6)%7);
 for(let d=1;d<=n;d++){const s=iso(new Date(y,mm,d));cells+=`<button class="day ${done(h.id,s)?'on':''} ${s===today()?'td':''}" ${s>today()?'disabled':''} data-act="hday" data-id="${h.id}" data-d="${s}">${d}</button>`}
 const total=Object.values(D.logs).filter(l=>l.includes(h.id)).length;
 return `<div class="row"><button class="btn ghost sm" data-act="hback">‹ Retour</button><div class="sp"></div><button class="btn ghost sm" data-act="hedit" data-id="${h.id}">Modifier</button></div>
 <h1>${esc(h.name)}</h1><div class="sub">Objectif : ${h.goal} fois par semaine</div>
 <div class="grid3"><div class="card stat"><b>${weekCount(h.id)}/${h.goal}</b><span>Semaine</span></div><div class="card stat"><b>${streak(h.id)}</b><span>Série (jours)</span></div><div class="card stat"><b>${rate(h.id)}%</b><span>Régularité 30 j</span></div></div>
 <div class="card" style="--c:${h.color}"><div class="row"><button class="btn ghost sm" data-act="hmonth" data-d="-1">‹</button><b class="sp" style="text-align:center">${cap(m.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</b><button class="btn ghost sm" data-act="hmonth" data-d="1" ${mo>=0?'disabled':''}>›</button></div>
 <div class="cal">${'LMMJVSD'.split('').map(l=>`<span>${l}</span>`).join('')}${cells}</div></div>
 <div class="sub" style="text-align:center">${total} validation${total>1?'s':''} au total · tape un jour pour le modifier</div>`}

function vStudies(){
 if(sid){const s=getS();if(s)return vSubject(s);sid=null}
 const av=D.subjects.map(avg).filter(x=>x!=null),g=av.length?av.reduce((a,b)=>a+b)/av.length:null;
 return `<div class="row"><h1 class="sp">Études</h1><button class="btn sm" data-act="sadd">+ Matière</button></div>
 <div class="card"><div class="sub">Moyenne générale</div><div class="big">${g==null?'–':g.toFixed(2)}<small> /20</small></div></div>
 <h2>Matières</h2>${D.subjects.length?D.subjects.map(s=>{const a=avg(s),k=s.chapters.length?s.chapters.reduce((x,c)=>x+c.mastery,0)/s.chapters.length:0;
 return `<div class="card row" data-act="sopen" data-id="${s.id}" style="--c:${s.color}"><i class="dot"></i><div class="sp"><b>${esc(s.name)}</b><div class="sub">${s.chapters.length} chapitre${s.chapters.length>1?'s':''} · maîtrise ${k.toFixed(1)}/5</div><div class="bar"><i style="width:${k*20}%"></i></div></div><div class="avg">${a==null?'–':a.toFixed(1)}</div></div>`}).join(''):empty('Aucune matière','Appuie sur « + Matière ».')}`}

function vSubject(s){
 const a=avg(s),cs=[...s.chapters].sort((x,y)=>prio(s,y)-prio(s,x)),ts=[...s.tests].sort((x,y)=>y.date.localeCompare(x.date));
 return `<div class="row"><button class="btn ghost sm" data-act="sback">‹ Retour</button><div class="sp"></div><button class="btn ghost sm" data-act="sedit" data-id="${s.id}">Modifier</button></div>
 <h1 style="color:${s.color}">${esc(s.name)}</h1>
 <div class="card"><div class="sub">Moyenne</div><div class="big">${a==null?'–':a.toFixed(2)}<small> /20</small></div>${chart(s)}</div>
 <div class="row"><h2 class="sp">Chapitres <small>les plus urgents en haut</small></h2><button class="btn sm" data-act="cadd">+</button></div>
 ${cs.length?cs.map(c=>{const late=c.nextReview&&c.nextReview<=today();return `<div class="card" style="--c:${s.color}"><div class="row"><b class="sp" data-act="cedit" data-id="${c.id}">${esc(c.title)}</b><button class="btn sm ghost" data-act="crev" data-id="${c.id}">Révisé ✓</button></div>
 <div class="dots">${[1,2,3,4,5].map(i=>`<button class="${c.mastery>=i?'on':''}" data-act="mast" data-id="${c.id}" data-i="${i}" aria-label="Maîtrise ${i}"></button>`).join('')}<span class="sub">${MAST[c.mastery]}</span></div>
 <div class="sub">Dernière révision : ${c.lastReview?fmt(c.lastReview):'jamais'} · <span class="${late?'bad':''}">prochaine : ${c.nextReview?fmt(c.nextReview):'–'}</span></div></div>`}).join(''):empty('Aucun chapitre','Appuie sur + pour ajouter un chapitre.')}
 <div class="row"><h2 class="sp">Contrôles</h2><button class="btn sm" data-act="tadd">+</button></div>
 ${ts.length?ts.map(t=>`<div class="card row" data-act="tedit" data-id="${t.id}"><div class="sp"><b>${esc(t.title)}</b><div class="sub">${fmt(t.date,{day:'numeric',month:'short',year:'numeric'})} · coef ${t.coef}</div></div><div class="avg">${hasG(t)?t.grade+'/'+t.max:'à venir'}</div></div>`).join(''):empty('Aucun contrôle','Appuie sur + pour ajouter un contrôle ou une note.')}`}

function vSettings(){
 const b=D.lastBackup,d=b?daysBetween(b,today()):null;
 return `<h1>Réglages</h1><div class="sub">Tes données restent uniquement sur cet appareil.</div>
 <h2>Sauvegarde</h2><div class="card"><b>${b?'Dernier export : '+(d===0?'aujourd’hui':'il y a '+d+' j'):'Aucun export effectué'}</b>
 ${d===null||d>=7?'<div class="sub bad">Exporte ce fichier chaque semaine et garde-le dans Fichiers ou iCloud.</div>':''}
 <div class="row" style="margin-top:12px"><button class="btn sp" data-act="export">Exporter</button><button class="btn ghost sp" data-act="import">Importer</button></div>
 <input type="file" id="file" accept=".json,application/json" hidden></div>
 <h2>Zone sensible</h2><button class="btn danger" data-act="reset">Tout effacer</button>
 <p class="sub">LifeOS V1 · Sport, Lecture, Projets et Bilans arrivent dans les prochaines versions.</p>`}

function render(a){
 const app=$('#app');app.className=a?'in':'';
 app.innerHTML=({today:vToday,studies:vStudies,habits:vHabits,settings:vSettings})[view]();
 $('#tabs').innerHTML=TABS.map(([k,l,i])=>`<button data-act="tab" data-id="${k}" class="${view===k?'on':''}"><span>${i}</span>${l}</button>`).join('');
 if(a)scrollTo(0,0)}

/* ---------- Formulaire modal ---------- */
const closeM=()=>{$('#modal').innerHTML=''};
function ask(title,fields,cb,del){
 $('#modal').innerHTML=`<div class="ov" data-act="close"><form class="sheet"><h3>${title}</h3>${fields.map(f=>`<label>${f.l}${f.t==='select'?`<select name="${f.k}">${f.o.map(([v,t])=>`<option value="${v}" ${String(v)===String(f.v)?'selected':''}>${t}</option>`).join('')}</select>`:`<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v==null?'':f.v)}" ${f.r?'required':''} ${f.t==='number'?'step="any" inputmode="decimal"':''}>`}</label>`).join('')}
 <div class="row"><button type="button" class="btn ghost" data-act="close">Annuler</button>${del?'<button type="button" class="btn danger" id="mdel">Supprimer</button>':''}<button class="btn">Enregistrer</button></div></form></div>`;
 const f=$('#modal form');f.onclick=e=>e.stopPropagation();
 f.onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(f));closeM();cb(o);save();render()};
 if(del)$('#mdel').onclick=()=>{if(confirm('Supprimer définitivement ?')){closeM();del();save();render(1)}}}
const mastOpts=MAST.map((t,i)=>[i,i+' – '+t]);

/* ---------- Actions ---------- */
const ACT={
 close:(_,el,e)=>{if(e.target===el)closeM()},
 tab:id=>{view=id;sid=null;hid=null;render(1)},
 tog:id=>{toggle(id,today());render()},
 hdetail:id=>{view='habits';hid=id;mo=0;render(1)},
 hback:()=>{hid=null;render(1)},
 hmonth:(_,el)=>{mo+=+el.dataset.d;render()},
 hday:(id,el)=>{toggle(id,el.dataset.d);render()},
 hadd:()=>ask('Nouvelle habitude',[{k:'name',l:'Nom',r:1},{k:'goal',l:'Objectif par semaine',t:'select',v:5,o:[1,2,3,4,5,6,7].map(n=>[n,n+' fois'])}],o=>D.habits.push({id:uid(),name:o.name.trim(),goal:+o.goal,color:COLORS[D.habits.length%COLORS.length],createdAt:today()})),
 hedit:id=>{const h=D.habits.find(x=>x.id===id);ask('Modifier l’habitude',[{k:'name',l:'Nom',v:h.name,r:1},{k:'goal',l:'Objectif par semaine',t:'select',v:h.goal,o:[1,2,3,4,5,6,7].map(n=>[n,n+' fois'])}],o=>{h.name=o.name.trim();h.goal=+o.goal},()=>{D.habits=D.habits.filter(x=>x!==h);Object.keys(D.logs).forEach(k=>{D.logs[k]=D.logs[k].filter(x=>x!==id);if(!D.logs[k].length)delete D.logs[k]});hid=null})},
 sopen:id=>{view='studies';sid=id;render(1)},
 sback:()=>{sid=null;render(1)},
 sadd:()=>ask('Nouvelle matière',[{k:'name',l:'Nom',r:1}],o=>D.subjects.push({id:uid(),name:o.name.trim(),color:COLORS[D.subjects.length%COLORS.length],chapters:[],tests:[]})),
 sedit:()=>{const s=getS();ask('Modifier la matière',[{k:'name',l:'Nom',v:s.name,r:1}],o=>{s.name=o.name.trim()},()=>{D.subjects=D.subjects.filter(x=>x!==s);sid=null})},
 cadd:()=>ask('Nouveau chapitre',[{k:'title',l:'Titre',r:1},{k:'mastery',l:'Maîtrise',t:'select',v:0,o:mastOpts}],o=>getS().chapters.push({id:uid(),title:o.title.trim(),mastery:+o.mastery,lastReview:'',nextReview:today(),step:0})),
 cedit:id=>{const s=getS(),c=getC(id);ask('Modifier le chapitre',[{k:'title',l:'Titre',v:c.title,r:1},{k:'mastery',l:'Maîtrise',t:'select',v:c.mastery,o:mastOpts},{k:'last',l:'Dernière révision',t:'date',v:c.lastReview},{k:'next',l:'Prochaine révision',t:'date',v:c.nextReview}],o=>{c.title=o.title.trim();c.mastery=+o.mastery;c.lastReview=o.last;c.nextReview=o.next},()=>{s.chapters=s.chapters.filter(x=>x!==c)})},
 mast:(id,el)=>{const c=getC(id),i=+el.dataset.i;c.mastery=c.mastery===i?i-1:i;save();render()},
 crev:id=>{const c=getC(id),k=Math.min(c.step||0,4);c.lastReview=today();c.nextReview=addDays(today(),INT[k]);c.step=Math.min(k+1,4);save();render();toast('Prochaine révision : '+fmt(c.nextReview))},
 tadd:()=>ask('Nouveau contrôle',[{k:'title',l:'Titre',r:1},{k:'date',l:'Date',t:'date',v:today(),r:1},{k:'grade',l:'Note (laisser vide si à venir)',t:'number'},{k:'max',l:'Sur',t:'number',v:20,r:1},{k:'coef',l:'Coefficient',t:'number',v:1,r:1}],o=>getS().tests.push({id:uid(),title:o.title.trim(),date:o.date,grade:o.grade===''?'':+o.grade,max:+o.max||20,coef:+o.coef||1})),
 tedit:id=>{const s=getS(),t=s.tests.find(x=>x.id===id);ask('Modifier le contrôle',[{k:'title',l:'Titre',v:t.title,r:1},{k:'date',l:'Date',t:'date',v:t.date,r:1},{k:'grade',l:'Note (laisser vide si à venir)',t:'number',v:t.grade},{k:'max',l:'Sur',t:'number',v:t.max,r:1},{k:'coef',l:'Coefficient',t:'number',v:t.coef,r:1}],o=>{t.title=o.title.trim();t.date=o.date;t.grade=o.grade===''?'':+o.grade;t.max=+o.max||20;t.coef=+o.coef||1},()=>{s.tests=s.tests.filter(x=>x!==t)})},
 export:async()=>{
  const name='lifeos-'+today()+'.json',blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'}),file=new File([blob],name,{type:'application/json'});
  const ok=()=>{D.lastBackup=today();save();render();toast('Export effectué')};
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});return ok()}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);ok()},
 import:()=>$('#file').click(),
 reset:()=>{if(confirm('Effacer TOUTES les données ? Pense à exporter avant.')&&confirm('Dernière confirmation : tout sera supprimé.')){localStorage.removeItem(KEY);D=load();render(1);toast('Données effacées')}}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el&&ACT[el.dataset.act])ACT[el.dataset.act](el.dataset.id,el,e)});
document.addEventListener('input',e=>{const i=e.target.dataset.pr;if(i==null)return;const t=today(),p=D.priorities[t]=D.priorities[t]||['','',''];p[i]=e.target.value;save()});
document.addEventListener('change',e=>{if(e.target.id!=='file')return;const f=e.target.files[0];if(!f)return;
 f.text().then(t=>{try{const o=JSON.parse(t);if(!o.version||!Array.isArray(o.habits)||!Array.isArray(o.subjects))throw 0;
 if(!confirm('Remplacer toutes les données actuelles par ce fichier ?'))return;D=norm(o);save();toast('Données importées');render(1)}catch(_){toast('Fichier invalide')}})});
render(1);
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
