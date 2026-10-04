
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
function home(){$('#home').classList.add('show');$('#ed').classList.remove('show');const h=new Date().getHours();$('#greet').textContent=h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';
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
let z=1,ox=0,sy=0,S=1,lock=false,wt;
const Sc=()=>cv.clientWidth/PW*z,top=i=>12+i*(PH+GAP),totH=()=>top(nb.pages.length)-GAP+80,maxY=()=>Math.max(0,totH()*Sc()-cv.clientHeight);
function clampV(soft){S=Sc();const pw=PW*S,cw=cv.clientWidth;ox=pw<=cw+1?(cw-pw)/2:Math.max(cw-pw,Math.min(0,ox));sy=Math.max(0,Math.min(maxY()+(soft?160:0),sy))}
const pageAt=y=>Math.max(0,Math.min(nb.pages.length-1,Math.floor((y-12+GAP/2)/(PH+GAP)))),curPg=()=>pageAt((sy+cv.clientHeight/2)/S);
const W=(e,b=cv.getBoundingClientRect())=>[(e.clientX-b.left-ox)/S,(e.clientY-b.top+sy)/S];
function open(n){nb=n;$('#home').classList.remove('show');$('#ed').classList.add('show');$('#nm').textContent=n.name;ruler.on=false;$('#rl').classList.remove('on');z=1;sy=0;hist=[];rdo=[];$('#pp').textContent='Paper: '+db.paper;setTool('pen');sizeCv()}
function sizeCv(){const s=$('#stage'),d=devicePixelRatio||1;cv.width=s.clientWidth*d;cv.height=s.clientHeight*d;clampV();draw()}
function setTool(t){tool=t;document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==t));$('#cols').parentElement.style.opacity=t=='eraser'?.4:1;draw()}
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('#rl').onclick=()=>{ruler.on=!ruler.on;$('#rl').classList.toggle('on',ruler.on);if(ruler.on){ruler.len=Math.min(520,PW-80);ruler.x=(PW-ruler.len)/2;ruler.y=(sy+cv.clientHeight/2)/S;ruler.a=0}draw()};
PAL.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c==color?' on':'');b.style.background=c;b.setAttribute('aria-label','Colour '+c);b.onclick=()=>pick(c);$('#cols').appendChild(b)});
const rgb=s=>{const m=s.match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):s};
function pick(c){color=c;document.querySelectorAll('.sw').forEach(s=>s.classList.toggle('on',rgb(s.style.background)==c));if(tool=='eraser')setTool('pen')}
$('#cc').oninput=e=>pick(e.target.value);$('#sz').oninput=e=>size=+e.target.value;
$('#nm').onclick=()=>{const v=prompt('Rename notebook',nb.name);if(v&&v.trim()){nb.name=v.trim();$('#nm').textContent=nb.name;save()}};
$('#back').onclick=()=>{save();home()};$('#un').onclick=undo;$('#re').onclick=redo;$('#fit').onclick=()=>{z=1;draw()};
function snap(i){hist.push({i,s:nb.pages[i].strokes.slice()});if(hist.length>200)hist.shift();rdo=[]}
function undo(){const h=hist.pop();if(!h)return;rdo.push({i:h.i,s:nb.pages[h.i].strokes.slice()});nb.pages[h.i].strokes=h.s;save();draw()}
function redo(){const h=rdo.pop();if(!h)return;hist.push({i:h.i,s:nb.pages[h.i].strokes.slice()});nb.pages[h.i].strokes=h.s;save();draw()}
addEventListener('keydown',e=>{if(!$('#ed').classList.contains('show'))return;if((e.ctrlKey||e.metaKey)&&e.key=='z'){e.preventDefault();e.shiftKey?redo():undo()}});
$('#dp').onclick=()=>{if(nb.pages.length<2)return toast('A notebook needs at least one page.');if(!confirm('Delete this page and its handwriting?'))return;nb.pages.splice(curPg(),1);hist=[];rdo=[];save();draw()};
$('#tp').onchange=e=>{nb.pages[curPg()].tpl=e.target.value;save();draw()};
$('#pp').onclick=()=>{db.paper=db.paper=='light'?'dark':'light';$('#pp').textContent='Paper: '+db.paper;save();draw()};
$('#ex').onclick=()=>{const c=document.createElement('canvas');c.width=PW*2;c.height=PH*2;const x=c.getContext('2d');x.scale(2,2);drawPage(x,nb.pages[curPg()]);c.toBlob(b=>{dl(b,nb.name+'-page'+(curPg()+1)+'.png');toast('Page exported as PNG.')})};
function addPage(){const l=nb.pages[nb.pages.length-1];nb.pages.push({...pgObj(),tpl:l.tpl});hist=[];rdo=[];save();clampV();sy=Math.min(maxY(),(top(nb.pages.length-1)-12)*S);draw();toast('Page added.',1500)}
function settle(){const m=maxY();if(sy>m+80)addPage();else if(sy>m){sy=m;draw()}}
/* RENDER */
function drawPage(c,pgo){const dk=db.paper=='dark';c.fillStyle=dk?'#1b1b21':'#fbfaf7';c.fillRect(0,0,PW,PH);
 c.strokeStyle=dk?'#34343f':'#d3d8e4';c.fillStyle=c.strokeStyle;c.lineWidth=1;const t=pgo.tpl;c.beginPath();
 if(t=='ruled')for(let y=96;y<PH-30;y+=32){c.moveTo(0,y);c.lineTo(PW,y)}
 if(t=='grid'){for(let y=24;y<PH;y+=24){c.moveTo(0,y);c.lineTo(PW,y)}for(let x=24;x<PW;x+=24){c.moveTo(x,0);c.lineTo(x,PH)}}
 c.stroke();
 if(t=='dot')for(let y=24;y<PH;y+=24)for(let x=24;x<PW;x+=24)c.fillRect(x-1,y-1,2,2);
 pgo.strokes.forEach(s=>stroke(c,s));if(live&&live.o===pgo)stroke(c,live)}
