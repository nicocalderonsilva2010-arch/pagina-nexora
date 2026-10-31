const servers = [
  { id:'nightcraft', name:'Nightcraft', ip:'nightcraft.lat', modes:['Survival Custom'], versions:[], platforms:[], region:'Servidor destacado', desc:'Modalidad Survival Custom. Ficha en preparación: próximamente se añadirá más información del servidor.', mark:'N', icon:'✦', logo:'./imagenes/servidores/nightcraft.webp', style:'nightcraft', kicker:'NIGHTCRAFT · SURVIVAL CUSTOM', links:{} },
  { id:'lunar', name:'Lunar Realms', ip:'play.lunarrealms.net', modes:['Survival','Skyblock'], versions:['1.21','1.20'], platforms:['Java'], region:'Comunidad internacional', desc:'Construye, comercia y explora en una comunidad survival con temporadas y economía propia. Tu aventura empieza desde cero.', mark:'L', icon:'☾', links:{} },
  { id:'ember', name:'Emberfall', ip:'mc.emberfall.gg', modes:['Lifesteal','PvP'], versions:['1.21','1.20'], platforms:['Java','Bedrock'], region:'Java + Bedrock', desc:'Entra al combate, protege tus corazones y crea alianzas. Un mundo competitivo con eventos frecuentes y progresión intensa.', mark:'E', icon:'♨', links:{} },
  { id:'void', name:'Voidbound', ip:'play.voidbound.org', modes:['Skyblock','Factions'], versions:['1.20','1.19'], platforms:['Java'], region:'Comunidad internacional', desc:'Empieza en una isla diminuta y conviértela en un imperio. Desafíos, comercio entre jugadores y temporadas de facciones.', mark:'V', icon:'◉', links:{} },
  { id:'cobre', name:'Cobre SMP', ip:'jugar.cobresmp.com', modes:['Survival'], versions:['1.21'], platforms:['Java','Bedrock'], region:'Comunidad hispanohablante', desc:'Un survival tranquilo para crear a tu ritmo. Conoce a otros jugadores, construye tu hogar y forma parte de una comunidad cercana.', mark:'C', icon:'⬡', links:{} },
  { id:'rift', name:'Rift Network', ip:'play.riftnetwork.gg', modes:['PvP','Factions'], versions:['1.20','1.18'], platforms:['Java'], region:'Comunidad internacional', desc:'Mapas dinámicos, alianzas y batallas de facciones. Forma tu equipo y reclama un lugar en el mundo de Rift.', mark:'R', icon:'✧', links:{} },
  { id:'anarquia', name:'Tierra Libre', ip:'mc.tierralibre.net', modes:['Anarquía','Survival'], versions:['1.21','1.16'], platforms:['Java'], region:'Comunidad hispanohablante', desc:'Un mundo abierto con pocas reglas y muchas historias. Explora, sobrevive y deja tu huella en un entorno creado por sus jugadores.', mark:'T', icon:'⚒', links:{} }
];

const $ = (selector, scope=document) => scope.querySelector(selector);
const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
const readList = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
let favorites = new Set(readList('nexoraFavs'));
let recent = readList('nexoraRecent').filter(id => servers.some(server => server.id === id));
let currentPage = localStorage.getItem('nexoraPage') || 'home';
let modeChip = '';
let platform = '';
let showFavorites = false;
let soundEnabled = localStorage.getItem('nexoraSound') !== 'off';
let darkMode = localStorage.getItem('nexoraTheme') === 'dark';
const avatarPresets = {bruma:{mark:'✦',name:'Bruma'},bosque:{mark:'❖',name:'Bosque'},crepusculo:{mark:'☾',name:'Crepúsculo'},ender:{mark:'◉',name:'Ender'},nether:{mark:'◆',name:'Nether'},glaciar:{mark:'❄',name:'Glaciar'}};
const defaultPlayerProfile = {name:'Nexora Player',avatar:'bruma'};
let playerProfile = (()=>{try{return {...defaultPlayerProfile,...JSON.parse(localStorage.getItem('nexoraProfile')||'{}')}}catch{return {...defaultPlayerProfile}}})();
if(!avatarPresets[playerProfile.avatar])playerProfile.avatar=defaultPlayerProfile.avatar;
let activeSkinId = localStorage.getItem('nexoraActiveSkin') || '';
let playerModel = localStorage.getItem('nexoraSkinModel') || 'steve';
if(!['steve','alex'].includes(playerModel))playerModel='steve';
const defaultEquipment={back:'none',armor:'none',weapon:'none'};
let playerEquipment=(()=>{try{return {...defaultEquipment,...JSON.parse(localStorage.getItem('nexoraEquipment')||'{}')}}catch{return {...defaultEquipment}}})();
if(!['none','cape','elytra'].includes(playerEquipment.back))playerEquipment.back='none';
if(!['none','leather','iron','diamond'].includes(playerEquipment.armor))playerEquipment.armor='none';
if(!['none','sword','axe'].includes(playerEquipment.weapon))playerEquipment.weapon='none';
let skinDatabasePromise;
let skinObjectUrls = [];
let skinViewerInstance=null;
let skinViewerResizeObserver=null;
let currentViewerSkinUrl='';
let emoteTimeout=0;
let activeEmote='';
let temporaryElytra=false;
let audioContext;
const overlay = $('#overlay');

function playSound(kind='tap') {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const notes = kind === 'success' ? [587.33, 783.99] : kind === 'open' ? [440, 554.37] : [493.88];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.055);
      gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.045 : 0.025, now + index * 0.055 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.055 + 0.16);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now + index * 0.055); oscillator.stop(now + index * 0.055 + 0.18);
    });
  } catch { /* Audio no disponible: la interfaz sigue funcionando. */ }
}

function toast(message, sound='success') {
  const node = $('#toast'); node.textContent = message; node.classList.remove('show');
  requestAnimationFrame(() => node.classList.add('show'));
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => node.classList.remove('show'), 2300);
  playSound(sound);
}

