/* =====================================================================================
   MAPA DEL PLANTEL  (AQUÍ SE CAMBIA TODO LO QUE DEPENDE DE LA ESCUELA)

   *** DATOS DE EJEMPLO. NO son los del CBTis 188. Hay que cambiarlos por los reales. ***

   Cómo está hecho (idea simple): el plantel es una red de PUNTOS unidos por CAMINOS.
   - Cada punto tiene un nombre corto (id), su lugar en el plano (x, y en METROS) y el piso.
   - Cada camino une dos puntos. Su largo se calcula solo con los metros del plano.
   - El plano se mide en metros: x crece hacia la derecha (este), y crece hacia abajo (sur).
     "Arriba" del dibujo es el norte, que vale 0 grados. Este = 90, sur = 180, oeste = 270.

   Tipos de punto (tipo):
     'cartel'    un cartel con QR. Aquí empieza la ruta. Necesita "mira": hacia dónde mira una
                 persona cuando lee el cartel (en grados: 0 arriba, 90 derecha, 180 abajo, 270 izquierda).
     'cruce'     una esquina o cruce de pasillos (sirve para dar la vuelta).
     'escalera'  inicio o final de una escalera.
     'rampa'     inicio o final de una rampa.
     'salida'    una salida del edificio. "reunion" = el punto de reunión de afuera.
     'refugio'   área de resguardo para quien no puede usar escaleras (solo se usa si no hay otra salida).

   Cada punto puede llevar "nombre": cómo se dice en voz alta ("la escalera", "el cruce de pasillos").
   ===================================================================================== */

