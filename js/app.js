
let PW=794,PH=1123;const $=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,9);
const TL={pen:{a:1,w:1},pencil:{a:.6,w:.7},marker:{a:.95,w:2.5},highlighter:{a:.32,w:7}};
const PAL=['#1a1a22','#ecebf1','#7c5cdb','#2563eb','#16a34a','#dc2626','#f59e0b'];
let db,noSave=false,nb=null,pi=0,tool='pen',color='#1a1a22',size=3,view={x:0,y:0,k:1},hist=[],rdo=[],live=null,eraseAt=null;
let ruler={x:200,y:300,a:0,len:520,on:false},rmode=null,touches=new Map(),pinch=null,saveT;
const cv=$('#cv'),ctx=cv.getContext('2d');
function toast(m,ms=4000){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),ms)}
async function init(){let mig=false;
 try{const d=await idb();db=await new Promise((ok,no)=>{const r=d.transaction('data').objectStore('data').get('db');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  if(!db){const raw=localStorage.getItem('aura');if(raw){db=JSON.parse(raw);mig=true}}}
 catch(e){noSave=true;toast('Saved data could not be read. Autosave is paused so nothing is overwritten. Use Restore with a backup.',9000)}
 db=db||{nbs:[],theme:'dark',paper:'light'};theme();home();stor();abl();autoBackup();purgeBin();tour();if(mig){save();toast('Your notes were moved to larger storage.',3500)}}
async function saveNow(){clearTimeout(saveT);if(noSave)return false;try{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction('data','readwrite');t.objectStore('data').put(db,'db');t.oncomplete=ok;t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)});return true}catch(e){toast('Could not save ('+(e&&e.message||'storage error')+'). Your notes are still open here. Tap Backup to export them now.',8000);return false}}
function save(){clearTimeout(saveT);saveT=setTimeout(saveNow,300)}
function stor(){if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(e=>{$('#su').textContent=`Storage used: ${(e.usage/1048576).toFixed(1)} MB of ${(e.quota/1048576).toFixed(0)} MB available`}).catch(()=>{})}
function theme(){document.documentElement.dataset.theme=db.theme}
const pg=()=>nb.pages[pi],pgObj=()=>({id:uid(),tpl:'ruled',strokes:[]});
/* HOME */
let curFolder=null;
const fname=id=>{const f=(db.folders||[]).find(x=>x.id==id);return f?f.name:''};
function nbCard(n){const c=document.createElement('div');c.className='card';c.innerHTML=`<div><b></b><br><small>${n.pages.length} page${n.pages.length>1?'s':''}${n.secs>=60?' · '+fmtT(n.secs):''}</small></div><div class="row" style="flex-wrap:wrap"><button data-a="pin">${n.pin?'Unpin':'Pin'}</button><button data-a="col">Colour</button><button data-a="mv">Move</button><button data-a="ren">Rename</button><button data-a="dup">Duplicate</button><button data-a="del">Delete</button></div>`;
 c.querySelector('b').textContent=(n.pin?'\u2605 ':'')+n.name;if(n.col)c.style.borderLeft='4px solid '+n.col;
 c.onclick=e=>{const a=e.target.dataset.a;if(!a)return open(n);
  if(a=='ren'){const v=prompt('Rename notebook',n.name);if(v&&v.trim()){n.name=v.trim();save();home()}}
  if(a=='pin'){n.pin=!n.pin;save();home();return}
  if(a=='col'){const C=['','#a78bfa','#34c38f','#f5b942','#e5576b','#4aa3ff'];n.col=C[(C.indexOf(n.col||'')+1)%C.length];save();home();return}
  if(a=='mv')moveNb(n);
  if(a=='dup'){const d=JSON.parse(JSON.stringify(n));d.id=uid();d.name+=' copy';d.pages.forEach(p=>p.id=uid());db.nbs.push(d);save();home()}
  if(a=='del'&&confirm(`Delete "${n.name}" and all its pages? It will wait in Recently deleted for 30 days.`)){(db.bin=db.bin||[]).push({id:uid(),at:Date.now(),kind:'nb',nb:n});db.nbs=db.nbs.filter(x=>x!==n);save();home();toast('Moved to Recently deleted. You can restore it for 30 days.',4000)}};
 return c}
function folderCard(f){const k=db.nbs.filter(n=>n.folder==f.id).length,c=document.createElement('div');c.className='card';c.style.borderLeft='4px solid var(--ac)';
 c.innerHTML=`<div><b></b><br><small>Folder · ${k} notebook${k==1?'':'s'}</small></div><div class="row"><button data-a="ren">Rename</button><button data-a="del">Delete</button></div>`;c.querySelector('b').textContent=f.name;
 c.onclick=e=>{const a=e.target.dataset.a;if(!a){curFolder=f.id;home();return}
  if(a=='ren'){const v=prompt('Rename folder',f.name);if(v&&v.trim()){f.name=v.trim();save();home()}}
  if(a=='del'&&confirm(`Delete the folder "${f.name}"? Its ${k} notebook${k==1?'':'s'} will stay in your library, outside any folder.`)){db.nbs.forEach(n=>{if(n.folder==f.id)delete n.folder});db.folders=db.folders.filter(x=>x!==f);save();home()}};
 return c}
function moveNb(n){const{o,c}=overlay(),t=document.createElement('b');t.textContent='Move "'+n.name+'" to';c.appendChild(t);
 const mk=(label,f,pri)=>{const b=document.createElement('button');b.textContent=label;if(pri)b.className='pri';b.onclick=()=>{f();save();o.remove();home()};c.appendChild(b)};
 (db.folders||[]).forEach(f=>mk(f.name+(n.folder==f.id?'  (current)':''),()=>{n.folder=f.id},n.folder==f.id));
 mk('No folder',()=>{delete n.folder});
 mk('+ New folder...',()=>{const v=prompt('Folder name','');if(v&&v.trim()){const f={id:uid(),name:v.trim()};(db.folders=db.folders||[]).push(f);n.folder=f.id}});
 const x=document.createElement('button');x.textContent='Cancel';x.onclick=()=>o.remove();c.appendChild(x)}
function home(){const q0=$('#q').value.trim();if(q0){$('#home').classList.add('show');$('#ed').classList.remove('show');return search(q0.toLowerCase())}
 $('#home').classList.add('show');$('#ed').classList.remove('show');const h=new Date().getHours();$('#greet').textContent=h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';
 const F=db.folders||[];if(curFolder&&!F.some(f=>f.id==curFolder))curFolder=null;
 const l=$('#list');l.innerHTML='';
 const inF=n=>curFolder?n.folder==curFolder:!n.folder||!F.some(f=>f.id==n.folder);
 const all=[...db.nbs].filter(inF).sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||(b.at||0)-(a.at||0));
 const lab=t=>{const d=document.createElement('div');d.className='lab';d.textContent=t;return d};
 if(curFolder){const bar=document.createElement('div'),bk=document.createElement('button'),t=document.createElement('b');bar.style.cssText='display:flex;gap:12px;align-items:center;margin:14px 0 4px';bk.textContent='\u2190 All notebooks';bk.onclick=()=>{curFolder=null;home()};t.style.fontSize='18px';t.textContent='Folder: '+fname(curFolder);bar.append(bk,t);l.appendChild(bar)}
 else if(F.length){l.appendChild(lab('FOLDERS'));const fg=document.createElement('div');fg.className='grid';F.forEach(f=>fg.appendChild(folderCard(f)));l.appendChild(fg)}
 if(!all.length){if(curFolder)l.insertAdjacentHTML('beforeend','<div class="empty"><b>This folder is empty</b>Tap + New notebook to create one here, or use Move on any notebook to bring it in.</div>');else if(!F.length)l.innerHTML='<div class="empty"><b>No notebooks yet</b>Your workspace is ready. Create your first notebook, or make a folder first.</div>';return}
 const g=document.createElement('div'),g2=document.createElement('div');g.className=g2.className='grid';all.forEach(n=>(n.pages.some(p=>p.bg)?g2:g).appendChild(nbCard(n)));
 if(!curFolder&&F.length&&g.children.length)l.appendChild(lab('NOTEBOOKS'));if(g.children.length)l.appendChild(g);if(g2.children.length){l.appendChild(lab('DOCUMENTS'));l.appendChild(g2)}}