function stroke(c,s){const t=TL[s.t],p=s.p;c.save();c.globalAlpha=t.a;c.strokeStyle=c.fillStyle=s.c;c.lineCap=c.lineJoin='round';const w=s.w*t.w;
 if(p.length<2){c.beginPath();c.arc(p[0][0],p[0][1],w/2,0,7);c.fill()}
 else if(s.t=='pen'){for(let i=1;i<p.length;i++){c.lineWidth=w*(.45+p[i][2]*1.1);c.beginPath();c.moveTo(p[i-1][0],p[i-1][1]);c.lineTo(p[i][0],p[i][1]);c.stroke()}}
 else{c.lineWidth=w;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length-1;i++){const m=[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2];c.quadraticCurveTo(p[i][0],p[i][1],m[0],m[1])}c.lineTo(p[p.length-1][0],p[p.length-1][1]);c.stroke()}
 c.restore()}
let rq=0;function draw(){cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{if(!nb)return;clampV(true);const d=devicePixelRatio||1,ch=cv.clientHeight;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 nb.pages.forEach((p,i)=>{const t=top(i)*S-sy;if(t>ch||t+PH*S<0)return;ctx.setTransform(d*S,0,0,d*S,d*ox,d*t);ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=20;ctx.fillStyle='#000';ctx.fillRect(0,0,PW,PH);ctx.restore();ctx.save();ctx.beginPath();ctx.rect(0,0,PW,PH);ctx.clip();drawPage(ctx,p);ctx.restore()});
 ctx.setTransform(d*S,0,0,d*S,d*ox,-d*sy);if(ruler.on)drawRuler();
 if(eraseAt){ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5/S;ctx.beginPath();ctx.arc(eraseAt[0],eraseAt[1],14,0,7);ctx.stroke()}
 ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--t2');ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(sy-maxY()>80?'Release to add a page':'Keep scrolling to add a page',cv.clientWidth/2,(top(nb.pages.length)-GAP+40)*S-sy);ctx.textAlign='left';
 const c=curPg();$('#pn').textContent=`Page ${c+1} of ${nb.pages.length}`;if($('#tp').value!=nb.pages[c].tpl)$('#tp').value=nb.pages[c].tpl;
 $('#rinfo').textContent=ruler.on?`Ruler ${Math.round(((ruler.a*180/Math.PI)%360+360)%360)}°`:''})}
function drawRuler(){const r=ruler;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.globalAlpha=.88;ctx.fillStyle='#2a2833';ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(0,0,r.len,56);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#cfcbe0';ctx.fillStyle='#cfcbe0';ctx.font='10px system-ui';ctx.beginPath();
 for(let i=0,u=0;u<=r.len;i++,u=i*3.78){const cm=i%10==0,h=cm?16:i%5==0?11:6;ctx.moveTo(u,0);ctx.lineTo(u,h);if(cm)ctx.fillText(i/10,u+2,28)}ctx.stroke();
 ctx.fillStyle='#a78bfa';ctx.beginPath();ctx.arc(r.len-18,28,9,0,7);ctx.fill();ctx.restore()}
