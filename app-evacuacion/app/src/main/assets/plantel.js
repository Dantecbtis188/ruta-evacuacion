/* =====================================================================================
   MAPA DEL CBTis 188  (AQUÍ SE CAMBIA TODO LO QUE DEPENDE DE LA ESCUELA)

   Hecho con la foto aérea (plano.jpg) y los pasillos que ustedes marcaron en amarillo.
   Los pasillos y las 3 salidas son exactamente los que marcaron. No se agregó ninguno.

   Cómo está hecho (idea simple): el plantel es una red de PUNTOS unidos por CAMINOS.
   - Cada punto tiene su lugar en la FOTO: px = pixeles hacia la derecha, py = pixeles hacia abajo
     (la foto mide 1600 x 1200).
   - Cada camino une dos puntos. Su largo en metros se calcula solo con la ESCALA de abajo.
   - Rumbos: arriba de la foto es el norte (0 grados). Este = 90, sur = 180, oeste = 270.

   Tipos de punto (tipo):
     'cartel'    un cartel con QR. Aquí empieza la ruta. "mira" = hacia dónde mira una persona
                 cuando lee el cartel (0 arriba, 90 derecha, 180 abajo, 270 izquierda).
     'cruce'     esquina, cruce o final de pasillo (sirve para dar la vuelta).
     'salida'    una salida del plantel. "reunion" = punto de reunión de afuera (si se quiere decir).
     'escalera' / 'rampa' / 'refugio'  para cuando haya pisos con escaleras o rampas.

   *** DOS COSAS QUE HAY QUE CONFIRMAR ***
   1) ESCALA: se calculó a ojo (1 pixel de la foto = 0.1 metros). Para corregirla, midan en la
      escuela una distancia real que se vea en la foto (por ejemplo, el largo de un edificio) y
      cambien el número de abajo:  ESCALA = metros reales / pixeles de la foto.
   2) CARTELES: las posiciones y hacia dónde mira cada uno son un ejemplo. Cámbienlas por las reales.
   ===================================================================================== */

var ESCALA = 0.1;   // metros que mide cada pixel de la foto (¡confirmar!)

