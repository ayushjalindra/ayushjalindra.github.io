(function(){
var el=function(i){return document.getElementById(i)};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var mx=0,my=0,time=0;
var ring=el('ring');
addEventListener('pointermove',function(e){
mx=(e.clientX/innerWidth-.5)*2;
my=(e.clientY/innerHeight-.5)*2;
ring.style.opacity=1;
ring.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
ring.classList.toggle('big',!!e.target.closest('a,.card,.list li'));
var c=e.target.closest('.card');
if(c){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}
});

var roles=['Structural Design','Transportation Engineering','AI/ML in Civil Engineering'],ri=0,ci=0,del=false,rs=el('role');
function type(){
var t=roles[ri];
ci+=del?-1:1;
rs.textContent=t.slice(0,ci);
var d=del?35:75;
if(!del&&ci===t.length){del=true;d=1600}
else if(del&&ci===0){del=false;ri=(ri+1)%roles.length;d=300}
setTimeout(type,d);
}
type();

var stages=['Truss bridge · stress analysis','Truss bridge · load path','RCC frame · construction sequence','Hyperloop · pod and track','City · infrastructure','Overview · the full site'];
var K=[[[-13,6,26],[0,1,0]],[[9,9,13],[0,0,0]],[[32,7,20],[45,3,0]],[[82,3,11],[95,1,0]],[[132,18,38],[145,4,0]],[[70,42,88],[70,0,0]]];
var prog=0;
function updateProgress(){
var m=Math.max(1,document.documentElement.scrollHeight-innerHeight);
prog=Math.min(1,Math.max(0,scrollY/m));
el('rail').style.width=(prog*100)+'%';
el('stage').textContent=stages[Math.round(prog*(K.length-1))];
}
addEventListener('scroll',updateProgress,{passive:true});
updateProgress();

if(window.THREE){try{scene()}catch(e){}}

function scene(){
var T=THREE,G=-3;
var r=new T.WebGLRenderer({canvas:el('site'),antialias:true,alpha:true});
r.setPixelRatio(Math.min(devicePixelRatio,2));
var sc=new T.Scene();
sc.fog=new T.FogExp2(0x061423,.011);
var cam=new T.PerspectiveCamera(50,1,.1,700);
cam.position.set(K[0][0][0],K[0][0][1],K[0][0][2]);
var look=new T.Vector3(0,1,0),tp=new T.Vector3(),tt=new T.Vector3();
function size(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
size();addEventListener('resize',size);

function LS(p,col,op){
var g=new T.BufferGeometry();
g.setAttribute('position',new T.Float32BufferAttribute(p,3));
return new T.LineSegments(g,new T.LineBasicMaterial({color:col,transparent:true,opacity:op}));
}
function slab(w,d,col,op){
var m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:2,depthWrite:false}));
m.rotation.x=-Math.PI/2;return m;
}

var grid=new T.GridHelper(500,125,0x2a5f8a,0x14344f);
grid.position.set(70,G,0);
grid.material.transparent=true;grid.material.opacity=.5;
sc.add(grid);

var bp=[],bm=[];
function bs(a,b,c,d,e,f){bp.push(a,b,c,d,e,f);bm.push((a+d)/2)}
[-1,1].forEach(function(z){
for(var i=0;i<8;i++){
var x=-7+i*2;
if(i<7)bs(x,0,z,x+2,0,z);
if(i>=1&&i<=6){bs(x,0,z,x,1.8,z);if(i<6)bs(x,1.8,z,x+2,1.8,z)}
if(i>=1&&i<=5){if(i%2)bs(x,0,z,x+2,1.8,z);else bs(x,1.8,z,x+2,0,z)}
}
bs(-7,0,z,-5,1.8,z);bs(7,0,z,5,1.8,z);
bs(-7,0,z,-11,0,z);bs(7,0,z,11,0,z);
[-7,7].forEach(function(x){bs(x,0,z,x,G,z*1.5)});
});
for(var i=0;i<8;i++){var x=-7+i*2;bs(x,0,-1,x,0,1);if(i>=1&&i<=6)bs(x,1.8,-1,x,1.8,1)}
[-7,7].forEach(function(x){bs(x,G,-1.5,x,G,1.5);bs(x,-1.5,-1.25,x,-1.5,1.25)});
var bcol=new Float32Array(bp.length);
var bg=new T.BufferGeometry();
bg.setAttribute('position',new T.Float32BufferAttribute(bp,3));
bg.setAttribute('color',new T.BufferAttribute(bcol,3));
var bridge=new T.LineSegments(bg,new T.LineBasicMaterial({vertexColors:true}));
sc.add(bridge);
var deck=slab(22,2,0x5cc8ff,.12);deck.position.y=-.02;sc.add(deck);
var vehicle=new T.Mesh(new T.BoxGeometry(1.4,.3,.7),new T.MeshBasicMaterial({color:0xffb433}));
sc.add(vehicle);
var wg=new T.PlaneGeometry(60,34,45,26);
wg.rotateX(-Math.PI/2);
var wa=wg.attributes.position,wx=[],wz=[];
for(var i=0;i<wa.count;i++){wx.push(wa.getX(i));wz.push(wa.getZ(i))}
var water=new T.Mesh(wg,new T.MeshBasicMaterial({color:0x5cc8ff,wireframe:true,transparent:true,opacity:.22}));
water.position.y=-2;sc.add(water);
var nk={};
for(var i=0;i<bp.length;i+=3)nk[bp[i].toFixed(2)+','+bp[i+1].toFixed(2)+','+bp[i+2].toFixed(2)]=1;
el('hn').textContent=Object.keys(nk).length;
el('hm').textContent=bp.length/6;

var B=new T.Group();B.position.set(45,0,0);sc.add(B);
var floors=[];
for(var f=0;f<12;f++){
var y=G+f*.9,y2=y+.9,p=[];
for(var i=0;i<4;i++)for(var j=0;j<3;j++)p.push(i*2.5-3.75,y,j*2.5-2.5,i*2.5-3.75,y2,j*2.5-2.5);
for(var j=0;j<3;j++)p.push(-3.75,y2,j*2.5-2.5,3.75,y2,j*2.5-2.5);
for(var i=0;i<4;i++)p.push(i*2.5-3.75,y2,-2.5,i*2.5-3.75,y2,2.5);
if(f%2==0)p.push(-3.75,y,-2.5,-1.25,y2,-2.5,1.25,y2,-2.5,3.75,y,-2.5);
var g=new T.Group();
g.add(LS(p,0xbee1ff,.9));
var s=slab(7.5,5,0x5cc8ff,.14);s.position.y=y2;g.add(s);
B.add(g);floors.push(g);
}
var C=new T.Group();C.position.set(52,0,0);sc.add(C);
var mp=[],q=.35,co=[[-q,-q],[q,-q],[q,q],[-q,q]],mh=15;
co.forEach(function(c){mp.push(c[0],G,c[1],c[0],G+mh,c[1])});
for(var k=0;k<=mh/.9;k++){var y=G+k*.9;for(var m=0;m<4;m++){var a=co[m],b=co[(m+1)%4];mp.push(a[0],y,a[1],b[0],y,b[1]);if(y+.9<=G+mh)mp.push(a[0],y,a[1],b[0],y+.9,b[1])}}
C.add(LS(mp,0xffb433,.9));
var J=new T.Group();J.position.y=G+mh;C.add(J);
var jp=[0,0,0,0,2,0,-5,0,0,11,0,0,0,.7,0,11,0,0,0,.7,0,-5,0,0,0,2,0,11,0,0,0,2,0,-5,0,0,-5,0,0,-5,-1.6,0,8,0,0,8,-5,0,7.8,-5,0,8.2,-5,0];
J.add(LS(jp,0xffb433,.9));

var H=new T.Group();H.position.set(95,0,0);sc.add(H);
var tp2=[],tr=2.2,cyH=1.6,rn=24;
for(var x=-20;x<=20;x+=1){for(var k=0;k<rn;k++){var a=k/rn*6.2832,b=(k+1)/rn*6.2832;tp2.push(x,cyH+Math.cos(a)*tr,Math.sin(a)*tr,x,cyH+Math.cos(b)*tr,Math.sin(b)*tr)}}
for(var k=0;k<rn;k+=2){var a=k/rn*6.2832;tp2.push(-20,cyH+Math.cos(a)*tr,Math.sin(a)*tr,20,cyH+Math.cos(a)*tr,Math.sin(a)*tr)}
H.add(LS(tp2,0x5cc8ff,.4));
var kp=[];
for(var x=-20;x<=20;x+=1)kp.push(x,-.3,-.8,x,-.3,.8);
kp.push(-20,-.3,-.8,20,-.3,-.8,-20,-.3,.8,20,-.3,.8);
for(var x=-20;x<=20;x+=5){kp.push(x,-.3,-.8,x,G,-1.4,x,-.3,.8,x,G,1.4,x,G,-1.4,x,G,1.4)}
H.add(LS(kp,0xbee1ff,.85));
var P=new T.Group();H.add(P);
var ch=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(4,.7,1.2)),new T.LineBasicMaterial({color:0xffb433}));
P.add(ch);
P.add(LS([-2,-.35,-.6,0,.35,.6,0,-.35,.6,2,.35,-.6,-2,.35,.6,0,-.35,-.6,0,.35,-.6,2,-.35,.6],0xffb433,.9));
[-1.4,1.4].forEach(function(x){var m=new T.Mesh(new T.BoxGeometry(.8,.4,.9),new T.MeshBasicMaterial({color:0xffb433,transparent:true,opacity:.55}));m.position.set(x,-.5,0);P.add(m)});
var bat=new T.Mesh(new T.BoxGeometry(1.2,.35,.8),new T.MeshBasicMaterial({color:0x5cc8ff,transparent:true,opacity:.6}));
bat.position.set(0,.5,0);P.add(bat);
var NP=260,pa=new Float32Array(NP*3);
for(var i=0;i<NP;i++){var a=Math.random()*6.2832,rr=Math.sqrt(Math.random())*(tr-.2);pa[i*3]=(Math.random()-.5)*40;pa[i*3+1]=cyH+Math.cos(a)*rr;pa[i*3+2]=Math.sin(a)*rr}
var pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pa,3));
var pts=new T.Points(pg,new T.PointsMaterial({color:0xffb433,size:.09,transparent:true,opacity:.8}));
H.add(pts);

