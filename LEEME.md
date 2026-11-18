# Dashboard de asignaturas · STBCOr · Curso 2026–2027

Página moderna con la identidad del seminario que lista las asignaturas (tarjetas clicables) y se conecta a una Hoja de Google mediante **un solo archivo**: `apps-script/Code.gs`.

## Contenido
- `index.html`, `css/`, `js/`, `assets/`, `vendor/` → la página (funciona en GitHub Pages, sin servidor).
- `apps-script/Code.gs` → todo el backend. La hoja registra: **ID · Asignatura · Profesor · Enlace · Creada · Actualizada**.

## Instalación (10 minutos)
1. **Hoja:** crea una hoja de Google (sheets.new).
2. **Script:** Extensiones → Apps Script. Borra el contenido y pega todo `Code.gs`.
3. **Clave:** en `CONFIG.CLAVE_ADMIN` cambia `CAMBIA-ESTA-CLAVE` por tu clave. Guarda.
4. **Preparar la hoja:** elige la función `configurarHoja` y pulsa Ejecutar (acepta los permisos; crea la pestaña «Asignaturas»).
5. **Publicar el backend:** Implementar → Nueva implementación → ⚙ Aplicación web →
   *Ejecutar como:* **Yo** · *Quién tiene acceso:* **Cualquier usuario** → Implementar. Copia la URL que termina en `/exec`.
6. **Conectar la página:** abre `js/config.js` y pega esa URL en `APPS_SCRIPT_URL`.
7. **Publicar la página:** sube esta carpeta a un repositorio de GitHub y activa Pages (o ábrela con cualquier servidor web).

## Uso
- Los estudiantes ven las tarjetas y pulsan una para **entrar a la asignatura** (se abre su enlace).
- Para gestionar: botón **Administrar** (arriba a la derecha) → escribe tu clave → aparecen **Nueva asignatura** y los botones de editar/eliminar en cada tarjeta. Cada cambio se guarda en la hoja.
- También puedes editar la hoja directamente: la página muestra lo que haya en ella.
- Ejemplo: crea «Griego Koiné» con el profesor y el enlace de su plataforma.

## Notas
- Si modificas `Code.gs` después: Implementar → Administrar implementaciones → ✏ → **Nueva versión** (la URL no cambia).
- La clave se comprueba en el servidor (Apps Script); no está en la página. Cualquiera puede *ver* la lista (es pública, como el dashboard); solo quien tenga la clave puede cambiarla.
- Sin `APPS_SCRIPT_URL` la página muestra las instrucciones y un botón «Ver demostración» (datos de ejemplo que no se guardan).
- Si la hoja no responde, se muestran las últimas asignaturas guardadas en el navegador.
