# Ruta de evacuación · CBTIS 188

Prototipo Android offline con croquis esquemático, cálculo de ruta en un grafo de pasillos, indicaciones en pantalla y voz española de Android TextToSpeech. Cada cartel QR representa un punto fijo de inicio: no es GPS ni seguimiento en vivo.

## Seguridad antes de probar

El dibujo y las conexiones de pasillos son una aproximación hecha a partir de las imágenes aéreas compartidas. Las distancias son unidades esquemáticas, no metros. La accesibilidad de pasillos, puertas, rampas, obstáculos y salidas no ha sido comprobada. **No usar en una emergencia real hasta que el plantel y Protección Civil revisen el plano, recorran las rutas y validen las salidas y la accesibilidad.** Una ruta que evita los tramos marcados con escaleras no equivale a una ruta accesible certificada.

## Probar la app

1. Abre el repositorio en GitHub y cambia a la rama `feature/navegacion-inclusiva-qr`.
2. En **Actions**, ejecuta el workflow `Crear APK` (Run workflow) sobre esa rama y espera a que termine correctamente.
3. Descarga el APK publicado por el flujo de trabajo. Instálalo en un teléfono Android compatible y permite la instalación del archivo si Android lo solicita.
4. Abre la app. Elige un punto QR, pulsa **Calcular ruta y escuchar**, prueba **Repetir indicación** y **Siguiente indicación**. Activa el volumen y asegúrate de tener disponible una voz española.

La aplicación no pide cámara, GPS ni internet. Los QR los puede leer la cámara o lector QR del teléfono. Si el lector ofrece abrir el enlace en navegador, acepta abrir la app.

## Enlaces/QR de prueba

Los QR siguientes abren la aplicación instalada y pasan la ubicación. Si todavía no está instalada, el navegador puede llevar a la página de Releases; instala la app y vuelve a escanear el QR. No es posible instalar una APK silenciosamente desde un QR, y Android puede mostrar una confirmación.

Contenido de QR de prueba:

- Cruce central: `rutaevacuacion://ruta?punto=qr-centro`
- Pasillo poniente cerca de cancha: `rutaevacuacion://ruta?punto=qr-cancha`
- Pasillo de aulas poniente: `rutaevacuacion://ruta?punto=qr-aulas-oeste`
- Pasillo norte: `rutaevacuacion://ruta?punto=qr-norte`
- Pasillo oriente: `rutaevacuacion://ruta?punto=qr-oriente`
- Pasillo sur central: `rutaevacuacion://ruta?punto=qr-sur-centro`
- Pasillo suroeste: `rutaevacuacion://ruta?punto=qr-oeste-sur`

Para generar el PNG de un QR, sustituye el texto después de `data=` por el contenido del QR codificado para URL (o pega el contenido anterior en un generador de QR de confianza). Ejemplo de servicio de generación en línea, solo para crear/descargar el QR —la navegación de la app funciona sin internet—:

`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=rutaevacuacion%3A%2F%2Fruta%3Fpunto%3Dqr-centro`

Antes de imprimir, prueba cada QR con la app instalada en varios teléfonos Android. Para un cartel permanente se recomienda una página web HTTPS controlada por la escuela como enlace, con enlace profundo verificado y alternativa para iPhone; los esquemas personalizados no funcionan igual en todos los lectores QR.

## Limitaciones importantes

- El teléfono no obtiene posición interior continua. Cada QR fija el inicio; si la persona se mueve, debe escanear el siguiente QR o pulsar las indicaciones manualmente.
- La persona animada ilustra la ruta calculada, no representa el seguimiento de la persona real.
- El mapa, las ubicaciones de QR y el grafo se editan en `app/src/main/assets/index.html`. Actualiza los nodos y conexiones solo después de comprobarlos en el plantel.
- El texto a voz usa el motor TTS instalado en el dispositivo. Si no está disponible, las mismas indicaciones permanecen visibles.
- La rama de desarrollo es `feature/navegacion-inclusiva-qr`; no mezcles el APK de prueba con instrucciones de evacuación oficiales sin validación.
