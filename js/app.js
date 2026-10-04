
const $=s=>document.querySelector(s),PW=794,PH=1123,uid=()=>Math.random().toString(36).slice(2,9);
const TL={pen:{a:1,w:1},pencil:{a:.6,w:.7},marker:{a:.95,w:2.5},highlighter:{a:.32,w:7}};
const PAL=['#1a1a22','#ecebf1','#7c5cdb','#2563eb','#16a34a','#dc2626','#f59e0b'];
let db,noSave=false,nb=null,pi=0,tool='pen',color='#1a1a22',size=3,view={x:0,y:0,k:1},hist=[],rdo=[],live=null,eraseAt=null;
let ruler={x:200,y:300,a:0,len:520,on:false},rmode=null,touches=new Map(),pinch=null,saveT;
const cv=$('#cv'),ctx=cv.getContext('2d');
function toast(m,ms=4000){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),ms)}
function load(){let raw=null;try{raw=localStorage.getItem('aura');db=JSON.parse(raw||'null')}catch(e){try{localStorage.setItem('aura_backup',raw)}catch(_){}noSave=true;toast('Saved data could not be read. Your stored copy is untouched and autosave is paused. Use Restore with a backup.',9000)}db=db||{nbs:[],theme:'dark',paper:'light'};theme()}
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{if(noSave)return;try{localStorage.setItem('aura',JSON.stringify(db))}catch(e){toast('Could not save: device storage is full. Your notes are still open here. Tap Backup to export them now.',8000)}},300)}
function theme(){document.documentElement.dataset.theme=db.theme}
const pg=()=>nb.pages[pi],pgObj=()=>({id:uid(),tpl:'ruled',strokes:[]});
/* HOME */
function home(){const q0=$('#q').value.trim();if(q0){$('#home').classList.add('show');$('#ed').classList.remove('show');return search(q0.toLowerCase())}$('#home').classList.add('show');$('#ed').classList.remove('show');const h=new Date().getHours();$('#greet').textContent=h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';
 const l=$('#list');l.innerHTML='';
 if(!db.nbs.length){l.innerHTML='<div class="empty"><b>No notebooks yet</b>Your workspace is ready. Create your first notebook.</div>';return}
 const g=document.createElement('div');g.className='grid';
 db.nbs.forEach(n=>{const c=document.createElement('div');c.className='card';c.innerHTML=`<div><b></b><br><small>${n.pages.length} page${n.pages.length>1?'s':''}</small></div><div class="row"><button data-a="ren">Rename</button><button data-a="dup">Duplicate</button><button data-a="del">Delete</button></div>`;
  c.querySelector('b').textContent=n.name;
  c.onclick=e=>{const a=e.target.dataset.a;if(!a)return open(n);
   if(a=='ren'){const v=prompt('Rename notebook',n.name);if(v&&v.trim()){n.name=v.trim();save();home()}}
   if(a=='dup'){const d=JSON.parse(JSON.stringify(n));d.id=uid();d.name+=' copy';d.pages.forEach(p=>p.id=uid());db.nbs.push(d);save();home()}
   if(a=='del'&&confirm(`Delete "${n.name}" and all its pages? This cannot be undone.`)){db.nbs=db.nbs.filter(x=>x!==n);save();home()}};
  g.appendChild(c)});l.appendChild(g)}