$('#newNb').onclick=()=>{const v=prompt('Notebook name','New notebook');if(!v)return;const n={id:uid(),...(curFolder?{folder:curFolder}:{}),name:v.trim()||'Untitled',pages:[pgObj()]};db.nbs.unshift(n);save();open(n)};
$('#thm').onclick=()=>{db.theme=db.theme=='dark'?'light':'dark';theme();save()};
$('#rs').onclick=()=>$('#rsf').click();
function rawDl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
/* EDITOR */
const GAP=24,SH=['line','rect','ellipse','triangle'];
let z=1,ox=0,sy=0,S=1,lock=false,wt,sel=null,gest=null,loop=null;
const Sc=()=>Math.max(cv.clientWidth,1)/PW*z,pTop=i=>12+i*(PH+GAP),totH=()=>pTop(nb.pages.length)-GAP+80,maxY=()=>Math.max(0,totH()*Sc()-cv.clientHeight);
function clampV(soft){S=Sc();const pw=PW*S,cw=cv.clientWidth;ox=pw<=cw+1?(cw-pw)/2:Math.max(cw-pw,Math.min(0,ox));sy=Math.max(0,Math.min(maxY()+(soft?160:0),sy))}
const pageAt=y=>Math.max(0,Math.min(nb.pages.length-1,Math.floor((y-12+GAP/2)/(PH+GAP)))),curPg=()=>pageAt((sy+cv.clientHeight/2)/S);
const W=(e,b=cv.getBoundingClientRect())=>[(e.clientX-b.left-ox)/S,(e.clientY-b.top+sy)/S];
function open(n){n.at=Date.now();esz=db.esz||4;fl=null;pxl();rrec();lab();applyHide();nb=n;PW=n.size?n.size.w:794;PH=n.size?n.size.h:1123;$('#home').classList.remove('show');$('#ed').classList.add('show');$('#nm').textContent=n.name;INS.forEach(n=>n.on=false);['#rl','#pr','#sq','#cmp'].forEach(q=>$(q).classList.remove('on'));z=1;sy=0;hist=[];rdo=[];$('#pp').textContent='Paper: '+db.paper;setTool('pen');sizeCv()}
function sizeCv(){const d=devicePixelRatio||1;cv.width=cv.clientWidth*d;cv.height=cv.clientHeight*d;clampV();draw()}
function setTool(t){prevT=tool;tool=t;if(t!='lasso')sel=null;if(t!='table')tsel=null;if(t!='image')isel=null;selUI();szSync();document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==t));$('#cols').parentElement.style.opacity=(t=='eraser'||t=='area')?.4:1;draw()}
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('#rl').onclick=()=>{ruler.on=!ruler.on;$('#rl').classList.toggle('on',ruler.on);if(ruler.on){ruler.len=Math.min(520,PW-80);ruler.x=(PW-ruler.len)/2;ruler.y=(sy+cv.clientHeight/2)/S;ruler.a=0}draw()};
PAL.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c==color?' on':'');b.style.background=c;b.setAttribute('aria-label','Colour '+c);b.onclick=()=>pick(c);$('#cols').appendChild(b)});
const rgb=s=>{const m=s.match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):s};
function pick(c){color=c;rec(c);document.querySelectorAll('.sw').forEach(s=>s.classList.toggle('on',rgb(s.style.background)==c));if(tool=='eraser'||tool=='area')setTool('pen')}
$('#cc').oninput=e=>pick(e.target.value);$('#sz').oninput=e=>{const v=+e.target.value;if(tool=='eraser'||tool=='area'){esz=v;db.esz=v;save()}else size=v};
$('#nm').onclick=()=>{const v=prompt('Rename notebook',nb.name);if(v&&v.trim()){nb.name=v.trim();$('#nm').textContent=nb.name;save()}};
$('#back').onclick=()=>{if(mr)mr.stop();save();home();stor()};$('#un').onclick=undo;$('#re').onclick=redo;$('#fit').onclick=()=>{z=1;draw()};
const st=i=>({i,s:nb.pages[i].strokes.slice(),t:(nb.pages[i].texts||[]).map(x=>({...x})),b:(nb.pages[i].tables||[]).map(x=>JSON.parse(JSON.stringify(x))),m:(nb.pages[i].images||[]).map(x=>({...x})),k:(nb.pages[i].masks||[]).map(x=>({...x}))}),rs=h=>{const g=nb.pages[h.i];g.masks=h.k;g.strokes=h.s;g.texts=h.t;g.tables=h.b;g.images=h.m};
function snap(i){hist.push(st(i));if(hist.length>200)hist.shift();rdo=[]}
function undo(){sel=tsel=isel=null;selUI();const h=hist.pop();if(!h)return;rdo.push(st(h.i));rs(h);save();draw()}
function redo(){sel=tsel=isel=null;selUI();const h=rdo.pop();if(!h)return;hist.push(st(h.i));rs(h);save();draw()}
addEventListener('keydown',e=>{if(!$('#ed').classList.contains('show'))return;if((e.ctrlKey||e.metaKey)&&e.key=='z'){e.preventDefault();e.shiftKey?redo():undo()}});
$('#dp').onclick=()=>{if(nb.pages.length<2)return toast('A notebook needs at least one page.');if(!confirm('Delete this page and its handwriting?'))return;const ix_=curPg();(db.bin=db.bin||[]).push({id:uid(),at:Date.now(),kind:'page',nbId:nb.id,name:nb.name,page:nb.pages[ix_]});nb.pages.splice(ix_,1);sel=tsel=isel=null;selUI();hist=[];rdo=[];save();draw()};
$('#tp').onchange=e=>{nb.pages[curPg()].tpl=e.target.value;save();draw()};
$('#pp').onclick=()=>{db.paper=db.paper=='light'?'dark':'light';$('#pp').textContent='Paper: '+db.paper;save();draw()};
$('#ex').onclick=()=>{const c=document.createElement('canvas');c.width=PW*2;c.height=PH*2;const x=c.getContext('2d');x.scale(2,2);drawPage(x,nb.pages[curPg()]);c.toBlob(b=>{dl(b,nb.name+'-page'+(curPg()+1)+'.png')})};
function addPage(){const l=nb.pages[nb.pages.length-1];nb.pages.push({...pgObj(),tpl:l.tpl});hist=[];rdo=[];save();clampV();sy=Math.min(maxY(),(pTop(nb.pages.length-1)-12)*S);draw();toast('Page added.',1500)}
function settle(){const m=maxY();if(sy>m+80)addPage();else if(sy>m){sy=m;draw()}}
/* RENDER */
function drawPage(c,pgo,o){const dk=db.paper=='dark';c.fillStyle=dk?'#1b1b21':'#fbfaf7';c.fillRect(0,0,PW,PH);if(pgo.bg&&!(o&&o.nobg)){const b=(o&&o.bgc)||bgGet(pgo.bg.id,pgo.bg.n);if(b){const k=Math.min(PW/b.width,PH/b.height),w=b.width*k,h=b.height*k;c.drawImage(b,(PW-w)/2,(PH-h)/2,w,h)}}
 c.strokeStyle=dk?'#34343f':'#d3d8e4';c.fillStyle=c.strokeStyle;c.lineWidth=1;const t=pgo.tpl;c.beginPath();
 if(t=='ruled')for(let y=96;y<PH-30;y+=32){c.moveTo(0,y);c.lineTo(PW,y)}
 if(t=='grid'){for(let y=24;y<PH;y+=24){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=24;x<PW;x+=24){c.moveTo(x,0);c.lineTo(x,PH)}}
 c.stroke();
 if(t=='dot')for(let y=24;y<PH;y+=24)for(let x=24;x<PW;x+=24)c.fillRect(x-1,y-1,2,2);
 if(t=='graph'){c.beginPath();for(let y=12;y<PH;y+=12){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=12;x<PW;x+=12){c.moveTo(x,0);c.lineTo(x,PH)}c.lineWidth=.5;c.stroke();c.beginPath();for(let y=60;y<PH;y+=60){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=60;x<PW;x+=60){c.moveTo(x,0);c.lineTo(x,PH)}c.lineWidth=1.2;c.stroke()}
 if(t=='math'){c.beginPath();for(let y=24;y<PH;y+=24){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=24;x<PW;x+=24){c.moveTo(x,0);c.lineTo(x,PH)}c.lineWidth=.6;c.stroke();c.strokeStyle=dk?'#9a98ad':'#55536a';c.beginPath();c.moveTo(0,552);c.lineTo(PW,552);c.moveTo(396,0);c.lineTo(396,PH);for(let k=-16;k<=16;k++){c.moveTo(396+k*24,546);c.lineTo(396+k*24,558)}for(let k=-23;k<=23;k++){c.moveTo(390,552+k*24);c.lineTo(402,552+k*24)}c.lineWidth=1.6;c.stroke()}
 if(t=='cornell'){c.beginPath();c.moveTo(200,80);c.lineTo(200,PH-160);c.moveTo(0,80);c.lineTo(PW,80);c.moveTo(0,PH-160);c.lineTo(PW,PH-160);c.lineWidth=1.5;c.stroke()}
 if(t=='check'){c.lineWidth=1.2;for(let y=80;y<PH-30;y+=44){c.strokeRect(40,y,18,18);c.beginPath();c.moveTo(76,y+22);c.lineTo(PW-40,y+22);c.stroke()}}
 drawObjs(c,pgo);(rp&&rp.pg===pgo?replayList(pgo):pgo.strokes).forEach(s=>stroke(c,s));c.save();c.textBaseline='top';(pgo.texts||[]).forEach(t=>{c.font=t.sz+'px system-ui';c.fillStyle=t.c;t.txt.split('\n').forEach((l,k)=>c.fillText(l,t.x,t.y+k*t.sz*1.3))});c.restore();
 (pgo.masks||[]).forEach(m=>{c.save();if(m.on){c.globalAlpha=.97;c.fillStyle='#6d4fd0';c.fillRect(m.x,m.y,m.w,m.h)}else{c.strokeStyle='#a78bfa';c.setLineDash([6,4]);c.lineWidth=1.5;c.strokeRect(m.x,m.y,m.w,m.h)}c.restore()});
 (pgo.links||[]).forEach(l=>{c.save();c.fillStyle='#a78bfa';c.beginPath();c.rect(l.x-22,l.y-14,44,28);c.fill();c.fillStyle='#12101a';c.font='600 14px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('\u2192 '+(nb.pages.findIndex(q=>q.id==l.pid)+1||'?'),l.x,l.y);c.restore()});
 if(live&&live.o===pgo)stroke(c,live)}
function stroke(c,s){const t=TL[s.t],p=s.p;c.save();c.globalAlpha=t.a*(s.op==null?1:s.op);c.strokeStyle=c.fillStyle=s.c;c.lineCap=c.lineJoin='round';const w=s.w*t.w;
 if(p.length<2){c.beginPath();c.arc(p[0][0],p[0][1],w/2,0,7);c.fill()}
 else if(s.t=='pencil'&&p.some(q=>q[3]>0)){const a0=c.globalAlpha;for(let i=1;i<p.length;i++){const tt=p[i][3]||0;c.globalAlpha=a0*(1-.4*tt);c.lineWidth=w*(.6+(p[i][2]||.5)*.8)*(1+tt*2.2);c.beginPath();c.moveTo(p[i-1][0],p[i-1][1]);c.lineTo(p[i][0],p[i][1]);c.stroke()}}
 else if(s.t=='pen'){for(let i=1;i<p.length;i++){c.lineWidth=w*(.45+p[i][2]*1.1);c.beginPath();c.moveTo(p[i-1][0],p[i-1][1]);c.lineTo(p[i][0],p[i][1]);c.stroke()}}
 else{c.lineWidth=w;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length-1;i++){const m=[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2];c.quadraticCurveTo(p[i][0],p[i][1],m[0],m[1])}c.lineTo(p[p.length-1][0],p[p.length-1][1]);c.stroke()}
 c.restore()}
let rq=0;function draw(){cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{if(!nb)return;clampV(true);const d=devicePixelRatio||1,ch=cv.clientHeight;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 nb.pages.forEach((p,i)=>{const t=pTop(i)*S-sy;if(t>ch||t+PH*S<0)return;ctx.setTransform(d*S,0,0,d*S,d*ox,d*t);ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=20;ctx.fillStyle='#000';ctx.fillRect(0,0,PW,PH);ctx.restore();ctx.save();ctx.beginPath();ctx.rect(0,0,PW,PH);ctx.clip();drawPage(ctx,p);ctx.restore()});
 ctx.setTransform(d*S,0,0,d*S,d*ox,-d*sy);INS.forEach(n=>{if(n.on)n.d()});drawSel();drawOS();
 if(eraseAt){ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5/S;ctx.beginPath();ctx.arc(eraseAt[0],eraseAt[1],er(),0,7);ctx.stroke()}
 if(hov&&!live&&!eraseAt&&tool!='table'&&tool!='image'){ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.2/S;ctx.beginPath();ctx.arc(hov[0],hov[1],(tool=='eraser'||tool=='area')?er():Math.max(2.5,size*((TL[tool]||{w:1}).w)/2),0,7);ctx.stroke()}
 if(live&&live.p.length>1&&(live.sn||live.sh=='line')){const a=live.p[0],b=live.p[live.p.length-1],o=pTop(live.i),Ln=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=(Math.atan2(-(b[1]-a[1]),b[0]-a[0])*180/Math.PI+360)%360;ctx.save();ctx.fillStyle='#a78bfa';ctx.font=(13/S)+'px system-ui';ctx.fillText((live.sn&&live.sn.arc?'r = '+(live.sn.R/37.8).toFixed(1)+' cm':(Ln/37.8).toFixed(1)+' cm   '+Math.round(ang)+'\u00b0'),b[0]+10/S,b[1]+o-10/S);ctx.restore()}
 if(cvr){ctx.save();ctx.strokeStyle='#a78bfa';ctx.setLineDash([6/S,4/S]);ctx.lineWidth=1.5/S;ctx.strokeRect(Math.min(cvr.x0,cvr.x1),Math.min(cvr.y0,cvr.y1)+pTop(cvr.i),Math.abs(cvr.x1-cvr.x0),Math.abs(cvr.y1-cvr.y0));ctx.restore()}
 ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--t2');ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(sy-maxY()>80?'Release to add a page':'Keep scrolling to add a page',cv.clientWidth/2,(pTop(nb.pages.length)-GAP+40)*S-sy);ctx.textAlign='left';
 const c=curPg();$('#pn').textContent=`Page ${c+1} of ${nb.pages.length}`;$('#bm').classList.toggle('on',!!nb.pages[c].bm);if($('#tp').value!=nb.pages[c].tpl)$('#tp').value=nb.pages[c].tpl;
 $('#rinfo').textContent=ruler.on?`Ruler ${Math.round(((ruler.a*180/Math.PI)%360+360)%360)}°`:''})}
function drawRuler(){const r=ruler;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.globalAlpha=.88;ctx.fillStyle='#2a2833';ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(0,0,r.len,56);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#cfcbe0';ctx.fillStyle='#cfcbe0';ctx.font='10px system-ui';ctx.beginPath();
 for(let i=0,u=0;u<=r.len;i++,u=i*3.78){const cm=i%10==0,h=cm?16:i%5==0?11:6;ctx.moveTo(u,0);ctx.lineTo(u,h);if(cm)ctx.fillText(i/10,u+2,28)}ctx.stroke();
 ctx.fillStyle='#a78bfa';ctx.beginPath();ctx.arc(r.len-18,28,9,0,7);ctx.fill();ctx.restore()}
/* INPUT */
const loc=(p,n=ruler)=>{const dx=p[0]-n.x,dy=p[1]-n.y,c=Math.cos(n.a),s=Math.sin(n.a);return[dx*c+dy*s,-dx*s+dy*c]};
const proj=(p,n=ruler)=>{if(n.arc){const dx=p[0]-n.x,dy=p[1]-n.y,d=Math.hypot(dx,dy)||1;return[n.x+dx/d*n.R,n.y+dy/d*n.R]}const[u]=loc(p,n);return[n.x+u*Math.cos(n.a),n.y+u*Math.sin(n.a)]};
const nearEdge=p=>{let b=null,bd=28/S+6;INS.forEach(n=>{if(n.on)edges(n).forEach(e=>{const d=Math.abs(loc(p,e)[1]);if(d<bd){bd=d;b=e}})});if(comp.on){const d=Math.abs(Math.hypot(p[0]-comp.x,p[1]-comp.y)-comp.R);if(d<bd)b={arc:1,x:comp.x,y:comp.y,R:comp.R}}return b};
const pr=e=>e.pointerType=='pen'&&e.pressure>0?e.pressure:.5;
const fing=()=>{const a=[...touches.values()];return{d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])||1,ang:Math.atan2(a[1][1]-a[0][1],a[1][0]-a[0][0]),cx:(a[0][0]+a[1][0])/2,cy:(a[0][1]+a[1][1])/2}};
const sp=(t,a,b)=>{let r;const[x,y]=a,[u,v]=b;if(t=='line')r=[a,b];else if(t=='rect')r=[a,[u,y],b,[x,v],a];else if(t=='triangle')r=[[(x+u)/2,y],b,[x,v],[(x+u)/2,y]];else{r=[];for(let k=0;k<=48;k++){const g=k/48*6.2832;r.push([(x+u)/2+Math.cos(g)*(u-x)/2,(y+v)/2+Math.sin(g)*(v-y)/2])}}return r.map(q=>[q[0],q[1],.5])};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);
 if(e.pointerType=='touch'){fl=null;if(PX()&&Date.now()-penT<700)return;touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){scrolling=false;vx=vy=0;lastT=performance.now();rmode=null;const p=W(e),n=ilock?null:[...INS].reverse().find(n=>n.on&&hitIns(n,p));if(n)rmode=(n===comp&&Math.hypot(p[0]-comp.x-Math.cos(comp.a)*comp.R,p[1]-comp.y-Math.sin(comp.a)*comp.R)<48)?{t:'tip',id:e.pointerId,n}:{t:'mv',id:e.pointerId,n,o:[p[0]-n.x,p[1]-n.y]}}
  else if(touches.size==2){const f=fing();if(rmode)rmode={t:'rot',n:rmode.n,a0:f.ang,ra:rmode.n.a};else{const b=cv.getBoundingClientRect();pinch={...f,z,w:[(f.cx-b.left-ox)/S,(f.cy-b.top+sy)/S]}}}
  return}
 penT=Date.now();hov=null;fl=null;if(PX()&&isBtn(e)&&tool!='eraser'&&tool!='area'){penPrev=tool;tool='eraser'}
 const p=W(e),i=pageAt(p[1]);
 if(tool=='cover'){coverDown(p,i);return}
 if(tool=='link'){linkDown(p,i);return}
 if(tool=='table'){tableDown(p,i);return}
 if(tool=='image'){imgDown(p,i);return}
 if(tool=='text'){textDown(p,i);return}
 if(tool=='lasso'){if(sel){const h=selHit(p);if(h){startG(h,p);return}}sel=null;selUI();loop={i,p:[[p[0],p[1]]]};draw();return}
 if(tool=='eraser'||tool=='area'){snap(i);eraseAt=p;(tool=='area'?eraseArea:erase)(p);return}
 const sn=nearEdge(p),q=sn?proj(p,sn):p,l=[q[0],q[1]-pTop(i),pr(e),tl(e)],sh=SH.includes(tool);
 live={t:sh?'pen':tool,c:color,w:size,op:opac,p:[l],sn,i,o:nb.pages[i],sh:sh?tool:0,a:l};draw()});
cv.addEventListener('pointermove',e=>{
 if(e.pointerType=='touch'){const o=touches.get(e.pointerId);if(!o)return;const dx=e.clientX-o[0],dy=e.clientY-o[1];touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){if(rmode&&rmode.t=='tip'&&rmode.id==e.pointerId){const p=W(e),n=rmode.n;n.R=Math.max(30,Math.hypot(p[0]-n.x,p[1]-n.y));n.a=Math.atan2(p[1]-n.y,p[0]-n.x)}else if(rmode&&rmode.t=='mv'&&rmode.id==e.pointerId){const p=W(e);rmode.n.x=p[0]-rmode.o[0];rmode.n.y=p[1]-rmode.o[1]}else if(!lock&&!rmode){sy-=dy;if(z>1)ox+=dx;const n=performance.now(),dt=Math.max(1,n-lastT);vy=.6*vy+.4*(-dy/dt);vx=z>1?.6*vx+.4*(dx/dt):0;lastT=n;scrolling=true}}
  else if(touches.size==2){const f=fing();
   if(rmode&&rmode.t=='rot'){const n=rmode.n,c=cen(n);n.a=rmode.ra+f.ang-rmode.a0;const c2=cen(n);n.x+=c[0]-c2[0];n.y+=c[1]-c2[1]}
   else if(pinch){const b=cv.getBoundingClientRect();z=Math.max(1,Math.min(2.5,pinch.z*f.d/pinch.d));S=Sc();sy=pinch.w[1]*S-(f.cy-b.top);ox=f.cx-b.left-pinch.w[0]*S}}
  draw();return}
 if(e.pointerType!='touch')penBtn=(e.buttons&34)?1:0;penT=e.pointerType=='pen'?Date.now():penT;
 if(PX()&&live&&isBtn(e)&&tool!='eraser'&&tool!='area'&&!live.sh){live=null;penPrev=tool;tool='eraser';const p0=W(e);snap(pageAt(p0[1]));eraseAt=p0;erase(p0);return}
 if(PX()&&e.pointerType=='pen'&&!e.buttons&&!live&&!gest&&!loop&&!tb&&!ig&&!tg){hov=W(e);draw();return}
 const p=W(e);
 if(cvr){cvr.x1=p[0];cvr.y1=p[1]-pTop(cvr.i);draw();return}
 if(tb){tbMove(p);return}
 if(ig){igMove(p);return}
 if(tg){textMove(p);return}
 if(gest){applyG(p);draw();return}
 if(loop){loop.p.push([p[0],p[1]]);draw();return}
 if((tool=='eraser'||tool=='area')&&eraseAt){eraseAt=p;(tool=='area'?eraseArea:erase)(p);return}
 if(live&&live.done)return;
 if(live){const T=live.i;clearTimeout(snapT);if(PX()&&!live.sh&&['pen','pencil','marker','highlighter'].includes(live.t))snapT=setTimeout(()=>{if(live&&!live.sh&&!live.done)snapShape()},650);if(live.sh)live.p=sp(live.sh,live.a,[p[0],p[1]-pTop(T)]);else(e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(ev=>{const w=W(ev),q=live.sn?proj(w,live.sn):w;live.p.push([q[0],q[1]-pTop(T),pr(ev),tl(ev)])});draw()}});
