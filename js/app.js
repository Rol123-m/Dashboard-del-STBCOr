(() => {
'use strict';
const C = window.CONFIG, $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const COLORS = ['#14385c', '#3f7d58', '#c2462f', '#b8892e', '#5b7fa6', '#6a4c93'];
const ICONS = [[/griego|hebreo|idioma|lengua|latin/, 'fa-language'], [/biblia|biblic|exeges|testamento|hermeneu/, 'fa-book-bible'], [/teolog|doctrina|dogma|sistem/, 'fa-cross'], [/histor/, 'fa-landmark'], [/homilet|predica|oratoria/, 'fa-microphone-lines'], [/musica|himno|coro/, 'fa-music'], [/pastoral|liderazgo|consejer|misi/, 'fa-users']];
const iconFor = n => (ICONS.find(([r]) => r.test(norm(n))) || [0, 'fa-book-open'])[1];
const colorFor = n => COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initials = n => n.replace(/^(lic|ma|dr|dra|prof|pastor|rev)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const CACHE = 'stbcor.asignaturas';
let items = [], key = sessionStorage.getItem('stbcor.clave') || '', admin = !!key, demo = false, query = '';
const hasApi = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(C.APPS_SCRIPT_URL);

/* ---------- API ---------- */
async function list() {
  const r = await fetch(C.APPS_SCRIPT_URL + (C.APPS_SCRIPT_URL.includes('?') ? '&' : '?') + 'action=list&_=' + Date.now());
  const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Error al leer la hoja'); return j.asignaturas;
}
async function post(accion, d = {}) {
  if (demo) return demoPost(accion, d);
  const r = await fetch(C.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, clave: key, ...d }) });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'Error'); e.code = j.code; throw e; }
  return j;
}
function demoPost(a, d) {
  if (a === 'crear') items.push({ id: 'd' + Date.now(), nombre: d.nombre, profesor: d.profesor, enlace: d.enlace });
  if (a === 'actualizar') Object.assign(items.find(x => x.id === d.id), { nombre: d.nombre, profesor: d.profesor, enlace: d.enlace });
  if (a === 'eliminar') items = items.filter(x => x.id !== d.id);
  return { ok: true, asignaturas: items };
}

