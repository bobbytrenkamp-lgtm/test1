/* Auth manager singleton — window.AUTH
 * Requires: window.supabase (Supabase UMD CDN bundle), window.APP_CONFIG
 * Dispatches custom DOM events on document:
 *   auth:stateChange  { state, user, profile }
 *   auth:preferenceSync { key, value }
 *
 * Security contract:
 *   - Only the public anon key is used (set in supabase-config.js)
 *   - Never reads or writes passwords, service-role keys, or secrets
 *   - User-supplied data is never passed to innerHTML
 *   - user_id is always read from the server session, never from the DOM
 */
(function () {
  'use strict';

  // Preference keys kept in sync between localStorage and Supabase cloud.
  const PREF_KEYS = [
    'theme',
    'aiPolicyTracker.stockFavorites.v1',
    'dc-map-bookmarks-v1'
  ];

  let _client = null;
  let _state  = 'loading'; // 'loading' | 'signedOut' | 'signedIn' | 'resettingPassword'
  let _user   = null;
  let _profile = null;

  // ── Events ─────────────────────────────────────────────────────

  function dispatch(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail: detail || {} }));
  }

  function setState(newState, user, profile) {
    _state   = newState;
    _user    = user   || null;
    _profile = profile || null;
    dispatch('auth:stateChange', { state: newState, user: _user, profile: _profile });
  }

  // ── Profile ────────────────────────────────────────────────────

  async function fetchProfile(userId) {
    try {
      const { data } = await _client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data || null;
    } catch (_) {
      return null;
    }
  }

  // ── Preference sync ────────────────────────────────────────────

  async function syncPrefsOnLogin(userId) {
    let cloudRows;
    try {
      const { data } = await _client
        .from('user_preferences')
        .select('key, value, updated_at')
        .eq('user_id', userId);
      cloudRows = data || [];
    } catch (_) {
      return; // table may not exist yet — skip silently
    }

    const cloud = {};
    cloudRows.forEach(function (r) { cloud[r.key] = r; });

    const upserts = [];

    PREF_KEYS.forEach(function (key) {
      const localRaw = localStorage.getItem(key);
      const cloudRow = cloud[key];

      if (cloudRow) {
        // Cloud has this pref — it is authoritative on sign-in.
        // Write it back to localStorage and notify listeners.
        const val = cloudRow.value;
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        localStorage.setItem(key, str);
        dispatch('auth:preferenceSync', { key: key, value: val });
      } else if (localRaw !== null) {
        // Local has this pref, cloud doesn't — upload to cloud.
        let parsed;
        try { parsed = JSON.parse(localRaw); } catch (_) { parsed = localRaw; }
        upserts.push({
          user_id: userId,
          key: key,
          value: parsed,
          updated_at: new Date().toISOString()
        });
      }
    });

    if (upserts.length) {
      try {
        await _client
          .from('user_preferences')
          .upsert(upserts, { onConflict: 'user_id,key' });
      } catch (_) { /* non-fatal */ }
    }
  }

  // ── Public: set preference ─────────────────────────────────────

  async function setPreference(key, value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, str);

    if (_state === 'signedIn' && _client && _user) {
      try {
        await _client
          .from('user_preferences')
          .upsert(
            { user_id: _user.id, key: key, value: value, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,key' }
          );
      } catch (_) { /* non-fatal */ }
    }
  }

  // ── Public: saved items ────────────────────────────────────────

  async function getSavedItems(type) {
    if (!_client || !_user) return [];
    try {
      const { data } = await _client
        .from('saved_items')
        .select('*')
        .eq('user_id', _user.id)
        .eq('type', type)
        .order('created_at', { ascending: false });
      return data || [];
    } catch (_) {
      return [];
    }
  }

  async function saveItem(type, itemId, itemData, notes) {
    if (!_client || !_user) return { error: { message: 'Not signed in' } };
    try {
      const { data, error } = await _client
        .from('saved_items')
        .upsert(
          { user_id: _user.id, type: type, item_id: itemId,
            item_data: itemData || {}, notes: notes || null },
          { onConflict: 'user_id,type,item_id' }
        );
      return { data: data, error: error };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  async function removeItem(type, itemId) {
    if (!_client || !_user) return { error: { message: 'Not signed in' } };
    try {
      const { error } = await _client
        .from('saved_items')
        .delete()
        .eq('user_id', _user.id)
        .eq('type', type)
        .eq('item_id', itemId);
      return { error: error };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  // ── Public: auth actions ───────────────────────────────────────

  async function signIn(email, password) {
    if (!_client) return { error: { message: 'Auth not configured' } };
    try {
      return await _client.auth.signInWithPassword({ email: email, password: password });
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  async function signUp(email, password, displayName) {
    if (!_client) return { error: { message: 'Auth not configured' } };
    try {
      return await _client.auth.signUp({
        email: email,
        password: password,
        options: { data: { display_name: displayName || '' } }
      });
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  async function signOut() {
    if (!_client) return;
    try { await _client.auth.signOut(); } catch (_) { /* still clear state */ }
  }

  async function resetPassword(email) {
    if (!_client) return { error: { message: 'Auth not configured' } };
    try {
      const { error } = await _client.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://bobbytrenkamp-lgtm.github.io/test1/'
      });
      return { error: error };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  async function updatePassword(newPassword) {
    if (!_client) return { error: { message: 'Auth not configured' } };
    try {
      const { error } = await _client.auth.updateUser({ password: newPassword });
      return { error: error };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  async function updateProfile(updates) {
    if (!_client || !_user) return { error: { message: 'Not signed in' } };
    try {
      const { data, error } = await _client
        .from('profiles')
        .update(Object.assign({}, updates, { updated_at: new Date().toISOString() }))
        .eq('id', _user.id)
        .select()
        .single();
      if (!error && data) _profile = data;
      return { data: data, error: error };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  // ── Init ───────────────────────────────────────────────────────

  function init() {
    if (typeof window.supabase === 'undefined') {
      console.warn('[Auth] Supabase library not loaded — authentication disabled');
      setState('signedOut');
      return;
    }

    var cfg = window.APP_CONFIG;
    if (!cfg ||
        !cfg.SUPABASE_URL ||
        cfg.SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
        !cfg.SUPABASE_ANON_KEY ||
        cfg.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      console.info('[Auth] Supabase not yet configured — see SUPABASE_SETUP.md');
      setState('signedOut');
      return;
    }

    try {
      _client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession:     true,
          autoRefreshToken:   true,
          detectSessionInUrl: true
        }
      });
    } catch (e) {
      console.error('[Auth] Failed to create Supabase client:', e);
      setState('signedOut');
      return;
    }

    _client.auth.onAuthStateChange(async function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        setState('resettingPassword', session ? session.user : null);
        return;
      }

      if (event === 'USER_UPDATED' && session && session.user) {
        // Password reset completed — transition back to signed-in
        var profile = await fetchProfile(session.user.id);
        setState('signedIn', session.user, profile);
        return;
      }

      if (session && session.user) {
        var profile = await fetchProfile(session.user.id);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await syncPrefsOnLogin(session.user.id);
        }
        setState('signedIn', session.user, profile);
      } else {
        setState('signedOut');
      }
    });

    // Kick off initial session check so state resolves quickly
    _client.auth.getSession().then(function (res) {
      if (!res.data || !res.data.session) {
        // No active session; onAuthStateChange will fire INITIAL_SESSION(null)
        // but setState signedOut here as a fast path
        if (_state === 'loading') setState('signedOut');
      }
    }).catch(function () {
      if (_state === 'loading') setState('signedOut');
    });
  }

  // ── Public API ─────────────────────────────────────────────────

  window.AUTH = {
    get state()      { return _state; },
    get user()       { return _user; },
    get profile()    { return _profile; },
    get configured() { return _client !== null; },
    signIn:          signIn,
    signUp:          signUp,
    signOut:         signOut,
    resetPassword:   resetPassword,
    updatePassword:  updatePassword,
    updateProfile:   updateProfile,
    setPreference:   setPreference,
    getSavedItems:   getSavedItems,
    saveItem:        saveItem,
    removeItem:      removeItem
  };

  // Deferred scripts run after DOM parsing (readyState === 'interactive').
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
