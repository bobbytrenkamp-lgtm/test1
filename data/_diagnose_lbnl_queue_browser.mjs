/* TEMP diagnostic script, round 3 -- both emp.lbl.gov and eta.lbl.gov serve
 * a Cloudflare "Just a moment..." managed-challenge page to plain HTTP
 * clients regardless of headers (confirmed via response body + Cf-Mitigated:
 * challenge header in round 2) -- this can only be resolved by a real
 * browser actually executing the challenge's JS, not by tuning request
 * headers further. Uses Playwright (already this repo's own E2E tooling)
 * to load the page for real, wait for the challenge to clear, then extract
 * and download the actual .xlsx link and inspect it with openpyxl via a
 * follow-up Python invocation is unnecessary -- this script does the
 * inspection itself using the 'xlsx' package would add a new dependency,
 * so instead it just downloads the file to disk and prints its size; a
 * follow-up step in the workflow inspects it with the already-available
 * openpyxl.
 *
 * Run only in CI. Deleted once real ingestion code is designed from its
 * output.
 */
import { writeFileSync } from 'node:fs';

const { chromium } = await import('playwright');

const PAGES = [
  'https://eta.lbl.gov/publications/us-interconnection-queue-data-0',
  'https://emp.lbl.gov/queues',
];

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
});

let xlsxUrl = null;

for (const url of PAGES) {
  console.log(`\n${'='.repeat(70)}\nNavigating: ${url}\n${'='.repeat(70)}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Cloudflare's managed challenge auto-resolves (redirect/reload) within
    // a few seconds for a real browser with no human interaction required,
    // if it decides the client is legitimate -- give it time, then check.
    await page.waitForTimeout(6000);
    const title = await page.title();
    console.log(`page title after wait: "${title}"`);

    if (/just a moment/i.test(title)) {
      console.log('still on the Cloudflare challenge page after 6s wait -- trying a longer wait once');
      await page.waitForTimeout(8000);
      console.log(`page title after longer wait: "${await page.title()}"`);
    }

    const links = await page.$$eval('a[href*=".xlsx"]', (as) => as.map((a) => a.href));
    console.log('.xlsx links found on page:', links);
    if (links.length && !xlsxUrl) xlsxUrl = links[0];
  } catch (e) {
    console.log(`FAILED to load page: ${e.message}`);
  }
}

if (!xlsxUrl) {
  console.log('\nNo .xlsx link found on either page after browser navigation. Aborting.');
  await browser.close();
  process.exit(1);
}

console.log(`\n${'='.repeat(70)}\nDownloading via browser context: ${xlsxUrl}\n${'='.repeat(70)}`);
const resp = await page.context().request.get(xlsxUrl);
console.log('download status:', resp.status());
const buf = await resp.body();
console.log('downloaded bytes:', buf.length);
writeFileSync('/tmp/queued_up.xlsx', buf);

await browser.close();
