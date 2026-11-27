# Aplicación Ruta de evacuación (Android)

Esta carpeta es el proyecto de una aplicación para teléfonos **Android**. Al abrirla, el usuario escanea el QR de un cartel y la app le dice **en voz alta** (y con letras grandes, flechas y vibración) cómo llegar a la salida más cercana del plantel. No necesita internet. Pide permiso de **cámara** (para leer el QR) y usa la vibración.

**Importante:** el APK todavía no está armado. Se arma solo en GitHub (gratis) siguiendo los pasos de abajo. No pude compilarlo desde donde trabajo porque ahí está bloqueado el sitio que descarga las herramientas de Android.

---

## Cómo sacar el APK y el QR (con GitHub, sin instalar nada)

**Paso 1. Crear el repositorio**
1. Entren a github.com con su cuenta (o creen una).
2. Arriba a la derecha: **+ → New repository**.
3. Nombre: `ruta-evacuacion`. Marquen **Public** (público). Presionen **Create repository**.

**Paso 2. Subir los archivos**
1. Extraigan el zip en su computadora. Van a ver una carpeta con `app`, `gradle`, `gradlew`, `.github`, etc.
2. En la página del repositorio, presionen **uploading an existing file**.
3. Arrastren **todo el contenido** de la carpeta (no la carpeta en sí) a la ventana. Tienen que subirse también `.github` y `gradle`.
4. Abajo presionen **Commit changes**.

*Si la carpeta `.github` no se sube* (por ser oculta): en el repositorio presionen **Add file → Create new file**, escriban como nombre `.github/workflows/apk.yml` (al escribir `/` se crean las carpetas) y peguen adentro el contenido del archivo `apk.yml` de este proyecto. Luego **Commit changes**.

**Paso 3. Esperar a que GitHub arme el APK**
1. Entren a la pestaña **Actions**.
2. Verán una tarea llamada **Crear APK** trabajando (círculo amarillo). Tarda entre 3 y 6 minutos.
3. Cuando salga una palomita verde, ya está. Si sale una X roja, entren a la tarea y mándenme una captura de lo que dice en rojo.

**Paso 4. El enlace de descarga**
Cuando termine, el APK queda en esta dirección (cambien `USUARIO` por su usuario de GitHub):

`https://github.com/USUARIO/ruta-evacuacion/releases/latest/download/ruta-evacuacion.apk`

Pruébenla en el celular: tiene que empezar a descargar el archivo. **Esa dirección es la que va en el QR.** Mándenme su usuario y les hago el QR listo para imprimir.

**Paso 5. Instalarla en un celular**
1. Escanear el QR (o abrir el enlace) y descargar el archivo.
2. Abrir el archivo descargado. Android pedirá permiso para **instalar apps de origen desconocido**: permitirlo solo para el navegador que usaron.
3. Si aparece un aviso de Play Protect, elegir **Instalar de todos modos**. Sale porque la app no viene de Play Store.
4. Abrir **Ruta de evacuación**.

---

## Cosas que deben saber

- **Solo Android.** Un iPhone no puede instalar un APK. Para esos teléfonos, la misma página se puede abrir en el navegador con otro QR.
- **El APK es de prueba** (versión "debug"): funciona y se instala bien, pero no es para subir a Play Store. Para un proyecto escolar está bien.
- **Si actualizan la app** y alguien ya la tenía instalada, puede salir un error al instalar. Se arregla desinstalando la anterior y volviendo a instalar.
- **No pude probar el APK en un teléfono.** Revisé los archivos y la página por separado, pero la compilación real ocurre en GitHub. Si algo falla ahí, es normal que haya que ajustar un detalle: avísenme con la captura.

## Cómo funciona (resumen)

1. Cada cartel lleva un QR con un **enlace**, por ejemplo `https://dantecbtis188.github.io/ruta-evacuacion/?c=cartel-5`.
2. Al escanearlo con la cámara del celular:
   - **Si la app está instalada** y los "enlaces verificados" están activos (paso opcional B), se abre directo la app.
   - Si no, se abre una página con un botón grande **"Abrir la ruta en la app"**. Ese botón abre la app si está instalada; si no, **descarga el APK**. También hay opción de usar la versión en el navegador (sirve para iPhone).
3. La app busca la salida más cercana en el mapa del plantel y la dice en voz alta, con letras grandes, flechas y vibración. En el croquis (la foto aérea) se ve al monito caminando hacia la salida.
4. **Cómo sabe dónde está:** el celular no tiene GPS adentro de edificios. La app parte del cartel escaneado, estima el avance con los pasos (opcional) o con los botones Siguiente/Anterior, y se corrige al escanear otro cartel. Es una estimación.

## Qué subir a GitHub

- **Paso A (obligatorio):** la carpeta `app` de `app-evacuacion` (reemplaza la anterior) y la carpeta `docs` en la raíz del repositorio. En Settings → Pages elijan *Deploy from a branch*, rama `main`, carpeta `/docs`.
- **Paso B (opcional, para que abra directo sin tocar nada):** crear otro repositorio público llamado exactamente `dantecbtis188.github.io` y subirle el contenido de `sitio-usuario` (incluye `.well-known/assetlinks.json` y `.nojekyll`). Activar Pages desde `main` / raíz.

## Cómo cambiar el mapa

Todo está en `app/src/main/assets/plantel.js` (con comentarios). Los pasillos y las 3 salidas salen de la foto aérea y de las rayas amarillas. Los **carteles son de ejemplo**: cambien su posición (`px`, `py` en la foto) y hacia dónde mira quien lo lee (`mira`). La **escala** (`ESCALA`, 0.1 m por píxel) es estimada: midan un pasillo en la escuela y corrijan ese número.

## Qué hay en cada parte

| Archivo | Para qué sirve |
|---|---|
| `app/src/main/assets/index.html`, `estilos.css`, `app.js` | Pantallas, colores y la lógica (voz, vibración, cámara, croquis con monito). |
| `app/src/main/assets/plantel.js` y `plano.jpg` | **El mapa del plantel** y la foto aérea. |
| `app/src/main/assets/motor.js` | Calcula la ruta más corta y escribe las indicaciones. |
| `app/src/main/assets/jsQR.js` | Librería gratuita que lee QR con la cámara. |
| `app/src/main/java/.../MainActivity.java` | Abre la página dentro de la app, pide la cámara, abre el 911 y recibe el cartel del QR. |
| `app/src/main/AndroidManifest.xml` | Permisos (cámara, vibración) y los enlaces que abren la app. |
| `app/ruta-evacuacion.keystore` | Llave de firma fija de práctica: permite actualizar la app sin desinstalarla. |
| `docs/` | Página de entrada del QR y copia de la app para el navegador. |
| `sitio-usuario/` | Archivo que permite abrir la app directo desde el QR (paso B). |

## Límites honestos

- No pude probar el APK ni la cámara ni los enlaces verificados en un teléfono real. La lógica, el mapa, la voz, el lector de QR (con cámara simulada) y la página de entrada sí se probaron en un navegador.
- Las distancias son estimadas y la posición es aproximada. Las rutas deben revisarse con la dirección del plantel y Protección Civil.
