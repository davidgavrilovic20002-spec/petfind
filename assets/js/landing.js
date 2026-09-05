/* ============================================================
   PetFind — landing page interactions
   - Builds the 3D rotatable paw tag (logo face / QR face)
   - Drag + momentum + idle spin + scroll-driven rotation
   - Header scroll state, scroll-reveal animations
   - Interactive star rating (stored locally for now)
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* Shared paw silhouette (5 shapes: 4 toes + heel) */
  var PAW = '<ellipse cx="46" cy="92" rx="22" ry="30" transform="rotate(-20 46 92)"/>' +
            '<ellipse cx="88" cy="56" rx="24" ry="32" transform="rotate(-8 88 56)"/>' +
            '<ellipse cx="132" cy="56" rx="24" ry="32" transform="rotate(8 132 56)"/>' +
            '<ellipse cx="174" cy="92" rx="22" ry="30" transform="rotate(20 174 92)"/>' +
            '<ellipse cx="110" cy="150" rx="58" ry="44"/>';

  function metalPaw(suffix) {
    return '<svg class="paw-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="mtl' + suffix + '" x1="0" y1="0" x2="0.35" y2="1">' +
          '<stop offset="0" stop-color="#ffffff"/><stop offset="0.4" stop-color="#dbe2e6"/>' +
          '<stop offset="0.62" stop-color="#c1cace"/><stop offset="1" stop-color="#eef2f4"/>' +
        '</linearGradient>' +
        '<clipPath id="clip' + suffix + '">' + PAW + '</clipPath>' +
      '</defs>' +
      '<g clip-path="url(#clip' + suffix + ')">' +
        '<rect x="0" y="0" width="220" height="220" fill="url(#mtl' + suffix + ')"/>' +
        '<ellipse cx="78" cy="52" rx="130" ry="74" fill="#ffffff" opacity="0.4"/>' +
        '<ellipse cx="150" cy="200" rx="120" ry="70" fill="#8b979d" opacity="0.25"/>' +
      '</g>' +
      '<g fill="none" stroke="#a7b1b7" stroke-width="2.5" opacity="0.75">' + PAW + '</g>' +
    '</svg>';
  }
  function solidPaw(color) {
    return '<svg class="paw-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="' + color + '">' + PAW + '</g></svg>';
  }

  function buildTag(stage) {
    var tag = document.createElement('div');
    tag.className = 'tag3d'; tag.id = 'tag3d';

    // Thickness: stacked solid paws between the two faces.
    var LAYERS = 12, DEPTH = 13;
    for (var i = 0; i < LAYERS; i++) {
      var t = i / (LAYERS - 1);                 // 0..1
      var z = -DEPTH / 2 + t * DEPTH;
      var shade = Math.round(150 + Math.sin(t * Math.PI) * 55); // brighter mid rim
      var edge = document.createElement('div');
      edge.className = 'tag-edge';
      edge.style.transform = 'translateZ(' + z.toFixed(2) + 'px)';
      edge.innerHTML = solidPaw('rgb(' + shade + ',' + (shade + 6) + ',' + (shade + 10) + ')');
      tag.appendChild(edge);
    }

    var front = document.createElement('div');
    front.className = 'tag-face front';
    front.style.transform = 'translateZ(' + (DEPTH / 2 + 0.5) + 'px)';
    front.innerHTML = metalPaw('F') +
      '<div class="tag-overlay"><img class="ov-paw" src="assets/img/favicon.svg" alt=""><span class="ov-word">PetFind</span></div>';
    tag.appendChild(front);

    var back = document.createElement('div');
    back.className = 'tag-face back';
    back.style.transform = 'rotateY(180deg) translateZ(' + (DEPTH / 2 + 0.5) + 'px)';
    back.innerHTML = metalPaw('B') +
      '<div class="tag-overlay"><div class="qr-box"><canvas id="tagQR" width="168" height="168"></canvas></div></div>';
    tag.appendChild(back);

    stage.appendChild(tag);
    renderTagQR();
    return tag;
  }

  function renderTagQR() {
    if (typeof qrcode === 'undefined') return;
    var url = new URL('index.html', window.location.href).href;
    var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    var c = document.getElementById('tagQR'); if (!c) return;
    var ctx = c.getContext('2d'), n = qr.getModuleCount(), size = c.width, cell = size / n;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0B5651';
    for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col))
      ctx.fillRect(Math.floor(col * cell), Math.floor(r * cell), Math.ceil(cell), Math.ceil(cell));
  }

  /* ---- rotation physics ---- */
  function initRotation(stage, tag) {
    var rotY = -22, rotX = -12, velY = 0, dragging = false, lastX = 0, lastY = 0, lastMove = 0;
    var lastScroll = window.scrollY;

    function apply() { tag.style.transform = 'rotateY(' + rotY + 'deg) rotateX(' + rotX + 'deg)'; }

    function down(x, y) { dragging = true; lastX = x; lastY = y; velY = 0; stage.setAttribute('data-drag', '1'); }
    function move(x, y) {
      if (!dragging) return;
      var dx = x - lastX, dy = y - lastY;
      rotY += dx * 0.5;
      rotX = Math.max(-40, Math.min(40, rotX - dy * 0.4));
      velY = dx * 0.5; lastX = x; lastY = y; lastMove = Date.now();
    }
    function up() { dragging = false; stage.removeAttribute('data-drag'); }

    stage.addEventListener('pointerdown', function (e) { down(e.clientX, e.clientY); stage.setPointerCapture && stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    // Scroll spins the tag a little (skipped when reduced motion).
    if (!reduce) window.addEventListener('scroll', function () {
      var d = window.scrollY - lastScroll; lastScroll = window.scrollY;
      if (!dragging) rotY += d * 0.12;
    }, { passive: true });

    function frame() {
      if (!dragging) {
        var idle = Date.now() - lastMove > 900;
        if (Math.abs(velY) > 0.08) { rotY += velY; velY *= 0.94; }
        else if (!reduce && idle) { rotY += 0.22; }
        rotX += (-10 - rotX) * 0.03; // ease back toward rest tilt
      }
      apply();
      requestAnimationFrame(frame);
    }
    apply();
    requestAnimationFrame(frame);
  }

  /* ---- header scroll state ---- */
  function initHeader() {
    var head = document.querySelector('.site-head');
    if (!head) return;
    var onScroll = function () { head.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- scroll reveals ---- */
  function initReveals() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var delay = en.target.getAttribute('data-reveal-delay') || 0;
          en.target.style.transitionDelay = delay + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- rating widget (account required; optional comment) ---- */
  function initRating() {
    var wrap = document.getElementById('rate-stars'); if (!wrap) return;
    var thanks = document.getElementById('rate-thanks');
    var form = document.getElementById('rate-form');
    var comment = document.getElementById('rate-comment');
    var submit = document.getElementById('rate-submit');
    var btns = [].slice.call(wrap.querySelectorAll('button'));
    var saved = 0;
    var signedIn = false;
    var busy = false;
    // Guests who tap stars are sent to account.html with this URL so the
    // login/signup page can explain why they need an account.
    var AUTH_URL = 'account.html?next=' + encodeURIComponent('index.html#rate') + '&reason=rate';

    function isFr() { return window.PFI18n && window.PFI18n.lang === 'fr'; }
    function t(en, fr) { return isFr() ? fr : en; }
    function paint(n) { btns.forEach(function (b, i) { b.classList.toggle('lit', i < n); }); }
    function setStatus(text) { if (thanks) thanks.textContent = text || ''; }
    function showForm() { if (form) form.hidden = false; }
    function hideForm() { if (form) form.hidden = true; }
    function goAuth() { window.location.href = AUTH_URL; }

    function saveRating(opts) {
      opts = opts || {};
      if (busy || !signedIn || !window.PFDB) return Promise.resolve();
      if (!(saved >= 1 && saved <= 5)) {
        setStatus(t('Choose a star rating first.', 'Choisissez d’abord une note en étoiles.'));
        return Promise.resolve();
      }
      busy = true;
      if (submit) submit.disabled = true;
      if (opts.showSaving) setStatus(t('Saving…', 'Enregistrement…'));
      return window.PFDB.upsertMyRating(saved, comment ? comment.value : '').then(function (res) {
        busy = false;
        if (submit) submit.disabled = false;
        if (res && res.error) {
          setStatus(t(
            'Could not save your rating. Please try again.',
            'Impossible d’enregistrer votre note. Réessayez.'
          ));
          return res;
        }
        if (res && res.data && res.data.rating) saved = res.data.rating;
        paint(saved);
        setStatus(t(
          'Thanks for rating PetFind ' + saved + '/5! ★ You can still edit your comment below.',
          'Merci d’avoir noté PetFind ' + saved + '/5 ! ★ Vous pouvez encore modifier votre commentaire ci-dessous.'
        ));
        showForm();
        if (opts.focusComment && comment) {
          try { comment.focus(); } catch (e) {}
        }
        return res;
      }).catch(function () {
        busy = false;
        if (submit) submit.disabled = false;
        setStatus(t(
          'Could not save your rating. Please try again.',
          'Impossible d’enregistrer votre note. Réessayez.'
        ));
      });
    }

    btns.forEach(function (b, i) {
      b.addEventListener('mouseenter', function () { paint(i + 1); });
      b.addEventListener('focus', function () { paint(i + 1); });
      b.addEventListener('click', function () {
        // Not logged in → leave the homepage for login/signup with a clear reason.
        if (!signedIn) { goAuth(); return; }
        saved = i + 1;
        paint(saved);
        showForm();
        saveRating({ showSaving: true, focusComment: true });
      });
    });
    wrap.addEventListener('mouseleave', function () { paint(saved); });

    if (submit) {
      submit.addEventListener('click', function () {
        if (!signedIn) { goAuth(); return; }
        saveRating({ showSaving: true });
      });
    }

    hideForm();
    if (!window.PFDB || !window.PFDB.getUser) return;

    window.PFDB.getUser().then(function (user) {
      signedIn = !!user;
      if (!signedIn) { hideForm(); return; }
      showForm();
      return window.PFDB.getMyRating().then(function (res) {
        if (res && res.error) return;
        if (res && res.data && res.data.rating) {
          saved = res.data.rating;
          paint(saved);
          if (comment && res.data.comment) comment.value = res.data.comment;
          setStatus(t(
            'You rated PetFind ' + saved + '/5 — thank you! Edit below anytime.',
            'Vous avez noté PetFind ' + saved + '/5 — merci ! Modifiez ci-dessous à tout moment.'
          ));
        }
      });
    }).catch(function () {
      signedIn = false;
      hideForm();
    });
  }

  /* ---- QR function detail reveal ----
     The "Always-on QR" card in the whole-system grid is a disclosure control:
     tapping it reveals the "Why PetFind" + "How it works" sections directly
     below the grid (they live in #qr-detail, hidden by default). The nav
     "How it works" link and the hero "See how it works" button open it too. */
  function initQrReveal() {
    var detail = document.getElementById('qr-detail');
    var card = document.getElementById('sys-qr-card');
    if (!detail || !card) return;
    var label = document.getElementById('sys-qr-label');
    var closeTimer = null;

    function isFr() { return window.PFI18n && window.PFI18n.lang === 'fr'; }
    function isOpen() { return card.getAttribute('aria-expanded') === 'true'; }
    function setLabel() {
      if (!label) return;
      label.textContent = isOpen()
        ? (isFr() ? 'Masquer' : 'Hide')
        : (isFr() ? 'Voir comment ça marche' : 'See how it works');
    }

    function open(scrollTarget) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      if (detail.hidden) {
        detail.hidden = false;
        // reveal children that the scroll-observer can't reach while hidden
        [].slice.call(detail.querySelectorAll('.reveal')).forEach(function (e) {
          e.style.transitionDelay = '0ms'; e.classList.add('in');
        });
        // next frame so the opacity/transform transition actually runs
        requestAnimationFrame(function () { detail.classList.add('open'); });
      }
      card.setAttribute('aria-expanded', 'true'); setLabel();
      var t = (scrollTarget && document.getElementById(scrollTarget)) || detail;
      requestAnimationFrame(function () {
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    }
    function close() {
      card.setAttribute('aria-expanded', 'false'); setLabel();
      detail.classList.remove('open');
      if (reduce) { detail.hidden = true; return; }
      closeTimer = setTimeout(function () { detail.hidden = true; }, 460);
    }

    card.addEventListener('click', function (e) {
      e.preventDefault();
      if (isOpen()) { close(); } else { open('qr-detail'); }
    });
    // Any link pointing at #how (nav + hero button) opens and scrolls to it.
    [].slice.call(document.querySelectorAll('a[href="#how"]')).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); open('how'); });
    });

    // Keep the card label in the right language. Chain onto any existing handler.
    var prev = window.PFI18nOnChange;
    window.PFI18nOnChange = function () { if (typeof prev === 'function') prev(); setLabel(); };
    setLabel();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var stage = document.getElementById('tagStage');
    if (stage) {
      var ok = false;
      try { ok = window.PetTag3D && window.PetTag3D.init(stage); } catch (e) { ok = false; }
      if (!ok) { var tag = buildTag(stage); initRotation(stage, tag); } // CSS fallback
    }
    initHeader();
    initReveals();
    initRating();
    initQrReveal();
  });
})();
