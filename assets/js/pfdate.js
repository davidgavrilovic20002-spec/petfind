/* PetFind — localized "last updated" date for legal pages.
   Externalized (was inline) so pages can ship a strict Content-Security-Policy
   with no 'unsafe-inline' for scripts. Fills #today, re-runs on language change. */
(function () {
  'use strict';
  function pfDate() {
    var l = document.documentElement.lang || 'en';
    var el = document.getElementById('today');
    if (el) el.textContent = new Date().toLocaleDateString(
      l === 'fr' ? 'fr-FR' : 'en-GB',
      { year: 'numeric', month: 'long', day: 'numeric' });
  }
  window.PFI18nOnChange = pfDate;
  pfDate();
})();
