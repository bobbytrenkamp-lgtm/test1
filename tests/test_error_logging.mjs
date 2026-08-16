/* tests/test_error_logging.mjs — tests for js/error-logging.js.

   Launch-readiness fix (2026-08-16): no production error observability
   existed anywhere in this codebase -- a JS error a real visitor hits is
   invisible. js/error-logging.js adds opt-in reporting to a new Supabase
   `client_errors` table (see data/supabase_schema.sql), fully inert until
   Supabase is actually configured (matches js/auth.js's exact contract).

   Requires jsdom (for a real window/ErrorEvent). Skips cleanly when absent.
       node tests/test_error_logging.mjs
*/
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  console.log('SKIP  jsdom not installed — run `npm i jsdom` to enable these tests');
  process.exit(0);
}

const ROOT = new URL('../', import.meta.url).pathname;
const src = readFileSync(ROOT + 'js/error-logging.js', 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond && detail !== undefined) console.log(`   got: ${JSON.stringify(detail)}`);
}

/* A minimal spy Supabase client: .from(table).insert(row) records every
   call and resolves like the real supabase-js client would. */
function makeSpyClient() {
  const inserts = [];
  return {
    inserts,
    from(table) {
      return {
        insert(row) {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

function newEnv({ configured } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { url: 'http://localhost/some-page', runScripts: 'dangerously' });
  const { window } = dom;

  const spy = makeSpyClient();
  let createClientCalls = 0;
  window.supabase = {
    createClient(url, key) {
      createClientCalls++;
      return spy;
    },
  };
  window.APP_CONFIG = configured
    ? { SUPABASE_URL: 'https://real-project.supabase.co', SUPABASE_ANON_KEY: 'real-anon-key' }
    : { SUPABASE_URL: 'YOUR_SUPABASE_URL', SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY' };

  const script = window.document.createElement('script');
  script.textContent = src;
  window.document.body.appendChild(script);

  return { window, spy, getCreateClientCalls: () => createClientCalls };
}

/* ── Not configured: fully inert ── */
{
  const { window, spy, getCreateClientCalls } = newEnv({ configured: false });
  ok('ERROR_LOGGING is exposed even when not configured', !!window.ERROR_LOGGING);
  ok('configured is false with placeholder APP_CONFIG values', window.ERROR_LOGGING.configured === false);
  ok('no Supabase client is created when not configured', getCreateClientCalls() === 0);

  window.ERROR_LOGGING.report(new window.Error('should be dropped'));
  ok('report() is a silent no-op when not configured', spy.inserts.length === 0);
}

/* ── Configured: reports flow through ── */
{
  const { window, spy } = newEnv({ configured: true });
  ok('configured is true with real-looking APP_CONFIG values', window.ERROR_LOGGING.configured === true);

  window.ERROR_LOGGING.report(new window.Error('boom'), { source: 'app.js', lineno: 42, colno: 7 });
  ok('a report inserts exactly one row', spy.inserts.length === 1);
  const row = spy.inserts[0]?.row;
  ok('inserts into the client_errors table', spy.inserts[0]?.table === 'client_errors');
  ok('the row carries the error message', row?.message === 'boom');
  ok('the row carries the source/line/col', row?.source === 'app.js' && row?.lineno === 42 && row?.colno === 7);
  ok('the row carries a stack trace for a real Error', typeof row?.stack === 'string' && row.stack.length > 0);
  ok('the row carries the current page URL', row?.page_url === 'http://localhost/some-page');
  ok('the row carries a user_agent string', typeof row?.user_agent === 'string' && row.user_agent.length > 0);
  ok('the row never carries any user identity field', !('user_id' in row) && !('email' in row));
}

/* ── Dedup: identical signature only reported once ── */
{
  const { window, spy } = newEnv({ configured: true });
  window.ERROR_LOGGING.report(new window.Error('repeat me'), { source: 'a.js', lineno: 1 });
  window.ERROR_LOGGING.report(new window.Error('repeat me'), { source: 'a.js', lineno: 1 });
  window.ERROR_LOGGING.report(new window.Error('repeat me'), { source: 'a.js', lineno: 1 });
  ok('an identical message+source+line signature is only reported once per page load', spy.inserts.length === 1);

  window.ERROR_LOGGING.report(new window.Error('a different message'), { source: 'a.js', lineno: 1 });
  ok('a genuinely different error still gets reported', spy.inserts.length === 2);
}

/* ── Rate limit: bounded reports per page load ── */
{
  const { window, spy } = newEnv({ configured: true });
  for (let i = 0; i < 30; i++) {
    window.ERROR_LOGGING.report(new window.Error(`distinct-${i}`), { source: 'loop.js', lineno: i });
  }
  ok('reports are capped at MAX_REPORTS_PER_LOAD (20) even with 30 distinct errors',
    spy.inserts.length === 20, spy.inserts.length);
}

/* ── Real global wiring: window 'error' event ── */
{
  const { window, spy } = newEnv({ configured: true });
  const event = new window.ErrorEvent('error', {
    message:  'uncaught boom',
    filename: 'somefile.js',
    lineno:   10,
    colno:    3,
    error:    new window.Error('uncaught boom'),
  });
  window.dispatchEvent(event);
  ok('a real window "error" event is captured and reported', spy.inserts.length === 1, spy.inserts);
  ok('the captured report carries the right filename', spy.inserts[0]?.row.source === 'somefile.js');
}

/* ── Real global wiring: unhandledrejection ── */
{
  const { window, spy } = newEnv({ configured: true });
  const event = new window.Event('unhandledrejection');
  event.reason = new window.Error('rejected boom');
  window.dispatchEvent(event);
  ok('a real "unhandledrejection" event is captured and reported', spy.inserts.length === 1, spy.inserts);
  ok('the captured report is tagged as an unhandled rejection', spy.inserts[0]?.row.source === 'unhandledrejection');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
