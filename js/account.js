/* Account / Auth UI
 * Requires: window.AUTH (from js/auth.js)
 * Manages: auth modal (sign-in / sign-up / forgot password)
 *           account slide-in panel (profile / preferences / saved / security)
 *
 * Security: all user-supplied data is written via textContent — no innerHTML
 *            with untrusted input anywhere in this file.
 */
(function () {
  'use strict';

  var _inResetMode = false;
  var _acctTab     = 'profile';

  // ── DOM refs (populated in init) ─────────────────────────────────
  var authBtn, authModalOverlay, authModal, acctPanelOverlay, acctPanel;

  // ── Utility ──────────────────────────────────────────────────────

  function initials(displayName, email) {
    var name = (displayName || '').trim();
    if (name) {
      var parts = name.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return '?';
  }

  function trapFocus(container, e) {
    var sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    var focusable = Array.from(container.querySelectorAll(sel)).filter(function (el) {
      return !el.closest('[hidden]') && el.offsetParent !== null;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  // ── Header auth button ────────────────────────────────────────────

  var PERSON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function updateAuthBtn(state, profile, user) {
    if (!authBtn) return;
    var configured = window.AUTH && window.AUTH.configured;
    if (!configured || state === 'loading') {
      authBtn.hidden = true;
      return;
    }
    authBtn.hidden = false;
    if (state === 'signedIn' || state === 'resettingPassword') {
      var ini = initials(
        profile && profile.display_name,
        user && user.email
      );
      authBtn.classList.add('signed-in');
      authBtn.setAttribute('aria-label', 'My account');
      authBtn.setAttribute('title', 'My account');
      authBtn.textContent = ini;
    } else {
      authBtn.classList.remove('signed-in');
      authBtn.setAttribute('aria-label', 'Sign in');
      authBtn.setAttribute('title', 'Sign in');
      authBtn.innerHTML = PERSON_SVG;
    }
  }

  // ── Auth modal ────────────────────────────────────────────────────

  function openAuthModal(page) {
    showModalPage(page || 'signin');
    clearModalMessages();
    authModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    var firstInput = authModal.querySelector('.auth-page.active input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 80);
  }

  function closeAuthModal() {
    authModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showModalPage(page) {
    authModal.querySelectorAll('.auth-page').forEach(function (el) {
      el.classList.remove('active');
    });
    var pg = document.getElementById('auth-page-' + page);
    if (pg) pg.classList.add('active');
    var titles = { signin: 'Sign In', signup: 'Create Account', forgot: 'Reset Password' };
    var h = authModal.querySelector('.auth-modal-head h2');
    if (h) h.textContent = titles[page] || 'Account';
    clearModalMessages();
  }

  function clearModalMessages() {
    authModal.querySelectorAll('.auth-error, .auth-success').forEach(function (el) {
      el.classList.remove('visible');
      el.textContent = '';
    });
  }

  function showModalError(pageId, msg) {
    var el = authModal.querySelector('#auth-page-' + pageId + ' .auth-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  function showModalSuccess(pageId, msg) {
    var el = authModal.querySelector('#auth-page-' + pageId + ' .auth-success');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  function setModalSubmitting(pageId, on, idleLabel) {
    var btn = authModal.querySelector('#auth-page-' + pageId + ' .auth-submit');
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? 'Please wait…' : idleLabel;
  }

  function friendlyError(msg) {
    if (!msg) return 'Something went wrong. Please try again.';
    var m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password')) {
      return 'Incorrect email or password.';
    }
    if (m.includes('email not confirmed')) {
      return 'Please check your inbox and confirm your email address first.';
    }
    if (m.includes('already registered') || m.includes('user already exists')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (m.includes('password should be at least')) {
      return 'Password must be at least 8 characters.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Too many attempts — please wait a moment and try again.';
    }
    if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
      return 'Network error. Check your connection and try again.';
    }
    return msg;
  }

  // Sign-in form
  function bindSignIn() {
    var form = document.getElementById('auth-page-signin');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearModalMessages();
      var email    = document.getElementById('auth-signin-email').value.trim();
      var password = document.getElementById('auth-signin-password').value;
      if (!email)    { showModalError('signin', 'Email is required.'); return; }
      if (!password) { showModalError('signin', 'Password is required.'); return; }
      setModalSubmitting('signin', true, 'Sign In');
      var res = await window.AUTH.signIn(email, password);
      setModalSubmitting('signin', false, 'Sign In');
      if (res.error) {
        showModalError('signin', friendlyError(res.error.message));
      } else {
        closeAuthModal();
      }
    });
    var forgotLink = document.getElementById('auth-forgot-link');
    if (forgotLink) forgotLink.addEventListener('click', function () { showModalPage('forgot'); });
    var signupLink = document.getElementById('auth-signup-link');
    if (signupLink) signupLink.addEventListener('click', function () { showModalPage('signup'); });
  }

  // Sign-up form
  function bindSignUp() {
    var form = document.getElementById('auth-page-signup');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearModalMessages();
      var name  = document.getElementById('auth-signup-name').value.trim();
      var email = document.getElementById('auth-signup-email').value.trim();
      var pw    = document.getElementById('auth-signup-password').value;
      var pw2   = document.getElementById('auth-signup-password2').value;
      if (!name)         { showModalError('signup', 'Display name is required.'); return; }
      if (!email)        { showModalError('signup', 'Email is required.'); return; }
      if (!pw || pw.length < 8) { showModalError('signup', 'Password must be at least 8 characters.'); return; }
      if (pw !== pw2)    { showModalError('signup', 'Passwords do not match.'); return; }
      setModalSubmitting('signup', true, 'Create Account');
      var res = await window.AUTH.signUp(email, pw, name);
      setModalSubmitting('signup', false, 'Create Account');
      if (res.error) {
        showModalError('signup', friendlyError(res.error.message));
      } else {
        showModalSuccess('signup', 'Account created! Check your inbox to confirm your email, then sign in.');
        setTimeout(function () { showModalPage('signin'); }, 4000);
      }
    });
    var signinLink = document.getElementById('auth-signin-link2');
    if (signinLink) signinLink.addEventListener('click', function () { showModalPage('signin'); });
  }

  // Forgot-password form
  function bindForgotPassword() {
    var form = document.getElementById('auth-page-forgot');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearModalMessages();
      var email = document.getElementById('auth-forgot-email').value.trim();
      if (!email) { showModalError('forgot', 'Email is required.'); return; }
      setModalSubmitting('forgot', true, 'Send Reset Link');
      var res = await window.AUTH.resetPassword(email);
      setModalSubmitting('forgot', false, 'Send Reset Link');
      if (res.error) {
        showModalError('forgot', friendlyError(res.error.message));
      } else {
        showModalSuccess('forgot', 'Reset link sent — check your inbox (and spam folder).');
      }
    });
    var backLink = document.getElementById('auth-back-link');
    if (backLink) backLink.addEventListener('click', function () { showModalPage('signin'); });
  }

  // ── Account panel ─────────────────────────────────────────────────

  function openAccountPanel() {
    renderPanelHeader();
    acctPanelOverlay.classList.add('open');
    acctPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAccountPanel() {
    acctPanelOverlay.classList.remove('open');
    acctPanel.classList.remove('open');
    document.body.style.overflow = '';
  }

  function switchAcctTab(tab) {
    _acctTab = tab;
    acctPanel.querySelectorAll('.acct-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
      btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
    });
    acctPanel.querySelectorAll('.acct-panel-tab').forEach(function (el) {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    if (tab === 'saved')       loadSavedItems();
    if (tab === 'preferences') syncPrefsTab();
  }

  function renderPanelHeader() {
    var user    = window.AUTH && window.AUTH.user;
    var profile = window.AUTH && window.AUTH.profile;
    var avatar  = acctPanel.querySelector('.acct-avatar');
    var nameEl  = acctPanel.querySelector('.acct-display-name');
    var emailEl = acctPanel.querySelector('.acct-email');
    if (avatar)  avatar.textContent = initials(profile && profile.display_name, user && user.email);
    if (nameEl)  nameEl.textContent = (profile && profile.display_name) || (user && user.email) || 'Account';
    if (emailEl) emailEl.textContent = (user && user.email) || '';

    var nameInput  = document.getElementById('acct-display-name-input');
    var emailInput = document.getElementById('acct-email-input');
    if (nameInput)  nameInput.value  = (profile && profile.display_name) || '';
    if (emailInput) emailInput.value = (user && user.email) || '';
  }

  // Profile form
  function bindProfileSave() {
    var form = document.getElementById('acct-profile-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nameInput = document.getElementById('acct-display-name-input');
      var fb        = document.getElementById('acct-profile-feedback');
      if (!nameInput || !fb) return;
      var displayName = nameInput.value.trim();
      if (!displayName) {
        fb.textContent = 'Display name cannot be empty.';
        fb.className   = 'acct-feedback err';
        return;
      }
      var saveBtn = form.querySelector('.acct-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
      var res = await window.AUTH.updateProfile({ display_name: displayName });
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
      if (res.error) {
        fb.textContent = 'Failed to save: ' + res.error.message;
        fb.className   = 'acct-feedback err';
      } else {
        fb.textContent = 'Saved.';
        fb.className   = 'acct-feedback ok';
        var nameEl = acctPanel.querySelector('.acct-display-name');
        var avatar = acctPanel.querySelector('.acct-avatar');
        if (nameEl) nameEl.textContent = displayName;
        if (avatar) avatar.textContent = initials(displayName, window.AUTH.user && window.AUTH.user.email);
        updateAuthBtn('signedIn', { display_name: displayName }, window.AUTH.user);
        setTimeout(function () { fb.className = 'acct-feedback'; }, 3000);
      }
    });
  }

  // Password change form
  function bindPasswordChange() {
    var form = document.getElementById('acct-password-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pw  = document.getElementById('acct-new-password');
      var pw2 = document.getElementById('acct-new-password2');
      var fb  = document.getElementById('acct-password-feedback');
      if (!pw || !pw2 || !fb) return;
      if (!pw.value || pw.value.length < 8) {
        fb.textContent = 'Password must be at least 8 characters.';
        fb.className   = 'acct-feedback err';
        return;
      }
      if (pw.value !== pw2.value) {
        fb.textContent = 'Passwords do not match.';
        fb.className   = 'acct-feedback err';
        return;
      }
      var saveBtn = form.querySelector('.acct-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Updating…'; }
      var res = await window.AUTH.updatePassword(pw.value);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Update Password'; }
      if (res.error) {
        fb.textContent = 'Failed: ' + res.error.message;
        fb.className   = 'acct-feedback err';
      } else {
        fb.textContent = 'Password updated.';
        fb.className   = 'acct-feedback ok';
        pw.value = '';
        pw2.value = '';
        // Exit reset mode
        _inResetMode = false;
        var notice = document.getElementById('acct-reset-notice');
        if (notice) notice.hidden = true;
        setTimeout(function () { fb.className = 'acct-feedback'; }, 3000);
      }
    });
  }

  // Sign-out button
  function bindSignOut() {
    var btn = document.getElementById('acct-signout-btn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      await window.AUTH.signOut();
      btn.disabled = false;
      closeAccountPanel();
    });
  }

  // ── Preferences tab ───────────────────────────────────────────────

  function syncPrefsTab() {
    var sel = document.getElementById('acct-theme-select');
    if (!sel) return;
    sel.value = localStorage.getItem('theme') || 'system';
  }

  function bindPreferencesTab() {
    var sel = document.getElementById('acct-theme-select');
    if (!sel) return;
    sel.addEventListener('change', function () {
      applyThemeValue(sel.value);
    });
  }

  function applyThemeValue(val) {
    // Delegate to map.js's applyTheme if exposed, otherwise handle ourselves
    if (typeof window._applyTheme === 'function') {
      window._applyTheme(val);
      localStorage.setItem('theme', val);
    } else {
      var el = document.documentElement;
      var light = val === 'light' || (val === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
      if (val === 'system') el.removeAttribute('data-theme');
      else el.setAttribute('data-theme', val);
      el.classList.toggle('is-light-theme', light);
      localStorage.setItem('theme', val);
    }
    if (window.AUTH) {
      window.AUTH.setPreference('theme', val);
    }
  }

  // ── Saved items ───────────────────────────────────────────────────

  async function loadSavedItems() {
    if (!window.AUTH || window.AUTH.state !== 'signedIn') return;
    var container = document.getElementById('acct-saved-content');
    if (!container) return;

    container.innerHTML = '';
    var loader = document.createElement('div');
    loader.className = 'acct-loading';
    loader.innerHTML = '<div class="spinner"></div>';
    container.appendChild(loader);

    var types      = ['county', 'article', 'stock'];
    var typeLabels = { county: 'Saved Counties', article: 'Saved Articles', stock: 'Watchlist' };
    var typeIcons  = {
      county:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
      article: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2z"/><path d="M18 14h-8"/></svg>',
      stock:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>'
    };

    // Fetch all types in parallel
    var results = await Promise.all(types.map(function (t) {
      return window.AUTH.getSavedItems(t);
    }));

    container.innerHTML = '';

    var totalCount = results.reduce(function (sum, arr) { return sum + arr.length; }, 0);

    if (totalCount === 0) {
      var empty = document.createElement('div');
      empty.className = 'acct-empty-state';
      empty.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      var p1 = document.createElement('p');
      p1.textContent = 'No saved items yet.';
      var p2 = document.createElement('p');
      p2.textContent = 'Counties, articles, and stocks can be saved for quick access.';
      empty.appendChild(p1);
      empty.appendChild(p2);
      container.appendChild(empty);
      return;
    }

    types.forEach(function (type, idx) {
      var items = results[idx];
      if (!items.length) return;

      var section = document.createElement('div');
      section.className = 'acct-section';

      var labelEl = document.createElement('div');
      labelEl.className = 'acct-section-label';
      labelEl.textContent = typeLabels[type];
      section.appendChild(labelEl);

      items.forEach(function (item) {
        var data = item.item_data || {};

        var wrap = document.createElement('div');
        wrap.className = 'acct-saved-item';

        var iconWrap = document.createElement('div');
        iconWrap.className = 'acct-saved-icon';
        iconWrap.innerHTML = typeIcons[type]; // SVG constant — not user data

        var content = document.createElement('div');
        content.className = 'acct-saved-content';

        var titleEl = document.createElement('div');
        titleEl.className = 'acct-saved-title';
        titleEl.textContent = data.name || data.title || item.item_id; // textContent

        content.appendChild(titleEl);

        var subText = data.state || data.source || data.ticker || '';
        if (subText) {
          var subEl = document.createElement('div');
          subEl.className = 'acct-saved-sub';
          subEl.textContent = subText; // textContent
          content.appendChild(subEl);
        }

        var removeBtn = document.createElement('button');
        removeBtn.className = 'acct-saved-remove';
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.textContent = '×';

        (function (t, id, el, sec) {
          removeBtn.addEventListener('click', async function () {
            removeBtn.disabled = true;
            await window.AUTH.removeItem(t, id);
            el.remove();
            if (!sec.querySelector('.acct-saved-item')) sec.remove();
            var remaining = container.querySelectorAll('.acct-saved-item').length;
            if (!remaining) loadSavedItems(); // reload to show empty state
          });
        }(type, item.item_id, wrap, section));

        wrap.appendChild(iconWrap);
        wrap.appendChild(content);
        wrap.appendChild(removeBtn);
        section.appendChild(wrap);
      });

      container.appendChild(section);
    });
  }

  // ── Reset-password mode ───────────────────────────────────────────

  function enterResetMode() {
    _inResetMode = true;
    openAccountPanel();
    switchAcctTab('security');
    var notice = document.getElementById('acct-reset-notice');
    if (notice) notice.hidden = false;
    var pw = document.getElementById('acct-new-password');
    if (pw) setTimeout(function () { pw.focus(); }, 120);
  }

  // ── Auth state handler ────────────────────────────────────────────

  function handleAuthState(state, user, profile) {
    updateAuthBtn(state, profile, user);

    if (state === 'resettingPassword') {
      enterResetMode();
    }

    if (state === 'signedIn' && _inResetMode) {
      // Password update completed — clear reset mode
      _inResetMode = false;
      var notice = document.getElementById('acct-reset-notice');
      if (notice) notice.hidden = true;
    }

    // If account panel is open and user just signed in, refresh it
    if (state === 'signedIn' && acctPanel && acctPanel.classList.contains('open')) {
      renderPanelHeader();
    }

    // If user signed out while panel is open, close it
    if (state === 'signedOut' && acctPanel && acctPanel.classList.contains('open')) {
      closeAccountPanel();
    }
  }

  // ── Preference sync handler ───────────────────────────────────────

  function handlePrefSync(key, value) {
    if (key !== 'theme') return;
    var v = typeof value === 'string' ? value : null;
    if (!v && value && typeof value === 'object') v = value.theme || null;
    if (!v) return;
    applyThemeValue(v);
    var sel = document.getElementById('acct-theme-select');
    if (sel) sel.value = v;
  }

  // ── Init ─────────────────────────────────────────────────────────

  function init() {
    authBtn            = document.getElementById('auth-btn');
    authModalOverlay   = document.getElementById('auth-modal-overlay');
    authModal          = document.getElementById('auth-modal');
    acctPanelOverlay   = document.getElementById('account-panel-overlay');
    acctPanel          = document.getElementById('account-panel');

    if (!authBtn || !authModalOverlay || !authModal || !acctPanelOverlay || !acctPanel) {
      return; // auth HTML not present in page
    }

    // Auth button click
    authBtn.addEventListener('click', function () {
      if (!window.AUTH) { openAuthModal('signin'); return; }
      var s = window.AUTH.state;
      if (s === 'signedIn') {
        openAccountPanel();
      } else if (s === 'resettingPassword') {
        enterResetMode();
      } else {
        openAuthModal('signin');
      }
    });

    // Modal overlay click → close
    authModalOverlay.addEventListener('click', function (e) {
      if (e.target === authModalOverlay) closeAuthModal();
    });

    var modalCloseBtn = document.getElementById('auth-modal-close-btn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAuthModal);

    // Account panel overlay click → close
    acctPanelOverlay.addEventListener('click', closeAccountPanel);
    var acctCloseBtn = acctPanel.querySelector('.acct-close');
    if (acctCloseBtn) acctCloseBtn.addEventListener('click', closeAccountPanel);

    // Tab navigation
    acctPanel.querySelectorAll('.acct-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchAcctTab(btn.dataset.tab); });
    });

    // Focus trapping
    authModal.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') trapFocus(authModal, e);
    });
    acctPanel.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') trapFocus(acctPanel, e);
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (authModalOverlay.classList.contains('open')) {
        e.stopPropagation();
        closeAuthModal();
        return;
      }
      if (acctPanel.classList.contains('open')) {
        e.stopPropagation();
        closeAccountPanel();
      }
    });

    // Bind forms
    bindSignIn();
    bindSignUp();
    bindForgotPassword();
    bindProfileSave();
    bindPasswordChange();
    bindSignOut();
    bindPreferencesTab();

    // Auth state events
    document.addEventListener('auth:stateChange', function (e) {
      handleAuthState(e.detail.state, e.detail.user, e.detail.profile);
    });

    document.addEventListener('auth:preferenceSync', function (e) {
      handlePrefSync(e.detail.key, e.detail.value);
    });

    // Set initial button state (AUTH may already have resolved synchronously)
    if (window.AUTH) {
      updateAuthBtn(window.AUTH.state, window.AUTH.profile, window.AUTH.user);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