function end(e){
 if(e.pointerType=='touch'){touches.delete(e.pointerId);if(touches.size==1){lock=true;pinch=null;if(rmode&&rmode.t=='rot')rmode=null}if(!touches.size){lock=false;rmode=null;pinch=null;const over=sy>maxY()+1,sc=scrolling;scrolling=false;settle();if(sc&&!over)startFling()}return}
 penBtn=(e.buttons&34)?1:0;if(penPrev){tool=penPrev;penPrev=null}
 if(cvr){coverEnd();return}
 if(tb){tbEnd();return}
 if(ig){igEnd();return}
 if(tg){textEnd();return}
 if(gest){gest=null;save();draw();return}
 if(loop){endLoop();return}
 if(eraseAt){eraseAt=null;save();draw()}
 clearTimeout(snapT);if(live){const s=live;live=null;snap(s.i);nb.pages[s.i].strokes.push({t:s.t,c:s.c,w:s.w,op:s.op,p:s.p});save();draw()}}
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
cv.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey){const b=cv.getBoundingClientRect(),wx=(e.clientX-b.left-ox)/S,wy=(e.clientY-b.top+sy)/S;z=Math.max(1,Math.min(2.5,z*(e.deltaY<0?1.1:.91)));S=Sc();sy=wy*S-(e.clientY-b.top);ox=e.clientX-b.left-wx*S}else{sy+=e.deltaY;ox-=e.deltaX}draw();clearTimeout(wt);wt=setTimeout(settle,220)},{passive:false});
function erase(p){const i=pageAt(p[1]),q=[p[0],p[1]-pTop(i)],pg_=nb.pages[i];pg_.strokes=pg_.strokes.filter(s=>!hit(s,q,er()+s.w/2));pg_.masks=(pg_.masks||[]).filter(m=>!(q[0]>=m.x&&q[0]<=m.x+m.w&&q[1]>=m.y&&q[1]<=m.y+m.h));pg_.links=(pg_.links||[]).filter(l=>Math.abs(q[0]-l.x)>22||Math.abs(q[1]-l.y)>14);draw()}
function hit(s,p,r){const q=s.p;if(q.length==1)return Math.hypot(q[0][0]-p[0],q[0][1]-p[1])<r;
 for(let i=1;i<q.length;i++){const[x1,y1]=q[i-1],[x2,y2]=q[i],dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-x1)*dx+(p[1]-y1)*dy)/l));if(Math.hypot(x1+t*dx-p[0],y1+t*dy-p[1])<r)return true}return false}
addEventListener('resize',()=>{if($('#ed').classList.contains('show')){sizeCv();rfSize()}});

/* LASSO */
function selUI(){$('#selb').style.display=sel?'flex':'none';$('#tbb').style.display=tsel?'flex':'none';$('#imb').style.display=isel?'flex':'none'}
function selBox(){let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;sel.l.forEach(s=>s.p.forEach(q=>{x1=Math.min(x1,q[0]);x2=Math.max(x2,q[0]);y1=Math.min(y1,q[1]);y2=Math.max(y2,q[1])}));const o=pTop(sel.i),m=6;return{x1:x1-m,x2:x2+m,y1:y1+o-m,y2:y2+o+m}}
function selHit(p){const b=selBox(),r=26/S,hx=(b.x1+b.x2)/2,hy=b.y1-30/S;if(Math.hypot(p[0]-hx,p[1]-hy)<r)return'r';if(Math.hypot(p[0]-b.x2,p[1]-b.y2)<r)return's';return p[0]>b.x1&&p[0]<b.x2&&p[1]>b.y1&&p[1]<b.y2?'m':null}
function cloneSel(){const g=nb.pages[sel.i],c=sel.l.map(s=>({...s,p:s.p.map(q=>q.slice())}));g.strokes=g.strokes.map(s=>{const k=sel.l.indexOf(s);return k<0?s:c[k]});sel.l=c}
function startG(h,p){snap(sel.i);cloneSel();const b=selBox(),o=pTop(sel.i);gest={h,s:[p[0],p[1]-o],c:[(b.x1+b.x2)/2,(b.y1+b.y2)/2-o],o:sel.l.map(s=>({p:s.p.map(q=>q.slice()),w:s.w}))}}
function applyG(p){const o=pTop(sel.i),l=[p[0],p[1]-o],{h,s,c}=gest;let f=1,a=0;
 if(h=='s')f=Math.max(.1,Math.hypot(l[0]-c[0],l[1]-c[1])/(Math.hypot(s[0]-c[0],s[1]-c[1])||1));
 if(h=='r')a=Math.atan2(l[1]-c[1],l[0]-c[0])-Math.atan2(s[1]-c[1],s[0]-c[0]);
 const co=Math.cos(a),si=Math.sin(a);
 sel.l.forEach((st,k)=>{const g=gest.o[k];st.w=g.w*f;st.p=g.p.map(q=>{if(h=='m')return[q[0]+l[0]-s[0],q[1]+l[1]-s[1],q[2],q[3]];const x=(q[0]-c[0])*f,y=(q[1]-c[1])*f;return[c[0]+x*co-y*si,c[1]+x*si+y*co,q[2],q[3]]})})}
function pip(q,P){let r=false;for(let i=0,j=P.length-1;i<P.length;j=i++){if((P[i][1]>q[1])!=(P[j][1]>q[1])&&q[0]<(P[j][0]-P[i][0])*(q[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0])r=!r}return r}
function endLoop(){const o=pTop(loop.i),P=loop.p.map(q=>[q[0],q[1]-o]),l=nb.pages[loop.i].strokes.filter(s=>s.p.filter(q=>pip(q,P)).length>=s.p.length/2);sel=l.length&&P.length>2?{i:loop.i,l}:null;loop=null;selUI();if(!sel)toast('Draw a loop around the handwriting you want to select.',2500);draw()}
function drawSel(){ctx.save();ctx.strokeStyle=ctx.fillStyle='#a78bfa';ctx.lineWidth=1.5/S;ctx.setLineDash([6/S,4/S]);
 if(loop){ctx.beginPath();loop.p.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke()}
 if(sel){const b=selBox(),r=9/S,hx=(b.x1+b.x2)/2,hy=b.y1-30/S;ctx.strokeRect(b.x1,b.y1,b.x2-b.x1,b.y2-b.y1);ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(hx,b.y1);ctx.lineTo(hx,hy);ctx.stroke();[[hx,hy],[b.x2,b.y2]].forEach(q=>{ctx.beginPath();ctx.arc(q[0],q[1],r,0,7);ctx.fill()})}ctx.restore()}
$('#sdup').onclick=()=>{if(!sel)return;snap(sel.i);const g=nb.pages[sel.i],c=sel.l.map(s=>({...s,p:s.p.map(q=>[q[0]+24,q[1]+24,q[2],q[3]])}));g.strokes=g.strokes.concat(c);sel.l=c;save();draw()};
$('#sdel').onclick=()=>{if(!sel)return;snap(sel.i);const g=nb.pages[sel.i];g.strokes=g.strokes.filter(s=>!sel.l.includes(s));sel=null;selUI();save();draw()};

/* TEXT + PROTRACTOR + SET SQUARE */
let tg=null;
const prot={x:397,y:400,a:0,on:false,R:170,d:()=>drawProt()},sq={x:300,y:400,a:0,on:false,L:240,d:()=>drawSq()};ruler.d=drawRuler;
const INS=[ruler,prot,sq],ptL=(n,u,v)=>[n.x+u*Math.cos(n.a)-v*Math.sin(n.a),n.y+u*Math.sin(n.a)+v*Math.cos(n.a)];
const cen=n=>n===ruler?[n.x+Math.cos(n.a)*n.len/2,n.y+Math.sin(n.a)*n.len/2]:n===prot||n===comp?[n.x,n.y]:ptL(n,n.L/3,n.L/3);
function hitIns(n,p){const[u,v]=loc(p,n);if(n===comp)return Math.hypot(p[0]-n.x,p[1]-n.y)<44||Math.hypot(p[0]-n.x-Math.cos(n.a)*n.R,p[1]-n.y-Math.sin(n.a)*n.R)<48;return n===ruler?(u>=-10&&u<=n.len+10&&v>=-10&&v<=66):n===prot?(Math.hypot(u,v)<n.R+10&&v<=14):(u>=-10&&v>=-10&&u+v<=n.L+14)}
function edges(n){if(n===comp)return[];const e={x:n.x,y:n.y,a:n.a};if(n!==sq)return[e];const h=ptL(n,n.L,0);return[e,{x:n.x,y:n.y,a:n.a+Math.PI/2},{x:h[0],y:h[1],a:n.a+3*Math.PI/4}]}
function drawProt(){const n=prot,R=n.R,P=Math.PI/180;ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.a);ctx.globalAlpha=.8;ctx.fillStyle='#2a2833';ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,R,Math.PI,2*Math.PI);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle=ctx.fillStyle='#cfcbe0';ctx.font='10px system-ui';ctx.textAlign='center';ctx.beginPath();
 for(let t=0;t<=180;t++){const c=Math.cos(t*P),s=-Math.sin(t*P),h=t%10==0?14:t%5==0?10:5;ctx.moveTo(R*c,R*s);ctx.lineTo((R-h)*c,(R-h)*s)}ctx.stroke();
 for(let t=0;t<=180;t+=10)ctx.fillText(t,(R-26)*Math.cos(t*P),-(R-26)*Math.sin(t*P)+3);ctx.beginPath();ctx.arc(0,0,3,0,7);ctx.fill();ctx.restore()}
function drawSq(){const n=sq,L=n.L;ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.a);ctx.globalAlpha=.8;ctx.fillStyle='#2a2833';ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(L,0);ctx.lineTo(0,L);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=ctx.strokeStyle='#cfcbe0';ctx.font='11px system-ui';ctx.fillText('90°',20,34);ctx.fillText('45°',L-48,18);ctx.fillText('45°',8,L-34);ctx.beginPath();ctx.rect(0,0,14,14);ctx.stroke();ctx.restore()}
function showIns(n,id,init){n.on=!n.on;$(id).classList.toggle('on',n.on);if(n.on)init();draw()}
$('#pr').onclick=()=>showIns(prot,'#pr',()=>{prot.x=PW/2;prot.y=(sy+cv.clientHeight/2)/S+80;prot.a=0});
$('#sq').onclick=()=>showIns(sq,'#sq',()=>{sq.x=PW/2-100;sq.y=(sy+cv.clientHeight/2)/S-100;sq.a=0});
const tsz=()=>12+size*2;
function tBox(t){ctx.font=t.sz+'px system-ui';const L=t.txt.split('\n');return{w:Math.max(20,...L.map(l=>ctx.measureText(l).width)),h:L.length*t.sz*1.3}}
function textDown(p,i){const g=nb.pages[i],l=[p[0],p[1]-pTop(i)],T=g.texts||(g.texts=[]),t=T.find(t=>{const b=tBox(t);return l[0]>=t.x-6&&l[0]<=t.x+b.w+6&&l[1]>=t.y-6&&l[1]<=t.y+b.h+6});
 if(t){tg={t,i,s:l,o:[t.x,t.y],m:false};return}
 const v=prompt('Type your text');if(!v||!v.trim())return;snap(i);T.push({id:uid(),x:l[0],y:l[1],txt:v,sz:tsz(),c:color});save();draw()}
function textMove(p){const l=[p[0],p[1]-pTop(tg.i)];if(!tg.m&&Math.hypot(l[0]-tg.s[0],l[1]-tg.s[1])<6)return;if(!tg.m){snap(tg.i);tg.m=true}tg.t.x=tg.o[0]+l[0]-tg.s[0];tg.t.y=tg.o[1]+l[1]-tg.s[1];draw()}
function textEnd(){const{t,i,m}=tg;tg=null;if(m){save();draw();return}
 const v=prompt('Edit text (clear it to delete)',t.txt);if(v===null)return;snap(i);const g=nb.pages[i];g.texts=v.trim()?g.texts.map(x=>x===t?{...x,txt:v}:x):g.texts.filter(x=>x!==t);save();draw()}

/* TABLES + IMAGES */
let tb=null,ig=null,tsel=null,isel=null,prevT='pen';
const IC={};function imgEl(m){let e=IC[m.id];if(!e){e=IC[m.id]=new Image();e.onload=()=>draw();e.src=m.src}return e}
function drawObjs(c,pgo){(pgo.images||[]).forEach(m=>{const e=imgEl(m);if(e.complete&&e.naturalWidth)c.drawImage(e,m.x,m.y,m.w,m.h)});
 const dk=db.paper=='dark';(pgo.tables||[]).forEach(t=>{c.save();c.strokeStyle=dk?'#6f6c80':'#8a8799';c.fillStyle=dk?'#ecebf1':'#1a1a22';c.lineWidth=1.2;c.font='15px system-ui';c.textBaseline='middle';const m=covmap(t),sm=t.sp||{},ys=[t.y],xs=[t.x];t.rh.forEach(h=>ys.push(ys[ys.length-1]+h));t.cw.forEach(w=>xs.push(xs[xs.length-1]+w));
 t.rh.forEach((h,r)=>t.cw.forEach((w,k)=>{const q=r+','+k;if(m[q])return;const[rs,cs]=sm[q]||[1,1],x=xs[k],y=ys[r],W=xs[Math.min(k+cs,xs.length-1)]-x,H=ys[Math.min(r+rs,ys.length-1)]-y,fl=t.fill&&t.fill[q];
  if(fl){c.save();c.globalAlpha=.45;c.fillStyle=fl;c.fillRect(x,y,W,H);c.restore()}c.strokeRect(x,y,W,H);const v=t.cells[r][k];if(v)c.fillText(v,x+6,y+H/2,W-12)}));c.restore()})}