function navigate(page, options={}) {
  if (!$('#page-' + page)) return;
  currentPage = page;
  localStorage.setItem('nexoraPage', page);
  if(skinViewerInstance)skinViewerInstance.renderPaused=page!=='profile';
  $$('.page').forEach(view => view.classList.toggle('active', view.id === 'page-' + page));
  $$('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  $('#crumbCurrent').textContent = $('#page-' + page).dataset.title;
  document.title = `NEXORA — ${$('#page-' + page).dataset.title}`;
  if (page === 'favorites') renderFavorites();
  if (page === 'activity') renderActivity();
  if (page === 'profile') renderProfile();
  if (!options.silent) playSound('open');
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

function card(server, index=0) {
  const versionTags=server.versions.length?server.versions.map(value=>`<span class="tag tag-version">${value}</span>`).join(''):'<span class="tag tag-version">Versión por confirmar</span>';
  const platformTags=server.platforms.length?server.platforms.map(value=>`<span class="tag tag-platform">${value}</span>`).join(''):'<span class="tag tag-platform">Plataforma por confirmar</span>';
  return `<article class="server-card ${server.style?`server-card--${server.style}`:''}" data-server-card="${server.id}" tabindex="0" aria-label="Abrir ficha de ${server.name}" style="--card-index:${index}">
    <div class="server-cover ${server.style?`server-cover--${server.style}`:''}" data-mark="${server.mark}">${server.logo?`<img class="server-logo" src="${server.logo}" alt="" loading="lazy">`:`<div class="server-symbol">${server.icon}</div>`}<span class="cover-caption">${server.kicker||'NEXORA · COMMUNITY'}</span><button class="favorite-button ${favorites.has(server.id)?'is-favorite':''}" data-favorite="${server.id}" aria-label="${favorites.has(server.id)?'Quitar de':'Añadir a'} favoritos">${favorites.has(server.id)?'♥':'♡'}</button></div>
    <div class="server-card-body"><div class="server-title"><div><h3>${server.name}</h3><span>${server.region}</span></div><span class="status-label"><i></i> Sin verificar</span></div>
      <button class="server-ip" data-copy="${server.id}" aria-label="Copiar ${server.ip}">⌁ &nbsp; ${server.ip}<span>Copiar</span></button>
      <div class="tag-list">${server.modes.map(value=>`<span class="tag">${value}</span>`).join('')}${versionTags}${platformTags}</div>
      <p class="server-description">${server.desc}</p><div class="server-card-footer"><span class="no-live-data">Jugadores: —</span><button class="detail-button" data-detail="${server.id}">Ver perfil <span>↗</span></button></div>
    </div></article>`;
}

function bindCards(container) {
  $$('[data-server-card]', container).forEach(card=>{
    card.onclick=event=>{if(event.target.closest('button,a,input,select,textarea,[data-favorite],[data-copy],[data-detail]'))return;openDetails(card.dataset.serverCard)};
    card.onkeydown=event=>{if((event.key==='Enter'||event.key===' ')&&event.target===card){event.preventDefault();openDetails(card.dataset.serverCard)}};
  });
  $$('[data-favorite]', container).forEach(button => button.onclick = event => {
    event.stopPropagation(); const id = button.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    localStorage.setItem('nexoraFavs', JSON.stringify([...favorites]));
    playSound('tap'); renderServers(); renderFavorites();
  });
  $$('[data-copy]', container).forEach(button => button.onclick = async () => {
    const server = servers.find(item => item.id === button.dataset.copy);
    try { await navigator.clipboard.writeText(server.ip); toast('Dirección copiada'); }
    catch { toast(`IP: ${server.ip}`, 'tap'); }
  });
  $$('[data-detail]', container).forEach(button => button.onclick = () => openDetails(button.dataset.detail));
}

function renderServers() {
  const query = ($('#search')?.value || '').toLowerCase().trim();
  const version = $('#versionFilter')?.value || '';
  const mode = $('#modeFilter')?.value || '';
  const matchesMode=(server,filter)=>server.modes.some(value=>value.toLowerCase()===filter.toLowerCase()||value.toLowerCase().startsWith(filter.toLowerCase()+' '));
  const list = servers.filter(server => (!showFavorites || favorites.has(server.id)) &&
    (!query || `${server.name} ${server.ip} ${server.modes.join(' ')}`.toLowerCase().includes(query)) &&
    (!version || server.versions.includes(version)) && (!mode || matchesMode(server,mode)) &&
    (!modeChip || matchesMode(server,modeChip)) && (!platform || server.platforms.includes(platform)));
  $('#grid').innerHTML = list.length ? list.map(card).join('') : `<div class="empty-state"><span class="empty-icon">⌕</span><strong>${showFavorites?'Aún no tienes favoritos':'No encontramos coincidencias'}</strong><p>${showFavorites?'Guarda un servidor con el corazón y aparecerá en esta lista.':'Cambia algún filtro o prueba otra búsqueda.'}</p></div>`;
  $('#resultCount').textContent = `${String(list.length).padStart(2,'0')} RESULTADOS`;
  $('#serversHeading').textContent = showFavorites ? 'Tus servidores favoritos' : 'Servidores destacados';
  $('#serverCount').textContent = String(servers.length).padStart(2,'0');
  bindCards($('#grid'));
}

function renderFavorites() {
  const list = servers.filter(server => favorites.has(server.id));
  $('#favoritesGrid').innerHTML = list.length ? list.map(card).join('') : `<div class="empty-state"><span class="empty-icon">♡</span><strong>Este espacio es tuyo</strong><p>Toca el corazón de una tarjeta para guardar aquí un servidor que quieras visitar.</p><button class="button button-dark" data-page="servers">Explorar servidores <span>↗</span></button></div>`;
  bindCards($('#favoritesGrid'));
}

function pushRecent(id) {
  recent = [id, ...recent.filter(value => value !== id)].slice(0, 8);
  localStorage.setItem('nexoraRecent', JSON.stringify(recent)); renderRecent();
}

function renderRecent() {
  const list = recent.map(id => servers.find(server => server.id === id)).filter(Boolean);
  $('#recentList').innerHTML = list.length ? list.slice(0,4).map(server=>`<button class="recent-entry" data-open="${server.id}"><span class="recent-mark">${server.mark}</span><span><strong>${server.name}</strong><small>${server.ip}</small></span><i>↗</i></button>`).join('') : '<span class="recent-empty">Aún no has abierto ningún servidor. Los que visites aparecerán aquí.</span>';
  $$('.recent-entry', $('#recentList')).forEach(button => button.onclick=()=>openDetails(button.dataset.open));
}

function renderActivity() {
  const visits = recent.map(id => servers.find(server => server.id === id)).filter(Boolean);
  const favoritesList = servers.filter(server => favorites.has(server.id));
  const rows = [...visits.map(server=>({server, kind:'Visitado recientemente', icon:'◷'})), ...favoritesList.filter(server=>!visits.some(item=>item.id===server.id)).map(server=>({server,kind:'Guardado en favoritos',icon:'♡'}))];
  $('#activityList').innerHTML = rows.length ? rows.map((item,index)=>`<button class="activity-entry" data-open="${item.server.id}"><span class="activity-index">${String(index+1).padStart(2,'0')}</span><span class="activity-icon">${item.icon}</span><span class="activity-copy"><strong>${item.server.name}</strong><small>${item.kind} · ${item.server.ip}</small></span><span class="activity-arrow">↗</span></button>`).join('') : '<div class="activity-empty"><span>◷</span><strong>Tu recorrido empieza aquí</strong><p>Cuando visites o guardes un servidor, lo verás en esta lista.</p><button class="button button-dark" data-page="servers">Explorar servidores ↗</button></div>';
  $$('.activity-entry', $('#activityList')).forEach(button=>button.onclick=()=>openDetails(button.dataset.open));
}

function openDetails(id) {
  const server=servers.find(item=>item.id===id); if(!server) return;
  pushRecent(id);
  const modal=$('#overlay .modal');
  modal.classList.add('server-profile-modal');
  $('#modalTitle').textContent=server.name;
  const detailVersions=server.versions.length?server.versions.map(value=>`<span class="tag tag-version">${value}</span>`).join(''):'<span class="tag tag-version">Versión por confirmar</span>';
  const detailPlatforms=server.platforms.length?server.platforms.map(value=>`<span class="tag tag-platform">${value}</span>`).join(''):'<span class="tag tag-platform">Plataforma por confirmar</span>';
  const pending=server.id==='nightcraft';
  const gallery=pending?`<section class="profile-gallery"><div class="profile-section-heading"><div><p class="eyebrow">UN VISTAZO AL MUNDO</p><h3>Galería del servidor</h3></div><span>CAPTURAS</span></div><div class="profile-gallery-grid">${[1,2,3].map((n)=>`<div class="profile-photo-slot" data-photo="./imagenes/servidores/nightcraft/captura-${n}.webp"><div class="photo-placeholder"><span>✦</span><strong>Captura ${String(n).padStart(2,'0')}</strong><small>Agrega una imagen del mundo</small></div></div>`).join('')}</div></section>`:'';
  const links=`<section class="profile-links"><div class="profile-section-heading"><div><p class="eyebrow">CONECTA CON LA COMUNIDAD</p><h3>Enlaces</h3></div></div><div class="profile-link-grid"><div class="profile-link-item"><span class="profile-link-icon">◉</span><span><small>DISCORD</small><strong>${server.links?.discord?'Abrir comunidad':'Información pendiente'}</strong></span>${server.links?.discord?`<a href="${server.links.discord}" target="_blank" rel="noreferrer" aria-label="Abrir Discord">↗</a>`:'<i>—</i>'}</div><div class="profile-link-item"><span class="profile-link-icon">↗</span><span><small>PÁGINA WEB</small><strong>${server.links?.website?'Visitar sitio':'Información pendiente'}</strong></span>${server.links?.website?`<a href="${server.links.website}" target="_blank" rel="noreferrer" aria-label="Abrir sitio web">↗</a>`:'<i>—</i>'}</div></div></section>`;
  $('#modalContent').innerHTML=`<div class="profile-hero ${server.style?`detail-art--${server.style}`:''}"><div class="profile-hero-glow"></div><div class="profile-hero-copy"><span class="profile-kicker"><i></i>${server.kicker||'NEXORA · COMMUNITY'}</span><h2>${server.name}</h2><p>${server.region}</p><div class="profile-status"><i></i>Estado sin consultar</div></div><div class="profile-hero-mark">${server.logo?`<img class="detail-logo" src="${server.logo}" alt="Logo de ${server.name}">`:`<span>${server.icon}</span>`}</div></div><div class="profile-main"><div class="profile-topline"><div><p class="eyebrow">DIRECCIÓN DEL SERVIDOR</p><button class="detail-ip" id="detailCopy"><span>${server.ip}</span><span>Copiar IP ↗</span></button></div><div class="profile-live"><span class="live-orbit">◌</span><small>ESTADO EN VIVO</small><strong>Sin consultar</strong></div></div><div class="profile-section-heading"><div><p class="eyebrow">EXPLORA SU ESTILO</p><h3>Modalidades y compatibilidad</h3></div></div><div class="tag-list detail-tags">${server.modes.map(value=>`<span class="tag">${value}</span>`).join('')}${detailVersions}${detailPlatforms}</div><div class="profile-info-grid"><section class="profile-description"><p class="eyebrow">ACERCA DEL SERVIDOR</p><p>${server.desc}</p></section><div class="profile-data"><div><span>JUGADORES</span><strong>—</strong><small>Dato no disponible</small></div><div><span>VERSIÓN</span><strong>${server.versions.join(', ')||'Por confirmar'}</strong><small>Compatibilidad pendiente</small></div></div></div>${gallery}${links}<p class="detail-note">Los datos de estado y jugadores aparecerán cuando NEXORA conecte una API de consulta. No se muestran cifras estimadas.</p></div>`;
  $$('.profile-photo-slot', $('#modalContent')).forEach(slot=>{const image=new Image();image.onload=()=>{const photo=document.createElement('img');photo.src=image.src;photo.alt=`Captura ${slot.dataset.photo.split('-').pop().split('.')[0]} de ${server.name}`;slot.replaceChildren(photo);slot.classList.add('has-photo')};image.src=slot.dataset.photo});
  $('#detailCopy').onclick=async()=>{try{await navigator.clipboard.writeText(server.ip);toast('Dirección copiada')}catch{toast(server.ip,'tap')}};
  overlay.classList.add('open'); document.body.classList.add('modal-open'); playSound('open'); $('#closeModal').focus();
}

function closeModal() { overlay.classList.remove('open'); $('#overlay .modal').classList.remove('server-profile-modal'); document.body.classList.remove('modal-open'); }

function publish() {
  $('#overlay .modal').classList.remove('server-profile-modal');
  $('#modalTitle').textContent='Publica tu servidor';
  $('#modalContent').innerHTML=`<div class="form-note">Tu propuesta se guardará como pendiente en este navegador. Para publicarla a toda la comunidad, NEXORA necesitará conectar un servicio de moderación.</div><form id="publishForm"><div class="form-grid"><label class="form-field">Nombre del servidor *<input required maxlength="48" class="field" name="name" placeholder="Mi comunidad"></label><label class="form-field">Dirección IP *<input required maxlength="100" class="field" name="ip" placeholder="play.ejemplo.net"></label><label class="form-field">Puerto (opcional)<input type="number" min="1" max="65535" class="field" name="port" placeholder="25565"></label><label class="form-field">Versión *<input required class="field" name="version" placeholder="1.21, 1.20.x"></label><label class="form-field">Modalidades *<input required class="field" name="modes" placeholder="Survival, Skyblock…"></label><label class="form-field">Plataforma<select class="field" name="platform"><option>Java</option><option>Bedrock</option><option>Java y Bedrock</option></select></label><label class="form-field full">Descripción *<textarea required maxlength="500" class="field" name="description" placeholder="¿Qué hace especial a tu comunidad?"></textarea></label><label class="form-field">Discord<input class="field" name="discord" placeholder="https://discord.gg/…"></label><label class="form-field">Página web<input class="field" name="website" placeholder="https://…"></label><label class="form-field full">URL del logo o imagen<input class="field" name="image" placeholder="https://…"></label></div><div class="form-actions"><button type="button" class="button button-outline" id="cancelForm">Cancelar</button><button class="button button-dark">Guardar propuesta pendiente <span>↗</span></button></div></form>`;
  $('#cancelForm').onclick=closeModal;
  $('#publishForm').onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const queue=readList('nexoraPendingServers');queue.push({...data,submittedAt:new Date().toISOString(),status:'pending'});localStorage.setItem('nexoraPendingServers',JSON.stringify(queue));closeModal();toast('Propuesta guardada como pendiente')};
  overlay.classList.add('open'); document.body.classList.add('modal-open'); playSound('open');
}

function setSound(enabled) {
  soundEnabled=enabled; localStorage.setItem('nexoraSound',enabled?'on':'off');
  $('#soundToggle').checked=enabled; $('#soundIcon').textContent=enabled?'♫':'♪'; $('#soundLabel').textContent=enabled?'Sonido':'Silencio';
  if(enabled) playSound('success');
}

function setTheme(enabled, announce=true) {
  darkMode=enabled;
  document.documentElement.dataset.theme=enabled?'dark':'light';
  $('meta[name="theme-color"]').content=enabled?'#181310':'#402e2b';
  localStorage.setItem('nexoraTheme',enabled?'dark':'light');
  $('#themeToggle').checked=enabled;
  $('#themeIcon').textContent=enabled?'☼':'☾';
  $('#themeLabel').textContent=enabled?'Claro':'Oscuro';
  if(announce) toast(enabled?'Modo oscuro activado':'Modo claro activado','tap');
}

function persistPlayerProfile(){
  try{localStorage.setItem('nexoraProfile',JSON.stringify(playerProfile));return true}
  catch{toast('No se pudo guardar el perfil en este navegador');return false}
}

function applyPlayerProfile(){
  const preset=avatarPresets[playerProfile.avatar]||avatarPresets.bruma;
  $$('[data-profile-avatar]').forEach(node=>{node.dataset.avatar=playerProfile.avatar;node.textContent=preset.mark});
  const name=$('#sidebarProfileName');if(name)name.textContent=playerProfile.name||defaultPlayerProfile.name;
  const preview=$('#profileAvatarPreview');if(preview){preview.dataset.avatar=playerProfile.avatar;preview.querySelector('span').textContent=preset.mark}
}

function openSkinDatabase(){
  if(skinDatabasePromise)return skinDatabasePromise;
  skinDatabasePromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('Este navegador no permite guardar archivos localmente.'));return}
    const request=indexedDB.open('nexora-player-assets',1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('skins'))db.createObjectStore('skins',{keyPath:'id'})};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('No se pudo abrir la biblioteca local.'));
  });
  return skinDatabasePromise;
}

