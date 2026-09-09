/* ============================================================
   PetFind — clinic schedule (migrations 0032 / 0033)

   Five views over one query. The data always comes from
   clinic_schedule(), never from clinic_work_items directly:
   RLS on that table shows a vet only their OWN patients, so a
   calendar built on it would show a theatre as free while a
   colleague had it booked. The RPC returns every slot and
   blanks the identity of the ones this vet may not see; rows
   with visible === false are drawn as "Occupied".
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const lang = () => (window.PFI18n && window.PFI18n.lang) || 'fr';
  const T = (en, fr) => lang() === 'fr' ? fr : en;

  // The working day drawn on the axis. Anything outside it still renders --
  // clamped into view rather than hidden, because a 06:00 emergency that the
  // calendar silently dropped would be the worst possible bug here.
  const DAY_START = 7, DAY_END = 21;
  const MINUTES = (DAY_END - DAY_START) * 60;
  const PX_PER_MIN = 1.05;

  const SERVICES = ['consultation', 'vaccination', 'surgery', 'emergency', 'grooming', 'teleconsultation'];
  const serviceLabel = s => ({
    consultation: T('Consultation', 'Consultation'), vaccination: T('Vaccination', 'Vaccination'),
    surgery: T('Surgery', 'Chirurgie'), emergency: T('Emergency', 'Urgence'),
    grooming: T('Grooming', 'Toilettage'), teleconsultation: T('Teleconsultation', 'Téléconsultation')
  }[s] || s || '');
  const statusLabel = s => ({
    scheduled: T('Scheduled', 'Planifié'), arrived: T('Arrived', 'Arrivé'),
    exam_1: T('Exam room 1', 'Consultation 1'), exam_2: T('Exam room 2', 'Consultation 2'),
    exam_3: T('Exam room 3', 'Consultation 3'), surgery: T('In surgery', 'Au bloc'),
    hospitalized: T('Hospitalised', 'Hospitalisé'), checkout: T('Ready for checkout', 'Prêt pour la sortie'),
    cancelled: T('Cancelled', 'Annulé'), no_show: T('No-show', 'Absent')
  }[s] || s || '');

  let clinics = [], rooms = [], staff = [], rows = [], epoch = 0;
  let view = 'day', anchor = startOfDay(new Date());

  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }
  function iso(d) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function hhmm(d) { const p = n => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); }
  function notice(msg, error) { $('cal-notice').textContent = msg || ''; $('cal-notice').classList.toggle('error', !!error); }

  function range() {
    if (view === 'week') { const from = startOfWeek(anchor); return { from, to: addDays(from, 7) }; }
    return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
  }

  function fail(e) {
    const map = {
      clinic_membership_required: T('You are not a member of this clinic.', "Vous n'êtes pas rattaché à cette clinique."),
      mfa_required: T('Verify your authenticator to open the schedule.', "Vérifiez votre authentificateur pour ouvrir l'agenda."),
      not_a_vet: T('This schedule is for veterinary accounts.', 'Cet agenda est réservé aux comptes vétérinaires.'),
      bad_range: T('That date range is not allowed.', "Cette plage de dates n'est pas autorisée.")
    };
    return map[e && e.message] || (e && e.message) || T('The schedule could not be loaded.', "L'agenda n'a pas pu être chargé.");
  }

  /* ---------- columns per view ---------- */
  function columns() {
    if (view === 'week') {
      const from = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(from, i);
        return { key: iso(d), label: d.toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), day: d };
      });
    }
    if (view === 'rooms') {
      const named = rooms.map(r => ({ key: 'room:' + r.id, label: r.name, roomId: r.id, roomName: r.name }));
      // Appointments typed as free text belong to no clinic_rooms row. They are
      // still real bookings, so they get their own column rather than vanishing.
      const extra = [];
      for (const row of rows) {
        if (row.room_id) continue;
        const name = (row.room || '').trim();
        if (!name || extra.some(c => c.roomName.toLowerCase() === name.toLowerCase())) continue;
        extra.push({ key: 'free:' + name.toLowerCase(), label: name + ' *', roomName: name, freeText: true });
      }
      const all = named.concat(extra);
      return all.length ? all : [{ key: 'all', label: T('No rooms yet', 'Aucune salle') }];
    }
    if (view === 'staff') {
      const seen = new Map();
      for (const m of staff) seen.set(m.vet_id, (m.profiles && m.profiles.full_name) || T('Practitioner', 'Praticien'));
      for (const row of rows) if (row.practitioner_id && !seen.has(row.practitioner_id)) seen.set(row.practitioner_id, row.practitioner || T('Practitioner', 'Praticien'));
      const cols = [...seen].map(([id, label]) => ({ key: 'vet:' + id, label, vetId: id }));
      return cols.length ? cols : [{ key: 'all', label: T('No practitioners', 'Aucun praticien') }];
    }
    if (view === 'surgery') {
      const theatres = rooms.filter(r => r.kind === 'surgery');
      const cols = theatres.map(r => ({ key: 'room:' + r.id, label: r.name, roomId: r.id, roomName: r.name }));
      return cols.length ? cols : [{ key: 'all', label: T('Surgery', 'Bloc') }];
    }
    return [{ key: 'all', label: anchor.toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) }];
  }

  function belongs(row, col) {
    if (col.key === 'all') return true;
    if (col.day) return iso(new Date(row.starts_at)) === col.key;
    if (col.vetId) return row.practitioner_id === col.vetId;
    if (col.roomId && row.room_id) return row.room_id === col.roomId;
    if (col.roomName) return (row.room || '').trim().toLowerCase() === col.roomName.toLowerCase();
    return false;
  }

  function visibleRows() {
    if (view !== 'surgery') return rows;
    // The surgery board is about the theatre, so it keeps anything booked as a
    // surgery OR sitting in a surgery room -- an emergency laparotomy booked as
    // "emergency" still belongs on the board.
    const theatreIds = new Set(rooms.filter(r => r.kind === 'surgery').map(r => r.id));
    return rows.filter(r => r.service === 'surgery' || r.status === 'surgery' || (r.room_id && theatreIds.has(r.room_id)));
  }

  /* ---------- rendering ---------- */
  function renderLegend() {
    const host = $('cal-legend'); host.replaceChildren();
    for (const s of SERVICES) {
      const chip = document.createElement('span');
      chip.className = 'cal-chip svc-' + s;
      chip.textContent = serviceLabel(s);
      host.append(chip);
    }
    const hidden = document.createElement('span');
    hidden.className = 'cal-chip svc-hidden';
    hidden.textContent = T('Occupied (another practitioner)', 'Occupé (autre praticien)');
    host.append(hidden);
  }

  function block(row) {
    const start = new Date(row.starts_at), end = new Date(row.ends_at);
    const dayTop = new Date(start); dayTop.setHours(DAY_START, 0, 0, 0);
    let top = (start - dayTop) / 60000;
    let height = (end - start) / 60000;
    // Clamp rather than drop: an out-of-hours emergency must still be visible.
    if (top < 0) { height += top; top = 0; }
    if (top > MINUTES) return null;
    if (top + height > MINUTES) height = MINUTES - top;
    if (height < 14) height = 14;

    // A 30-minute slot is ~32px tall, which is not enough for four stacked
    // lines -- the patient name, the thing a vet actually reads, was being
    // clipped. Short blocks switch to one line: time, then name, ellipsised.
    const compact = height * PX_PER_MIN < 52;
    const el = document.createElement(row.visible ? 'a' : 'div');
    el.className = 'cal-block ' + (row.visible ? 'svc-' + (row.service || 'consultation') : 'svc-hidden')
                 + (compact ? ' cal-compact' : '')
                 + (['cancelled', 'no_show'].includes(row.status) ? ' cal-void' : '');
    el.style.top = (top * PX_PER_MIN) + 'px';
    el.style.height = (height * PX_PER_MIN) + 'px';
    if (row.visible && row.pet_id) {
      el.href = 'record.html?pet=' + encodeURIComponent(row.pet_id);
    }
    const time = document.createElement('span'); time.className = 'cal-time';
    time.textContent = hhmm(start) + '–' + hhmm(end);
    const who = document.createElement('span'); who.className = 'cal-who';
    who.textContent = row.visible ? (row.pet_name || T('Patient', 'Patient')) : T('Occupied', 'Occupé');
    const meta = document.createElement('span'); meta.className = 'cal-meta';
    meta.textContent = [row.visible ? serviceLabel(row.service) : null, row.room, row.practitioner]
      .filter(Boolean).join(' · ');
    el.append(time, who);
    if (!compact) {
      el.append(meta);
      const status = document.createElement('span'); status.className = 'cal-status';
      status.textContent = statusLabel(row.status);
      el.append(status);
    }
    el.title = [hhmm(start) + '–' + hhmm(end), who.textContent, meta.textContent, statusLabel(row.status)]
      .filter(Boolean).join('\n');
    return el;
  }

  function render() {
    const grid = $('cal-grid'); grid.replaceChildren();
    const cols = columns(), data = visibleRows();
    $('cal-empty').hidden = data.length > 0;

    const axis = document.createElement('div'); axis.className = 'cal-axis';
    const axisHead = document.createElement('div'); axisHead.className = 'cal-colhead'; axis.append(axisHead);
    const axisBody = document.createElement('div'); axisBody.className = 'cal-axisbody';
    axisBody.style.height = (MINUTES * PX_PER_MIN) + 'px';
    for (let h = DAY_START; h <= DAY_END; h++) {
      const t = document.createElement('span'); t.className = 'cal-hour';
      t.style.top = ((h - DAY_START) * 60 * PX_PER_MIN) + 'px';
      t.textContent = String(h).padStart(2, '0') + ':00';
      axisBody.append(t);
    }
    axis.append(axisBody); grid.append(axis);

    const track = document.createElement('div'); track.className = 'cal-track';
    track.style.gridTemplateColumns = 'repeat(' + cols.length + ', minmax(140px, 1fr))';
    for (const col of cols) {
      const c = document.createElement('div'); c.className = 'cal-col';
      const head = document.createElement('div'); head.className = 'cal-colhead'; head.textContent = col.label;
      const body = document.createElement('div'); body.className = 'cal-colbody';
      body.style.height = (MINUTES * PX_PER_MIN) + 'px';
      for (let h = DAY_START; h <= DAY_END; h++) {
        const line = document.createElement('span'); line.className = 'cal-line';
        line.style.top = ((h - DAY_START) * 60 * PX_PER_MIN) + 'px';
        body.append(line);
      }
      const mine = data.filter(r => belongs(r, col));
      for (const row of mine) { const el = block(row); if (el) body.append(el); }
      c.append(head, body); track.append(c);
    }
    grid.append(track);

    const fmt = lang() === 'fr' ? 'fr-FR' : 'en-GB';
    if (view === 'week') {
      const from = startOfWeek(anchor);
      $('cal-title').textContent = from.toLocaleDateString(fmt, { day: 'numeric', month: 'short' })
        + ' – ' + addDays(from, 6).toLocaleDateString(fmt, { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
      $('cal-title').textContent = anchor.toLocaleDateString(fmt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const hiddenCount = rows.filter(r => !r.visible).length;
    $('cal-sub').textContent = data.length + ' ' + T('booking(s)', 'rendez-vous')
      + (hiddenCount ? ' · ' + hiddenCount + ' ' + T('not shared with you', 'non partagé(s) avec vous') : '');
  }

  /* ---------- loading ---------- */
  async function load() {
    const run = ++epoch, clinicId = $('cal-clinic').value;
    if (!clinicId) { notice(T('No clinic is linked to your account. An administrator must add you to one.', "Aucune clinique n'est rattachée à votre compte. Un administrateur doit vous y ajouter."), true); return; }
    notice(T('Loading the schedule…', "Chargement de l'agenda…"));
    try {
      const { from, to } = range();
      const [sched, rms, mates] = await Promise.all([
        PFVet.schedule(clinicId, from, to),
        PFVet.rooms(clinicId).catch(() => []),
        PFVet.colleagues(clinicId).catch(() => [])
      ]);
      if (run !== epoch) return;
      rows = sched; rooms = rms; staff = mates;
      render(); notice('');
    } catch (e) {
      if (run !== epoch) return;
      rows = []; render(); notice(fail(e), true);
    }
  }

  async function boot() {
    try {
      const user = await PFDB.getUser();
      if (!user) { $('cal').hidden = true; $('cal-signin').hidden = false; notice(T('Sign in to open the schedule.', "Connectez-vous pour ouvrir l'agenda.")); return; }
      $('logout').hidden = false;
      const who = await PFVet.vetIdentity();
      clinics = await PFVet.clinics();
      const list = $('cal-clinic'); list.replaceChildren();
      for (const row of clinics) {
        const o = document.createElement('option');
        o.value = row.clinic_id || (row.clinics && row.clinics.id) || '';
        o.textContent = (row.clinics && row.clinics.name) || T('Clinic', 'Clinique');
        if (o.value) list.append(o);
      else console.warn('PetFind: a clinic row arrived without an id and was skipped', row);
      }
      $('cal').hidden = false; $('cal-signin').hidden = true;
      $('cal-date').value = iso(anchor);
      renderLegend();
      await load();
    } catch (e) {
      $('cal').hidden = true; $('cal-signin').hidden = false;
      notice(fail(e), true);
    }
  }

  $('cal-view').addEventListener('change', () => { view = $('cal-view').value; render(); load(); });
  $('cal-clinic').addEventListener('change', load);
  $('cal-date').addEventListener('change', () => {
    const d = new Date($('cal-date').value + 'T12:00:00');
    if (!isNaN(d)) { anchor = startOfDay(d); load(); }
  });
  $('cal-prev').addEventListener('click', () => { anchor = addDays(anchor, view === 'week' ? -7 : -1); $('cal-date').value = iso(anchor); load(); });
  $('cal-next').addEventListener('click', () => { anchor = addDays(anchor, view === 'week' ? 7 : 1); $('cal-date').value = iso(anchor); load(); });
  $('cal-today').addEventListener('click', () => { anchor = startOfDay(new Date()); $('cal-date').value = iso(anchor); load(); });
  $('cal-refresh').addEventListener('click', load);
  $('logout').addEventListener('click', async () => {
    try { const r = await PFDB.signOut(); if (r.error) throw r.error; location.href = 'index.html'; }
    catch (e) { notice(T('Could not sign out. Please retry.', 'Déconnexion impossible. Réessayez.'), true); }
  });
  window.PFI18nOnChange = function () { renderLegend(); if (!$('cal').hidden) render(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !$('cal').hidden) load(); });

  if (window.PFDB && window.PFVet) boot();
  else notice(T('Cannot connect to PetFind. Check your connection and reload.', 'Connexion à PetFind impossible. Vérifiez votre connexion et rechargez la page.'), true);
})();
