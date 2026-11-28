/* =====================================================================================
   LÓGICA DE LA APP. Todo es automático: al abrirse con el enlace del QR de un cartel,
   calcula la salida más cercana y la va diciendo en voz alta, con el monito caminando.
   Los únicos botones son los de llamar al 911.
   (El mapa está en plantel.js y las rutas se calculan en motor.js.)
   ===================================================================================== */
(function () {
  'use strict';
  var P = PLANTEL, G = Motor.construir(P);
  var $ = function (id) { return document.getElementById(id); };
  var nativo = !!window.AndroidVoz;          // dentro de la app Android: voz y vibración del propio teléfono

  /* Ajustes fijos (sin botones). Letra grande, modo oscuro y animaciones se toman del propio teléfono. */
  var aj = { voz: true, lenta: false, vibrar: true };
  var VEL = 1.1;                             // metros por segundo que se suponen al caminar (solo si el teléfono no cuenta pasos)

  var S = { plan: null, idx: 0, d: 0, sim: false, detector: null, wake: null, ver: null, px: null, cam: null,
            sensorVivo: false, t0: 0, tAviso: 0, tUlt: 0, demo: false };
  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Voz ---------- */
  function elegirVoz() {
    if (!window.speechSynthesis) return null;
    var v = speechSynthesis.getVoices() || [];
    return v.filter(function (x) { return /^es[-_]MX/i.test(x.lang); })[0] || v.filter(function (x) { return /^es/i.test(x.lang); })[0] || null;
  }
  function hablar(texto) {
    if (!aj.voz) return;
    S.ultTexto = texto; S.tAviso = Date.now();
    try {
      if (nativo) { window.AndroidVoz.hablar(texto, !!aj.lenta); return; }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-MX'; u.rate = aj.lenta ? 0.75 : 1; u.pitch = 1; u.volume = 1;
      var v = elegirVoz(); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  /* ---------- Vibración (cada indicación tiene su patrón) ---------- */
  var PATRON = { izq: [0, 110, 90, 110], der: [0, 450], recto: [0, 150], vuelta: [0, 110, 70, 110, 70, 110, 70, 110], escalera: [0, 500, 120, 120], llegada: [0, 200, 100, 200, 100, 200] };
  function vibrar(tipo) {
    if (!aj.vibrar) return;
    var pat = PATRON[tipo] || [0, 150];
    try {
      if (nativo) window.AndroidVoz.vibrar(JSON.stringify(pat));
      else if (navigator.vibrate) navigator.vibrate(pat.slice(1));
    } catch (e) {}
  }

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
  function ver(v) { $('inicio').hidden = v !== 'inicio'; $('nav').hidden = v !== 'nav'; S.ver = v; }

  /* ---------- Anunciar una indicación (voz + pantalla + vibración) ---------- */
  function mostrarPaso(i) {
    var p = S.plan.pasos[i];
    $('titulo').textContent = p.titulo; $('detalle').textContent = p.detalle; icono(p);
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
    else t += 'La salida más cercana es ' + dst.nombre + ', a ' + Math.round(pl.total) + ' metros. ';
    return t;
  }

  /* ---------- Iniciar o corregir la ruta desde un cartel ---------- */
  function iniciar(id) {
    var plan = Motor.planear(G, id, { sinEscaleras: false });
    if (plan.error) {
      var t = plan.error + ' Llame al ' + P.telefono + ' o pida ayuda a una persona cercana.';
      $('msgInicio').textContent = t; ver('inicio'); hablar(t); return;
    }
    S.plan = plan; S.idx = 0; S.d = 0; S.px = null; S.cam = null; S.t0 = Date.now(); S.tUlt = Date.now();
    ver('nav');
    S.detector = Motor.detectorPasos();
    activarSensor(); pedirPantalla();
    anunciar(0, introduccion());
    actualizar(true);
  }
  function alEscanear(id) {
    if (!S.plan || S.ver !== 'nav') { iniciar(id); return; }
    var r = Motor.reencaminar(G, S.plan, id, S.d, { sinEscaleras: false });
    if (r.tipo === 'misma') {
      S.d = r.d; S.idx = Motor.pasoEn(S.plan, S.d);
      anunciar(S.idx, 'Cartel confirmado. Va por buen camino.');
      actualizar();
    } else if (r.plan && !r.plan.error) {
      S.plan = r.plan; S.idx = 0; S.d = 0; S.px = null; S.cam = null; S.t0 = Date.now();
      anunciar(0, 'Cartel nuevo. Recalculando la ruta. ' + introduccion());
      actualizar(true);
    } else { iniciar(id); }
  }

  /* ---------- Avance automático ---------- */
  function irA(d) {
    if (!S.plan) return;
    var antes = S.d;
    S.d = Math.max(0, Math.min(S.plan.total, d));
    if (S.d > antes + 1e-6) S.tUlt = Date.now();
    var i = Motor.pasoEn(S.plan, S.d);
    if (i > S.idx) { S.idx = i; anunciar(i); }
    actualizar();
  }
  /* Cada medio segundo: repite la indicación si la persona lleva rato sin avanzar.
     Solo en modo demostración (?demo=1) el monito camina solo por reloj; en uso real SOLO avanza con los pasos de la persona. */
  var tAnt = Date.now();
  setInterval(function () {
    var ahora = Date.now(), dt = (ahora - tAnt) / 1000; tAnt = ahora;
    if (!S.plan || S.ver !== 'nav') return;
    var llego = S.d >= S.plan.total - 1e-6;
    S.sim = S.demo && !llego;
    if (S.demo && !llego) irA(S.d + VEL * dt);
    else if (!llego && ahora - S.tAviso > 25000 && ahora - S.tUlt > 25000) anunciar(S.idx);
  }, 500);

  /* ---------- Contar pasos con el sensor de movimiento ---------- */
  var sensorOk = false;
  function nuevoDato(x, y, z, t) {
    S.sensorVivo = true;
    if (!S.plan || S.ver !== 'nav' || S.demo || !S.detector) return;
    if (S.detector(x || 0, y || 0, z || 0, t || Date.now())) irA(S.d + P.paso_m);
  }
  /* Dentro de la app Android, el propio teléfono manda el acelerómetro (el navegador interno no lo deja pasar) */
  window.__acc = function (x, y, z, t) { nuevoDato(x, y, z, t); };
  function activarSensor() {
    if (nativo || sensorOk || !window.DeviceMotionEvent) return;
    function poner() { sensorOk = true; window.addEventListener('devicemotion', alMover); }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(function (r) { if (r !== 'denied') poner(); }, function () { poner(); });
      } else poner();
    } catch (e) {}
  }
  function alMover(e) {
    var a = e.accelerationIncludingGravity; if (!a || (a.x == null && a.y == null && a.z == null)) return;
    nuevoDato(a.x, a.y, a.z, e.timeStamp);
  }
  function pedirPantalla() {
    try { if (navigator.wakeLock && !S.wake) navigator.wakeLock.request('screen').then(function (w) { S.wake = w; w.addEventListener('release', function () { S.wake = null; }); }).catch(function () {}); } catch (e) {}
  }

  /* ---------- Qué cartel dice el enlace ---------- */
  function idDeCodigo(texto) {
    var t = String(texto || '').trim(), id = null, m;
    function dec(x) { try { return decodeURIComponent(x); } catch (e) { return x; } }
    if ((m = t.match(/^cbtis188:(?:\/\/cartel\/|\/\/)?([^?#\s]+)/i))) id = dec(m[1]);
    else if ((m = t.match(/[?&](?:c|p)=([^&#]+)/))) id = dec(m[1]);
    else if ((m = t.match(/#([^#]+)$/))) id = dec(m[1]);
    else id = t;
    id = (id || '').trim();
    return (P.nodos[id] && P.nodos[id].tipo === 'cartel') ? id : null;
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
  /* El monito visto desde arriba: hombros, cabeza y dos pies que se turnan al caminar. Mira hacia "arriba" (se gira antes). */
  function monito(c, K, fase, caminando) {
    var sw = caminando ? Math.sin(fase) : 0;
    c.fillStyle = K.fondo; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill();                  // halo para que destaque sobre la foto
    c.fillStyle = K.persona;
    c.beginPath(); c.ellipse(-6, 10 - sw * 6, 4.5, 7, 0, 0, 7); c.fill();                      // pie izquierdo
    c.beginPath(); c.ellipse(6, 10 + sw * 6, 4.5, 7, 0, 0, 7); c.fill();                       // pie derecho
    c.beginPath(); c.ellipse(0, 0, 14, 7, 0, 0, 7); c.fill();                                  // hombros
    c.fillStyle = K.fondo; c.beginPath(); c.arc(0, -1, 8, 0, 7); c.fill();
    c.fillStyle = K.persona; c.beginPath(); c.arc(0, -1, 6.5, 0, 7); c.fill();                 // cabeza
    c.beginPath(); c.moveTo(0, -36); c.lineTo(8, -26); c.lineTo(-8, -26); c.closePath(); c.fill(); // flecha: hacia dónde va
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
    $('croquis').setAttribute('aria-label', 'Croquis del plantel. Va hacia ' + S.plan.destino.nombre + '. ' + (falta < 0.5 ? 'Ya llegó.' : 'Faltan ' + Math.round(falta) + ' metros.'));
    dibujar();
  }

  /* ---------- Arranque ---------- */
  $('aviso').textContent = P.aviso;
  window.addEventListener('resize', function () { dibujar(); });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { dibujar(); }); }

  /* Si la app ya estaba abierta y escanean otro cartel (con la cámara del celular), llega un nuevo #cartel */
  window.addEventListener('hashchange', function () {
    var id = idDeCodigo(location.hash.replace(/^#/, ''));
    if (id) alEscanear(id);
  });

  /* En el navegador (no en la app) el teléfono exige un toque antes de dejar hablar: con tocar la pantalla una vez, empieza la voz */
  if (!nativo) {
    $('toque').hidden = false;
    document.addEventListener('pointerdown', function once() {
      document.removeEventListener('pointerdown', once);
      $('toque').hidden = true;
      if (S.plan) { anunciar(S.idx, S.d < 0.5 ? introduccion() : ''); } else hablar($('msgInicio').textContent);
    });
  }

  S.demo = /[?&]demo=1/.test(location.search + location.hash);
  var inicial = idDeCodigo(location.search) || idDeCodigo(location.hash) || idDeCodigo(location.hash.replace(/^#/, ''));
  ver('inicio');
  if (inicial) iniciar(inicial);
  else { $('msgInicio').textContent = 'Escanee el código QR de un cartel de evacuación con la cámara de su celular. La app le dirá en voz alta cómo llegar a la salida más cercana.'; hablar($('msgInicio').textContent); }

  /* Para pruebas */
  window.__app = { iniciar: iniciar, S: S, idDeCodigo: idDeCodigo, aj: aj };
})();
