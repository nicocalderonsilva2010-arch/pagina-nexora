(() => {
  const $ = (selector, scope=document) => scope.querySelector(selector);
  const overlay=$('#overlay');
  const modal=$('#overlay .modal');
  const modalTitle=$('#modalTitle');
  const modalContent=$('#modalContent');
  let totemSkinRecords=[];
  let totemSkinUrl='';
  let mobFrame=0;

  function notice(message){const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(window.creativeToastTimer);window.creativeToastTimer=setTimeout(()=>node.classList.remove('show'),2300)}
  function openTool(title,html){
    modalTitle.textContent=title;
    modalContent.innerHTML=html;
    modal.classList.remove('server-profile-modal','modrinth-detail-modal');
    modal.classList.add('creative-tool-modal');
    overlay.classList.add('open');document.body.classList.add('modal-open');
  }
  function downloadCanvas(canvas,name){
    canvas.toBlob(blob=>{
      if(!blob){notice('No se pudo exportar la imagen.');return}
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'image/png');
  }
  function rounded(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }

  function renderNametag(){
    const canvas=$('#nametagCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');
    const text=$('#nametagText').value.trim().slice(0,24)||'NEXORA_PLAYER';
    const color=$('#nametagColor').value;const style=$('#nametagStyle').value;
    canvas.width=960;canvas.height=260;ctx.clearRect(0,0,canvas.width,canvas.height);
    const glow=ctx.createRadialGradient(480,130,20,480,130,410);glow.addColorStop(0,'rgba(188,143,112,.22)');glow.addColorStop(1,'rgba(20,16,15,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,960,260);
    rounded(ctx,74,50,812,160,24);ctx.fillStyle='rgba(8,8,10,.72)';ctx.fill();
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=style==='glow'?36:18;
    if(style==='gradient'){const gradient=ctx.createLinearGradient(150,0,810,0);gradient.addColorStop(0,'#a38aff');gradient.addColorStop(.5,color);gradient.addColorStop(1,'#fff0b0');ctx.fillStyle=gradient}else ctx.fillStyle=color;
    ctx.font='800 72px "Segoe UI",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='#171419';ctx.lineWidth=13;ctx.strokeText(text,480,128,720);ctx.fillText(text,480,128,720);ctx.restore();
    ctx.fillStyle='rgba(242,226,213,.62)';ctx.font='16px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('MINECRAFT · NEXORA',480,232);
  }
  function openNametag(){
    openTool('Creador de nametags',`<div class="creative-tool-layout"><div class="creative-tool-controls"><label>Texto<input id="nametagText" class="field" maxlength="24" value="NEXORA_PLAYER" placeholder="Escribe tu nametag"></label><label>Color<select id="nametagColor" class="field"><option value="#ffffff">Blanco</option><option value="#ff5555">Rojo</option><option value="#55ff55">Verde</option><option value="#55ffff">Aqua</option><option value="#5555ff">Azul</option><option value="#ffff55">Amarillo</option><option value="#ff55ff">Rosa</option><option value="#ff9f63">Naranja</option></select></label><label>Estilo<select id="nametagStyle" class="field"><option value="classic">Clásico</option><option value="glow">Brillo</option><option value="gradient">Degradado</option></select></label><p>Vista previa en alta resolución. Descarga el resultado en PNG.</p><button id="downloadNametag" class="button button-dark">Descargar nametag PNG</button></div><div class="creative-preview"><span class="creative-preview-label">VISTA PREVIA</span><canvas id="nametagCanvas" width="960" height="260"></canvas></div></div>`);
    renderNametag();
    ['nametagText','nametagColor','nametagStyle'].forEach(id=>$('#'+id).addEventListener('input',renderNametag));
    $('#downloadNametag').onclick=()=>downloadCanvas($('#nametagCanvas'),'nexora-nametag.png');
  }

  function paintPixelIcon(canvas){
    const ctx=canvas.getContext('2d');const color=$('#iconBackground').value;const icon=$('#iconType').value;canvas.width=512;canvas.height=512;
    ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
    if($('#iconPattern').checked){ctx.globalAlpha=.14;ctx.fillStyle='#fff';for(let y=0;y<512;y+=32)for(let x=0;x<512;x+=32)if((x+y)%64===0)ctx.fillRect(x,y,16,16);ctx.globalAlpha=1}
    const art=document.createElement('canvas');art.width=16;art.height=16;const p=art.getContext('2d');p.imageSmoothingEnabled=false;
    const px=(x,y,w,h,c)=>{p.fillStyle=c;p.fillRect(x,y,w,h)};
    if(icon==='grass'){
      px(2,4,12,10,'#80502f');px(2,4,12,2,'#59a83f');px(2,4,12,1,'#8ed45d');px(3,7,2,2,'#a36c40');px(7,9,3,2,'#68432e');px(12,6,2,3,'#a36c40');
    }else if(icon==='diamond'){
      px(4,2,8,2,'#56ded7');px(2,4,12,2,'#2db9c4');px(3,6,10,3,'#42d9d4');px(5,9,6,2,'#35bfc6');px(7,11,2,3,'#238fae');px(5,4,2,2,'#b2fff2');px(4,7,2,2,'#77fff0');
    }else if(icon==='creeper'){
      px(3,2,10,12,'#4b9f35');px(4,3,3,2,'#71c74b');px(9,3,3,2,'#39862c');px(5,6,2,2,'#151a15');px(9,6,2,2,'#151a15');px(7,8,2,2,'#151a15');px(6,10,4,3,'#151a15');px(5,13,2,1,'#151a15');px(9,13,2,1,'#151a15');
    }else if(icon==='gold'){
      px(3,5,10,7,'#d29220');px(4,4,8,2,'#ffdc58');px(2,7,2,4,'#a65d18');px(12,7,2,4,'#f5b62f');px(5,7,5,2,'#ffe77b');px(7,10,5,1,'#b16a19');
    }else if(icon==='ender'){
      px(7,1,3,2,'#b28cff');px(4,3,8,2,'#8b5bd1');px(2,5,12,6,'#522e8c');px(4,11,8,2,'#713db0');px(6,13,4,2,'#9f73ef');px(5,6,2,2,'#eef5d0');px(9,6,2,2,'#eef5d0');px(7,8,3,3,'#19142a');
    }else{
      px(6,1,4,2,'#f3d567');px(4,3,8,2,'#e6b932');px(2,5,12,7,'#bd8321');px(4,12,8,2,'#dfa92f');px(6,14,4,1,'#f5d96c');px(5,6,2,2,'#fff4ad');px(9,6,2,2,'#fff4ad');px(7,8,2,3,'#674316');px(4,3,2,2,'#fff0a1');
    }
    const size=320;ctx.imageSmoothingEnabled=false;ctx.drawImage(art,(512-size)/2,(512-size)/2,size,size);
    ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=2;rounded(ctx,1,1,510,510,32);ctx.stroke();
  }
  function openIconTool(){
    openTool('Iconos y fondos',`<div class="creative-tool-layout"><div class="creative-tool-controls"><label>Icono<select id="iconType" class="field"><option value="grass">Bloque de césped</option><option value="diamond">Diamante</option><option value="creeper">Creeper</option><option value="gold">Lingote de oro</option><option value="ender">Ojo del End</option><option value="totem">Tótem</option></select></label><label>Fondo<select id="iconBackground" class="field"><option value="#1c2028">Noche</option><option value="#315849">Bosque</option><option value="#513b65">End</option><option value="#713e32">Nether</option><option value="#ccb59c">Arena</option><option value="#101114">Transparente oscuro</option></select></label><label class="creative-check"><input id="iconPattern" type="checkbox" checked> Patrón de píxeles</label><p>Genera un icono cuadrado en PNG para perfil, servidor o redes.</p><button id="downloadIcon" class="button button-dark">Descargar icono PNG</button></div><div class="creative-preview creative-icon-preview"><span class="creative-preview-label">ICONO 512 × 512</span><canvas id="iconCanvas" width="512" height="512"></canvas></div></div>`);
    paintPixelIcon($('#iconCanvas'));
    ['iconType','iconBackground','iconPattern'].forEach(id=>$('#'+id).addEventListener('input',()=>paintPixelIcon($('#iconCanvas'))));
    $('#downloadIcon').onclick=()=>downloadCanvas($('#iconCanvas'),'nexora-icono.png');
  }

  function drawTotem(canvas,image){
    const ctx=canvas.getContext('2d');canvas.width=400;canvas.height=500;ctx.clearRect(0,0,400,500);ctx.imageSmoothingEnabled=false;
    const aura=ctx.createRadialGradient(200,245,25,200,245,200);aura.addColorStop(0,'rgba(242,205,106,.24)');aura.addColorStop(1,'rgba(25,19,16,0)');ctx.fillStyle=aura;ctx.fillRect(0,0,400,500);
    ctx.fillStyle='#59431f';ctx.fillRect(128,405,144,28);ctx.fillStyle='#b98b38';ctx.fillRect(112,433,176,18);ctx.fillStyle='#edce70';ctx.fillRect(122,451,156,8);
    ctx.fillStyle='#916d2c';ctx.fillRect(104,210,192,174);ctx.fillStyle='#d4b653';ctx.fillRect(120,224,160,146);ctx.fillStyle='#82612a';ctx.fillRect(137,238,126,118);
    ctx.fillStyle='#d6b752';ctx.fillRect(59,235,57,117);ctx.fillRect(284,235,57,117);ctx.fillStyle='#f0d477';ctx.fillRect(70,249,36,88);ctx.fillRect(294,249,36,88);
    ctx.fillStyle='#d9b951';ctx.fillRect(154,160,92,57);ctx.fillRect(165,139,70,34);ctx.fillRect(178,120,44,28);ctx.fillRect(126,179,36,33);ctx.fillRect(238,179,36,33);
    ctx.fillStyle='#f2dc86';ctx.fillRect(172,175,56,34);ctx.fillStyle='#392b21';ctx.fillRect(179,185,9,9);ctx.fillRect(212,185,9,9);ctx.fillRect(190,196,20,5);
    if(image&&image.naturalWidth){ctx.drawImage(image,8,8,8,8,160,166,80,48);ctx.drawImage(image,8,8,8,8,174,118,52,48)}
    ctx.fillStyle='#f5e1a3';ctx.fillRect(192,60,5,18);ctx.fillRect(86,114,5,12);ctx.fillRect(312,92,5,20);ctx.fillRect(300,155,5,10);
  }
  async function openTotemTool(){
    openTool('Creador de tótems',`<div class="creative-tool-layout"><div class="creative-tool-controls"><label>Skin guardada<select id="totemSkinSelect" class="field"><option value="">Tótem de NEXORA</option></select></label><label>O sube una skin PNG<input id="totemSkinUpload" class="field" type="file" accept="image/png,.png"></label><p>Usa la cara de la skin para crear un tótem pixel-art y descargarlo.</p><button id="downloadTotem" class="button button-dark">Descargar tótem PNG</button></div><div class="creative-preview creative-totem-preview"><span class="creative-preview-label">VISTA PREVIA · PNG</span><canvas id="totemCanvas" width="400" height="500"></canvas></div></div>`);
    const canvas=$('#totemCanvas');drawTotem(canvas,null);totemSkinRecords=[];
    try{
      if(typeof window.getSavedSkins==='function')totemSkinRecords=await window.getSavedSkins();
      const select=$('#totemSkinSelect');totemSkinRecords.forEach(skin=>{const option=document.createElement('option');option.value=skin.id;option.textContent=skin.name;select.append(option)});
      const active=localStorage.getItem('nexoraActiveSkin');if(active&&totemSkinRecords.some(skin=>skin.id===active))select.value=active;
    }catch{}
    const loadBlob=blob=>{if(totemSkinUrl)URL.revokeObjectURL(totemSkinUrl);totemSkinUrl=URL.createObjectURL(blob);const image=new Image();image.onload=()=>drawTotem(canvas,image);image.src=totemSkinUrl};
    $('#totemSkinSelect').addEventListener('change',()=>{const skin=totemSkinRecords.find(item=>item.id===$('#totemSkinSelect').value);if(skin)loadBlob(skin.blob);else drawTotem(canvas,null)});
    $('#totemSkinUpload').addEventListener('change',event=>{const file=event.target.files?.[0];if(file)loadBlob(file)});
    if($('#totemSkinSelect').value)$('#totemSkinSelect').dispatchEvent(new Event('change'));
    $('#downloadTotem').onclick=()=>downloadCanvas(canvas,'nexora-totem.png');
  }

  const mobs={
    creeper:{name:'Creeper',parts:[{x:0,y:10,z:0,w:8,h:8,d:8,c:'#57a83e'},{x:0,y:4,z:0,w:8,h:12,d:4,c:'#539e39'},{x:-3,y:1,z:-1,w:2,h:4,d:2,c:'#428332'},{x:3,y:1,z:-1,w:2,h:4,d:2,c:'#428332'},{x:-3,y:1,z:1,w:2,h:4,d:2,c:'#4c9136'},{x:3,y:1,z:1,w:2,h:4,d:2,c:'#4c9136'}]},
    zombie:{name:'Zombie',parts:[{x:0,y:15,z:0,w:8,h:8,d:8,c:'#69a85b'},{x:0,y:7,z:0,w:8,h:12,d:4,c:'#347c70'},{x:-5,y:7,z:0,w:3,h:11,d:3,c:'#347c70'},{x:5,y:7,z:0,w:3,h:11,d:3,c:'#347c70'},{x:-2,y:1,z:0,w:3,h:6,d:3,c:'#354d9a'},{x:2,y:1,z:0,w:3,h:6,d:3,c:'#354d9a'}]},
    skeleton:{name:'Esqueleto',parts:[{x:0,y:15,z:0,w:7,h:7,d:7,c:'#d9d5c7'},{x:0,y:7,z:0,w:5,h:10,d:3,c:'#c7c3b7'},{x:-5,y:7,z:0,w:2,h:10,d:2,c:'#bdb9ae'},{x:5,y:7,z:0,w:2,h:10,d:2,c:'#e1ddd0'},{x:-2,y:1,z:0,w:2,h:6,d:2,c:'#d9d5c7'},{x:2,y:1,z:0,w:2,h:6,d:2,c:'#c4c0b5'}]},
    pig:{name:'Cerdo',parts:[{x:0,y:8,z:0,w:10,h:8,d:8,c:'#e99aa5'},{x:0,y:4,z:0,w:9,h:6,d:12,c:'#d77f8b'},{x:-3,y:1,z:-3,w:2,h:4,d:2,c:'#c96d7a'},{x:3,y:1,z:-3,w:2,h:4,d:2,c:'#d17782'},{x:-3,y:1,z:3,w:2,h:4,d:2,c:'#c96d7a'},{x:3,y:1,z:3,w:2,h:4,d:2,c:'#d17782'}]}
  };
  function drawMob(canvas,kind,yaw){
    const ctx=canvas.getContext('2d');canvas.width=640;canvas.height=480;ctx.clearRect(0,0,640,480);
    const bg=ctx.createLinearGradient(0,0,0,480);bg.addColorStop(0,'#25232a');bg.addColorStop(1,'#121316');ctx.fillStyle=bg;ctx.fillRect(0,0,640,480);
    const haze=ctx.createRadialGradient(320,335,15,320,335,225);haze.addColorStop(0,'rgba(199,157,125,.22)');haze.addColorStop(1,'rgba(199,157,125,0)');ctx.fillStyle=haze;ctx.fillRect(60,90,520,350);
    const model=mobs[kind],angle=yaw*Math.PI/180,scale=18,faces=[];
    const faceDefs=[[[0,1,2,3],.95],[[4,7,6,5],.58],[[0,4,5,1],.74],[[3,2,6,7],.67],[[1,5,6,2],.84],[[0,3,7,4],.62]];
    for(const b of model.parts){
      const x0=b.x-b.w/2,x1=b.x+b.w/2,y0=b.y-b.h/2,y1=b.y+b.h/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
      const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
      for(const [ids,shade] of faceDefs){const points=ids.map(i=>{const [x,y,z]=v[i],rx=x*Math.cos(angle)-z*Math.sin(angle),rz=x*Math.sin(angle)+z*Math.cos(angle);return {x:320+rx*scale,y:397-y*scale+rz*scale*.27,d:rz-y*.06}});faces.push({points,color:b.c,shade,depth:points.reduce((sum,p)=>sum+p.d,0)/4})}
    }
    faces.sort((a,b)=>a.depth-b.depth);
    ctx.lineJoin='round';ctx.lineWidth=1.2;
    for(const face of faces){const [r,g,b]=face.color.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16));ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgb(${Math.round(r*face.shade)},${Math.round(g*face.shade)},${Math.round(b*face.shade)})`;ctx.fill();ctx.strokeStyle='rgba(10,10,12,.55)';ctx.stroke()}
    // Rasgos de la cara se colocan en el plano frontal del cubo de la cabeza.
    if(kind==='creeper'||kind==='zombie'||kind==='skeleton'){
      const head=model.parts[0],z=head.z+head.d/2+.08;
      const pixel=(x,y,size,color)=>{const rx=x*Math.cos(angle)-z*Math.sin(angle),rz=x*Math.sin(angle)+z*Math.cos(angle);ctx.fillStyle=color;ctx.fillRect(320+rx*scale-size/2,397-y*scale+rz*scale*.27-size/2,size,size)};
      const centerY=head.y;
      if(kind==='creeper'){pixel(-2,centerY+1,15,'#162018');pixel(2,centerY+1,15,'#162018');pixel(0,centerY-1,14,'#162018');pixel(-1,centerY-3,10,'#162018')}
      else{pixel(-2,centerY+1,11,'#1b1718');pixel(2,centerY+1,11,'#1b1718');pixel(0,centerY-2,15,kind==='zombie'?'#554039':'#8a3735')}
    }
    ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(320,411,110,18,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(235,218,204,.82)';ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText(`${model.name} · ${Math.round(yaw)}°`,320,455);
  }
  function openMobTool(){
    openTool('Mobs en 3D',`<div class="creative-mob-tool"><div class="creative-mob-controls"><label>Criatura<select id="mobType" class="field"><option value="creeper">Creeper</option><option value="zombie">Zombi</option><option value="skeleton">Esqueleto</option><option value="pig">Cerdo</option></select></label><label>Rotación <input id="mobRotation" type="range" min="0" max="360" value="28"></label><label class="creative-check"><input id="mobAutoRotate" type="checkbox"> Giro automático</label><button id="downloadMob" class="button button-dark">Descargar render PNG</button><small>Arrastra sobre la criatura o usa el control para girarla.</small></div><div class="creative-preview creative-mob-preview"><canvas id="mobCanvas" width="640" height="480" aria-label="Vista 3D giratoria de criatura de Minecraft"></canvas></div></div>`);
    const canvas=$('#mobCanvas'),rotation=$('#mobRotation');let yaw=Number(rotation.value),dragging=false,lastX=0;
    const render=()=>drawMob(canvas,$('#mobType').value,yaw);render();
    rotation.addEventListener('input',()=>{yaw=Number(rotation.value);render()});$('#mobType').addEventListener('change',render);
    canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;canvas.setPointerCapture(event.pointerId)});
    canvas.addEventListener('pointermove',event=>{if(!dragging)return;yaw=(yaw+(event.clientX-lastX)*.8+360)%360;lastX=event.clientX;rotation.value=String(Math.round(yaw));render()});
    canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
    let previous=performance.now();const animate=now=>{if(!$('#mobAutoRotate')?.checked||!overlay.classList.contains('open')){mobFrame=0;return}if(now-previous>50){yaw=(yaw+.7)%360;rotation.value=String(Math.round(yaw));render();previous=now}mobFrame=requestAnimationFrame(animate)};
    $('#mobAutoRotate').addEventListener('change',event=>{if(event.target.checked&&!mobFrame){previous=performance.now();mobFrame=requestAnimationFrame(animate)}else if(!event.target.checked&&mobFrame){cancelAnimationFrame(mobFrame);mobFrame=0}});
    $('#downloadMob').onclick=()=>downloadCanvas(canvas,`nexora-${$('#mobType').value}-3d.png`);
  }

  document.addEventListener('click',event=>{
    const tool=event.target.closest('[data-tool-action]');if(!tool)return;
    const action=tool.dataset.toolAction;
    if(action==='nametag')openNametag();
    else if(action==='icons')openIconTool();
    else if(action==='totems')openTotemTool();
    else if(action==='mobs')openMobTool();
  });
})();
