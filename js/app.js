(() => {
'use strict';
const C = window.CONFIG, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const date = (iso, o) => new Date(iso + 'T12:00:00').toLocaleDateString('es', o || { day: 'numeric', month: 'long', year: 'numeric' });
const COLORS = ['#14385c', '#3f7d58', '#c2462f', '#b8892e', '#5b7fa6', '#6a4c93'];
const ICONS = [[/griego|hebreo|idioma|lengua|espanol/, 'fa-language'], [/biblia|biblic|exeges|testamento|hermeneu/, 'fa-book-bible'], [/teolog|doctrina|dogma/, 'fa-cross'], [/histor/, 'fa-landmark'], [/homilet|predica/, 'fa-microphone-lines'], [/musica|himno|adoracion/, 'fa-music'], [/pastoral|liderazgo|consejer|misi/, 'fa-users']];
const iconFor = n => (ICONS.find(([r]) => r.test(norm(n))) || [0, 'fa-book-open'])[1];
const colorFor = n => COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initials = n => n.replace(/^(lic|ma|ms|dr|dra|prof|pastor|rev)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const TABS = [['asignaturas', 'Asignaturas', 'fa-book-open', 'Entra a las clases, materiales y evaluaciones de cada asignatura.'], ['anuncios', 'Anuncios', 'fa-bullhorn', 'Avisos importantes de Rectoría, Decanato y Secretaría.'], ['malla', 'Malla curricular', 'fa-table-list', 'Asignaturas por año y semestre, con créditos y profesor.'], ['calendario', 'Calendario académico', 'fa-calendar-days', `Fechas importantes del año académico ${C.CURSO}.`], ['directorio', 'Directorio', 'fa-address-book', 'Contacto del personal administrativo y de los docentes.']];
const ROLNOMBRE = { rector: 'Rectoría', decano: 'Decanato', secretaria: 'Secretaría' };
let tk = sessionStorage.getItem('stbcor.token') || '', S = null, D = {}, P = {}, SC = {}, tab = 'asignaturas', q = '', anio = '', fcal = 'prox', loginMode = 'est';
const hasApi = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(C.APPS_SCRIPT_URL);

async function api(accion, d = {}) {
  const r = await fetch(C.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, token: tk, ...d }) });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'Error'); e.code = j.code; throw e; } return j;
}
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), 3800); }
function dialog(title, body) { const d = $('#dlg'); d.innerHTML = `<div class="dh"><h3>${title}</h3><button type="button" aria-label="Cerrar" id="dx">&times;</button></div>${body}`; $('#dx').onclick = () => d.close(); if (!d.open) d.showModal(); return d; }
const can = (e, a, it) => { const p = P[e]?.[a]; return p === true || p === 'todos' || (p === 'propios' && (!it || it.rol === S.rol)); };
const seenKey = () => 'stbcor.vistos.' + S.usuario;
const vistos = () => { try { return JSON.parse(localStorage.getItem(seenKey())) || []; } catch { return []; } };
const nuevos = () => (D.anuncios || []).filter(a => !vistos().includes(a.id)).length;
const match = it => !q || norm(Object.values(it).join(' ')).includes(norm(q.trim()));
const adm = (e, it) => (can(e, 'editar', it) || can(e, 'eliminar', it)) ? `<div class="adm">${can(e, 'editar', it) ? `<button type="button" data-e="${e}|${esc(it.id)}" aria-label="Editar" title="Editar"><i class="fas fa-pen"></i></button>` : ''}${can(e, 'eliminar', it) ? `<button type="button" class="d" data-d="${e}|${esc(it.id)}" aria-label="Eliminar" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}</div>` : '';
const empty = (ic, t, p) => `<div class="empty"><i class="fas ${ic}"></i><h3>${t}</h3><p>${p}</p></div>`;

const V = {};
V.asignaturas = () => `<div class="grid">${D.asignaturas.filter(match).map((a, i) => `<article class="card sub" style="--c:${colorFor(a.nombre)};animation-delay:${Math.min(i, 8) * 45}ms">${adm('asignaturas', a)}
  <div class="ic"><i class="fas ${iconFor(a.nombre)}"></i></div><h3>${esc(a.nombre)}</h3><div class="prof"><span class="pav">${esc(initials(a.profesor))}</span><div><small>Profesor</small><b>${esc(a.profesor)}</b></div></div>
  <a class="go" href="${esc(a.enlace)}"${C.ABRIR_EN_NUEVA_PESTANA ? ' target="_blank" rel="noopener"' : ''}>Entrar a la asignatura <i class="fas fa-arrow-right"></i></a></article>`).join('') || empty('fa-book-open', q ? 'Sin resultados' : 'Aún no hay asignaturas', 'Pronto aparecerán aquí las asignaturas del curso.')}</div>`;
V.anuncios = () => { const v = vistos(), L = D.anuncios.filter(match).sort((a, b) => (b.fijado === 'Sí') - (a.fijado === 'Sí') || b.creada.localeCompare(a.creada));
  return `<div class="col1">${L.map(a => `<article class="card ann ${esc(a.categoria)} ${a.fijado === 'Sí' ? 'pin' : ''}">${adm('anuncios', a)}<div class="ahd"><span class="tag t-${esc(a.categoria)}">${a.fijado === 'Sí' ? '<i class="fas fa-thumbtack"></i> ' : ''}${esc(a.categoria)}</span>${v.includes(a.id) ? '' : '<span class="new">Nuevo</span>'}</div>
  <h3>${esc(a.titulo)}</h3><p>${esc(a.mensaje)}</p><div class="by"><i class="fas fa-building-columns"></i><b>${ROLNOMBRE[a.rol] || 'Seminario'}</b>${a.creada ? ` · ${date(a.creada.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div></article>`).join('') || empty('fa-bullhorn', q ? 'Sin resultados' : 'No hay anuncios por ahora', 'Aquí verás los avisos importantes del seminario.')}</div>`; };
V.malla = () => { const all = D.malla, anios = [...new Set(all.map(m => m.anio))]; if (!anios.includes(anio)) anio = anios[0] || '';
  const rows = all.filter(m => m.anio === anio && match(m)), sems = [...new Set(rows.map(m => m.semestre))];
  return `<div class="tabs">${anios.map(a => `<button data-anio="${esc(a)}" class="${a === anio ? 'on' : ''}">${esc(a)}</button>`).join('')}</div>` + (sems.map(s => { const R = rows.filter(m => m.semestre === s), cr = R.reduce((t, m) => t + (parseInt(m.creditos) || 0), 0);
    return `<section class="card sem"><div class="semh"><h3>${esc(s)}</h3><span>${R.length} asignaturas · ${cr} créditos</span></div>${R.map(m => `<div class="row"><div><b>${esc(m.asignatura)}</b></div><div class="tg">${m.tipo ? `<span class="tag">${esc(m.tipo)}</span>` : ''}</div><div class="pf"><small>${esc(m.profesor || '—')}</small></div><div class="cr">${m.creditos ? esc(m.creditos) + ' Cr' : ''}</div>${adm('malla', m)}</div>`).join('')}</section>`; }).join('') || `<div class="grid">${empty('fa-table-list', q ? 'Sin resultados' : 'La malla aún no está publicada', 'El decanato la publicará pronto.')}</div>`); };
V.calendario = () => { const hoy = new Date().toISOString().slice(0, 10), L = D.calendario.filter(match).sort((a, b) => a.inicio.localeCompare(b.inicio)).filter(e => fcal === 'todo' || (e.fin || e.inicio) >= hoy);
  const g = {}; L.forEach(e => (g[e.inicio.slice(0, 7)] = g[e.inicio.slice(0, 7)] || []).push(e));
  return `<div class="tabs"><button data-fc="prox" class="${fcal === 'prox' ? 'on' : ''}">Próximos</button><button data-fc="todo" class="${fcal === 'todo' ? 'on' : ''}">Todo el año</button></div>` +
    (Object.keys(g).map(m => `<section class="mes"><h3>${cap(date(m + '-01', { month: 'long', year: 'numeric' }))}</h3>${g[m].map(e => { const d1 = e.inicio.slice(8), d2 = e.fin && e.fin !== e.inicio ? e.fin.slice(8) : '';
      return `<div class="ev ${(e.fin || e.inicio) < hoy ? 'past' : ''}"><div class="dt"><b>${+d1}${d2 ? '–' + +d2 : ''}</b><small>${date(e.inicio, { month: 'short' }).replace('.', '')}</small></div><div><b>${esc(e.evento)}</b> ${e.tipo ? `<span class="tag t-${esc(e.tipo)}">${esc(e.tipo)}</span>` : ''}${e.detalle ? `<p>${esc(e.detalle)}</p>` : ''}${e.fin && e.fin !== e.inicio ? `<p>${date(e.inicio, { day: 'numeric', month: 'short' })} – ${date(e.fin, { day: 'numeric', month: 'short', year: 'numeric' })}</p>` : ''}</div>${adm('calendario', e)}</div>`; }).join('')}</section>`).join('') || `<div class="grid">${empty('fa-calendar-days', q ? 'Sin resultados' : fcal === 'prox' ? 'No hay fechas próximas' : 'El calendario aún no está publicado', 'Las fechas del año académico se publicarán aquí.')}</div>`); };
V.directorio = () => { const L = D.directorio.filter(match), ct = p => {
  const mails = (p.correo || '').split(/[;,]\s*/).filter(Boolean), tel = (p.telefono || '').replace(/\D/g, '');
  return `<div class="ct">${mails.map(m => `<a href="mailto:${esc(m)}"><i class="fas fa-envelope"></i>${esc(m)}</a>`).join('')}${tel ? `<a href="tel:+53${tel}"><i class="fas fa-phone"></i>${esc(p.telefono)}</a><a class="wa" href="https://wa.me/53${tel}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i>WhatsApp</a>` : ''}</div>`; };
  const A = L.filter(p => p.tipo === 'Administrativo'), Dc = L.filter(p => p.tipo === 'Docente');
  return (A.length ? `<h2 class="sec">Personal administrativo</h2><div class="cg">${A.map(p => `<article class="card cc">${adm('directorio', p)}<span class="rol">${esc(p.cargo)}</span><h3>${esc(p.nombre)}</h3>${ct(p)}</article>`).join('')}</div>` : '') +
    (Dc.length ? `<h2 class="sec">Docentes</h2><div class="cg">${Dc.map(p => `<article class="card cc">${adm('directorio', p)}<span class="rol">${esc(p.cargo || 'Docente')}${p.sede ? ` · ${esc(p.sede)}` : ''}</span><h3>${esc(p.nombre)}</h3>${p.materias ? `<small>${esc(p.materias)}</small>` : ''}${ct(p)}</article>`).join('')}</div>` : '') || `<div class="grid">${empty('fa-address-book', 'Sin resultados', 'Prueba con otro nombre o asignatura.')}</div>`; };

function form(ent, it, pre = {}) {
  const f = SC[ent], vals = it || pre, titulo = { asignaturas: 'asignatura', anuncios: 'anuncio', directorio: 'contacto', malla: 'materia de la malla', calendario: 'evento' }[ent];
  const input = c => { const v = vals[c.k] ?? '', id = 'f_' + c.k;
    if (c.t.startsWith('enum:')) return `<select id="${id}">${c.t.slice(5).split(',').map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (c.t === 'bool') return `<label class="chk"><input id="${id}" type="checkbox" ${v === 'Sí' ? 'checked' : ''}> ${esc(c.l)}</label>`;
    if (c.t === 'largo') return `<textarea id="${id}" maxlength="${c.max}">${esc(v)}</textarea>`;
    return `<input id="${id}" type="${c.t === 'date' ? 'date' : c.t === 'url' ? 'url' : 'text'}" maxlength="${c.max}" value="${esc(v)}" ${c.t === 'url' ? 'placeholder="https://…"' : ''}>`; };
  const d = dialog(`${it ? 'Editar' : 'Nuevo'} ${titulo}`, `<form class="db" novalidate>${f.map(c => c.t === 'bool' ? `<div class="fld">${input(c)}</div>` : `<div class="fld"><label for="f_${c.k}">${esc(c.l)}${c.req ? ' *' : ''}</label>${input(c)}</div>`).join('')}<div class="err" id="fe" role="alert"></div><div class="acts"><button type="button" class="btn sec" id="fc">Cancelar</button><button class="btn" id="fs" type="submit">${it ? 'Guardar cambios' : 'Publicar'}</button></div></form>`);
  $('#fc').onclick = () => d.close();
  $('form', d).onsubmit = async e => { e.preventDefault(); const dat = {};
    f.forEach(c => { const el = $('#f_' + c.k); dat[c.k] = c.t === 'bool' ? (el.checked ? 'Sí' : 'No') : el.value.trim(); if (c.t === 'url' && dat[c.k] && !/^https?:\/\//i.test(dat[c.k])) dat[c.k] = 'https://' + dat[c.k]; });
    const miss = f.find(c => c.req && !dat[c.k]); if (miss) return $('#fe').textContent = `Completa «${miss.l}».`;
    $('#fs').disabled = true; $('#fs').textContent = 'Guardando…';
    try { const r = await api(it ? 'actualizar' : 'crear', { entidad: ent, id: it?.id, datos: dat }); D[ent] = r.lista; d.close(); render(); toast(it ? 'Cambios guardados ✓' : 'Publicado ✓'); }
    catch (er) { if (er.code === 'AUTH') return logout(er.message); $('#fe').textContent = er.message; $('#fs').disabled = false; $('#fs').textContent = it ? 'Guardar cambios' : 'Publicar'; } };
}
function confirmDel(ent, it) {
  const d = dialog('Eliminar', `<div class="db"><p>¿Eliminar este registro? Se borrará también de la hoja de cálculo.</p><div class="acts"><button class="btn sec" id="fc" type="button">Cancelar</button><button class="btn red" id="fs" type="button">Eliminar</button></div></div>`);
  $('#fc').onclick = () => d.close();
  $('#fs').onclick = async () => { $('#fs').disabled = true; try { D[ent] = (await api('eliminar', { entidad: ent, id: it.id })).lista; d.close(); render(); toast('Eliminado'); } catch (er) { d.close(); er.code === 'AUTH' ? logout(er.message) : toast(er.message); } };
}
function cuenta() {
  const est = S.rol === 'estudiante';
  const d = dialog('Mi cuenta', `<form class="db" novalidate><p><b>${esc(S.nombre)}</b><br><span style="color:var(--mut)">${est ? esc(S.grupo) + ' · usuario ' + esc(S.usuario) : 'Acceso de ' + esc(S.etiqueta)}</span></p>
  ${est ? `<div class="fld"><label for="pa">Contraseña actual</label><input id="pa" type="password" autocomplete="current-password"></div><div class="fld"><label for="pn">Nueva contraseña (mínimo 6 caracteres)</label><input id="pn" type="password" autocomplete="new-password"></div>` : '<p style="color:var(--mut);font-size:.9rem">El código de acceso del personal se cambia en el archivo Code.gs.</p>'}
  <div class="err" id="fe" role="alert"></div><div class="acts"><button type="button" class="btn sec" id="lo"><i class="fas fa-right-from-bracket"></i> Cerrar sesión</button>${est ? '<button class="btn" id="fs" type="submit">Cambiar contraseña</button>' : ''}</div></form>`);
  $('#lo').onclick = () => { d.close(); logout(); };
  if (est) $('form', d).onsubmit = async e => { e.preventDefault(); $('#fs').disabled = true; try { await api('cambiarClave', { actual: $('#pa').value, nueva: $('#pn').value }); d.close(); toast('Contraseña actualizada ✓'); } catch (er) { $('#fe').textContent = er.message; $('#fs').disabled = false; } };
}

function render() {
  if (!S) return;
  const t = TABS.find(x => x[0] === tab) || TABS[0], nb = nuevos(), crear = can(tab, 'crear'), ph = { asignaturas: 'Buscar asignatura o profesor…', directorio: 'Buscar docente, asignatura o cargo…' }[tab] || 'Buscar…';
  $('#app').innerHTML = `<header class="top"><div class="wrap bar"><a class="brand" href="#/"><img src="assets/logo.png" alt="Logo del Seminario" width="46" height="46"><span><b>Seminario Teológico Bautista</b><small>de Cuba Oriental</small></span></a><span class="chip">CURSO ${C.CURSO}</span><button class="me" id="me" type="button"><span class="av">${esc(initials(S.nombre))}</span><span>${esc(S.rol === 'estudiante' ? S.nombre.split(' ')[0] : S.etiqueta)}</span></button></div></header>
  <nav class="nav" aria-label="Secciones"><div class="wrap">${TABS.map(x => `<a href="#/${x[0]}" class="${x[0] === tab ? 'on' : ''}"><i class="fas ${x[2]}"></i>${x[1]}${x[0] === 'anuncios' && nb && tab !== 'anuncios' ? `<span class="bdg">${nb}</span>` : ''}</a>`).join('')}</div></nav>
  <section class="hero"><div class="wrap"><p class="eyebrow">${S.rol === 'estudiante' ? 'Plataforma académica' : 'Acceso de ' + esc(S.etiqueta)}</p><h1>${t[1]}</h1><p class="lead">${t[3]}</p><div class="tools"><label class="search"><i class="fas fa-magnifying-glass"></i><input id="q" type="search" placeholder="${ph}" value="${esc(q)}" autocomplete="off" aria-label="Buscar"></label>${crear ? `<button class="btn gold" id="nw" type="button"><i class="fas fa-plus"></i> ${{ anuncios: 'Publicar anuncio', calendario: 'Nuevo evento', directorio: 'Nuevo contacto', malla: 'Nueva materia' }[tab] || 'Nueva asignatura'}</button>` : ''}</div></div></section>
  <main class="wrap" id="view">${V[tab]()}</main><footer class="foot">© ${C.CURSO} Seminario Teológico Bautista de Cuba Oriental</footer>`;
  $('#me').onclick = cuenta;
  $('#q').oninput = e => { q = e.target.value; $('#view').innerHTML = V[tab](); };
  if ($('#nw')) $('#nw').onclick = () => form(tab, null, tab === 'malla' ? { anio, semestre: ($$('.semh h3').slice(-1)[0] || {}).textContent || '' } : {});
  if (tab === 'anuncios') localStorage.setItem(seenKey(), JSON.stringify(D.anuncios.map(a => a.id)));
}
function route() { const h = location.hash.replace(/^#\/?/, ''); tab = TABS.some(x => x[0] === h) ? h : tab; q = ''; if (S) render(); }
function logout(msg) { sessionStorage.removeItem('stbcor.token'); tk = ''; S = null; D = {}; if (msg) toast(msg); loginView(); }
async function cargar() {
  $('#app').innerHTML = `<div class="wrap" style="padding-top:3rem"><div class="grid">${'<div class="skel"></div>'.repeat(3)}</div></div>`;
  try { const r = await api('datos'); D = r.datos; P = r.permisos; SC = r.esquema; S = r.sesion; route(); }
  catch (e) { if (e.code === 'AUTH') return logout(); $('#app').innerHTML = `<div class="wrap"><div class="notice"><i class="fas fa-triangle-exclamation"></i><div><b>No se pudo cargar la plataforma.</b><br>${esc(e.message)}<br><br><button class="btn" id="rt" type="button">Reintentar</button> <button class="btn sec" id="lg" type="button">Salir</button></div></div></div>`; $('#rt').onclick = cargar; $('#lg').onclick = () => logout(); }
}
function loginView() {
  const est = loginMode === 'est';
  $('#app').innerHTML = `<div class="login"><section class="lhero"><img src="assets/logo.png" alt="Logo del Seminario"><span class="pill">CURSO ${C.CURSO}</span><h1>Seminario Teológico Bautista de Cuba Oriental</h1><p>Plataforma académica: asignaturas, anuncios, malla curricular, calendario y directorio.</p></section>
  <section class="lform"><form class="form" id="lf" novalidate><h2>Iniciar sesión</h2><p class="s">${est ? 'Entra con el usuario y la contraseña que te entregó Secretaría.' : 'Acceso para Rectoría, Decanato y Secretaría.'}</p>
  <div class="seg"><button type="button" data-m="est" class="${est ? 'on' : ''}">Estudiante</button><button type="button" data-m="per" class="${est ? '' : 'on'}">Personal</button></div>
  ${est ? '<div class="fld"><label for="u">Usuario</label><input id="u" autocomplete="username" autocapitalize="none" required></div>' : ''}
  <div class="fld eye"><label for="p">${est ? 'Contraseña' : 'Código de acceso'}</label><input id="p" type="password" autocomplete="${est ? 'current-password' : 'off'}" required><button type="button" id="ey" aria-label="Mostrar"><i class="fas fa-eye"></i></button></div>
  <div class="err" id="er" role="alert">${hasApi() ? '' : 'Falta configurar APPS_SCRIPT_URL en js/config.js (ver LEEME.md).'}</div><button class="btn" id="go" type="submit">Entrar <i class="fas fa-arrow-right"></i></button><p class="fine">¿Problemas para entrar? Consulta con Secretaría Docente.</p></form></section></div>`;
  $$('[data-m]').forEach(b => b.onclick = () => { loginMode = b.dataset.m; loginView(); });
  $('#ey').onclick = () => { const p = $('#p'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#lf').onsubmit = async e => { e.preventDefault(); if (!hasApi()) return;
    $('#go').disabled = true; $('#er').textContent = '';
    try { const r = est ? await api('login', { usuario: $('#u').value.trim(), password: $('#p').value }) : await api('loginPersonal', { clave: $('#p').value.trim() }); tk = r.token; sessionStorage.setItem('stbcor.token', tk); tab = 'asignaturas'; cargar(); }
    catch (er) { $('#er').textContent = er.message; $('#go').disabled = false; } };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-e],[data-d],[data-anio],[data-fc]'); if (!b) return;
  if (b.dataset.anio) { anio = b.dataset.anio; return render(); } if (b.dataset.fc) { fcal = b.dataset.fc; return render(); }
  const [ent, id] = (b.dataset.e || b.dataset.d).split('|'), it = D[ent].find(x => x.id === id); if (it) b.dataset.e ? form(ent, it) : confirmDel(ent, it);
});
window.addEventListener('hashchange', route);
if (tk && hasApi()) cargar(); else loginView();
})();
