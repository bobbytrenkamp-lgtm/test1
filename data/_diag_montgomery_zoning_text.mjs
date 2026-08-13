// DISPOSABLE DIAGNOSTIC. Fetching real Montgomery County MD zoning ordinance
// text (ZTA 26-01 "Data Center" text amendment + the Use Table) — this
// sandbox's WebFetch tool is blocked by the egress proxy for these
// government/legal-code domains, but a GitHub Actions runner has full
// internet access, so print extracted text here instead.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function fetchText(url, label, { isPdf = false, maxPrint = 6000 } = {}) {
  console.log(`\n--- ${label} ---`);
  console.log("url:", url);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0 (research)" } });
    console.log("status:", res.status, "content-type:", res.headers.get("content-type"));
    if (!res.ok) { console.log("NOT OK, skipping body"); return null; }
    if (isPdf) {
      const buf = Buffer.from(await res.arrayBuffer());
      console.log("PDF bytes:", buf.length);
      // Crude text extraction: PDF text objects are often between "(" and ")"
      // inside BT/ET blocks, or extractable as readable ASCII runs. This is
      // not a real PDF parser -- just enough to spot keywords/section refs
      // for a human to follow up on with the real document.
      const raw = buf.toString("latin1");
      const readable = raw.match(/[\x20-\x7E]{15,}/g) || [];
      const joined = readable.join("\n");
      console.log("extracted readable text (first", maxPrint, "chars):\n", joined.slice(0, maxPrint));
      return joined;
    }
    const html = await res.text();
    console.log("HTML bytes:", html.length);
    const text = stripHtml(html);
    console.log("extracted text (first", maxPrint, "chars):\n", text.slice(0, maxPrint));
    return text;
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    return null;
  }
}

await fetchText(
  "https://montgomeryplanningboard.org/wp-content/uploads/2026/01/SR-ZTA-26-01-Data-Centers.pdf",
  "ZTA 26-01 Data Center staff report (PDF)",
  { isPdf: true, maxPrint: 8000 }
);

await fetchText(
  "https://codelibrary.amlegal.com/codes/montgomerycounty/latest/montgomeryco_md_zone2014/0-0-0-778",
  "Chapter 59 Section 3.1.6 Use Table (HTML)",
  { maxPrint: 8000 }
);

await fetchText(
  "https://www2.montgomerycountymd.gov/mcgportalapps/Press_Detail.aspx?Item_ID=48105",
  "County press release on data center ZTA",
  { maxPrint: 4000 }
);