async function getSavedSkins(){
  const db=await openSkinDatabase();
  return new Promise((resolve,reject)=>{const request=db.transaction('skins','readonly').objectStore('skins').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.createdAt-a.createdAt));request.onerror=()=>reject(request.error)});
}

async function saveSkinRecord(record){
  const db=await openSkinDatabase();
  return new Promise((resolve,reject)=>{const tx=db.transaction('skins','readwrite');tx.objectStore('skins').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
}

async function removeSkinRecord(id){
  const db=await openSkinDatabase();
  return new Promise((resolve,reject)=>{const tx=db.transaction('skins','readwrite');tx.objectStore('skins').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
}

async function clearSavedSkins(){
  try{const db=await openSkinDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('skins','readwrite');tx.objectStore('skins').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});}
  catch{/* La base puede no existir en navegadores que no soporten IndexedDB. */}
}

async function renderSkinLibrary(){
  const container=$('#skinList');if(!container)return;
  skinObjectUrls.forEach(url=>URL.revokeObjectURL(url));skinObjectUrls=[];
  try{
    const skins=await getSavedSkins();container.replaceChildren();
    if(!skins.length){const empty=document.createElement('div');empty.className='skin-empty';empty.innerHTML='<span>▧</span><strong>Aún no has añadido skins</strong><small>Cuando subas una, aparecerá aquí.</small>';container.append(empty);return}
    if(activeSkinId&&!skins.some(skin=>skin.id===activeSkinId)){activeSkinId='';localStorage.removeItem('nexoraActiveSkin')}
    for(const skin of skins){
      const card=document.createElement('article');card.className=`skin-card${skin.id===activeSkinId?' is-active':''}`;
      const previewWrap=document.createElement('div');previewWrap.className='skin-preview-wrap';
      const image=document.createElement('img');image.className='skin-preview';image.src=URL.createObjectURL(skin.blob);image.alt=`Textura de ${skin.name}`;image.title='Textura PNG';skinObjectUrls.push(image.src);previewWrap.append(image);
      const copy=document.createElement('div');copy.className='skin-card-copy';const title=document.createElement('strong');title.textContent=skin.name;const dimensions=document.createElement('small');dimensions.textContent=`${skin.width} × ${skin.height} · PNG`;copy.append(title,dimensions);
      const actions=document.createElement('div');actions.className='skin-card-actions';
      const activate=document.createElement('button');activate.type='button';activate.dataset.activateSkin=skin.id;activate.textContent=skin.id===activeSkinId?'Activa':'Activar';
      const remove=document.createElement('button');remove.type='button';remove.className='skin-delete';remove.dataset.deleteSkin=skin.id;remove.textContent='Eliminar';actions.append(activate,remove);copy.append(actions);card.append(previewWrap,copy);container.append(card);
    }
  }catch(error){container.innerHTML='<div class="skin-empty"><strong>No se pudo abrir tu biblioteca</strong><small>Prueba en un navegador actualizado.</small></div>';}
}

function createStarterSkin(model){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const alex=model==='alex';
  const colors=alex?{hair:'#b75d32',hairLight:'#d9884e',skin:'#e8b98e',shirt:'#52765b',shirtDark:'#385642',pants:'#654b82',pantsDark:'#49355f'}:{hair:'#624832',hairLight:'#876446',skin:'#dca77c',shirt:'#426e9c',shirtDark:'#31567d',pants:'#34557b',pantsDark:'#263e5f'};
  const rect=(x,y,w,h,color)=>{context.fillStyle=color;context.fillRect(x,y,w,h)};
  // Head, face, hair, and the UV rectangles used by the default 64px skin atlas.
  rect(0,0,32,16,colors.hair);rect(8,8,8,8,colors.skin);rect(8,8,8,2,colors.hair);
  rect(9,11,2,1,'#493c35');rect(13,11,2,1,'#493c35');rect(11,12,2,2,'#c98665');rect(10,15,4,1,'#92594c');
  rect(32,0,32,16,'rgba(0,0,0,0)');
  // Shirt, sleeves, arm skin, and matching second-layer clothing.
  rect(16,16,24,16,colors.shirt);rect(20,28,8,4,colors.shirtDark);
  rect(40,16,16,16,colors.shirt);rect(40,27,16,5,colors.skin);rect(40,16,16,3,colors.shirtDark);
  rect(32,48,16,16,colors.shirt);rect(32,59,16,5,colors.skin);rect(32,48,16,3,colors.shirtDark);
  rect(16,32,24,16,colors.shirtDark);rect(40,32,16,16,colors.shirtDark);rect(48,48,16,16,colors.shirtDark);
  // Trousers and the lower legs on both sides of the atlas.
  rect(0,16,16,16,colors.pants);rect(0,27,16,5,colors.pantsDark);rect(16,48,16,16,colors.pants);rect(16,59,16,5,colors.pantsDark);
  rect(0,32,16,16,colors.pantsDark);rect(0,48,16,16,colors.pantsDark);
  return canvas;
}

function setSkinViewerStatus(message,failed=false){
  const stage=$('.skin-viewer-stage');const status=$('#skinViewerStatus');
  if(status)status.textContent=message;
  if(stage)stage.classList.toggle('skin-viewer-failed',failed);
}

function resizeSkinViewer(){
  if(!skinViewerInstance)return;
  const stage=$('.skin-viewer-stage');if(!stage)return;
  const bounds=stage.getBoundingClientRect();if(bounds.width<10||bounds.height<10)return;
  skinViewerInstance.width=Math.round(bounds.width);skinViewerInstance.height=Math.round(bounds.height);
}

function ensureSkinViewer(){
  const stage=$('.skin-viewer-stage');const canvas=$('#skin3dCanvas');
  if(!stage||!canvas)return false;
  if(skinViewerInstance){resizeSkinViewer();return true}
  if(!window.skinview3d?.SkinViewer){setSkinViewerStatus('El visor 3D no se pudo cargar. Puedes seguir guardando skins.',true);return false}
  const bounds=stage.getBoundingClientRect();
  try{
    skinViewerInstance=new window.skinview3d.SkinViewer({canvas,width:Math.max(220,Math.round(bounds.width)),height:Math.max(260,Math.round(bounds.height)),pixelRatio:Math.min(window.devicePixelRatio||1,1.5),skin:'./imagenes/elementos/skindefault.png',model:playerModel==='alex'?'slim':'default',zoom:.72,background:null,enableControls:true});
    // Keep the avatar completely still; OrbitControls still lets the user drag it manually.
    skinViewerInstance.autoRotate=false;
    skinViewerInstance.animation=null;
    stage.classList.add('skin-viewer-ready');
    setSkinViewerStatus('Arrastra el personaje para girarlo · rueda para acercar');
    if('ResizeObserver' in window){skinViewerResizeObserver=new ResizeObserver(resizeSkinViewer);skinViewerResizeObserver.observe(stage)}
    return true;
  }catch(error){skinViewerInstance=null;setSkinViewerStatus('Tu navegador no pudo iniciar el visor 3D. Aún puedes guardar skins.',true);return false}
}

async function refreshSkinViewer(){
  if(!ensureSkinViewer())return;
  const modelType=playerModel==='alex'?'slim':'default';
  const selected=$$('[data-model-choice]');selected.forEach(button=>{const active=button.dataset.modelChoice===playerModel;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active))});
  let nextUrl='';let active=null;let fallbackMessage='';
  try{
    let skins=[];try{skins=await getSavedSkins()}catch(error){console.warn('La biblioteca local no está disponible; se usará la skin default.',error)}
    active=skins.find(skin=>skin.id===activeSkinId)||null;
    if(activeSkinId&&!active){activeSkinId='';localStorage.removeItem('nexoraActiveSkin')}
    let source='./imagenes/elementos/skindefault.png';
    if(active){nextUrl=URL.createObjectURL(active.blob);source=nextUrl}
    if(playerEquipment.armor!=='none')source=await createArmoredSkin(source,playerEquipment.armor);
    try{await skinViewerInstance.loadSkin(source,{model:modelType})}
    catch(error){
      console.error('No se pudo cargar la skin seleccionada:',error);
      if(active){if(nextUrl)URL.revokeObjectURL(nextUrl);nextUrl='';activeSkinId='';localStorage.removeItem('nexoraActiveSkin');source='./imagenes/elementos/skindefault.png';if(playerEquipment.armor!=='none')source=await createArmoredSkin(source,playerEquipment.armor);await skinViewerInstance.loadSkin(source,{model:modelType});fallbackMessage='La skin guardada falló; se restauró la skin default.'}
      else{await skinViewerInstance.loadSkin(createStarterSkin(playerModel),{model:modelType});fallbackMessage='No se pudo abrir skindefault.png; se muestra la skin de respaldo.'}
    }
    if(currentViewerSkinUrl)URL.revokeObjectURL(currentViewerSkinUrl);
    currentViewerSkinUrl=nextUrl;
    skinViewerInstance.playerObject.skin.modelType=modelType;
    skinViewerInstance.autoRotate=false;
    const cape=playerEquipment.back==='none'?null:makeCapeTexture();
    if(cape)await skinViewerInstance.loadCape(cape,{backEquipment:playerEquipment.back==='elytra'?'elytra':'cape'});else skinViewerInstance.loadCape(null);
    setSkinViewerStatus(fallbackMessage|| (active?`${active.name} · Modelo ${playerModel==='alex'?'Alex':'Steve'} · Arrastra para girar`:`Skin default · Modelo ${playerModel==='alex'?'Alex':'Steve'} · Arrastra para girar`));
  }catch(error){if(nextUrl)URL.revokeObjectURL(nextUrl);console.error('No se pudo actualizar el visor de skins:',error);setSkinViewerStatus(`No se pudo preparar la textura: ${error?.message||'revisa el PNG y su ruta'}`,true)}
}

