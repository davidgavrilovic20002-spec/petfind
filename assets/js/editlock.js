/* ============================================================
   PetFind — edit lock (must run in <head>, before the builder paints)
   When the URL asks to edit a saved pet (?edit=<id>), mark the page
   locked straight away. The stylesheet hides the builder while that
   class is on <html>, so the editor never flashes on screen before
   create.js has asked for the tag's setup code. create.js clears the
   class once the security gate is passed (or doesn't apply).
   ============================================================ */
(function () {
  'use strict';
  try {
    var edit = new URLSearchParams(location.search).get('edit');
    if (edit) document.documentElement.classList.add('edit-locked');
  } catch (e) {}
})();