$('#newNb').onclick=()=>{const v=prompt('Notebook name','New notebook');if(!v)return;const n={id:uid(),name:v.trim()||'Untitled',pages:[pgObj()]};db.nbs.unshift(n);save();open(n)};
$('#thm').onclick=()=>{db.theme=db.theme=='dark'?'light':'dark';theme();save()};
$('#bk').onclick=()=>{dl(new Blob([JSON.stringify(db)],{type:'application/json'}),'aura-notes-backup.json');toast('Backup downloaded.')};
$('#rs').onclick=()=>$('#rsf').click();
$('#rsf').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.nbs))throw 0;if(!confirm('Replace current notebooks with this backup?'))return;db=d;noSave=false;theme();save();home();toast('Backup restored.')}catch(_){toast('That file is not a valid Aura Notes backup. Nothing was changed.')}e.target.value=''};
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
/* EDITOR */
const GAP=24,SH=['line','rect','ellipse','triangle'];
let z=1,ox=0,sy=0,S=1,lock=false,wt,sel=null,gest=null,loop=null;
const Sc=()=>Math.max(cv.clientWidth,1)/PW*z,pTop=i=>12+i*(PH+GAP),totH=()=>pTop(nb.pages.length)-GAP+80,maxY=()=>Math.max(0,totH()*Sc()-cv.clientHeight);
function clampV(soft){S=Sc();const pw=PW*S,cw=cv.clientWidth;ox=pw<=cw+1?(cw-pw)/2:Math.max(cw-pw,Math.min(0,ox));sy=Math.max(0,Math.min(maxY()+(soft?160:0),sy))}
const pageAt=y=>Math.max(0,Math.min(nb.pages.length-1,Math.floor((y-12+GAP/2)/(PH+GAP)))),curPg=()=>pageAt((sy+cv.clientHeight/2)/S);
const W=(e,b=cv.getBoundingClientRect())=>[(e.clientX-b.left-ox)/S,(e.clientY-b.top+sy)/S];
function open(n){nb=n;$('#home').classList.remove('show');$('#ed').classList.add('show');$('#nm').textContent=n.name;INS.forEach(n=>n.on=false);['#rl','#pr','#sq'].forEach(q=>$(q).classList.remove('on'));z=1;sy=0;hist=[];rdo=[];$('#pp').textContent='Paper: '+db.paper;setTool('pen');sizeCv()}
function sizeCv(){const s=$('#stage'),d=devicePixelRatio||1;cv.width=s.clientWidth*d;cv.height=s.clientHeight*d;clampV();draw()}
function setTool(t){prevT=tool;tool=t;if(t!='lasso')sel=null;if(t!='table')tsel=null;if(t!='image')isel=null;selUI();document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==t));$('#cols').parentElement.style.opacity=t=='eraser'?.4:1;draw()}
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('#rl').onclick=()=>{ruler.on=!ruler.on;$('#rl').classList.toggle('on',ruler.on);if(ruler.on){ruler.len=Math.min(520,PW-80);ruler.x=(PW-ruler.len)/2;ruler.y=(sy+cv.clientHeight/2)/S;ruler.a=0}draw()};
PAL.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c==color?' on':'');b.style.background=c;b.setAttribute('aria-label','Colour '+c);b.onclick=()=>pick(c);$('#cols').appendChild(b)});
const rgb=s=>{const m=s.match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):s};
function pick(c){color=c;document.querySelectorAll('.sw').forEach(s=>s.classList.toggle('on',rgb(s.style.background)==c));if(tool=='eraser')setTool('pen')}
$('#cc').oninput=e=>pick(e.target.value);$('#sz').oninput=e=>size=+e.target.value;
$('#nm').onclick=()=>{const v=prompt('Rename notebook',nb.name);if(v&&v.trim()){nb.name=v.trim();$('#nm').textContent=nb.name;save()}};
$('#back').onclick=()=>{save();home()};$('#un').onclick=undo;$('#re').onclick=redo;$('#fit').onclick=()=>{z=1;draw()};
const st=i=>({i,s:nb.pages[i].strokes.slice(),t:(nb.pages[i].texts||[]).map(x=>({...x})),b:(nb.pages[i].tables||[]).map(x=>JSON.parse(JSON.stringify(x))),m:(nb.pages[i].images||[]).map(x=>({...x}))}),rs=h=>{const g=nb.pages[h.i];g.strokes=h.s;g.texts=h.t;g.tables=h.b;g.images=h.m};
function snap(i){hist.push(st(i));if(hist.length>200)hist.shift();rdo=[]}
function undo(){sel=tsel=isel=null;selUI();const h=hist.pop();if(!h)return;rdo.push(st(h.i));rs(h);save();draw()}
function redo(){sel=tsel=isel=null;selUI();const h=rdo.pop();if(!h)return;hist.push(st(h.i));rs(h);save();draw()}
addEventListener('keydown',e=>{if(!$('#ed').classList.contains('show'))return;if((e.ctrlKey||e.metaKey)&&e.key=='z'){e.preventDefault();e.shiftKey?redo():undo()}});
$('#dp').onclick=()=>{if(nb.pages.length<2)return toast('A notebook needs at least one page.');if(!confirm('Delete this page and its handwriting?'))return;nb.pages.splice(curPg(),1);sel=tsel=isel=null;selUI();hist=[];rdo=[];save();draw()};
$('#tp').onchange=e=>{nb.pages[curPg()].tpl=e.target.value;save();draw()};
$('#pp').onclick=()=>{db.paper=db.paper=='light'?'dark':'light';$('#pp').textContent='Paper: '+db.paper;save();draw()};
$('#ex').onclick=()=>{const c=document.createElement('canvas');c.width=PW*2;c.height=PH*2;const x=c.getContext('2d');x.scale(2,2);drawPage(x,nb.pages[curPg()]);c.toBlob(b=>{dl(b,nb.name+'-page'+(curPg()+1)+'.png');toast('Page exported as PNG.')})};
function addPage(){const l=nb.pages[nb.pages.length-1];nb.pages.push({...pgObj(),tpl:l.tpl});hist=[];rdo=[];save();clampV();sy=Math.min(maxY(),(pTop(nb.pages.length-1)-12)*S);draw();toast('Page added.',1500)}
function settle(){const m=maxY();if(sy>m+80)addPage();else if(sy>m){sy=m;draw()}}
/* RENDER */
function drawPage(c,pgo,o){const dk=db.paper=='dark';c.fillStyle=dk?'#1b1b21':'#fbfaf7';c.fillRect(0,0,PW,PH);if(pgo.bg&&!(o&&o.nobg)){const b=(o&&o.bgc)||bgGet(pgo.bg.id,pgo.bg.n);if(b){const k=Math.min(PW/b.width,PH/b.height),w=b.width*k,h=b.height*k;c.drawImage(b,(PW-w)/2,(PH-h)/2,w,h)}}
 c.strokeStyle=dk?'#34343f':'#d3d8e4';c.fillStyle=c.strokeStyle;c.lineWidth=1;const t=pgo.tpl;c.beginPath();
 if(t=='ruled')for(let y=96;y<PH-30;y+=32){c.moveTo(0,y);c.lineTo(PW,y)}
 if(t=='grid'){for(let y=24;y<PH;y+=24){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=24;x<PW;x+=24){c.moveTo(x,0);c.lineTo(x,PH)}}
 c.stroke();
 if(t=='dot')for(let y=24;y<PH;y+=24)for(let x=24;x<PW;x+=24)c.fillRect(x-1,y-1,2,2);
 drawObjs(c,pgo);pgo.strokes.forEach(s=>stroke(c,s));c.save();c.textBaseline='top';(pgo.texts||[]).forEach(t=>{c.font=t.sz+'px system-ui';c.fillStyle=t.c;t.txt.split('\n').forEach((l,k)=>c.fillText(l,t.x,t.y+k*t.sz*1.3))});c.restore();if(live&&live.o===pgo)stroke(c,live)}
