/* ============================================================
   PetFind — tag activation ("set it up at home")
   Reads the printed link (?t=<tag>&k=<code>) or a manually typed
   code, verifies it against the account, and claims the tag. The
   tag can be claimed once; afterwards only the owner's account can
   edit it. Scanning the tag never grants edit rights.
   ============================================================ */
(function () {
  'use strict';
  var PF = window.PetFind;
  function crT(en, fr) { return (window.PFI18n && window.PFI18n.lang === 'fr') ? fr : en; }
  var $ = function (id) { return document.getElementById(id); };

  if (!window.PFDB) {
    $('su-loading').innerHTML = '<p class="muted">' + crT('Connection failed. Check your internet and try again.', 'Connexion impossible. Vérifiez votre connexion et réessayez.') + '</p>';
    return;
  }

  var params = new URLSearchParams(location.search);
  var tagFromUrl = params.get('t') || '';
  var secretFromUrl = params.get('k') || '';

  function show(which) {
    $('su-loading').hidden = which !== 'loading';
    $('su-auth').hidden = which !== 'auth';
    $('su-form').hidden = which !== 'form';
    var ok = $('su-success'); if (ok) ok.hidden = which !== 'success';
  }

  async function claim(uid, secret) {
    var btn = $('su-submit'); var label = btn.textContent;
    btn.disabled = true; btn.textContent = '…';
    $('su-err').classList.remove('show');
    try {
      var res = await window.PFDB.claimTag(uid.trim(), secret.trim());
      if (res.error) {
        var m = (res.error && res.error.message) || '';
        console.error('[PetFind] claimTag failed:', res.error);
        var text;
        if (/already/i.test(m)) {
          text = crT('This tag is already set up on another account.', 'Cette médaille est déjà configurée sur un autre compte.');
        } else if (/auth|jwt|sign|not signed/i.test(m)) {
          text = crT('Please log in, then open your setup link again.', 'Connectez-vous, puis rouvrez votre lien de configuration.');
        } else if (/invalid setup link|not found/i.test(m)) {
          text = crT('That code isn’t valid. Check the code printed on your tag.', 'Ce code n’est pas valide. Vérifiez le code imprimé sur votre médaille.');
        } else {
          // Unexpected server error — surface it so it can be diagnosed/fixed.
          text = crT('Activation failed: ', 'Échec de l’activation : ') + m;
        }
        $('su-err').textContent = text;
        $('su-err').classList.add('show');
        return;
      }
      PF.toast(crT('Tag activated!', 'Médaille activée !'));
      // Show the thank-you screen (codes + "keep it safe / only you can edit"),
      // then let them continue to the builder to fill in the pet details.
      if ($('su-ok-uid')) $('su-ok-uid').textContent = uid.trim();
      if ($('su-ok-secret')) $('su-ok-secret').textContent = secret.trim();
      if ($('su-continue')) $('su-continue').href = 'create.html?edit=' + encodeURIComponent(res.data.pet_id);
      show('success');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    } catch (e) {
      PF.toast(crT('Something went wrong', 'Une erreur est survenue'));
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  $('su-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var uid = $('su-uid').value, secret = $('su-secret').value;
    if (!uid.trim() || !secret.trim()) { $('su-err').classList.add('show'); return; }
    claim(uid, secret);
  });

  (async function init() {
    var user = await window.PFDB.getUser();
    if (!user) {
      // Preserve the setup link so they return here after logging in.
      var next = 'setup.html' + location.search;
      $('su-login-btn').href = 'account.html?next=' + encodeURIComponent(next);
      show('auth');
      return;
    }
    // Prefill from the printed link and auto-claim when both parts are present.
    if (tagFromUrl) $('su-uid').value = tagFromUrl;
    if (secretFromUrl) $('su-secret').value = secretFromUrl;
    show('form');
    if (tagFromUrl && secretFromUrl) { claim(tagFromUrl, secretFromUrl); }
  })();
})();