var PLANTEL = {
  nombre: 'CBTis 188 (DATOS DE EJEMPLO)',
  telefono: '911',
  paso_m: 0.7,            // largo promedio de un paso, en metros (sirve para contar pasos)
  precaucion: 'Mantenga la calma. No corra. No use el elevador.',
  aviso: 'Prototipo escolar con datos de ejemplo. En una emergencia real, siga las indicaciones del personal y de Protección Civil.',

  /* ---------- Pisos: contorno del edificio y cuartos (solo para dibujar el croquis) ---------- */
  pisos: {
    0: {
      nombre: 'Planta baja',
      edificio: { x: 1, y: 1, w: 30, h: 61 },
      cuartos: [
        { n: 'Dirección',    x: 1,  y: 1,  w: 12, h: 6 },
        { n: 'Cooperativa',  x: 15, y: 1,  w: 16, h: 6 },
        { n: 'Aula 1',       x: 1,  y: 12, w: 9,  h: 9 },
        { n: 'Escalera',     x: 1,  y: 22, w: 9,  h: 6 },
        { n: 'Aula 2',       x: 1,  y: 30, w: 9,  h: 13 },
        { n: 'Aula 3',       x: 1,  y: 45, w: 9,  h: 16 },
        { n: 'Biblioteca',   x: 15, y: 12, w: 15, h: 8 },
        { n: 'Rampa',        x: 15, y: 22, w: 9,  h: 6 },
        { n: 'Aula 4',       x: 15, y: 30, w: 15, h: 13 },
        { n: 'Laboratorio',  x: 15, y: 45, w: 15, h: 16 }
      ]
    },
    1: {
      nombre: 'Primer piso',
      edificio: { x: 1, y: 1, w: 30, h: 61 },
      cuartos: [
        { n: 'Sala de maestros', x: 1,  y: 1,  w: 12, h: 6 },
        { n: 'Aula 9',       x: 15, y: 1,  w: 16, h: 6 },
        { n: 'Aula 5',       x: 1,  y: 12, w: 9,  h: 9 },
        { n: 'Escalera',     x: 1,  y: 22, w: 9,  h: 6 },
        { n: 'Aula 6',       x: 1,  y: 30, w: 9,  h: 13 },
        { n: 'Aula 7',       x: 1,  y: 45, w: 9,  h: 16 },
        { n: 'Cómputo',      x: 15, y: 12, w: 15, h: 8 },
        { n: 'Rampa',        x: 15, y: 22, w: 9,  h: 6 },
        { n: 'Aula 8',       x: 15, y: 30, w: 15, h: 13 },
        { n: 'Taller',       x: 15, y: 45, w: 15, h: 16 }
      ]
    }
  },

  /* ---------- Puntos ---------- */
  nodos: {
    /* planta baja */
    'pb-sur':       { piso: 0, x: 12.5, y: 59,  tipo: 'cartel', mira: 180, nombre: 'el cartel del pasillo sur', lugar: 'Planta baja · Pasillo sur' },
    'pb-aulas':     { piso: 0, x: 12.5, y: 36,  tipo: 'cartel', mira: 270, nombre: 'el cartel de las aulas',    lugar: 'Planta baja · Frente a las aulas' },
    'pb-este':      { piso: 0, x: 24,   y: 9.5, tipo: 'cartel', mira: 0,   nombre: 'el cartel del pasillo este', lugar: 'Planta baja · Pasillo este' },
    'pb-cruce-esc': { piso: 0, x: 12.5, y: 25,  tipo: 'cruce',  nombre: 'la escalera y la rampa' },
    'pb-cruce':     { piso: 0, x: 12.5, y: 9.5, tipo: 'cruce',  nombre: 'el cruce de pasillos' },
    'pb-escalera':  { piso: 0, x: 5.5,  y: 25,  tipo: 'escalera', nombre: 'la escalera' },
    'pb-rampa':     { piso: 0, x: 19.5, y: 25,  tipo: 'rampa',    nombre: 'la rampa' },
    'salida-oeste': { piso: 0, x: 1,    y: 9.5, tipo: 'salida', nombre: 'la salida oeste', reunion: 'el estacionamiento' },
    'salida-este':  { piso: 0, x: 31,   y: 9.5, tipo: 'salida', nombre: 'la salida este',  reunion: 'la cancha principal' },

    /* primer piso */
    'p1-sur':       { piso: 1, x: 12.5, y: 59,  tipo: 'cartel', mira: 180, nombre: 'el cartel del pasillo sur', lugar: 'Primer piso · Pasillo sur' },
    'p1-lab':       { piso: 1, x: 12.5, y: 40,  tipo: 'cartel', mira: 270, nombre: 'el cartel de las aulas',    lugar: 'Primer piso · Frente a las aulas' },
    'p1-norte':     { piso: 1, x: 12.5, y: 10,  tipo: 'cartel', mira: 0,   nombre: 'el cartel del pasillo norte', lugar: 'Primer piso · Pasillo norte' },
    'p1-cruce-esc': { piso: 1, x: 12.5, y: 25,  tipo: 'cruce',  nombre: 'la escalera y la rampa' },
    'p1-escalera':  { piso: 1, x: 5.5,  y: 25,  tipo: 'escalera', nombre: 'la escalera' },
    'p1-rampa':     { piso: 1, x: 19.5, y: 25,  tipo: 'rampa',    nombre: 'la rampa' }
  },

  /* ---------- Caminos ----------
     Pasillos: solo se escriben los dos puntos (el largo se calcula).
     Escaleras y rampas: se escribe "m" (metros que se caminan) y "rumbo" (hacia dónde mira la persona
     al subir de a hacia b; al bajar se invierte solo).                                           */
  aristas: [
    /* planta baja */
    { a: 'pb-sur',       b: 'pb-aulas' },
    { a: 'pb-aulas',     b: 'pb-cruce-esc' },
    { a: 'pb-cruce-esc', b: 'pb-cruce' },
    { a: 'pb-cruce',     b: 'salida-oeste' },
    { a: 'pb-cruce',     b: 'pb-este' },
    { a: 'pb-este',      b: 'salida-este' },
    { a: 'pb-cruce-esc', b: 'pb-escalera' },
    { a: 'pb-cruce-esc', b: 'pb-rampa' },

    /* primer piso */
    { a: 'p1-sur',       b: 'p1-lab' },
    { a: 'p1-lab',       b: 'p1-cruce-esc' },
    { a: 'p1-cruce-esc', b: 'p1-norte' },
    { a: 'p1-cruce-esc', b: 'p1-escalera' },
    { a: 'p1-cruce-esc', b: 'p1-rampa' },

    /* entre pisos */
    { a: 'pb-escalera', b: 'p1-escalera', tipo: 'escalera', m: 9,  rumbo: 0 },
    { a: 'pb-rampa',    b: 'p1-rampa',    tipo: 'rampa',    m: 24, rumbo: 0 }
  ]
};
