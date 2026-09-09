/* ============================================================
   PetFind — species + breed reference (backend migration 0026)

   Shared by the owner site (create.html, account.html) and the
   clinic app, which is why it lives here and not beside either.

   The contract with the database, in one line: the typed text is
   never rejected and never rewritten. breed_id is an OPTIONAL
   pointer alongside it. Everything here is a convenience on top
   of a trigger that already does the same job server-side — if
   this file fails to load, saving a pet still works, it just
   stops suggesting.
   ============================================================ */
(function (global) {
  'use strict';

  /* Mirrors pets_species_check in 0026. A value missing here becomes a species
     nobody can pick, so keep the two in step. */
  var SPECIES = [
    { slug: 'dog',     en: 'Dog',     fr: 'Chien'   },
    { slug: 'cat',     en: 'Cat',     fr: 'Chat'    },
    { slug: 'rabbit',  en: 'Rabbit',  fr: 'Lapin'   },
    { slug: 'ferret',  en: 'Ferret',  fr: 'Furet'   },
    { slug: 'bird',    en: 'Bird',    fr: 'Oiseau'  },
    { slug: 'rodent',  en: 'Rodent',  fr: 'Rongeur' },
    { slug: 'reptile', en: 'Reptile', fr: 'Reptile' },
    { slug: 'other',   en: 'Other',   fr: 'Autre'   }
  ];

  /* Mirror of public.pf_fold(): lowercase, accents stripped, everything that is
     not a letter or digit removed. The database stays the authority; this only
     has to agree well enough to preview a match before saving. */
  function fold(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /* Mirror of public.pf_norm_species(). Needed on the client for one reason:
     a QR tag encodes its pet profile in the URL, and tags printed before 0026
     carry 'Dog'. Prefilling the editor from one of those must still select the
     right option. */
  var SPECIES_WORDS = {
    dog:     ['dog','dogs','chien','chienne','chiot','canin','canine','k9','perro','cane','hund'],
    cat:     ['cat','cats','chat','chatte','chaton','felin','feline','gato','gatto','katze'],
    rabbit:  ['rabbit','rabbits','lapin','lapine','lapereau','bunny','conejo','coniglio','kaninchen'],
    ferret:  ['ferret','furet','furette','putois'],
    bird:    ['bird','birds','oiseau','oiseaux','perruche','perroquet','canari','pajaro','vogel'],
    rodent:  ['rodent','rongeur','hamster','cobaye','cochondinde','gerbille','rat','souris','chinchilla','octodon'],
    reptile: ['reptile','lezard','serpent','tortue','gecko','iguane','snake','turtle','lizard']
  };

  function normSpecies(value) {
    var f = fold(value);
    if (!f) return '';
    for (var slug in SPECIES_WORDS) {
      if (SPECIES_WORDS[slug].indexOf(f) !== -1) return slug;
    }
    return 'other';
  }

  function speciesLabel(slug, lang) {
    var key = String(slug || '').toLowerCase();
    for (var i = 0; i < SPECIES.length; i++) {
      if (SPECIES[i].slug === key) return SPECIES[i][lang === 'fr' ? 'fr' : 'en'];
    }
    return slug || '';           // unknown value shown as-is, never blanked
  }

  /* ---------- the breed list ----------
     A few hundred tiny rows, so it is fetched once per species and filtered
     locally. sessionStorage keeps it across pages within a visit; a failure to
     read or write it is not worth reporting, the fetch just happens again. */
  var CACHE_VERSION = 1;
  var memory = {};
  var pending = {};

  function cacheKey(species) { return 'pf.breeds.' + CACHE_VERSION + '.' + species; }

  function readCache(species) {
    try {
      var raw = global.sessionStorage.getItem(cacheKey(species));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCache(species, rows) {
    try { global.sessionStorage.setItem(cacheKey(species), JSON.stringify(rows)); } catch (e) {}
  }

  function load(species) {
    var key = String(species || '').toLowerCase();
    if (!key) return Promise.resolve([]);
    if (memory[key]) return Promise.resolve(memory[key]);
    if (pending[key]) return pending[key];

    var cached = readCache(key);
    if (cached) { memory[key] = cached; return Promise.resolve(cached); }

    if (!global.PFDB || !global.PFDB.client) return Promise.resolve([]);
    pending[key] = global.PFDB.client
      .from('breeds')
      .select('id,slug,name_fr,name_en,aliases,is_generic,sort_order')
      .eq('species', key)
      .order('sort_order', { ascending: true })
      .order('name_fr', { ascending: true })
      .then(function (res) {
        var rows = (res && !res.error && res.data) ? res.data : [];
        if (rows.length) { memory[key] = rows; writeCache(key, rows); }
        delete pending[key];
        return rows;
      })
      .catch(function () { delete pending[key]; return []; });
    return pending[key];
  }

  /* Same match rule as the trigger: exact on the folded FR name, EN name, or
     any alias. Deliberately not fuzzy — guessing a breed onto a medical record
     is worse than leaving it unmatched. */
  function resolve(species, text) {
    var rows = memory[String(species || '').toLowerCase()];
    var f = fold(text);
    if (!rows || !f) return null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (fold(row.name_fr) === f || fold(row.name_en) === f) return row;
      var aliases = row.aliases || [];
      for (var j = 0; j < aliases.length; j++) {
        if (fold(aliases[j]) === f) return row;
      }
    }
    return null;
  }

  function breedName(row, lang) {
    if (!row) return '';
    return (lang === 'fr' ? row.name_fr : (row.name_en || row.name_fr)) || row.name_fr;
  }

  /* The name to show for a pet row that was selected with its breeds join.
     Falls back to whatever the human typed, which is the whole point. */
  function displayBreed(pet, lang) {
    if (!pet) return '';
    var joined = pet.breeds;
    if (Array.isArray(joined)) joined = joined[0];
    if (joined && !joined.is_generic) return breedName(joined, lang) || pet.breed || '';
    return pet.breed || (joined ? breedName(joined, lang) : '') || '';
  }

  /* Everything searchable about a pet: what the owner typed, the canonical
     name in both languages, its aliases, and the species in both languages.
     This is what lets a vet type "bouledogue" and find a pet whose record
     says "frenchie". */
  function searchText(pet, lang) {
    var bits = [pet.name, pet.breed, pet.age];
    var joined = pet.breeds;
    if (Array.isArray(joined)) joined = joined[0];
    if (joined) {
      bits.push(joined.name_fr, joined.name_en);
      if (joined.aliases) bits = bits.concat(joined.aliases);
    }
    if (pet.species) {
      bits.push(pet.species, speciesLabel(pet.species, 'fr'), speciesLabel(pet.species, 'en'));
    }
    return bits.filter(Boolean).join(' ').toLocaleLowerCase();
  }

  /* ---------- the picker ----------
     A plain <datalist> on a plain text input. Suggestions when the list has
     them, free typing when it does not, no focus trap and no keyboard
     handling of our own to get wrong. The alias match runs on top, so typing
     "frenchie" still resolves even though the datalist only offers canonical
     names.

     opts: { speciesEl, breedEl, listEl, hintEl, lang(), onResolve(row|null) } */
  function bind(opts) {
    var speciesEl = opts.speciesEl, breedEl = opts.breedEl, listEl = opts.listEl;
    if (!breedEl || !listEl) return { refresh: function () {}, current: function () { return null; } };

    var lang = opts.lang || function () { return 'en'; };
    var matched = null;

    function currentSpecies() {
      return speciesEl ? normSpecies(speciesEl.value) : '';
    }

    function fillList(rows) {
      listEl.replaceChildren();
      rows.forEach(function (row) {
        var option = document.createElement('option');
        // Value is what lands in the input when picked, so it is the name in
        // the reader's own language; the trigger resolves either one.
        option.value = breedName(row, lang());
        if (row.is_generic) option.label = option.value;
        listEl.appendChild(option);
      });
    }

    function showHint() {
      if (!opts.hintEl) return;
      var typed = breedEl.value.trim();
      if (!typed || !matched) { opts.hintEl.textContent = ''; return; }
      var canonical = breedName(matched, lang());
      // Only worth saying when it differs from what they typed.
      if (fold(canonical) === fold(typed)) { opts.hintEl.textContent = ''; return; }
      opts.hintEl.textContent = (lang() === 'fr' ? 'Reconnu : ' : 'Recognised as: ') + canonical;
    }

    function check() {
      matched = resolve(currentSpecies(), breedEl.value);
      showHint();
      if (opts.onResolve) opts.onResolve(matched);
    }

    function refresh() {
      var species = currentSpecies();
      if (!species) { listEl.replaceChildren(); check(); return; }
      load(species).then(function (rows) {
        if (currentSpecies() !== species) return;   // species changed mid-flight
        fillList(rows);
        check();
      });
    }

    breedEl.addEventListener('input', check);
    breedEl.addEventListener('change', check);
    if (speciesEl) speciesEl.addEventListener('change', refresh);
    refresh();

    return { refresh: refresh, current: function () { return matched; } };
  }

  global.PFBreeds = {
    SPECIES: SPECIES,
    fold: fold,
    normSpecies: normSpecies,
    speciesLabel: speciesLabel,
    load: load,
    resolve: resolve,
    breedName: breedName,
    displayBreed: displayBreed,
    searchText: searchText,
    bind: bind
  };
})(window);
