# Plataforma académica · STBCOr · Curso 2026–2027

Página web (GitHub Pages) + **un solo archivo** `apps-script/Code.gs` conectado a una hoja de Google.

## Qué incluye
| Sección | Quién la ve | Quién la edita |
|---|---|---|
| Asignaturas (tarjetas con enlace) | Todos | Rectoría, Decanato, Secretaría (borrar: Rectoría y Decanato) |
| Anuncios | Todos | Rectoría, Decanato y Secretaría publican. Rectoría edita/borra todos; los demás solo los suyos |
| Malla curricular (77 materias, 4 años) | Todos | **Solo Decanato** |
| Calendario académico | Todos | Rectoría y Decanato |
| Directorio (11 cargos + 50 docentes) | Todos | Rectoría y Secretaría |

Todos deben iniciar sesión: los estudiantes con usuario y contraseña (72 cuentas, en `Credenciales_Estudiantes_STBCOr_2026-2027.csv`), y el personal con un código de acceso (rector / decano / secretaría) en la pestaña «Personal».
Las contraseñas se guardan cifradas (SHA-256 con sal), nunca en texto plano. Tras 8 intentos fallidos la cuenta se bloquea 10 minutos.

## Instalación (10 minutos)
1. Crea una hoja de Google nueva (sheets.new). **Déjala privada**: contiene las cuentas.
2. Extensiones → Apps Script. Pega todo `apps-script/Code.gs`. (Opcional pero recomendado: cambia las 3 claves de `CONFIG.CLAVES`.)
3. Ejecuta la función `configurarHoja` (acepta permisos). Crea las 6 hojas y carga la malla, el directorio y las cuentas.
4. Implementar → Nueva implementación → Aplicación web → *Ejecutar como:* Yo · *Acceso:* Cualquier usuario. Copia la URL `/exec`.
5. Pega esa URL en `js/config.js` (`APPS_SCRIPT_URL`) y sube la carpeta a GitHub Pages.

## Mantenimiento
- Menú de la hoja **Plataforma STBCOr**: restablecer la contraseña de un estudiante (genera una nueva) y agregar estudiantes.
- Una cuenta puede desactivarse poniendo `Inactivo` en la columna Estado de la hoja «Usuarios» (Gelkis Guerra ya está inactivo).
- Cambiar permisos: edita `perm` de cada sección en `ENTIDADES` (Code.gs).
- Tras modificar Code.gs: Implementar → Administrar implementaciones → Editar → Nueva versión.
- Las hojas quedan protegidas: el contenido se edita desde la plataforma (también puede hacerlo el propietario de la hoja directamente).
- Los estudiantes cambian su propia contraseña desde «Mi cuenta».

## Datos que conviene revisar
Algunos datos del directorio venían con discrepancias entre tus dos fuentes; revísalos en la hoja «Directorio»:
teléfono del Rector (53422375 en el sílabo, 53422376 en la base de datos), correo de Michel Morales (…1980 vs …1981), de Alsuby Alba (`mifamiia`/`mifamilia`) y de Félix Domínguez (`rvfelixr`/`rvfelix`).
