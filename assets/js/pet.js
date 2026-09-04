/* ============================================================
   PetFind — public pet page renderer
   Reads the pet profile from the URL (#d=...), renders it safely
   (textContent only — no HTML injection), and finds the nearest vet
   from the finder's live location.
   ============================================================ */
(function () {
  'use strict';

  var LABELS = {
    en: {
      scanned: 'Tag scanned', found: 'You found', foundGeneric: 'You found a pet',
      thanks: "Thank you for stopping to help. Here's everything you need to get me safely back home.",
      home: 'I have a loving home — my family is looking for me.',
      owner: 'Owner', call: 'Call the owner', text: 'Send a text message',
      nearestVet: 'Nearest vet', locating: 'Finding the nearest clinic near you…',
      callVet: 'Call vet', directions: 'Directions', away: 'away',
      noLocation: 'Turn on location to see the nearest clinic, or search below.',
      searchVets: 'Search vets near me', whatToDo: 'What to do now',
      privateTitle: 'The home address is kept private',
      privateBody: "For the family's safety, only the phone number and nearest vet are shown. No app and no account are needed to see this page.",
      footer: 'This tag always works — even with no battery and no subscription.',
      noProfile: 'This tag has no profile yet', noProfileBody: 'Create one to get started.',
      createLink: 'Create a pet profile'
    },
    fr: {
      scanned: 'Médaille scannée', found: 'Vous avez trouvé', foundGeneric: 'Vous avez trouvé un animal',
      thanks: "Merci de vous être arrêté pour aider. Voici tout ce qu'il faut pour me ramener à la maison.",
      home: "J'ai une famille qui m'aime — elle me cherche.",
      owner: 'Propriétaire', call: 'Appeler le propriétaire', text: 'Envoyer un message',
      nearestVet: 'Vétérinaire le plus proche', locating: 'Recherche de la clinique la plus proche…',
      callVet: 'Appeler', directions: 'Itinéraire', away: '',
      noLocation: "Activez la localisation pour voir la clinique la plus proche, ou cherchez ci-dessous.",
      searchVets: 'Chercher un vétérinaire', whatToDo: 'Que faire maintenant',
      privateTitle: "L'adresse du domicile reste privée",
      privateBody: "Pour la sécurité de la famille, seuls le numéro et le vétérinaire le plus proche sont affichés. Aucune application ni compte n'est nécessaire.",
      footer: 'Cette médaille fonctionne toujours — même sans batterie ni abonnement.',
      noProfile: "Cette médaille n'a pas encore de profil", noProfileBody: 'Créez-en un pour commencer.',
      createLink: 'Créer un profil'
    }
  };

  var PAW_BROWN = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21c-1.5 0-2.8-.9-3.5-2.2C7 15.9 4 14.4 4 11 4 7.7 6.3 6 8.4 7.1c.9.5 1.4 1.3 1.6 2.1M12 21c1.5 0 2.8-.9 3.5-2.2C17 15.9 20 14.4 20 11c0-3.3-2.3-5-4.4-3.9-.9.5-1.4 1.3-1.6 2.1" stroke="#7C4A03" stroke-width="1.5" stroke-linecap="round"/><circle cx="8.5" cy="4.6" r="1.8" fill="#7C4A03"/><circle cx="15.5" cy="4.6" r="1.8" fill="#7C4A03"/><circle cx="4.6" cy="8.4" r="1.5" fill="#7C4A03"/><circle cx="19.4" cy="8.4" r="1.5" fill="#7C4A03"/></svg>';

  var profile, lang;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(html) { var d = el('div'); d.innerHTML = html; return d.firstChild; }

  function getProfile() {
    var hash = location.hash.replace(/^#/, '');
    var m = /(?:^|&)d=([^&]+)/.exec(hash);
    if (!m) return null;
    var raw = m[1];
    try { raw = decodeURIComponent(raw); } catch (e) { /* keep raw */ }
    return window.PetFind.decodeProfile(raw);
  }

  function speciesChip() {
    var bits = [];
    if (profile.breed) bits.push(profile.breed);
    else if (profile.species) bits.push(profile.species);
    if (profile.sex) bits.push(profile.sex);
    if (profile.age) bits.push(profile.age);
    return bits.join(' · ');
  }

  function render() {
    var L = LABELS[lang];
    document.documentElement.lang = lang;
    var main = document.getElementById('main');
    main.innerHTML = '';

    if (!profile) {
      var e = el('div', 'empty');
      e.appendChild(el('h2', null, L.noProfile));
      e.appendChild(el('p', null, L.noProfileBody));
      var a = el('a', null, L.createLink); a.href = 'create.html';
      a.style.display = 'inline-block'; a.style.marginTop = '14px';
      e.appendChild(a);
      main.appendChild(e);
      return;
    }

    var name = profile.name || '';

    /* Hero */
    var hero = el('div', 'hero');
    var badge = el('div', 'found-badge');
    badge.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
    badge.appendChild(el('span', null, L.scanned));
    hero.appendChild(badge);
    hero.appendChild(el('h1', null, name ? (L.found + ' ' + name) : L.foundGeneric));
    hero.appendChild(el('p', null, (name ? L.thanks : L.thanks)));
    main.appendChild(hero);

    var content = el('div', 'content');

    /* Pet card */
    var pc = el('div', 'petcard');
    var av = el('div', 'avatar'); av.appendChild(svg(PAW_BROWN)); pc.appendChild(av);
    if (name) pc.appendChild(el('h2', null, name));
    var chipText = speciesChip();
    if (chipText) pc.appendChild(el('div', 'chip', chipText));
    if (profile.hasHome !== false) {
      var hp = el('div', 'home-pill');
      hp.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11l9-8 9 8M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="#15803D" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
      hp.appendChild(el('span', null, L.home));
      pc.appendChild(hp);
    }
    pc.appendChild(el('div', 'divider'));

    var owner = (profile.owner || {});
    pc.appendChild(el('div', 'lbl', L.owner));
    if (owner.name) pc.appendChild(el('div', 'owner-name', owner.name));

    if (owner.phone) {
      var callBtn = el('a', 'btn call');
      callBtn.href = 'tel:' + owner.phone.replace(/\s+/g, '');
      callBtn.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5c0 8.3 6.7 15 15 15 .9 0 1.7-.6 2-1.5l.5-1.6a1.4 1.4 0 00-.8-1.7l-3-1.2a1.4 1.4 0 00-1.6.4l-.9 1.1a11.3 11.3 0 01-5-5l1.1-.9a1.4 1.4 0 00.4-1.6L10 3.3A1.4 1.4 0 008.3 2.5L6.7 3C5.7 3.3 5 4.1 5 5" fill="#fff"/></svg>'));
      callBtn.appendChild(el('span', null, L.call));
      pc.appendChild(callBtn);

      var smsBtn = el('a', 'btn text');
      smsBtn.href = 'sms:' + owner.phone.replace(/\s+/g, '');
      smsBtn.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 4V6a1 1 0 011-1z" stroke="#0B5651" stroke-width="1.7" stroke-linejoin="round"/></svg>'));
      smsBtn.appendChild(el('span', null, L.text));
      pc.appendChild(smsBtn);
    }
    content.appendChild(pc);

    /* Vet card (populated async) */
    var vc = el('div', 'vetcard'); vc.id = 'vetcard';
    var vh = el('div', 'vet-head');
    var vic = el('div', 'vet-ic');
    vic.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v6m0 0a3 3 0 013 3v9H9v-9a3 3 0 013-3z" stroke="#0F766E" stroke-width="1.6" stroke-linecap="round"/><path d="M9 5H7a2 2 0 00-2 2v3M15 5h2a2 2 0 012 2v3" stroke="#0F766E" stroke-width="1.6" stroke-linecap="round"/></svg>'));
    vh.appendChild(vic);
    var vbody = el('div'); vbody.id = 'vetbody';
    vbody.appendChild(el('div', 'lbl', L.nearestVet));
    var loading = el('div', 'vs');
    loading.style.display = 'flex'; loading.style.alignItems = 'center'; loading.style.gap = '8px';
    loading.style.marginTop = '6px';
    loading.appendChild(svg('<div class="spinner"></div>'));
    loading.appendChild(el('span', null, L.locating));
    vbody.appendChild(loading);
    vh.appendChild(vbody);
    vc.appendChild(vh);
    content.appendChild(vc);

    /* Steps */
    var steps = (profile.steps && profile.steps.length) ? profile.steps : window.PetFind.defaultSteps(lang);
    var sc = el('div', 'steps');
    sc.appendChild(el('h3', null, L.whatToDo));
    steps.forEach(function (s, i) {
      var st = el('div', 'step');
      st.appendChild(el('div', 'num', String(i + 1)));
      var body = el('div');
      body.appendChild(el('div', 'st', s.t || ''));
      if (s.d) body.appendChild(el('div', 'sd', s.d));
      st.appendChild(body);
      sc.appendChild(st);
    });
    content.appendChild(sc);

    /* Safety */
    var sf = el('div', 'safety');
    sf.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 9.5-4-1.2-7-5-7-9.5V6l7-3z" stroke="#0F766E" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8 3.2-3.6" stroke="#0F766E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
    var sfb = el('div');
    sfb.appendChild(el('b', null, L.privateTitle));
    sfb.appendChild(el('p', null, L.privateBody));
    sf.appendChild(sfb);
    content.appendChild(sf);

    main.appendChild(content);

    /* Footer */
    var foot = el('div', 'foot');
    var pf = el('div', 'pf');
    pf.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21c-1.2 0-2.3-.7-2.9-1.7C7.6 16.9 5 15.7 5 12.5 5 9.5 7 8 8.7 8.9c.7.4 1.1 1 1.3 1.6M12 21c1.2 0 2.3-.7 2.9-1.7C16.4 16.9 19 15.7 19 12.5 19 9.5 17 8 15.3 8.9c-.7.4-1.1 1-1.3 1.6" stroke="#0F766E" stroke-width="1.6" stroke-linecap="round"/><circle cx="9" cy="5.5" r="1.6" fill="#0F766E"/><circle cx="15" cy="5.5" r="1.6" fill="#0F766E"/></svg>'));
    pf.appendChild(document.createTextNode('PetFind'));
    foot.appendChild(pf);
    foot.appendChild(el('div', null, L.footer));
    main.appendChild(foot);

    loadVet();
  }

  function renderVet(best) {
    var L = LABELS[lang];
    var body = document.getElementById('vetbody');
    if (!body) return;
    body.innerHTML = '';
    body.appendChild(el('div', 'lbl', L.nearestVet));

    if (best) {
      body.appendChild(el('div', 'vn', best.name));
      var sub = best.address || '';
      if (best.dist != null) sub += (sub ? ' · ' : '') + window.PetVet.fmtDist(best.dist) + (L.away ? ' ' + L.away : '');
      if (sub) body.appendChild(el('div', 'vs', sub));

      var actions = el('div', 'vet-actions');
      if (best.phone) {
        var cb = el('a', 'btn call'); cb.style.boxShadow = 'none'; cb.style.marginTop = '0';
        cb.href = 'tel:' + best.phone.replace(/\s+/g, '');
        cb.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5c0 8.3 6.7 15 15 15 .9 0 1.7-.6 2-1.5l.5-1.6a1.4 1.4 0 00-.8-1.7l-3-1.2a1.4 1.4 0 00-1.6.4l-.9 1.1a11.3 11.3 0 01-5-5l1.1-.9a1.4 1.4 0 00.4-1.6L10 3.3A1.4 1.4 0 008.3 2.5L6.7 3C5.7 3.3 5 4.1 5 5" fill="#fff"/></svg>'));
        cb.appendChild(el('span', null, L.callVet));
        actions.appendChild(cb);
      }
      var db = el('a', 'btn dir');
      db.target = '_blank'; db.rel = 'noopener';
      db.href = (best.lat != null)
        ? 'https://www.google.com/maps/dir/?api=1&destination=' + best.lat + ',' + best.lon
        : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(best.name);
      db.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="#0F1B1A" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="#0F1B1A" stroke-width="1.6"/></svg>'));
      db.appendChild(el('span', null, L.directions));
      actions.appendChild(db);
      body.appendChild(actions);
    } else {
      body.appendChild(el('div', 'vs', L.noLocation));
      var search = el('a', 'btn dir'); search.style.marginTop = '12px';
      search.target = '_blank'; search.rel = 'noopener';
      search.href = 'https://www.google.com/maps/search/?api=1&query=veterinary+near+me';
      search.appendChild(el('span', null, L.searchVets));
      body.appendChild(search);
    }
  }

  function isPreview() { return /(?:^|&)preview=1(?:&|$)/.test(location.hash.replace(/^#/, '')); }

  function loadVet() {
    if (isPreview()) {
      // In the builder preview we don't ask for location — show the
      // backup vet if provided, otherwise the neutral placeholder.
      if (profile.vet && profile.vet.name) return renderVet(profile.vet);
      return renderVet(null);
    }
    window.PetVet.getLocation()
      .then(function (loc) { return window.PetVet.findNearest(loc.lat, loc.lon); })
      .then(function (best) {
        if (best) return renderVet(best);
        // fall back to owner-provided vet, if any
        if (profile.vet && profile.vet.name) return renderVet(profile.vet);
        renderVet(null);
      })
      .catch(function () {
        if (profile.vet && profile.vet.name) return renderVet(profile.vet);
        renderVet(null);
      });
  }

  function setLang(l) {
    lang = l;
    document.getElementById('lang-en').classList.toggle('on', l === 'en');
    document.getElementById('lang-fr').classList.toggle('on', l === 'fr');
    render();
  }

  function bootFromHash() {
    profile = getProfile();
    lang = (profile && profile.lang) || (navigator.language && navigator.language.slice(0, 2) === 'fr' ? 'fr' : 'en');
    setLang(lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('lang-en').addEventListener('click', function () { setLang('en'); });
    document.getElementById('lang-fr').addEventListener('click', function () { setLang('fr'); });
    bootFromHash();
  });

  // If the parent builder updates only the hash, re-render without a full reload.
  window.addEventListener('hashchange', function () {
    bootFromHash();
  });
})();
