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

## Cómo funciona la guía (resumen)

1. La persona escanea el QR de un cartel. El QR contiene un texto como `cbtis188:pb-aulas` (el nombre del cartel en el mapa).
2. La app busca en el mapa (`plantel.js`) la salida más cercana. Si activó **ruta sin escaleras**, usa rampas; si no hay salida sin escaleras, la manda al área de resguardo.
3. Dice cada indicación en voz alta (“Con el cartel de frente, gire a la derecha y avance 27 metros…”), la muestra con letras grandes y una flecha, y vibra distinto según la acción.
4. **Cómo sabe dónde está:** el celular no tiene GPS adentro de edificios. Por eso la app (a) sabe dónde empezó por el cartel, (b) estima el avance contando pasos con el sensor de movimiento (opcional) o con los botones **Siguiente / Anterior**, y (c) se corrige cada vez que escanea otro cartel. Es una estimación, no un rastreo exacto.

## Cómo cambiar el mapa a los datos reales del CBTis 188

Todo está en `app/src/main/assets/plantel.js`, con comentarios que explican cada parte. Ahorita tiene datos de **ejemplo**. Hay que poner: los pisos y cuartos, dónde está cada cartel y hacia dónde mira quien lo lee, los cruces de pasillos, escaleras, rampas, salidas y puntos de reunión. Después, subir el archivo a GitHub y se arma un APK nuevo solo.

## Qué hay en cada parte (por si el profesor pregunta)

| Archivo | Para qué sirve |
|---|---|
| `app/src/main/assets/index.html` | Las pantallas de la app (inicio, ruta, cámara, ajustes). |
| `app/src/main/assets/estilos.css` | Colores y tamaños; incluye modo oscuro y alto contraste. |
| `app/src/main/assets/plantel.js` | **El mapa del plantel** (lo que hay que cambiar por el real). |
| `app/src/main/assets/motor.js` | Calcula la ruta más corta, escribe las indicaciones y cuenta pasos. |
| `app/src/main/assets/app.js` | Voz, vibración, cámara, botones y croquis. |
| `app/src/main/assets/jsQR.js` | Librería gratuita que lee códigos QR con la cámara. |
| `app/src/main/java/.../MainActivity.java` | Abre la página dentro de la app, pide el permiso de cámara y abre el marcador para el 911. |
| `app/src/main/AndroidManifest.xml` | Datos de la app y sus permisos (cámara y vibración). |
| `app/src/main/res/` | El ícono (puerta verde con flecha). |
| `app/build.gradle`, `build.gradle`, `settings.gradle` | Instrucciones para armar la app. |
| `gradlew`, `gradle/` | Herramienta que descarga y ejecuta Gradle (el armador). |
| `.github/workflows/apk.yml` | Le dice a GitHub que arme el APK y lo publique con enlace fijo. |

## Límites honestos

- No pude probar el APK ni la cámara en un teléfono real. La lógica sí la probé en un navegador (rutas, voz, vibración, escáner con cámara simulada, conteo de pasos).
- Es un prototipo escolar. Las rutas deben revisarse con la dirección del plantel y Protección Civil antes de usarse de verdad.
