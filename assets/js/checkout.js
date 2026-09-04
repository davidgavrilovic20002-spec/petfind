/* ============================================================
   PetFind — demo checkout
   Collects the shipping address, records a "pending" order (no card
   charged yet), and mints the tag that would be shipped. Then shows
   the setup card (unique code + QR) the buyer uses to activate it
   themselves at home. Real payment (Stripe) is wired in later.
   ============================================================ */
(function () {
  'use strict';
  var PF = window.PetFind;
  function crT(en, fr) { return (window.PFI18n && window.PFI18n.lang === 'fr') ? fr : en; }
  var $ = function (id) { return document.getElementById(id); };

  if (!window.PFDB) {
    $('co-body').hidden = true;
    $('co-auth').hidden = false;
    $('co-auth').innerHTML = '<p class="center muted">' + crT('Connection to the service failed. Check your internet and try again.', 'Connexion au service impossible. Vérifiez votre connexion et réessayez.') + '</p>';
    return;
  }

  var selectedPlan = 'tag';
  var issuedTag = null;

  /* ---------- plan selector ---------- */
  function selectPlan(plan) {
    selectedPlan = plan;
    document.querySelectorAll('.plan').forEach(function (p) {
      p.classList.toggle('sel', p.getAttribute('data-plan') === plan);
    });
    var isSub = plan === 'tag_plus_sub';
    $('sum-plan').textContent = isSub ? crT('Tag + Premium', 'Médaille + Premium') : crT('PetFind Tag', 'Médaille PetFind');
    $('sum-sub').hidden = !isSub;
  }
  document.querySelectorAll('.plan').forEach(function (p) {
    p.addEventListener('click', function () { selectPlan(p.getAttribute('data-plan')); });
  });

  /* ---------- plain QR into a canvas ---------- */
  function renderQR(canvas, url) {
    var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    var ctx = canvas.getContext('2d'), n = qr.getModuleCount();
    var size = canvas.width, border = 2, cell = size / (n + border * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0B5651';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) {
      ctx.fillRect(Math.floor((c + border) * cell), Math.floor((r + border) * cell), Math.ceil(cell) + 1, Math.ceil(cell) + 1);
    }
  }

  /* ---------- validation ---------- */
  function readAddress() {
    return {
      name: $('s-name').value.trim(),
      line1: $('s-addr1').value.trim(),
      line2: $('s-addr2').value.trim(),
      city: $('s-city').value.trim(),
      postal_code: $('s-zip').value.trim(),
      country: $('s-country').value,
      phone: $('s-phone').value.trim()
    };
  }
  function valid(a) { return a.name && a.line1 && a.city && a.postal_code; }

  /* ---------- place order ---------- */
  async function placeOrder(e) {
    e.preventDefault();
    var addr = readAddress();
    if (!valid(addr)) { $('co-err').classList.add('show'); return; }
    $('co-err').classList.remove('show');

    var btn = $('co-submit'); var label = btn.textContent;
    btn.disabled = true; btn.textContent = '…';
    try {
      var user = await window.PFDB.getUser();
      // Persist the marketing choice on the profile if opted in here.
      if ($('s-promo').checked) { try { await window.PFDB.updateProfile({ marketing_opt_in: true }); } catch (e2) {} }

      var res = await window.PFDB.createOrder({
        email: user ? user.email : null,
        fullName: addr.name,
        address: addr,
        plan: selectedPlan,
        subscription: selectedPlan === 'tag_plus_sub'
      });
      if (res.error) { PF.toast(crT('Could not place order: ', 'Commande impossible : ') + res.error.message); return; }

      issuedTag = res.data.tag;
      showSuccess();
      PF.toast(crT('Order recorded', 'Commande enregistrée'));
    } catch (err) {
      PF.toast(crT('Something went wrong', 'Une erreur est survenue'));
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  function setupLink() {
    return issuedTag ? window.PFDB.setupUrl(issuedTag.tag_uid, issuedTag.claim_secret) : '#';
  }

  function showSuccess() {
    $('co-form').hidden = true;
    $('co-summary').hidden = true;
    var s = $('co-success'); s.hidden = false;
    $('setup-code').textContent = issuedTag ? issuedTag.tag_uid : '—';
    renderQR($('setup-qr'), setupLink());
    $('co-setup-now').href = setupLink();
    s.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('co-copy-link').addEventListener('click', function () {
    var url = setupLink();
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(function () { PF.toast(crT('Setup link copied', 'Lien de configuration copié')); })
      .catch(function () { window.prompt(crT('Copy this setup link', 'Copiez ce lien'), url); });
  });

  $('co-form').addEventListener('submit', placeOrder);

  // Re-render dynamic labels on language change.
  window.PFI18nOnChange = function () {
    selectPlan(selectedPlan);
    if (issuedTag && !$('co-success').hidden) { /* labels are data-i18n; code/link stay */ }
  };

  /* ---------- boot: require login, prefill name ---------- */
  (async function init() {
    var user = await window.PFDB.getUser();
    if (!user) { $('co-auth').hidden = false; return; }
    $('co-body').hidden = false;
    selectPlan('tag');
    var prof = await window.PFDB.getProfile();
    if (prof && prof.data) {
      if (prof.data.full_name) $('s-name').value = prof.data.full_name;
      if (prof.data.phone) $('s-phone').value = prof.data.phone;
      if (prof.data.marketing_opt_in) $('s-promo').checked = true;
    }
  })();
})();