var K2=new T.Group();K2.position.set(145,0,0);sc.add(K2);
var seed=7;
function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
var win=[];
for(var i=0;i<70;i++){
var bw=1+rnd()*2.2,bh=2+Math.pow(rnd(),2)*16,bd=1+rnd()*2.2;
var bx=(rnd()-.5)*44,bz=(rnd()-.5)*34;
if(Math.abs(bz)<2.5)continue;
var e=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(bw,bh,bd)),new T.LineBasicMaterial({color:rnd()>.85?0xffb433:0x5cc8ff,transparent:true,opacity:.7}));
e.position.set(bx,G+bh/2,bz);K2.add(e);
for(var w2=0;w2<bh*.9;w2++){if(rnd()>.55)win.push(bx+(rnd()-.5)*bw*.8,G+.6+rnd()*(bh-.8),bz+bd/2+.02)}
}
K2.add(LS([-22,G,0,22,G,0,-22,G+.02,-1.2,22,G+.02,-1.2,-22,G+.02,1.2,22,G+.02,1.2],0xbee1ff,.6));
var wgm=new T.BufferGeometry();wgm.setAttribute('position',new T.Float32BufferAttribute(win,3));
K2.add(new T.Points(wgm,new T.PointsMaterial({color:0xffd27a,size:.14,transparent:true,opacity:.85})));