function drawOS(){ctx.save();ctx.strokeStyle=ctx.fillStyle='#a78bfa';ctx.lineWidth=2/S;
 if(tsel){const t=tsel.t,o=pTop(tsel.i);let x=t.x,y=t.y+o;for(let k=0;k<tsel.c;k++)x+=t.cw[k];for(let k=0;k<tsel.r;k++)y+=t.rh[k];const sp_=(t.sp&&t.sp[tsel.r+','+tsel.c])||[1,1];let W=0,H=0;for(let k=0;k<sp_[1];k++)W+=t.cw[tsel.c+k]||0;for(let k=0;k<sp_[0];k++)H+=t.rh[tsel.r+k]||0;ctx.strokeRect(x,y,W,H)}
 if(isel){const m=isel.m,o=pTop(isel.i);ctx.strokeRect(m.x,m.y+o,m.w,m.h);ctx.beginPath();ctx.arc(m.x+m.w,m.y+m.h+o,9/S,0,7);ctx.fill()}ctx.restore()}
const tHit=(t,l)=>{let x=l[0]-t.x,y=l[1]-t.y,c=-1,r=-1;if(x<0||y<0)return null;for(let k=0;k<t.cw.length;k++){if(x<t.cw[k]){c=k;break}x-=t.cw[k]}for(let k=0;k<t.rh.length;k++){if(y<t.rh[k]){r=k;break}y-=t.rh[k]}if(c<0||r<0)return null;const a=t.sp&&covmap(t)[r+','+c];return a?{r:a[0],c:a[1]}:{r,c}};
function tableDown(p,i){const g=nb.pages[i],l=[p[0],p[1]-pTop(i)],T=g.tables||(g.tables=[]);let h=null;const t=[...T].reverse().find(t=>h=tHit(t,l));
 if(t){const was=!!tsel&&tsel.t===t&&tsel.r==h.r&&tsel.c==h.c;tsel={t,i,r:h.r,c:h.c};isel=null;tb={t,i,s:l,o:[t.x,t.y],m:false,was};selUI();draw();return}
 tsel=null;selUI();const v=prompt('Table size (rows x columns)','3x3'),m=v&&v.match(/(\d+)\s*[x×*,]\s*(\d+)/);if(!m)return;
 const R=Math.min(30,Math.max(1,+m[1])),C=Math.min(12,Math.max(1,+m[2])),w=Math.max(36,Math.min(110,(PW-l[0]-20)/C));
 snap(i);const nt={id:uid(),x:l[0],y:l[1],cw:Array(C).fill(w),rh:Array(R).fill(40),cells:Array.from({length:R},()=>Array(C).fill(''))};T.push(nt);tsel={t:nt,i,r:0,c:0};selUI();save();draw()}
function tbMove(p){const l=[p[0],p[1]-pTop(tb.i)];if(!tb.m&&Math.hypot(l[0]-tb.s[0],l[1]-tb.s[1])<6)return;if(!tb.m){snap(tb.i);tb.m=true}tb.t.x=tb.o[0]+l[0]-tb.s[0];tb.t.y=tb.o[1]+l[1]-tb.s[1];draw()}
function tbEnd(){const{t,i,m,was}=tb;tb=null;if(m){save();draw();return}if(!was)return;const s=tsel,v=prompt('Cell text',t.cells[s.r][s.c]);if(v===null)return;snap(i);t.cells[s.r][s.c]=v;save();draw()}
const tOp=f=>()=>{if(!tsel)return;snap(tsel.i);f(tsel.t,tsel);save();draw()};
$('#tra').onclick=tOp((t,s)=>{t.rh.splice(s.r+1,0,40);t.cells.splice(s.r+1,0,t.cw.map(()=>''))});
$('#tca').onclick=tOp((t,s)=>{t.cw.splice(s.c+1,0,t.cw[s.c]);t.cells.forEach(r=>r.splice(s.c+1,0,''))});
$('#trd').onclick=tOp((t,s)=>{if(t.rh.length>1){t.rh.splice(s.r,1);t.cells.splice(s.r,1);s.r=Math.min(s.r,t.rh.length-1)}});
$('#tcd').onclick=tOp((t,s)=>{if(t.cw.length>1){t.cw.splice(s.c,1);t.cells.forEach(r=>r.splice(s.c,1));s.c=Math.min(s.c,t.cw.length-1)}});
$('#tdl').onclick=()=>{if(!tsel)return;snap(tsel.i);const g=nb.pages[tsel.i];g.tables=g.tables.filter(x=>x!==tsel.t);tsel=null;selUI();save();draw()};
function imgDown(p,i){const g=nb.pages[i],l=[p[0],p[1]-pTop(i)];tsel=null;
 if(isel&&isel.i==i){const m=isel.m;if(Math.hypot(l[0]-m.x-m.w,l[1]-m.y-m.h)<26/S){ig={t:'s',i,m,o:[m.w,m.h],mv:false};return}}
 const m=[...(g.images||[])].reverse().find(m=>l[0]>=m.x&&l[0]<=m.x+m.w&&l[1]>=m.y&&l[1]<=m.y+m.h);
 isel=m?{m,i}:null;ig=m?{t:'m',i,m,s:l,o:[m.x,m.y],mv:false}:null;selUI();draw()}
function igMove(p){const l=[p[0],p[1]-pTop(ig.i)],m=ig.m;if(!ig.mv){if(ig.t=='m'&&Math.hypot(l[0]-ig.s[0],l[1]-ig.s[1])<6)return;snap(ig.i);ig.mv=true}
 if(ig.t=='m'){m.x=ig.o[0]+l[0]-ig.s[0];m.y=ig.o[1]+l[1]-ig.s[1]}else{m.w=Math.max(30,l[0]-m.x);m.h=m.w*ig.o[1]/ig.o[0]}draw()}
function igEnd(){if(ig.mv)save();ig=null;draw()}
$('#idl').onclick=()=>{if(!isel)return;snap(isel.i);const g=nb.pages[isel.i];g.images=g.images.filter(x=>x!==isel.m);isel=null;selUI();save();draw()};
$('#idp').onclick=()=>{if(!isel)return;snap(isel.i);const g=nb.pages[isel.i],c={...isel.m,id:uid(),x:isel.m.x+20,y:isel.m.y+20};g.images.push(c);isel.m=c;save();draw()};
document.querySelector('[data-t=image]').addEventListener('click',()=>{if(prevT!='image')$('#imf').click()});
$('#imf').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onerror=()=>toast('That image could not be read. Nothing was changed.');
 r.onload=()=>{const im=new Image();im.onerror=()=>toast('That file is not a usable image. Nothing was changed.');
  im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
   const i=curPg(),w=Math.min(400,c.width),h=w*c.height/c.width,g=nb.pages[i];snap(i);const m={id:uid(),x:(PW-w)/2,y:Math.max(10,(sy+cv.clientHeight/2)/S-pTop(i)-h/2),w,h,src:c.toDataURL('image/jpeg',.75)};(g.images||(g.images=[])).push(m);isel={m,i};selUI();save();draw()};
  im.src=r.result};r.readAsDataURL(f)};