/* ---------- UI ---------- */
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), 3500); }
function dialog(title, body) { const d = $('#dlg'); d.innerHTML = `<div class="dh"><h3>${title}</h3><button type="button" aria-label="Cerrar" id="dx">&times;</button></div>${body}`; $('#dx').onclick = () => d.close(); if (!d.open) d.showModal(); return d; }
function render() {
  $('#newBtn').hidden = !admin; $('#adminBtn').innerHTML = admin ? '<i class="fas fa-lock-open"></i><span>Salir de administración</span>' : '<i class="fas fa-lock"></i><span>Administrar</span>';
  const q = norm(query.trim()), v = items.filter(a => !q || norm(a.nombre + ' ' + a.profesor).includes(q));
  const t = C.ABRIR_EN_NUEVA_PESTANA ? ' target="_blank" rel="noopener"' : '';
  $('#grid').innerHTML = v.map((a, i) => `<article class="card" style="--c:${colorFor(a.nombre)};animation-delay:${Math.min(i, 8) * 45}ms">
    ${admin ? `<div class="adm"><button type="button" data-e="${esc(a.id)}" title="Editar" aria-label="Editar ${esc(a.nombre)}"><i class="fas fa-pen"></i></button><button type="button" class="d" data-d="${esc(a.id)}" title="Eliminar" aria-label="Eliminar ${esc(a.nombre)}"><i class="fas fa-trash"></i></button></div>` : ''}
    <div class="ic"><i class="fas ${iconFor(a.nombre)}"></i></div><h3>${esc(a.nombre)}</h3>
    <div class="prof"><span class="av">${esc(initials(a.profesor))}</span><div><small>Profesor</small><b>${esc(a.profesor)}</b></div></div>
    <a class="go" href="${esc(a.enlace)}"${t}>Entrar a la asignatura <i class="fas fa-arrow-right"></i></a></article>`).join('') ||
    `<div class="empty"><i class="fas ${q ? 'fa-magnifying-glass' : 'fa-book-open'}"></i><h3>${q ? 'Sin resultados' : 'Aún no hay asignaturas'}</h3><p>${q ? 'Prueba con otro nombre.' : admin ? 'Crea la primera asignatura del curso.' : 'Pronto aparecerán aquí las asignaturas del curso.'}</p>${!q && admin ? '<button class="btn" data-new type="button"><i class="fas fa-plus"></i> Nueva asignatura</button>' : ''}</div>`;
}
function form(a) {
  const d = dialog(a ? 'Editar asignatura' : 'Nueva asignatura', `<form class="db" novalidate>
    <div class="fld"><label for="fn">Nombre de la asignatura</label><input id="fn" required maxlength="80" placeholder="Ej.: Griego Koiné" value="${esc(a?.nombre)}"></div>
    <div class="fld"><label for="fp">Profesor</label><input id="fp" required maxlength="80" placeholder="Ej.: Lic. Rolando Desdín" value="${esc(a?.profesor)}"></div>
    <div class="fld"><label for="fl">Enlace para acceder</label><input id="fl" type="url" required placeholder="https://…" value="${esc(a?.enlace)}"><small>La página de la asignatura a la que entrarán los estudiantes.</small></div>
    <div class="err" id="fe" role="alert"></div><div class="acts"><button type="button" class="btn sec" id="fc">Cancelar</button><button class="btn" type="submit" id="fs">${a ? 'Guardar cambios' : 'Crear asignatura'}</button></div></form>`);
  $('#fc').onclick = () => d.close(); $('#fn').focus();
  $('form', d).onsubmit = async e => {
    e.preventDefault(); let l = $('#fl').value.trim(); if (l && !/^https?:\/\//i.test(l)) l = 'https://' + l;
    const n = $('#fn').value.trim(), p = $('#fp').value.trim();
    if (!n || !p) return $('#fe').textContent = 'Completa el nombre y el profesor.';
    try { new URL(l); } catch { return $('#fe').textContent = 'Escribe un enlace válido.'; }
    $('#fs').disabled = true; $('#fs').textContent = 'Guardando…';
    try { const r = await post(a ? 'actualizar' : 'crear', { id: a?.id, nombre: n, profesor: p, enlace: l }); items = r.asignaturas; cache(); d.close(); render(); toast(a ? 'Cambios guardados ✓' : 'Asignatura creada ✓'); }
    catch (er) { authErr(er); $('#fe').textContent = er.message; $('#fs').disabled = false; $('#fs').textContent = a ? 'Guardar cambios' : 'Crear asignatura'; }
  };
}
function authErr(e) { if (e.code === 'AUTH') { key = ''; admin = false; sessionStorage.removeItem('stbcor.clave'); render(); } }
function login() {
  const d = dialog('Modo administrador', `<form class="db"><p style="color:var(--mut);font-size:.92rem">Introduce la clave para crear, editar o eliminar asignaturas.</p><div class="fld"><label for="fk">Clave</label><input id="fk" type="password" autocomplete="current-password" required></div><div class="err" id="fe" role="alert"></div><div class="acts"><button type="button" class="btn sec" id="fc">Cancelar</button><button class="btn" id="fs" type="submit">Entrar</button></div></form>`);
  $('#fc').onclick = () => d.close(); $('#fk').focus();
  $('form', d).onsubmit = async e => { e.preventDefault(); key = $('#fk').value; $('#fs').disabled = true;
    try { await post('auth'); admin = true; sessionStorage.setItem('stbcor.clave', key); d.close(); render(); toast('Modo administrador activado'); }
    catch (er) { key = ''; $('#fe').textContent = er.code === 'AUTH' ? 'Clave incorrecta.' : 'No se pudo verificar: ' + er.message; $('#fs').disabled = false; } };
}
function confirmDel(a) {
  const d = dialog('Eliminar asignatura', `<div class="db"><p>¿Eliminar <b>${esc(a.nombre)}</b>? Se borrará también de la hoja de cálculo.</p><div class="acts"><button class="btn sec" id="fc" type="button">Cancelar</button><button class="btn red" id="fs" type="button">Eliminar</button></div></div>`);
  $('#fc').onclick = () => d.close();
  $('#fs').onclick = async () => { $('#fs').disabled = true; try { items = (await post('eliminar', { id: a.id })).asignaturas; cache(); d.close(); render(); toast('Asignatura eliminada'); } catch (er) { authErr(er); d.close(); toast(er.message); } };
}
const cache = () => { if (!demo) try { localStorage.setItem(CACHE, JSON.stringify(items)); } catch {} };

/* ---------- arranque ---------- */
function setup() {
  $('#grid').innerHTML = ''; $('#notice').innerHTML = `<div class="notice setup"><h3 style="color:var(--navy)">Conecta el dashboard con tu hoja de Google</h3><ol><li>Pega <code>apps-script/Code.gs</code> en Extensiones → Apps Script de una hoja nueva y cambia la clave.</li><li>Ejecuta <code>configurarHoja</code> e impleméntalo como <b>aplicación web</b> (acceso: cualquier usuario).</li><li>Copia la URL <code>/exec</code> en <code>js/config.js</code> → <code>APPS_SCRIPT_URL</code>.</li></ol><button class="btn" id="demo" type="button"><i class="fas fa-eye"></i> Ver demostración</button></div>`;
  $('#demo').onclick = () => { demo = true; admin = true; key = 'demo'; items = [{ id: 'd1', nombre: 'Griego Koiné', profesor: 'Lic. Rolando Desdín', enlace: 'https://example.org/' }, { id: 'd2', nombre: 'Introducción a la Biblia', profesor: 'Ma. Joel Gutiérrez', enlace: 'https://example.org/' }]; $('#notice').innerHTML = '<div class="notice"><i class="fas fa-eye"></i><div><b>Modo demostración:</b> los cambios no se guardan. Configura <code>APPS_SCRIPT_URL</code> para usar tu hoja.</div></div>'; render(); };
}
async function load() {
  if (!hasApi()) return setup();
  $('#grid').innerHTML = '<div class="skel"></div>'.repeat(3);
  try { items = await list(); cache(); $('#notice').innerHTML = ''; }
  catch (e) {
    let c = null; try { c = JSON.parse(localStorage.getItem(CACHE)); } catch {}
    if (c) { items = c; $('#notice').innerHTML = '<div class="notice"><i class="fas fa-wifi"></i><div>Sin conexión con la hoja. Se muestran los datos guardados.</div></div>'; }
    else { $('#grid').innerHTML = ''; $('#notice').innerHTML = `<div class="notice err"><i class="fas fa-triangle-exclamation"></i><div><b>No se pudieron cargar las asignaturas.</b><br>${esc(e.message)}<br><button class="btn" id="retry" type="button"><i class="fas fa-rotate"></i> Reintentar</button></div></div>`; $('#retry').onclick = load; return; }
  }
  render();
}
$('#course').textContent = 'CURSO ' + C.CURSO; $('#yr').textContent = C.CURSO;
$('#q').oninput = e => { query = e.target.value; render(); };
$('#newBtn').onclick = () => form();
$('#adminBtn').onclick = () => { if (admin) { admin = false; key = ''; sessionStorage.removeItem('stbcor.clave'); render(); toast('Modo administrador desactivado'); } else login(); };
document.addEventListener('click', e => { const b = e.target.closest('[data-e],[data-d],[data-new]'); if (!b) return;
  if (b.dataset.new !== undefined) return form();
  const a = items.find(x => x.id === (b.dataset.e || b.dataset.d)); if (a) b.dataset.e ? form(a) : confirmDel(a); });
load();
})();
