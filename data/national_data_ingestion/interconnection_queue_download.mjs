/* data/national_data_ingestion/interconnection_queue_download.mjs
 *
 * Downloads LBNL's "Queued Up" interconnection queue workbook
 * (emp.lbl.gov/queues) via a real headless browser.
 *
 * WHY A BROWSER, NOT A PLAIN HTTP FETCH
 * emp.lbl.gov (and eta.lbl.gov) sit behind Cloudflare's managed-challenge
 * bot protection: a plain HTTP GET (confirmed with realistic Chrome
 * headers, not just a bare User-Agent) gets a "Just a moment..." challenge
 * page back regardless of what headers are sent -- that can only be
 * resolved by a real browser executing the challenge's JS, not by tuning
 * request headers. A real headless browser navigation DOES pass it (proven
 * via a live GitHub Actions dispatch, 2026-08-11). The download itself
 * must also go through a real page navigation (page.goto + waitForEvent
 * ('download')), not an API-request-context fetch -- context().request
 * .get() does not carry the full browser session/challenge-clearance the
 * way a real navigation does, and gets its own separate 403.
 *
 * This is why this source is NOT ingested through
 * data/parcel_pipeline/static_ingestion (requests.Session-based, plain
 * HTTP only) -- that pipeline has no browser-automation path, and adding
 * one there for a single source would be the wrong place for it. This
 * script is deliberately standalone.
 *
 * Cannot run in this sandbox (no outbound network) or in a plain `requests`
 * -based CI step -- meant for a GitHub Actions job with Playwright/Chromium
 * installed (see .github/workflows/update_interconnection_queue.yml).
 *
 * Usage: node data/national_data_ingestion/interconnection_queue_download.mjs <output-path>
 */
import { statSync } from 'node:fs';

const OUTPUT_PATH = process.argv[2];
if (!OUTPUT_PATH) {
  console.error('Usage: node interconnection_queue_download.mjs <output-path>');
  process.exit(2);
}

const QUEUES_PAGE = 'https://emp.lbl.gov/queues';

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  acceptDownloads: true,
});

try {
  console.log(`Navigating: ${QUEUES_PAGE}`);
  await page.goto(QUEUES_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Cloudflare's managed challenge auto-resolves within a few seconds for
  // a real browser with no human interaction required, if it decides the
  // client is legitimate.
  await page.waitForTimeout(6000);
  const title = await page.title();
  console.log(`page title: "${title}"`);
  if (/just a moment/i.test(title)) {
    throw new Error(`Cloudflare challenge did not clear -- page title still "${title}" after waiting`);
  }

  const links = await page.$$eval('a[href*=".xlsx"]', (as) => as.map((a) => a.href));
  if (!links.length) {
    throw new Error('No .xlsx link found on the queues page -- LBNL may have changed their page layout');
  }
  const xlsxUrl = links[0];
  console.log(`Found data file link: ${xlsxUrl}`);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.goto(xlsxUrl).catch(() => {}), // a file-download navigation rejects with an abort -- expected
  ]);
  await download.saveAs(OUTPUT_PATH);
  const size = statSync(OUTPUT_PATH).size;
  console.log(`Saved to ${OUTPUT_PATH} (${size} bytes)`);
  if (size < 1_000_000) {
    // The real workbook is ~15MB; anything much smaller is almost
    // certainly a challenge/error page saved under the expected filename,
    // not the real data -- fail loudly rather than let a corrupt tiny
    // file silently flow into the parser.
    throw new Error(`Downloaded file is suspiciously small (${size} bytes) -- likely not the real workbook`);
  }
} finally {
  await browser.close();
}