function makeCapeTexture(){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=32;
  const context=canvas.getContext('2d');context.fillStyle='#765448';context.fillRect(0,0,64,32);context.fillStyle='#b39378';context.fillRect(1,1,62,2);context.fillRect(1,29,62,2);context.fillStyle='#342620';context.fillRect(5,5,54,22);context.fillStyle='#c5a288';context.fillRect(29,7,6,18);context.fillRect(23,13,18,6);return canvas;
}

async function createArmoredSkin(source,type){
  const image=new Image();
  const imageReady=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se pudo leer la textura de armadura'))});
  image.src=typeof source==='string'?source:source.toDataURL('image/png');
  if(!image.complete)await imageReady;else if(!image.naturalWidth)await imageReady;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const context=canvas.getContext('2d');
  context.imageSmoothingEnabled=false;context.drawImage(image,0,0,64,64);
  const palettes={leather:['#805335','#a87950','#d0a06c'],iron:['#69716f','#9da19a','#d1c9b9'],diamond:['#397f75','#57b6a0','#a5ead4']};
  const [base,shade,trim]=palettes[type];
  const armorRect=(x,y,w,h)=>{context.fillStyle=base;context.fillRect(x,y,w,h);context.fillStyle=shade;context.fillRect(x,y,w,2);context.fillRect(x,y,2,h);context.fillStyle=trim;context.fillRect(x+Math.floor(w/2),y+2,2,Math.max(1,h-4));context.fillStyle=shade;context.fillRect(x,y+h-2,w,2)};
  armorRect(32,0,32,16); // casco exterior
  armorRect(16,32,24,16);armorRect(40,32,16,16); // peto y brazos
  armorRect(0,32,16,16);armorRect(0,48,16,16);armorRect(16,48,16,16);armorRect(48,48,16,16); // piernas y botas
  return canvas.toDataURL('image/png');
}

