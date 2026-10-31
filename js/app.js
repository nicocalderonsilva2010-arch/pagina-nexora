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
let currentPage = 'home';
let modeChip = '';
let platform = '';
let showFavorites = false;
let soundEnabled = localStorage.getItem('nexoraSound') !== 'off';
let darkMode = localStorage.getItem('nexoraTheme') === 'dark';
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
  $$('.page').forEach(view => view.classList.toggle('active', view.id === 'page-' + page));
  $$('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  $('#crumbCurrent').textContent = $('#page-' + page).dataset.title;
  document.title = `NEXORA — ${$('#page-' + page).dataset.title}`;
  if (page === 'favorites') renderFavorites();
  if (page === 'activity') renderActivity();
  if (!options.silent) playSound('open');
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

function card(server, index=0) {
  const versionTags=server.versions.length?server.versions.map(value=>`<span class="tag tag-version">${value}</span>`).join(''):'<span class="tag tag-version">Versión por confirmar</span>';
  const platformTags=server.platforms.length?server.platforms.map(value=>`<span class="tag tag-platform">${value}</span>`).join(''):'<span class="tag tag-platform">Plataforma por confirmar</span>';
  return `<article class="server-card ${server.style?`server-card--${server.style}`:''}" style="--card-index:${index}">
    <div class="server-cover ${server.style?`server-cover--${server.style}`:''}" data-mark="${server.mark}">${server.logo?`<img class="server-logo" src="${server.logo}" alt="" loading="lazy">`:`<div class="server-symbol">${server.icon}</div>`}<span class="cover-caption">${server.kicker||'NEXORA · COMMUNITY'}</span><button class="favorite-button ${favorites.has(server.id)?'is-favorite':''}" data-favorite="${server.id}" aria-label="${favorites.has(server.id)?'Quitar de':'Añadir a'} favoritos">${favorites.has(server.id)?'♥':'♡'}</button></div>
    <div class="server-card-body"><div class="server-title"><div><h3>${server.name}</h3><span>${server.region}</span></div><span class="status-label"><i></i> Sin verificar</span></div>
      <button class="server-ip" data-copy="${server.id}" aria-label="Copiar ${server.ip}">⌁ &nbsp; ${server.ip}<span>Copiar</span></button>
      <div class="tag-list">${server.modes.map(value=>`<span class="tag">${value}</span>`).join('')}${versionTags}${platformTags}</div>
      <p class="server-description">${server.desc}</p><div class="server-card-footer"><span class="no-live-data">Jugadores: —</span><button class="detail-button" data-detail="${server.id}">Ver perfil <span>↗</span></button></div>
    </div></article>`;
}

function bindCards(container) {
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
  $('#modalTitle').textContent=server.name;
  const detailVersions=server.versions.length?server.versions.map(value=>`<span class="tag tag-version">${value}</span>`).join(''):'<span class="tag tag-version">Versión por confirmar</span>';
  const detailPlatforms=server.platforms.length?server.platforms.map(value=>`<span class="tag tag-platform">${value}</span>`).join(''):'<span class="tag tag-platform">Plataforma por confirmar</span>';
  $('#modalContent').innerHTML=`<div class="detail-art ${server.style?`detail-art--${server.style}`:''}">${server.logo?`<img class="detail-logo" src="${server.logo}" alt="Logo de ${server.name}">`:`<span>${server.icon}</span>`}<b>${server.mark}</b></div><div class="detail-region">${server.region} <span class="status-label"><i></i> Estado sin verificar</span></div><button class="detail-ip" id="detailCopy"><span>${server.ip}</span><span>Copiar IP ↗</span></button><div class="tag-list detail-tags">${server.modes.map(value=>`<span class="tag">${value}</span>`).join('')}${detailVersions}${detailPlatforms}</div><div class="detail-section"><p class="eyebrow">ACERCA DEL SERVIDOR</p><p>${server.desc}</p></div><div class="detail-stats"><div><span>JUGADORES</span><strong>—</strong></div><div><span>ESTADO</span><strong>No consultado</strong></div><div><span>COMPATIBILIDAD</span><strong>${server.platforms.join(' / ')||'Por confirmar'}</strong></div></div><p class="detail-note">Los datos de conexión se mostrarán cuando NEXORA incorpore una API de consulta.</p>`;
  $('#detailCopy').onclick=async()=>{try{await navigator.clipboard.writeText(server.ip);toast('Dirección copiada')}catch{toast(server.ip,'tap')}};
  overlay.classList.add('open'); document.body.classList.add('modal-open'); playSound('open'); $('#closeModal').focus();
}

function closeModal() { overlay.classList.remove('open'); document.body.classList.remove('modal-open'); }

function publish() {
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
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal-in');revealObserver.unobserve(entry.target)}}),{threshold:.12});
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
$('#resetLocal').onclick=()=>{for(const key of ['nexoraFavs','nexoraRecent','nexoraPendingServers'])localStorage.removeItem(key);favorites.clear();recent=[];renderRecent();renderServers();renderFavorites();renderActivity();toast('Datos locales borrados')};
renderServers();renderFavorites();renderRecent();navigate('home',{silent:true});
setTheme(darkMode,false);
