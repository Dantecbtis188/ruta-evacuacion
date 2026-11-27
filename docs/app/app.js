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
  var S = { plan: null, idx: 0, d: 0, sim: null, detector: null, wake: null, ver: null, px: null, cam: null };
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
    S.plan = plan; S.idx = 0; S.d = 0; S.px = null; S.cam = null;
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
      S.plan = r.plan; S.idx = 0; S.d = 0; S.px = null; S.cam = null;
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
    function dec(x) { try { return decodeURIComponent(x); } catch (e) { return x; } }
    if ((m = t.match(/^cbtis188:(?:\/\/cartel\/|\/\/)?([^?#\s]+)/i))) id = dec(m[1]);          // cbtis188:ID  o  cbtis188://cartel/ID
    else if ((m = t.match(/[?&](?:c|p)=([^&#]+)/))) id = dec(m[1]);                              // ...?c=ID  (enlace del QR)  o  ?p=ID
    else if ((m = t.match(/#([^#]+)$/))) id = dec(m[1]);                                          // ...#ID
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

  /* ---------- Croquis: foto aérea + ruta + monito caminando ---------- */
  var E = P.escala || 0.1;                       // metros por pixel de la foto
  var FOTO = new Image(), fotoLista = false;
  FOTO.onload = function () { fotoLista = true; dibujar(); };
  FOTO.src = P.pisos[0].foto;
  function colores() {
    var cs = getComputedStyle(document.documentElement), f = function (n) { return cs.getPropertyValue(n).trim(); };
    return { texto: f('--texto'), ruta: f('--ruta'), salida: f('--salida'), persona: f('--persona'), fondo: f('--tarjeta'), acento: f('--acento'), sobre: f('--sobre-acento'), foco: f('--foco') };
  }
  /* texto con borde para que se lea sobre la foto */
  function rotulo(c, t, x, y, K, fuente) {
    c.font = fuente; c.lineWidth = 5; c.strokeStyle = K.fondo; c.strokeText(t, x, y); c.fillStyle = K.texto; c.fillText(t, x, y);
  }
  /* El monito visto desde arriba: hombros, brazos y pies que se mueven al caminar. Mira hacia "arriba" (se gira antes). */
  function monito(c, K, fase, caminando) {
    var sw = caminando ? Math.sin(fase) : 0;
    c.fillStyle = K.fondo; c.beginPath(); c.arc(0, 0, 25, 0, 7); c.fill();           // halo para que destaque sobre la foto
    c.strokeStyle = K.persona; c.lineCap = 'round';
    c.lineWidth = 6; c.beginPath(); c.moveTo(-8, -sw * 9 + 6); c.lineTo(-8, -sw * 9 - 4); c.moveTo(8, sw * 9 + 6); c.lineTo(8, sw * 9 - 4); c.stroke();   // piernas
    c.lineWidth = 5; c.beginPath(); c.moveTo(-13, 0); c.lineTo(-17, sw * 9); c.moveTo(13, 0); c.lineTo(17, -sw * 9); c.stroke();                         // brazos
    c.fillStyle = K.persona; c.beginPath(); c.ellipse(0, 0, 13, 8, 0, 0, 7); c.fill();                                                                // hombros
    c.fillStyle = K.fondo; c.beginPath(); c.arc(0, -1, 7.5, 0, 7); c.fill();
    c.fillStyle = K.persona; c.beginPath(); c.arc(0, -1, 6, 0, 7); c.fill();                                                                           // cabeza
    c.beginPath(); c.moveTo(0, -36); c.lineTo(8, -26); c.lineTo(-8, -26); c.closePath(); c.fill();                                                    // flecha: hacia dónde va
  }
  function dibujar() {
    var cv = $('croquis'); if (!S.plan || cv.offsetParent === null) return;
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var K = colores(), pos = Motor.posEn(S.plan, S.d), fw = P.pisos[0].w, fh = P.pisos[0].h;
    var px = pos.x / E, py = pos.y / E, dst = P.nodos[S.plan.destino.id], ex = dst.px, ey = dst.py;

    /* cámara: encuadra al monito y a la salida (y lo que queda de la ruta) */
    var x0 = Math.min(px, ex), x1 = Math.max(px, ex), y0 = Math.min(py, ey), y1 = Math.max(py, ey);
    S.plan.puntos.forEach(function (q) { if (q.d >= S.d) { x0 = Math.min(x0, q.x / E); x1 = Math.max(x1, q.x / E); y0 = Math.min(y0, q.y / E); y1 = Math.max(y1, q.y / E); } });
    var mg = 110, bw = Math.max(x1 - x0 + 2 * mg, 260), bh = Math.max(y1 - y0 + 2 * mg, 260);
    var tesc = Math.max(0.2, Math.min(W / bw, H / bh, 0.9)), tcx = (x0 + x1) / 2, tcy = (y0 + y1) / 2;
    var cam = S.cam;
    if (!cam || reducir) cam = S.cam = { s: tesc, x: tcx, y: tcy };
    cam.s += (tesc - cam.s) * 0.15; cam.x += (tcx - cam.x) * 0.15; cam.y += (tcy - cam.y) * 0.15;
    var X = function (u) { return W / 2 + (u - cam.x) * cam.s; }, Y = function (v) { return H / 2 + (v - cam.y) * cam.s; };
    var cambia = Math.abs(tesc - cam.s) > 0.002 || Math.abs(tcx - cam.x) > 0.6 || Math.abs(tcy - cam.y) > 0.6;

    /* foto */
    c.fillStyle = K.fondo; c.fillRect(0, 0, W, H);
    if (fotoLista) c.drawImage(FOTO, X(0), Y(0), fw * cam.s, fh * cam.s);

    /* ruta: lo que ya caminó (delgado, gris) y lo que falta (grueso, punteado, con flechitas) */
    var pts = S.plan.puntos, falta = [[px, py]], hecha = [pts[0]], i;
    for (i = 0; i < pts.length; i++) { if (pts[i].d > S.d + 1e-6) falta.push([pts[i].x / E, pts[i].y / E]); else hecha.push(pts[i]); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (S.d > 0.5) {
      c.beginPath(); c.moveTo(X(pts[0].x / E), Y(pts[0].y / E));
      for (i = 1; i < pts.length && pts[i].d <= S.d; i++) c.lineTo(X(pts[i].x / E), Y(pts[i].y / E));
      c.lineTo(X(px), Y(py)); c.lineWidth = 4; c.strokeStyle = K.fondo; c.globalAlpha = .7; c.stroke(); c.globalAlpha = 1;
    }
    c.beginPath(); falta.forEach(function (q, k) { if (k) c.lineTo(X(q[0]), Y(q[1])); else c.moveTo(X(q[0]), Y(q[1])); });
    c.setLineDash([]); c.lineWidth = 11; c.strokeStyle = K.fondo; c.stroke();
    c.setLineDash([14, 10]); c.lineWidth = 6; c.strokeStyle = K.ruta; c.lineDashOffset = -(S.d / E * cam.s); c.stroke(); c.setLineDash([]);

    /* salidas: la destino grande y con nombre; las otras chicas */
    c.textAlign = 'center'; c.textBaseline = 'middle';
    Object.keys(P.nodos).forEach(function (id) {
      var n = P.nodos[id]; if (n.tipo !== 'salida') return;
      var sx = X(n.px), sy = Y(n.py), es = (id === S.plan.destino.id);
      c.fillStyle = es ? K.salida : K.fondo; c.strokeStyle = es ? K.fondo : K.salida; c.lineWidth = es ? 4 : 3;
      var r = es ? 17 : 8; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); c.stroke();
      if (es) {
        if (!reducir) { var t = (Date.now() % 1400) / 1400; c.globalAlpha = 1 - t; c.strokeStyle = K.salida; c.lineWidth = 4; c.beginPath(); c.arc(sx, sy, 17 + t * 22, 0, 7); c.stroke(); c.globalAlpha = 1; }
        c.fillStyle = K.sobre; c.font = '800 20px system-ui,sans-serif'; c.fillText('➜', sx, sy + 1);
        var nom = 'SALIDA: ' + n.nombre.replace(/^(la|el) /, '');
        rotulo(c, nom.toUpperCase(), Math.max(70, Math.min(W - 70, sx)), sy - 32 < 16 ? sy + 34 : sy - 32, K, '800 12px system-ui,sans-serif');
      }
    });
    /* el cartel donde empezó */
    var o = P.nodos[S.plan.origen];
    if (o && o.tipo === 'cartel') { c.fillStyle = K.texto; c.strokeStyle = K.fondo; c.lineWidth = 3; c.beginPath(); c.rect(X(o.px) - 7, Y(o.py) - 7, 14, 14); c.fill(); c.stroke(); }

    /* monito: se mueve suave hacia su lugar y camina (pies y brazos) mientras avanza */
    var tx = X(px), ty = Y(py);
    if (!S.px || reducir) S.px = { x: tx, y: ty, a: pos.ang, f: 0 };
    var mx = tx - S.px.x, my = ty - S.px.y, mov = Math.hypot(mx, my);
    S.px.x += mx * 0.3; S.px.y += my * 0.3;
    var da = Motor.dif(S.px.a, pos.ang); S.px.a += da * 0.3;
    var caminando = (mov > 0.4) || (S.sim && S.d < S.plan.total);
    if (caminando) S.px.f += Math.max(mov * 0.5, 0.18);
    c.save(); c.translate(S.px.x, S.px.y); c.rotate(S.px.a * Math.PI / 180); monito(c, K, S.px.f, caminando); c.restore();

    /* etiqueta de piso: solo si hay varios pisos */
    if (Object.keys(P.pisos).length > 1) {
      c.font = '800 13px system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
      var tp = P.pisos[pos.piso].nombre, tw = c.measureText(tp).width + 16;
      c.fillStyle = K.acento; c.fillRect(8, 8, tw, 26); c.fillStyle = K.sobre; c.fillText(tp, 16, 14);
    }
    if (mov > 0.4 || cambia || (!reducir && S.d < S.plan.total) || Math.abs(da) > 1) requestAnimationFrame(dibujar);
  }
  function actualizar(forzar) {
    if (!S.plan) return;
    var falta = Math.max(0, S.plan.total - S.d), pos = Motor.posEn(S.plan, S.d);
    $('falta').textContent = falta < 0.5 ? 'Llegó' : 'Faltan ' + Math.round(falta) + ' m · unos ' + Math.round(falta / P.paso_m) + ' pasos';
    $('piso').textContent = Object.keys(P.pisos).length > 1 ? P.pisos[pos.piso].nombre : 'Salida: ' + S.plan.destino.nombre.replace(/^(la|el) /, '');
    $('bAnt').disabled = S.idx <= 0; $('bSig').disabled = S.idx >= S.plan.pasos.length - 1;
    $('croquis').setAttribute('aria-label', 'Croquis del plantel. Va hacia ' + S.plan.destino.nombre + '. ' + (falta < 0.5 ? 'Ya llegó.' : 'Faltan ' + Math.round(falta) + ' metros.'));
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
  /* Si la app ya estaba abierta y escanean otro cartel (con la cámara del celular), llega un nuevo #cartel */
  window.addEventListener('hashchange', function () {
    var id = idDeCodigo(location.hash.replace(/^#/, ''));
    if (id) { $('selLugar').value = id; alEscanear(id); }
  });
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
  var inicial = idDeCodigo(location.search) || idDeCodigo(location.hash) || idDeCodigo(location.hash.replace(/^#/, ''));
  if (inicial) { sel.value = inicial; iniciar(inicial); }

  /* Para pruebas en navegador */
  window.__app = { iniciar: iniciar, S: S, idDeCodigo: idDeCodigo, aj: aj };
})();