function syncWorkbench(){
  $$('[data-back-item]').forEach(button=>button.classList.toggle('is-equipped',button.dataset.backItem===playerEquipment.back));
  $$('[data-armor-item]').forEach(button=>button.classList.toggle('is-equipped',button.dataset.armorItem===playerEquipment.armor));
  $$('[data-weapon-item]').forEach(button=>button.classList.toggle('is-equipped',button.dataset.weaponItem===playerEquipment.weapon));
}

function resetEmotePose(){
  if(!skinViewerInstance)return;
  skinViewerInstance.animation=null;
  const player=skinViewerInstance.playerObject;
  player.rotation.set(0,0,0);player.position.set(0,0,0);player.resetJoints();
}

async function stopEmote(){
  clearTimeout(emoteTimeout);emoteTimeout=0;activeEmote='';
  if(!skinViewerInstance)return;
  resetEmotePose();
  if(temporaryElytra){temporaryElytra=false;await skinViewerInstance.loadCape(playerEquipment.back==='none'?null:makeCapeTexture(),{backEquipment:playerEquipment.back==='elytra'?'elytra':'cape'});}
  $$('[data-emote]').forEach(button=>button.setAttribute('aria-pressed','false'));
  const status=$('#emoteStatus');if(status)status.textContent='Elige una animación para verla en el personaje.';
}

