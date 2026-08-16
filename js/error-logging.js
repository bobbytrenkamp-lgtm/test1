/* js/error-logging.js
 * Opt-in client-side error reporting — window.ERROR_LOGGING
 *
 * There is currently no way to know when a real visitor's browser hits a
 * JS error: no monitoring service is wired up, and none of the paid ones
 * (Sentry etc.) are an option under this project's zero-paid-services
 * rule. This uses the Supabase project already optional in this codebase
 * (js/auth.js, SUPABASE_SETUP.md) -- its free tier is enough for this.
 *
 * Fully additive and inert until configured: if window.supabase (the CDN
 * library) or window.APP_CONFIG's real project URL/anon key aren't
 * present, this module does nothing beyond registering listeners that
 * immediately no-op. Matches js/auth.js's exact "works without config"
 * contract (SUPABASE_URL / SUPABASE_ANON_KEY placeholder check).
 *
 * Deliberately does NOT capture any user identity -- no user_id, no
 * email, nothing from window.AUTH. This report only ever contains: the
 * error message, its source file/line/column, a stack trace, the current
 * page URL, and the browser's user-agent string -- the same class of
 * information any browser's own DevTools console already shows the user
 * themselves. Uses its own separate Supabase client (not js/auth.js's)
 * so a broken/misconfigured error-logging path can never interfere with
 * sign-in session state.
 *
 * Rate-limited client-side so a tight error loop (e.g. an error thrown on
 * every animation frame) can't flood the free-tier database: at most
 * MAX_REPORTS_PER_LOAD reports per page load, and identical
 * message+source+line signatures are only ever reported once per load.
 */
(function () {
  'use strict';

  const MAX_REPORTS_PER_LOAD = 20;
  let _client        = null;
  let _configured     = false;
  let _reportCount    = 0;
  const _seen         = new Set();

  function _isConfigured() {
    const cfg = window.APP_CONFIG;
    return !!(
      window.supabase &&
      cfg &&
      cfg.SUPABASE_URL && cfg.SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
      cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
    );
  }

  function _init() {
    if (!_isConfigured()) return;
    try {
      // persistSession: false -- this client only ever performs anonymous
      // inserts into a write-only table; it must never create or touch a
      // browser session, which is js/auth.js's separate client's job.
      _client = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      _configured = true;
    } catch (e) {
      console.warn('[ErrorLogging] Failed to create Supabase client:', e);
    }
  }

  function _signature(report) {
    return `${report.message}|${report.source}|${report.lineno}`;
  }

  /* Public entry point -- also used internally by the window.onerror /
   * unhandledrejection listeners below. Safe to call directly for a
   * caught-and-handled error worth recording. */
  function report(err, extra) {
    if (!_configured || !_client) return;
    if (_reportCount >= MAX_REPORTS_PER_LOAD) return;

    const info = err instanceof Error
      ? { message: err.message, stack: err.stack || null }
      : { message: String(err && err.message || err || 'Unknown error'), stack: null };

    const row = {
      message:    info.message.slice(0, 2000),
      source:     (extra && extra.source) || null,
      lineno:     (extra && extra.lineno) ?? null,
      colno:      (extra && extra.colno) ?? null,
      stack:      info.stack ? info.stack.slice(0, 4000) : null,
      page_url:   typeof location !== 'undefined' ? location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    const sig = _signature(row);
    if (_seen.has(sig)) return;
    _seen.add(sig);
    _reportCount++;

    // Fire-and-forget. A failure here must never itself throw or retry --
    // that would risk a reporting-error feedback loop.
    _client.from('client_errors').insert(row).then(
      () => {},
      () => {}
    );
  }

  function _onWindowError(event) {
    report(event.error || event.message, {
      source: event.filename || null,
      lineno: event.lineno ?? null,
      colno:  event.colno ?? null,
    });
  }

  function _onUnhandledRejection(event) {
    report(event.reason, { source: 'unhandledrejection' });
  }

  _init();
  window.addEventListener('error', _onWindowError);
  window.addEventListener('unhandledrejection', _onUnhandledRejection);

  window.ERROR_LOGGING = {
    get configured() { return _configured; },
    report,
  };
})();
