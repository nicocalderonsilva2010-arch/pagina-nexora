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
let savedMods = readList('nexoraSavedMods').filter(mod => mod && typeof mod.project_id === 'string');
let modView = 'catalog';
let modHits = [];
let modTotal = 0;
let modAbortController;
let modRequestId = 0;
let modSearchTimer;
let modrinthLoaded = false;
const modrinthCache = new Map();
let playSessions = normalizeActivitySessions(readList('nexoraPlaySessions'));
let activityConnected = false;
let activitySearchTimer;
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
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function normalizeActivitySessions(input) {
  const rows = Array.isArray(input) ? input : Array.isArray(input?.sessions) ? input.sessions : [];
  return rows.map((session,index)=>{
    if(!session||typeof session!=='object')return null;
    const start = typeof session.startedAt === 'number' ? session.startedAt : Date.parse(session.startedAt);
    const end = session.endedAt == null || session.endedAt === '' ? null : typeof session.endedAt === 'number' ? session.endedAt : Date.parse(session.endedAt);
    if(!Number.isFinite(start)||start>Date.now()||end!==null&&(!Number.isFinite(end)||end<start))return null;
    const rawType=String(session.type||session.kind||'server').toLowerCase();
    const type=['world','singleplayer','single-player'].includes(rawType)?'world':'server';
    return {id:String(session.id||`${start}-${index}`),type,name:String(session.name||session.worldName||session.serverName||(type==='world'?'Mundo sin nombre':'Servidor')),address:String(session.address||session.serverAddress||''),mode:String(session.mode||''),version:String(session.version||''),edition:String(session.edition||''),startedAt:start,endedAt:end};
  }).filter(Boolean);
}

