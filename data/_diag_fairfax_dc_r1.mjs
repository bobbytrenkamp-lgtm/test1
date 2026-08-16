// Disposable diagnostic: fetch and extract text from Fairfax County's real
// data center zoning ordinance amendment documents. Deleted once findings
// land in production data files. Run only via GitHub Actions dispatch --
// this sandbox has no outbound network to these hosts.
import pdf from 'pdf-parse/lib/pdf-parse.js';

const URLS = [
  ['staff_report', 'https://www.fairfaxcounty.gov/planning-development/sites/planning-development/files/Assets/Documents/zoning/data-centers/data-centers-staff-report.pdf'],
  ['draft_text', 'https://www.fairfaxcounty.gov/planning-development/sites/planning-development/files/Assets/Documents/PDF/Data-Centers-Draft-text.pdf'],
];

for (const [label, url] of URLS) {
  console.log(`\n=== ${label} : ${url} ===`);
  try {
    const res = await fetch(url);
    console.log('HTTP status:', res.status);
    if (!res.ok) { console.log('FETCH FAILED'); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('bytes:', buf.length);
    const data = await pdf(buf);
    console.log('pages:', data.numpages);
    console.log('--- FULL TEXT ---');
    console.log(data.text);
    console.log('--- END TEXT ---');
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
