// DISPOSABLE DIAGNOSTIC — round 5 (final). Round 4 confirmed the real
// working download URL, size (~213MB), and CRS. This round only checks the
// DCAT entry's license/accessLevel/rights fields, which round 3's 3000-char
// print truncated before reaching them, so the sources.json license_notes
// field is a verified fact, not a guess.
const ITEM_ID = "09cf47e1cf82465e99164762a04f3ce6";

const res = await fetch("https://geodata.vermont.gov/api/feed/dcat-us/1.1.json", {
  headers: { "User-Agent": "us-datacenter-tracker-diagnostic/1.0" },
});
const dcat = await res.json();
const match = dcat.dataset.find((d) => (d.identifier || "").includes(ITEM_ID));
if (match) {
  console.log("license:", match.license);
  console.log("accessLevel:", match.accessLevel);
  console.log("rights:", match.rights);
  console.log("issued:", match.issued);
  console.log("modified:", match.modified);
  console.log("publisher:", JSON.stringify(match.publisher));
  console.log("contactPoint:", JSON.stringify(match.contactPoint));
} else {
  console.log("no match found");
}
