/* ============================================================
   PetFind — account page: login / signup / dashboard
   Bilingual (follows the site EN/FR switch) + Google/Apple sign-in.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var yearEl = $('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Dynamic strings (static text is handled by data-i18n in the HTML).
  var T = {
    en: {
      loginTitle: 'Log in', signupTitle: 'Create an account',
      submitLogin: 'Log in', submitSignup: 'Create my account',
      needCreds: 'Enter your email and password.',
      pwShort: 'Password must be at least 6 characters.',
      badCreds: 'Incorrect email or password. If you just signed up, confirm your email via the link we sent, then try again.',
      rate: 'Too many attempts. Try again in a few minutes.',
      generic: 'Something went wrong. Please try again.',
      checkEmail: function (e) { return 'Account created! Check your inbox (' + e + ') and click the confirmation link to activate your account.'; },
      resetSent: function (e) { return 'If an account exists for ' + e + ', a reset link has just been sent.'; },
      forgotNeedEmail: 'Enter your email first, then click "Forgot password".',
      loadPetsErr: 'Could not load your pets: ',
      edit: 'Edit', seePage: 'View page', copy: 'Copy link', copied: 'Copied ✓',
      oauthOff: 'This sign-in method isn’t enabled yet — it’s coming soon. Please use email for now.',
      recovery: 'You can now set a new password: type it below and click "Log in".'
    },
    fr: {
      loginTitle: 'Connectez-vous', signupTitle: 'Créer un compte',
      submitLogin: 'Se connecter', submitSignup: 'Créer mon compte',
      needCreds: 'Entrez votre e-mail et votre mot de passe.',
      pwShort: 'Le mot de passe doit contenir au moins 6 caractères.',
      badCreds: 'E-mail ou mot de passe incorrect. Si vous venez de créer un compte, confirmez votre e-mail via le lien envoyé, puis réessayez.',
      rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
      generic: 'Une erreur est survenue. Réessayez.',
      checkEmail: function (e) { return 'Compte créé ! Vérifiez votre boîte mail (' + e + ') et cliquez sur le lien de confirmation pour activer votre compte.'; },
      resetSent: function (e) { return 'Si un compte existe pour ' + e + ', un lien de réinitialisation vient d’être envoyé.'; },
      forgotNeedEmail: 'Entrez votre e-mail d’abord, puis cliquez sur « Mot de passe oublié ».',
      loadPetsErr: 'Impossible de charger vos animaux : ',
      edit: 'Modifier', seePage: 'Voir la page', copy: 'Copier le lien', copied: 'Copié ✓',
      oauthOff: 'Ce mode de connexion n’est pas encore activé — bientôt disponible. Utilisez l’e-mail pour le moment.',
      recovery: 'Vous pouvez maintenant définir un nouveau mot de passe : entrez-le ci-dessous et cliquez sur « Se connecter ».'
    }
  };
  function lang() { return (window.PFI18n && window.PFI18n.lang) || 'fr'; }
  function t(k) { return (T[lang()] || T.fr)[k]; }

  if (!window.PFDB) {
    $('loading').innerHTML = '<p class="center muted">Connexion au service impossible. Vérifiez votre connexion internet et réessayez.</p>';
    return;
  }

  var mode = 'login';
  var lastPets = null;

  // Where to send the user after a successful login (checkout / setup flows
  // link here as account.html?next=<page>). Kept same-origin only.
  function nextTarget() {
    var n = new URLSearchParams(location.search).get('next');
    if (!n) return null;
    try { n = decodeURIComponent(n); } catch (e) {}
    // Only allow relative in-site targets (no protocol / host).
    if (/^https?:|^\/\//i.test(n)) return null;
    return n;
  }
  function redirectNext() {
    var n = nextTarget();
    if (n) { location.href = n; return true; }
    return false;
  }

  function show(view) {
    $('loading').hidden = true;
    $('auth-view').hidden = view !== 'auth';
    $('dash-view').hidden = view !== 'dash';
  }

  /* ---------- auth UI ---------- */
  function setMode(m) {
    mode = m;
    var login = m === 'login';
    $('tab-login').classList.toggle('on', login);
    $('tab-signup').classList.toggle('on', !login);
    $('name-field').hidden = login;
    var mk = $('marketing-field'); if (mk) mk.hidden = login;
    $('auth-title').textContent = login ? t('loginTitle') : t('signupTitle');
    $('auth-submit').textContent = login ? t('submitLogin') : t('submitSignup');
    $('a-pass').setAttribute('autocomplete', login ? 'current-password' : 'new-password');
    hideErr(); $('auth-msg').hidden = true;
  }
  function showErr(msg) { var e = $('auth-err'); e.textContent = msg; e.classList.add('show'); }
  function hideErr() { var e = $('auth-err'); e.textContent = ''; e.classList.remove('show'); }
  function showMsg(text, kind) { var m = $('auth-msg'); m.textContent = text; m.className = 'msg ' + (kind || 'info'); m.hidden = false; }

  function translateAuthError(msg) {
    msg = String(msg || '');
    // Anti-enumeration: "wrong password" and "email not confirmed" collapse to
    // ONE neutral message, so a failed login never reveals whether the email is
    // registered. "Already registered" is handled at the signup call site (it
    // shows the same "check your inbox" message as a brand-new signup).
    if (/Invalid login credentials/i.test(msg) || /Email not confirmed/i.test(msg)) return t('badCreds');
    if (/rate limit|too many/i.test(msg)) return t('rate');
    if (/already registered|already exists|already been registered/i.test(msg)) return t('generic');
    return msg;
  }

  $('tab-login').addEventListener('click', function () { setMode('login'); });
  $('tab-signup').addEventListener('click', function () { setMode('signup'); });

  $('auth-form').addEventListener('submit', async function (e) {
    e.preventDefault(); hideErr();
    var email = $('a-email').value.trim(), pass = $('a-pass').value, name = $('a-name').value.trim();
    if (!email || !pass) { showErr(t('needCreds')); return; }
    if (mode === 'signup' && pass.length < 6) { showErr(t('pwShort')); return; }

    var btn = $('auth-submit'); btn.disabled = true; var orig = btn.textContent; btn.textContent = '…';
    try {
      if (mode === 'signup') {
        var mk = $('a-marketing');
        var r = await window.PFDB.signUp(email, pass, name, mk && mk.checked);
        if (r.error) {
          // Don't leak that the email is already taken: show the same neutral
          // "check your inbox" message a new signup would get. (Supabase with
          // email-confirmation on usually returns a decoy instead of an error;
          // this covers configs where an explicit "already registered" leaks.)
          if (/already registered|already exists|already been registered/i.test(r.error.message)) {
            showMsg(t('checkEmail')(email), 'ok'); return;
          }
          showErr(translateAuthError(r.error.message)); return;
        }
        if (r.data && r.data.session) { if (!redirectNext()) await loadDashboard(); }
        else { showMsg(t('checkEmail')(email), 'ok'); }
      } else {
        var r2 = await window.PFDB.signIn(email, pass);
        if (r2.error) { showErr(translateAuthError(r2.error.message)); return; }
        if (!redirectNext()) await loadDashboard();
      }
    } catch (err) { showErr(t('generic')); }
    finally { btn.disabled = false; btn.textContent = orig; }
  });

  $('forgot').addEventListener('click', async function () {
    var email = $('a-email').value.trim();
    if (!email) { showErr(t('forgotNeedEmail')); return; }
    var r = await window.PFDB.resetPassword(email);
    if (r.error) { showErr(translateAuthError(r.error.message)); return; }
    showMsg(t('resetSent')(email), 'ok');
  });

  /* ---------- social sign-in ---------- */
  async function oauth(provider) {
    hideErr();
    if (!window.PFDB.oauthEnabled(provider)) { showMsg(t('oauthOff'), 'info'); return; }
    try {
      var r = await window.PFDB.signInWithOAuth(provider);
      if (r.error) showErr(translateAuthError(r.error.message));
      // on success the browser redirects to the provider.
    } catch (e) { showMsg(t('oauthOff'), 'info'); }
  }
  $('oauth-google').addEventListener('click', function () { oauth('google'); });
  $('oauth-apple').addEventListener('click', function () { oauth('apple'); });

  /* ---------- dashboard ---------- */
  $('logout').addEventListener('click', async function () { await window.PFDB.signOut(); location.reload(); });

  function petUrl(slug) {
    return new URL('pet.html', location.href).href.replace(/[^/]*$/, 'pet.html') + '?s=' + encodeURIComponent(slug);
  }

  function renderPets(pets) {
    var list = $('pets-list'); list.innerHTML = '';
    if (!pets || !pets.length) { $('empty-msg').hidden = false; return; }
    $('empty-msg').hidden = true;
    pets.forEach(function (p) {
      var slug = window.PFDB.slugForPet(p);
      var url = slug ? petUrl(slug) : null;
      var sub = [p.breed || p.species, p.sex, p.age].filter(Boolean).join(' · ');
      var item = document.createElement('div'); item.className = 'pet-item';
      var h = document.createElement('h3'); h.textContent = p.name || '—'; item.appendChild(h);
      var s = document.createElement('div'); s.className = 'pi-sub'; s.textContent = sub || '—'; item.appendChild(s);
      var actions = document.createElement('div'); actions.className = 'pi-actions';
      var edit = document.createElement('a'); edit.className = 'btn soft'; edit.textContent = t('edit'); edit.href = 'create.html?edit=' + p.id;
      actions.appendChild(edit);
      if (url) {
        var open = document.createElement('a'); open.className = 'btn ghost'; open.textContent = t('seePage'); open.href = url; open.target = '_blank'; open.rel = 'noopener';
        actions.appendChild(open);
        var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn soft'; copy.textContent = t('copy');
        copy.addEventListener('click', function () {
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(function () { copy.textContent = t('copied'); setTimeout(function () { copy.textContent = t('copy'); }, 1800); })
            .catch(function () { window.prompt(t('copy'), url); });
        });
        actions.appendChild(copy);
      }
      item.appendChild(actions); list.appendChild(item);
    });
  }

  function L(en, fr) { return lang() === 'fr' ? fr : en; }
  var statusTimer = null;

  function fmtRemaining(ms) {
    if (ms <= 0) return '0:00';
    var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Trial / order / subscription state at the top of the dashboard.
  async function renderStatus() {
    var host = $('status-banner');
    if (!host) return;
    clearInterval(statusTimer);
    var orders = await window.PFDB.listOrders();
    var hasOrder = !!(orders.data && orders.data.length);
    var sub = await window.PFDB.getSubscription();
    var hasSub = !!(sub && sub.data);

    function box(cls, html) {
      host.innerHTML = '<div class="msg ' + cls + '">' + html + '</div>';
    }

    if (hasOrder) {
      var subLine = hasSub
        ? L(' Premium is active.', ' Premium est actif.')
        : L(' Add Premium anytime for the 5 advanced functions.', ' Ajoutez Premium à tout moment pour les 5 fonctions avancées.');
      box('ok', '<strong>' + L('You have a PetFind tag.', 'Vous avez une médaille PetFind.') + '</strong>' +
        L(' Create your pet or activate the tag you received.', ' Créez votre animal ou activez la médaille reçue.') + subLine);
      return;
    }

    // No order yet → show the free trial countdown.
    var trial = await window.PFDB.trialInfo();
    if (trial && trial.active) {
      box('info', '<span id="acc-trial"></span> ' +
        '<a href="checkout.html" style="font-weight:700;color:#7A5312">' +
        L('Get your tag to activate a real QR.', 'Obtenez votre médaille pour activer un vrai QR.') + '</a>');
      var span = $('acc-trial');
      var tick = function () {
        var remaining = trial.expiresAt - Date.now();
        if (remaining <= 0) { clearInterval(statusTimer); renderStatus(); return; }
        span.textContent = L('Free 1-hour preview — time left: ', 'Aperçu gratuit d’1 h — temps restant : ') + fmtRemaining(remaining) + '.';
      };
      tick(); statusTimer = setInterval(tick, 1000);
    } else {
      box('info', '<strong>' + L('Your free preview has ended.', 'Votre aperçu gratuit est terminé.') + '</strong> ' +
        '<a href="checkout.html" style="font-weight:700;color:#7A5312">' +
        L('Get your PetFind tag to create and activate your QR.', 'Obtenez votre médaille PetFind pour créer et activer votre QR.') + '</a>');
    }
  }

  async function loadDashboard() {
    show('dash');
    var user = await window.PFDB.getUser();
    if (user) $('dash-email').textContent = user.email || '';
    renderStatus();
    var list = $('pets-list'); list.innerHTML = '<div class="spin" style="margin:24px auto"></div>';
    var res = await window.PFDB.listPets();
    if (res.error) { list.innerHTML = '<p class="muted">' + t('loadPetsErr') + res.error.message + '</p>'; return; }
    lastPets = res.data || [];
    renderPets(lastPets);
  }

  // Re-render language-dependent dynamic text when the site language changes.
  window.PFI18nOnChange = function () {
    if (!$('auth-view').hidden) setMode(mode);
    if (!$('dash-view').hidden) { if (lastPets) renderPets(lastPets); renderStatus(); }
  };

  /* ---------- boot ---------- */
  (async function init() {
    setMode('login');
    var user = await window.PFDB.getUser();
    if (user) { if (redirectNext()) return; await loadDashboard(); } else { show('auth'); }
    window.PFDB.onAuth(function (event) {
      if (event === 'SIGNED_IN') loadDashboard();
      if (event === 'SIGNED_OUT') show('auth');
      if (event === 'PASSWORD_RECOVERY') { show('auth'); showMsg(t('recovery'), 'info'); }
    });
  })();
})();
