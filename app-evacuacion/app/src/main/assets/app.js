/* =====================================================================================
   LÓGICA DE LA APP: voz, vibración, escáner de QR, seguimiento de pasos y croquis.
   (El mapa está en plantel.js y las rutas se calculan en motor.js.)
   ===================================================================================== */
(function () {
  'use strict';
  var P = PLANTEL, G = Motor.construir(P);
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Ajustes (se guardan en el celular) ---------- */
  var aj = { sinEscaleras: false, voz: true, lenta: false, vibrar: true, grande: false, contraste: false, pasos: false };
  try { var g = JSON.parse(localStorage.getItem('ajustesRuta') || '{}'); for (var k in g) if (k in aj) aj[k] = g[k]; } catch (e) {}
  function guardar() { try { localStorage.setItem('ajustesRuta', JSON.stringify(aj)); } catch (e) {} }
  function pintarAjustes() {
    document.documentElement.classList.toggle('grande', aj.grande);
    document.documentElement.classList.toggle('contraste', aj.contraste);
    [].forEach.call(document.querySelectorAll('[data-aj]'), function (el) { el.checked = !!aj[el.getAttribute('data-aj')]; });
  }

  /* ---------- Estado de la ruta ---------- */
  var S = { plan: null, idx: 0, d: 0, sim: null, detector: null, wake: null, ver: null, px: null };
  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Voz ---------- */
  function elegirVoz() {
    if (!window.speechSynthesis) return null;
    var v = speechSynthesis.getVoices() || [];
    return v.filter(function (x) { return /^es[-_]MX/i.test(x.lang); })[0] || v.filter(function (x) { return /^es/i.test(x.lang); })[0] || null;
  }
  function hablar(texto) {
    if (!aj.voz || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-MX'; u.rate = aj.lenta ? 0.75 : 1; u.pitch = 1; u.volume = 1;
      var v = elegirVoz(); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  /* ---------- Vibración (cada indicación tiene su patrón) ---------- */
  var PATRON = { izq: [110, 90, 110], der: [450], recto: [150], vuelta: [110, 70, 110, 70, 110, 70, 110], escalera: [500, 120, 120], llegada: [200, 100, 200, 100, 200] };
  function vibrar(tipo) { if (aj.vibrar && navigator.vibrate) { try { navigator.vibrate(PATRON[tipo] || [150]); } catch (e) {} } }

  /* ---------- Iconos grandes (flechas) para quien no oye ---------- */
  var ICONOS = {
    recto: '<path d="M50 88V18M24 44L50 18L76 44"/>',
    der: '<path d="M28 88V56Q28 34 50 34H76M58 14L78 34L58 54"/>',
    izq: '<path d="M72 88V56Q72 34 50 34H24M42 14L22 34L42 54"/>',
    vuelta: '<path d="M72 88V36A22 22 0 0 0 28 36V66M13 52L28 70L43 52"/>',
    escalera: '<path d="M12 84H34V62H56V40H78V18H92"/>',
    rampa: '<path d="M10 84L90 30V84Z"/>',
    llegada: '<path d="M18 54L42 78L84 24"/>'
  };
  function icono(paso) {
    var t = paso.tipo === 'rampa' ? 'rampa' : (paso.tipo === 'escalera' ? 'escalera' : (paso.haptica === 'recto' || !ICONOS[paso.haptica] ? 'recto' : paso.haptica));
    $('icono').innerHTML = ICONOS[t];
  }

  /* ---------- Vistas ---------- */
  function ver(v) {
    $('inicio').hidden = v !== 'inicio';
    $('nav').hidden = v !== 'nav';
    S.ver = v;
  }
  function msgInicio(t) { var m = $('msgInicio'); m.textContent = t || ''; m.hidden = !t; }

  /* ---------- Anunciar una indicación (voz + pantalla + vibración) ---------- */
  function mostrarPaso(i) {
    var p = S.plan.pasos[i];
    $('titulo').textContent = p.titulo;
    $('detalle').textContent = p.detalle;
    icono(p);
    return p;
  }
  function anunciar(i, prefijo) {
    var p = mostrarPaso(i);
    hablar(((prefijo ? prefijo.trim() + ' ' : '') + p.texto).replace(/\s+/g, ' '));
    vibrar(p.haptica);
  }
  function introduccion() {
    var pl = S.plan, dst = pl.destino;
    var t = P.precaucion + ' ';
    if (dst.tipo === 'refugio') t += 'No hay una salida sin escaleras cerca. Vaya al área de resguardo. ';
    else t += 'La salida más cercana es ' + dst.nombre + ', a ' + Math.round(pl.total) + ' metros' + (pl.sinEscaleras ? ', sin escaleras' : '') + '. ';
    return t;
  }

  /* ---------- Iniciar o corregir la ruta desde un punto ---------- */
  function iniciar(id) {
    detenerSim();
    var plan = Motor.planear(G, id, { sinEscaleras: aj.sinEscaleras });
    if (plan.error) {
      var t = plan.error + ' Llame al ' + P.telefono + ' o pida ayuda a una persona cercana.';
      msgInicio(t); hablar(t); ver('inicio'); return;
    }
    S.plan = plan; S.idx = 0; S.d = 0; S.px = null;
    msgInicio('');
    ver('nav');
    S.detector = Motor.detectorPasos();
    activarSensor();
    pedirPantalla();
    anunciar(0, introduccion());
    actualizar(true);
    $('titulo').focus();
  }
  function alEscanear(id) {
    if (!S.plan || S.ver !== 'nav') { iniciar(id); return; }
    var r = Motor.reencaminar(G, S.plan, id, S.d, { sinEscaleras: aj.sinEscaleras });
    if (r.tipo === 'misma') {
      S.d = r.d; S.idx = Motor.pasoEn(S.plan, S.d);
      anunciar(S.idx, 'Cartel confirmado. Va por buen camino.');
      actualizar();
    } else if (r.plan && !r.plan.error) {
      S.plan = r.plan; S.idx = 0; S.d = 0; S.px = null;
      anunciar(0, 'Cartel nuevo. Recalculando la ruta. ' + introduccion());
      actualizar(true);
    } else { iniciar(id); }
  }

  /* ---------- Avance ---------- */
  function irA(d) {
    if (!S.plan) return;
    S.d = Math.max(0, Math.min(S.plan.total, d));
    var i = Motor.pasoEn(S.plan, S.d);
    if (i > S.idx) { S.idx = i; anunciar(i); }
    if (S.d >= S.plan.total) detenerSim();
    actualizar();
  }
  function siguiente() {
    if (!S.plan || S.idx >= S.plan.pasos.length - 1) return;
    S.idx++; S.d = Math.max(S.d, S.plan.pasos[S.idx].ini);
    anunciar(S.idx); actualizar();
  }
  function anterior() {
    if (!S.plan || S.idx <= 0) return;
    S.idx--; S.d = S.plan.pasos[S.idx].ini;
    anunciar(S.idx); actualizar();
  }
  function repetir() { if (S.plan) { anunciar(S.idx); } }

  /* ---------- Simulación (para probar sin caminar) ---------- */
  function detenerSim() { if (S.sim) { clearInterval(S.sim); S.sim = null; } $('bSim').textContent = 'Probar recorrido (simulación)'; }
  function simular() {
    if (S.sim) { detenerSim(); return; }
    if (!S.plan) return;
    if (S.d >= S.plan.total) { S.d = 0; S.idx = 0; anunciar(0, introduccion()); }
    $('bSim').textContent = 'Detener simulación';
    S.sim = setInterval(function () { irA(S.d + 0.6); }, 200);
  }

  /* ---------- Contar pasos con el sensor de movimiento ---------- */
  var sensorOk = false;
  function activarSensor() {
    if (!aj.pasos || sensorOk || !window.DeviceMotionEvent) return;
    function poner() { sensorOk = true; window.addEventListener('devicemotion', alMover); }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(function (r) { if (r !== 'denied') poner(); }, function () { poner(); });
      } else poner();
    } catch (e) {}
  }
  function alMover(e) {
    if (!aj.pasos || !S.plan || S.ver !== 'nav' || S.sim || !S.detector) return;
    var a = e.accelerationIncludingGravity; if (!a) return;
    if (S.detector(a.x || 0, a.y || 0, a.z || 0, e.timeStamp || Date.now())) irA(S.d + P.paso_m);
  }
  function pedirPantalla() {
    try { if (navigator.wakeLock && !S.wake) navigator.wakeLock.request('screen').then(function (w) { S.wake = w; w.addEventListener('release', function () { S.wake = null; }); }).catch(function () {}); } catch (e) {}
  }

  /* ---------- Qué dice el QR ---------- */
  function idDeCodigo(texto) {
    var t = String(texto || '').trim(), id = null, m;
    if ((m = t.match(/^cbtis188:(.+)$/i))) id = m[1];
    else if ((m = t.match(/[?&]p=([^&#]+)/))) id = decodeURIComponent(m[1]);
    else if ((m = t.match(/#([^#]+)$/))) id = decodeURIComponent(m[1]);
    else id = t;
    id = (id || '').trim();
    return (P.nodos[id] && P.nodos[id].tipo === 'cartel') ? id : null;
  }

  /* ---------- Escáner con la cámara ---------- */
  var cam = { stream: null, timer: null };
  function msgEsc(t, hablarlo) { $('msgEscaner').textContent = t; if (hablarlo) hablar(t); }
  function cerrarEscaner() {
    if (cam.timer) { clearInterval(cam.timer); cam.timer = null; }
    if (cam.stream) { cam.stream.getTracks().forEach(function (t) { t.stop(); }); cam.stream = null; }
    $('video').srcObject = null; $('escaner').hidden = true;
  }
  function abrirEscaner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var t = 'Aquí no se puede usar la cámara. Elija dónde está en la lista.';
      if (S.ver === 'nav') hablar(t); else msgInicio(t); return;
    }
    $('escaner').hidden = false;
    msgEsc('Apunte la cámara al código QR del cartel.', true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (s) {
      cam.stream = s; var v = $('video'); v.srcObject = s; v.play();
      var c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
      cam.timer = setInterval(function () {
        if (!v.videoWidth) return;
        var w = Math.min(520, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
        c.width = w; c.height = h; x.drawImage(v, 0, 0, w, h);
        var r = jsQR(x.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
        if (!r) return;
        var id = idDeCodigo(r.data);
        if (id) { cerrarEscaner(); vibrar('llegada'); alEscanear(id); }
        else msgEsc('Ese código no es de un cartel del plantel. Pruebe con otro.');
      }, 250);
    }).catch(function () {
      msgEsc('No se pudo usar la cámara. Revise el permiso o cierre esto y elija dónde está en la lista.', true);
    });
  }

  /* ---------- Croquis ---------- */
  function colores() {
    var cs = getComputedStyle(document.documentElement), f = function (n) { return cs.getPropertyValue(n).trim(); };
    return { cuarto: f('--cuarto'), borde: f('--cuarto-borde'), texto: f('--texto'), suave: f('--suave'), ruta: f('--ruta'), salida: f('--salida'), persona: f('--persona'), fondo: f('--tarjeta'), acento: f('--acento'), sobre: f('--sobre-acento') };
  }
  function dibujar() {
    var cv = $('croquis'); if (!S.plan || cv.offsetParent === null) return;
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var K = colores(), pos = Motor.posEn(S.plan, S.d), piso = P.pisos[pos.piso], ed = piso.edificio;
    var m = 8, esc = Math.min((W - 2 * m) / (ed.w + 2), (H - 2 * m) / (ed.h + 2));
    var ox = (W - ed.w * esc) / 2 - ed.x * esc, oy = (H - ed.h * esc) / 2 - ed.y * esc;
    var X = function (x) { return ox + x * esc; }, Y = function (y) { return oy + y * esc; };

    /* edificio y cuartos */
    c.lineWidth = 3; c.strokeStyle = K.borde; c.fillStyle = K.fondo;
    c.fillRect(X(ed.x), Y(ed.y), ed.w * esc, ed.h * esc); c.strokeRect(X(ed.x), Y(ed.y), ed.w * esc, ed.h * esc);
    c.lineWidth = 1.5; c.font = '600 ' + Math.max(9, Math.min(12, esc * 1.1)) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    piso.cuartos.forEach(function (q) {
      c.fillStyle = K.cuarto; c.fillRect(X(q.x), Y(q.y), q.w * esc, q.h * esc); c.strokeRect(X(q.x), Y(q.y), q.w * esc, q.h * esc);
      c.fillStyle = K.suave; c.fillText(q.n, X(q.x + q.w / 2), Y(q.y + q.h / 2));
    });

    /* carteles y salidas de este piso */
    Object.keys(P.nodos).forEach(function (id) {
      var n = P.nodos[id]; if (n.piso !== pos.piso) return;
      if (n.tipo === 'cartel') { c.fillStyle = K.texto; c.fillRect(X(n.x) - 5, Y(n.y) - 5, 10, 10); }
      if (n.tipo === 'salida') {
        c.fillStyle = K.salida; var sx = X(n.x), sy = Y(n.y);
        c.fillRect(sx - 9, sy - 9, 18, 18);
        c.fillStyle = K.sobre; c.font = '700 11px system-ui,sans-serif'; c.fillText('→', sx, sy);
        c.fillStyle = K.salida; c.font = '800 11px system-ui,sans-serif';
        c.fillText('SALIDA', sx, sy + (n.y < ed.y + ed.h / 2 ? 18 : -18));
      }
    });

    /* ruta: línea gruesa con borde y flechitas (se ve sin depender del color) */
    var pts = S.plan.puntos, i;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      c.beginPath(); var abierto = false;
      for (i = 0; i < pts.length; i++) {
        if (pts[i].piso !== pos.piso) { abierto = false; continue; }
        if (!abierto || (i > 0 && pts[i - 1].piso !== pts[i].piso)) { c.moveTo(X(pts[i].x), Y(pts[i].y)); abierto = true; } else c.lineTo(X(pts[i].x), Y(pts[i].y));
      }
      c.setLineDash(pass ? [10, 8] : []); c.lineWidth = pass ? 5 : 9; c.strokeStyle = pass ? K.ruta : K.fondo; c.stroke();
    }
    c.setLineDash([]);

    /* persona vista desde arriba: hombros, cabeza y flecha hacia donde mira */
    var tx = X(pos.x), ty = Y(pos.y);
    if (S.px === null || reducir) S.px = { x: tx, y: ty, a: pos.ang };
    S.px.x += (tx - S.px.x) * 0.25; S.px.y += (ty - S.px.y) * 0.25;
    var da = Motor.dif(S.px.a, pos.ang); S.px.a += da * 0.3;
    c.save(); c.translate(S.px.x, S.px.y); c.rotate(S.px.a * Math.PI / 180);
    c.fillStyle = K.fondo; c.beginPath(); c.arc(0, 0, 19, 0, 7); c.fill();
    c.fillStyle = K.persona; c.beginPath(); c.ellipse(0, 2, 15, 7, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
    c.beginPath(); c.moveTo(0, -25); c.lineTo(9, -13); c.lineTo(-9, -13); c.closePath(); c.fill();
    c.restore();
    if (Math.abs(S.px.x - tx) > 0.5 || Math.abs(S.px.y - ty) > 0.5 || Math.abs(da) > 1) requestAnimationFrame(dibujar);

    /* etiqueta de piso */
    c.font = '800 13px system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    var tp = piso.nombre, tw = c.measureText(tp).width + 16;
    c.fillStyle = K.acento; c.fillRect(8, 8, tw, 26); c.fillStyle = K.sobre; c.fillText(tp, 16, 14);
  }
  function actualizar(forzar) {
    if (!S.plan) return;
    var falta = Math.max(0, S.plan.total - S.d), pos = Motor.posEn(S.plan, S.d);
    $('falta').textContent = falta < 0.5 ? 'Llegó' : 'Faltan ' + Math.round(falta) + ' m · unos ' + Math.round(falta / P.paso_m) + ' pasos';
    $('piso').textContent = P.pisos[pos.piso].nombre;
    $('bAnt').disabled = S.idx <= 0; $('bSig').disabled = S.idx >= S.plan.pasos.length - 1;
    $('croquis').setAttribute('aria-label', 'Croquis. ' + P.pisos[pos.piso].nombre + '. ' + (falta < 0.5 ? 'Llegó a la salida.' : 'Faltan ' + Math.round(falta) + ' metros.'));
    dibujar();
  }

  /* ---------- Botones ---------- */
  function alternarAjustes(abrir) {
    var a = $('ajustes'); a.hidden = !abrir; $('bAjustes').setAttribute('aria-expanded', String(abrir));
    if (abrir) a.scrollIntoView({ block: 'start' });
  }
  $('bAjustes').onclick = function () { alternarAjustes($('ajustes').hidden); };
  $('bCerrarAjustes').onclick = function () { alternarAjustes(false); $('bAjustes').focus(); };
  [].forEach.call(document.querySelectorAll('[data-aj]'), function (el) {
    el.onchange = function () {
      var k = el.getAttribute('data-aj'); aj[k] = el.checked; guardar(); pintarAjustes();
      if (k === 'pasos' && aj.pasos) activarSensor();
      if (k === 'sinEscaleras' && S.plan && S.ver === 'nav') {
        /* recalcula desde el último punto por el que ya pasó */
        var ult = S.plan.puntos[0].id;
        S.plan.puntos.forEach(function (p) { if (p.d <= S.d + 0.01) ult = p.id; });
        iniciar(ult);
      }
    };
  });
  $('bEscanear').onclick = abrirEscaner;
  $('bOtro').onclick = abrirEscaner;
  $('bCerrarEscaner').onclick = cerrarEscaner;
  $('bLista').onclick = function () { iniciar($('selLugar').value); };
  $('bSig').onclick = siguiente; $('bAnt').onclick = anterior; $('bRep').onclick = repetir;
  $('bSim').onclick = simular;
  $('bFin').onclick = function () { detenerSim(); if (window.speechSynthesis) speechSynthesis.cancel(); S.plan = null; ver('inicio'); };
  window.addEventListener('resize', function () { dibujar(); });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { dibujar(); });
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = function () {};

  /* ---------- Arranque ---------- */
  var sel = $('selLugar');
  Object.keys(P.nodos).forEach(function (id) {
    var n = P.nodos[id]; if (n.tipo !== 'cartel') return;
    var o = document.createElement('option'); o.value = id; o.textContent = n.lugar || id; sel.appendChild(o);
  });
  $('aviso').textContent = P.aviso;
  pintarAjustes();
  ver('inicio');

  /* Si la página se abre con un enlace de cartel (#id o ?p=id) empieza sola */
  var inicial = idDeCodigo(location.search + location.hash) || idDeCodigo(location.hash.replace(/^#/, ''));
  if (inicial) { sel.value = inicial; iniciar(inicial); }

  /* Para pruebas en navegador */
  window.__app = { iniciar: iniciar, S: S, idDeCodigo: idDeCodigo, aj: aj };
})();
