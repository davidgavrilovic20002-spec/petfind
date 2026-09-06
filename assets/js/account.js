/* ============================================================
   PetFind — account page: login / signup / dashboard
   Bilingual (follows the site EN/FR switch) + Google/Apple sign-in.
   ============================================================ */
(function () {
  'use strict';

  // Clickjacking guard for the login/account page. GitHub Pages can't send
  // X-Frame-Options / CSP frame-ancestors headers, so if this page is ever
  // loaded inside a frame, break out (or hide it if that's blocked).
  if (window.top !== window.self) {
    try { window.top.location = window.self.location; }
    catch (e) { document.documentElement.style.display = 'none'; }
  }

  var $ = function (id) { return document.getElementById(id); };
  var yearEl = $('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Dynamic strings (static text is handled by data-i18n in the HTML).
  var T = {
    en: {
      loginTitle: 'Log in', signupTitle: 'Create an account',
      submitLogin: 'Log in', submitSignup: 'Create my account',
      needCreds: 'Enter your email and password.',
      pwShort: 'Password must be at least 8 characters.',
      badCreds: 'Incorrect email or password. If you just signed up, confirm your email via the link we sent, then try again.',
      rate: 'Too many attempts. Try again in a few minutes.',
      generic: 'Something went wrong. Please try again.',
      checkEmail: function (e) { return 'Account created! Check your inbox (' + e + ') and click the confirmation link to activate your account.'; },
      resetSent: function (e) { return 'If an account exists for ' + e + ', a reset link has just been sent.'; },
      forgotNeedEmail: 'Enter your email first, then click "Forgot password".',
      loadPetsErr: 'Could not load your pets: ',
      edit: 'Edit', seePage: 'View page', copy: 'Copy link', copied: 'Copied ✓',
      oauthOff: 'This sign-in method isn’t enabled yet — it’s coming soon. Please use email for now.',
      recovery: 'You can now set a new password: type it below and click "Save new password".',
      submitRecovery: 'Save new password',
      // password strength / breach
      pwWeak: 'Please choose a stronger password — see the tips below.',
      pwRules: 'Use at least 8 characters, mixing upper- and lower-case letters, numbers or symbols (or a passphrase of 12+ characters).',
      pwChecking: 'Checking your password…',
      pwPwned: 'This password has appeared in a known data breach and isn’t safe to use. Please choose a different one.',
      pwStrength: ['', 'Very weak', 'Weak', 'Fair', 'Strong'],
      pwUpdated: 'Your password has been updated and you are signed in.',
      // two-factor
      mfaNeedCode: 'Enter the 6-digit code from your authenticator app.',
      mfaBadCode: 'Incorrect or expired code. Please try again.',
      mfaChallengeFail: 'Could not verify the code. Please try again.',
      mfaEnrollErr: 'Could not start two-factor setup. Please try again.',
      mfaOnBadge: 'On', mfaOffBadge: 'Off',
      mfaEnabledOk: 'Two-factor authentication is on. You’ll be asked for a code each time you log in.',
      mfaDisabledOk: 'Two-factor authentication has been turned off.',
      mfaConfirmDisable: 'Turn off two-factor authentication? Your account will be less protected.',
      mfaSecretLabel: 'Can’t scan? Enter this key manually:',
      rateNeedAuth: 'To rate PetFind and leave a comment, you need to log in or create an account.'
    },
    fr: {
      loginTitle: 'Connectez-vous', signupTitle: 'Créer un compte',
      submitLogin: 'Se connecter', submitSignup: 'Créer mon compte',
      needCreds: 'Entrez votre e-mail et votre mot de passe.',
      pwShort: 'Le mot de passe doit contenir au moins 8 caractères.',
      badCreds: 'E-mail ou mot de passe incorrect. Si vous venez de créer un compte, confirmez votre e-mail via le lien envoyé, puis réessayez.',
      rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
      generic: 'Une erreur est survenue. Réessayez.',
      checkEmail: function (e) { return 'Compte créé ! Vérifiez votre boîte mail (' + e + ') et cliquez sur le lien de confirmation pour activer votre compte.'; },
      resetSent: function (e) { return 'Si un compte existe pour ' + e + ', un lien de réinitialisation vient d’être envoyé.'; },
      forgotNeedEmail: 'Entrez votre e-mail d’abord, puis cliquez sur « Mot de passe oublié ».',
      loadPetsErr: 'Impossible de charger vos animaux : ',
      edit: 'Modifier', seePage: 'Voir la page', copy: 'Copier le lien', copied: 'Copié ✓',
      oauthOff: 'Ce mode de connexion n’est pas encore activé — bientôt disponible. Utilisez l’e-mail pour le moment.',
      recovery: 'Vous pouvez maintenant définir un nouveau mot de passe : entrez-le ci-dessous et cliquez sur « Enregistrer le mot de passe ».',
      submitRecovery: 'Enregistrer le mot de passe',
      // robustesse / fuite du mot de passe
      pwWeak: 'Choisissez un mot de passe plus robuste — voir les conseils ci-dessous.',
      pwRules: 'Utilisez au moins 8 caractères, en mêlant majuscules, minuscules, chiffres ou symboles (ou une phrase de passe de 12 caractères ou plus).',
      pwChecking: 'Vérification de votre mot de passe…',
      pwPwned: 'Ce mot de passe est apparu dans une fuite de données connue et n’est pas sûr. Choisissez-en un autre.',
      pwStrength: ['', 'Très faible', 'Faible', 'Moyen', 'Robuste'],
      pwUpdated: 'Votre mot de passe a été mis à jour et vous êtes connecté(e).',
      // double authentification
      mfaNeedCode: 'Entrez le code à 6 chiffres de votre application d’authentification.',
      mfaBadCode: 'Code incorrect ou expiré. Réessayez.',
      mfaChallengeFail: 'Impossible de vérifier le code. Réessayez.',
      mfaEnrollErr: 'Impossible de démarrer la configuration de la double authentification. Réessayez.',
      mfaOnBadge: 'Activée', mfaOffBadge: 'Désactivée',
      mfaEnabledOk: 'La double authentification est activée. Un code vous sera demandé à chaque connexion.',
      mfaDisabledOk: 'La double authentification a été désactivée.',
      mfaConfirmDisable: 'Désactiver la double authentification ? Votre compte sera moins protégé.',
      mfaSecretLabel: 'Impossible de scanner ? Saisissez cette clé manuellement :',
      rateNeedAuth: 'Pour noter PetFind et laisser un commentaire, vous devez vous connecter ou créer un compte.'
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
  var dashboardOrders = [];
  var dashboardSubscription = null;
  var commerceUnavailable = false;
  var recovering = false;       // true while setting a new password via a reset link
  var pendingFactorId = null;   // TOTP factor awaiting a login challenge
  var enrollingFactorId = null; // TOTP factor mid-enrollment (not yet verified)

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

  // Came from the homepage rating widget without being signed in.
  function cameToRate() {
    return new URLSearchParams(location.search).get('reason') === 'rate';
  }
  function showRateNotice() {
    var el = $('auth-rate-notice');
    if (!el) return;
    if (!cameToRate()) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = t('rateNeedAuth');
    el.hidden = false;
  }

  function show(view) {
    $('loading').hidden = true;
    $('auth-view').hidden = view !== 'auth';
    $('dash-view').hidden = view !== 'dash';
    var mv = $('mfa-view'); if (mv) mv.hidden = view !== 'mfa';
  }

  /* ---------- auth UI ---------- */
  function setMode(m) {
    mode = m;
    var login = m === 'login';
    // While setting a new password via a reset link, the password field needs
    // the strength meter and a "Save new password" button.
    var wantMeter = !login || recovering;
    $('tab-login').classList.toggle('on', login);
    $('tab-signup').classList.toggle('on', !login);
    $('name-field').hidden = login || recovering;
    var mk = $('marketing-field'); if (mk) mk.hidden = login || recovering;
    $('auth-title').textContent = login ? t('loginTitle') : t('signupTitle');
    $('auth-submit').textContent = recovering ? t('submitRecovery') : (login ? t('submitLogin') : t('submitSignup'));
    $('a-pass').setAttribute('autocomplete', login && !recovering ? 'current-password' : 'new-password');
    var ps = $('pw-strength'); if (ps) ps.hidden = !wantMeter;
    if (wantMeter) renderStrength($('a-pass').value);
    hideErr(); $('auth-msg').hidden = true;
  }

  // Live password strength meter + guidance (signup / reset only).
  function renderStrength(pw) {
    var ps = $('pw-strength'); if (!ps || ps.hidden) return;
    var meter = $('pw-meter'), hint = $('pw-hint');
    var ev = window.PFSec ? window.PFSec.evaluate(pw) : { score: 0, ok: false };
    meter.className = 'pw-bar' + (pw ? ' s' + ev.score : '');
    hint.className = 'pw-hint' + (pw ? (ev.ok ? ' good' : ' bad') : '');
    if (!pw) { hint.textContent = t('pwRules'); return; }
    var labels = t('pwStrength') || [];
    var label = labels[ev.score] || '';
    hint.textContent = ev.ok ? (label + ' ✓') : (label + ' — ' + t('pwRules'));
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

  $('tab-login').addEventListener('click', function () { if (!recovering) setMode('login'); });
  $('tab-signup').addEventListener('click', function () { if (!recovering) setMode('signup'); });
  $('a-pass').addEventListener('input', function () {
    if (mode === 'signup' || recovering) renderStrength(this.value);
  });

  // Shared password gate for signup + password reset: local strength rules,
  // then a breached-password check. Returns true if the password is acceptable;
  // otherwise shows the reason and returns false.
  async function passwordAcceptable(pw, btn) {
    var ev = window.PFSec ? window.PFSec.evaluate(pw) : { ok: pw.length >= 8 };
    if (!ev.ok) { showErr(t('pwWeak')); renderStrength(pw); return false; }
    // Breach check (k-anonymity; fails open if the service is unreachable).
    var orig;
    if (btn) { orig = btn.textContent; btn.textContent = '…'; }
    var res = await window.PFSec.isPwned(pw);
    if (btn) btn.textContent = orig;
    if (res.checked && res.pwned) { showErr(t('pwPwned')); return false; }
    return true;
  }

  $('auth-form').addEventListener('submit', async function (e) {
    e.preventDefault(); hideErr();
    var email = $('a-email').value.trim(), pass = $('a-pass').value, name = $('a-name').value.trim();
    var btn = $('auth-submit'); var orig = btn.textContent;

    // --- Reset flow: the recovery link opened a session; set the new password.
    if (recovering) {
      if (!pass) { showErr(t('needCreds')); return; }
      btn.disabled = true;
      try {
        if (!(await passwordAcceptable(pass, btn))) return;
        var up = await window.PFDB.updatePassword(pass);
        if (up.error) { showErr(translateAuthError(up.error.message)); return; }
        recovering = false;
        showMsg(t('pwUpdated'), 'ok');
        if (!redirectNext()) await loadDashboard();
      } catch (err) { showErr(t('generic')); }
      finally { btn.disabled = false; btn.textContent = orig; }
      return;
    }

    if (!email || !pass) { showErr(t('needCreds')); return; }

    btn.disabled = true; btn.textContent = '…';
    try {
      if (mode === 'signup') {
        // Strong-password rules + breached-password check before creating.
        if (!(await passwordAcceptable(pass, btn))) return;
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
        // If the account has TOTP enabled, the session is only AAL1 here — it
        // must clear a code challenge before we trust it.
        if (await needsMfaChallenge()) { startMfaChallenge(); return; }
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

  /* ---------- two-factor: login challenge ---------- */
  // After a password login, does this session still owe a TOTP code?
  async function needsMfaChallenge() {
    try {
      var aal = await window.PFDB.mfaAAL();
      if (!aal || aal.error || !aal.data) return false;
      if (aal.data.nextLevel === 'aal2' && aal.data.nextLevel !== aal.data.currentLevel) {
        var list = await window.PFDB.mfaList();
        var totp = (list.data && list.data.totp) || [];
        var verified = totp.filter(function (f) { return f.status === 'verified'; });
        if (verified.length) { pendingFactorId = verified[0].id; return true; }
      }
    } catch (e) {}
    return false;
  }
  function startMfaChallenge() {
    show('mfa');
    var c = $('mfa-code'); if (c) { c.value = ''; c.focus(); }
    $('mfa-err').textContent = '';
  }
  $('mfa-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var code = ($('mfa-code').value || '').trim();
    var errEl = $('mfa-err'); errEl.textContent = '';
    if (!/^\d{6}$/.test(code)) { errEl.textContent = t('mfaNeedCode'); return; }
    if (!pendingFactorId) { errEl.textContent = t('mfaChallengeFail'); return; }
    var b = $('mfa-verify'); b.disabled = true; var o = b.textContent; b.textContent = '…';
    try {
      var r = await window.PFDB.mfaChallengeAndVerify(pendingFactorId, code);
      if (r.error) {
        errEl.textContent = /invalid|incorrect|expired|not valid/i.test(r.error.message) ? t('mfaBadCode') : t('mfaChallengeFail');
        return;
      }
      pendingFactorId = null;
      if (!redirectNext()) await loadDashboard();
    } catch (err) { errEl.textContent = t('mfaChallengeFail'); }
    finally { b.disabled = false; b.textContent = o; }
  });
  $('mfa-cancel').addEventListener('click', async function () {
    pendingFactorId = null;
    await window.PFDB.signOut();
    location.reload();
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

  /* ---------- two-factor: dashboard management ---------- */
  function tfSetErr(msg) { var e = $('twofa-err'); if (e) e.textContent = msg || ''; }
  function tfShowEnroll(on) {
    $('twofa-enroll').hidden = !on;
    $('twofa-actions').hidden = on;
    if (!on) { $('twofa-qr').innerHTML = ''; $('twofa-secret').textContent = ''; $('twofa-code').value = ''; tfSetErr(''); }
  }

  var twoFaVerified = [];  // ids of verified TOTP factors (for disable)
  async function renderTwoFA() {
    var card = $('twofa-card'); if (!card) return;
    card.hidden = false;
    tfShowEnroll(false);
    var list = await window.PFDB.mfaList();
    var totp = (list.data && list.data.totp) || [];
    twoFaVerified = totp.filter(function (f) { return f.status === 'verified'; }).map(function (f) { return f.id; });
    var on = twoFaVerified.length > 0;
    var badge = $('twofa-badge');
    badge.textContent = on ? t('mfaOnBadge') : t('mfaOffBadge');
    badge.className = 'tf-badge ' + (on ? 'on' : 'off');
    $('twofa-enable').hidden = on;
    $('twofa-disable').hidden = !on;
  }

  $('twofa-enable').addEventListener('click', async function () {
    tfSetErr('');
    var b = this; b.disabled = true; var o = b.textContent; b.textContent = '…';
    try {
      // Clean up any half-finished (unverified) factor from a previous attempt,
      // so enroll doesn't collide.
      var list = await window.PFDB.mfaList();
      var stale = ((list.data && list.data.totp) || []).filter(function (f) { return f.status !== 'verified'; });
      for (var i = 0; i < stale.length; i++) { await window.PFDB.mfaUnenroll(stale[i].id); }

      var r = await window.PFDB.mfaEnroll('PetFind ' + Date.now());
      if (r.error || !r.data) { tfSetErr(t('mfaEnrollErr')); return; }
      enrollingFactorId = r.data.id;
      var totp = r.data.totp || {};
      // qr_code may be inline SVG markup or a data-URI, depending on the
      // supabase-js version — handle both. (Only the library's own QR SVG is
      // ever injected here, never user input.)
      var qr = $('twofa-qr'); qr.innerHTML = '';
      var code = totp.qr_code || '';
      if (/^\s*<(\?xml|svg)/i.test(code)) {
        qr.innerHTML = code;                       // raw SVG markup
      } else if (code) {
        var img = document.createElement('img');
        img.alt = 'QR code'; img.src = code; qr.appendChild(img);   // data-URI
      }
      $('twofa-secret').textContent = totp.secret || '';
      tfShowEnroll(true);
      $('twofa-code').focus();
    } catch (e) { tfSetErr(t('mfaEnrollErr')); }
    finally { b.disabled = false; b.textContent = o; }
  });

  $('twofa-confirm').addEventListener('click', async function () {
    tfSetErr('');
    var code = ($('twofa-code').value || '').trim();
    if (!/^\d{6}$/.test(code)) { tfSetErr(t('mfaNeedCode')); return; }
    if (!enrollingFactorId) { tfSetErr(t('mfaEnrollErr')); return; }
    var b = this; b.disabled = true; var o = b.textContent; b.textContent = '…';
    try {
      var r = await window.PFDB.mfaChallengeAndVerify(enrollingFactorId, code);
      if (r.error) {
        tfSetErr(/invalid|incorrect|expired|not valid/i.test(r.error.message) ? t('mfaBadCode') : t('mfaChallengeFail'));
        return;
      }
      enrollingFactorId = null;
      await renderTwoFA();
      showDashMsg(t('mfaEnabledOk'), 'ok');
    } catch (e) { tfSetErr(t('mfaChallengeFail')); }
    finally { b.disabled = false; b.textContent = o; }
  });

  $('twofa-cancel-enroll').addEventListener('click', async function () {
    if (enrollingFactorId) { try { await window.PFDB.mfaUnenroll(enrollingFactorId); } catch (e) {} enrollingFactorId = null; }
    tfShowEnroll(false);
  });

  $('twofa-disable').addEventListener('click', async function () {
    if (!window.confirm(t('mfaConfirmDisable'))) return;
    var b = this; b.disabled = true; var o = b.textContent; b.textContent = '…';
    try {
      for (var i = 0; i < twoFaVerified.length; i++) { await window.PFDB.mfaUnenroll(twoFaVerified[i]); }
      await renderTwoFA();
      showDashMsg(t('mfaDisabledOk'), 'info');
    } catch (e) { tfSetErr(t('mfaChallengeFail')); }
    finally { b.disabled = false; b.textContent = o; }
  });

  // A transient message under the dashboard status banner.
  function showDashMsg(text, kind) {
    var host = $('status-banner'); if (!host) return;
    var m = document.createElement('div'); m.className = 'msg ' + (kind || 'info'); m.textContent = text;
    host.parentNode.insertBefore(m, host.nextSibling);
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 6000);
  }

  function petUrl(slug) {
    return new URL('pet.html', location.href).href.replace(/[^/]*$/, 'pet.html') + '?s=' + encodeURIComponent(slug);
  }

  function renderPets(pets) {
    var list = $('pets-list'); list.innerHTML = '';
    pets = pets || [];
    var linked = [];
    pets.forEach(function (p) { (p.pet_tags || []).forEach(function (tag) { if (tag.tag_uid) linked.push(tag.tag_uid); }); });
    var unlinked = dashboardOrders.filter(function (order) {
      if (!order.tag_uid || linked.indexOf(order.tag_uid) !== -1) return false;
      linked.push(order.tag_uid); return true;
    });
    $('empty-msg').hidden = !!(pets.length || unlinked.length);
    unlinked.forEach(function (order) {
      var item = document.createElement('div'); item.className = 'pet-item';
      var heading = document.createElement('h3'); heading.textContent = order.tag_uid; item.appendChild(heading);
      var detail = document.createElement('p'); detail.className = 'pi-sub';
      detail.textContent = L('Not linked to a pet on this account', 'Non associée à un animal de ce compte');
      if (order.subscription_opt_in) detail.textContent += L(' · Subscription requested', ' · Abonnement demandé');
      item.appendChild(detail);
      var activate = document.createElement('a'); activate.className = 'btn soft'; activate.href = 'setup.html';
      activate.textContent = L('Activate with your tag’s setup code', 'Activer avec le code de votre médaille');
      item.appendChild(activate); list.appendChild(item);
    });
    pets.forEach(function (p) {
      var tags = p.pet_tags || [];
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
      }
      tags.forEach(function (tag) {
        var row = document.createElement('div'); row.className = 'tag-row';
        var label = document.createElement('span');
        label.textContent = tag.tag_uid || tag.public_slug;
        row.appendChild(label);
        function badge(text, kind) {
          var b = document.createElement('span'); b.className = 'tag-badge ' + kind;
          b.textContent = text; row.appendChild(b);
        }
        var states = {
          active: L('Active', 'Active'), unassigned: L('Not activated', 'Non activée'),
          lost: L('Lost', 'Perdue'), disabled: L('Disabled', 'Désactivée')
        };
        badge(states[tag.status] || L('Unknown status', 'Statut inconnu'), tag.status === 'active' ? 'active' : 'inactive');
        var requested = dashboardOrders.some(function (order) {
          return order.tag_uid === tag.tag_uid && order.subscription_opt_in &&
            ['pending', 'paid', 'shipped', 'delivered'].indexOf(order.status) !== -1;
        });
        if (commerceUnavailable) badge(L('Subscription unavailable', 'Abonnement indisponible'), 'inactive');
        else if (dashboardSubscription) badge(L('Premium · account', 'Premium · compte'), 'premium');
        else if (requested) badge(L('Subscription requested · pending', 'Abonnement demandé · en attente'), 'inactive');
        else badge(L('No active subscription', 'Sans abonnement actif'), 'inactive');
        var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn danger';
        remove.textContent = L('Delete tag', 'Supprimer la médaille');
        remove.addEventListener('click', async function () {
          if (!window.confirm(L('Permanently delete this tag? Its QR link will stop working. Your pet profile will be kept. This does not cancel a subscription.', 'Supprimer définitivement cette médaille ? Son lien QR ne fonctionnera plus. Le profil de votre animal sera conservé. Cela ne résilie pas un abonnement.'))) return;
          remove.disabled = true;
          try {
            var result = await window.PFDB.deleteTag(tag.public_slug);
            if (result.error) throw result.error;
            await loadDashboard();
          } catch (err) { showDeletionError(err); remove.disabled = false; }
        });
        row.appendChild(remove);
        item.appendChild(row);
      });
      if (!tags.length) {
        var noTag = document.createElement('p'); noTag.className = 'pi-sub';
        noTag.textContent = L('No tag linked yet.', 'Aucune médaille associée.'); item.appendChild(noTag);
      }
      item.appendChild(actions); list.appendChild(item);
    });
  }

  function L(en, fr) { return lang() === 'fr' ? fr : en; }

  function showDeletionError(error) {
    var host = $('deletion-error'); host.hidden = false;
    var message = String(error && error.message || '');
    if (/function|schema cache/i.test(message)) {
      host.textContent = L('Deletion is not enabled on the server yet. Please try again after setup is complete.', 'La suppression n’est pas encore activée sur le serveur. Réessayez après la configuration.');
    } else if (/Cancel your paid subscription/i.test(message)) {
      host.textContent = L('Cancel your paid subscription before deleting your account.', 'Résiliez votre abonnement payant avant de supprimer votre compte.');
    } else if (/uploaded files/i.test(message)) {
      host.textContent = L('Please contact support to remove your uploaded files before deleting your account.', 'Contactez l’assistance pour supprimer vos fichiers avant de supprimer votre compte.');
    } else {
      host.textContent = L('Deletion failed. Reload the page and try again.', 'La suppression a échoué. Rechargez la page et réessayez.');
    }
    host.scrollIntoView({ block: 'center' });
  }
  $('delete-account').addEventListener('click', async function () {
    var button = this;
    var user = await window.PFDB.getUser();
    if (!user) { show('auth'); return; }
    var confirmation = window.prompt(L('Permanently delete your account, pets, tags and account data? This cannot be undone. Type your account email to confirm:', 'Supprimer définitivement votre compte, vos animaux, vos médailles et les données du compte ? Cette action est irréversible. Saisissez l’e-mail de votre compte pour confirmer :'));
    if (confirmation === null) return;
    if (confirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
      var host = $('deletion-error'); host.hidden = false;
      host.textContent = L('The email does not match. Nothing was deleted.', 'L’e-mail ne correspond pas. Rien n’a été supprimé.'); return;
    }
    button.disabled = true;
    try {
      var result = await window.PFDB.deleteAccount(confirmation.trim());
      if (result.error) throw result.error;
      clearInterval(statusTimer);
      lastPets = null; dashboardOrders = []; dashboardSubscription = null;
      $('pets-list').innerHTML = ''; $('dash-email').textContent = ''; show('auth');
      try { await window.PFDB.signOut(); } catch (err) {}
      location.replace('index.html');
    } catch (err) { showDeletionError(err); button.disabled = false; }
  });

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
    var orders = { data: dashboardOrders };
    if (commerceUnavailable) { host.textContent = L('Could not load subscription and order status. Reload to try again.', 'Impossible de charger les abonnements et commandes. Rechargez la page.'); return; }
    var hasOrder = !!(orders.data && orders.data.length);
    var sub = { data: dashboardSubscription };
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
    var list = $('pets-list'); list.innerHTML = '<div class="spin" style="margin:24px auto"></div>';
    $('empty-msg').hidden = true;
    var results = await Promise.all([window.PFDB.listPets(), window.PFDB.listOrders(), window.PFDB.getSubscription()]);
    var res = results[0];
    dashboardOrders = results[1].data || [];
    dashboardSubscription = results[2].data || null;
    commerceUnavailable = !!(results[1].error || results[2].error);
    renderStatus();
    if (res.error) {
      // Use textContent (not innerHTML) so a server error string can never
      // inject markup — defense in depth even though this shows only to the
      // signed-in user themselves.
      list.innerHTML = '';
      var ep = document.createElement('p'); ep.className = 'muted';
      ep.textContent = t('loadPetsErr') + res.error.message;
      list.appendChild(ep); return;
    }
    lastPets = res.data || [];
    renderPets(lastPets);
    renderTwoFA();
  }

  // Re-render language-dependent dynamic text when the site language changes.
  window.PFI18nOnChange = function () {
    if (!$('auth-view').hidden) {
      setMode(mode);
      showRateNotice();
    }
    if ($('mfa-view') && !$('mfa-view').hidden) return;
    if (!$('dash-view').hidden) {
      if (lastPets) renderPets(lastPets);
      renderStatus();
      if (!$('twofa-card').hidden) renderTwoFA();
    }
  };

  // Route a signed-in session to the dashboard, or to the TOTP challenge if it
  // is still only AAL1. Recovery sessions never auto-advance (the user is
  // mid-password-reset). Shared by init and the auth-state listener so the
  // challenge can't be skipped by the SIGNED_IN event racing the form handler.
  async function routeSignedIn() {
    if (recovering) return;
    if (redirectNext()) return;
    if (await needsMfaChallenge()) { startMfaChallenge(); return; }
    await loadDashboard();
  }

  /* ---------- boot ---------- */
  (async function init() {
    // Prefer sign-up when the user arrived because they tried to rate.
    setMode(cameToRate() ? 'signup' : 'login');
    showRateNotice();
    var user = await window.PFDB.getUser();
    if (user) { await routeSignedIn(); } else { show('auth'); showRateNotice(); }
    window.PFDB.onAuth(function (event) {
      if (event === 'SIGNED_IN') { if (!pendingFactorId) routeSignedIn(); }
      if (event === 'SIGNED_OUT') { show('auth'); showRateNotice(); }
      if (event === 'PASSWORD_RECOVERY') {
        recovering = true;
        show('auth'); setMode('login');
        showMsg(t('recovery'), 'info');
        $('a-pass').value = ''; renderStrength('');
        var pf = $('a-pass'); if (pf) pf.focus();
      }
    });
  })();
})();