/* TAGS + BOOKMARKS + SEARCH + PAGE PANEL */
let pf='';
const pnl=document.createElement('div');pnl.style.cssText='position:fixed;top:0;right:0;bottom:0;width:min(360px,92vw);background:var(--sf);border-left:1px solid var(--bd);z-index:8;display:none;flex-direction:column;padding:12px;gap:8px;overflow:hidden;padding-top:max(12px,env(safe-area-inset-top))';document.body.appendChild(pnl);
function goPage(i){fl=null;clampV();sy=Math.min(maxY(),(pTop(i)-12)*S);draw()}
function editPage(i){const p=nb.pages[i],t=prompt('Page title',p.title||'');if(t===null)return;const g=prompt('Tags, comma separated (e.g. EXAM, FORMULA, REVISION)',(p.tags||[]).join(', '));p.title=t.trim();if(g!==null)p.tags=[...new Set(g.split(',').map(x=>x.trim().replace(/^#/,'').toUpperCase().replace(/[^A-Z0-9_-]/g,'')).filter(Boolean))];save();renderPnl()}
function renderPnl(){const tags=[...new Set(nb.pages.flatMap(p=>p.tags||[]))].sort();
 pnl.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><b style="flex:1">Pages</b><button id="pex">Extract</button><button id="pmg">Merge</button><button id="pcl">Close</button></div><select id="pfs"><option value="">All pages</option><option value="*bm">Bookmarked</option>${tags.map(t=>`<option value="${t}">#${t}</option>`).join('')}</select><div id="pls" style="overflow:auto;display:flex;flex-direction:column;gap:6px"></div>`;
 const fs=pnl.querySelector('#pfs'),L=pnl.querySelector('#pls');fs.value=pf;fs.onchange=()=>{pf=fs.value;renderPnl()};pnl.querySelector('#pcl').onclick=()=>pnl.style.display='none';pnl.querySelector('#pex').onclick=extractPages;pnl.querySelector('#pmg').onclick=mergeFrom;let n=0;
 nb.pages.forEach((p,i)=>{if(pf=='*bm'?!p.bm:pf&&!(p.tags||[]).includes(pf))return;
  const r=document.createElement('div');r.style.cssText='display:flex;gap:8px;align-items:flex-start';
  if(n++<80){const c=document.createElement('canvas');c.width=60;c.height=Math.round(60*PH/PW);c.style.cssText='border:1px solid var(--bd);border-radius:4px;flex-shrink:0';const x=c.getContext('2d');x.scale(60/PW,60/PW);drawPage(x,p,{nobg:1});r.appendChild(c)}
  const col=document.createElement('div');col.style.cssText='flex:1;display:flex;flex-direction:column;gap:5px;min-width:0';
  const b=document.createElement('button');b.style.cssText='text-align:left;overflow:hidden;text-overflow:ellipsis';b.textContent=`${i+1}. ${p.title||'Untitled page'}${(p.tags||[]).length?'  '+p.tags.map(t=>'#'+t).join(' '):''}${bls(p).length?'  \u2190 '+bls(p).join(','):''}`;b.onclick=()=>{goPage(i);pnl.style.display='none'};
  const r2=document.createElement('div');r2.style.cssText='display:flex;gap:5px';
  const mk=(t,f,al)=>{const x=document.createElement('button');x.textContent=t;x.style.cssText='padding:3px 9px;min-height:34px;flex:1';x.setAttribute('aria-label',al||t);x.onclick=f;r2.appendChild(x)};
  mk(p.bm?'★':'☆',()=>{p.bm=!p.bm;save();renderPnl();draw()},'Toggle bookmark');mk('Edit',()=>editPage(i));mk('▲',()=>mvPage(i,-1),'Move up');mk('▼',()=>mvPage(i,1),'Move down');mk('Copy',()=>dupPage(i),'Duplicate page');mk('+',()=>insPage(i),'Insert blank page after');
  col.append(b,r2);r.appendChild(col);L.appendChild(r)});
 if(!L.children.length)L.innerHTML='<div class="empty" style="margin:0"><b>Nothing here</b>No pages match this filter.</div>'}
$('#pgs').onclick=()=>{pf='';renderPnl();pnl.style.display='flex'};
$('#tg').onclick=()=>editPage(curPg());
$('#bm').onclick=()=>{const p=nb.pages[curPg()];p.bm=!p.bm;save();draw();toast(p.bm?'Page bookmarked.':'Bookmark removed.',1200)};
function search(q){const l=$('#list');l.innerHTML='';const R=[],tq=q.replace(/^#/,'');
 db.nbs.forEach(n=>{if(n.name.toLowerCase().includes(q))R.push([n,0,'Notebook name']);else if(q.length>1&&fname(n.folder).toLowerCase().includes(q))R.push([n,0,'Folder name']);
  n.pages.forEach((p,i)=>{const tx=(p.texts||[]).map(t=>t.txt).concat((p.tables||[]).flatMap(t=>t.cells.flat())).join(' ').toLowerCase();let w=null;
   if((p.title||'').toLowerCase().includes(q))w='Page title';else if((p.tags||[]).some(t=>t.toLowerCase().includes(tq)))w='Tag';else if(tx.includes(q))w='Typed text';
   if(w)R.push([n,i,w,p])})});
 if(!R.length){l.innerHTML='<div class="empty"><b>No matches</b>Search covers notebook names, page titles, tags and typed text. Handwriting is not searchable.</div>';return}
 R.forEach(([n,i,w,p])=>{const c=document.createElement('div');c.className='card';c.style.cssText='min-height:0;margin-top:10px';c.innerHTML='<div><b></b><br><small></small></div>';c.querySelector('b').textContent=n.name+((w=='Notebook name'||w=='Folder name')?'':' · page '+(i+1)+(p&&p.title?' · '+p.title:''));c.querySelector('small').textContent=w+(n.folder?' · in '+fname(n.folder):'');c.onclick=()=>{open(n);goPage(i)};l.appendChild(c)})}
$('#q').oninput=()=>{const v=$('#q').value.trim();if(v)search(v.toLowerCase());else home()};

/* PDF IMPORT / ANNOTATE / EXPORT + PAGE MANAGEMENT */
let PL=null,bgErr=false;const PD={},BG={},bgo=[];
const AU=p=>new URL(p,document.baseURI).href;
const pdfLib=()=>PL||(PL=import(AU('js/lib/pdf.min.js')).then(m=>{m.GlobalWorkerOptions.workerSrc=AU('js/lib/pdf.worker.min.js');return m}));
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('aura',3);r.onupgradeneeded=()=>{['pdf','data','audio'].forEach(n=>{if(!r.result.objectStoreNames.contains(n))r.result.createObjectStore(n)})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idbPut=async(k,v)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('pdf','readwrite');t.objectStore('pdf').put(v,k);t.oncomplete=ok;t.onerror=()=>no(t.error)})};
const idbGet=async k=>{const d=await idb();return new Promise((ok,no)=>{const r=d.transaction('pdf').objectStore('pdf').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})};
const getDoc=id=>PD[id]||(PD[id]=(async()=>{const buf=await idbGet(id);if(!buf)throw new Error('the PDF file is missing from this device');const m=await pdfLib();return m.getDocument({data:new Uint8Array(buf.slice(0))}).promise})());
async function bgCanvas(id,n){const d=await getDoc(id),pg=await d.getPage(n),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:2*Math.min(PW/v0.width,PH/v0.height)}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await pg.render({canvasContext:c.getContext('2d'),viewport:v}).promise;return c}
function bgGet(id,n){const k=id+':'+n;if(k in BG)return BG[k].c;BG[k]={c:null};bgCanvas(id,n).then(c=>{BG[k]={c};bgo.push(k);while(bgo.length>6)delete BG[bgo.shift()];draw();rfDraw()}).catch(err=>{if(!bgErr){bgErr=true;toast('A PDF page could not be displayed ('+(err&&err.message||'error')+'). Your annotations are safe.',7000)}});return null}
$('#ipdf').onclick=()=>$('#pdfi').click();
$('#pdfi').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;toast('Importing PDF…',60000);
 try{const buf=await f.arrayBuffer(),m=await pdfLib(),d=await m.getDocument({data:new Uint8Array(buf.slice(0))}).promise,id=uid();await idbPut(id,buf);
  const n={id:uid(),...(curFolder?{folder:curFolder}:{}),name:f.name.replace(/\.pdf$/i,''),pages:Array.from({length:d.numPages},(_,i)=>({...pgObj(),tpl:'blank',bg:{id,n:i+1}}))};db.nbs.unshift(n);save();toast('PDF imported: '+d.numPages+' pages.',3000);open(n)}
 catch(err){toast('That PDF could not be imported ('+(err&&err.message||'unknown error')+'). Nothing was changed.',8000)}};
function makePdf(P){const enc=new TextEncoder(),ch=[],off=[];let len=0;const put=b=>{const u=typeof b=='string'?enc.encode(b):b;ch.push(u);len+=u.length};
 const obj=(n,fn)=>{off[n]=len;put(n+' 0 obj\n');fn();put('\nendobj\n')};
 put('%PDF-1.4\n');const N=P.length,kids=P.map((_,i)=>(3+i*3)+' 0 R').join(' ');
 obj(1,()=>put('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>put(`<< /Type /Pages /Count ${N} /Kids [${kids}] >>`));
 P.forEach((p,i)=>{const a=3+i*3,c=a+1,im=a+2,ph=Math.round(595*p.h/p.w),cs=`q 595 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  obj(a,()=>put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${ph}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`));
  obj(c,()=>put(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  obj(im,()=>{put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.b.length} >>\nstream\n`);put(p.b);put('\nendstream')})});
 const xo=len,T=3+N*3;put(`xref\n0 ${T}\n0000000000 65535 f \n`);for(let n=1;n<T;n++)put(String(off[n]).padStart(10,'0')+' 00000 n \n');put(`trailer\n<< /Size ${T} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`);return new Blob(ch,{type:'application/pdf'})}

async function exportPdf(){const rv=prompt('Pages to export, for example 1-3, 5. Leave empty for all pages.','');if(rv===null)return;const IX=rv.trim()?parseRange(rv,nb.pages.length):nb.pages.map((_,k)=>k);if(!IX.length)return toast('No valid page numbers. Nothing was exported.',3500);toast('Building PDF\u2026',60000);
 try{const J=[];for(const i of IX){const p=nb.pages[i],c=document.createElement('canvas');c.width=PW*2;c.height=PH*2;const x=c.getContext('2d');x.scale(2,2);const bgc=p.bg?await bgCanvas(p.bg.id,p.bg.n):null;drawPage(x,p,{bgc,nobg:!bgc});
  J.push({w:c.width,h:c.height,b:Uint8Array.from(atob(c.toDataURL('image/jpeg',.88).split(',')[1]),q=>q.charCodeAt(0))})}
  dl(makePdf(J),nb.name+'.pdf')}
 catch(err){toast('PDF export failed ('+(err&&err.message||'error')+'). Your notes are safe and unchanged.',8000)}}
$('#xp').onclick=exportPdf;
const pgReset=()=>{hist=[];rdo=[];sel=tsel=isel=null;selUI();save();renderPnl();draw()};
function mvPage(i,d){const j=i+d;if(j<0||j>=nb.pages.length)return;[nb.pages[i],nb.pages[j]]=[nb.pages[j],nb.pages[i]];pgReset()}
function dupPage(i){const c=JSON.parse(JSON.stringify(nb.pages[i]));c.id=uid();nb.pages.splice(i+1,0,c);pgReset()}
function insPage(i){const p=nb.pages[i];nb.pages.splice(i+1,0,{...pgObj(),tpl:p.bg?'blank':p.tpl});pgReset()}
/* STORAGE GC + TABLE/IMAGE UPGRADES + AREA ERASER + EXTRACT/MERGE */
async function gcPdf(){try{const used=new Set(allNbs().flatMap(n=>n.pages.filter(p=>p.bg).map(p=>p.bg.id))),d=await idb(),keys=await new Promise((ok,no)=>{const r=d.transaction('pdf').objectStore('pdf').getAllKeys();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}),dead=keys.filter(k=>!used.has(k));
 if(dead.length)await new Promise((ok,no)=>{const t=d.transaction('pdf','readwrite');dead.forEach(k=>t.objectStore('pdf').delete(k));t.oncomplete=ok;t.onerror=()=>no(t.error)})}catch(e){}}
let opac=1;$('#op').oninput=e=>opac=e.target.value/100;
function eraseArea(p){const i=pageAt(p[1]),q=[p[0],p[1]-pTop(i)],g=nb.pages[i],out=[],hitp=(a,s)=>Math.hypot(a[0]-q[0],a[1]-q[1])<er()+s.w/2;
 g.strokes.forEach(s=>{if(!s.p.some(a=>hitp(a,s))){out.push(s);return}let cur=[];s.p.forEach(a=>{if(hitp(a,s)){if(cur.length>1)out.push({...s,p:cur});cur=[]}else cur.push(a)});if(cur.length>1)out.push({...s,p:cur})});g.strokes=out;draw()}
$('#tcw').onclick=tOp((t,s)=>{t.cw[s.c]+=20});$('#tcn').onclick=tOp((t,s)=>{t.cw[s.c]=Math.max(30,t.cw[s.c]-20)});
$('#trt').onclick=tOp((t,s)=>{t.rh[s.r]+=10});$('#trs').onclick=tOp((t,s)=>{t.rh[s.r]=Math.max(24,t.rh[s.r]-10)});
$('#tsh').onclick=tOp((t,s)=>{const C=['','#a78bfa','#9aa3b2','#f5b942','#34c38f'],k=s.r+','+s.c;t.fill=t.fill||{};const n=(C.indexOf(t.fill[k]||'')+1)%C.length;if(C[n])t.fill[k]=C[n];else delete t.fill[k]});
$('#irt').onclick=()=>{if(!isel)return;const m=isel.m,e=imgEl(m);if(!(e.complete&&e.naturalWidth))return toast('Image is still loading.',1500);snap(isel.i);
 const c=document.createElement('canvas');c.width=e.naturalHeight;c.height=e.naturalWidth;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(e,0,0);
 m.src=c.toDataURL('image/jpeg',.8);m.id=uid();[m.w,m.h]=[m.h,m.w];save();draw()};
$('#icr').onclick=()=>{if(!isel)return;const m=isel.m,e=imgEl(m);if(!(e.complete&&e.naturalWidth))return toast('Image is still loading.',1500);
 const v=prompt('Crop edges in percent: left, top, right, bottom (e.g. 10,0,10,5)','0,0,0,0');if(v===null)return;const a=v.split(',').map(x=>Math.max(0,Math.min(45,+x||0)));if(a.length<4||a.every(x=>!x))return toast('Enter four numbers, for example 10,0,10,5.',3000);
 snap(isel.i);const[l,t,r,b]=a.map(x=>x/100),W0=e.naturalWidth,H0=e.naturalHeight,sw=W0*(1-l-r),sh=H0*(1-t-b),c=document.createElement('canvas');c.width=Math.round(sw);c.height=Math.round(sh);c.getContext('2d').drawImage(e,W0*l,H0*t,sw,sh,0,0,c.width,c.height);
 m.src=c.toDataURL('image/jpeg',.8);m.id=uid();m.x+=m.w*l;m.y+=m.h*t;m.w*=1-l-r;m.h*=1-t-b;save();draw()};
function parseRange(v,n){const o=new Set();String(v).split(',').forEach(p=>{const m=p.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)return;const a=+m[1],b=+(m[2]||m[1]);for(let k=Math.min(a,b);k<=Math.max(a,b);k++)if(k>=1&&k<=n)o.add(k-1)});return[...o].sort((x,y)=>x-y)}
function extractPages(){const v=prompt('Pages to extract into a new notebook (e.g. 1-3, 5)','1');if(v===null)return;const ix=parseRange(v,nb.pages.length);if(!ix.length)return toast('No valid page numbers. Nothing was changed.',3500);
 const n={id:uid(),...(nb.folder?{folder:nb.folder}:{}),name:nb.name+' (extract)',pages:ix.map(i=>({...JSON.parse(JSON.stringify(nb.pages[i])),id:uid()}))};db.nbs.unshift(n);save();toast(ix.length+' page(s) copied to the new notebook "'+n.name+'".',4000)}
function mergeFrom(){const o=db.nbs.filter(x=>x!==nb);if(!o.length)return toast('There is no other notebook to merge in.',3500);const v=prompt('Append pages from which notebook?\n'+o.map((x,k)=>(k+1)+'. '+x.name).join('\n'));const x=o[(+v)-1];if(!x)return;
 nb.pages.push(...JSON.parse(JSON.stringify(x.pages)).map(p=>({...p,id:uid()})));pgReset();toast('Merged '+x.pages.length+' page(s) at the end.',3000)}

/* PAGE SIZE, TABLE MERGE/SPLIT/CLEAN, TO-TABLE, SHORTCUTS, FOCUS */
function covmap(t){const m={};Object.keys(t.sp||{}).forEach(k=>{const[r,c]=k.split(',').map(Number),[rs,cs]=t.sp[k];for(let i=0;i<rs;i++)for(let j=0;j<cs;j++)if(i||j)m[(r+i)+','+(c+j)]=[r,c]});return m}
const rmapF=(t,ax,at,d)=>{const f={};Object.keys(t.fill||{}).forEach(k=>{let[r,c]=k.split(',').map(Number),v=ax=='r'?r:c;if(d<0&&v==at)return;if(v>=at+(d<0?1:0))v+=d;if(ax=='r')r=v;else c=v;f[r+','+c]=t.fill[k]});t.fill=f};
const rsp=t=>{if(t.sp&&Object.keys(t.sp).length){t.sp={};toast('Merged cells were split because the table structure changed.',3500)}};
$('#tra').onclick=tOp((t,s)=>{rsp(t);t.rh.splice(s.r+1,0,40);t.cells.splice(s.r+1,0,t.cw.map(()=>''));rmapF(t,'r',s.r+1,1)});
$('#tca').onclick=tOp((t,s)=>{rsp(t);t.cw.splice(s.c+1,0,t.cw[s.c]);t.cells.forEach(r=>r.splice(s.c+1,0,''));rmapF(t,'c',s.c+1,1)});
$('#trd').onclick=tOp((t,s)=>{if(t.rh.length>1){rsp(t);t.rh.splice(s.r,1);t.cells.splice(s.r,1);rmapF(t,'r',s.r,-1);s.r=Math.min(s.r,t.rh.length-1)}});
$('#tcd').onclick=tOp((t,s)=>{if(t.cw.length>1){rsp(t);t.cw.splice(s.c,1);t.cells.forEach(r=>r.splice(s.c,1));rmapF(t,'c',s.c,-1);s.c=Math.min(s.c,t.cw.length-1)}});
const free=(t,r,c,m)=>r<t.rh.length&&c<t.cw.length&&!m[r+','+c]&&!(t.sp&&t.sp[r+','+c]);
$('#tmr').onclick=tOp((t,s)=>{t.sp=t.sp||{};const k=s.r+','+s.c,[rs,cs]=t.sp[k]||[1,1],m=covmap(t);for(let i=0;i<rs;i++)if(!free(t,s.r+i,s.c+cs,m))return toast('Cannot merge: the next cells are merged already or at the table edge.',3500);t.sp[k]=[rs,cs+1]});
$('#tmd').onclick=tOp((t,s)=>{t.sp=t.sp||{};const k=s.r+','+s.c,[rs,cs]=t.sp[k]||[1,1],m=covmap(t);for(let j=0;j<cs;j++)if(!free(t,s.r+rs,s.c+j,m))return toast('Cannot merge: the cells below are merged already or at the table edge.',3500);t.sp[k]=[rs+1,cs]});
$('#tsp').onclick=tOp((t,s)=>{if(t.sp)delete t.sp[s.r+','+s.c]});
function toTable(){if(!sel)return;const H=[],V=[];sel.l.forEach(s=>{let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;s.p.forEach(q=>{x1=Math.min(x1,q[0]);x2=Math.max(x2,q[0]);y1=Math.min(y1,q[1]);y2=Math.max(y2,q[1])});const w=x2-x1,h=y2-y1;if(w>40&&h<w*.2)H.push({s,v:(y1+y2)/2});else if(h>40&&w<h*.2)V.push({s,v:(x1+x2)/2})});
 const cl=A=>{const o=[];[...A].sort((a,b)=>a.v-b.v).forEach(l=>{const g=o[o.length-1];if(g&&l.v-g.v<20){g.n++;g.v=(g.v*(g.n-1)+l.v)/g.n}else o.push({v:l.v,n:1})});return o.map(g=>g.v)},ys=cl(H),xs=cl(V);
 if(ys.length<2||xs.length<2)return toast('Draw at least 2 horizontal and 2 vertical lines, select them with the lasso, then tap To table.',5000);
 snap(sel.i);const g=nb.pages[sel.i],t={id:uid(),x:xs[0],y:ys[0],cw:xs.slice(1).map((x,k)=>Math.max(30,x-xs[k])),rh:ys.slice(1).map((y,k)=>Math.max(24,y-ys[k]))};t.cells=t.rh.map(()=>t.cw.map(()=>''));
 const rm=new Set([...H,...V].map(l=>l.s));g.strokes=g.strokes.filter(s=>!rm.has(s));(g.tables||(g.tables=[])).push(t);sel=null;selUI();save();draw();toast('Converted to a clean table.',2500)}
$('#stb').onclick=toTable;
function applySize(w,h){PW=w;PH=h;nb.size={w,h};sizeCv();save()}
$('#psz').onclick=()=>{const v=prompt('Page size for this notebook: A4, A5, Letter, or custom width x height in mm (e.g. 200x280). Add L for landscape, e.g. "A4 L".','A4');if(v===null)return;
 const m=v.trim().toUpperCase().match(/^(A4|A5|LETTER|(\d+)\s*[X*]\s*(\d+))\s*(L|P)?$/);if(!m)return toast('Size not recognised. Nothing was changed.',3500);
 let w,h;if(m[1]=='A4'){w=794;h=1123}else if(m[1]=='A5'){w=559;h=794}else if(m[1]=='LETTER'){w=816;h=1056}else{w=Math.round(+m[2]*96/25.4);h=Math.round(+m[3]*96/25.4);if(w<200||h<200||w>2400||h>2400)return toast('Custom size must be about 53 to 635 mm per side.',4000)}
 if((m[4]=='L'&&w<h)||(m[4]=='P'&&w>h))[w,h]=[h,w];applySize(w,h);toast('Page size set for all pages in this notebook.',2500)};
