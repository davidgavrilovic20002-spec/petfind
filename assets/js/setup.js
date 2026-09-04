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
  }

  async function claim(uid, secret) {
    var btn = $('su-submit'); var label = btn.textContent;
    btn.disabled = true; btn.textContent = '…';
    $('su-err').classList.remove('show');
    try {
      var res = await window.PFDB.claimTag(uid.trim(), secret.trim());
      if (res.error) {
        $('su-err').textContent = /already/i.test(res.error.message)
          ? crT('This tag is already set up on another account.', 'Cette médaille est déjà configurée sur un autre compte.')
          : crT('That code isn’t valid. Check the code printed on your tag.', 'Ce code n’est pas valide. Vérifiez le code imprimé sur votre médaille.');
        $('su-err').classList.add('show');
        return;
      }
      PF.toast(crT('Tag activated! Now set up your pet.', 'Médaille activée ! Configurez votre animal.'));
      // Hand off to the builder to fill in the pet details for this tag.
      location.href = 'create.html?edit=' + encodeURIComponent(res.data.pet_id);
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