async function playEmote(name){
  if(!ensureSkinViewer())return;
  if(name==='stop'){await stopEmote();return}
  if(activeEmote)await stopEmote();
  clearTimeout(emoteTimeout);activeEmote=name;resetEmotePose();
  const library=window.skinview3d;
  const animations={crouch:()=>new library.CrouchAnimation(),hit:()=>{const animation=new library.CrouchAnimation();animation.showProgress=true;animation.runOnce=true;animation.addHitAnimation();return animation},walk:()=>new library.WalkingAnimation(),run:()=>new library.RunningAnimation(),fly:()=>new library.FlyingAnimation(),wave:()=>new library.WaveAnimation('right'),jump:()=>new library.FunctionAnimation((player,progress)=>{const lift=Math.max(0,Math.sin(Math.min(progress,1)*Math.PI));player.position.y=lift*6;player.skin.leftArm.rotation.x=-lift*.85;player.skin.rightArm.rotation.x=-lift*.85})};
  if(!animations[name])return;
  if(name==='fly'&&playerEquipment.back!=='elytra'){temporaryElytra=true;await skinViewerInstance.loadCape(makeCapeTexture(),{backEquipment:'elytra'})}
  const animation=animations[name]();const speeds={crouch:.55,walk:.8,run:.9,jump:1.2};animation.speed=speeds[name]||1;
  skinViewerInstance.animation=animation;
  $$('[data-emote]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.emote===name)));
  const labels={crouch:'Agachándose…',hit:'¡Golpe!',walk:'Caminando…',run:'Corriendo…',fly:'Volando con élitros…',jump:'¡Salto!',wave:'Saludando…'};
  const status=$('#emoteStatus');if(status)status.textContent=labels[name]||'Animación activa';
  if(['hit','jump','wave'].includes(name))emoteTimeout=window.setTimeout(()=>stopEmote(),name==='jump'?1050:1400);
}

function renderProfile(){
  applyPlayerProfile();
  const input=$('#profileNameInput');if(input)input.value=playerProfile.name||defaultPlayerProfile.name;
  $$('[data-avatar-choice]').forEach(button=>{const selected=button.dataset.avatarChoice===playerProfile.avatar;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected))});
  $$('[data-model-choice]').forEach(button=>{const selected=button.dataset.modelChoice===playerModel;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected))});
  renderSkinLibrary();
  refreshSkinViewer();
}

