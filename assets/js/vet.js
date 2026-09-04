/* ============================================================
   PetFind — nearest vet finder
   Uses the finder's live location (with permission) + OpenStreetMap
   Overpass API to show the nearest veterinary clinic. No API key,
   no cost. Falls back to the owner-provided vet, then to a plain
   "search near me" map link if location is unavailable.
   ============================================================ */
(function (global) {
  'use strict';

  var OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter' // backup mirror
  ];

  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function fmtDist(m) {
    if (m < 1000) return Math.round(m / 10) * 10 + ' m';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
  }

  function addressOf(tags) {
    var parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    var line = parts.join(' ');
    if (tags['addr:city']) line += (line ? ', ' : '') + tags['addr:city'];
    return line;
  }

  function queryOverpass(lat, lon, radius) {
    var q = '[out:json][timeout:20];(' +
      'node["amenity"="veterinary"](around:' + radius + ',' + lat + ',' + lon + ');' +
      'way["amenity"="veterinary"](around:' + radius + ',' + lat + ',' + lon + ');' +
      ');out center 30;';
    var body = 'data=' + encodeURIComponent(q);
    // Try mirrors in order.
    function tryHost(i) {
      if (i >= OVERPASS.length) return Promise.reject(new Error('overpass unavailable'));
      return fetch(OVERPASS[i], { method: 'POST', body: body })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .catch(function () { return tryHost(i + 1); });
    }
    return tryHost(0);
  }

  function nearestFrom(elements, lat, lon) {
    var best = null;
    elements.forEach(function (el) {
      var elat = el.lat || (el.center && el.center.lat);
      var elon = el.lon || (el.center && el.center.lon);
      if (elat == null || elon == null) return;
      var tags = el.tags || {};
      if (!tags.name) return; // skip unnamed
      var d = haversine(lat, lon, elat, elon);
      if (!best || d < best.dist) {
        best = {
          name: tags.name,
          address: addressOf(tags),
          phone: tags.phone || tags['contact:phone'] || '',
          lat: elat, lon: elon, dist: d
        };
      }
    });
    return best;
  }

  /* Public: find nearest vet from a coordinate. */
  function findNearest(lat, lon) {
    var radii = [3000, 8000, 20000];
    function attempt(i) {
      if (i >= radii.length) return Promise.resolve(null);
      return queryOverpass(lat, lon, radii[i]).then(function (data) {
        var best = nearestFrom((data && data.elements) || [], lat, lon);
        return best || attempt(i + 1);
      });
    }
    return attempt(0);
  }

  /* Public: get the finder's location (returns a Promise). */
  function getLocation() {
    return new Promise(function (resolve, reject) {
      if (!global.navigator || !navigator.geolocation) return reject(new Error('no geolocation'));
      navigator.geolocation.getCurrentPosition(
        function (pos) { resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
        function (err) { reject(err); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  global.PetVet = {
    findNearest: findNearest,
    getLocation: getLocation,
    fmtDist: fmtDist
  };
})(window);
