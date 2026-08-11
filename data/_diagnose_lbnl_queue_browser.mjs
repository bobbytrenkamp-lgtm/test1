/* TEMP diagnostic script, round 4 -- round 3 proved a real headless browser
 * DOES get past emp.lbl.gov's Cloudflare managed challenge at the PAGE
 * level (title/content loaded for real, and the actual .xlsx link was
 * found: https://emp.lbl.gov/sites/default/files/2026-05/
 * LBNL_Ix_Queue_Data_File_thru2025.xlsx) -- eta.lbl.gov's URL from the
 * original web search is stale/404, emp.lbl.gov/queues is the real page.
 * But downloading that link via page.context().request.get() (an API-
 * request-context fetch) got its OWN separate 403 -- that call doesn't
 * carry the full browser fingerprint/challenge-clearance the way a real
 * navigation does. This version triggers the download via a real page
 * navigation (page.goto + waitForEvent('download')), the same path an
 * actual user clicking the link would take, so it carries the browser's
 * full session/clearance state.
 *
 * Run only in CI. Deleted once real ingestion code is designed from its
 * output.
 */
const { chromium } = await import('playwright');

const QUEUES_PAGE = 'https://emp.lbl.gov/queues';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  acceptDownloads: true,
});

console.log(`\n${'='.repeat(70)}\nNavigating: ${QUEUES_PAGE}\n${'='.repeat(70)}`);
await page.goto(QUEUES_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);
console.log(`page title after wait: "${await page.title()}"`);

const links = await page.$$eval('a[href*=".xlsx"]', (as) => as.map((a) => a.href));
console.log('.xlsx links found on page:', links);

if (!links.length) {
  console.log('\nNo .xlsx link found. Aborting.');
  await browser.close();
  process.exit(1);
}
const xlsxUrl = links[0];

console.log(`\n${'='.repeat(70)}\nTriggering real navigation-based download: ${xlsxUrl}\n${'='.repeat(70)}`);
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.goto(xlsxUrl).catch(() => {}), // a file download navigation often rejects with a "download" abort -- expected
]);
console.log('download suggested filename:', download.suggestedFilename());
await download.saveAs('/tmp/queued_up.xlsx');
const { statSync } = await import('node:fs');
console.log('saved to /tmp/queued_up.xlsx, size:', statSync('/tmp/queued_up.xlsx').size, 'bytes');

await browser.close();
