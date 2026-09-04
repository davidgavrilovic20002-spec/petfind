/* ============================================================
   PetFind — Supabase client + data helpers (window.PFDB)
   The anon key is a PUBLIC client key: safe to ship in the site.
   All data is protected server-side by Row-Level Security.
   Requires supabase-js (loaded before this file).
   ============================================================ */
(function () {
  'use strict';

  // Social sign-in providers. Flip to true once configured in Supabase
  // (Google needs a free Google Cloud OAuth client; Apple needs a paid
  // Apple Developer account). Until then the buttons show "coming soon".
  var OAUTH = { google: true, apple: false };

  var SUPABASE_URL = 'https://pcbuyfnmzucywjtlodju.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnV5Zm5tenVjeXdqdGxvZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjQ0NzcsImV4cCI6MjEwNDEwMDQ3N30.AjVzj1bBn3eqcvEFPIvLKtPMfI5TxhWJk_cpcJT96BE';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[PetFind] supabase-js failed to load — online features are unavailable.');
    window.PFDB = null;
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  async function currentUser() {
    var res = await client.auth.getUser();
    return (res && res.data) ? res.data.user : null;
  }

  // Normalize sex to the canonical values the database accepts.
  function normSex(v) {
    if (!v) return null;
    v = String(v).toLowerCase();
    return (v === 'female' || v === 'male' || v === 'unknown') ? v : null;
  }

  // Build the profile-update object from owner fields (only defined keys).
  function ownerFields(data) {
    var f = {};
    if (data.ownerName != null) f.full_name = data.ownerName;
    if (data.ownerPhone != null) f.phone = data.ownerPhone;
    return f;
  }

  var PFDB = {
    client: client,
    url: SUPABASE_URL,

    /* ---------- auth ---------- */
    // marketingOptIn is stored in user metadata; the handle_new_user() trigger
    // copies it onto the profile (→ marketing_contacts mailing list, GDPR).
    signUp: function (email, password, fullName, marketingOptIn) {
      return client.auth.signUp({
        email: email, password: password,
        options: {
          data: { full_name: fullName || '', marketing_opt_in: !!marketingOptIn },
          emailRedirectTo: window.location.origin +
            window.location.pathname.replace(/[^/]*$/, 'account.html')
        }
      });
    },
    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password });
    },
    signOut: function () { return client.auth.signOut(); },
    oauthEnabled: function (provider) { return OAUTH[provider] === true; },
    signInWithOAuth: function (provider) {
      return client.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, 'account.html') }
      });
    },
    resetPassword: function (email) {
      return client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin +
          window.location.pathname.replace(/[^/]*$/, 'account.html')
      });
    },
    getUser: currentUser,
    onAuth: function (cb) { return client.auth.onAuthStateChange(cb); },

    /* ---------- profile ---------- */
    getProfile: async function () {
      var user = await currentUser();
      if (!user) return { data: null };
      return client.from('profiles').select('*').eq('id', user.id).single();
    },
    updateProfile: async function (fields) {
      var user = await currentUser();
      if (!user) return { error: { message: 'Not signed in' } };
      return client.from('profiles').update(fields).eq('id', user.id);
    },

    /* ---------- pets ---------- */
    listPets: function () {
      return client.from('pets')
        .select('id,name,species,breed,sex,age,created_at,' +
                'pet_tags(public_slug,status),' +
                'pet_public_profile(show_phone,home_message,finder_steps,backup_vet)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    },
    getPet: function (id) {
      return client.from('pets')
        .select('*, pet_tags(public_slug,status), pet_public_profile(*)')
        .eq('id', id).single();
    },

    // Create pet + tag + public profile, and save owner name/phone on the profile.
    // Returns { data: { id, slug } } or { error }.
    createPet: async function (data) {
      var user = await currentUser();
      if (!user) return { error: { message: 'Not signed in' } };

      var of = ownerFields(data);
      if (Object.keys(of).length) {
        var pr = await client.from('profiles').update(of).eq('id', user.id);
        if (pr.error) return pr;
      }

      var petRes = await client.from('pets').insert({
        owner_id: user.id,
        name: data.name || '', species: data.species || null,
        breed: data.breed || null, sex: normSex(data.sex), age: data.age || null
      }).select('id').single();
      if (petRes.error) return petRes;
      var petId = petRes.data.id;

      var tagRes = await client.from('pet_tags')
        .insert({ pet_id: petId, kind: 'qr', status: 'active' })
        .select('public_slug').single();
      if (tagRes.error) return tagRes;

      var pubRes = await client.from('pet_public_profile').insert({
        pet_id: petId,
        show_phone: data.showPhone !== false,
        home_message: data.hasHome !== false,
        finder_steps: data.steps || [],
        backup_vet: (data.vet && data.vet.name) ? data.vet : null
      });
      if (pubRes.error) return pubRes;

      return { data: { id: petId, slug: tagRes.data.public_slug } };
    },

    // Update an existing pet + its public profile + owner contact.
    updatePet: async function (id, data) {
      var user = await currentUser();
      if (!user) return { error: { message: 'Not signed in' } };

      var of = ownerFields(data);
      if (Object.keys(of).length) { await client.from('profiles').update(of).eq('id', user.id); }

      var petRes = await client.from('pets').update({
        name: data.name || '', species: data.species || null,
        breed: data.breed || null, sex: normSex(data.sex), age: data.age || null
      }).eq('id', id);
      if (petRes.error) return petRes;

      // public profile may not exist yet → upsert on pet_id.
      var pubRes = await client.from('pet_public_profile').upsert({
        pet_id: id,
        show_phone: data.showPhone !== false,
        home_message: data.hasHome !== false,
        finder_steps: data.steps || [],
        backup_vet: (data.vet && data.vet.name) ? data.vet : null
      }, { onConflict: 'pet_id' });
      return pubRes;
    },

    // Slug for an existing pet (first active tag).
    slugForPet: function (pet) {
      if (!pet || !pet.pet_tags || !pet.pet_tags.length) return null;
      var t = pet.pet_tags.find(function (x) { return x.status === 'active'; }) || pet.pet_tags[0];
      return t ? t.public_slug : null;
    },

    /* ---------- trial ----------
       Every account gets a 1-hour free "preview" window from sign-up. During
       it they can design a tag and see the finder page + a watermarked QR, but
       no live scannable tag is issued until they get a real PetFind tag. */
    TRIAL_MS: 60 * 60 * 1000,   // 1 hour
    // Returns {startedAt, expiresAt, remainingMs, active} or null if signed out.
    trialInfo: async function () {
      var prof = await this.getProfile();
      if (!prof || !prof.data) return null;
      // Fall back to created_at if the 0004 migration column isn't there yet.
      var startIso = prof.data.trial_started_at || prof.data.created_at;
      var start = startIso ? new Date(startIso).getTime() : Date.now();
      var end = start + this.TRIAL_MS;
      var remaining = end - Date.now();
      return { startedAt: start, expiresAt: end, remainingMs: remaining, active: remaining > 0 };
    },

    /* ---------- commerce ---------- */
    // List this account's orders (newest first).
    listOrders: async function () {
      var user = await currentUser();
      if (!user) return { data: [] };
      return client.from('orders').select('*').eq('owner_id', user.id)
        .order('created_at', { ascending: false });
    },
    // The active subscription row, if any.
    getSubscription: async function () {
      var user = await currentUser();
      if (!user) return { data: null };
      return client.from('subscriptions').select('*').eq('owner_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
    },
    // True once the account has any tag it can activate (i.e. has been through
    // checkout / holds a physical tag). Used to unlock "activate" in the builder.
    hasEntitlement: async function () {
      var res = await this.listOrders();
      return !!(res.data && res.data.length);
    },

    // Demo checkout: record a pending order (no card charged yet) and mint a
    // tag to "ship". Returns { order, tag:{tag_uid, claim_secret, public_slug} }.
    createOrder: async function (data) {
      var user = await currentUser();
      if (!user) return { error: { message: 'Not signed in' } };

      // Mint the physical tag (independent of the order — a shop-bought tag is
      // claimed the same way). issue_demo_tag stands in for real fulfilment.
      var tagRes = await client.rpc('issue_demo_tag');
      if (tagRes.error) return tagRes;
      var tag = Array.isArray(tagRes.data) ? tagRes.data[0] : tagRes.data;

      var orderRes = await client.from('orders').insert({
        owner_id: user.id,
        email: data.email || user.email || null,
        full_name: data.fullName || null,
        shipping_address: data.address || null,
        plan: data.plan || 'tag',
        subscription_opt_in: data.subscription === true,
        items: [{ sku: 'petfind-tag', qty: 1 }],
        currency: 'eur',
        status: 'pending',
        tag_uid: tag ? tag.tag_uid : null
      }).select('*').single();
      if (orderRes.error) return orderRes;

      // If they opted into the subscription, record the intent (free until
      // Stripe is wired; the plan stays 'free' with status 'trialing').
      if (data.subscription === true) {
        await client.from('subscriptions').insert({
          owner_id: user.id, plan: 'free', status: 'pending'
        });
      }
      return { data: { order: orderRes.data, tag: tag } };
    },

    // Claim/activate a tag with its printed unique code ("set it up at home").
    // Returns { data: { pet_id, slug } }. Idempotent for the owner.
    claimTag: async function (tagUid, secret) {
      var user = await currentUser();
      if (!user) return { error: { message: 'Not signed in' } };
      var res = await client.rpc('claim_tag', { p_tag_uid: tagUid, p_secret: secret });
      if (res.error) return res;
      var row = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!row) return { error: { message: 'invalid setup link' } };
      return { data: { pet_id: row.pet_id, slug: row.public_slug } };
    },

    /* ---------- url helpers ---------- */
    petUrl: function (slug) {
      return new URL('pet.html', window.location.href).href
        .replace(/[^/]*$/, 'pet.html') + '?s=' + encodeURIComponent(slug);
    },
    setupUrl: function (tagUid, secret) {
      return new URL('setup.html', window.location.href).href
        .replace(/[^/]*$/, 'setup.html') +
        '?t=' + encodeURIComponent(tagUid) + '&k=' + encodeURIComponent(secret);
    },

    /* ---------- public QR page ---------- */
    getPublicPet: function (slug) {
      return client.rpc('get_public_pet', { p_slug: slug });
    }
  };

  window.PFDB = PFDB;
})();
