/* ============================================================
   PetFind — scroll paw trail (customer pages only)
   A trail of paw prints walks down the side of the page as you
   scroll: prints stamp in one by one ahead of the reader and
   step back out when you scroll up. Purely decorative.
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

  /* Lay the trail out along the right side of the page. On wide screens it
     wanders through the empty gutter beside the content; on narrower ones it
     hugs the edge with smaller, fainter prints so it stays clear of text. */
  function layout() {
    layer.style.height = '0px';
    var docH = document.documentElement.scrollHeight;
    layer.style.height = docH + 'px';

    // Free space between the right edge of the content (1080px container,
    // 20px padding) and the edge of the window.
    var vw = document.documentElement.clientWidth;
    var space = (vw - Math.min(vw, 1080)) / 2 + 20;
    var wide = space >= 110;
    var size = wide ? 38 : 16;
    var step = wide ? 88 : 52;                       // distance between prints
    var stance = wide ? 16 : 4;                      // left / right foot offset
    var sway = wide ? Math.max(0, Math.min(26, (space - size - 2 * stance - 16) / 2 - 4)) : 0;
    var cx = wide ? vw - space / 2 : vw - 11;
    layer.classList.toggle('narrow', !wide);

    var startY = 120;
    var count = Math.max(0, Math.floor((docH - startY - 40) / step) + 1);
    while (prints.length < count) prints.push(makePrint());
    while (prints.length > count) layer.removeChild(prints.pop().node);

    for (var i = 0; i < count; i++) {
      var y = startY + i * step, phase = y / 520, side = i % 2 ? 1 : -1;
      var x = cx + Math.sin(phase) * sway + side * stance;
      // Toes point the way it walks (down the page), turned with the curve
      // and splayed slightly outward like real prints.
      var heading = Math.atan(Math.cos(phase) * sway / 520) * 180 / Math.PI;
      var rot = 180 - heading - side * 9;
      var n = prints[i].node;
      n.style.width = n.style.height = size + 'px';
      n.style.transform = 'translate(' + (x - size / 2).toFixed(1) + 'px,' + (y - size / 2).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      prints[i].y = y;
    }
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
