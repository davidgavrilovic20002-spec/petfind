/* ============================================================
   PetFind — scroll paw trail (customer pages only)
   A trail of paw prints loops its way down the side of the page
   as you scroll: prints stamp in one by one ahead of the reader
   and step back out when you scroll up. Purely decorative.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // One paw (4 toes + heel pad), toes pointing up, in a 100x100 box.
  var PAW = '<ellipse cx="15" cy="41" rx="10.5" ry="13.5" transform="rotate(-32 15 41)"/>' +
            '<ellipse cx="36.5" cy="19" rx="11.5" ry="15" transform="rotate(-10 36.5 19)"/>' +
            '<ellipse cx="63.5" cy="19" rx="11.5" ry="15" transform="rotate(10 63.5 19)"/>' +
            '<ellipse cx="85" cy="41" rx="10.5" ry="13.5" transform="rotate(32 85 41)"/>' +
            '<path d="M50 45C61 45 69 54 75 64C81 74 87 84 80 92C74 98 66 92 58 93C53 94 47 94 42 93C34 92 26 98 20 92C13 84 19 74 25 64C31 54 39 45 50 45Z"/>';

  var layer, prints = [], queued = false, lastLine = -1;

  function svgEl(tag) { return document.createElementNS(NS, tag); }

  function buildLayer() {
    layer = document.createElement('div');
    layer.className = 'paw-trail';
    layer.setAttribute('aria-hidden', 'true');
    // The shape lives once in a <symbol>; every print is a cheap <use> of it.
    var defs = svgEl('svg');
    defs.setAttribute('class', 'paw-defs');
    defs.innerHTML = '<symbol id="pf-paw" viewBox="0 0 100 100">' + PAW + '</symbol>';
    layer.appendChild(defs);
    document.body.appendChild(layer);
  }

  function makePrint() {
    var node = document.createElement('div');
    node.className = 'paw-print';
    var svg = svgEl('svg'), use = svgEl('use');
    use.setAttribute('href', '#pf-paw');
    svg.appendChild(use);
    node.appendChild(svg);
    layer.appendChild(node);
    return { node: node, svg: svg, on: false, y: 0 };
  }

  /* The centre line of the walk, as points ~2px apart. On wide screens it
     runs down one edge of the gutter, curls a full loop, carries on down,
     crosses to the other edge and loops again -- a looping, spiralling
     trail like a pet circling as it goes. Every leg starts and ends heading
     straight down, so the joins are smooth. Without room for loops it just
     runs straight down. */
  function pathPoints(cx, radius, startY, endY) {
    var pts = [], y = startY, side = 1, u, a;
    if (radius <= 0) {
      for (y = startY; y <= endY + 2; y += 2) pts.push([cx, y]);
      return pts;
    }
    var lead = radius + 12, cross = 300;             // straight run around each loop; height of each crossing
    function straight(x, len) { for (u = 0; u < len; u += 2) pts.push([x, y + u]); y += len; }
    while (y < endY) {
      var edge = cx + side * radius;
      straight(edge, lead);
      // Full circle across the gutter, entering and leaving at this edge heading down.
      for (a = 0; a < 2 * Math.PI; a += 2 / radius) pts.push([cx + side * radius * Math.cos(a), y + radius * Math.sin(a)]);
      straight(edge, lead);
      for (u = 0; u < 1; u += 2 / cross) pts.push([edge - side * radius * (1 - Math.cos(Math.PI * u)), y + cross * u]);
      y += cross; side = -side;
    }
    return pts;
  }

  /* Lay the trail out along the right side of the page: in the empty gutter
     beside the content on wide screens; on narrower ones, straight down the
     edge with smaller, fainter prints that stay clear of the text. */
  function layout() {
    layer.style.height = '0px';
    var docH = document.documentElement.scrollHeight;
    layer.style.height = docH + 'px';

    // Free space between the right edge of the content (1080px container,
    // 20px padding) and the edge of the window.
    var vw = document.documentElement.clientWidth;
    var space = (vw - Math.min(vw, 1080)) / 2 + 20;
    var wide = space >= 110;
    var size = wide ? Math.min(28, Math.round(space / 6)) : 16;
    var stride = wide ? size * 1.35 : 52;            // distance between prints along the path
    var stance = wide ? size * 0.2 : 4;              // left / right foot offset (near single file, like a cat)
    var radius = wide ? Math.min(90, space / 2 - size / 2 - stance - 6) : 0;
    var cx = wide ? vw - space / 2 : vw - 11;
    layer.classList.toggle('narrow', !wide);

    // Walk the centre line and drop a print every `stride` px walked.
    var startY = 120, endY = docH - 40, count = 0, reach = 0, walked = 0, nextAt = 0;
    var pts = pathPoints(cx, radius, startY, endY);
    for (var i = 1; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1];
      var dx = x - pts[i - 1][0], dy = y - pts[i - 1][1], ds = Math.sqrt(dx * dx + dy * dy);
      walked += ds;
      if (walked < nextAt) continue;
      if (y > endY) break;
      nextAt += stride;

      // Feet land either side of the path; toes point the way it's walking
      // (up the page on the back of a loop), splayed slightly outward.
      var ux = dx / ds, uy = dy / ds, side = count % 2 ? 1 : -1;
      var fx = x + side * stance * uy, fy = y - side * stance * ux;
      var rot = Math.atan2(ux, -uy) * 180 / Math.PI - side * 9;
      if (count === prints.length) prints.push(makePrint());
      var p = prints[count++];
      p.node.style.width = p.node.style.height = size + 'px';
      p.node.style.transform = 'translate(' + (fx - size / 2).toFixed(1) + 'px,' + (fy - size / 2).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      // Stamp in walking order: a print on the way back up a loop appears
      // right after the deepest one before it, not when its own height is reached.
      reach = Math.max(reach, fy);
      p.y = reach;
    }
    while (prints.length > count) layer.removeChild(prints.pop().node);
    lastLine = -1;
    update();
  }

  /* Everything above the "walker" line is stamped. The line rides a little
     below mid-screen and reaches the bottom of the page exactly when the
     reader does, so the last prints by the footer still appear. */
  function update() {
    queued = false;
    var line = Infinity;
    if (!reduce) {
      var vh = window.innerHeight;
      var max = Math.max(1, document.documentElement.scrollHeight - vh);
      var progress = Math.min(1, Math.max(0, window.scrollY / max));
      line = window.scrollY + vh * (0.7 + 0.3 * progress);
    }
    if (line === lastLine) return;
    var forward = line > lastLine, k = 0;
    lastLine = line;
    for (var i = 0; i < prints.length; i++) {
      var p = prints[i], want = p.y < line;
      if (want === p.on) continue;
      p.on = want;
      // New prints land one after another, like steps, even on a fast scroll.
      p.svg.style.transitionDelay = want && forward ? Math.min(k++ * 70, 700) + 'ms' : '0ms';
      p.node.classList.toggle('on', want);
    }
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildLayer();
    layout();
    window.addEventListener('scroll', queue, { passive: true });
    // Re-plot when the page changes size (window resize, fonts loading, the
    // QR detail panel opening, a language switch reflowing the text).
    window.addEventListener('resize', layout);
    if ('ResizeObserver' in window) {
      var lastH = -1;
      new ResizeObserver(function () {
        var h = document.body.scrollHeight;
        if (h !== lastH) { lastH = h; layout(); }
      }).observe(document.body);
    }
  });
})();
