/* =====================================================================================
   MOTOR DE RUTAS  (no hace falta tocar este archivo para cambiar el plano de la escuela)

   Hace tres cosas:
   1) Con el mapa de plantel.js, encuentra la salida más cercana desde un cartel
      (con la opción de evitar escaleras).
   2) Convierte ese camino en indicaciones en español: "Gire a la derecha y avance 15 metros".
   3) Cuenta pasos con el acelerómetro del celular para estimar cuánto ha avanzado la persona.
   ===================================================================================== */
var Motor = (function () {
  'use strict';

  function aArt(t){ return /^el /i.test(t) ? 'al ' + t.slice(3) : 'a ' + t; }
  var ADELANTO = 2;            // las indicaciones se dicen 2 metros antes de llegar al giro

  /* Rumbo en grados: 0 = arriba (norte), 90 = derecha (este), 180 = abajo, 270 = izquierda */
  function rumbo(dx, dy) { return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; }
  /* Giro necesario para pasar del rumbo a al rumbo b, entre -180 y 180 (positivo = a la derecha) */
  function dif(a, b) { return ((((b - a) % 360) + 540) % 360) - 180; }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function metrosTxt(m) { var n = Math.max(1, Math.round(m)); return n + (n === 1 ? ' metro' : ' metros'); }

  /* ---------- 1) Red de puntos y caminos ---------- */
  function construir(P) {
    var ady = {};
    Object.keys(P.nodos).forEach(function (id) { ady[id] = []; });
    P.aristas.forEach(function (e) {
      var A = P.nodos[e.a], B = P.nodos[e.b];
      if (!A || !B) throw new Error('Camino con un punto que no existe: ' + e.a + ' - ' + e.b);
      var tipo = e.tipo || 'pasillo', m, h;
      if (tipo === 'pasillo') {
        if (A.piso !== B.piso) throw new Error('Un pasillo no puede unir dos pisos: ' + e.a + ' - ' + e.b);
        var dx = B.x - A.x, dy = B.y - A.y;
        m = Math.sqrt(dx * dx + dy * dy); h = rumbo(dx, dy);
      } else {
        m = e.m; h = e.rumbo || 0;
      }
      ady[e.a].push({ de: e.a, hacia: e.b, tipo: tipo, m: m, rumbo: h });
      ady[e.b].push({ de: e.b, hacia: e.a, tipo: tipo, m: m, rumbo: (h + 180) % 360 });
    });
    return { P: P, ady: ady };
  }

  /* Camino más corto (Dijkstra) desde "origen" hasta el primer punto que cumpla esMeta */
  function caminoMasCorto(G, origen, esMeta, sinEscaleras) {
    var dist = {}, prev = {}, hecho = {};
    Object.keys(G.ady).forEach(function (id) { dist[id] = Infinity; });
    dist[origen] = 0;
    for (;;) {
      var u = null, mejor = Infinity;
      for (var id in dist) { if (!hecho[id] && dist[id] < mejor) { mejor = dist[id]; u = id; } }
      if (u === null) return null;
      if (esMeta(u)) {
        var camino = [], k = u;
        while (prev[k]) { camino.unshift(prev[k]); k = prev[k].de; }
        return camino;
      }
      hecho[u] = true;
      G.ady[u].forEach(function (e) {
        if (sinEscaleras && e.tipo === 'escalera') return;
        var nd = dist[u] + e.m;
        if (nd < dist[e.hacia]) { dist[e.hacia] = nd; prev[e.hacia] = e; }
      });
    }
  }

  /* ---------- 2) Indicaciones en español ---------- */
  function giroFrase(d, primero) {
    var a = Math.abs(d), lado = d > 0 ? 'derecha' : 'izquierda', h = d > 0 ? 'der' : 'izq';
    if (a < 20) return { frase: '', tit: primero ? 'Camine de frente' : 'Siga de frente', h: 'recto' };
    if (a < 60) return { frase: 'gire un poco a la ' + lado, tit: 'Gire un poco a la ' + lado, h: h };
    if (a < 120) return { frase: 'gire a la ' + lado, tit: 'Gire a la ' + lado, h: h };
    if (a < 160) return { frase: 'gire mucho a la ' + lado, tit: 'Gire mucho a la ' + lado, h: h };
    return { frase: 'dé media vuelta', tit: 'Dé media vuelta', h: 'vuelta' };
  }

  function planear(G, origenId, opc) {
    var P = G.P, sinEsc = !!(opc && opc.sinEscaleras), paso = P.paso_m || 0.7;
    var ini = P.nodos[origenId];
    if (!ini) return { error: 'No conozco ese cartel.' };

    var camino = caminoMasCorto(G, origenId, function (id) { return P.nodos[id].tipo === 'salida'; }, sinEsc);
    if (!camino) camino = caminoMasCorto(G, origenId, function (id) { return P.nodos[id].tipo === 'refugio'; }, sinEsc);
    if (!camino) {
      return { error: sinEsc ? 'Desde este cartel no hay una ruta sin escaleras.' : 'No se encontró una ruta de salida desde este cartel.' };
    }

    /* puntos con su distancia acumulada */
    var puntos = [{ id: origenId, x: ini.x, y: ini.y, piso: ini.piso, d: 0 }], acum = 0;
    camino.forEach(function (e) {
      acum += e.m;
      var N = P.nodos[e.hacia];
      puntos.push({ id: e.hacia, x: N.x, y: N.y, piso: N.piso, d: acum });
    });
    var total = acum;
    var fin = P.nodos[camino.length ? camino[camino.length - 1].hacia : origenId];
    var finId = camino.length ? camino[camino.length - 1].hacia : origenId;

    /* pasos de la ruta: se juntan los pasillos que siguen derecho */
    var pasos = [], i = 0, rumboAct = (ini.mira === undefined ? null : ini.mira), cum = 0;
    while (i < camino.length) {
      var e = camino[i], desde = P.nodos[e.de], hacia = P.nodos[e.hacia];
      if (e.tipo === 'escalera' || e.tipo === 'rampa') {
        var sube = hacia.piso > desde.piso, verbo = sube ? 'Suba' : 'Baje';
        var pisos = Math.abs(hacia.piso - desde.piso), pisosTxt = pisos === 1 ? 'un piso' : pisos + ' pisos';
        var esc = e.tipo === 'escalera';
        pasos.push({
          tipo: e.tipo, ini: cum, fin: cum + e.m, metros: e.m, haptica: 'escalera', nodoFin: e.hacia,
          titulo: verbo + (esc ? ' por la escalera' : ' por la rampa'),
          detalle: esc ? pisosTxt + ' · use el pasamanos' : 'Unos ' + metrosTxt(e.m) + ' · avance despacio',
          texto: verbo + (esc ? ' por la escalera, ' + pisosTxt + ', unos ' + metrosTxt(e.m) + '. Use el pasamanos y no corra.'
                              : ' por la rampa, unos ' + metrosTxt(e.m) + '. Avance despacio.')
        });
        rumboAct = e.rumbo;
        cum += e.m; i++;
        continue;
      }
      /* pasillo: empieza un tramo nuevo */
      var d0 = (rumboAct === null) ? 0 : dif(rumboAct, e.rumbo);
      var primero = pasos.length === 0 && rumboAct !== null;
      var giro = giroFrase(d0, pasos.length === 0);
      var m = e.m, finTramo = e.hacia, j = i + 1;
      rumboAct = e.rumbo;
      while (j < camino.length && camino[j].tipo === 'pasillo' && Math.abs(dif(rumboAct, camino[j].rumbo)) < 20) {
        m += camino[j].m; finTramo = camino[j].hacia; rumboAct = camino[j].rumbo; j++;
      }
      var nombreFin = P.nodos[finTramo].nombre ? ' hasta ' + P.nodos[finTramo].nombre : '';
      var npasos = Math.max(1, Math.round(m / paso));
      var dist = 'avance ' + metrosTxt(m) + ', unos ' + npasos + ' pasos' + nombreFin;
      var previo = primero ? 'Con el cartel de frente' : '';
      var texto;
      if (giro.frase) texto = (previo ? previo + ', ' + giro.frase : cap(giro.frase)) + ' y ' + dist + '.';
      else texto = (previo ? previo + ', ' : 'Siga de frente: ') + dist + '.';
      if (!previo && !giro.frase) texto = cap(dist) + '.';
      pasos.push({
        tipo: 'avanzar', ini: cum, fin: cum + m, metros: m, haptica: giro.h, nodoFin: finTramo,
        titulo: giro.tit,
        detalle: (previo ? previo + '. ' : '') + 'Avance ' + metrosTxt(m) + ' (unos ' + npasos + ' pasos)' + nombreFin,
        texto: cap(texto)
      });
      cum += m; i = j;
    }

    /* llegada */
    var esRefugio = fin.tipo === 'refugio';
    pasos.push({
      tipo: 'llegada', ini: total, fin: total, metros: 0, haptica: 'llegada', nodoFin: finId,
      titulo: esRefugio ? 'Llegó al área de resguardo' : 'Llegó a ' + (fin.nombre || 'la salida'),
      detalle: esRefugio ? 'Espere aquí y avise a un brigadista' : 'Vaya ' + aArt(fin.reunion || 'el punto de reunión'),
      texto: esRefugio
        ? 'Llegó al área de resguardo. Espere aquí y avise a un brigadista. Si nadie llega, llame al ' + P.telefono + ' y diga en qué piso está.'
        : 'Llegó a ' + (fin.nombre || 'la salida') + '. Salga con calma y diríjase ' + (fin.reunion ? aArt(fin.reunion) + ', el punto de reunión' : 'al punto de reunión') + '. Espere indicaciones del personal.'
    });

    return {
      origen: origenId, sinEscaleras: sinEsc, aristas: camino, puntos: puntos, pasos: pasos, total: total,
      destino: { id: finId, nombre: fin.nombre || 'la salida', tipo: fin.tipo, reunion: fin.reunion || '' }
    };
  }

  /* ---------- Posición a lo largo de la ruta ---------- */
  function posEn(plan, d) {
    var pts = plan.puntos;
    d = Math.max(0, Math.min(plan.total, d));
    for (var i = 1; i < pts.length; i++) {
      if (d <= pts[i].d + 1e-9) {
        var A = pts[i - 1], B = pts[i], e = plan.aristas[i - 1];
        var f = (B.d - A.d) > 0 ? (d - A.d) / (B.d - A.d) : 0;
        return {
          x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f,
          piso: (A.piso === B.piso) ? A.piso : (f < 0.5 ? A.piso : B.piso),
          ang: e.rumbo, tipo: e.tipo, tramo: i - 1
        };
      }
    }
    var L = pts[pts.length - 1];
    return { x: L.x, y: L.y, piso: L.piso, ang: plan.aristas.length ? plan.aristas[plan.aristas.length - 1].rumbo : 0, tipo: 'pasillo', tramo: plan.aristas.length - 1 };
  }

  /* Qué indicación toca dar según lo caminado */
  function pasoEn(plan, d) {
    for (var i = plan.pasos.length - 1; i >= 0; i--) {
      var lead = (plan.pasos[i].tipo === 'llegada') ? 0.3 : (i === 0 ? 0 : ADELANTO);
      if (d + lead >= plan.pasos[i].ini) return i;
    }
    return 0;
  }

  /* Si la persona escanea otro cartel: ¿está en su ruta (sigue igual) o hay que calcular otra? */
  function reencaminar(G, plan, nodoId, d, opc) {
    for (var i = 0; i < plan.puntos.length; i++) {
      if (plan.puntos[i].id === nodoId && plan.puntos[i].d >= d - 4) return { tipo: 'misma', d: plan.puntos[i].d };
    }
    return { tipo: 'nueva', plan: planear(G, nodoId, opc) };
  }

  /* ---------- 3) Contador de pasos con el acelerómetro ---------- */
  function detectorPasos(opc) {
    var umbral = (opc && opc.umbral) || 1.3, minMs = (opc && opc.minMs) || 300;
    var g = 9.8, liso = 0, antes = 0, ultimo = -1e9, listo = false;
    return function (ax, ay, az, t) {
      var m = Math.sqrt(ax * ax + ay * ay + az * az);
      if (!listo) { g = m; listo = true; }
      g += (m - g) * 0.02;                // gravedad promedio (cambia despacio)
      liso += ((m - g) - liso) * 0.5;     // quita el ruido
      var paso = (liso > umbral && antes <= umbral && (t - ultimo) > minMs);
      if (paso) ultimo = t;
      antes = liso;
      return paso;
    };
  }

  return { construir: construir, planear: planear, posEn: posEn, pasoEn: pasoEn, reencaminar: reencaminar,
           detectorPasos: detectorPasos, rumbo: rumbo, dif: dif, ADELANTO: ADELANTO };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
