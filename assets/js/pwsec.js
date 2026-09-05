/* ============================================================
   PetFind — password security helper (window.PFSec)
   1) Local strength rules (length + character variety).
   2) Breached-password check via HaveIBeenPwned's range API,
      using k-anonymity: we hash the password with SHA-1 and send
      ONLY the first 5 hex chars over the network. The full password
      and full hash never leave the browser. No API key required.
   All display text lives in account.js (this module is language-agnostic).
   ============================================================ */
(function () {
  'use strict';

  var MIN_LEN = 8;      // hard minimum
  var STRONG_LEN = 12;  // a long passphrase passes even with few classes

  // Count how many character classes appear.
  function classesOf(pw) {
    var c = { lower: /[a-z]/.test(pw), upper: /[A-Z]/.test(pw),
              digit: /[0-9]/.test(pw), symbol: /[^A-Za-z0-9]/.test(pw) };
    var n = (c.lower ? 1 : 0) + (c.upper ? 1 : 0) + (c.digit ? 1 : 0) + (c.symbol ? 1 : 0);
    return { flags: c, count: n };
  }

  // Local evaluation. Returns which rules pass + a 0..4 score for the meter.
  // `ok` means it satisfies the minimum acceptance rules (NOT the leak check,
  // which is async and handled separately by isPwned).
  function evaluate(pw) {
    pw = pw || '';
    var cl = classesOf(pw);
    var longEnough = pw.length >= MIN_LEN;
    // Acceptance: >= MIN_LEN AND (>= 3 classes OR >= STRONG_LEN chars).
    var variedEnough = cl.count >= 3 || pw.length >= STRONG_LEN;
    var ok = longEnough && variedEnough;

    // Score for the visual meter (independent of acceptance).
    var score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= MIN_LEN) score++;
    if (pw.length >= STRONG_LEN) score++;
    if (cl.count >= 3) score++;
    if (score > 4) score = 4;
    if (pw && score < 1) score = 1;

    return {
      length: pw.length,
      classCount: cl.count,
      classes: cl.flags,
      longEnough: longEnough,
      variedEnough: variedEnough,
      ok: ok,
      score: score
    };
  }

  // SHA-1 as uppercase hex (HIBP uses SHA-1 hashes, uppercased).
  async function sha1Hex(str) {
    var enc = new TextEncoder().encode(str);
    var buf = await crypto.subtle.digest('SHA-1', enc);
    var bytes = new Uint8Array(buf), out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out.toUpperCase();
  }

  // Breached-password check (k-anonymity). Returns:
  //   { checked:true,  pwned:true,  count:N }  — found in breach corpus
  //   { checked:true,  pwned:false, count:0 }  — not found
  //   { checked:false, pwned:false }           — could not reach the service
  // On network/crypto failure we FAIL OPEN (checked:false) so a third-party
  // outage never blocks a signup — the local strength rules still apply.
  async function isPwned(pw) {
    try {
      if (!pw || !crypto || !crypto.subtle) return { checked: false, pwned: false };
      var hash = await sha1Hex(pw);
      var prefix = hash.slice(0, 5), suffix = hash.slice(5);
      var res = await fetch('https://api.pwnedpasswords.com/range/' + prefix, {
        headers: { 'Add-Padding': 'true' }   // extra privacy: server pads the response
      });
      if (!res.ok) return { checked: false, pwned: false };
      var text = await res.text();
      var lines = text.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].trim().split(':');
        if (parts[0] === suffix) {
          var count = parseInt(parts[1], 10) || 0;
          return { checked: true, pwned: count > 0, count: count };
        }
      }
      return { checked: true, pwned: false, count: 0 };
    } catch (e) {
      return { checked: false, pwned: false };
    }
  }

  window.PFSec = {
    MIN_LEN: MIN_LEN,
    STRONG_LEN: STRONG_LEN,
    evaluate: evaluate,
    isPwned: isPwned
  };
})();