$('#fm').onclick=()=>{const o=$('#opt'),off=o.style.display=='none';o.style.display=off?'flex':'none';$('#fm').classList.toggle('on',!off);sizeCv()};
addEventListener('keydown',e=>{if(!$('#ed').classList.contains('show')||/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||''))return;const k=e.key.toLowerCase(),ctl=e.ctrlKey||e.metaKey;
 if(ctl&&k=='y'){e.preventDefault();redo();return}if(ctl&&k=='b'){e.preventDefault();$('#bm').click();return}if(ctl)return;
 const T={p:'pen',h:'highlighter',m:'marker',e:'eraser',l:'lasso',t:'text'};if(T[k]){setTool(T[k]);return}
 if(k=='r'){$('#rl').click();return}
 if(k=='delete'||k=='backspace'){if(sel)$('#sdel').click();else if(tsel)$('#tdl').click();else if(isel)$('#idl').click();return}
 if(k=='escape'){sel=tsel=isel=null;selUI();pnl.style.display='none';draw()}
 if(k=='pagedown')goPage(Math.min(nb.pages.length-1,curPg()+1));if(k=='pageup')goPage(Math.max(0,curPg()-1))});

/* PEN EXTRAS: side button / eraser end, tilt shading, hover cursor, palm guard */
let hov=null,penPrev=null,penT=0;
const PX=()=>db.penx!==false,tl=e=>PX()&&e.pointerType=='pen'?Math.min(1,Math.hypot(e.tiltX||0,e.tiltY||0)/70):0;
function pxl(){$('#px').textContent='Pen extras: '+(PX()?'on':'off');$('#px').classList.toggle('on',PX())}
$('#px').onclick=()=>{db.penx=!PX();save();pxl();hov=null;draw();toast(PX()?'Pen extras on: side button or eraser end erases, tilt shades with the pencil, a ring follows the hovering pen, and touches are ignored while the pen is near.':'Pen extras off.',5000)};
cv.addEventListener('pointerleave',()=>{hov=null;draw()});

/* PEN BUTTON DETECTION (broader) + CONTEXT MENU GUARD + PEN TEST PANEL */
let penBtn=0;
const isBtn=e=>(e.pointerType=='pen'||e.pointerType=='mouse')&&!!((e.buttons&34)||e.button==2||e.button==5||penBtn);
cv.addEventListener('contextmenu',e=>e.preventDefault());
const dbg=document.createElement('pre');dbg.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9;margin:0;padding:8px 10px;background:var(--el);border:1px solid var(--bd);border-radius:8px;font:12px/1.4 monospace;display:none;pointer-events:none;max-width:90vw;white-space:pre-wrap';document.body.appendChild(dbg);
const dlog=e=>{if(dbg.style.display=='none')return;dbg.textContent=`${e.type}\ntype: ${e.pointerType}   button: ${e.button}   buttons: ${e.buttons}\npressure: ${(+e.pressure).toFixed(2)}   tilt: ${e.tiltX||0}/${e.tiltY||0}\nbutton-held flag: ${penBtn}   tool: ${tool}`};
['pointerdown','pointermove','pointerup','pointercancel','contextmenu'].forEach(t=>cv.addEventListener(t,dlog,true));
$('#pt').onclick=()=>{const on=dbg.style.display=='none';dbg.style.display=on?'block':'none';$('#pt').classList.toggle('on',on);if(on)dbg.textContent='Hold the pen button, then hover over or touch the page. This box shows what the tablet reports.'};

/* MOMENTUM (FLING) SCROLLING */
let vx=0,vy=0,lastT=0,scrolling=false,fl=null;
function startFling(){if(performance.now()-lastT>90)return;const c=v=>Math.max(-5,Math.min(5,v));if(Math.hypot(vx,vy)<.06)return;fl={vx:c(vx),vy:c(vy),t:performance.now()};requestAnimationFrame(flStep)}
function flStep(t){if(!fl)return;const dt=Math.min(40,Math.max(1,t-fl.t));fl.t=t;sy+=fl.vy*dt;if(z>1)ox+=fl.vx*dt;const k=Math.exp(-dt/320);fl.vy*=k;fl.vx*=k;const m=maxY();let stop=false;
 if(sy<=0){sy=0;stop=true}if(sy>=m){sy=m;stop=true}if(Math.hypot(fl.vx,fl.vy)<.02)stop=true;draw();if(stop)fl=null;else requestAnimationFrame(flStep)}

/* EXPORT DIALOG: Download (saves to Downloads) + Share */
const isNat=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()),CPl=()=>(window.Capacitor&&Capacitor.Plugins)||{};
const b64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>no(r.error||new Error('could not read the file'));r.readAsDataURL(b)});
function canShare(){if(isNat())return!!(CPl().Share&&CPl().Filesystem);return typeof navigator.share=='function'}
async function saveDl(b,n){if(isNat()){const P=CPl().AuraSave;if(!P)throw new Error('the save component is missing from this build');await P.save({name:n,mime:b.type||'application/octet-stream',data:await b64(b)});return'Saved to your Downloads folder as "'+n+'". Open the Files app, then Downloads, to find it.'}rawDl(b,n);return'Download started. Check your browser downloads.'}
async function shareFile(b,n){if(isNat()){const w=await CPl().Filesystem.writeFile({path:n,data:await b64(b),directory:'CACHE'});await CPl().Share.share({title:n,files:[w.uri]});return'Share sheet closed.'}await navigator.share({files:[new File([b],n,{type:b.type})],title:n});return'Shared.'}
function dl(b,n){n=n.replace(/[\\/:*?"<>|]/g,'_');$('#toast').classList.remove('show');
 const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
 const c=document.createElement('div');c.style.cssText='background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:20px;max-width:400px;width:100%;display:flex;flex-direction:column;gap:10px';
 c.innerHTML='<b style="font-size:17px">Export</b><div class="pill" id="xn" style="white-space:normal"></div><div class="pill" id="xm" style="white-space:normal;color:var(--tx)"></div>';
 c.querySelector('#xn').textContent=n+' · '+(b.size>=1048576?(b.size/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b.size/1024))+' KB');
 const msg=t=>c.querySelector('#xm').textContent=t,bt=(t,f,pri)=>{const x=document.createElement('button');x.textContent=t;if(pri)x.className='pri';x.onclick=async()=>{msg('Working...');try{msg(await f())}catch(e){const m=(e&&e.message)||String(e);msg(/cancel|abort/i.test(m)?'Cancelled.':'That did not work ('+m+'). Your notes are safe. Try the other option.')}};c.appendChild(x)};
 bt('Download to device',()=>saveDl(b,n),1);if(canShare())bt('Share...',()=>shareFile(b,n));
 const x=document.createElement('button');x.textContent='Close';x.onclick=()=>o.remove();c.appendChild(x);o.appendChild(c);document.body.appendChild(o)}

/* V2 FEATURES: tag sheet, cover & reveal, shape snap, presets/recents, readout, graph, links, replay, timer, auto backup, toolbar customise, lock tools, split view */
let cvr=null,snapT=0,rp=null,ilock=false,lastAct=Date.now(),tk=0,rfOn=false,rf={i:0,sy:0};
function buildSheet(){const tags=[...new Set(db.nbs.flatMap(n=>n.pages.flatMap(p=>p.tags||[])))].sort();if(!tags.length)return toast('No tags yet. Tag pages with the Tags button inside a notebook first.',4500);
 const v=prompt('Build a sheet from which tag?\n'+tags.map(t=>'#'+t).join('  '),tags[0]);if(!v)return;const t=v.trim().replace(/^#/,'').toUpperCase(),P=[];
 db.nbs.forEach(n=>n.pages.forEach((p,i)=>{if((p.tags||[]).includes(t))P.push({...JSON.parse(JSON.stringify(p)),id:uid(),title:(p.title||'Page '+(i+1))+' ('+n.name+')'})}));
 if(!P.length)return toast('No pages have the tag #'+t+'.',4000);db.nbs.unshift({id:uid(),...(curFolder?{folder:curFolder}:{}),name:'#'+t+' sheet',pages:P});save();home();toast(P.length+' page(s) gathered into "#'+t+' sheet". Open it and use Export PDF.',5500)}
$('#shb').onclick=buildSheet;
function coverDown(p,i){const g=nb.pages[i],l=[p[0],p[1]-pTop(i)],m=(g.masks||[]).find(m=>l[0]>=m.x&&l[0]<=m.x+m.w&&l[1]>=m.y&&l[1]<=m.y+m.h);if(m){snap(i);m.on=!m.on;save();draw();return}cvr={i,x0:l[0],y0:l[1],x1:l[0],y1:l[1]}}
function coverEnd(){const c=cvr;cvr=null;const w=Math.abs(c.x1-c.x0),h=Math.abs(c.y1-c.y0);if(w<14||h<14){draw();return}snap(c.i);(nb.pages[c.i].masks||(nb.pages[c.i].masks=[])).push({x:Math.min(c.x0,c.x1),y:Math.min(c.y0,c.y1),w,h,on:true});save();draw()}
$('#cvall').onclick=()=>{const i=curPg(),ms=nb.pages[i].masks||[];if(!ms.length)return toast('No covers on this page. Pick the Cover tool and drag over what you want to hide. Tap a cover to reveal it.',5000);snap(i);const on=ms.some(m=>!m.on);ms.forEach(m=>m.on=on);save();draw()};
function snapShape(){const P=live.p,a=P[0],b=P[P.length-1];let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;P.forEach(q=>{x1=Math.min(x1,q[0]);x2=Math.max(x2,q[0]);y1=Math.min(y1,q[1]);y2=Math.max(y2,q[1])});const w=x2-x1,h=y2-y1,L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(w<24&&h<24)return;
 let dev=0;P.forEach(q=>{dev=Math.max(dev,Math.abs((b[0]-a[0])*(a[1]-q[1])-(a[0]-q[0])*(b[1]-a[1]))/(L||1))});let r=null;
 if(L>40&&dev<Math.max(6,L*.06))r=sp('line',a,b);
 else if(L<Math.max(w,h)*.3&&w>20&&h>20){const cx=(x1+x2)/2,cy=(y1+y2)/2;let ed=0,el=0;P.forEach(q=>{ed+=Math.min(Math.min(q[0]-x1,x2-q[0])/w,Math.min(q[1]-y1,y2-q[1])/h)<.1?1:0;el+=Math.abs(Math.hypot((q[0]-cx)/(w/2),(q[1]-cy)/(h/2))-1)<.18?1:0});r=ed/P.length>.85?sp('rect',[x1,y1],[x2,y2]):el/P.length>.85?sp('ellipse',[x1,y1],[x2,y2]):null}
 if(r){live.p=r.map(q=>[q[0],q[1],.5,0]);live.done=true;if(navigator.vibrate)navigator.vibrate(15);draw()}}
function rec(c){db.recent=[c,...(db.recent||[]).filter(x=>x!==c&&!PAL.includes(x))].slice(0,6);save();rrec()}
const rcs=document.createElement('span');rcs.style.cssText='display:flex;gap:6px;align-items:center';$('#cc').after(rcs);
function rrec(){rcs.innerHTML='';[...(db.mine||[]),...(db.recent||[])].forEach(c=>{const b=document.createElement('button');b.className='sw'+(c==color?' on':'');b.style.background=c;b.setAttribute('aria-label','Recent colour '+c);b.onclick=()=>pick(c);rcs.appendChild(b)})}
const psw=[0,1,2].map(k=>{const b=document.createElement('button');b.style.cssText='padding:4px 10px;min-height:34px';let t=0,held=false;
 b.onpointerdown=()=>{held=false;t=setTimeout(()=>{held=true;db.presets=db.presets||[];db.presets[k]={t:tool,c:color,w:size,o:opac};save();lab();toast('Current pen saved to P'+(k+1)+'.',2000)},600)};b.onpointerup=b.onpointerleave=()=>clearTimeout(t);
 b.onclick=()=>{if(held){held=false;return}const p=(db.presets||[])[k];if(!p)return toast('P'+(k+1)+' is empty. Press and hold it to save the current pen here.',4000);pick(p.c);setTool(p.t);size=p.w;opac=p.o;$('#sz').value=p.w;$('#op').value=p.o*100};return b});
function lab(){psw.forEach((b,k)=>b.textContent='P'+(k+1)+((db.presets||[])[k]?' ●':''))}rcs.after(...psw);
function plotGraph(){const v=prompt('Plot a function of x on this page, e.g. x^2-3, sin(x), 2*x+1, sqrt(x)','x^2');if(!v)return;const ex=v.replace(/^\s*y\s*=\s*/i,'').toLowerCase().replace(/\^/g,'**'),W_=['x','sin','cos','tan','sqrt','abs','log','ln','exp','pi','e'];
 if(!(/^[0-9x+\-*/().,\s a-z]*$/.test(ex)&&(ex.match(/[a-z]+/g)||[]).every(w=>W_.includes(w))))return toast('Unsupported expression. Use x, + - * / ^ ( ) and sin, cos, tan, sqrt, abs, log, ln, exp, pi, e.',5500);
 let f;try{f=new Function('x','sin','cos','tan','sqrt','abs','log','ln','exp','pi','e','return ('+ex+')')}catch(_){return toast('That expression could not be read.',4000)}
 const i=curPg(),g=nb.pages[i],o=g.tpl=='math'?[396,552]:[PW/2,PH/2],U=24,segs=[];let cur=[];
 for(let k=-16*U;k<=16*U;k+=2){const x=k/U;let y;try{y=f(x,Math.sin,Math.cos,Math.tan,Math.sqrt,Math.abs,Math.log10,Math.log,Math.exp,Math.PI,Math.E)}catch(_){y=NaN}const Y=o[1]-y*U;if(typeof y!='number'||!isFinite(y)||Math.abs(Y-o[1])>PH){if(cur.length>1)segs.push(cur);cur=[]}else cur.push([o[0]+k,Y,.5,0])}if(cur.length>1)segs.push(cur);
 if(!segs.length)return toast('Nothing to plot in the visible range.',3500);snap(i);segs.forEach(p=>g.strokes.push({t:'pen',c:color,w:Math.max(2,size),op:1,p}));save();draw();toast('Plotted (1 unit = 24 px). The Mathematics template adds axes.',4500)}
$('#grf').onclick=plotGraph;
function linkDown(p,i){const g=nb.pages[i],l=[p[0],p[1]-pTop(i)],k=(g.links||[]).find(k=>Math.abs(l[0]-k.x)<=22&&Math.abs(l[1]-k.y)<=14);
 if(k){const j=nb.pages.findIndex(q=>q.id==k.pid);if(j<0)return toast('The linked page no longer exists. Erase this link with the eraser.',4000);goPage(j);return}
 const n=parseInt(prompt('Link this spot to which page number? (1 to '+nb.pages.length+')',''),10);if(!(n>=1&&n<=nb.pages.length))return;(g.links||(g.links=[])).push({x:l[0],y:l[1],pid:nb.pages[n-1].id});save();draw()}
function replay(){const g=nb.pages[curPg()],tot=g.strokes.reduce((a,s)=>a+s.p.length,0);if(!tot)return toast('Nothing written on this page to replay.',3000);rp={pg:g,k:0,t:performance.now(),tot,rate:Math.max(500,tot/6)};requestAnimationFrame(rpStep);toast('Replaying. Tap the page to stop.',2500)}
function rpStep(t){if(!rp)return;rp.k+=(t-rp.t)/1000*rp.rate;rp.t=t;if(rp.k>=rp.tot+rp.rate*.6)rp=null;draw();if(rp)requestAnimationFrame(rpStep)}
function replayList(g){let k=rp.k;const o=[];for(const s of g.strokes){if(k<=0)break;o.push({...s,p:s.p.slice(0,Math.max(1,Math.ceil(Math.min(k,s.p.length))))});k-=s.p.length}return o}
$('#rpl').onclick=replay;cv.addEventListener('pointerdown',()=>{rp=null},true);
['pointerdown','pointermove'].forEach(t=>addEventListener(t,()=>lastAct=Date.now(),true));
const fmtT=s=>s>=3600?Math.floor(s/3600)+' h '+Math.floor(s%3600/60)+' min':Math.max(1,Math.floor(s/60))+' min';
setInterval(()=>{if(nb&&$('#ed').classList.contains('show')&&!document.hidden&&Date.now()-lastAct<12e4){nb.secs=(nb.secs||0)+15;if(++tk%4==0)save()}},15000);
async function autoBackup(){try{if(!isNat()||db.auto===false||!db.nbs.length||Date.now()-(db.lastBk||0)<3*864e5)return;const P=CPl().AuraSave;if(!P)return;
 await P.save({name:'aura-backup-'+new Date().toISOString().slice(0,10)+'.json',mime:'application/json',data:await b64(new Blob([JSON.stringify(db)],{type:'application/json'}))});db.lastBk=Date.now();save();toast('Automatic backup saved to your Downloads folder.',3500)}
 catch(e){toast('Automatic backup failed ('+(e&&e.message||'error')+'). Your notes are safe. Use Backup to save a copy.',6000)}}
const abl=()=>{$('#ab').textContent='Auto backup: '+(db.auto===false?'off':'on')};
$('#ab').onclick=()=>{db.auto=db.auto===false;save();abl();toast(db.auto===false?'Automatic backup off.':'Automatic backup on: a copy is saved to Downloads every 3 days.',4000)};
function applyHide(){const h=db.hide||[];[...$('#ed .bar').querySelectorAll('button')].forEach(b=>{if(b.id=='back'||b.id=='nm'||b.classList.contains('gt'))return;b.style.display=h.includes(b.textContent)?'none':''})}
$('#cus').onclick=()=>{const bs=[...$('#ed .bar').querySelectorAll('button')].filter(b=>b.id!='back'&&b.id!='nm'&&!b.classList.contains('gt')),o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
 const c=document.createElement('div');c.style.cssText='background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:18px;max-width:420px;width:100%;max-height:85vh;overflow:auto;display:flex;flex-direction:column;gap:8px';c.innerHTML='<b>Customise toolbar</b><div class="pill" style="white-space:normal">Untick the tools you do not use. Bring them back here any time.</div>';
 bs.forEach(b=>{const l=document.createElement('label'),k=document.createElement('input');l.style.cssText='display:flex;gap:10px;align-items:center;min-height:40px';k.type='checkbox';k.checked=b.style.display!='none';k.onchange=()=>{const h=new Set(db.hide||[]);if(k.checked)h.delete(b.textContent);else h.add(b.textContent);db.hide=[...h];save();applyHide()};l.append(k,document.createTextNode(b.textContent));c.appendChild(l)});
 const x=document.createElement('button');x.textContent='Done';x.className='pri';x.onclick=()=>o.remove();c.appendChild(x);o.appendChild(c);document.body.appendChild(o)};
$('#lkt').onclick=()=>{ilock=!ilock;$('#lkt').classList.toggle('on',ilock);toast(ilock?'Ruler, protractor and set square are locked in place.':'Instruments can be moved again.',2500)};
const rc=document.createElement('canvas'),rfh=document.createElement('div'),rsel=document.createElement('select');
rfh.style.cssText='position:absolute;top:0;right:0;bottom:0;width:42%;display:none;flex-direction:column;border-left:1px solid var(--bd);background:var(--bg)';rsel.style.cssText='margin:6px';rc.style.cssText='flex:1;min-height:0;width:100%;touch-action:none';rfh.append(rsel,rc);$('#stage').appendChild(rfh);
function rfSize(){if(!rfOn)return;const d=devicePixelRatio||1;rc.width=rc.clientWidth*d;rc.height=rc.clientHeight*d;rfDraw()}
function rfDraw(){const n=db.nbs[rf.i]||nb;if(!rfOn||!n)return;const RW=n.size?n.size.w:794,RH=n.size?n.size.h:1123,d=devicePixelRatio||1,rs=rc.clientWidth/RW,x=rc.getContext('2d'),w0=PW,h0=PH,l0=live;PW=RW;PH=RH;live=rlive;
 try{rf.sy=Math.max(0,Math.min(Math.max(0,n.pages.length*(RH+24)*rs-rc.clientHeight),rf.sy));x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,rc.width,rc.height);
  n.pages.forEach((p,i)=>{const t=(12+i*(RH+24))*rs-rf.sy;if(t>rc.clientHeight||t+RH*rs<0)return;x.setTransform(d*rs,0,0,d*rs,0,d*t);x.save();x.beginPath();x.rect(0,0,RW,RH);x.clip();drawPage(x,p);x.restore()})}finally{PW=w0;PH=h0;live=l0}}
let ry=null;rc.onwheel=e=>{e.preventDefault();rf.sy+=e.deltaY;rfDraw()};
rsel.onchange=()=>{rf.i=+rsel.value;rf.sy=0;rfDraw()};
$('#spl').onclick=()=>{rfOn=!rfOn;$('#spl').classList.toggle('on',rfOn);rfh.style.display=rfOn?'flex':'none';cv.style.width=rfOn?'58%':'100%';
 if(rfOn){rsel.innerHTML='';db.nbs.forEach((n,k)=>{const o=document.createElement('option');o.value=k;o.textContent=n.name;rsel.appendChild(o)});rf.i=Math.max(0,db.nbs.findIndex(n=>n!==nb));rsel.value=rf.i;rf.sy=0}sizeCv();rfSize()};

/* V3: audio recording, compass, backlinks, drawing in split pane */
let mr=null,rch=[],rt=0,rlive=null,rEr=false;
async function idbS(store,mode,fn){const d=await idb();return new Promise((ok,no)=>{const t=d.transaction(store,mode),r=fn(t.objectStore(store));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})}
const idbPutS=(s,k,v)=>idbS(s,'readwrite',o=>o.put(v,k)),idbGetS=(s,k)=>idbS(s,'readonly',o=>o.get(k)),idbDelS=(s,k)=>idbS(s,'readwrite',o=>o.delete(k));
async function gcAudio(){try{const used=new Set(allNbs().flatMap(n=>(n.recs||[]).map(r=>r.id))),keys=await idbS('audio','readonly',o=>o.getAllKeys());for(const k of keys)if(!used.has(k))await idbDelS('audio',k)}catch(e){}}
const fmtD=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
$('#rec').onclick=async()=>{if(mr){mr.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true}),mt=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||'',m=new MediaRecorder(st,mt?{mimeType:mt}:{});mr=m;rch=[];rt=Date.now();const pg0=curPg()+1,n0=nb;
  m.ondataavailable=e=>{if(e.data&&e.data.size)rch.push(e.data)};
  m.onstop=async()=>{st.getTracks().forEach(t=>t.stop());const b=new Blob(rch,{type:m.mimeType||'audio/webm'}),id=uid();mr=null;$('#rec').classList.remove('on');$('#rec').textContent='Record';
   try{await idbPutS('audio',id,b);(n0.recs=n0.recs||[]).push({id,at:Date.now(),secs:Math.max(1,Math.round((Date.now()-rt)/1000)),page:pg0});save();toast('Recording saved. Open Audio to play it.',3500)}catch(e){toast('The recording could not be saved ('+(e&&e.message||'error')+').',6000)}};
  m.start(1000);$('#rec').classList.add('on');$('#rec').textContent='Stop';toast('Recording started.',1500)}
 catch(e){mr=null;toast('Microphone unavailable ('+(e&&e.message||'permission denied')+'). Allow microphone access for Aura Notes in Android settings.',7000)}};
