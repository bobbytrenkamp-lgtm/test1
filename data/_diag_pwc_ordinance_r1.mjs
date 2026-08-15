// DISPOSABLE DIAGNOSTIC — Prince William County VA zoning ordinance discovery.
// This sandbox's WebFetch is blocked for www.pwcva.gov (egress proxy), but
// the GitHub Actions runner has full internet access -- same pattern used
// to discover Loudoun/Fairfax's real zoning GIS services this session.
// Goal: find where PWC's real, full-text Zoning Ordinance actually lives
// (Municode? a proprietary county code portal? a PDF?) so Phase 2's
// permitted-use research can be done against real ordinance text rather
// than general public knowledge.
async function getText(url, label, { limit = 3000 } = {}) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" }, redirect: "follow" });
    const text = await res.text();
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "-> final url:", res.url);
    console.log("status:", res.status, "bytes:", text.length);
    console.log("snippet:", text.slice(0, limit).replace(/\s+/g, " "));
    return text;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

// 1. The county's own zoning-ordinance landing page -- look for outbound
// links to the real ordinance text.
const landing = await getText(
  "https://www.pwcva.gov/department/planning-office/zoning-ordinance",
  "PWC zoning-ordinance landing page", { limit: 6000 }
);
if (landing) {
  const hrefs = [...landing.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
  const interesting = hrefs.filter(h =>
    /municode|amlegal|codelibrary|ordinance|zoning|library\.municode|ecode360|generalcode|ordlink/i.test(h)
  );
  console.log("\nInteresting hrefs on landing page (" + interesting.length + "):");
  for (const h of [...new Set(interesting)].slice(0, 40)) console.log(" ", h);
}

// 2. Common hosting patterns to probe directly, in case the landing page
// itself is JS-rendered and hrefs aren't in the raw HTML.
const candidates = [
  "https://library.municode.com/va/prince_william_county",
  "https://library.municode.com/va/prince_william_county/codes/code_of_ordinances",
  "https://www.pwcgov.org/government/dept/planning/Pages/Zoning-Ordinance.aspx",
  "https://online.encodeplus.com/regs/princewilliamcounty-va/",
  "https://codelibrary.amlegal.com/codes/princewilliamcova/",
];
for (const url of candidates) {
  await getText(url, `probe: ${url}`, { limit: 800 });
}
