/* ============================================================
   PetFind — tag builder
   Builds the pet profile, shows a live preview, and generates a
   branded QR code that links to the pet page. Fully client-side.
   ============================================================ */
(function () {
  'use strict';
  var PF = window.PetFind;
  function crT(en, fr) { return (window.PFI18n && window.PFI18n.lang === 'fr') ? fr : en; }

  var state = {
    lang: 'en',
    name: '', species: '', breed: '', sex: '', age: '', hasHome: true,
    owner: { name: '', phone: '' },
    steps: PF.defaultSteps('en').map(function (s, i) { return { t: s.t, d: s.d, key: PF.DEFAULT_STEP_KEYS[i] }; }),
    vet: { name: '', address: '', phone: '' }
  };
  var stepsCustomized = false;
  var previewTimer = null;
  var syncingLang = false; // guards the two-way sync between setLang() and PFI18n
  var editId = null;       // set when editing a saved pet (?edit=<id>)
  var currentSlug = null;  // the saved pet's public slug

  /* ---------- profile <-> state ---------- */
  function syncFromForm() {
    var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
    state.name = g('f-name');
    state.species = g('f-species');
    state.breed = g('f-breed');
    state.sex = g('f-sex');
    state.age = g('f-age');
    var home = document.getElementById('f-home');
    if (home) state.hasHome = home.checked;
    state.owner.name = g('f-owner');
    state.owner.phone = g('f-phone');
    state.vet.name = g('v-name');
    state.vet.address = g('v-addr');
    state.vet.phone = g('v-phone');
  }

  function buildProfile() {
    syncFromForm();
    return {
      v: 1, lang: state.lang,
      name: state.name, species: state.species, breed: state.breed,
      sex: state.sex, age: state.age, hasHome: state.hasHome,
      owner: { name: state.owner.name, phone: state.owner.phone },
      steps: state.steps.map(function (s) { return { t: s.t, d: s.d }; }),
      vet: (state.vet.name ? state.vet : null)
    };
  }

  function petUrl(preview) {
    var u = new URL('pet.html', window.location.href);
    // Cache-bust query so iframe reloads when only the hash would change.
    // Browsers treat same-document hash updates as no-ops and never re-run pet.js.
    if (preview) u.searchParams.set('pv', String(Date.now()));
    var data = PF.encodeProfile(buildProfile());
    u.hash = 'd=' + data + (preview ? '&preview=1' : '');
    return u.href;
  }

  /* ---------- live preview ---------- */
  function updatePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var f = document.getElementById('preview');
      if (!f) return;
      // Assign a fresh URL (unique ?pv=) so the iframe always reloads.
      f.src = petUrl(true);
    }, 220);
  }

  /* ---------- steps editor ---------- */
  var stepsList = document.getElementById('steps-list');
  var suggestRow = document.getElementById('suggest-row');

  function renderSteps() {
    stepsList.innerHTML = '';
    state.steps.forEach(function (step, idx) {
      var wrap = document.createElement('div');
      wrap.className = 'step-edit';

      var head = document.createElement('div');
      head.className = 'se-head';
      var num = document.createElement('div');
      num.className = 'se-num'; num.textContent = String(idx + 1);
      head.appendChild(num);
      var title = document.createElement('input');
      title.type = 'text'; title.value = step.t || ''; title.placeholder = crT('Step title', "Titre de l'étape");
      title.setAttribute('aria-label', 'Step ' + (idx + 1) + ' title');
      title.style.fontWeight = '700';
      title.addEventListener('input', function () { step.t = title.value; stepsCustomized = true; updatePreview(); });
      head.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'se-actions';
      var up = iconBtn('↑', 'Move up', idx === 0, function () { move(idx, -1); });
      var down = iconBtn('↓', 'Move down', idx === state.steps.length - 1, function () { move(idx, 1); });
      var del = iconBtn('✕', 'Remove step', false, function () { state.steps.splice(idx, 1); stepsCustomized = true; renderSteps(); renderSuggestions(); updatePreview(); });
      actions.appendChild(up); actions.appendChild(down); actions.appendChild(del);
      head.appendChild(actions);
      wrap.appendChild(head);

      var desc = document.createElement('textarea');
      desc.value = step.d || ''; desc.placeholder = crT('Short description (optional)', 'Courte description (facultatif)');
      desc.setAttribute('aria-label', 'Step ' + (idx + 1) + ' description');
      desc.addEventListener('input', function () { step.d = desc.value; stepsCustomized = true; updatePreview(); });
      wrap.appendChild(desc);

      stepsList.appendChild(wrap);
    });
  }

  function iconBtn(txt, label, disabled, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'icon-btn'; b.textContent = txt;
    b.setAttribute('aria-label', label); b.disabled = disabled;
    b.addEventListener('click', fn);
    return b;
  }

  function move(idx, dir) {
    var j = idx + dir;
    if (j < 0 || j >= state.steps.length) return;
    var tmp = state.steps[idx]; state.steps[idx] = state.steps[j]; state.steps[j] = tmp;
    stepsCustomized = true; renderSteps(); updatePreview();
  }

  function currentKeys() { return state.steps.map(function (s) { return s.key; }).filter(Boolean); }

  function renderSuggestions() {
    suggestRow.innerHTML = '';
    var used = currentKeys();
    PF.STEP_LIBRARY.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-btn';
      var loc = item[state.lang] || item.en;
      b.textContent = '+ ' + loc.t;
      if (used.indexOf(item.key) !== -1) b.classList.add('added');
      b.addEventListener('click', function () {
        var s = PF.stepFromKey(item.key, state.lang);
        state.steps.push({ t: s.t, d: s.d, key: item.key });
        stepsCustomized = true; renderSteps(); renderSuggestions(); updatePreview();
      });
      suggestRow.appendChild(b);
    });
  }

  /* ---------- language ----------
     Choosing a language sets both the pet-page output AND the whole builder
     interface, and stays in sync with the header EN/FR switch. This is why
     tapping English/Français visibly translates the page. `syncingLang`
     guards against a feedback loop between this and PFI18n. */
  function setLang(l) {
    if (l !== 'en' && l !== 'fr') return;
    state.lang = l;
    var enBtn = document.getElementById('pl-en');
    var frBtn = document.getElementById('pl-fr');
    if (enBtn) {
      enBtn.classList.toggle('on', l === 'en');
      enBtn.setAttribute('aria-pressed', l === 'en' ? 'true' : 'false');
    }
    if (frBtn) {
      frBtn.classList.toggle('on', l === 'fr');
      frBtn.setAttribute('aria-pressed', l === 'fr' ? 'true' : 'false');
    }
    // Re-translate the step set only if the user hasn't customised it.
    if (!stepsCustomized) {
      state.steps = PF.defaultSteps(l).map(function (s, i) { return { t: s.t, d: s.d, key: PF.DEFAULT_STEP_KEYS[i] }; });
    }
    renderSteps(); renderSuggestions(); updatePreview();
    // Translate the interface chrome too (labels, headings, nav) so the choice
    // is visible immediately — not just in the pet-page preview further down.
    if (window.PFI18n && window.PFI18n.lang !== l && !syncingLang) {
      syncingLang = true;
      window.PFI18n.set(l);
      syncingLang = false;
    }
  }

  /* ---------- QR compose (branded card) ---------- */
  var TEAL = '#0B5651', TEAL_M = '#0F766E';
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function composeQR(url, petName) {
    var qr = qrcode(0, 'H'); qr.addData(url); qr.make();
    var c = document.getElementById('qr-canvas'), x = c.getContext('2d');
    var W = 980, H = 1180;
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#F4F8F7'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ffffff'; roundRect(x, 40, 40, W - 80, H - 80, 48); x.fill();
    x.textAlign = 'center';
    x.fillStyle = TEAL_M; x.font = '800 62px -apple-system,Segoe UI,Roboto,Arial';
    x.fillText('PetFind', W / 2, 120);
    x.fillStyle = '#0F1B1A'; x.font = '800 40px -apple-system,Segoe UI,Roboto,Arial';
    x.fillText(petName ? ('Scan to meet ' + petName) : 'Scan if you find me', W / 2, 178);
    var n = qr.getModuleCount(), area = 680, qx = (W - area) / 2, qy = 232, border = 4, cell = area / (n + border * 2);
    x.fillStyle = TEAL;
    for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col)) {
      var px = qx + (col + border) * cell, py = qy + (r + border) * cell;
      x.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cell) + 1, Math.ceil(cell) + 1);
    }
    // centre logo
    var ls = area * 0.19, cyGrid = qy + (border + n / 2) * cell, lyC = cyGrid - ls / 2, halo = ls * 1.26;
    x.fillStyle = '#ffffff'; roundRect(x, (W - halo) / 2, cyGrid - halo / 2, halo, halo, 20); x.fill();
    x.fillStyle = TEAL_M; roundRect(x, (W - ls) / 2, lyC, ls, ls, ls * 0.26); x.fill();
    x.fillStyle = '#ffffff';
    var cx2 = W / 2, cy2 = lyC + ls / 2, rr = ls * 0.10;
    function dot(dx, dy, s) { x.beginPath(); x.ellipse(cx2 + dx, cy2 + dy, s, s * 1.15, 0, 0, 7); x.fill(); }
    dot(-rr * 1.15, -rr * 1.9, rr * 0.62); dot(rr * 1.15, -rr * 1.9, rr * 0.62);
    dot(-rr * 2.0, -rr * 0.2, rr * 0.6); dot(rr * 2.0, -rr * 0.2, rr * 0.6);
    x.beginPath(); x.ellipse(cx2, cy2 + rr * 0.7, rr * 1.5, rr * 1.7, 0, 0, 7); x.fill();
    x.fillStyle = '#5B6B69'; x.font = '400 30px -apple-system,Segoe UI,Roboto,Arial';
    x.fillText('Point your phone camera at the code', W / 2, qy + area + 70);
    x.font = '400 28px -apple-system,Segoe UI,Roboto,Arial';
    x.fillText('No app needed — works even with no battery', W / 2, qy + area + 112);
  }

  /* ---------- generate / save ---------- */
  function buildSaveData() {
    syncFromForm();
    return {
      name: state.name, species: state.species, breed: state.breed,
      sex: state.sex, age: state.age, hasHome: state.hasHome,
      ownerName: state.owner.name, ownerPhone: state.owner.phone, showPhone: true,
      steps: state.steps.map(function (s) { return { t: s.t, d: s.d }; }),
      vet: (state.vet.name ? { name: state.vet.name, address: state.vet.address, phone: state.vet.phone } : null),
      lang: state.lang
    };
  }

  function permanentUrl(slug) {
    return new URL('pet.html', window.location.href).href.replace(/[^/]*$/, 'pet.html') +
           '?s=' + encodeURIComponent(slug);
  }

  function showResult(url, permanent) {
    composeQR(url, state.name);
    document.getElementById('pet-link').value = url;
    document.getElementById('open-page').href = url;
    var dl = document.getElementById('download-qr');
    dl.href = document.getElementById('qr-canvas').toDataURL('image/png');
    dl.download = 'petfind-' + (state.name || 'pet').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-qr.png';
    var note = document.querySelector('#result .note');
    if (note) note.hidden = !!permanent;   // saved links work everywhere; hide the "device only" note
    var result = document.getElementById('result');
    result.classList.add('show');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function generate(e) {
    if (e) e.preventDefault();
    var phoneErr = document.getElementById('phone-err');
    if (!state.owner.phone.trim()) {
      phoneErr.classList.add('show');
      document.getElementById('f-phone').focus();
      return;
    }
    phoneErr.classList.remove('show');
    saveOrGenerate();
  }

  async function saveOrGenerate() {
    var user = window.PFDB ? await window.PFDB.getUser() : null;
    if (!user) {
      // Not signed in: local, self-contained link (pet data lives in the QR itself).
      showResult(petUrl(false), false);
      saveLocal();
      return;
    }
    var btn = document.getElementById('generate-btn');
    var label = btn.textContent; btn.disabled = true; btn.textContent = '…';
    try {
      var data = buildSaveData();
      var res = editId ? await window.PFDB.updatePet(editId, data)
                       : await window.PFDB.createPet(data);
      if (res.error) { PF.toast(crT('Could not save: ', 'Enregistrement impossible : ') + res.error.message); return; }
      var slug = editId ? currentSlug : (res.data && res.data.slug);
      if (!slug && editId) {
        var got = await window.PFDB.getPet(editId);
        slug = got.data ? window.PFDB.slugForPet(got.data) : null;
      }
      showResult(permanentUrl(slug), true);
      PF.toast(editId ? crT('Changes saved', 'Modifications enregistrées')
                      : crT('Saved to your account', 'Enregistré dans votre compte'));
    } catch (err) {
      PF.toast(crT('Something went wrong', 'Une erreur est survenue'));
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  function setVal(id, v) { var el = document.getElementById(id); if (el && v != null) el.value = v; }

  // Prefill the form to edit a saved pet.
  async function loadForEdit(id) {
    var res = await window.PFDB.getPet(id);
    if (res.error || !res.data) { PF.toast(crT('Could not load this pet', 'Chargement impossible')); return; }
    var p = res.data;
    editId = id;
    currentSlug = window.PFDB.slugForPet(p);
    setVal('f-name', p.name); setVal('f-species', p.species); setVal('f-breed', p.breed);
    setVal('f-sex', p.sex); setVal('f-age', p.age);
    var pub = Array.isArray(p.pet_public_profile) ? (p.pet_public_profile[0] || {}) : (p.pet_public_profile || {});
    var homeEl = document.getElementById('f-home'); if (homeEl) homeEl.checked = pub.home_message !== false;
    if (pub.backup_vet) { setVal('v-name', pub.backup_vet.name); setVal('v-addr', pub.backup_vet.address); setVal('v-phone', pub.backup_vet.phone); }
    var prof = await window.PFDB.getProfile();
    if (prof.data) { setVal('f-owner', prof.data.full_name); setVal('f-phone', prof.data.phone); }
    if (Array.isArray(pub.finder_steps) && pub.finder_steps.length) {
      state.steps = pub.finder_steps.map(function (s) { return { t: s.t, d: s.d }; });
      stepsCustomized = true;
    }
    syncFromForm();
    renderSteps(); renderSuggestions(); updatePreview();
    document.getElementById('generate-btn').textContent = crT('Save changes', 'Enregistrer les modifications');
  }

  // Small banner telling the user whether their tag will be saved to an account.
  function updateSaveHint(loggedIn) {
    var host = document.getElementById('account-hint');
    if (!host) return;
    host.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'note';
    if (loggedIn) {
      box.style.background = '#EAF7EE'; box.style.color = '#15803D'; box.style.borderColor = '#BFE6CC';
      box.textContent = editId
        ? crT('Editing a saved pet — your changes update the same QR code.', 'Modification d’un animal enregistré — vos changements mettent à jour la même médaille.')
        : crT('Signed in — this will be saved to your account, so you can edit it later and the same QR keeps working.', 'Connecté — ceci sera enregistré dans votre compte : vous pourrez le modifier plus tard et la même médaille continuera de fonctionner.');
    } else {
      var a = document.createElement('a'); a.href = 'account.html'; a.style.fontWeight = '700'; a.style.color = '#7A5312';
      a.textContent = crT('Log in or create a free account', 'Connectez-vous ou créez un compte gratuit');
      box.appendChild(document.createTextNode(crT('Tip: ', 'Astuce : ')));
      box.appendChild(a);
      box.appendChild(document.createTextNode(crT(' to save your tag and edit it anytime — the printed QR keeps working.', ' pour enregistrer votre médaille et la modifier à tout moment — le QR imprimé continue de fonctionner.')));
    }
    host.appendChild(box);
  }

  function saveLocal() {
    try {
      var list = JSON.parse(localStorage.getItem('pf_pets') || '[]');
      list.unshift({ name: state.name, url: petUrl(false), at: Date.now() });
      localStorage.setItem('pf_pets', JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
  }

  /* ---------- wire up ---------- */
  function bind(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', fn);
    el.addEventListener('change', fn);
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind('f-name', function (e) { state.name = e.target.value; updatePreview(); });
    bind('f-species', function (e) { state.species = e.target.value; updatePreview(); });
    bind('f-breed', function (e) { state.breed = e.target.value; updatePreview(); });
    bind('f-sex', function (e) { state.sex = e.target.value; updatePreview(); });
    bind('f-age', function (e) { state.age = e.target.value; updatePreview(); });
    var home = document.getElementById('f-home');
    if (home) home.addEventListener('change', function (e) { state.hasHome = e.target.checked; updatePreview(); });
    bind('f-owner', function (e) { state.owner.name = e.target.value; updatePreview(); });
    bind('f-phone', function (e) {
      state.owner.phone = e.target.value;
      if (e.target.value.trim()) document.getElementById('phone-err').classList.remove('show');
      updatePreview();
    });
    bind('v-name', function (e) { state.vet.name = e.target.value; updatePreview(); });
    bind('v-addr', function (e) { state.vet.address = e.target.value; updatePreview(); });
    bind('v-phone', function (e) { state.vet.phone = e.target.value; updatePreview(); });

    var plEn = document.getElementById('pl-en');
    var plFr = document.getElementById('pl-fr');
    if (plEn) plEn.addEventListener('click', function (e) { e.preventDefault(); setLang('en'); });
    if (plFr) plFr.addEventListener('click', function (e) { e.preventDefault(); setLang('fr'); });

    document.getElementById('add-custom').addEventListener('click', function () {
      state.steps.push({ t: '', d: '' }); stepsCustomized = true; renderSteps(); updatePreview();
      var inputs = stepsList.querySelectorAll('.step-edit input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    document.getElementById('pet-form').addEventListener('submit', generate);

    document.getElementById('copy-link').addEventListener('click', function () {
      var inp = document.getElementById('pet-link');
      inp.select();
      navigator.clipboard ? navigator.clipboard.writeText(inp.value).then(function () { PF.toast(crT('Link copied', 'Lien copié')); }) : (document.execCommand('copy'), PF.toast(crT('Link copied', 'Lien copié')));
    });

    // When the site language changes (e.g. via the header EN/FR switch), keep
    // the Page-language segment, steps and preview in sync with it.
    window.PFI18nOnChange = function (lang) {
      if (lang && lang !== state.lang && !syncingLang) {
        syncingLang = true;
        setLang(lang);
        syncingLang = false;
      } else {
        renderSteps();
        renderSuggestions();
      }
    };

    // Start in whatever language i18n resolved (stored choice or browser),
    // not a hard-coded default, so the segment matches the interface on load.
    setLang(window.PFI18n && window.PFI18n.lang ? window.PFI18n.lang : state.lang);

    // Backend: reflect account state and load a pet for editing (?edit=<id>).
    (function initBackend() {
      if (!window.PFDB) { updateSaveHint(false); return; }
      window.PFDB.getUser().then(function (user) {
        var params = new URLSearchParams(location.search);
        var edit = user ? params.get('edit') : null;
        Promise.resolve(edit ? loadForEdit(edit) : null).then(function () { updateSaveHint(!!user); });
      });
    })();
  });
})();