$('#aud').onclick=()=>{const R=nb.recs||[],o=document.createElement('div'),c=document.createElement('div');let au=null;
 o.style.cssText='position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';c.style.cssText='background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:18px;max-width:460px;width:100%;max-height:85vh;overflow:auto;display:flex;flex-direction:column;gap:8px';c.innerHTML='<b>Recordings</b>';
 if(!R.length)c.insertAdjacentHTML('beforeend','<div class="pill" style="white-space:normal">No recordings yet. Tap Record, then Stop. Recordings stay inside this notebook.</div>');
 R.forEach(r=>{const row=document.createElement('div'),t=document.createElement('span');row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';t.className='pill';t.style.cssText='flex:1;white-space:normal';t.textContent=new Date(r.at).toLocaleString()+' · '+fmtD(r.secs)+' · page '+r.page;row.appendChild(t);
  const mk=(l,f)=>{const b=document.createElement('button');b.textContent=l;b.style.cssText='padding:4px 10px;min-height:36px';b.onclick=f;row.appendChild(b)};
  mk('Play',async()=>{try{if(au)au.pause();const b=await idbGetS('audio',r.id);if(!b)throw new Error('the recording file is missing');au=new Audio(URL.createObjectURL(b));await au.play()}catch(e){toast('Could not play ('+(e&&e.message||'error')+').',4000)}});
  mk('Save',async()=>{const b=await idbGetS('audio',r.id);if(!b)return toast('The recording file is missing.',4000);if(au)au.pause();o.remove();dl(b,nb.name+' audio '+new Date(r.at).toISOString().slice(0,16).replace(/[T:]/g,'-')+(String(b.type).includes('mp4')?'.m4a':'.webm'))});
  mk('Delete',async()=>{if(!confirm('Delete this recording?'))return;await idbDelS('audio',r.id).catch(()=>{});nb.recs=nb.recs.filter(x=>x!==r);save();if(au)au.pause();o.remove()});c.appendChild(row)});
 const x=document.createElement('button');x.textContent='Close';x.className='pri';x.onclick=()=>{if(au)au.pause();o.remove()};c.appendChild(x);o.appendChild(c);document.body.appendChild(o)};
const comp={x:300,y:500,a:0,on:false,R:150,d:()=>drawComp()};INS.push(comp);
function drawComp(){const n=comp,tx=n.x+Math.cos(n.a)*n.R,ty=n.y+Math.sin(n.a)*n.R;ctx.save();ctx.strokeStyle=ctx.fillStyle='#a78bfa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(tx,ty);ctx.stroke();ctx.setLineDash([4,6]);ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(n.x,n.y,n.R,0,7);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
 ctx.beginPath();ctx.arc(n.x,n.y,9,0,7);ctx.fill();ctx.fillStyle='#ecebf1';ctx.beginPath();ctx.arc(tx,ty,7,0,7);ctx.fill();ctx.fillStyle='#cfcbe0';ctx.font='12px system-ui';ctx.fillText('r '+(n.R/37.8).toFixed(1)+' cm',(n.x+tx)/2+8,(n.y+ty)/2-8);ctx.restore()}
$('#cmp').onclick=()=>showIns(comp,'#cmp',()=>{comp.x=PW/2-100;comp.y=(sy+cv.clientHeight/2)/S;comp.a=0;comp.R=150});
const bls=p=>nb.pages.map((q,j)=>(q.links||[]).some(l=>l.pid==p.id)?j+1:0).filter(Boolean);
function rloc(e,i,n){const b=rc.getBoundingClientRect(),RW=n.size?n.size.w:794,RH=n.size?n.size.h:1123,rs=rc.clientWidth/RW;return[(e.clientX-b.left)/rs,(e.clientY-b.top+rf.sy)/rs-12-i*(RH+24)]}
function rpage(e){const n=db.nbs[rf.i]||nb,RW=n.size?n.size.w:794,RH=n.size?n.size.h:1123,rs=rc.clientWidth/RW,yw=(e.clientY-rc.getBoundingClientRect().top+rf.sy)/rs;return{n,i:Math.max(0,Math.min(n.pages.length-1,Math.floor(yw/(RH+24))))}}
function rErase(e){const{n,i}=rpage(e),l=rloc(e,i,n),g=n.pages[i];g.strokes=g.strokes.filter(s=>!hit(s,l,er()+s.w/2));rfDraw()}
rc.onpointerdown=e=>{if(rc.setPointerCapture)rc.setPointerCapture(e.pointerId);if(e.pointerType=='touch'){ry=e.clientY;return}
 if(tool=='eraser'||tool=='area'){rEr=true;rErase(e);return}if(!TL[tool])return toast('Pick a pen, pencil, marker, highlighter or an eraser to write on this pane.',3000);
 const{n,i}=rpage(e);rlive={t:tool,c:color,w:size,op:opac,p:[[...rloc(e,i,n),pr(e),tl(e)]],i,n,o:n.pages[i]};rfDraw()};
rc.onpointermove=e=>{if(e.pointerType=='touch'){if(ry==null)return;rf.sy-=e.clientY-ry;ry=e.clientY;rfDraw();return}
 if(rEr){rErase(e);return}if(rlive){rlive.p.push([...rloc(e,rlive.i,rlive.n),pr(e),tl(e)]);rfDraw()}};
rc.onpointerup=rc.onpointercancel=()=>{ry=null;rEr=false;if(rlive){const s=rlive;rlive=null;if(s.p.length)s.n.pages[s.i].strokes.push({t:s.t,c:s.c,w:s.w,op:s.op,p:s.p});save();rfDraw()}else save()};

