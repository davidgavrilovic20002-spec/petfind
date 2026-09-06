/* ============================================================
   PetFind — shared client utilities
   - URL-safe data encoding (no backend needed for step 1)
   - i18n (EN / FR)
   - Suggested "what to do" steps library
   - Cookie consent + privacy-friendly analytics hook
   - Small UI helpers (nav, toast)
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- URL-safe encode / decode of the pet profile ----------
     A pet profile is a small JSON object. We encode it to URL-safe
     base64 and carry it in the page hash: pet.html#d=<data>
     This keeps step 1 fully static — no server, no database.
     (When we add accounts + a backend later, the same pet.html can
     instead load by short id, e.g. /p/AB12CD.)                        */
  function encodeProfile(obj) {
    var json = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeProfile(str) {
    try {
      var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  /* ---------- Suggested "what to do" steps ----------
     Owners start from these and can edit / add / remove any of them. */
  var STEP_LIBRARY = [
    { key: 'calm',   en: { t: 'Keep me calm',              d: 'Speak gently and offer water if you can. I am friendly.' },
                     fr: { t: 'Rassurez-moi',              d: "Parlez doucement et offrez de l'eau si possible. Je suis gentil(le)." } },
    { key: 'call',   en: { t: 'Call my owner',             d: 'One tap on the button above connects you directly.' },
                     fr: { t: 'Appelez mon propriétaire',  d: 'Un appui sur le bouton ci-dessus vous met en relation.' } },
    { key: 'text',   en: { t: 'Send a text message',       d: 'If nobody answers, a quick text with your location helps a lot.' },
                     fr: { t: 'Envoyez un message',        d: 'Si personne ne répond, un message avec votre position aide beaucoup.' } },
    { key: 'vet',    en: { t: "Can't reach them? Go to the vet", d: 'The nearest clinic below can scan me and contact my family.' },
                     fr: { t: 'Pas de réponse ? Allez chez le vétérinaire', d: 'La clinique la plus proche ci-dessous peut m’identifier et joindre ma famille.' } },
    { key: 'leash',  en: { t: 'Keep me safe from traffic', d: 'Hold my collar or use a lead so I stay away from the road.' },
                     fr: { t: 'Éloignez-moi de la route',  d: 'Tenez mon collier ou utilisez une laisse pour ma sécurité.' } },
    { key: 'injury', en: { t: 'Check me for injuries',     d: 'If I seem hurt, please take me straight to the nearest vet.' },
                     fr: { t: 'Vérifiez si je suis blessé(e)', d: 'Si je semble blessé(e), emmenez-moi vite chez le vétérinaire le plus proche.' } },
    { key: 'water',  en: { t: 'Offer me water',            d: 'A little fresh water helps, especially in warm weather.' },
                     fr: { t: 'Donnez-moi de l’eau',       d: 'Un peu d’eau fraîche fait du bien, surtout par temps chaud.' } },
    { key: 'shade',  en: { t: 'Keep me warm / in the shade', d: 'Somewhere calm and sheltered while you call my family.' },
                     fr: { t: 'Gardez-moi à l’abri',        d: 'Un endroit calme et abrité pendant que vous appelez ma famille.' } }
  ];
  var DEFAULT_STEP_KEYS = ['calm', 'call', 'vet'];

  function stepFromKey(key, lang) {
    var s = STEP_LIBRARY.find(function (x) { return x.key === key; });
    if (!s) return null;
    var l = s[lang] || s.en;
    return { t: l.t, d: l.d };
  }
  function defaultSteps(lang) {
    return DEFAULT_STEP_KEYS.map(function (k) { return stepFromKey(k, lang); });
  }

  /* ---------- UI helpers ---------- */
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function initNav() {
    var btn = document.querySelector('.menu-btn');
    var links = document.querySelector('.nav-links');
    if (btn && links) {
      btn.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  /* ---- sliding menu underline ----
     A little teal line glides under the menu item you hover, rests under the
     page you're on, and — on the home page — follows the section you scroll
     to. Desktop only (the mobile menu is a dropdown). */
  function initNavUnderline() {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;
    var links = [].slice.call(nav.querySelectorAll('a:not(.btn)'));
    if (!links.length) return;

    var ind = document.createElement('span');
    ind.className = 'nav-ind';
    ind.setAttribute('aria-hidden', 'true');
    nav.appendChild(ind);

    function isDesktop() { return window.matchMedia('(min-width:721px)').matches; }
    function move(a) {
      if (!a || !isDesktop()) { ind.style.opacity = '0'; return; }
      ind.style.opacity = '1';
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }

    // The link that marks "the page you're on".
    var here = (location.pathname.split('/').pop() || 'index.html');
    var active = null;
    links.forEach(function (a) {
      var file = (a.getAttribute('href') || '').split('#')[0];
      if (file && file === here) active = a;
    });

    // Hover glides the line; leaving the menu returns it to the active item.
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { move(a); });
      a.addEventListener('focus', function () { move(a); });
    });
    nav.addEventListener('mouseleave', function () { move(active); });

    // On the home page, let the line follow the section you scroll to.
    if (document.body.classList.contains('home') && 'IntersectionObserver' in window) {
      var map = [];
      links.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var id = href.charAt(0) === '#' ? href.slice(1) : null;
        if (id && document.getElementById(id)) map.push([document.getElementById(id), a]);
      });
      // the "whole system" showcase stands in for Features on the home page
      var sys = document.getElementById('system');
      var featLink = links.filter(function (a) { return /features\.html/.test(a.getAttribute('href') || ''); })[0];
      if (sys && featLink) map.push([sys, featLink]);

      if (map.length) {
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var pair = map.filter(function (m) { return m[0] === en.target; })[0];
            if (pair) { active = pair[1]; move(active); }
          });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        map.forEach(function (m) { spy.observe(m[0]); });
      }
    }

    window.addEventListener('resize', function () { move(active); }, { passive: true });
    var prev = global.PFI18nOnChange;
    global.PFI18nOnChange = function (l) { if (typeof prev === 'function') prev(l); move(active); };
    move(active);
    setTimeout(function () { move(active); }, 350);
  }

  /* ---------- Cookie consent + analytics ----------
     Analytics stays OFF until the visitor accepts. Set MEASUREMENT_ID
     (e.g. a Plausible domain or GA id) once the real domain is live. */
  var ANALYTICS = { provider: null, id: null }; // e.g. {provider:'plausible', id:'petfind.example'}

  function loadAnalytics() {
    if (!ANALYTICS.provider || !ANALYTICS.id) return; // nothing configured yet
    if (window.__pfAnalyticsLoaded) return; window.__pfAnalyticsLoaded = true;
    if (ANALYTICS.provider === 'plausible') {
      var s = document.createElement('script');
      s.defer = true; s.setAttribute('data-domain', ANALYTICS.id);
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
    }
    // Other providers can be added here later.
  }

  function initConsent() {
    var stored;
    try { stored = localStorage.getItem('pf_consent'); } catch (e) { stored = null; }
    var banner = document.getElementById('cookie');
    if (stored === 'accepted') { loadAnalytics(); return; }
    if (stored === 'declined') return;
    if (!banner) return;
    banner.classList.add('show');
    var set = function (val) {
      try { localStorage.setItem('pf_consent', val); } catch (e) {}
      banner.classList.remove('show');
      if (val === 'accepted') loadAnalytics();
    };
    var a = document.getElementById('cookie-accept');
    var d = document.getElementById('cookie-decline');
    if (a) a.addEventListener('click', function () { set('accepted'); });
    if (d) d.addEventListener('click', function () { set('declined'); });
  }

  /* ---------- expose ---------- */
  global.PetFind = {
    encodeProfile: encodeProfile,
    decodeProfile: decodeProfile,
    STEP_LIBRARY: STEP_LIBRARY,
    DEFAULT_STEP_KEYS: DEFAULT_STEP_KEYS,
    stepFromKey: stepFromKey,
    defaultSteps: defaultSteps,
    toast: toast
  };

  /* Keep the owner dashboard reachable on every page. */
  function initAuthNav() {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;
    var link = nav.querySelector('a[href="account.html"]');
    if (!link) {
      link = document.createElement('a');
      nav.insertBefore(link, nav.querySelector('.nav-cta'));
    }
    link.href = 'account.html';
    link.setAttribute('data-i18n', 'nav.tags');
    link.dataset.i18nEn = 'My tags';
    link.textContent = window.PFI18n && window.PFI18n.lang === 'fr' ? 'Mes médailles' : 'My tags';
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initAuthNav();
    initNavUnderline();
    initConsent();
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})(window);
