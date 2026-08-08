/* js/parcel/assemblage.js
 * window.PARCEL_ASSEMBLAGE — treating several parcels as one prospective site.
 *
 * A 600-acre data center campus is rarely one parcel. It is four or nine
 * parcels, often under two or three owners, and the questions that decide
 * whether it is a real opportunity are: how much land is this in total, who
 * has to agree to sell, does the land actually touch, and where are the gaps.
 *
 * TWO DISTINCTIONS THIS MODULE REFUSES TO BLUR
 * --------------------------------------------
 * 1. CONTIGUOUS vs NEARBY. Parcels that share a boundary can be developed as
 *    one site. Parcels 500 feet apart cannot, however convenient it would be
 *    to add their acreage together. These are reported as separate facts,
 *    never summed into a single "assembled acreage" that implies a buildable
 *    whole. A parcel separated only by a road right-of-way is a third,
 *    explicitly-labelled case: often assemblable in practice, but never
 *    silently counted as touching.
 *
 * 2. SAME NAME vs SAME OWNER. "SMITH JOHN" appearing on two deeds is not
 *    evidence they are the same person, and "ABC HOLDINGS LLC" and "ABC
 *    HOLDINGS L.L.C." may or may not be the same entity. Owner matching here
 *    is exact-after-normalization only, generic and placeholder names are
 *    excluded outright, and the output says "records show the same owner
 *    name" rather than asserting common control. Concluding two parcels are
 *    commonly owned when they are not is how an assemblage thesis gets built
 *    on sand.
 *
 * Depends on: window.PARCEL_GEO (required), window.polygonClipping (required).
 */
