/**
 * DASHBOARD DE ASIGNATURAS · Seminario Teológico Bautista de Cuba Oriental
 * Un solo archivo: conecta la página con la Hoja de Google.
 *
 * CÓMO INSTALAR (5 minutos):
 *  1. Crea una Hoja de cálculo de Google (sheets.new).
 *  2. Extensiones → Apps Script. Borra lo que haya y pega TODO este archivo.
 *  3. Cambia CLAVE_ADMIN (abajo) por una clave tuya. Guarda.
 *  4. Ejecuta la función «configurarHoja» una vez (acepta los permisos).
 *  5. Implementar → Nueva implementación → Tipo: Aplicación web
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *     Copia la URL que termina en /exec y pégala en js/config.js (APPS_SCRIPT_URL).
 *  Si luego modificas este código: Implementar → Administrar implementaciones → Editar → Nueva versión.
 */
const CONFIG = {
  HOJA: 'Asignaturas',
  CLAVE_ADMIN: 'CAMBIA-ESTA-CLAVE',   // <-- cámbiala. Quien la tenga puede crear, editar y borrar asignaturas.
  ID_HOJA_CALCULO: ''                 // Déjalo vacío si el script se creó desde la hoja (Extensiones → Apps Script).
};
const COLUMNAS = ['ID', 'Asignatura', 'Profesor', 'Enlace', 'Creada', 'Actualizada'];

/* ---------- Menú y configuración ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Asignaturas STBCOr').addItem('Configurar hoja', 'configurarHoja').addToUi();
}
function configurarHoja() {
  hoja_();
  try { SpreadsheetApp.getUi().alert('Hoja «' + CONFIG.HOJA + '» lista. Ahora implementa el script como aplicación web.'); } catch (e) {}
}

/* ---------- Entrada web ---------- */
function doGet(e) {
  try {
    const accion = (e && e.parameter && e.parameter.action) || 'list';
    if (accion === 'list') return json_({ ok: true, asignaturas: listar_() });
    return json_({ ok: false, error: 'Acción no válida' });
  } catch (err) { return json_({ ok: false, error: mensaje_(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!claveValida_(b.clave)) return json_({ ok: false, code: 'AUTH', error: 'Clave de administrador incorrecta' });
    switch (b.accion) {
      case 'auth':       return json_({ ok: true });
      case 'crear':      crear_(b); break;
      case 'actualizar': actualizar_(b); break;
      case 'eliminar':   eliminar_(b); break;
      default:           return json_({ ok: false, error: 'Acción no válida' });
    }
    return json_({ ok: true, asignaturas: listar_() });
  } catch (err) {
    return json_({ ok: false, error: mensaje_(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- Operaciones ---------- */
function crear_(b) {
  const d = validar_(b), sh = hoja_(), ahora = new Date();
  const fila = sh.getLastRow() + 1;
  sh.getRange(fila, 2, 1, 3).setNumberFormat('@');                       // texto plano: evita que "=algo" se vuelva fórmula
  sh.getRange(fila, 1, 1, 6).setValues([[Utilities.getUuid(), d.nombre, d.profesor, d.enlace, ahora, ahora]]);
}
function actualizar_(b) {
  const d = validar_(b), sh = hoja_(), fila = buscarFila_(sh, b.id);
  sh.getRange(fila, 2, 1, 3).setNumberFormat('@').setValues([[d.nombre, d.profesor, d.enlace]]);
  sh.getRange(fila, 6).setValue(new Date());
}
function eliminar_(b) {
  const sh = hoja_();
  sh.deleteRow(buscarFila_(sh, b.id));
}

/* ---------- Utilidades ---------- */
function listar_() {
  const sh = hoja_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 6).getValues().filter(function (r) { return r[0]; }).map(function (r) {
    return { id: String(r[0]), nombre: String(r[1]), profesor: String(r[2]), enlace: String(r[3]),
             creada: r[4] instanceof Date ? r[4].toISOString() : String(r[4] || '') };
  });
}
function buscarFila_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !id) throw new Error('Asignatura no encontrada');
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  throw new Error('Asignatura no encontrada (quizá ya fue eliminada)');
}
function validar_(b) {
  const nombre = limpiar_(b.nombre, 80), profesor = limpiar_(b.profesor, 80);
  let enlace = limpiar_(b.enlace, 500);
  if (!nombre) throw new Error('Escribe el nombre de la asignatura');
  if (!profesor) throw new Error('Escribe el nombre del profesor');
  if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(enlace)) throw new Error('El enlace debe empezar con http:// o https://');
  return { nombre: nombre, profesor: profesor, enlace: enlace };
}
function limpiar_(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
function claveValida_(c) {
  const a = String(c || ''), k = String(CONFIG.CLAVE_ADMIN);
  if (!k) return false;
  let dif = a.length ^ k.length;                                         // comparación sin atajos
  for (let i = 0; i < k.length; i++) dif |= (a.charCodeAt(i) || 0) ^ k.charCodeAt(i);
  return dif === 0;
}
function hoja_() {
  const ss = CONFIG.ID_HOJA_CALCULO ? SpreadsheetApp.openById(CONFIG.ID_HOJA_CALCULO) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.HOJA);
  if (!sh) sh = ss.insertSheet(CONFIG.HOJA);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#14385c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    [260, 260, 240, 380, 140, 140].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange('E:F').setNumberFormat('dd/mm/yyyy hh:mm');
  }
  return sh;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function mensaje_(e) { return String((e && e.message) || e); }