function stroke(c,s){const t=TL[s.t],p=s.p;c.save();c.globalAlpha=t.a;c.strokeStyle=c.fillStyle=s.c;c.lineCap=c.lineJoin='round';const w=s.w*t.w;
 if(p.length<2){c.beginPath();c.arc(p[0][0],p[0][1],w/2,0,7);c.fill()}
 else if(s.t=='pen'){for(let i=1;i<p.length;i++){c.lineWidth=w*(.45+p[i][2]*1.1);c.beginPath();c.moveTo(p[i-1][0],p[i-1][1]);c.lineTo(p[i][0],p[i][1]);c.stroke()}}
 else{c.lineWidth=w;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length-1;i++){const m=[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2];c.quadraticCurveTo(p[i][0],p[i][1],m[0],m[1])}c.lineTo(p[p.length-1][0],p[p.length-1][1]);c.stroke()}
 c.restore()}
let rq=0;function draw(){cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{if(!nb)return;clampV(true);const d=devicePixelRatio||1,ch=cv.clientHeight;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 nb.pages.forEach((p,i)=>{const t=pTop(i)*S-sy;if(t>ch||t+PH*S<0)return;ctx.setTransform(d*S,0,0,d*S,d*ox,d*t);ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=20;ctx.fillStyle='#000';ctx.fillRect(0,0,PW,PH);ctx.restore();ctx.save();ctx.beginPath();ctx.rect(0,0,PW,PH);ctx.clip();drawPage(ctx,p);ctx.restore()});
 ctx.setTransform(d*S,0,0,d*S,d*ox,-d*sy);INS.forEach(n=>{if(n.on)n.d()});drawSel();drawOS();
 if(eraseAt){ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5/S;ctx.beginPath();ctx.arc(eraseAt[0],eraseAt[1],14,0,7);ctx.stroke()}
 ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--t2');ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(sy-maxY()>80?'Release to add a page':'Keep scrolling to add a page',cv.clientWidth/2,(pTop(nb.pages.length)-GAP+40)*S-sy);ctx.textAlign='left';
 const c=curPg();$('#pn').textContent=`Page ${c+1} of ${nb.pages.length}`;$('#bm').classList.toggle('on',!!nb.pages[c].bm);if($('#tp').value!=nb.pages[c].tpl)$('#tp').value=nb.pages[c].tpl;
 $('#rinfo').textContent=ruler.on?`Ruler ${Math.round(((ruler.a*180/Math.PI)%360+360)%360)}°`:''})}