/* INPUT */
const loc=p=>{const dx=p[0]-ruler.x,dy=p[1]-ruler.y,c=Math.cos(ruler.a),s=Math.sin(ruler.a);return[dx*c+dy*s,-dx*s+dy*c]};
const proj=p=>{const[u]=loc(p);return[ruler.x+u*Math.cos(ruler.a),ruler.y+u*Math.sin(ruler.a)]};
const onRuler=p=>{const[u,v]=loc(p);return u>=-10&&u<=ruler.len+10&&v>=-10&&v<=66},nearEdge=p=>ruler.on&&Math.abs(loc(p)[1])<28/S+6;
const pr=e=>e.pointerType=='pen'&&e.pressure>0?e.pressure:.5;
const fing=()=>{const a=[...touches.values()];return{d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])||1,ang:Math.atan2(a[1][1]-a[0][1],a[1][0]-a[0][0]),cx:(a[0][0]+a[1][0])/2,cy:(a[0][1]+a[1][1])/2}};
const sp=(t,a,b)=>{let r;const[x,y]=a,[u,v]=b;if(t=='line')r=[a,b];else if(t=='rect')r=[a,[u,y],b,[x,v],a];else if(t=='triangle')r=[[(x+u)/2,y],b,[x,v],[(x+u)/2,y]];else{r=[];for(let k=0;k<=48;k++){const g=k/48*6.2832;r.push([(x+u)/2+Math.cos(g)*(u-x)/2,(y+v)/2+Math.sin(g)*(v-y)/2])}}return r.map(q=>[q[0],q[1],.5])};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);
 if(e.pointerType=='touch'){touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){rmode=null;const p=W(e);if(ruler.on&&onRuler(p))rmode={t:'mv',id:e.pointerId,o:[p[0]-ruler.x,p[1]-ruler.y]}}
  else if(touches.size==2){const f=fing();if(rmode)rmode={t:'rot',a0:f.ang,ra:ruler.a};else{const b=cv.getBoundingClientRect();pinch={...f,z,w:[(f.cx-b.left-ox)/S,(f.cy-b.top+sy)/S]}}}
  return}
 const p=W(e),i=pageAt(p[1]);
 if(tool=='eraser'){snap(i);eraseAt=p;erase(p);return}
 const sn=nearEdge(p),q=sn?proj(p):p,l=[q[0],q[1]-top(i),pr(e)],sh=SH.includes(tool);
 live={t:sh?'pen':tool,c:color,w:size,p:[l],sn,i,o:nb.pages[i],sh:sh?tool:0,a:l};draw()});
cv.addEventListener('pointermove',e=>{
 if(e.pointerType=='touch'){const o=touches.get(e.pointerId);if(!o)return;const dx=e.clientX-o[0],dy=e.clientY-o[1];touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size==1){if(rmode&&rmode.t=='mv'&&rmode.id==e.pointerId){const p=W(e);ruler.x=p[0]-rmode.o[0];ruler.y=p[1]-rmode.o[1]}else if(!lock&&!rmode){sy-=dy;if(z>1)ox+=dx}}
  else if(touches.size==2){const f=fing();
   if(rmode&&rmode.t=='rot'){const h=ruler.len/2,cx=ruler.x+Math.cos(ruler.a)*h,cy=ruler.y+Math.sin(ruler.a)*h;ruler.a=rmode.ra+f.ang-rmode.a0;ruler.x=cx-Math.cos(ruler.a)*h;ruler.y=cy-Math.sin(ruler.a)*h}
   else if(pinch){const b=cv.getBoundingClientRect();z=Math.max(1,Math.min(2.5,pinch.z*f.d/pinch.d));S=Sc();sy=pinch.w[1]*S-(f.cy-b.top);ox=f.cx-b.left-pinch.w[0]*S}}
  draw();return}
 const p=W(e);
 if(tool=='eraser'&&eraseAt){eraseAt=p;erase(p);return}
 if(live){const T=live.i;if(live.sh)live.p=sp(live.sh,live.a,[p[0],p[1]-top(T)]);else(e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(ev=>{const w=W(ev),q=live.sn?proj(w):w;live.p.push([q[0],q[1]-top(T),pr(ev)])});draw()}});
function end(e){
 if(e.pointerType=='touch'){touches.delete(e.pointerId);if(touches.size==1){lock=true;pinch=null;if(rmode&&rmode.t=='rot')rmode=null}if(!touches.size){lock=false;rmode=null;pinch=null;settle()}return}
 if(eraseAt){eraseAt=null;save();draw()}
 if(live){const s=live;live=null;snap(s.i);nb.pages[s.i].strokes.push({t:s.t,c:s.c,w:s.w,p:s.p});save();draw()}}
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
cv.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey){const b=cv.getBoundingClientRect(),wx=(e.clientX-b.left-ox)/S,wy=(e.clientY-b.top+sy)/S;z=Math.max(1,Math.min(2.5,z*(e.deltaY<0?1.1:.91)));S=Sc();sy=wy*S-(e.clientY-b.top);ox=e.clientX-b.left-wx*S}else{sy+=e.deltaY;ox-=e.deltaX}draw();clearTimeout(wt);wt=setTimeout(settle,220)},{passive:false});
function erase(p){const i=pageAt(p[1]),q=[p[0],p[1]-top(i)],pg_=nb.pages[i];pg_.strokes=pg_.strokes.filter(s=>!hit(s,q,14+s.w/2));draw()}
function hit(s,p,r){const q=s.p;if(q.length==1)return Math.hypot(q[0][0]-p[0],q[0][1]-p[1])<r;
 for(let i=1;i<q.length;i++){const[x1,y1]=q[i-1],[x2,y2]=q[i],dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-x1)*dx+(p[1]-y1)*dy)/l));if(Math.hypot(x1+t*dx-p[0],y1+t*dy-p[1])<r)return true}return false}
addEventListener('resize',()=>{if($('#ed').classList.contains('show'))sizeCv()});
load();home();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
