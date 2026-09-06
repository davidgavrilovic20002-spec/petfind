/* ============================================================
   PetFind — real 3D paw tag (Three.js)
   Extruded, bevel-rounded paw: 4 separate toe pads + a shield heel,
   matte white with soft studio lighting. Front heel carries the logo,
   back heel carries the QR. Drag to rotate; gentle idle spin.
   Falls back to a static SVG paw if WebGL/Three is unavailable.
   ============================================================ */
(function (global) {
  'use strict';
  var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- textures drawn on canvas ---------- */
  function roundRect(x, ctx, w, h, r) {} // placeholder (unused)

  function drawPawGlyph(ctx, cx, cy, s, color) {
    // small red paw: 4 toes + heel, scaled by s (px), centred at cx,cy
    ctx.fillStyle = color;
    function ell(dx, dy, rx, ry) { ctx.beginPath(); ctx.ellipse(cx + dx * s, cy + dy * s, rx * s, ry * s, 0, 0, 7); ctx.fill(); }
    ell(-0.62, -0.30, 0.20, 0.28);
    ell(-0.22, -0.55, 0.22, 0.30);
    ell(0.22, -0.55, 0.22, 0.30);
    ell(0.62, -0.30, 0.20, 0.28);
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.35 * s, 0.55 * s, 0.42 * s, 0, 0, 7); ctx.fill();
  }

  function makeLogoTexture() {
    var c = document.createElement('canvas'); c.width = 620; c.height = 470;
    var ctx = c.getContext('2d');
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      drawPawGlyph(ctx, 310, 150, 120, '#D2382B');
      ctx.fillStyle = '#22333b';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 118px Lora, Georgia, "Times New Roman", serif';
      ctx.fillText('PetFind', 310, 340);
    }
    draw();
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); tex.needsUpdate = true; });
    return tex;
  }

  function makeQRTexture() {
    var c = document.createElement('canvas'); c.width = 560; c.height = 470;
    var ctx = c.getContext('2d');
    // card
    ctx.fillStyle = '#ffffff';
    (function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); })(20, 14, 520, 442, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F766E'; ctx.font = '800 40px -apple-system,Segoe UI,Roboto,Arial';
    ctx.fillText('PetFind', 280, 66);
    ctx.fillStyle = '#0F1B1A'; ctx.font = '700 30px -apple-system,Segoe UI,Roboto,Arial';
    ctx.fillText('Scan to meet Luna', 280, 104);
    // QR
    if (typeof qrcode !== 'undefined') {
      var url = new URL('index.html', global.location.href).href;
      var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      var n = qr.getModuleCount(), area = 250, qx = (560 - area) / 2, qy = 130, cell = area / n;
      ctx.fillStyle = '#0B5651';
      for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col))
        ctx.fillRect(Math.floor(qx + col * cell), Math.floor(qy + r * cell), Math.ceil(cell), Math.ceil(cell));
    }
    ctx.fillStyle = '#5B6B69'; ctx.font = '400 20px -apple-system,Segoe UI,Roboto,Arial';
    ctx.fillText('Point your phone camera at the code', 280, 410);
    ctx.fillText('No app needed — works even with no battery', 280, 436);
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    return tex;
  }

  /* ---------- geometry ---------- */
  function ellipseShape(rx, ry) { var s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0); return s; }
  function heelShape() {
    // classic metacarpal pad: concave top (two shoulders + centre dip),
    // bulging sides, broad rounded bottom.
    var s = new THREE.Shape();
    s.moveTo(0, 22);
    s.bezierCurveTo(14, 30, 34, 41, 48, 32);
    s.bezierCurveTo(64, 21, 62, -8, 52, -26);
    s.bezierCurveTo(43, -42, 20, -47, 0, -45);
    s.bezierCurveTo(-20, -47, -43, -42, -52, -26);
    s.bezierCurveTo(-62, -8, -64, 21, -48, 32);
    s.bezierCurveTo(-34, 41, -14, 30, 0, 22);
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
    // 4 separate toe pads (clear gaps) + shield heel
    addPart(ellipseShape(19, 25), -70, 16, THREE.MathUtils.degToRad(-16));
    addPart(ellipseShape(20, 27), -27, 46, THREE.MathUtils.degToRad(-5));
    addPart(ellipseShape(20, 27), 27, 46, THREE.MathUtils.degToRad(5));
    addPart(ellipseShape(19, 25), 70, 16, THREE.MathUtils.degToRad(16));
    addPart(heelShape(), 0, -48, 0);

    // logo + QR decals, placed just proud of the real caps (proper occlusion)
    var planeW = 84, planeH = 62, planeY = -54, off = 1.2;
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

  global.PetTag3D = { init: init };
})(window);