var dir=new T.Vector3();
function frame(){
if(!reduce)time+=.016;
var m=(K.length-1)*prog,i=Math.min(Math.floor(m),K.length-2),f=m-i;f=f*f*(3-2*f);
tp.set(K[i][0][0]+(K[i+1][0][0]-K[i][0][0])*f,K[i][0][1]+(K[i+1][0][1]-K[i][0][1])*f,K[i][0][2]+(K[i+1][0][2]-K[i][0][2])*f);
tt.set(K[i][1][0]+(K[i+1][1][0]-K[i][1][0])*f,K[i][1][1]+(K[i+1][1][1]-K[i][1][1])*f,K[i][1][2]+(K[i+1][1][2]-K[i][1][2])*f);
tp.x+=mx*2+Math.sin(time*.25)*1.5;tp.y+=-my*1.2;
cam.position.lerp(tp,.05);look.lerp(tt,.05);cam.lookAt(look);

var lx=-7+((time*1.6)%14);
vehicle.position.set(lx,.2,0);
var mx2=0,cp=bg.attributes.color.array;
for(var s=0;s<bm.length;s++){
var d=bm[s]-lx,v=Math.exp(-d*d/9),cr,cg,cb;
if(v<.5){var k=v*2;cr=.36+.64*k;cg=.78-.07*k;cb=1-.8*k}else{var k=(v-.5)*2;cr=1;cg=.71-.46*k;cb=.2-.05*k}
for(var z=0;z<2;z++){var o=s*6+z*3;cp[o]=cr;cp[o+1]=cg;cp[o+2]=cb}
}
bg.attributes.color.needsUpdate=true;
for(var i2=0;i2<wa.count;i2++){wa.setY(i2,Math.sin(wx[i2]*.5+time*1.5)*.12+Math.cos(wz[i2]*.6+time)*.1)}
wa.needsUpdate=true;
var bt=(time*.7)%16;
floors.forEach(function(g,k){g.visible=k<bt});
J.rotation.y=time*.3;
P.position.x=-18+((time*7)%36);
P.position.y=.15;
var pp=pg.attributes.position.array;
for(var k=0;k<NP;k++){pp[k*3]-=.25;if(pp[k*3]<-20)pp[k*3]+=40}
pg.attributes.position.needsUpdate=true;
r.render(sc,cam);

cam.getWorldDirection(dir);
el('hx').textContent=(cam.position.x>=0?'+':'-')+Math.abs(cam.position.x).toFixed(1).padStart(5,'0');
el('hy').textContent=(cam.position.y>=0?'+':'-')+Math.abs(cam.position.y).toFixed(1).padStart(5,'0');
el('hz').textContent=(cam.position.z>=0?'+':'-')+Math.abs(cam.position.z).toFixed(1).padStart(5,'0');
el('hp').textContent=((Math.atan2(dir.x,dir.z)*180/Math.PI+360)%360).toFixed(2).padStart(6,'0')+'°';
el('ht').textContent=(Math.asin(dir.y)*180/Math.PI).toFixed(2).padStart(6,'0')+'°';
el('hl').textContent=(lx+7).toFixed(1)+' m';
el('hs').textContent=Math.round(35+60*Math.pow(Math.cos(lx/14*Math.PI),2))+'%';
requestAnimationFrame(frame);
}
frame();
}

var panels=document.querySelectorAll('.panel');
panels.forEach(function(p){p.classList.add('reveal')});
function countUp(n){
var t=parseInt(n.getAttribute('data-n'),10),c=0;
var iv=setInterval(function(){c++;n.textContent=c;if(c>=t)clearInterval(iv)},220);
}
var io=new IntersectionObserver(function(es){
es.forEach(function(e){
if(e.isIntersecting){
e.target.classList.add('in');
e.target.querySelectorAll('[data-n]').forEach(countUp);
io.unobserve(e.target);
}
});
},{threshold:.15});
panels.forEach(function(p){io.observe(p)});
var links=document.querySelectorAll('.nav nav a');
var so=new IntersectionObserver(function(es){
es.forEach(function(e){
if(e.isIntersecting)links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)});
});
},{threshold:.4});
document.querySelectorAll('section').forEach(function(s){so.observe(s)});
})();
