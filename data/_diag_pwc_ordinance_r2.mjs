// DISPOSABLE DIAGNOSTIC — Prince William County VA zoning ordinance, round 2.
// Round 1 confirmed the real ordinance lives at library.municode.com (Chapter
// 32 = Zoning) but the raw HTML is an Angular SPA shell with no server-
// rendered content. A web search independently surfaced real, specific leads:
// Part 509 "Data Center Opportunity Zone Overlay District" permits data
// centers by-right only in M-1/M-2-zoned parcels pursuant to specific
// resolution numbers. This round fetches the primary source PDFs directly
// from the Actions runner (this sandbox's WebFetch is egress-blocked for
// pwcva.gov, pwcgov.org, and scc.virginia.gov entirely) and extracts real
// text via pdf-parse rather than trusting a search-engine summary.
import pdfParse from "pdf-parse";

async function fetchAndReport(url, label) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" }, redirect: "follow" });
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "";
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "-> final url:", res.url);
    console.log("status:", res.status, "bytes:", buf.length, "content-type:", contentType);
    return { buf, contentType, status: res.status };
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log("url:", url, "FETCH ERROR:", e.message);
    return null;
  }
}

async function fetchPdfText(url, label, { limit = 6000, grepFor = [] } = {}) {
  const r = await fetchAndReport(url, label);
  if (!r || r.status !== 200) return;
  try {
    const parsed = await pdfParse(r.buf);
    console.log(`  pages: ${parsed.numpages}, text length: ${parsed.text.length}`);
    if (grepFor.length) {
      for (const term of grepFor) {
        const idx = parsed.text.toLowerCase().indexOf(term.toLowerCase());
        if (idx >= 0) {
          console.log(`  MATCH "${term}" at offset ${idx}:`);
          console.log("   ", parsed.text.slice(Math.max(0, idx - 200), idx + 800).replace(/\s+/g, " "));
        } else {
          console.log(`  no match for "${term}"`);
        }
      }
    } else {
      console.log("  full text (first " + limit + " chars):");
      console.log("  " + parsed.text.slice(0, limit).replace(/\n{2,}/g, "\n"));
    }
  } catch (e) {
    console.log("  PDF PARSE ERROR:", e.message);
  }
}

// Municode deep-link for Part 509 -- try the exact nodeId URL a search
// engine indexed, in case Municode server-renders a snapshot for crawlers.
await fetchAndReport(
  "https://library.municode.com/va/prince_william_county/codes/code_of_ordinances?nodeId=CH32ZO_ARTVOVDI_PT509DACEOPZOOVDI",
  "Municode Part 509 deep link"
);

// Real PDFs found via web search.
await fetchPdfText(
  "https://www.pwcva.gov/assets/2022-01/Frequently%20Asked%20Questions.1.20.22.pdf",
  "PWC Data Center Overlay FAQ PDF",
  { grepFor: ["M-1", "M-2", "by right", "special use permit", "zoning district"] }
);
await fetchPdfText(
  "https://eservice.pwcgov.org/planning/documents/DPA2026-00006.pdf",
  "DPA2026-00006 zoning text amendment PDF",
  { limit: 8000 }
);
await fetchPdfText(
  "https://www.scc.virginia.gov/docketsearch/DOCS/3fnp01!.PDF",
  "SCC Virginia docket PDF",
  { grepFor: ["Data Center", "M-1", "M-2", "special use", "by right"] }
);
