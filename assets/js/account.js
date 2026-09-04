/* ============================================================
   PetFind — account page: login / signup / dashboard
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var yearEl = $('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.PFDB) {
    $('loading').innerHTML = '<p class="center muted">Connexion au service impossible. Vérifiez votre connexion internet et réessayez.</p>';
    return;
  }

  var mode = 'login'; // or 'signup'

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
    $('auth-title').textContent = login ? 'Connectez-vous' : 'Créer un compte';
    $('auth-submit').textContent = login ? 'Se connecter' : 'Créer mon compte';
    $('a-pass').setAttribute('autocomplete', login ? 'current-password' : 'new-password');
    hideErr(); $('auth-msg').hidden = true;
  }
  function showErr(msg) { var e = $('auth-err'); e.textContent = msg; e.classList.add('show'); }
  function hideErr() { var e = $('auth-err'); e.textContent = ''; e.classList.remove('show'); }
  function showMsg(text, kind) {
    var m = $('auth-msg'); m.textContent = text;
    m.className = 'msg ' + (kind || 'info'); m.hidden = false;
  }

  $('tab-login').addEventListener('click', function () { setMode('login'); });
  $('tab-signup').addEventListener('click', function () { setMode('signup'); });

  $('auth-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideErr();
    var email = $('a-email').value.trim();
    var pass = $('a-pass').value;
    var name = $('a-name').value.trim();
    if (!email || !pass) { showErr('Entrez votre e-mail et votre mot de passe.'); return; }
    if (mode === 'signup' && pass.length < 6) { showErr('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    var btn = $('auth-submit'); btn.disabled = true;
    var original = btn.textContent; btn.textContent = '…';
    try {
      if (mode === 'signup') {
        var r = await window.PFDB.signUp(email, pass, name);
        if (r.error) { showErr(translateAuthError(r.error.message)); return; }
        // If email confirmation is required, there is no session yet.
        if (r.data && r.data.session) { await loadDashboard(); }
        else {
          showMsg('Compte créé ! Vérifiez votre boîte mail (' + email + ') et cliquez sur le lien de confirmation pour activer votre compte.', 'ok');
        }
      } else {
        var r2 = await window.PFDB.signIn(email, pass);
        if (r2.error) { showErr(translateAuthError(r2.error.message)); return; }
        await loadDashboard();
      }
    } catch (err) {
      showErr('Une erreur est survenue. Réessayez.');
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  });

  $('forgot').addEventListener('click', async function () {
    var email = $('a-email').value.trim();
    if (!email) { showErr('Entrez votre e-mail d’abord, puis cliquez sur « Mot de passe oublié ».'); return; }
    var r = await window.PFDB.resetPassword(email);
    if (r.error) { showErr(translateAuthError(r.error.message)); return; }
    showMsg('Si un compte existe pour ' + email + ', un lien de réinitialisation vient d’être envoyé.', 'ok');
  });

  function translateAuthError(msg) {
    msg = String(msg || '');
    if (/Invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
    if (/already registered|already exists/i.test(msg)) return 'Un compte existe déjà avec cet e-mail. Connectez-vous.';
    if (/Email not confirmed/i.test(msg)) return 'Confirmez votre e-mail avant de vous connecter (vérifiez votre boîte mail).';
    if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    return msg;
  }

  /* ---------- dashboard ---------- */
  $('logout').addEventListener('click', async function () {
    await window.PFDB.signOut();
    location.reload();
  });

  function petUrl(slug) {
    return new URL('pet.html', location.href).href.replace(/[^/]*$/, 'pet.html') + '?s=' + encodeURIComponent(slug);
  }

  async function loadDashboard() {
    show('dash');
    var user = await window.PFDB.getUser();
    if (user) $('dash-email').textContent = user.email || '';
    var list = $('pets-list');
    list.innerHTML = '<div class="spin" style="margin:24px auto"></div>';

    var res = await window.PFDB.listPets();
    if (res.error) { list.innerHTML = '<p class="muted">Impossible de charger vos animaux : ' + res.error.message + '</p>'; return; }
    var pets = res.data || [];
    list.innerHTML = '';
    if (!pets.length) { $('empty-msg').hidden = false; return; }
    $('empty-msg').hidden = true;

    pets.forEach(function (p) {
      var slug = window.PFDB.slugForPet(p);
      var url = slug ? petUrl(slug) : null;
      var sub = [p.breed || p.species, p.sex, p.age].filter(Boolean).join(' · ');

      var item = document.createElement('div');
      item.className = 'pet-item';
      var h = document.createElement('h3'); h.textContent = p.name || 'Sans nom'; item.appendChild(h);
      var s = document.createElement('div'); s.className = 'pi-sub'; s.textContent = sub || '—'; item.appendChild(s);

      var actions = document.createElement('div'); actions.className = 'pi-actions';

      var edit = document.createElement('a'); edit.className = 'btn soft';
      edit.textContent = 'Modifier'; edit.href = 'create.html?edit=' + p.id;
      actions.appendChild(edit);

      if (url) {
        var open = document.createElement('a'); open.className = 'btn ghost';
        open.textContent = 'Voir la page'; open.href = url; open.target = '_blank'; open.rel = 'noopener';
        actions.appendChild(open);

        var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn soft';
        copy.textContent = 'Copier le lien';
        copy.addEventListener('click', function () {
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(function () { copy.textContent = 'Copié ✓'; setTimeout(function () { copy.textContent = 'Copier le lien'; }, 1800); })
            .catch(function () { window.prompt('Copiez le lien :', url); });
        });
        actions.appendChild(copy);
      }
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  /* ---------- boot ---------- */
  (async function init() {
    setMode('login');
    // A confirmation / recovery link lands here with tokens; supabase-js
    // consumes them and a session appears. Give it a beat, then check.
    var user = await window.PFDB.getUser();
    if (user) { await loadDashboard(); }
    else { show('auth'); }

    window.PFDB.onAuth(function (event) {
      if (event === 'SIGNED_IN') { loadDashboard(); }
      if (event === 'SIGNED_OUT') { show('auth'); }
      if (event === 'PASSWORD_RECOVERY') {
        show('auth');
        showMsg('Vous pouvez maintenant définir un nouveau mot de passe : entrez-le ci-dessous et cliquez sur « Se connecter ».', 'info');
      }
    });
  })();
})();
