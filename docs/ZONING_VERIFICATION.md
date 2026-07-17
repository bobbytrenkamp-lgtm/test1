# Zoning Intelligence — Verification Workflow

How to advance data from "low confidence / unverified" to "verified."

---

## Confidence Levels

| Level | Meaning | Allowed Without Verification |
|---|---|---|
| `verified` | Confirmed against official ordinance text, exact section cited | Yes |
| `high` | Pulled directly from official source; cross-checked against one other official source | Yes |
| `moderate` | Pulled from official source; not cross-checked | Yes, with caveat |
| `low` | Based on general knowledge of the jurisdiction or a single non-exhaustive read | No — must be flagged to user |
| `unverified` | Source unknown or not official | No |
| `unavailable` | Not yet researched | No |

All low/unverified/unavailable values must display the `⚠ Unverified` warning in the UI.

---

## Verification Workflow

### For Dimensional Standards

1. **Locate the zoning schedule** in the official ordinance (usually Chapter 4 or a "Dimensional Standards" chapter on Municode).
2. Find the row for the district in question.
3. Record the **exact text** as `original_text`.
4. Record the **section citation** as `source_section` (e.g., "§ 4-302(A)" or "Table 4-1").
5. Set `verification_status` to `"verified"` and `confidence_level` to `"verified"` or `"high"`.
6. Set `manual_review_required: false` if the value is clear and unconditional.

**Conditional standards:** If the setback varies (e.g., 20 ft standard, 50 ft adjacent to residential), create a `ConditionalRule` entry in `conditional_rules` rather than a single value. Set `manual_review_required: true` because the applicable rule depends on site conditions.

**Not found:** If a standard is simply not specified in the ordinance, set `verification_status: "not_found"` rather than omitting it or guessing.

**Conflicting sources:** If two official sources give different values, set `verification_status: "conflicting_sources"` and document both in `notes`. Do not pick one arbitrarily.

### For Permitted Uses

1. **Open the use table** for the district in the ordinance (often an appendix or a matrix table).
2. Find the row for "data center" or the closest official use name.
3. Record the **exact official use name** in `official_use_name`.
4. Map the permission indicator (P, C, SE, SUP, —) to the `permission_status` enum:
   - P / By Right → `permitted_by_right`
   - P* / With Conditions → `permitted_with_limitations`
   - C / Conditional → `conditional`
   - SE / Special Exception → `special_exception`
   - SUP / Special Use Permit → `special_use_permit`
   - — / Not listed → `not_listed`
   - Blank / Prohibited → `prohibited` (only if the ordinance states it is prohibited; otherwise `not_listed`)
5. Record the approval type in `approval_type` if different from `permission_status`.
6. Record conditions from footnotes in `conditions` array.
7. Set `confidence_level: "verified"` and `manual_review_required: false`.

**Important — do not guess.** If the data center use is not listed and there is no explicit prohibition, use `not_listed` + `unclear` NOT `prohibited`. Many zoning ordinances treat unlisted uses as prohibited by default, but others allow the zoning administrator to classify them — this requires a local interpretation.

### For Overlays

1. Confirm the overlay exists in the ordinance (look for "overlay district," "special district," or "combining district").
2. Record `overlay_name` (exact official name).
3. List `what_it_affects` from the ordinance's stated purpose or requirements section.
4. Record `official_source_url` pointing to the overlay chapter.
5. Set `confidence_level: "high"` if the overlay exists and its scope is confirmed, `"moderate"` if its geographic boundary isn't fully confirmed.

---

## Verification Status Advancement

When you advance a value from low → verified:

1. Update `confidence_level` and `verification_status` on the specific field.
2. Update `manual_review_required` to `false` if the value is confirmed and unconditional.
3. Update `last_verified` on the parent jurisdiction.json.
4. Run `validate_zoning.py` to confirm no new errors were introduced.
5. Run `export_zoning.py` to regenerate the normalized JSON.
6. Commit with a message describing what was verified, e.g.:
   ```
   fix(zoning): verify PD-IP dimensional standards against Loudoun § 4-302
   ```

---

## What Counts as a Source

### Acceptable

- `library.municode.com/va/loudoun_county/codes/...` — official online code
- `www.loudoun.gov/DocumentCenter/View/...` — official county document
- Any `.gov` URL containing the zoning ordinance or official GIS layer
- Official county ArcGIS FeatureServer returning zoning polygon attributes

### Not Acceptable

- Wikipedia, news articles, blog posts
- Commercial real-estate databases (CoStar, LoopNet, Regrid)
- Academic papers or planning studies (may reference outdated regulations)
- LLM / AI-generated text (including output from this assistant)
- Any source that is more than 2 years old without a confirmed "current" marker

---

## Handling Amendments

Zoning ordinances are amended frequently. The pipeline does not detect amendments automatically.

**Current approach:** Document known amendment risk in `known_limitations`. Set `data_current_as_of` in jurisdiction.json to the date the ordinance was last read.

**Future improvement:** Track ordinance amendment RSS/email alerts where available and trigger re-verification on each amendment.

---

## Verification Checklist (per jurisdiction)

Copy this checklist into the jurisdiction's README or tracking issue when beginning verification:

```
[ ] All districts confirmed against official ordinance
[ ] Each district: district_name confirmed
[ ] Each district: district_category confirmed
[ ] Each district: confidence_level ≥ "moderate"
[ ] Each district: official_source_url confirmed accessible
[ ] Dimensional standards: at least min/max setbacks confirmed for industrial districts
[ ] Dimensional standards: height limits confirmed for all districts
[ ] Permitted uses: data_center classification confirmed for all districts
[ ] Permitted uses: conditions and approval type documented where applicable
[ ] Overlays: all relevant overlays identified
[ ] Overlays: what_it_affects documented from ordinance text
[ ] GIS geometry: fetched from official ArcGIS FeatureServer
[ ] GIS geometry: district codes match ordinance district codes (check via normalize_zoning.py)
[ ] Pipeline: validate_zoning.py shows 0 errors
[ ] Export: export_zoning.py completes successfully
[ ] Frontend: district browser shows all expected districts
[ ] Frontend: DC banner displays correctly for PD-IP (eligible) and AR1 (not eligible)
[ ] Disclaimer: visible in UI at all times
[ ] Review date: data_current_as_of updated in jurisdiction.json
```