var PLANTEL = {
  nombre: 'CBTis 188',
  telefono: '911',
  paso_m: 0.7,            // largo promedio de un paso, en metros (sirve para contar pasos)
  escala: ESCALA,
  precaucion: 'Mantenga la calma. No corra.',
  aviso: 'Prototipo escolar. Las rutas deben revisarse con la dirección y Protección Civil. En una emergencia real, siga las indicaciones del personal.',

  /* ---------- Foto del plantel (solo para dibujar el croquis) ---------- */
  pisos: {
    0: { nombre: 'Plantel', foto: 'plano.jpg', w: 1600, h: 1200 }
  },

  /* ---------- Puntos ---------- */
  nodos: {
    'p-a': { px: 380, py: 266, tipo: 'cruce', nombre: 'la esquina' },
    'p-b': { px: 319, py: 279, tipo: 'cruce', nombre: 'la esquina' },
    'p-c': { px: 312, py: 711, tipo: 'cruce', nombre: 'la esquina' },
    'p-d': { px: 453, py: 718, tipo: 'cruce', nombre: 'la esquina' },
    'p-e': { px: 466, py: 681, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-f': { px: 468, py: 553, tipo: 'cruce', nombre: 'la esquina' },
    'p-g': { px: 672, py: 681, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-h': { px: 684, py: 563, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-i': { px: 680, py: 957, tipo: 'cruce', nombre: 'el final del pasillo' },
    'p-j': { px: 852, py: 560, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-k': { px: 848, py: 449, tipo: 'cruce', nombre: 'el final del pasillo' },
    'p-l': { px: 1128, py: 563, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-m': { px: 1132, py: 335, tipo: 'cruce', nombre: 'la esquina' },
    'p-n': { px: 1237, py: 335, tipo: 'cruce', nombre: 'la esquina' },
    'p-o': { px: 1297, py: 328, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-p': { px: 1339, py: 333, tipo: 'cruce', nombre: 'la esquina' },
    'p-q': { px: 1298, py: 265, tipo: 'cruce', nombre: 'la esquina' },
    'p-r': { px: 1135, py: 608, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-s': { px: 1129, py: 705, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-t': { px: 1132, py: 960, tipo: 'cruce', nombre: 'la esquina' },
    'p-u': { px: 1145, py: 1013, tipo: 'cruce', nombre: 'la esquina' },
    'p-v': { px: 1117, py: 1029, tipo: 'cruce', nombre: 'la esquina' },
    'p-w': { px: 917, py: 1028, tipo: 'cruce', nombre: 'la esquina' },
    'p-x': { px: 902, py: 938, tipo: 'cruce', nombre: 'la esquina' },
    'p-y': { px: 908, py: 705, tipo: 'cruce', nombre: 'la esquina' },
    'p-z': { px: 1318, py: 622, tipo: 'cruce', nombre: 'la esquina' },
    'p-A': { px: 1341, py: 622, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-B': { px: 1334, py: 800, tipo: 'cruce', nombre: 'el cruce de pasillos' },
    'p-C': { px: 1289, py: 809, tipo: 'cruce', nombre: 'la esquina' },
    'p-D': { px: 1403, py: 808, tipo: 'cruce', nombre: 'la esquina' },
    'p-E': { px: 1395, py: 1043, tipo: 'cruce', nombre: 'la esquina' },
    'p-F': { px: 1365, py: 1046, tipo: 'cruce', nombre: 'la esquina' },
    'p-G': { px: 1296, py: 919, tipo: 'cruce', nombre: 'la esquina' },
    'p-Hh': { px: 1291, py: 1020, tipo: 'cruce', nombre: 'la esquina' },
    'salida-cancha': { px: 370, py: 198, tipo: 'salida', nombre: 'la salida por la puerta de la cancha' },
    'salida-principal': { px: 1227, py: 205, tipo: 'salida', nombre: 'la puerta principal' },
    'salida-estacionamiento': { px: 1329, py: 1061, tipo: 'salida', nombre: 'la salida del estacionamiento' },
    'cartel-1': { px: 315, py: 540, tipo: 'cartel', mira: 90, lugar: 'Cartel 1 · pasillo oeste, junto al edificio de la izquierda' },
    'cartel-2': { px: 467, py: 615, tipo: 'cartel', mira: 270, lugar: 'Cartel 2 · pasillo entre los dos primeros edificios' },
    'cartel-3': { px: 580, py: 681, tipo: 'cartel', mira: 0, lugar: 'Cartel 3 · pasillo al sur del segundo edificio' },
    'cartel-4': { px: 676, py: 820, tipo: 'cartel', mira: 270, lugar: 'Cartel 4 · pasillo junto al edificio de techo naranja' },
    'cartel-5': { px: 800, py: 561, tipo: 'cartel', mira: 180, lugar: 'Cartel 5 · pasillo central, lado oeste' },
    'cartel-6': { px: 1000, py: 562, tipo: 'cartel', mira: 180, lugar: 'Cartel 6 · pasillo central, lado este' },
    'cartel-7': { px: 1130, py: 820, tipo: 'cartel', mira: 90, lugar: 'Cartel 7 · pasillo junto a los edificios del centro-derecha' },
    'cartel-8': { px: 1340, py: 480, tipo: 'cartel', mira: 90, lugar: 'Cartel 8 · pasillo del edificio del lado derecho' },
    'cartel-9': { px: 1190, py: 335, tipo: 'cartel', mira: 180, lugar: 'Cartel 9 · pasillo norte, frente al edificio gris' },
    'cartel-10': { px: 1399, py: 930, tipo: 'cartel', mira: 270, lugar: 'Cartel 10 · lado del estacionamiento' },
    'cartel-11': { px: 905, py: 820, tipo: 'cartel', mira: 90, lugar: 'Cartel 11 · pasillo techado entre edificios' },
  },

  /* ---------- Caminos (pasillos que se pueden caminar) ----------
     Solo se escriben los dos puntos; el largo se calcula. */
  aristas: [
    { a: 'salida-cancha', b: 'p-a' },
    { a: 'p-a', b: 'p-b' },
    { a: 'p-c', b: 'p-d' },
    { a: 'p-d', b: 'p-e' },
    { a: 'p-f', b: 'p-h' },
    { a: 'p-h', b: 'p-g' },
    { a: 'p-j', b: 'p-k' },
    { a: 'p-l', b: 'p-m' },
    { a: 'p-n', b: 'p-o' },
    { a: 'p-o', b: 'p-p' },
    { a: 'p-o', b: 'p-q' },
    { a: 'p-q', b: 'salida-principal' },
    { a: 'p-l', b: 'p-r' },
    { a: 'p-r', b: 'p-s' },
    { a: 'p-t', b: 'p-u' },
    { a: 'p-u', b: 'p-v' },
    { a: 'p-v', b: 'p-w' },
    { a: 'p-w', b: 'p-x' },
    { a: 'p-y', b: 'p-s' },
    { a: 'p-r', b: 'p-z' },
    { a: 'p-z', b: 'p-A' },
    { a: 'p-A', b: 'p-B' },
    { a: 'p-B', b: 'p-C' },
    { a: 'p-B', b: 'p-D' },
    { a: 'p-E', b: 'p-F' },
    { a: 'p-F', b: 'salida-estacionamiento' },
    { a: 'p-C', b: 'p-G' },
    { a: 'p-G', b: 'p-Hh' },
    { a: 'p-Hh', b: 'salida-estacionamiento' },
    { a: 'p-b', b: 'cartel-1' },
    { a: 'cartel-1', b: 'p-c' },
    { a: 'p-e', b: 'cartel-2' },
    { a: 'cartel-2', b: 'p-f' },
    { a: 'p-e', b: 'cartel-3' },
    { a: 'cartel-3', b: 'p-g' },
    { a: 'p-g', b: 'cartel-4' },
    { a: 'cartel-4', b: 'p-i' },
    { a: 'p-h', b: 'cartel-5' },
    { a: 'cartel-5', b: 'p-j' },
    { a: 'p-j', b: 'cartel-6' },
    { a: 'cartel-6', b: 'p-l' },
    { a: 'p-s', b: 'cartel-7' },
    { a: 'cartel-7', b: 'p-t' },
    { a: 'p-p', b: 'cartel-8' },
    { a: 'cartel-8', b: 'p-A' },
    { a: 'p-m', b: 'cartel-9' },
    { a: 'cartel-9', b: 'p-n' },
    { a: 'p-D', b: 'cartel-10' },
    { a: 'cartel-10', b: 'p-E' },
    { a: 'p-x', b: 'cartel-11' },
    { a: 'cartel-11', b: 'p-y' },
  ]
};

/* Pasa los pixeles de la foto a metros (no tocar). */
Object.keys(PLANTEL.nodos).forEach(function (id) {
  var n = PLANTEL.nodos[id];
  n.piso = 0; n.x = n.px * ESCALA; n.y = n.py * ESCALA;
});