function drawRuler(){const r=ruler;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.globalAlpha=.88;ctx.fillStyle='#2a2833';ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(0,0,r.len,56);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#cfcbe0';ctx.fillStyle='#cfcbe0';ctx.font='10px system-ui';ctx.beginPath();
 for(let i=0,u=0;u<=r.len;i++,u=i*3.78){const cm=i%10==0,h=cm?16:i%5==0?11:6;ctx.moveTo(u,0);ctx.lineTo(u,h);if(cm)ctx.fillText(i/10,u+2,28)}ctx.stroke();
 ctx.fillStyle='#a78bfa';ctx.beginPath();ctx.arc(r.len-18,28,9,0,7);ctx.fill();ctx.restore()}
/* INPUT */
const loc=(p,n=ruler)=>{const dx=p[0]-n.x,dy=p[1]-n.y,c=Math.cos(n.a),s=Math.sin(n.a);return[dx*c+dy*s,-dx*s+dy*c]};
const proj=(p,n=ruler)=>{const[u]=loc(p,n);return[n.x+u*Math.cos(n.a),n.y+u*Math.sin(n.a)]};
const nearEdge=p=>{let b=null,bd=28/S+6;INS.forEach(n=>{if(n.on)edges(n).forEach(e=>{const d=Math.abs(loc(p,e)[1]);if(d<bd){bd=d;b=e}})});return b};
const pr=e=>e.pointerType=='pen'&&e.pressure>0?e.pressure:.5;
const fing=()=>{const a=[...touches.values()];return{d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])||1,ang:Math.atan2(a[1][1]-a[0][1],a[1][0]-a[0][0]),cx:(a[0][0]+a[1][0])/2,cy:(a[0][1]+a[1][1])/2}};
const sp=(t,a,b)=>{let r;const[x,y]=a,[u,v]=b;if(t=='line')r=[a,b];else if(t=='rect')r=[a,[u,y],b,[x,v],a];else if(t=='triangle')r=[[(x+u)/2,y],b,[x,v],[(x+u)/2,y]];else{r=[];for(let k=0;k<=48;k++){const g=k/48*6.2832;r.push([(x+u)/2+Math.cos(g)*(u-x)/2,(y+v)/2+Math.sin(g)*(v-y)/2])}}return r.map(q=>[q[0],q[1],.5])};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);
 if(e.pointerType=='touch'){touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){rmode=null;const p=W(e),n=[...INS].reverse().find(n=>n.on&&hitIns(n,p));if(n)rmode={t:'mv',id:e.pointerId,n,o:[p[0]-n.x,p[1]-n.y]}}
  else if(touches.size==2){const f=fing();if(rmode)rmode={t:'rot',n:rmode.n,a0:f.ang,ra:rmode.n.a};else{const b=cv.getBoundingClientRect();pinch={...f,z,w:[(f.cx-b.left-ox)/S,(f.cy-b.top+sy)/S]}}}
  return}
 const p=W(e),i=pageAt(p[1]);
 if(tool=='table'){tableDown(p,i);return}
 if(tool=='image'){imgDown(p,i);return}
 if(tool=='text'){textDown(p,i);return}
 if(tool=='lasso'){if(sel){const h=selHit(p);if(h){startG(h,p);return}}sel=null;selUI();loop={i,p:[[p[0],p[1]]]};draw();return}
 if(tool=='eraser'){snap(i);eraseAt=p;erase(p);return}
 const sn=nearEdge(p),q=sn?proj(p,sn):p,l=[q[0],q[1]-pTop(i),pr(e)],sh=SH.includes(tool);
 live={t:sh?'pen':tool,c:color,w:size,p:[l],sn,i,o:nb.pages[i],sh:sh?tool:0,a:l};draw()});
cv.addEventListener('pointermove',e=>{
 if(e.pointerType=='touch'){const o=touches.get(e.pointerId);if(!o)return;const dx=e.clientX-o[0],dy=e.clientY-o[1];touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){if(rmode&&rmode.t=='mv'&&rmode.id==e.pointerId){const p=W(e);rmode.n.x=p[0]-rmode.o[0];rmode.n.y=p[1]-rmode.o[1]}else if(!lock&&!rmode){sy-=dy;if(z>1)ox+=dx}}
  else if(touches.size==2){const f=fing();
   if(rmode&&rmode.t=='rot'){const n=rmode.n,c=cen(n);n.a=rmode.ra+f.ang-rmode.a0;const c2=cen(n);n.x+=c[0]-c2[0];n.y+=c[1]-c2[1]}
   else if(pinch){const b=cv.getBoundingClientRect();z=Math.max(1,Math.min(2.5,pinch.z*f.d/pinch.d));S=Sc();sy=pinch.w[1]*S-(f.cy-b.top);ox=f.cx-b.left-pinch.w[0]*S}}
  draw();return}
 const p=W(e);
 if(tb){tbMove(p);return}
 if(ig){igMove(p);return}
 if(tg){textMove(p);return}
 if(gest){applyG(p);draw();return}
 if(loop){loop.p.push([p[0],p[1]]);draw();return}
 if(tool=='eraser'&&eraseAt){eraseAt=p;erase(p);return}
 if(live){const T=live.i;if(live.sh)live.p=sp(live.sh,live.a,[p[0],p[1]-pTop(T)]);else(e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(ev=>{const w=W(ev),q=live.sn?proj(w,live.sn):w;live.p.push([q[0],q[1]-pTop(T),pr(ev)])});draw()}});