window.PARCEL_ASSEMBLAGE = (function () {
  'use strict';

  const GEO = () => window.PARCEL_GEO;
  const CLIP = () => window.polygonClipping;

  /* Two parcels count as CONTIGUOUS when their boundaries are within this
     distance. Not zero: government parcel layers are digitized independently
     and adjacent parcels routinely have boundaries a few centimetres to a
     couple of metres apart even where they legally share a line. 2 metres is
     wide enough to absorb that digitizing slop and far too narrow to bridge
     any real gap. */
  const CONTIGUOUS_TOLERANCE_M = 2;

  /* Parcels separated by more than the tolerance but less than this are
     reported as possibly separated by a right-of-way — a typical local street
     plus verge. Reported as its own category, never as contiguous: whether
     the road can be vacated or crossed is a question for the jurisdiction,
     not for a distance threshold. */
  const ROW_SEPARATION_M = 40;

  /* Beyond this, parcels are simply NEARBY and are not part of a contiguous
     site under any reading. */
  const NEARBY_MAX_M = 400;

  /* Owner strings that are not identities. Matching on any of these would
     link every unowned or unrecorded parcel in a county into one imaginary
     empire. */
  const NON_IDENTIFYING_OWNERS = new Set([
    'unknown', 'n/a', 'na', 'none', 'no owner', 'not available', 'unavailable',
    'owner unknown', 'current owner', 'occupant', 'resident', 'taxpayer',
    'estate', 'trustee', 'trust', 'heirs', 'et al', 'etal', 'llc', 'inc',
    'various', 'multiple', 'private owner', 'private', 'public', 'city',
    'county', 'state', 'united states', 'usa', 'government',
  ]);

  /* Corporate suffixes stripped before comparison, so "ABC HOLDINGS LLC" and
     "ABC HOLDINGS, L.L.C." compare equal. Deliberately conservative: only
     forms that are unambiguously suffixes, never words that could be part of
     a name. */
  const SUFFIX_RE = /\b(l\s*l\s*c|l\s*p|l\s*l\s*p|inc|incorporated|corp|corporation|co|company|ltd|limited|trust|tr|assoc|association|partnership|partners)\b\.?/g;

  /* Normalizes an owner string for EXACT comparison. Returns null when the
     result is not a usable identity — which is a refusal to match, not a
     match against empty. */
  function normalizeOwner(raw) {
    if (raw == null) return null;
    let s = String(raw).toLowerCase().trim();
    if (!s) return null;

    s = s.replace(/[.,]/g, ' ')
         .replace(/&/g, ' and ')
         .replace(/\s+/g, ' ')
         .trim();

    if (NON_IDENTIFYING_OWNERS.has(s)) return null;

    const stripped = s.replace(SUFFIX_RE, ' ').replace(/\s+/g, ' ').trim();
    const candidate = stripped || s;

    if (NON_IDENTIFYING_OWNERS.has(candidate)) return null;
    // A one- or two-character remnant is not an identity.
    if (candidate.length < 3) return null;

    return candidate;
  }

  /* True only when both normalize to the same non-null identity. Never a
     fuzzy or partial match. */
  function sameOwner(a, b) {
    const na = normalizeOwner(a);
    const nb = normalizeOwner(b);
    return !!(na && nb && na === nb);
  }

  /* Shortest distance in metres between two parcel polygons.
     Measured vertex-to-polygon in both directions, which is exact when the
     polygons are disjoint and correctly yields 0 when they overlap or share
     a vertex. */
  function parcelSeparationMeters(a, b) {
    const geo = GEO();
    let best = Infinity;
    for (const ring of geo.ringsOf(a)) {
      for (const coord of ring) {
        const d = geo.pointToPolygonKm(coord, b);
        if (d != null && d * 1000 < best) best = d * 1000;
        if (best === 0) return 0;
      }
    }
    for (const ring of geo.ringsOf(b)) {
      for (const coord of ring) {
        const d = geo.pointToPolygonKm(coord, a);
        if (d != null && d * 1000 < best) best = d * 1000;
        if (best === 0) return 0;
      }
    }
    return best === Infinity ? null : best;
  }

  /* Classifies the spatial relationship between two parcels. */
  function relationship(a, b) {
    const m = parcelSeparationMeters(a, b);
    if (m == null) return { relation: 'unknown', separationMeters: null };
    if (m <= CONTIGUOUS_TOLERANCE_M) return { relation: 'contiguous', separationMeters: round2(m) };
    if (m <= ROW_SEPARATION_M) {
      return {
        relation: 'separated-by-gap',
        separationMeters: round2(m),
        note: 'Separated by a gap consistent with a road right-of-way. Often assemblable, ' +
              'but that depends on the jurisdiction — not treated as contiguous here.',
      };
    }
    if (m <= NEARBY_MAX_M) return { relation: 'nearby', separationMeters: round2(m) };
    return { relation: 'distant', separationMeters: round2(m) };
  }

  /* Groups parcels into contiguous clusters via union-find over the
     contiguity relation. A cluster is a set of parcels that can be walked
     between without leaving the assemblage — the honest unit of "one site". */
  function contiguousGroups(parcels) {
    const n = parcels.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const union = (i, j) => { const a = find(i), b = find(j); if (a !== b) parent[a] = b; };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const m = parcelSeparationMeters(parcels[i].geometry, parcels[j].geometry);
        if (m != null && m <= CONTIGUOUS_TOLERANCE_M) union(i, j);
      }
    }

    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    return Array.from(groups.values());
  }

  function toClipperGeom(geometry) {
    if (!geometry) return null;
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return null;
  }

  /* The assemblage outline, for drawing on the map. A union rather than a
     collection, so shared internal boundaries disappear and the drawn shape
     is the site's actual perimeter. */
  function outline(parcels) {
    const parts = parcels.map(p => toClipperGeom(p.geometry)).filter(Boolean);
    if (!parts.length) return null;
    try {
      const merged = CLIP().union(parts[0], ...parts.slice(1));
      return (merged && merged.length) ? { type: 'MultiPolygon', coordinates: merged } : null;
    } catch {
      return null;
    }
  }

  /* Sums a numeric field, reporting how many parcels actually contributed.
   *
   * A total assembled from 3 of 9 parcels is a different number from a total
   * assembled from all 9, and presenting them identically is how "combined
   * assessed value: $2.1M" ends up describing a third of the site. Every sum
   * here therefore travels with its own coverage. */
  function sumField(parcels, field) {
    let total = 0, contributing = 0;
    for (const p of parcels) {
      const raw = (p.properties || {})[field];
      /* Missing is not zero: a parcel publishing no assessed value must not
         count as one worth nothing. The explicit null/'' test is load-bearing
         — Number(null) is 0, not NaN, so a Number.isFinite check ALONE lets a
         null through as a real zero and quietly adds a $0 parcel to the
         total. Number('') is 0 too. */
      if (raw == null || raw === '') continue;
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      total += v;
      contributing++;
    }
    return {
      value: contributing ? total : null,
      contributingParcels: contributing,
      totalParcels: parcels.length,
      complete: contributing === parcels.length,
    };
  }

  /* Distribution of a categorical field (zoning, land use) across the
     assemblage — a site spanning three zoning districts is a materially
     harder project than one that does not, and the mix is the signal. */
  function mix(parcels, field) {
    const counts = new Map();
    let missing = 0;
    for (const p of parcels) {
      const v = (p.properties || {})[field];
      if (v == null || v === '') { missing++; continue; }
      const k = String(v);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return {
      values: Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
      distinct: counts.size,
      missing,
    };
  }

  /* Owner concentration.
   *
   * Reports how many DISTINCT owner identities must agree to a transaction —
   * the number that actually governs how hard an assemblage is. Parcels whose
   * owner cannot be normalized to an identity are counted separately as
   * unknown rather than lumped together, since treating them as one owner
   * would understate the negotiation and treating each as distinct would
   * overstate it. */
  function ownership(parcels) {
    const byOwner = new Map();
    let unknownOwnerParcels = 0;

    for (const p of parcels) {
      const raw = (p.properties || {}).owner;
      const key = normalizeOwner(raw);
      if (!key) { unknownOwnerParcels++; continue; }
      if (!byOwner.has(key)) byOwner.set(key, { normalized: key, displayName: String(raw).trim(), parcels: [], acres: 0 });
      const rec = byOwner.get(key);
      rec.parcels.push(p.id ?? p.properties?.parcel_id ?? null);
      const acres = Number((p.properties || {}).area_acres);
      if (Number.isFinite(acres)) rec.acres += acres;
    }

    const owners = Array.from(byOwner.values())
      .map(o => ({ ...o, parcelCount: o.parcels.length, acres: round2(o.acres) }))
      .sort((a, b) => b.parcelCount - a.parcelCount || b.acres - a.acres);

    return {
      distinctOwners: owners.length,
      unknownOwnerParcels,
      owners,
      largestHolding: owners.length ? owners[0] : null,
      /* The wording is the point. Records showing the same normalized name is
         evidence, not proof of common control: entities with identical names
         exist, and related entities with different names are common. */
      basis: 'Owners are grouped where public records show the same owner name after ' +
             'normalizing punctuation and corporate suffixes. Matching names is evidence ' +
             'of common ownership, not proof — confirm entity identity before relying on it.',
    };
  }

  /* Builds the full assemblage analysis.
   *
   *   parcels: [{ id, geometry, properties }]
   */
  function analyze(parcels) {
    const geo = GEO();
    const list = (parcels || []).filter(p => p && p.geometry);

    const result = {
      parcelCount: list.length,
      skippedParcels: (parcels || []).length - list.length,
      combinedAcres: 0,
      contiguous: false,
      groups: [],
      largestContiguousAcres: 0,
      outline: null,
      ownership: null,
      zoningMix: null,
      landUseMix: null,
      assessedValue: null,
      lastSales: [],
      gaps: [],
      notes: [],
    };

    if (!list.length) {
      result.notes.push('No parcels with usable geometry were supplied.');
      return result;
    }

    // Combined area is computed from the UNION, not by summing parcel
    // acreages. Summing double counts any overlap, and parcel layers do
    // contain overlapping polygons (a condominium footprint over its land
    // parcel, a digitizing error). The union is the land that exists.
    const merged = outline(list);
    result.outline = merged;
    const unionSqm = merged ? geo.polygonAreaSqm(merged) : 0;
    result.combinedAcres = round2(geo.sqmToAcres(unionSqm));

    const summedAcres = list.reduce((sum, p) => {
      const a = geo.sqmToAcres(geo.polygonAreaSqm(p.geometry));
      return sum + (Number.isFinite(a) ? a : 0);
    }, 0);
    if (summedAcres - result.combinedAcres > 0.05) {
      result.overlapAcres = round2(summedAcres - result.combinedAcres);
      result.notes.push(
        `Parcel polygons overlap by about ${result.overlapAcres} acres. Combined acreage ` +
        `is the union, not the sum, so the overlap is counted once.`);
    }

    // Contiguity.
    const groups = contiguousGroups(list);
    result.groups = groups.map(idx => {
      const groupParcels = idx.map(i => list[i]);
      const g = outline(groupParcels);
      return {
        parcelIndexes: idx,
        parcelIds: groupParcels.map(p => p.id ?? p.properties?.parcel_id ?? null),
        parcelCount: idx.length,
        acres: round2(geo.sqmToAcres(g ? geo.polygonAreaSqm(g) : 0)),
      };
    }).sort((a, b) => b.acres - a.acres);

    result.contiguous = result.groups.length === 1;
    result.largestContiguousAcres = result.groups.length ? result.groups[0].acres : 0;

    if (!result.contiguous) {
      // The single most important thing to say about a non-contiguous
      // assemblage: the headline acreage is not one developable site.
      result.notes.push(
        `These parcels form ${result.groups.length} separate groups that do not touch. ` +
        `The largest contiguous piece is ${result.largestContiguousAcres} acres of the ` +
        `${result.combinedAcres} acre total — combined acreage is not a single ` +
        `developable site.`);

      // Report the gap between each pair of groups, so the user can see
      // whether a road or a genuine parcel sits between them.
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          let best = Infinity, rel = null;
          for (const a of groups[i]) {
            for (const b of groups[j]) {
              const r = relationship(list[a].geometry, list[b].geometry);
              if (r.separationMeters != null && r.separationMeters < best) { best = r.separationMeters; rel = r; }
            }
          }
          if (rel) {
            result.gaps.push({
              betweenGroups: [i, j],
              separationMeters: rel.separationMeters,
              separationFeet: Math.round(rel.separationMeters * 3.28084),
              relation: rel.relation,
              note: rel.note || null,
            });
          }
        }
      }
    }

    result.ownership = ownership(list);
    result.zoningMix = mix(list, 'zoning_code');
    result.landUseMix = mix(list, 'land_use_code');
    result.assessedValue = sumField(list, 'assessed_value');
    result.landValue = sumField(list, 'land_value');

    // Sales are listed, never summed. Adding the last sale prices of parcels
    // that traded in different years produces a number that describes no
    // transaction that ever happened.
    result.lastSales = list
      .map(p => ({
        parcelId: p.id ?? p.properties?.parcel_id ?? null,
        date: (p.properties || {}).last_sale_date ?? null,
        price: (p.properties || {}).last_sale_price ?? null,
      }))
      .filter(s => s.date != null || s.price != null);

    if (result.assessedValue.value != null && !result.assessedValue.complete) {
      result.notes.push(
        `Combined assessed value covers ${result.assessedValue.contributingParcels} of ` +
        `${result.assessedValue.totalParcels} parcels — the rest publish no value.`);
    }

    if (result.zoningMix.distinct > 1) {
      result.notes.push(
        `Spans ${result.zoningMix.distinct} zoning districts, which usually means a rezoning ` +
        `or a coordinated approval rather than a single by-right path.`);
    }

    return result;
  }

  /* Given one parcel and a pool of candidates, finds parcels the records show
     under the same owner, split by whether they actually touch. */
  function sameOwnerNearby(parcel, candidates) {
    const target = normalizeOwner((parcel.properties || {}).owner);
    const result = {
      owner: target ? String((parcel.properties || {}).owner).trim() : null,
      matched: !!target,
      contiguous: [],
      nearby: [],
      why: target ? null
        : 'This parcel has no owner name usable for matching (missing, or a generic ' +
          'placeholder like "UNKNOWN" that would match unrelated parcels).',
    };
    if (!target) return result;

    for (const c of (candidates || [])) {
      if (!c || !c.geometry) continue;
      if (c === parcel) continue;
      if (!sameOwner((c.properties || {}).owner, (parcel.properties || {}).owner)) continue;

      const rel = relationship(parcel.geometry, c.geometry);
      const entry = {
        parcelId: c.id ?? c.properties?.parcel_id ?? null,
        acres: round2(GEO().sqmToAcres(GEO().polygonAreaSqm(c.geometry))),
        separationMeters: rel.separationMeters,
        relation: rel.relation,
      };
      if (rel.relation === 'contiguous') result.contiguous.push(entry);
      else if (rel.relation !== 'distant') result.nearby.push(entry);
    }

    const selfAcres = round2(GEO().sqmToAcres(GEO().polygonAreaSqm(parcel.geometry)));
    result.parcelAcres = selfAcres;
    // Only CONTIGUOUS same-owner parcels are added up. A same-owner parcel a
    // quarter mile away is interesting context, not part of a contiguous
    // holding, and adding it would be the exact error this module exists to
    // avoid.
    result.contiguousOwnedAcres = round2(
      selfAcres + result.contiguous.reduce((s, e) => s + e.acres, 0));
    result.nearbyOwnedAcres = round2(result.nearby.reduce((s, e) => s + e.acres, 0));

    return result;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  return {
    analyze, ownership, sameOwnerNearby, relationship, parcelSeparationMeters,
    contiguousGroups, outline, normalizeOwner, sameOwner, sumField, mix,
    CONTIGUOUS_TOLERANCE_M, ROW_SEPARATION_M, NEARBY_MAX_M,
  };
})();