applyPlayerProfile();

document.addEventListener('click', event=>{
  const navigation=event.target.closest('[data-page]');
  if(navigation){navigate(navigation.dataset.page);return;}
  if(event.target.closest('button') && !event.target.closest('[data-favorite],[data-copy],[data-detail],[data-open],[data-screenshot],#openPublish,#downloadNotice,#soundButton,#themeButton,#clearRecent,#clearActivity,#resetLocal,[type="submit"]')) playSound('tap');
});

$('#openPublish').onclick=publish;
$('#closeModal').onclick=closeModal;
overlay.addEventListener('click',event=>{if(event.target===overlay)closeModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('open'))closeModal()});
$('#downloadNotice').onclick=()=>toast('La descarga de NEXORA Beta estará disponible muy pronto');
$$('[data-screenshot]').forEach(button=>button.addEventListener('click',()=>{
  $('#modalTitle').textContent=button.dataset.screenshot;
  $('#modalContent').innerHTML=button.dataset.loadedImage?`<img class="screenshot-preview" src="${button.dataset.loadedImage}" alt="${button.dataset.screenshot}">`:'<div class="preview-placeholder"><span>✧</span><strong>CAPTURA EN PREPARACIÓN</strong><small>El equipo de NEXORA añadirá aquí una imagen real del launcher.</small></div>';
  overlay.classList.add('open');document.body.classList.add('modal-open');playSound('open');
}));
$$('.screenshot-slot[data-image]').forEach(button=>{const image=new Image();image.onload=()=>{const frame=$('.slot-frame',button);image.className='slot-image';image.alt='';frame.append(image);frame.classList.add('has-image');button.dataset.loadedImage=image.src};image.src=button.dataset.image});
$$('.creator-photo').forEach(image=>{const showPhoto=()=>image.parentElement.classList.add('has-photo');image.addEventListener('load',showPhoto,{once:true});image.addEventListener('error',()=>image.remove(),{once:true});if(image.complete&&image.naturalWidth)showPhoto()});
$$('[data-coming]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();toast(`${link.dataset.coming}: enlace próximamente`)}));
const revealTargets=$$('#page-home .landing-section,#page-home .feature-card,#page-home .screenshot-slot,#page-home .discover-card,#page-home .download-section,#page-home .team-card,#page-home .community-section');
const motionReduced=localStorage.getItem('nexoraMotion')==='on'||matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!motionReduced){
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal-in');revealObserver.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -6% 0px'});
  revealTargets.forEach(target=>{target.classList.add('reveal-pending');revealObserver.observe(target)});
}else revealTargets.forEach(target=>target.classList.add('reveal-in'));
const heroImage=$('.cinema-image');
const remoteHero=heroImage.dataset.fallbackSrc;
heroImage.addEventListener('error',()=>{if(!heroImage.dataset.remoteFallback){heroImage.dataset.remoteFallback='true';heroImage.src=remoteHero}else{heroImage.style.display='none';$('.cinema-hero').classList.add('image-missing')}});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  let heroFrame=0;
  window.addEventListener('scroll',()=>{if(heroFrame)return;heroFrame=requestAnimationFrame(()=>{const amount=Math.min(window.scrollY,420)*.035;heroImage.style.transform=`translate3d(0,${amount}px,0) scale(1.035)`;heroFrame=0})},{passive:true});
}
['search','versionFilter','modeFilter'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',renderServers));
$('#chips').addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(!button)return;modeChip=button.dataset.mode;$$('.chip',$('#chips')).forEach(chip=>chip.classList.toggle('active',chip===button));renderServers()});
$('#platformToggle').addEventListener('click',event=>{const button=event.target.closest('[data-platform]');if(!button)return;platform=button.dataset.platform;$$('button',$('#platformToggle')).forEach(item=>item.classList.toggle('active',item===button));renderServers()});
$('#clearRecent').onclick=()=>{recent=[];localStorage.removeItem('nexoraRecent');renderRecent();if(currentPage==='activity')renderActivity();toast('Historial limpiado')};
$('#clearActivity').onclick=()=>{recent=[];localStorage.removeItem('nexoraRecent');renderRecent();renderActivity();toast('Historial limpiado')};
$('#soundButton').onclick=()=>setSound(!soundEnabled);
$('#themeButton').onclick=()=>setTheme(!darkMode);
$('#themeToggle').checked=darkMode;$('#themeToggle').onchange=event=>setTheme(event.target.checked);
$('#soundToggle').checked=soundEnabled;$('#soundToggle').onchange=event=>setSound(event.target.checked);
$('#motionToggle').checked=localStorage.getItem('nexoraMotion')==='on';
$('#motionToggle').onchange=event=>{document.documentElement.classList.toggle('reduce-motion',event.target.checked);localStorage.setItem('nexoraMotion',event.target.checked?'on':'off');toast(event.target.checked?'Animaciones reducidas':'Animaciones activadas','tap')};
document.documentElement.classList.toggle('reduce-motion',localStorage.getItem('nexoraMotion')==='on');
$('#avatarOptions').addEventListener('click',event=>{
  const choice=event.target.closest('[data-avatar-choice]');if(!choice)return;
  playerProfile.avatar=choice.dataset.avatarChoice;persistPlayerProfile();applyPlayerProfile();
  $$('[data-avatar-choice]').forEach(button=>{const selected=button.dataset.avatarChoice===playerProfile.avatar;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected))});
  toast(`Avatar ${avatarPresets[playerProfile.avatar].name} seleccionado`,'tap');
});
$('.skin-model-picker').addEventListener('click',event=>{
  const choice=event.target.closest('[data-model-choice]');if(!choice)return;
  playerModel=choice.dataset.modelChoice;localStorage.setItem('nexoraSkinModel',playerModel);refreshSkinViewer();toast(`Modelo ${playerModel==='alex'?'Alex':'Steve'} seleccionado`,'tap');
});
$('#saveProfileName').onclick=()=>{
  const name=$('#profileNameInput').value.trim();
  if(!name){toast('Escribe un nombre para tu perfil','tap');return}
  playerProfile.name=name;persistPlayerProfile();applyPlayerProfile();toast('Nombre de perfil guardado');
};
$('#profileNameInput').addEventListener('keydown',event=>{if(event.key==='Enter')$('#saveProfileName').click()});
$('#skinUpload').addEventListener('change',async event=>{
  const files=[...event.target.files];event.target.value='';if(!files.length)return;
  let saved=0;const errors=[];
  try{
    const existing=await getSavedSkins();
    for(const file of files){
      if(existing.length+saved>=12){errors.push('Máximo 12 skins');break}
      if(file.size>2*1024*1024){errors.push(`${file.name}: supera 2 MB`);continue}
      if(file.type!=='image/png'&&!file.name.toLowerCase().endsWith('.png')){errors.push(`${file.name}: debe ser PNG`);continue}
      let bitmap;
      try{bitmap=await createImageBitmap(file)}catch{errors.push(`${file.name}: no se pudo leer la imagen`);continue}
      const {width,height}=bitmap;bitmap.close();
      if(!((width===64&&height===64)||(width===64&&height===32))){errors.push(`${file.name}: la textura debe medir 64×64 o 64×32`);continue}
      const id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await saveSkinRecord({id,name:file.name.replace(/\.png$/i,''),blob:file,width,height,createdAt:Date.now()});saved++;
    }
    if(saved&&!activeSkinId){const latest=(await getSavedSkins())[0];if(latest){activeSkinId=latest.id;localStorage.setItem('nexoraActiveSkin',activeSkinId)}}
    await renderSkinLibrary();await refreshSkinViewer();
    if(saved)toast(`${saved} skin${saved===1?'':'s'} guardada${saved===1?'':'s'} en este dispositivo`);
    if(errors.length)toast(errors.slice(0,2).join(' · '),'tap');
  }catch{toast('No se pudo guardar la skin. Revisa el almacenamiento del navegador')}
});
$('#skinList').addEventListener('click',async event=>{
  const activate=event.target.closest('[data-activate-skin]');
  const remove=event.target.closest('[data-delete-skin]');
  try{
    if(activate){activeSkinId=activate.dataset.activateSkin;localStorage.setItem('nexoraActiveSkin',activeSkinId);await renderSkinLibrary();await refreshSkinViewer();toast('Skin marcada como activa','tap')}
    if(remove){const id=remove.dataset.deleteSkin;await removeSkinRecord(id);if(activeSkinId===id){activeSkinId='';localStorage.removeItem('nexoraActiveSkin')}await renderSkinLibrary();await refreshSkinViewer();toast('Skin eliminada')}
  }catch{toast('No se pudo actualizar la biblioteca de skins')}
});
$('#openSkinWorkbench').addEventListener('click',()=>{const panel=$('#skinWorkbench');const opening=panel.hidden;panel.hidden=!opening;$('#openSkinWorkbench').setAttribute('aria-expanded',String(opening));if(opening)syncWorkbench()});
$('#closeSkinWorkbench').addEventListener('click',()=>{$('#skinWorkbench').hidden=true;$('#openSkinWorkbench').setAttribute('aria-expanded','false')});
$('#skinWorkbench').addEventListener('click',event=>{
  const emote=event.target.closest('[data-emote]');if(emote){playEmote(emote.dataset.emote);return}
  const choice=event.target.closest('[data-back-item],[data-armor-item],[data-weapon-item]');if(!choice)return;
  if(choice.dataset.backItem)playerEquipment.back=choice.dataset.backItem;
  if(choice.dataset.armorItem)playerEquipment.armor=choice.dataset.armorItem;
  if(choice.dataset.weaponItem)playerEquipment.weapon=choice.dataset.weaponItem;
  localStorage.setItem('nexoraEquipment',JSON.stringify(playerEquipment));syncWorkbench();refreshSkinViewer();
});
$('#resetLocal').onclick=async()=>{for(const key of ['nexoraFavs','nexoraRecent','nexoraPendingServers','nexoraProfile','nexoraActiveSkin','nexoraSkinModel','nexoraEquipment'])localStorage.removeItem(key);favorites.clear();recent=[];playerProfile={...defaultPlayerProfile};activeSkinId='';playerModel='steve';playerEquipment={...defaultEquipment};await clearSavedSkins();applyPlayerProfile();renderRecent();renderServers();renderFavorites();renderActivity();renderProfile();toast('Datos locales borrados')};
renderServers();renderFavorites();renderRecent();navigate('home',{silent:true});
setTheme(darkMode,false);

