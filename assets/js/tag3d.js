/* ============================================================
   PetFind — real 3D paw tag (Three.js)
   Extruded, bevel-rounded paw -- the same paw the scroll trail walks
   (assets/js/pawtrail.js): 4 separate toe pads + a rounded-triangle
   heel, matte white with soft studio lighting. The heel carries the
   logo on the front and the QR on the back. Drag to rotate; gentle
   idle spin. Falls back to a static SVG paw if WebGL/Three is
   unavailable.
   ============================================================ */
(function (global) {
  'use strict';
  var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* The trail's paw, in its 100x100 box with y pointing down. K scales it
     into model units (and y is flipped) so it stands upright around (50,50). */
  var K = 1.95;
  var TOES = [[15, 41, 10.5, 13.5, -32], [36.5, 19, 11.5, 15, -10], [63.5, 19, 11.5, 15, 10], [85, 41, 10.5, 13.5, 32]]; // cx, cy, rx, ry, deg
  var HEEL = 'M50 45C61 45 69 54 75 64C81 74 87 84 80 92C74 98 66 92 58 93C53 94 47 94 42 93C34 92 26 98 20 92C13 84 19 74 25 64C31 54 39 45 50 45Z';
  var HX = 13, HY = 45, HW = 74, HH = 51;          // box around the heel, in paw units

  /* ---------- textures drawn on canvas ---------- */
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* The back carries the QR from Luna's printed demo card, drawn the same way
     as the card itself (composeQR in create.js): level-H code with the teal
     paw badge in the middle. */
  var DEMO_URL = 'https://genuine-melba-2e9324.netlify.app/';
  function drawQRBadge(ctx, cx, cy, area) {
    var ls = area * 0.19, halo = ls * 1.26, rr = ls * 0.10;
    // clear the modules around the badge (the card paints this white; here the
    // tag's own surface shows through, so there's no white square edge)
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    roundRect(ctx, cx - halo / 2, cy - halo / 2, halo, halo, area * 0.029); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0F766E'; roundRect(ctx, cx - ls / 2, cy - ls / 2, ls, ls, ls * 0.26); ctx.fill();
    ctx.fillStyle = '#ffffff';
    function dot(dx, dy, s) { ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, s, s * 1.15, 0, 0, 7); ctx.fill(); }
    dot(-rr * 1.15, -rr * 1.9, rr * 0.62); dot(rr * 1.15, -rr * 1.9, rr * 0.62);
    dot(-rr * 2.0, -rr * 0.2, rr * 0.6); dot(rr * 2.0, -rr * 0.2, rr * 0.6);
    ctx.beginPath(); ctx.ellipse(cx, cy + rr * 0.7, rr * 1.5, rr * 1.7, 0, 0, 7); ctx.fill();
  }

  function drawPawGlyph(ctx, cx, cy, s, color) {
    // the logo paw (assets/img/favicon.svg): 4 toes + heel, about 1.7·s px
    // across, centred at cx,cy
    var k = s * 1.7 / 100;
    ctx.save();
    ctx.translate(cx - 50 * k, cy - 50 * k); ctx.scale(k, k);
    ctx.fillStyle = color;
    TOES.forEach(function (t) { ctx.beginPath(); ctx.ellipse(t[0], t[1], t[2], t[3], t[4] * Math.PI / 180, 0, 7); ctx.fill(); });
    ctx.fill(new Path2D(HEEL));
    ctx.restore();
  }

  /* A transparent canvas over the heel's box (10px per paw unit); what's drawn
     on it is printed straight onto the heel, with no backing panel whose edge
     would show. Callers draw in canvas px: paw (x, y) -> ((x-HX)*10, (y-HY)*10). */
  function heelCanvas() {
    var c = document.createElement('canvas'); c.width = HW * 10; c.height = HH * 10;
    return c;
  }

  function makeLogoTexture() {
    var c = heelCanvas(), ctx = c.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      drawPawGlyph(ctx, 370, 140, 95, '#C6382D');
      ctx.fillStyle = '#22333b';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 100px Lora, Georgia, "Times New Roman", serif';
      ctx.fillText('PetFind', 370, 338);
    }
    draw();
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); tex.needsUpdate = true; });
    return tex;
  }

  function makeQRTexture() {
    var c = heelCanvas(), ctx = c.getContext('2d');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0F766E'; ctx.font = '800 40px -apple-system,Segoe UI,Roboto,Arial';
    ctx.fillText('PetFind', 370, 80);
    ctx.fillStyle = '#0F1B1A'; ctx.font = '800 25px -apple-system,Segoe UI,Roboto,Arial';
    ctx.fillText('Scan to meet Luna', 370, 125);
    // QR in the wide lower part of the heel
    if (typeof qrcode !== 'undefined') {
      var qr = qrcode(0, 'H'); qr.addData(DEMO_URL); qr.make();
      var n = qr.getModuleCount(), area = 260, qx = 370 - area / 2, qy = 165, cell = area / n;
      ctx.fillStyle = '#0B5651';
      for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col))
        ctx.fillRect(Math.floor(qx + col * cell), Math.floor(qy + r * cell), Math.ceil(cell), Math.ceil(cell));
      drawQRBadge(ctx, 370, qy + area / 2, area);
    }
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    return tex;
  }

  /* ---------- geometry ---------- */
  function ellipseShape(rx, ry) { var s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0); return s; }
  function heelShape() {
    // the trail's heel path (one M, then C curves), mapped into model units
    var n = HEEL.match(/\d+(\.\d+)?/g).map(Number), s = new THREE.Shape();
    function X(i) { return (n[i] - 50) * K; }
    function Y(i) { return (50 - n[i + 1]) * K; }
    s.moveTo(X(0), Y(0));
    for (var i = 2; i + 5 < n.length; i += 6) s.bezierCurveTo(X(i), Y(i), X(i + 2), Y(i + 2), X(i + 4), Y(i + 4));
    return s;
  }

  function init(stage) {
    if (!global.THREE) return false;
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) { W = 340; H = 340; }
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
    camera.position.set(0, 0, 8);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6da, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(-3, 8, 6); scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.30); fill.position.set(5, -1, 5); scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffffff, 0.28); rim.position.set(2, 4, -6); scene.add(rim);

    var tag = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: 0xf4f5f5, roughness: 0.9, metalness: 0.0 });
    var depth = 20, bevel = 2.6;
    var opts = { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 48 };

    // Measure the actual extruded z-range (bevel makes it non-obvious) and
    // centre every part on it so the tag is symmetric and rotates evenly.
    var probe = new THREE.ExtrudeGeometry(heelShape(), opts); probe.computeBoundingBox();
    var zMin = probe.boundingBox.min.z, zMax = probe.boundingBox.max.z, zMid = (zMin + zMax) / 2;
    var capF = zMax - zMid, capB = zMin - zMid; // front / back caps after centring

    function addPart(shape, x, y, rotZ) {
      var g = new THREE.ExtrudeGeometry(shape, opts);
      g.translate(0, 0, -zMid);
      var m = new THREE.Mesh(g, mat);
      m.position.set(x, y, 0); m.rotation.z = rotZ || 0;
      tag.add(m); return g;
    }
    // 4 separate toe pads + heel. SVG angles turn clockwise and Three's
    // counter-clockwise, hence the minus.
    TOES.forEach(function (t) {
      addPart(ellipseShape(t[2] * K, t[3] * K), (t[0] - 50) * K, (50 - t[1]) * K, THREE.MathUtils.degToRad(-t[4]));
    });
    addPart(heelShape(), 0, 0, 0);

    // logo + QR printed over the heel, placed just proud of the real caps (proper occlusion)
    var planeW = HW * K, planeH = HH * K, planeY = (50 - (HY + HH / 2)) * K, off = 1.2;
    var logoMat = new THREE.MeshBasicMaterial({ map: makeLogoTexture(), transparent: true, depthWrite: false });
    var logo = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), logoMat);
    logo.position.set(0, planeY, capF + off); logo.renderOrder = 4; tag.add(logo);
    var qrMat = new THREE.MeshBasicMaterial({ map: makeQRTexture(), transparent: true, depthWrite: false });
    var qr = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), qrMat);
    qr.position.set(0, planeY, capB - off); qr.rotation.y = Math.PI; qr.renderOrder = 4; tag.add(qr);
    global.__pt = { capF: capF, capB: capB, tag: tag, logo: logo, qr: qr };

    tag.scale.setScalar(0.019);
    tag.position.y = -0.02;
    scene.add(tag);

    /* ---------- interaction ---------- */
    var rotY = -0.42, rotX = -0.18, velY = 0, dragging = false, lastX = 0, lastY = 0, lastMove = 0, lastScroll = global.scrollY;
    function down(x, y) { dragging = true; lastX = x; lastY = y; velY = 0; stage.style.cursor = 'grabbing'; }
    function move(x, y) { if (!dragging) return; var dx = x - lastX, dy = y - lastY; rotY += dx * 0.009; rotX = Math.max(-0.7, Math.min(0.7, rotX + dy * 0.009)); velY = dx * 0.009; lastX = x; lastY = y; lastMove = Date.now(); }
    function up() { dragging = false; stage.style.cursor = 'grab'; }
    var el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) { down(e.clientX, e.clientY); el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
    global.addEventListener('pointerup', up);
    global.addEventListener('pointercancel', up);
    if (!reduce) global.addEventListener('scroll', function () { var d = global.scrollY - lastScroll; lastScroll = global.scrollY; if (!dragging) rotY += d * 0.0016; }, { passive: true });

    stage.style.cursor = 'grab';

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    global.addEventListener('resize', resize);

    var visible = true;
    var frameId = null;
    function resume() {
      if (visible && !document.hidden && frameId === null) frame();
    }
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        resume();
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', resume);

    function frame() {
      frameId = null;
      if (!visible || document.hidden) return;
      if (!dragging) {
        if (Math.abs(velY) > 0.0008) { rotY += velY; velY *= 0.95; }
        else if (!reduce && Date.now() - lastMove > 900) { rotY += 0.0045; }
        rotX += (-0.16 - rotX) * 0.03;
      }
      tag.rotation.y = rotY; tag.rotation.x = rotX;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(frame);
    }
    frame();

    // debug/snapshot helper (works even when rAF is paused)
    global.__tagSnapshot = function (ry, rx) {
      if (ry != null) tag.rotation.y = ry;
      if (rx != null) tag.rotation.x = rx;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };
    return true;
  }

  global.PetTag3D = { init: init, DEMO_URL: DEMO_URL };
})(window);