function end(e){
 if(e.pointerType=='touch'){touches.delete(e.pointerId);if(touches.size==1){lock=true;pinch=null;if(rmode&&rmode.t=='rot')rmode=null}if(!touches.size){lock=false;rmode=null;pinch=null;settle()}return}
 if(tb){tbEnd();return}
 if(ig){igEnd();return}
 if(tg){textEnd();return}
 if(gest){gest=null;save();draw();return}
 if(loop){endLoop();return}
 if(eraseAt){eraseAt=null;save();draw()}
 if(live){const s=live;live=null;snap(s.i);nb.pages[s.i].strokes.push({t:s.t,c:s.c,w:s.w,p:s.p});save();draw()}}
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
cv.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey){const b=cv.getBoundingClientRect(),wx=(e.clientX-b.left-ox)/S,wy=(e.clientY-b.top+sy)/S;z=Math.max(1,Math.min(2.5,z*(e.deltaY<0?1.1:.91)));S=Sc();sy=wy*S-(e.clientY-b.top);ox=e.clientX-b.left-wx*S}else{sy+=e.deltaY;ox-=e.deltaX}draw();clearTimeout(wt);wt=setTimeout(settle,220)},{passive:false});
function erase(p){const i=pageAt(p[1]),q=[p[0],p[1]-pTop(i)],pg_=nb.pages[i];pg_.strokes=pg_.strokes.filter(s=>!hit(s,q,14+s.w/2));draw()}
function hit(s,p,r){const q=s.p;if(q.length==1)return Math.hypot(q[0][0]-p[0],q[0][1]-p[1])<r;
 for(let i=1;i<q.length;i++){const[x1,y1]=q[i-1],[x2,y2]=q[i],dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-x1)*dx+(p[1]-y1)*dy)/l));if(Math.hypot(x1+t*dx-p[0],y1+t*dy-p[1])<r)return true}return false}
addEventListener('resize',()=>{if($('#ed').classList.contains('show'))sizeCv()});

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
 sel.l.forEach((st,k)=>{const g=gest.o[k];st.w=g.w*f;st.p=g.p.map(q=>{if(h=='m')return[q[0]+l[0]-s[0],q[1]+l[1]-s[1],q[2]];const x=(q[0]-c[0])*f,y=(q[1]-c[1])*f;return[c[0]+x*co-y*si,c[1]+x*si+y*co,q[2]]})})}