// Estela Glow del puntero: se activa solo en dispositivos con mouse y respeta movimiento reducido.
if(matchMedia('(hover: hover) and (pointer: fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('reduce-motion')){
  const trail=document.createElement('canvas');trail.className='pointer-glow-trail';trail.setAttribute('aria-hidden','true');document.body.append(trail);
  const context=trail.getContext('2d');let points=[];let frame=0;let width=0;let height=0;const dpr=Math.min(window.devicePixelRatio||1,2);
  const resizeTrail=()=>{width=window.innerWidth;height=window.innerHeight;trail.width=Math.round(width*dpr);trail.height=Math.round(height*dpr);trail.style.width=`${width}px`;trail.style.height=`${height}px`;context.setTransform(dpr,0,0,dpr,0,0)};
  resizeTrail();window.addEventListener('resize',resizeTrail,{passive:true});
  window.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;points.push({x:event.clientX,y:event.clientY,t:performance.now()});if(points.length>8)points.shift();if(!frame)frame=requestAnimationFrame(drawTrail)},{passive:true});
  function drawTrail(now){frame=0;context.clearRect(0,0,width,height);points=points.filter(point=>now-point.t<135);if(points.length>1){context.lineCap='round';context.lineJoin='round';for(let i=1;i<points.length;i++){const age=(now-points[i].t)/135;context.beginPath();context.moveTo(points[i-1].x,points[i-1].y);context.lineTo(points[i].x,points[i].y);context.strokeStyle=`rgba(224,190,169,${Math.max(0,.24-age*.24)})`;context.lineWidth=Math.max(.4,1.7*(1-age));context.shadowColor='rgba(231,190,166,.62)';context.shadowBlur=6*(1-age);context.stroke()}}if(points.length)frame=requestAnimationFrame(drawTrail)}
}
