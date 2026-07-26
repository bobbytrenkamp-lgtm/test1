/* js/news.js — AI News feed: rendering, filtering, and the article detail panel.

   Extracted verbatim from js/map.js, which had grown to 8,347 lines. That size
   is not cosmetic: the double-switchTab and the stocks workspace collapse both
   came from nobody being able to hold a file that large in their head. The code
   below is unchanged — only relocated.

   Classic scripts share one global scope, so these functions stay callable by
   bare name from map.js (switchTab calls renderNews, renderNewsStatusBar, and
   initNewsView) and nothing needed rewiring.

   NOTE: formatDate() lives here but is also called by js/stocks.js. That is a
   pre-existing cross-file dependency through the shared global scope, not one
   introduced by this split — moving it out of here would break the stocks news
   tab. Kept together and flagged rather than silently relied upon.

   Reads the globals `newsArticles` and `newsCurrentFilters` declared in map.js.
*/

/* ── AI News Feed ── */
function categoryClass(cat) {
  return "cat-" + (cat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

function formatDate(iso) {
  if (!iso) return "";
  // Handle both "2026-07-11" (old schema) and full ISO strings (new schema)
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00Z");
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* Populate the State and Publisher filter dropdowns from actual article data */
function initNewsDynamicDropdowns() {
  const stateSel  = document.getElementById("news-state-filter");
  const sourceSel = document.getElementById("news-source-filter");
  if (!stateSel || !sourceSel) return;

  // Remove old options (keep "All X" first option)
  while (stateSel.options.length > 1) stateSel.remove(1);
  while (sourceSel.options.length > 1) sourceSel.remove(1);

  const states  = new Set();
  const sources = new Set();
  for (const a of newsArticles) {
    if (a.location?.state) states.add(a.location.state);
    if (a.source) sources.add(a.source);
  }

  for (const abbr of [...states].sort()) {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = `${STATE_NAMES[abbr] || abbr} (${abbr})`;
    stateSel.appendChild(opt);
  }
  for (const src of [...sources].sort()) {
    const opt = document.createElement("option");
    opt.value = src;
    opt.textContent = src;
    sourceSel.appendChild(opt);
  }
}

function filterNewsArticles() {
  return newsArticles.filter(a => {
    if (newsFilters.category && a.category !== newsFilters.category) return false;
    if (newsFilters.state && a.location?.state !== newsFilters.state) return false;
    if (newsFilters.source && a.source !== newsFilters.source) return false;
    if (newsFilters.search) {
      const q = newsFilters.search.toLowerCase();
      const haystack = [
        a.title, a.description, a.summary, a.source, a.category,
        a.location?.state, a.location?.county,
        ...(a.tags || []),
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ── Article detail panel ── */
let detailOpenArticle  = null;
let detailFocusReturn  = null;
let detailReleaseFocus = null;  // cleanup fn for focus trap

function openArticleDetail(art, returnEl) {
  detailOpenArticle = art;
  detailFocusReturn = returnEl || null;

  const panel    = document.getElementById("article-detail");
  const backdrop = document.getElementById("article-detail-backdrop");

  // Populate fields (only set text content — no innerHTML from article data)
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "";
  };

  const catEl = document.getElementById("article-detail-cat");
  if (catEl) {
    catEl.textContent  = art.category || "";
    catEl.className    = `news-category-tag ${categoryClass(art.category)}`;
  }
  setTxt("article-detail-source", art.source || "");
  setTxt("article-detail-date",   formatDate(art.published_at || art.publishedAt));
  setTxt("article-detail-title",  art.title || "");

  // Location
  const locEl = document.getElementById("article-detail-location");
  if (locEl) {
    const state  = art.location?.state  || null;
    const county = art.location?.county || null;
    if (state) {
      const btn = document.createElement("button");
      btn.className = "news-location-link";
      btn.textContent = state + (county ? ` – ${county}` : "");
      btn.addEventListener("click", () => {
        activeStateFilter = state;
        applyFilters();
        switchTab("map");
        closeArticleDetail();
      });
      locEl.innerHTML = "";
      locEl.appendChild(btn);
    } else {
      locEl.innerHTML = "";
    }
  }

  // Summary section
  const summaryText = art.summary || art.description || "";
  setTxt("article-detail-summary", summaryText);

  const kpList = document.getElementById("article-detail-keypoints");
  if (kpList) {
    kpList.innerHTML = "";
    const points = art.key_points || [];
    // If no key points and no summary, hide the section
    points.forEach(pt => {
      const li = document.createElement("li");
      li.textContent = pt;
      kpList.appendChild(li);
    });
    kpList.hidden = points.length === 0;
  }

  const mattersLbl = document.getElementById("article-detail-matters-label");
  const mattersEl  = document.getElementById("article-detail-matters");
  if (mattersEl) {
    const matters = art.why_it_matters || "";
    mattersEl.textContent = matters;
    mattersEl.hidden = !matters;
    if (mattersLbl) mattersLbl.hidden = !matters;
  }

  // Attribution note — only show if we know this is deterministically generated
  const attrEl = document.getElementById("article-detail-attribution");
  if (attrEl) {
    const method = art.summary_method || "unavailable";
    attrEl.hidden = method === "unavailable";
  }

  // Tags
  const tagsEl = document.getElementById("article-detail-tags");
  if (tagsEl) {
    tagsEl.innerHTML = "";
    (art.tags || []).forEach(tag => {
      const sp = document.createElement("span");
      sp.className   = "news-tag";
      sp.textContent = tag;
      tagsEl.appendChild(sp);
    });
  }

  // Original article link
  const linkEl = document.getElementById("article-detail-link");
  if (linkEl) {
    if (art.url && art.url.startsWith("http")) {
      linkEl.href = art.url;
      linkEl.textContent = "";
      linkEl.textContent = `Read the original article on ${art.source || "the publisher's site"}`;
      // Re-append the SVG icon
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "13"); svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2.5");
      svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>';
      linkEl.appendChild(svg);
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }
  }

  // Show panel — unhide first, then add "open" in next frame so CSS transition fires
  panel.hidden = false;
  backdrop.classList.add("open");
  requestAnimationFrame(() => panel.classList.add("open"));

  // Prevent background scroll on mobile
  document.body.classList.add("detail-open");

  // Push history state for back-button support
  history.pushState({ articleDetail: true }, "");

  // Focus trap
  const closeBtn = document.getElementById("article-detail-close");
  if (closeBtn) closeBtn.focus();
  detailReleaseFocus = _trapFocus(panel);
}

function closeArticleDetail() {
  if (!detailOpenArticle) return;
  detailOpenArticle = null;

  const panel    = document.getElementById("article-detail");
  const backdrop = document.getElementById("article-detail-backdrop");

  panel.classList.remove("open");
  backdrop.classList.remove("open");
  // Wait for transition then hide
  setTimeout(() => { if (!detailOpenArticle) panel.hidden = true; }, 300);

  document.body.classList.remove("detail-open");

  if (detailReleaseFocus) { detailReleaseFocus(); detailReleaseFocus = null; }

  if (detailFocusReturn) {
    detailFocusReturn.focus();
    detailFocusReturn = null;
  }
}

function _trapFocus(container) {
  const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function handler(e) {
    if (e.key !== "Tab") return;
    const els   = [...container.querySelectorAll(FOCUSABLE)];
    const first = els[0];
    const last  = els[els.length - 1];
    if (!first) return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }
  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

/* ── Editorial news rendering helpers ───────────────────────────────── */

function _cleanTitle(title, source) {
  if (!title) return "";
  // Strip trailing publisher name patterns: " - Source Name" or " | Source Name"
  // Conservative match: suffix must start with uppercase, be 2-55 chars
  return title.trim()
    .replace(/\s+[-–|]\s+[A-Z-￿][A-Za-z0-9\s&'.,!]{2,55}$/, "")
    .trim();
}

function _fmtRelTime(iso) {
  if (!iso) return "";
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00Z");
  if (isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day <= 3) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function _isFutureDate(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d) && d.getTime() > Date.now() + 7200000; // 2h clock-skew tolerance
}

const _NEWS_CAT_COLORS = {
  "AI Industry":            "#a78bfa",
  "AI Research":            "#34d399",
  "AI Products":            "#60a5fa",
  "AI Safety":              "#f87171",
  "Federal Policy":         "#fbbf24",
  "State/Local Policy":     "#f97316",
  "International Policy":   "#818cf8",
  "Data Centers":           "#5b8def",
  "Energy & Environment":   "#10b981",
  "Chips & Infrastructure": "#f472b6",
  "Business & Investment":  "#eab308",
  "Legal & Copyright":      "#dc2626",
  "Jobs & Society":         "#22d3ee",
  "Other AI News":          "#9ca3af",
};

function _newsCatColor(cat) {
  return _NEWS_CAT_COLORS[cat] || "#9ca3af";
}

function _articleRelevanceScore(art) {
  if (_isFutureDate(art.published_at)) return -100;
  let s = 0;
  const HIGH = ["State/Local Policy","Federal Policy","Data Centers","Legal & Copyright","Chips & Infrastructure","Energy & Environment"];
  const MED  = ["Business & Investment","AI Products","AI Industry","AI Research","AI Safety","International Policy","Jobs & Society"];
  if (HIGH.includes(art.category)) s += 30;
  else if (MED.includes(art.category)) s += 10;
  if (art.location?.state)    s += 20;
  if (art.location?.county)   s += 8;
  if (art.why_it_matters)     s += 15;
  if (art.key_points?.length) s += 10;
  if (art.summary && art.summary !== art.description && art.summary !== art.title) s += 5;
  if (art.published_at) {
    const h = (Date.now() - new Date(art.published_at).getTime()) / 3600000;
    if (h < 3)        s += 20;
    else if (h < 12)  s += 12;
    else if (h < 24)  s += 6;
    else if (h < 72)  s += 2;
  }
  return s;
}

function _groupDuplicates(arts) {
  const norm = t => (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 65);
  const seen = new Map(); // norm_key → article id
  const extras = new Map(); // primary id → [dup articles]
  const out = [];
  for (const a of arts) {
    const k = norm(_cleanTitle(a.title, a.source));
    if (seen.has(k)) {
      const pid = seen.get(k);
      if (!extras.has(pid)) extras.set(pid, []);
      extras.get(pid).push(a);
    } else {
      seen.set(k, a.id);
      out.push(a);
    }
  }
  return out.map(a => ({ ...a, _also: extras.get(a.id) || [] }));
}

function _wireArtClick(el, art) {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `Read: ${_cleanTitle(art.title, art.source)}`);
  const open = () => openArticleDetail(art, el);
  el.addEventListener("click", e => {
    if (e.target.closest(".news-location-link")) return;
    open();
  });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
}

function _makeLocLink(art) {
  if (!art.location?.state) return null;
  const btn = document.createElement("button");
  btn.className = "news-location-link";
  btn.type = "button";
  btn.textContent = art.location.state + (art.location.county ? ` – ${art.location.county}` : "");
  btn.addEventListener("click", e => {
    e.stopPropagation();
    activeStateFilter = art.location.state;
    applyFilters();
    switchTab("map");
  });
  return btn;
}

function _catDot(cat) {
  const d = document.createElement("span");
  d.className = "news-cat-dot";
  d.style.background = _newsCatColor(cat);
  d.setAttribute("aria-hidden", "true");
  return d;
}

function _catTag(cat) {
  const t = document.createElement("span");
  t.className = `news-category-tag ${categoryClass(cat)}`;
  t.textContent = cat || "";
  return t;
}

function _sep() {
  const s = document.createElement("span");
  s.className = "news-meta-sep";
  s.setAttribute("aria-hidden", "true");
  s.textContent = "·";
  return s;
}

function _timeDisplay(iso) {
  if (_isFutureDate(iso)) return `Scheduled for ${formatDate(iso)}`;
  return _fmtRelTime(iso) || formatDate(iso);
}

/* ── Lead story ── */
function _buildLeadStory(art) {
  const wrap = document.createElement("section");
  wrap.className = "news-lead";
  wrap.setAttribute("aria-label", "Lead story");
  _wireArtClick(wrap, art);

  const catRow = document.createElement("div");
  catRow.className = "news-lead-cat-row";
  catRow.appendChild(_catTag(art.category));
  const loc = _makeLocLink(art);
  if (loc) catRow.appendChild(loc);
  wrap.appendChild(catRow);

  const h2 = document.createElement("h2");
  h2.className = "news-lead-headline";
  h2.textContent = _cleanTitle(art.title, art.source);
  wrap.appendChild(h2);

  const summ = art.why_it_matters || art.summary || art.description || "";
  const summIsDupe = summ.trim().toLowerCase() === (art.title || "").trim().toLowerCase()
    || summ.trim() === (art.description || "").trim() && summ.trim() === art.title?.trim();
  if (summ && summ.trim() !== (art.title || "").trim()) {
    const p = document.createElement("p");
    p.className = "news-lead-summary";
    p.textContent = summ;
    wrap.appendChild(p);
  }

  const srcRow = document.createElement("div");
  srcRow.className = "news-lead-srcrow";
  const srcEl = document.createElement("span");
  srcEl.className = "news-lead-source";
  srcEl.textContent = art.source || "";
  const timeEl = document.createElement("time");
  timeEl.className = _isFutureDate(art.published_at) ? "news-future-date" : "news-meta-time";
  timeEl.textContent = _timeDisplay(art.published_at);
  if (art.published_at) timeEl.setAttribute("datetime", art.published_at);
  srcRow.append(srcEl, _sep(), timeEl);
  if (art._also?.length) {
    const also = document.createElement("span");
    also.className = "news-also-covered";
    also.textContent = `Also covered by ${art._also.length} source${art._also.length > 1 ? "s" : ""}`;
    srcRow.append(_sep(), also);
  }
  wrap.appendChild(srcRow);
  return wrap;
}

/* ── Developing strip ── */
function _buildDevelopingStrip(art) {
  const strip = document.createElement("div");
  strip.className = "news-developing-strip";
  _wireArtClick(strip, art);

  const lbl = document.createElement("span");
  lbl.className = "news-developing-label";
  lbl.textContent = "Developing";
  strip.appendChild(lbl);

  const hl = document.createElement("span");
  hl.className = "news-developing-headline";
  hl.textContent = _cleanTitle(art.title, art.source);
  strip.appendChild(hl);

  const t = document.createElement("span");
  t.className = "news-developing-time";
  t.textContent = _fmtRelTime(art.published_at) || formatDate(art.published_at);
  strip.appendChild(t);
  return strip;
}

function _getDevelopingStory(sorted) {
  const DEV_CATS = ["State/Local Policy","Federal Policy","Data Centers","Legal & Copyright","Energy & Environment"];
  return sorted.find(a =>
    DEV_CATS.includes(a.category) &&
    a.location?.state &&
    !_isFutureDate(a.published_at) &&
    (a.why_it_matters || a.key_points?.length > 0) &&
    a.published_at &&
    (Date.now() - new Date(a.published_at).getTime()) < 3 * 3600000
  ) || null;
}

/* ── Top Developments (side column stacked items) ── */
function _buildDevItem(art) {
  const item = document.createElement("article");
  item.className = "news-dev-item";
  _wireArtClick(item, art);

  const catEl = document.createElement("div");
  catEl.className = "news-dev-cat";
  catEl.appendChild(_catDot(art.category));
  catEl.appendChild(_catTag(art.category));
  item.appendChild(catEl);

  const hl = document.createElement("div");
  hl.className = "news-dev-headline";
  hl.textContent = _cleanTitle(art.title, art.source);
  item.appendChild(hl);

  const meta = document.createElement("div");
  meta.className = "news-dev-meta";
  const src = document.createElement("span");
  src.textContent = art.source || "";
  meta.appendChild(src);
  meta.appendChild(_sep());
  const t = document.createElement("span");
  t.textContent = _timeDisplay(art.published_at);
  meta.appendChild(t);
  const loc = _makeLocLink(art);
  if (loc) { meta.appendChild(_sep()); meta.appendChild(loc); }
  item.appendChild(meta);
  return item;
}

function _buildTopDev(arts) {
  const wrap = document.createElement("aside");
  wrap.className = "news-top-dev";
  wrap.setAttribute("aria-label", "Top Developments");
  const lbl = document.createElement("div");
  lbl.className = "news-side-section-label";
  lbl.textContent = "Top Developments";
  wrap.appendChild(lbl);
  arts.slice(0, 6).forEach(a => wrap.appendChild(_buildDevItem(a)));
  return wrap;
}

/* ── Latest News wire ── */
function _buildWireItem(art) {
  const item = document.createElement("article");
  item.className = "news-wire-item";
  _wireArtClick(item, art);

  const d = art.published_at && !_isFutureDate(art.published_at) ? new Date(art.published_at) : null;
  const timeEl = document.createElement("time");
  timeEl.className = "news-wire-time";
  if (d && !isNaN(d)) {
    timeEl.textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    timeEl.setAttribute("datetime", art.published_at);
  } else { timeEl.textContent = "—"; }
  item.appendChild(timeEl);

  const body = document.createElement("div");
  body.className = "news-wire-body";
  const hl = document.createElement("div");
  hl.className = "news-wire-headline";
  hl.textContent = _cleanTitle(art.title, art.source);
  body.appendChild(hl);
  const metaEl = document.createElement("div");
  metaEl.className = "news-wire-meta";
  let mArr = [art.source, art.category, art.location?.state].filter(Boolean);
  metaEl.textContent = mArr.join(" · ");
  body.appendChild(metaEl);
  item.appendChild(body);
  return item;
}

function _buildLatestWire(arts) {
  const wrap = document.createElement("aside");
  wrap.className = "news-latest-wire";
  wrap.setAttribute("aria-label", "Latest News");
  const lbl = document.createElement("div");
  lbl.className = "news-side-section-label";
  lbl.textContent = "Latest News";
  wrap.appendChild(lbl);
  arts.filter(a => !_isFutureDate(a.published_at)).slice(0, 15).forEach(a => wrap.appendChild(_buildWireItem(a)));
  return wrap;
}

/* ── Most Important Today (ranked) ── */
function _buildMostImportant(arts) {
  const wrap = document.createElement("aside");
  wrap.className = "news-most-important";
  wrap.setAttribute("aria-label", "Most Important Today");
  const lbl = document.createElement("div");
  lbl.className = "news-side-section-label";
  lbl.textContent = "Most Important Today";
  wrap.appendChild(lbl);
  arts.slice(0, 5).forEach((art, i) => {
    const item = document.createElement("article");
    item.className = "news-mi-item";
    _wireArtClick(item, art);

    const rank = document.createElement("div");
    rank.className = "news-mi-rank";
    rank.setAttribute("aria-hidden", "true");
    rank.textContent = String(i + 1);
    item.appendChild(rank);

    const body = document.createElement("div");
    body.className = "news-mi-body";
    const hl = document.createElement("div");
    hl.className = "news-mi-headline";
    hl.textContent = _cleanTitle(art.title, art.source);
    body.appendChild(hl);
    const meta = document.createElement("div");
    meta.className = "news-mi-meta";
    meta.textContent = [art.source, art.location?.state].filter(Boolean).join(" · ");
    body.appendChild(meta);
    item.appendChild(body);
    wrap.appendChild(item);
  });
  return wrap;
}

/* ── Article headline row ── */
function _buildArticleRow(art) {
  const row = document.createElement("article");
  row.className = "news-row";
  _wireArtClick(row, art);

  row.appendChild(_catDot(art.category));

  const body = document.createElement("div");
  body.className = "news-row-body";
  const hl = document.createElement("div");
  hl.className = "news-row-headline";
  hl.textContent = _cleanTitle(art.title, art.source);
  body.appendChild(hl);
  const meta = document.createElement("div");
  meta.className = "news-row-meta-inline";
  const loc = _makeLocLink(art);
  const mParts = [art.source, art.location?.state && !loc ? art.location.state : null].filter(Boolean);
  meta.textContent = mParts.join(" · ");
  if (loc) { meta.appendChild(document.createTextNode(mParts.length ? " · " : "")); meta.appendChild(loc); }
  body.appendChild(meta);
  row.appendChild(body);

  const timeEl = document.createElement("div");
  timeEl.className = "news-row-time";
  timeEl.textContent = _isFutureDate(art.published_at) ? "Scheduled" : _fmtRelTime(art.published_at);
  row.appendChild(timeEl);
  return row;
}

/* ── Topic section block ── */
function _buildSectionBlock(label, arts, sectionId, viewAllCat) {
  if (!arts.length) return null;
  const wrap = document.createElement("section");
  wrap.className = "news-section-block";
  wrap.setAttribute("aria-label", label);
  wrap.dataset.sectionId = sectionId;

  const hdr = document.createElement("div");
  hdr.className = "news-section-label";
  hdr.textContent = label;
  wrap.appendChild(hdr);

  // Featured first article
  const feat = document.createElement("div");
  feat.className = "news-section-featured";
  _wireArtClick(feat, arts[0]);

  const featCatRow = document.createElement("div");
  featCatRow.className = "news-section-feat-cat";
  featCatRow.appendChild(_catTag(arts[0].category));
  const fl = _makeLocLink(arts[0]);
  if (fl) featCatRow.appendChild(fl);
  feat.appendChild(featCatRow);

  const featHl = document.createElement("h3");
  featHl.className = "news-section-featured-headline";
  featHl.textContent = _cleanTitle(arts[0].title, arts[0].source);
  feat.appendChild(featHl);

  const rawSumm = arts[0].why_it_matters || arts[0].summary || arts[0].description || "";
  if (rawSumm && rawSumm.trim() !== (arts[0].title || "").trim()) {
    const p = document.createElement("p");
    p.className = "news-section-featured-summary";
    p.textContent = rawSumm;
    feat.appendChild(p);
  }

  const featMeta = document.createElement("div");
  featMeta.className = "news-feat-meta";
  featMeta.textContent = [arts[0].source, _timeDisplay(arts[0].published_at)].filter(Boolean).join(" · ");
  feat.appendChild(featMeta);
  wrap.appendChild(feat);

  // Remaining as headline rows
  arts.slice(1, 8).forEach(a => wrap.appendChild(_buildArticleRow(a)));

  if (viewAllCat) {
    const viewAll = document.createElement("button");
    viewAll.className = "news-section-viewall";
    viewAll.type = "button";
    viewAll.textContent = `View all ${label} →`;
    viewAll.addEventListener("click", e => {
      e.stopPropagation();
      newsFilters.category = viewAllCat;
      const sel = document.getElementById("news-cat-filter");
      if (sel) sel.value = viewAllCat;
      renderNews();
    });
    wrap.appendChild(viewAll);
  }
  return wrap;
}

/* ── Main renderNews ──────────────────────────────────────────────── */
function renderNews() {
  const grid    = document.getElementById("news-grid");
  const empty   = document.getElementById("news-empty");
  const errorEl = document.getElementById("news-error");
  if (!grid) return;

  const matches = filterNewsArticles();
  grid.innerHTML = "";

  updateNewsStatusCount(matches.length, newsArticles.length);
  const clearBtn = document.getElementById("news-clear-filters");
  if (clearBtn) {
    const isFiltered = newsFilters.search || newsFilters.category || newsFilters.state || newsFilters.source;
    clearBtn.hidden = !isFiltered;
  }

  if (newsArticles.length === 0) {
    empty.hidden = false;
    empty.textContent = "No recent AI news articles. The feed updates every hour — check back shortly.";
    if (errorEl) errorEl.hidden = true;
    return;
  }

  empty.hidden = matches.length > 0;
  if (!matches.length) {
    empty.textContent = "No articles match your filters.";
    return;
  }
  if (errorEl) errorEl.hidden = true;

  // Deduplicate, score, sort
  const deduped  = _groupDuplicates(matches);
  const sorted   = [...deduped].sort((a, b) => _articleRelevanceScore(b) - _articleRelevanceScore(a));
  const byTime   = [...deduped]
    .filter(a => !_isFutureDate(a.published_at))
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));

  const wrapper = document.createElement("div");
  wrapper.className = "news-editorial-wrapper";

  // ── Publication header ──
  const pubHdr = document.createElement("header");
  pubHdr.className = "news-pub-header";
  const titleEl = document.createElement("div");
  titleEl.className = "news-pub-title";
  titleEl.textContent = "AI NEWS INTELLIGENCE";
  const descEl = document.createElement("p");
  descEl.className = "news-pub-desc";
  descEl.textContent = "Policy, regulatory, infrastructure, market, and technology developments affecting artificial intelligence and data centers.";
  const secNav = document.createElement("nav");
  secNav.className = "news-section-nav";
  secNav.setAttribute("aria-label", "Jump to section");
  const NAV_ITEMS = [
    { label: "Top Stories", sel: ".news-lead" },
    { label: "Data Centers", sel: "[data-section-id='data-centers']" },
    { label: "Policy",       sel: "[data-section-id='state-policy']" },
    { label: "Legal",        sel: "[data-section-id='legal']" },
    { label: "Markets",      sel: "[data-section-id='companies']" },
    { label: "Research",     sel: "[data-section-id='research']" },
    { label: "Latest",       sel: ".news-latest-wire" },
  ];
  NAV_ITEMS.forEach(({ label, sel }) => {
    const btn = document.createElement("button");
    btn.className = "news-snav-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      grid.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    secNav.appendChild(btn);
  });
  pubHdr.append(titleEl, descEl, secNav);
  wrapper.appendChild(pubHdr);

  // ── Developing strip (only when genuinely recent + substantive) ──
  const devArt = _getDevelopingStory(sorted);
  if (devArt) wrapper.appendChild(_buildDevelopingStrip(devArt));

  // ── Two-column editorial grid ──
  const editGrid = document.createElement("div");
  editGrid.className = "news-editorial-grid";

  // Main column
  const mainCol = document.createElement("div");
  mainCol.className = "news-main-col";
  mainCol.appendChild(_buildLeadStory(sorted[0]));

  const SECTIONS = [
    { id: "data-centers",  label: "Data Centers & Infrastructure", cats: ["Data Centers","Chips & Infrastructure","Energy & Environment"],  viewCat: "Data Centers" },
    { id: "state-policy",  label: "State & Local Policy",           cats: ["State/Local Policy"],                                           viewCat: "State/Local Policy" },
    { id: "federal-policy",label: "Federal Policy",                 cats: ["Federal Policy","International Policy"],                        viewCat: "Federal Policy" },
    { id: "legal",         label: "Legal & Regulatory",             cats: ["Legal & Copyright"],                                            viewCat: "Legal & Copyright" },
    { id: "companies",     label: "AI Companies & Products",        cats: ["AI Products","AI Industry","Business & Investment"],            viewCat: "AI Products" },
    { id: "research",      label: "Research & Technology",          cats: ["AI Research","AI Safety","Jobs & Society"],                     viewCat: "AI Research" },
  ];

  for (const sec of SECTIONS) {
    const secArts = sorted.filter(a => sec.cats.includes(a.category) && a !== sorted[0]).slice(0, 8);
    if (secArts.length >= 1) {
      const block = _buildSectionBlock(sec.label, secArts, sec.id, sec.viewCat);
      if (block) mainCol.appendChild(block);
    }
  }

  editGrid.appendChild(mainCol);

  // Side column
  const sideCol = document.createElement("div");
  sideCol.className = "news-side-col";
  sideCol.appendChild(_buildTopDev(sorted.slice(1, 8)));
  sideCol.appendChild(_buildLatestWire(byTime.slice(0, 15)));
  sideCol.appendChild(_buildMostImportant(sorted.slice(0, 6)));
  editGrid.appendChild(sideCol);

  wrapper.appendChild(editGrid);
  grid.appendChild(wrapper);
}

function renderNewsStatusBar(newsData) {
  const bar = document.getElementById("news-status-bar");
  if (!bar) return;
  bar.innerHTML = "";

  if (!newsData || !newsData.generated_at) { bar.hidden = true; return; }
  const d = new Date(newsData.generated_at);
  if (isNaN(d)) { bar.hidden = true; return; }

  const fmt = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const srcCount = newsData.sources_succeeded || newsData.sources_checked || 0;
  bar.dataset.total   = String(newsData.articles?.length || 0);
  bar.dataset.sources = String(srcCount);
  bar.dataset.fmt     = fmt;

  const row = document.createElement("div");
  row.className = "news-status-row";

  const dot = document.createElement("span");
  dot.className = "news-status-dot";
  dot.setAttribute("aria-label", "Auto-updated hourly");

  const countEl = document.createElement("span");
  countEl.id = "news-status-count";
  countEl.textContent = `${bar.dataset.total} articles`;

  const mkSep = () => { const s = document.createElement("span"); s.className = "news-meta-sep"; s.setAttribute("aria-hidden","true"); s.textContent = "·"; return s; };

  row.append(dot, countEl);
  if (srcCount) {
    const srcEl = document.createElement("span");
    srcEl.textContent = `${srcCount} sources`;
    row.append(mkSep(), srcEl);
  }
  const updEl = document.createElement("span");
  updEl.textContent = `Refreshed ${fmt}`;
  row.append(mkSep(), updEl);

  const freqEl = document.createElement("span");
  freqEl.className = "news-status-freq";
  freqEl.textContent = "Auto-updated hourly";
  row.append(mkSep(), freqEl);

  bar.appendChild(row);
  bar.hidden = false;
}

function updateNewsStatusCount(shown, total) {
  const countEl = document.getElementById("news-status-count");
  if (!countEl) return;
  countEl.textContent = shown !== total ? `${shown} of ${total} articles` : `${total} articles`;
}

function initNewsView() {
  initNewsDynamicDropdowns();

  // Mobile filter panel toggle
  const filtersToggle = document.getElementById("news-filters-toggle");
  if (filtersToggle) {
    filtersToggle.addEventListener("click", () => {
      const toolbar = document.getElementById("news-toolbar");
      const open = toolbar.classList.toggle("filters-open");
      filtersToggle.setAttribute("aria-expanded", open ? "true" : "false");
      filtersToggle.setAttribute("aria-label", open ? "Hide filters" : "Show filters");
    });
  }

  const newsClearBtn = document.getElementById("news-clear-filters");
  if (newsClearBtn) {
    newsClearBtn.addEventListener("click", () => {
      newsFilters = { search: "", category: "", state: "", source: "" };
      document.getElementById("news-search").value = "";
      document.getElementById("news-cat-filter").value = "";
      document.getElementById("news-state-filter").value = "";
      const srcSel = document.getElementById("news-source-filter");
      if (srcSel) srcSel.value = "";
      newsClearBtn.hidden = true;
      renderNews();
    });
  }

  document.getElementById("news-search").addEventListener("input", e => {
    newsFilters.search = e.target.value.trim();
    renderNews();
  });
  document.getElementById("news-cat-filter").addEventListener("change", e => {
    newsFilters.category = e.target.value;
    renderNews();
  });
  document.getElementById("news-state-filter").addEventListener("change", e => {
    newsFilters.state = e.target.value;
    renderNews();
  });
  const srcSel = document.getElementById("news-source-filter");
  if (srcSel) {
    srcSel.addEventListener("change", e => {
      newsFilters.source = e.target.value;
      renderNews();
    });
  }

  // Article detail close
  const closeBtn = document.getElementById("article-detail-close");
  if (closeBtn) closeBtn.addEventListener("click", () => { closeArticleDetail(); history.back(); });

  const backdrop = document.getElementById("article-detail-backdrop");
  if (backdrop) backdrop.addEventListener("click", () => { closeArticleDetail(); history.back(); });

  // Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && detailOpenArticle) { closeArticleDetail(); history.back(); }
  });

  // Back button support
  window.addEventListener("popstate", () => {
    if (detailOpenArticle) closeArticleDetail();
  });
}
