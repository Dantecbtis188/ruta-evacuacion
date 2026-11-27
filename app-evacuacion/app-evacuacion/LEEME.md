# Aplicación Ruta de evacuación (Android)

Esta carpeta es el proyecto de una aplicación para teléfonos **Android**. Al abrirla muestra el croquis con la persona caminando hacia la salida. No necesita internet ni pide ningún permiso.

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

## Cómo cambiar el croquis

La página está en `app/src/main/assets/index.html`. Al principio del bloque `<script>` hay un cuadro llamado **AJUSTES** con los cuartos, la puerta, el camino de la persona, la velocidad y el tamaño. Después de cambiarlo, suban el archivo otra vez a GitHub (**Add file → Upload files**, mismo nombre y misma carpeta) y se arma un APK nuevo solo.

## Qué hay en cada parte (por si el profesor pregunta)

| Archivo | Para qué sirve |
|---|---|
| `app/src/main/assets/index.html` | La página con la persona caminando. Va guardada dentro de la app. |
| `app/src/main/java/.../MainActivity.java` | La única pantalla de la app: abre esa página. |
| `app/src/main/AndroidManifest.xml` | Datos de la app: nombre, ícono y pantalla inicial. No pide permisos. |
| `app/src/main/res/` | El ícono (puerta verde con flecha). |
| `app/build.gradle`, `build.gradle`, `settings.gradle` | Instrucciones para armar la app. |
| `gradlew`, `gradle/` | Herramienta que descarga y ejecuta Gradle (el armador). |
| `.github/workflows/apk.yml` | Le dice a GitHub que arme el APK y lo publique con enlace fijo. |