/* V4: recently deleted, grouped menus, PDF page range, first-run tour */
const allNbs=()=>[...db.nbs,...(db.bin||[]).map(b=>b.kind=='nb'?b.nb:{pages:[b.page],recs:[]})];
function purgeBin(){const n0=(db.bin||[]).length;db.bin=(db.bin||[]).filter(b=>Date.now()-b.at<30*864e5);if(db.bin.length!=n0){save();gcPdf();gcAudio()}}
function overlay(){const o=document.createElement('div'),c=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';c.style.cssText='background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:18px;max-width:460px;width:100%;max-height:85vh;overflow:auto;display:flex;flex-direction:column;gap:8px';o.appendChild(c);document.body.appendChild(o);return{o,c}}
function showBin(){const{o,c}=overlay(),B=db.bin||[];c.innerHTML='<b>Recently deleted</b><div class="pill" style="white-space:normal">Items stay here for 30 days, then are removed for good.</div>';
 if(!B.length)c.insertAdjacentHTML('beforeend','<div class="pill" style="white-space:normal;color:var(--tx)">Nothing here.</div>');
 B.forEach(b=>{const row=document.createElement('div'),t=document.createElement('span');row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';t.className='pill';t.style.cssText='flex:1;white-space:normal;color:var(--tx)';
  t.textContent=(b.kind=='nb'?'Notebook: '+b.nb.name:'Page from "'+b.name+'"')+' · '+Math.max(1,30-Math.floor((Date.now()-b.at)/864e5))+' days left';row.appendChild(t);
  const mk=(l,f)=>{const x=document.createElement('button');x.textContent=l;x.style.cssText='padding:4px 10px;min-height:36px';x.onclick=()=>{f();save();o.remove();home()};row.appendChild(x)};
  mk('Restore',()=>{db.bin=db.bin.filter(x=>x!==b);if(b.kind=='nb'){if(b.nb.folder&&!(db.folders||[]).some(f=>f.id==b.nb.folder))delete b.nb.folder;db.nbs.unshift(b.nb)}else{let n=db.nbs.find(x=>x.id==b.nbId);if(!n){n={id:uid(),name:b.name+' (restored)',pages:[]};db.nbs.unshift(n)}n.pages.push(b.page)}toast('Restored.',2500)});
  mk('Delete forever',()=>{if(!confirm('Delete this for good? This cannot be undone.'))return;db.bin=db.bin.filter(x=>x!==b);gcPdf();gcAudio()});c.appendChild(row)});
 const x=document.createElement('button');x.textContent='Close';x.className='pri';x.onclick=()=>o.remove();c.appendChild(x)}
$('#bin').onclick=showBin;
function tour(){if(db.tour)return;db.tour=true;save();if(db.nbs.length)return;const{o,c}=overlay();c.innerHTML='<b style="font-size:18px">Welcome to Aura Notes</b>'+['The pen writes. A finger scrolls the pages, and a quick swipe keeps them gliding.','Tools live in the menus on the top bar. Tap a menu name to see what is inside.','Need a colour that is not in the palette? Tap + Custom colour, next to the palette, and pick any colour.','Pages opens thumbnails, tags and bookmarks. Search on the home screen finds typed text and tags.','Deleted notebooks and pages wait in Recently deleted for 30 days. Use Backup or automatic backup to keep a copy of everything.'].map(t=>'<div class="pill" style="white-space:normal;color:var(--tx)">\u2022 '+t+'</div>').join('');const x=document.createElement('button');x.textContent='Got it';x.className='pri';x.onclick=()=>o.remove();c.appendChild(x)}
function mkGroup(barSel,label,sels,dyn){const bar=$(barSel),kids=sels.map(s=>bar.querySelector(s)).filter(Boolean);if(!kids.length)return;const wrap=document.createElement('span'),tg=document.createElement('button'),pop=document.createElement('div');wrap.style.cssText='flex-shrink:0';bar.insertBefore(wrap,kids[0]);pop.className='menu-pop';tg.className='gt';
 pop.style.cssText='position:fixed;display:none;flex-direction:column;gap:4px;padding:6px;background:var(--sf);border:1px solid var(--bd);border-radius:12px;z-index:15;max-height:70vh;overflow:auto';kids.forEach(k=>{k.style.textAlign='left';pop.appendChild(k)});wrap.append(tg,pop);
 const upd=()=>{const a=dyn&&kids.find(k=>k.classList.contains('on'));tg.textContent=(a?a.textContent:label)+' \u25be';tg.classList.toggle('on',!!a)};upd();if(dyn)kids.forEach(k=>new MutationObserver(upd).observe(k,{attributes:true,attributeFilter:['class']}));
 tg.onclick=e=>{e.stopPropagation();const was=pop.style.display=='flex';document.querySelectorAll('.menu-pop').forEach(p=>p.style.display='none');if(!was){const r=tg.getBoundingClientRect();pop.style.left=Math.max(4,Math.min(r.left,innerWidth-180))+'px';pop.style.top=(r.bottom+4)+'px';pop.style.display='flex'}};pop.addEventListener('click',()=>{pop.style.display='none'})}
addEventListener('click',()=>document.querySelectorAll('.menu-pop').forEach(p=>p.style.display='none'));
mkGroup('#ed .bar','Pens',['[data-t=pen]','[data-t=pencil]','[data-t=marker]','[data-t=highlighter]'],1);
mkGroup('#ed .bar','Erasers',['[data-t=eraser]','[data-t=area]'],1);
mkGroup('#ed .bar','Shapes',['[data-t=line]','[data-t=rect]','[data-t=ellipse]','[data-t=triangle]'],1);
mkGroup('#ed .bar','Insert',['[data-t=text]','[data-t=table]','[data-t=image]','[data-t=link]','[data-t=cover]'],1);
mkGroup('#ed .bar','Instruments',['#rl','#pr','#sq','#cmp'],1);
mkGroup('#opt','Page',['#pgs','#bm','#tg','#psz','#pp']);mkGroup('#opt','Export',['#ex','#xp']);mkGroup('#opt','Study',['#rec','#aud','#rpl','#cvall','#grf','#spl']);mkGroup('#opt','More',['#lkt','#cus','#px','#pt']);

/* V5: folders button, custom colour dialog, eraser size, full backup + safe restore */
let esz=4,prevT0=0;const er=()=>4+esz*2.5;
function szSync(){const e=tool=='eraser'||tool=='area';$('#sz').value=e?esz:size;$('#szl').textContent=e?'Eraser size':'Size'}
$('#nfd').onclick=()=>{const v=prompt('Folder name, for example Business Management','');if(!v||!v.trim())return;(db.folders=db.folders||[]).push({id:uid(),name:v.trim()});save();home()};
function customColour(){const{o,c}=overlay();c.innerHTML='<b>Custom colour</b><div class="pill" style="white-space:normal">Tap the big colour box to pick any colour, or type a hex code such as #7c5cdb. Then tap Use this colour.</div>';
 const inp=document.createElement('input'),hx=document.createElement('input'),row=document.createElement('div');inp.type='color';inp.value=/^#[0-9a-f]{6}$/i.test(color)?color:'#7c5cdb';inp.setAttribute('aria-label','Colour picker');inp.style.cssText='width:100%;height:72px;border:1px solid var(--bd);border-radius:12px;background:none;padding:2px';
 hx.type='text';hx.value=inp.value;hx.maxLength=7;hx.setAttribute('aria-label','Hex colour code');hx.style.cssText='background:var(--el);border:1px solid var(--bd);border-radius:10px;padding:10px;min-height:44px;font:16px monospace';
 inp.oninput=()=>{hx.value=inp.value};hx.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(hx.value))inp.value=hx.value};row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
 const paint=()=>{row.innerHTML='';const lb=document.createElement('span');lb.className='pill';lb.textContent='My colours:';row.appendChild(lb);(db.mine||[]).forEach(m=>{const b=document.createElement('button');b.className='sw';b.style.background=m;b.setAttribute('aria-label','Saved colour '+m);b.onclick=()=>{inp.value=m;hx.value=m};row.appendChild(b)});if(!(db.mine||[]).length){const e=document.createElement('span');e.className='pill';e.textContent='none saved yet';row.appendChild(e)}};paint();
 const btn=(t,f,pri)=>{const b=document.createElement('button');b.textContent=t;if(pri)b.className='pri';b.onclick=f;return b};
 c.append(inp,hx,row,btn('Use this colour',()=>{pick(inp.value);o.remove()},1),btn('Save to My colours',()=>{const v=inp.value.toLowerCase();db.mine=[v,...(db.mine||[]).filter(x=>x!==v)].slice(0,12);save();paint();rrec();toast('Saved to My colours.',1500)}),btn('Clear My colours',()=>{db.mine=[];save();paint();rrec()}),btn('Cancel',()=>o.remove()))}
$('#ccb').onclick=customColour;
function ask(title,msg,btns){return new Promise(res=>{const{o,c}=overlay(),t=document.createElement('b'),p=document.createElement('div');t.textContent=title;p.className='pill';p.style.cssText='white-space:pre-wrap;color:var(--tx)';p.textContent=msg;c.append(t,p);btns.forEach((x,i)=>{const b=document.createElement('button');b.textContent=x;if(i==0)b.className='pri';b.onclick=()=>{o.remove();res(i)};c.appendChild(b)})})}
const asBlob=b=>(b&&typeof b.size=='number'&&typeof b.slice=='function')?b:new Blob([b]);
async function buildBackup(full){const o={aura:2,at:Date.now(),db,pdfs:{},audio:{}};
 if(full){const pids=new Set(allNbs().flatMap(n=>n.pages.filter(p=>p.bg).map(p=>p.bg.id))),aids=new Set(allNbs().flatMap(n=>(n.recs||[]).map(r=>r.id)));
  for(const id of pids){const b=await idbGetS('pdf',id);if(b)o.pdfs[id]=await b64(asBlob(b))}
  for(const id of aids){const b=await idbGetS('audio',id);if(b){const k=asBlob(b);o.audio[id]={type:k.type||'audio/webm',data:await b64(k)}}}}
 return new Blob([JSON.stringify(o)],{type:'application/json'})}
$('#bk').onclick=async()=>{let full=false;const big=allNbs().some(n=>n.pages.some(p=>p.bg)||(n.recs||[]).length);
 if(big){const r=await ask('Backup','Your library has imported PDFs or audio recordings.\n\nFull backup includes them, so it is a bigger file.\nNotes only skips them and is smaller.',['Full backup','Notes only','Cancel']);if(r==2)return;full=r==0}
 try{toast('Preparing backup...',60000);dl(await buildBackup(full),'aura-notes-backup-'+new Date().toISOString().slice(0,10)+(full?'-full':'')+'.json')}catch(e){toast('Backup failed ('+(e&&e.message||'error')+'). Your notes are safe.',7000)}};
const readText=f=>f.text?f.text():new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsText(f)});
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function applyBackup(B,src,replace,useBin){
 for(const id in (B.pdfs||{}))await idbPutS('pdf',id,unb64(B.pdfs[id]).buffer);
 for(const id in (B.audio||{}))await idbPutS('audio',id,new Blob([unb64(B.audio[id].data)],{type:B.audio[id].type}));
 const D=B.db,add=JSON.parse(JSON.stringify(src));
 if(replace)db={...D,nbs:add,folders:D.folders||[],bin:(D.bin||[]).filter(b=>!(useBin&&b.kind=='nb'))};
 else{const have=new Set(db.nbs.map(n=>n.id));add.forEach(n=>{if(have.has(n.id)){n.id=uid();n.name+=' (restored)'}db.nbs.push(n)});db.folders=db.folders||[];(D.folders||[]).forEach(f=>{if(!db.folders.some(x=>x.id==f.id))db.folders.push(f)})}
 db.theme=db.theme||'dark';db.nbs.forEach(n=>{if(n.folder&&!(db.folders||[]).some(f=>f.id==n.folder))delete n.folder});noSave=false;curFolder=null;theme();
 if(!(await saveNow()))throw new Error('the notebooks could not be saved on this device');
 const chk=await idbS('data','readonly',o=>o.get('db'));if(!chk||chk.nbs.length!=db.nbs.length)throw new Error('the restored notebooks did not save');
 $('#q').value='';home();let missing=0;for(const n of add)if(n.pages.some(p=>p.bg&&!(B.pdfs||{})[p.bg.id])){const id=n.pages.find(p=>p.bg).bg.id;if(!(await idbGetS('pdf',id)))missing++}
 await ask('Restore complete',add.length+' notebook(s) restored ('+add.reduce((a,n)=>a+n.pages.length,0)+' pages). You now have '+db.nbs.length+' notebook(s) in your library.'+(missing?'\n\n'+missing+' document(s) were backed up without their PDF files. Open each one and import the PDF again to see the pages.':''),['OK'])}
$('#rsf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let raw;
 try{raw=JSON.parse(await readText(f))}catch(_){await ask('Could not restore','This file is not a readable Aura Notes backup, so nothing was changed. Choose a file named like aura-notes-backup.json.',['OK']);return}
 const B=raw&&raw.aura==2&&raw.db?raw:{aura:1,db:raw,pdfs:{},audio:{}},D=B.db;if(!D||!Array.isArray(D.nbs)){await ask('Could not restore','This file does not look like an Aura Notes backup, so nothing was changed.',['OK']);return}
 const okN=D.nbs.filter(n=>n&&Array.isArray(n.pages)),binN=(D.bin||[]).filter(b=>b&&b.kind=='nb'&&b.nb&&Array.isArray(b.nb.pages)).map(b=>b.nb),useBin=!okN.length&&binN.length>0,src=useBin?binN:okN;
 if(!src.length){await ask('Nothing to restore','This backup contains no notebooks, so nothing was changed.',['OK']);return}
 const np=Object.keys(B.pdfs||{}).length,na=Object.keys(B.audio||{}).length,nf=(D.folders||[]).length,skipped=D.nbs.length-okN.length;
 const msg='Backup from '+new Date(B.at||f.lastModified||Date.now()).toLocaleString()+'\n\n'+src.length+' notebook(s), '+src.reduce((a,n)=>a+n.pages.length,0)+' page(s)'+(nf?', '+nf+' folder(s)':'')+(np?', '+np+' PDF file(s)':'')+(na?', '+na+' recording(s)':'')+(useBin?'\n\nThese notebooks were in Recently deleted when the backup was made. They will be restored to your library.':'')+(skipped?'\n\n'+skipped+' damaged item(s) will be skipped.':'')+'\n\nYou currently have '+db.nbs.length+' notebook(s).\nMerge keeps them and adds the backup. Replace swaps everything for the backup.';
 const r=await ask('Restore backup',msg,['Merge with current','Replace everything','Cancel']);if(r==2)return;
 try{await applyBackup(B,src,r==1,useBin)}catch(err){await ask('Restore failed','Something went wrong ('+(err&&err.message||'error')+'). Please try again or choose another backup file.',['OK'])}};

init();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