function formatPlayDuration(milliseconds) {
  const minutes=Math.max(0,Math.floor(milliseconds/60000));
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return hours?`${hours} h${rest?` ${rest} min`:''}`:`${minutes} min`;
}
function activityDayKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function activityDurationByDay(sessions) {
  const totals=new Map();
  sessions.forEach(session=>{
    let cursor=session.startedAt;const end=session.endedAt??Date.now();
    while(cursor<end){
      const day=new Date(cursor);day.setHours(0,0,0,0);
      const next=new Date(day);next.setDate(next.getDate()+1);
      const portion=Math.min(end,next.getTime())-cursor;
      const key=activityDayKey(day);totals.set(key,(totals.get(key)||0)+portion);cursor+=portion;
    }
  });
  return totals;
}
function activityDurationInRange(session,start,end) {
  const sessionEnd=session.endedAt??Date.now();
  return Math.max(0,Math.min(sessionEnd,end)-Math.max(session.startedAt,start));
}
function renderPlayActivity() {
  const page=$('#page-library');if(!page)return;
  const now=Date.now();
  const today=new Date();today.setHours(0,0,0,0);
  const daily=activityDurationByDay(playSessions);
  $('#activityConnectionStatus').classList.toggle('is-connected',activityConnected);
  $('#activityConnectionStatus').innerHTML=`<i></i> ${activityConnected?'Launcher conectado':playSessions.length?'Última actividad guardada':'Esperando al launcher'}`;

  const weekItems=Array.from({length:7},(_,index)=>{const day=new Date(today);day.setDate(today.getDate()-6+index);return {day,value:daily.get(activityDayKey(day))||0}});
  const weekStart=new Date(today);weekStart.setDate(today.getDate()-6);
  const weekEnd=new Date(today);weekEnd.setDate(today.getDate()+1);
  const previousStart=new Date(weekStart);previousStart.setDate(weekStart.getDate()-7);
  const weekTotal=weekItems.reduce((sum,item)=>sum+item.value,0);
  const previousTotal=playSessions.reduce((sum,session)=>sum+activityDurationInRange(session,previousStart.getTime(),weekStart.getTime()),0);
  const recentSessions=playSessions.filter(session=>session.startedAt<weekEnd.getTime()&&(session.endedAt??now)>weekStart.getTime());
  const recentDurations=recentSessions.map(session=>activityDurationInRange(session,weekStart.getTime(),weekEnd.getTime()));
  $('#activityWeekTime').textContent=formatPlayDuration(weekTotal);
  const change=$('#activityWeekChange');
  if(previousTotal===0&&weekTotal===0){change.textContent='—';change.className='activity-week-change'}
  else if(previousTotal===0){change.textContent='↗ Nuevo';change.className='activity-week-change is-up'}
  else {const percentage=Math.round((weekTotal-previousTotal)/previousTotal*100);change.textContent=`${percentage>=0?'↗':'↘'} ${Math.abs(percentage)}%`;change.className=`activity-week-change ${percentage>=0?'is-up':'is-down'}`}
  $('#activityWeekDelta').textContent=weekTotal===0&&previousTotal===0?'Aún no hay partidas registradas esta semana.':previousTotal===0?'Tu primera semana registrada en NEXORA.':weekTotal===previousTotal?`Igual que la semana anterior (${formatPlayDuration(previousTotal)}).`:`Últimos 7 días, ${formatPlayDuration(Math.abs(weekTotal-previousTotal))} ${weekTotal>previousTotal?'más':'menos'} que la semana anterior.`;
  $('#activityAverage').textContent=recentDurations.length?formatPlayDuration(weekTotal/recentDurations.length):'0 min';
  $('#activityLongest').textContent=recentDurations.length?formatPlayDuration(Math.max(...recentDurations)):'0 min';
  $('#activityDays').textContent=`${weekItems.filter(item=>item.value>0).length} de 7`;
  const maxDay=Math.max(...weekItems.map(item=>item.value),1);
  $('#activityWeekChart').innerHTML=weekItems.map(({day,value},index)=>{
    const label=index===6?'Hoy':new Intl.DateTimeFormat('es-CO',{weekday:'short'}).format(day).replace('.','').slice(0,3);
    const height=value?Math.max(7,Math.round(value/maxDay*100)):3;
    return `<div class="playtime-day ${index===6?'is-today':''}" title="${escapeHTML(new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long'}).format(day))}: ${escapeHTML(formatPlayDuration(value))}"><strong>${value?escapeHTML(formatPlayDuration(value)):''}</strong><div class="playtime-bar-track"><i style="height:${height}%"></i></div><span>${label}</span></div>`;
  }).join('');

  const placeMap=new Map();
  playSessions.forEach(session=>{const key=`${session.type}|${session.name}|${session.address}`;const place=placeMap.get(key)||{...session,duration:0,count:0};place.duration+=(session.endedAt??now)-session.startedAt;place.count++;placeMap.set(key,place)});
  const places=[...placeMap.values()].sort((a,b)=>b.duration-a.duration);
  const playedServers=places.filter(place=>place.type==='server');
  const playedWorlds=places.filter(place=>place.type==='world');
  $('#activityServerCount').textContent=String(playedServers.length);
  $('#activityServers').innerHTML=playedServers.length?playedServers.slice(0,8).map((place,index)=>{
    const catalog=servers.find(server=>server.ip.toLowerCase()===(place.address||'').toLowerCase()||server.name.toLowerCase()===place.name.toLowerCase());
    const badge=place.mode||catalog?.modes?.[0]||place.edition||'SERVER';
    const details=[`${place.count} ${place.count===1?'partida':'partidas'}`,place.address||place.version||catalog?.versions?.join(' · ')].filter(Boolean).join(' · ');
    const icon=catalog?.logo?`<img src="${escapeHTML(catalog.logo)}" alt="" loading="lazy">`:`<span>${escapeHTML(catalog?.mark||place.name.slice(0,1).toUpperCase())}</span>`;
    return `<article class="activity-server-row"><span class="activity-server-logo">${icon}</span><div class="activity-server-copy"><strong>${escapeHTML(place.name)}</strong><small>${escapeHTML(details)}</small></div><span class="activity-server-mode">${escapeHTML(badge)}</span><b class="activity-server-rank">#${index+1}</b></article>`;
  }).join(''):'<div class="activity-inline-empty">Cuando juegues en un servidor, aparecerá en esta lista.</div>';
  $('#activityWorldSection').hidden=!playedWorlds.length;
  $('#activityWorldCount').textContent=String(playedWorlds.length);
  $('#activityWorlds').innerHTML=playedWorlds.slice(0,6).map((world,index)=>`<div class="activity-world-row"><span>${String(index+1).padStart(2,'0')}</span><strong>${escapeHTML(world.name)}</strong><small>${world.count} ${world.count===1?'partida':'partidas'}</small><b>${escapeHTML(formatPlayDuration(world.duration))}</b></div>`).join('');
  const sessions=[...playSessions].sort((a,b)=>b.startedAt-a.startedAt).slice(0,10);
  $('#playSessionList').innerHTML=sessions.length?sessions.map(session=>{
    const active=session.endedAt===null;
    const end=session.endedAt??now;
    const date=new Intl.DateTimeFormat('es-CO',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(session.startedAt);
    return `<article class="play-session-row"><span class="activity-place-icon">${session.type==='world'?'⌂':'◇'}</span><div><strong>${escapeHTML(session.name)}</strong><small>${session.type==='world'?'Mundo individual':escapeHTML(session.address||'Servidor multiplayer')} · ${escapeHTML(date)}</small></div><span class="play-session-duration">${active?'<i>EN CURSO</i>':escapeHTML(formatPlayDuration(end-session.startedAt))}</span></article>`;
  }).join(''):'<div class="activity-empty play-session-empty"><span>◷</span><strong>Aún no hay partidas registradas</strong><p>Cuando NEXORA Launcher envíe una sesión, verás aquí su duración, servidor o mundo.</p></div>';
}

// Puente del launcher: nexoraSyncActivity({sessions:[{id,type:'server'|'world',name,address,startedAt,endedAt}]}).
// Las fechas aceptan ISO-8601 o milisegundos; endedAt:null representa una partida en curso.
window.nexoraSyncActivity = payload => {
  playSessions=normalizeActivitySessions(payload);
  localStorage.setItem('nexoraPlaySessions',JSON.stringify(playSessions));
  activityConnected=true;
  renderPlayActivity();
  return {received:playSessions.length,totalMilliseconds:playSessions.reduce((sum,item)=>sum+(item.endedAt??Date.now())-item.startedAt,0)};
};
window.addEventListener('nexora:activity-sync',event=>window.nexoraSyncActivity(event.detail));
window.addEventListener('message',event=>{
  const message=event.data;
  if(!message||message.type!=='nexora:activity-sync')return;
  if(event.source!==window&&event.origin!==location.origin&&event.origin!=='null')return;
  window.nexoraSyncActivity(message.sessions||message.payload||[]);
});
window.setInterval(()=>{if(playSessions.some(session=>session.endedAt===null))renderPlayActivity()},60000);

// Aparición progresiva al entrar en pantalla, sin animar continuamente el contenido.
const revealSelector = [
  '#page-home .section-heading', '#page-home .vision-layout > *', '#page-home .vision-strip > *',
  '#page-home .feature-card', '#page-home .screenshot-slot', '#page-home .discover-card',
  '#page-home .download-content', '#page-home .team-card', '#page-home .team-note',
  '#page-home .community-links a', '#page-home .landing-footer',
  '.page:not(#page-home) > .page-heading', '.page:not(#page-home) > .glass-card',
  '.page:not(#page-home) .server-card', '.page:not(#page-home) .activity-entry',
  '.page:not(#page-home) .recent-entry', '.page:not(#page-home) .about-person',
  '.page:not(#page-home) .about-project-note', '.page:not(#page-home) .profile-panel',
  '.page:not(#page-home) .library-notes > div'
].join(',');
let revealObserver;
function stageVisibleContent(root=document) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
  const candidates = [];
  if (root instanceof Element && root.matches(revealSelector)) candidates.push(root);
  if (root.querySelectorAll) candidates.push(...root.querySelectorAll(revealSelector));
  const visiblePage = $('.page.active');
  if (!revealObserver && !reduced && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
    }), { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
  }
  candidates.forEach((element, index) => {
    if (element.dataset.revealReady) return;
    element.dataset.revealReady = 'true';
    if (reduced || !revealObserver || (visiblePage && !visiblePage.contains(element))) {
      element.classList.add('nx-reveal', 'is-revealed');
      return;
    }
    element.style.setProperty('--nx-reveal-delay', `${Math.min((index % 4) * 65, 195)}ms`);
    element.classList.add('nx-reveal');
    revealObserver.observe(element);
  });
}
stageVisibleContent();
const revealMutationObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node.nodeType === Node.ELEMENT_NODE) stageVisibleContent(node);
})));
const pageRoot = $('.main');
if (pageRoot) revealMutationObserver.observe(pageRoot, { childList: true, subtree: true });

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
  stageVisibleContent($('#page-' + page));
  $$('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  $('#crumbCurrent').textContent = $('#page-' + page).dataset.title;
  document.title = `NEXORA — ${$('#page-' + page).dataset.title}`;
  if (page === 'favorites') renderFavorites();
  if (page === 'activity') renderModrinth();
  if (page === 'library') renderPlayActivity();
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

function renderSavedModCount() { const count=$('#savedModCount');if(count)count.textContent=String(savedMods.length); }
function formatModCount(value) { return new Intl.NumberFormat('es-CO',{notation:'compact',maximumFractionDigits:1}).format(Number(value)||0); }
function modProjectUrl(project) {
  const type=project.project_type==='modpack'?'modpack':project.project_type==='shader'?'shader':project.project_type==='resourcepack'?'resourcepack':'mod';
  return `https://modrinth.com/${type}/${encodeURIComponent(project.slug||project.project_id)}`;
}
function renderModCard(project,index) {
  const saved=savedMods.some(item=>item.project_id===project.project_id);
  const icon=project.icon_url?`<img src="${escapeHTML(project.icon_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span class="mod-card-icon-fallback">✦</span>';
  const categories=(project.display_categories||project.categories||[]).slice(0,3).map(category=>`<span>${escapeHTML(category.replace(/_/g,' '))}</span>`).join('');
  const selectedVersion=$('#modVersionFilter')?.value;
  const versions=selectedVersion?[selectedVersion]:((project.versions||[]).slice(0,2));
  const versionTags=versions.map(version=>`<span class="mod-version-tag">${escapeHTML(version)}</span>`).join('');
  return `<article class="mod-card" style="--mod-index:${index}" tabindex="0" role="group" data-mod-details="${escapeHTML(project.project_id)}" aria-label="Detalles de ${escapeHTML(project.title||'mod')}"><div class="mod-card-heading"><span class="mod-card-icon">${icon}</span><div class="mod-card-title"><h2>${escapeHTML(project.title||'Mod sin título')}</h2><span>por ${escapeHTML(project.author||'Comunidad Modrinth')}</span></div><button class="mod-save-button ${saved?'is-saved':''}" data-save-mod="${escapeHTML(project.project_id)}" aria-label="${saved?'Quitar de':'Guardar en'} favoritos" title="${saved?'Quitar de guardados':'Guardar mod'}">${saved?'♥':'♡'}</button></div><p class="mod-card-description">${escapeHTML(project.description||'Sin descripción disponible.')}</p><div class="mod-card-tags">${categories}${versionTags}</div><div class="mod-card-footer"><span><b>↓</b> ${formatModCount(project.downloads)} descargas</span><button class="mod-details-link" data-mod-details="${escapeHTML(project.project_id)}">Ver detalles y descargar ↗</button></div></article>`;
}
function modFileForVersion(version) {
  if(!version?.files?.length)return null;
  return version.files.find(file=>file.primary)||version.files[0];
}
function formatModrinthBody(markdown) {
  return String(markdown||'').split(/\n\s*\n/).map(block=>{
    const heading=block.match(/^#{1,4}\s+(.+)$/);
    if(heading)return `<h4>${escapeHTML(heading[1])}</h4>`;
    const lines=block.split('\n');
    if(lines.every(line=>/^\s*[-*+]\s+/.test(line)))return `<ul>${lines.map(line=>`<li>${escapeHTML(line.replace(/^\s*[-*+]\s+/,''))}</li>`).join('')}</ul>`;
    return `<p>${escapeHTML(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
}
function renderModVersionDetails(version) {
  const file=modFileForVersion(version);
  const panel=$('#modVersionDetails');if(!panel)return;
  if(!file){panel.innerHTML='<p class="mod-version-unavailable">Esta versión no tiene un archivo descargable disponible.</p>';return}
  const size=file.size?`${(file.size/1024/1024).toFixed(1)} MB`:'';
  const loaders=(version.loaders||[]).map(loader=>`<span>${escapeHTML(loader)}</span>`).join('');
  const gameVersions=(version.game_versions||[]).map(gameVersion=>`<span>${escapeHTML(gameVersion)}</span>`).join('');
  panel.innerHTML=`<div class="mod-version-meta"><span>${escapeHTML(version.version_number||version.name||'Versión')}</span><span>${escapeHTML(version.version_type||'release')}</span>${size?`<span>${size}</span>`:''}</div><div class="mod-version-tags">${loaders}${gameVersions}</div><a class="button button-light mod-download-button" href="${escapeHTML(file.url)}" download="${escapeHTML(file.filename)}" target="_blank" rel="noreferrer">↓ Descargar ${escapeHTML(file.filename)} <span>desde Modrinth</span></a><small class="mod-download-note">Archivo servido por Modrinth. Revisa la versión y el loader compatibles antes de instalarlo con tu launcher.</small>`;
}
async function openModDetails(projectId) {
  const project=[...modHits,...savedMods].find(item=>item.project_id===projectId);
  if(!project)return;
  const modal=$('#overlay .modal');modal.classList.add('modrinth-detail-modal');$('#modalTitle').textContent=project.title||'Detalles del mod';
  $('#modalContent').innerHTML='<div class="mod-details-loading"><span class="mod-loading-orbit"></span><strong>Cargando detalles y versiones…</strong></div>';
  overlay.classList.add('open');document.body.classList.add('modal-open');playSound('open');$('#closeModal').focus();
  try{
    const [detailResponse,versionsResponse]=await Promise.all([
      fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`,{headers:{Accept:'application/json'}}),
      fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?include_changelog=false`,{headers:{Accept:'application/json'}})
    ]);
    if(!detailResponse.ok||!versionsResponse.ok)throw new Error('No se pudieron cargar los detalles');
    const [detail,versions]=await Promise.all([detailResponse.json(),versionsResponse.json()]);
    const listedVersions=versions.filter(version=>version.status==='listed');
    const categories=[...(detail.categories||[]),...(detail.additional_categories||[])].slice(0,10).map(category=>`<span>${escapeHTML(category.replace(/_/g,' '))}</span>`).join('');
    const author=project.author||'Autor en Modrinth';
    const body=detail.body?`<section class="mod-detail-section"><p class="eyebrow">DESCRIPCIÓN Y USO</p><div class="mod-long-description">${formatModrinthBody(detail.body)}</div></section>`:'';
    $('#modalContent').innerHTML=`<div class="mod-detail-content"><div class="mod-detail-identity">${detail.icon_url?`<img src="${escapeHTML(detail.icon_url)}" alt="" referrerpolicy="no-referrer">`:''}<div><p class="eyebrow">${escapeHTML((detail.project_type||'mod').toUpperCase())} · MODRINTH</p><h3>${escapeHTML(detail.title||project.title)}</h3><p>Creado por <strong>${escapeHTML(author)}</strong></p></div></div><p class="mod-detail-summary">${escapeHTML(detail.description||project.description||'')}</p><div class="mod-detail-tags">${categories}</div><div class="mod-detail-stats"><span><strong>${formatModCount(detail.downloads||project.downloads)}</strong> descargas</span><span><strong>${formatModCount(detail.followers||project.follows)}</strong> seguidores</span><span><strong>${listedVersions.length}</strong> versiones publicadas</span></div>${body}<section class="mod-detail-section mod-download-section"><div class="profile-section-heading"><div><p class="eyebrow">ARCHIVOS OFICIALES</p><h3>Elige una versión</h3></div></div>${listedVersions.length?`<label class="mod-version-select-label">Versión<select id="modDetailVersion" class="field">${listedVersions.map((version,index)=>`<option value="${index}">${escapeHTML(version.version_number||version.name)} · ${escapeHTML((version.game_versions||[]).slice(-2).join(', '))} · ${(version.loaders||[]).map(escapeHTML).join(', ')}</option>`).join('')}</select></label><div id="modVersionDetails"></div>`:'<p class="mod-version-unavailable">Modrinth no muestra versiones descargables para este proyecto.</p>'}<p class="mod-source-note">Créditos y licencia pertenecen a sus autores. Consulta la página oficial del proyecto para instrucciones completas y requisitos.</p></section><a class="mod-official-link" href="${escapeHTML(modProjectUrl(detail))}" target="_blank" rel="noreferrer">Ver página y licencia en Modrinth ↗</a></div>`;
    if(listedVersions.length){renderModVersionDetails(listedVersions[0]);$('#modDetailVersion').addEventListener('change',event=>renderModVersionDetails(listedVersions[Number(event.target.value)]))}
  }catch(error){
    $('#modalContent').innerHTML='<div class="mods-empty mods-error"><strong>No se pudieron cargar los detalles</strong><small>Comprueba tu conexión e inténtalo de nuevo.</small><button class="button button-outline" id="modDetailRetry">Reintentar</button></div>';
    $('#modDetailRetry').onclick=()=>openModDetails(projectId);
  }
}
function renderModResults() {
  renderSavedModCount();
  const grid=$('#modGrid');if(!grid)return;
  if(modView==='saved'){
    $('#modResultCount').textContent=`${savedMods.length} guardados`;
    grid.innerHTML=savedMods.length?savedMods.map((mod,index)=>renderModCard(mod,index)).join(''):'<div class="mods-empty"><span>♡</span><strong>Aún no guardas mods</strong><small>Explora el catálogo y toca el corazón para guardar contenido.</small></div>';
    $('#modLoadMore').hidden=true;return;
  }
  $('#modResultCount').textContent=`${new Intl.NumberFormat('es-CO').format(modTotal)} resultados`;
  grid.innerHTML=modHits.length?modHits.map(renderModCard).join(''):'<div class="mods-empty"><span>⌕</span><strong>No encontramos resultados</strong><small>Prueba otra búsqueda o cambia los filtros.</small></div>';
  $('#modLoadMore').hidden=modHits.length>=modTotal||modHits.length===0;
}
async function searchModrinth({append=false}={}) {
  if(modView==='saved'){renderModResults();return}
  const searchId=++modRequestId;
  if(modAbortController)modAbortController.abort();
  modAbortController=new AbortController();
  const query=$('#modSearch').value.trim();
  const type=$('#modTypeFilter').value;
  const loader=$('#modLoaderFilter').value;
  const version=$('#modVersionFilter').value;
  const sort=$('#modSort').value;
  const offset=append?modHits.length:0;
  const params=new URLSearchParams({query,index:sort,offset:String(offset),limit:'24'});
  const facets=[];if(type)facets.push([`project_type:${type}`]);if(loader)facets.push([`categories:${loader}`]);if(version)facets.push([`versions:${version}`]);if(facets.length)params.set('facets',JSON.stringify(facets));
  const cacheKey=params.toString();
  const cached=modrinthCache.get(cacheKey);
  if(!append){modHits=[];modTotal=0;$('#modGrid').innerHTML='<div class="mods-loading"><span class="mod-loading-orbit"></span><strong>Buscando en Modrinth</strong><small>Aplicando filtros y cargando proyectos.</small></div>';$('#modrinthStatus').classList.remove('is-error');$('#modrinthStatus').innerHTML='<i></i> Consultando Modrinth'}
  try{
    let data;
    if(cached&&Date.now()-cached.time<300000)data=cached.data;
    else{
      const response=await fetch(`https://api.modrinth.com/v2/search?${params}`,{headers:{Accept:'application/json'},signal:modAbortController.signal});
      if(!response.ok)throw new Error(`Modrinth respondió ${response.status}`);
      data=await response.json();modrinthCache.set(cacheKey,{time:Date.now(),data});
    }
    if(searchId!==modRequestId)return;
    modHits=append?[...modHits,...data.hits]:data.hits;
    modTotal=data.total_hits;
    $('#modrinthStatus').classList.remove('is-error');$('#modrinthStatus').innerHTML='<i></i> Catálogo conectado';
    renderModResults();
  }catch(error){
    if(error.name==='AbortError'||searchId!==modRequestId)return;
    $('#modrinthStatus').classList.add('is-error');$('#modrinthStatus').innerHTML='<i></i> Modrinth no responde';
    if(!append)$('#modGrid').innerHTML='<div class="mods-empty mods-error"><span>↗</span><strong>No se pudo cargar Modrinth</strong><small>Comprueba tu conexión e inténtalo de nuevo.</small><button class="button button-outline" id="modRetry">Reintentar</button></div>';
    $('#modResultCount').textContent='Catálogo no disponible';$('#modLoadMore').hidden=true;
  }
}
function loadModrinthVersions() {
  fetch('https://api.modrinth.com/v2/tag/game_version',{headers:{Accept:'application/json'}}).then(response=>{if(!response.ok)throw new Error('No se cargaron las versiones');return response.json()}).then(versions=>{
    const select=$('#modVersionFilter');
    const releases=versions.filter(item=>item.version_type==='release').sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,45);
    select.innerHTML='<option value="">Todas las versiones</option>'+releases.map(item=>`<option value="${escapeHTML(item.version)}">Minecraft ${escapeHTML(item.version)}</option>`).join('');
  }).catch(()=>{});
}
function renderModrinth() {
  if(!modrinthLoaded){modrinthLoaded=true;loadModrinthVersions();searchModrinth()}
  else if(modView==='saved')renderModResults();
}
function setModView(view) {
  modView=view;
  $$('.mod-view-switch [data-mod-view]').forEach(button=>button.classList.toggle('is-active',button.dataset.modView===view));
  $('#modSearch').disabled=view==='saved';
  $('#modTypeFilter').disabled=view==='saved';$('#modLoaderFilter').disabled=view==='saved';$('#modVersionFilter').disabled=view==='saved';$('#modSort').disabled=view==='saved';
  if(view==='catalog'&&!modHits.length)searchModrinth();else renderModResults();
}
function saveModrinthProject(projectId) {
  const existing=savedMods.find(mod=>mod.project_id===projectId);
  if(existing)savedMods=savedMods.filter(mod=>mod.project_id!==projectId);
  else{
    const project=[...modHits,...savedMods].find(mod=>mod.project_id===projectId);
    if(!project)return;
    savedMods.unshift(project);
  }
  localStorage.setItem('nexoraSavedMods',JSON.stringify(savedMods));
  renderModResults();toast(existing?'Mod quitado de guardados':'Mod guardado');
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

function closeModal() { overlay.classList.remove('open'); $('#overlay .modal').classList.remove('server-profile-modal','modrinth-detail-modal'); document.body.classList.remove('modal-open'); }

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
  if(event.target.closest('button') && !event.target.closest('[data-favorite],[data-copy],[data-detail],[data-open],[data-screenshot],[data-save-mod],#openPublish,#downloadNotice,#soundButton,#themeButton,#clearRecent,#resetLocal,[type="submit"]')) playSound('tap');
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
$('#clearRecent').onclick=()=>{recent=[];localStorage.removeItem('nexoraRecent');renderRecent();toast('Historial limpiado')};
$('#modSearch').addEventListener('input',()=>{clearTimeout(modSearchTimer);modSearchTimer=setTimeout(()=>searchModrinth(),320)});
['modTypeFilter','modLoaderFilter','modVersionFilter','modSort'].forEach(id=>$('#'+id).addEventListener('change',()=>searchModrinth()));
$('.mod-view-switch').addEventListener('click',event=>{const button=event.target.closest('[data-mod-view]');if(button)setModView(button.dataset.modView)});
$('#modGrid').addEventListener('click',event=>{
  const save=event.target.closest('[data-save-mod]');if(save){saveModrinthProject(save.dataset.saveMod);return}
  const details=event.target.closest('[data-mod-details]');if(details)openModDetails(details.dataset.modDetails);
  if(event.target.closest('#modRetry'))searchModrinth();
});
$('#modGrid').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.mod-card[data-mod-details]')){event.preventDefault();openModDetails(event.target.dataset.modDetails)}});
$('#modLoadMore').onclick=()=>searchModrinth({append:true});
$('#syncActivity').onclick=()=>{window.dispatchEvent(new CustomEvent('nexora:activity-request'));$('#activityConnectionStatus').innerHTML='<i></i> Buscando al launcher';clearTimeout(activitySearchTimer);activitySearchTimer=setTimeout(()=>{if(!activityConnected)renderPlayActivity()},4000);toast('Buscando conexión con NEXORA Launcher','tap')};
$('#clearPlayActivity').onclick=()=>{playSessions=[];localStorage.removeItem('nexoraPlaySessions');renderPlayActivity();toast('Actividad de juego limpiada')};
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
$('#resetLocal').onclick=async()=>{for(const key of ['nexoraFavs','nexoraRecent','nexoraPendingServers','nexoraProfile','nexoraActiveSkin','nexoraSkinModel','nexoraEquipment','nexoraSavedServers','nexoraLibraryProfiles','nexoraSelectedLibraryProfile','nexoraPlaySessions','nexoraSavedMods'])localStorage.removeItem(key);favorites.clear();recent=[];savedMods=[];playSessions=[];playerProfile={...defaultPlayerProfile};activeSkinId='';playerModel='steve';playerEquipment={...defaultEquipment};await clearSavedSkins();applyPlayerProfile();renderRecent();renderServers();renderFavorites();renderModResults();renderProfile();renderPlayActivity();toast('Datos locales borrados')};
renderServers();renderFavorites();renderSavedModCount();renderPlayActivity();navigate('home',{silent:true});
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