function pip(q,P){let r=false;for(let i=0,j=P.length-1;i<P.length;j=i++){if((P[i][1]>q[1])!=(P[j][1]>q[1])&&q[0]<(P[j][0]-P[i][0])*(q[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0])r=!r}return r}
function endLoop(){const o=pTop(loop.i),P=loop.p.map(q=>[q[0],q[1]-o]),l=nb.pages[loop.i].strokes.filter(s=>s.p.filter(q=>pip(q,P)).length>=s.p.length/2);sel=l.length&&P.length>2?{i:loop.i,l}:null;loop=null;selUI();if(!sel)toast('Draw a loop around the handwriting you want to select.',2500);draw()}
function drawSel(){ctx.save();ctx.strokeStyle=ctx.fillStyle='#a78bfa';ctx.lineWidth=1.5/S;ctx.setLineDash([6/S,4/S]);
 if(loop){ctx.beginPath();loop.p.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke()}
 if(sel){const b=selBox(),r=9/S,hx=(b.x1+b.x2)/2,hy=b.y1-30/S;ctx.strokeRect(b.x1,b.y1,b.x2-b.x1,b.y2-b.y1);ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(hx,b.y1);ctx.lineTo(hx,hy);ctx.stroke();[[hx,hy],[b.x2,b.y2]].forEach(q=>{ctx.beginPath();ctx.arc(q[0],q[1],r,0,7);ctx.fill()})}ctx.restore()}
$('#sdup').onclick=()=>{if(!sel)return;snap(sel.i);const g=nb.pages[sel.i],c=sel.l.map(s=>({...s,p:s.p.map(q=>[q[0]+24,q[1]+24,q[2]])}));g.strokes=g.strokes.concat(c);sel.l=c;save();draw()};
$('#sdel').onclick=()=>{if(!sel)return;snap(sel.i);const g=nb.pages[sel.i];g.strokes=g.strokes.filter(s=>!sel.l.includes(s));sel=null;selUI();save();draw()};

/* TEXT + PROTRACTOR + SET SQUARE */
let tg=null;
const prot={x:397,y:400,a:0,on:false,R:170,d:()=>drawProt()},sq={x:300,y:400,a:0,on:false,L:240,d:()=>drawSq()};ruler.d=drawRuler;
const INS=[ruler,prot,sq],ptL=(n,u,v)=>[n.x+u*Math.cos(n.a)-v*Math.sin(n.a),n.y+u*Math.sin(n.a)+v*Math.cos(n.a)];
const cen=n=>n===ruler?[n.x+Math.cos(n.a)*n.len/2,n.y+Math.sin(n.a)*n.len/2]:n===prot?[n.x,n.y]:ptL(n,n.L/3,n.L/3);
function hitIns(n,p){const[u,v]=loc(p,n);return n===ruler?(u>=-10&&u<=n.len+10&&v>=-10&&v<=66):n===prot?(Math.hypot(u,v)<n.R+10&&v<=14):(u>=-10&&v>=-10&&u+v<=n.L+14)}
function edges(n){const e={x:n.x,y:n.y,a:n.a};if(n!==sq)return[e];const h=ptL(n,n.L,0);return[e,{x:n.x,y:n.y,a:n.a+Math.PI/2},{x:h[0],y:h[1],a:n.a+3*Math.PI/4}]}
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
 const dk=db.paper=='dark';(pgo.tables||[]).forEach(t=>{c.save();c.strokeStyle=dk?'#6f6c80':'#8a8799';c.fillStyle=dk?'#ecebf1':'#1a1a22';c.lineWidth=1.2;c.font='15px system-ui';c.textBaseline='middle';let y=t.y;t.rh.forEach((h,r)=>{let x=t.x;t.cw.forEach((w,k)=>{c.strokeRect(x,y,w,h);const v=t.cells[r][k];if(v)c.fillText(v,x+6,y+h/2,w-12);x+=w});y+=h});c.restore()})}
function drawOS(){ctx.save();ctx.strokeStyle=ctx.fillStyle='#a78bfa';ctx.lineWidth=2/S;
 if(tsel){const t=tsel.t,o=pTop(tsel.i);let x=t.x,y=t.y+o;for(let k=0;k<tsel.c;k++)x+=t.cw[k];for(let k=0;k<tsel.r;k++)y+=t.rh[k];ctx.strokeRect(x,y,t.cw[tsel.c],t.rh[tsel.r])}
 if(isel){const m=isel.m,o=pTop(isel.i);ctx.strokeRect(m.x,m.y+o,m.w,m.h);ctx.beginPath();ctx.arc(m.x+m.w,m.y+m.h+o,9/S,0,7);ctx.fill()}ctx.restore()}
const tHit=(t,l)=>{let x=l[0]-t.x,y=l[1]-t.y,c=-1,r=-1;if(x<0||y<0)return null;for(let k=0;k<t.cw.length;k++){if(x<t.cw[k]){c=k;break}x-=t.cw[k]}for(let k=0;k<t.rh.length;k++){if(y<t.rh[k]){r=k;break}y-=t.rh[k]}return c<0||r<0?null:{r,c}};
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
function goPage(i){clampV();sy=Math.min(maxY(),(pTop(i)-12)*S);draw()}
function editPage(i){const p=nb.pages[i],t=prompt('Page title',p.title||'');if(t===null)return;const g=prompt('Tags, comma separated (e.g. EXAM, FORMULA, REVISION)',(p.tags||[]).join(', '));p.title=t.trim();if(g!==null)p.tags=[...new Set(g.split(',').map(x=>x.trim().replace(/^#/,'').toUpperCase().replace(/[^A-Z0-9_-]/g,'')).filter(Boolean))];save();renderPnl()}
function renderPnl(){const tags=[...new Set(nb.pages.flatMap(p=>p.tags||[]))].sort();
 pnl.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><b style="flex:1">Pages</b><button id="pcl">Close</button></div><select id="pfs"><option value="">All pages</option><option value="*bm">Bookmarked</option>${tags.map(t=>`<option value="${t}">#${t}</option>`).join('')}</select><div id="pls" style="overflow:auto;display:flex;flex-direction:column;gap:6px"></div>`;
 const fs=pnl.querySelector('#pfs'),L=pnl.querySelector('#pls');fs.value=pf;fs.onchange=()=>{pf=fs.value;renderPnl()};pnl.querySelector('#pcl').onclick=()=>pnl.style.display='none';let n=0;
 nb.pages.forEach((p,i)=>{if(pf=='*bm'?!p.bm:pf&&!(p.tags||[]).includes(pf))return;
  const r=document.createElement('div');r.style.cssText='display:flex;gap:8px;align-items:flex-start';
  if(n++<80){const c=document.createElement('canvas');c.width=60;c.height=85;c.style.cssText='border:1px solid var(--bd);border-radius:4px;flex-shrink:0';const x=c.getContext('2d');x.scale(60/PW,85/PH);drawPage(x,p,{nobg:1});r.appendChild(c)}
  const col=document.createElement('div');col.style.cssText='flex:1;display:flex;flex-direction:column;gap:5px;min-width:0';
  const b=document.createElement('button');b.style.cssText='text-align:left;overflow:hidden;text-overflow:ellipsis';b.textContent=`${i+1}. ${p.title||'Untitled page'}${(p.tags||[]).length?'  '+p.tags.map(t=>'#'+t).join(' '):''}`;b.onclick=()=>{goPage(i);pnl.style.display='none'};
  const r2=document.createElement('div');r2.style.cssText='display:flex;gap:5px';
  const mk=(t,f,al)=>{const x=document.createElement('button');x.textContent=t;x.style.cssText='padding:3px 9px;min-height:34px;flex:1';x.setAttribute('aria-label',al||t);x.onclick=f;r2.appendChild(x)};
  mk(p.bm?'★':'☆',()=>{p.bm=!p.bm;save();renderPnl();draw()},'Toggle bookmark');mk('Edit',()=>editPage(i));mk('▲',()=>mvPage(i,-1),'Move up');mk('▼',()=>mvPage(i,1),'Move down');mk('Copy',()=>dupPage(i),'Duplicate page');mk('+',()=>insPage(i),'Insert blank page after');
  col.append(b,r2);r.appendChild(col);L.appendChild(r)});
 if(!L.children.length)L.innerHTML='<div class="empty" style="margin:0"><b>Nothing here</b>No pages match this filter.</div>'}
$('#pgs').onclick=()=>{pf='';renderPnl();pnl.style.display='flex'};
$('#tg').onclick=()=>editPage(curPg());
$('#bm').onclick=()=>{const p=nb.pages[curPg()];p.bm=!p.bm;save();draw();toast(p.bm?'Page bookmarked.':'Bookmark removed.',1200)};
function search(q){const l=$('#list');l.innerHTML='';const R=[],tq=q.replace(/^#/,'');
 db.nbs.forEach(n=>{if(n.name.toLowerCase().includes(q))R.push([n,0,'Notebook name']);
  n.pages.forEach((p,i)=>{const tx=(p.texts||[]).map(t=>t.txt).concat((p.tables||[]).flatMap(t=>t.cells.flat())).join(' ').toLowerCase();let w=null;
   if((p.title||'').toLowerCase().includes(q))w='Page title';else if((p.tags||[]).some(t=>t.toLowerCase().includes(tq)))w='Tag';else if(tx.includes(q))w='Typed text';
   if(w)R.push([n,i,w,p])})});
 if(!R.length){l.innerHTML='<div class="empty"><b>No matches</b>Search covers notebook names, page titles, tags and typed text. Handwriting is not searchable.</div>';return}
 R.forEach(([n,i,w,p])=>{const c=document.createElement('div');c.className='card';c.style.cssText='min-height:0;margin-top:10px';c.innerHTML='<div><b></b><br><small></small></div>';c.querySelector('b').textContent=n.name+(w=='Notebook name'?'':' · page '+(i+1)+(p&&p.title?' · '+p.title:''));c.querySelector('small').textContent=w;c.onclick=()=>{open(n);goPage(i)};l.appendChild(c)})}
$('#q').oninput=()=>{const v=$('#q').value.trim();if(v)search(v.toLowerCase());else home()};

/* PDF IMPORT / ANNOTATE / EXPORT + PAGE MANAGEMENT */
let PL=null,bgErr=false;const PD={},BG={},bgo=[];
const pdfLib=()=>PL||(PL=import('./js/lib/pdf.min.js').then(m=>{m.GlobalWorkerOptions.workerSrc='./js/lib/pdf.worker.min.js';return m}));
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('aura',1);r.onupgradeneeded=()=>r.result.createObjectStore('pdf');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idbPut=async(k,v)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('pdf','readwrite');t.objectStore('pdf').put(v,k);t.oncomplete=ok;t.onerror=()=>no(t.error)})};
const idbGet=async k=>{const d=await idb();return new Promise((ok,no)=>{const r=d.transaction('pdf').objectStore('pdf').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})};
const getDoc=id=>PD[id]||(PD[id]=(async()=>{const buf=await idbGet(id);if(!buf)throw new Error('the PDF file is missing from this device');const m=await pdfLib();return m.getDocument({data:new Uint8Array(buf.slice(0))}).promise})());
async function bgCanvas(id,n){const d=await getDoc(id),pg=await d.getPage(n),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:2*Math.min(PW/v0.width,PH/v0.height)}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await pg.render({canvasContext:c.getContext('2d'),viewport:v}).promise;return c}
function bgGet(id,n){const k=id+':'+n;if(k in BG)return BG[k].c;BG[k]={c:null};bgCanvas(id,n).then(c=>{BG[k]={c};bgo.push(k);while(bgo.length>6)delete BG[bgo.shift()];draw()}).catch(err=>{if(!bgErr){bgErr=true;toast('A PDF page could not be displayed ('+(err&&err.message||'error')+'). Your annotations are safe.',7000)}});return null}
$('#ipdf').onclick=()=>$('#pdfi').click();
$('#pdfi').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;toast('Importing PDF…',60000);
 try{const buf=await f.arrayBuffer(),m=await pdfLib(),d=await m.getDocument({data:new Uint8Array(buf.slice(0))}).promise,id=uid();await idbPut(id,buf);
  const n={id:uid(),name:f.name.replace(/\.pdf$/i,''),pages:Array.from({length:d.numPages},(_,i)=>({...pgObj(),tpl:'blank',bg:{id,n:i+1}}))};db.nbs.unshift(n);save();toast('PDF imported: '+d.numPages+' pages.',3000);open(n)}
 catch(err){toast('That PDF could not be imported ('+(err&&err.message||'unknown error')+'). Nothing was changed.',8000)}};
function makePdf(P){const enc=new TextEncoder(),ch=[],off=[];let len=0;const put=b=>{const u=typeof b=='string'?enc.encode(b):b;ch.push(u);len+=u.length};
 const obj=(n,fn)=>{off[n]=len;put(n+' 0 obj\n');fn();put('\nendobj\n')};
 put('%PDF-1.4\n');const N=P.length,kids=P.map((_,i)=>(3+i*3)+' 0 R').join(' ');
 obj(1,()=>put('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>put(`<< /Type /Pages /Count ${N} /Kids [${kids}] >>`));
 P.forEach((p,i)=>{const a=3+i*3,c=a+1,im=a+2,cs='q 595 0 0 842 0 0 cm /Im0 Do Q';
  obj(a,()=>put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`));
  obj(c,()=>put(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  obj(im,()=>{put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.b.length} >>\nstream\n`);put(p.b);put('\nendstream')})});
 const xo=len,T=3+N*3;put(`xref\n0 ${T}\n0000000000 65535 f \n`);for(let n=1;n<T;n++)put(String(off[n]).padStart(10,'0')+' 00000 n \n');put(`trailer\n<< /Size ${T} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`);return new Blob(ch,{type:'application/pdf'})}

async function exportPdf(){toast('Building PDF…',60000);
 try{const J=[];for(let i=0;i<nb.pages.length;i++){const p=nb.pages[i],c=document.createElement('canvas');c.width=PW*2;c.height=PH*2;const x=c.getContext('2d');x.scale(2,2);const bgc=p.bg?await bgCanvas(p.bg.id,p.bg.n):null;drawPage(x,p,{bgc,nobg:!bgc});
  J.push({w:c.width,h:c.height,b:Uint8Array.from(atob(c.toDataURL('image/jpeg',.88).split(',')[1]),q=>q.charCodeAt(0))})}
  dl(makePdf(J),nb.name+'.pdf');toast('PDF exported ('+J.length+' pages).',3000)}
 catch(err){toast('PDF export failed ('+(err&&err.message||'error')+'). Your notes are safe and unchanged.',8000)}}
$('#xp').onclick=exportPdf;
const pgReset=()=>{hist=[];rdo=[];sel=tsel=isel=null;selUI();save();renderPnl();draw()};
function mvPage(i,d){const j=i+d;if(j<0||j>=nb.pages.length)return;[nb.pages[i],nb.pages[j]]=[nb.pages[j],nb.pages[i]];pgReset()}
function dupPage(i){const c=JSON.parse(JSON.stringify(nb.pages[i]));c.id=uid();nb.pages.splice(i+1,0,c);pgReset()}
function insPage(i){const p=nb.pages[i];nb.pages.splice(i+1,0,{...pgObj(),tpl:p.bg?'blank':p.tpl});pgReset()}
load();home();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
