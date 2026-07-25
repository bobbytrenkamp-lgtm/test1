# Active Bugs

---

Bug: Filter panel and legend panel positions not persisted to localStorage across sessions
Priority: Low
Affected Files: `js/map.js` (initFilterPanelControls, initLeafletMap)
Root Cause: `fpSavedPos` and `lgSavedPos` are computed during drag and stored in module-level variables, but they are never written to localStorage and are never read back on init. The panel always opens at its CSS default position on page load.
Fix Needed: On dragend, serialize `fpSavedPos` / `lgSavedPos` to a localStorage key (e.g. `dc-panel-positions-v1`). On init, read that key and apply the saved positions if they exist and are within the viewport.
Discovered By: Claude Code (claude-sonnet-4-6) during ARCGIS_FEATURE_GAP_AUDIT pass
Date Discovered: 2026-07-18
Status: Active — not yet fixed

---

# Recently Fixed Bugs (2026-07-25)

---

Bug: AI Stocks — Wrong exchange prefix for META, PATH, VEEV, UBER
Priority: High
Affected Files: `js/stocks.js` (AI_COMPANIES array, lines 28/35/45/63)
Root Cause: Four tickers had wrong exchange prefixes: `NYSE:META` (should be `NASDAQ:META`), `NASDAQ:PATH` (should be `NYSE:PATH`), `NASDAQ:VEEV` (should be `NYSE:VEEV`), `NASDAQ:UBER` (should be `NYSE:UBER`). Wrong prefixes caused TradingView widgets to either fail to load or display incorrect data.
Fix: Corrected all four tickers. Updated `NEWS_ALIASES` keys to match. Updated `data/ai_companies.json`.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — renderDetailTab() company lookup never matched
Priority: High
Affected Files: `js/stocks.js` (renderDetailTab, ~line 538)
Root Cause: `AI_COMPANIES.find(c => c.symbol === sym)` where `sym = stocksState.selectedSymbol` = "NASDAQ:NVDA", but `.symbol` field is just "NVDA". The find always returned undefined, breaking the Fundamentals and Profile tabs.
Fix: Added `getCompanyByTicker(ticker)` helper that looks up by `.ticker` (the full "EXCHANGE:SYMBOL" format). Replaced all broken `.find(c => c.symbol === sym)` calls.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Yahoo Finance URLs contained encoded exchange prefix
Priority: Medium
Affected Files: `js/stocks.js` (renderDetailTab, ~lines 544-548)
Root Cause: `encodeURIComponent(sym)` where `sym = "NASDAQ:NVDA"` → URL became `finance.yahoo.com/quote/NASDAQ%3ANVDA/` which returns a 404.
Fix: Added `getPlainSymbol(ticker)` helper that strips the exchange prefix. All Yahoo Finance links now use just the plain symbol (e.g., "NVDA").
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Compare preset not persisted across sessions
Priority: Medium
Affected Files: `js/stocks.js` (bindStocksEvents, compareSelect handler ~line 779)
Root Cause: The `compareSelect` change handler updated `stocksState.comparePreset` and called `renderChart()` but never called `stocksSavePrefs()`. On page reload, the comparison always reset to "None".
Fix: Added `stocksSavePrefs({ comparePreset: stocksState.comparePreset })` to the handler.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Heatmap section misleadingly labeled "AI Market Heatmap"
Priority: Low
Affected Files: `js/stocks.js` (buildStocksUI), `css/stocks.css`
Root Cause: The TradingView `stock-heatmap` widget was configured with `dataSource: 'SPX500'` (the S&P 500 universe), but the heading said "AI Market Heatmap", implying it showed AI stocks specifically.
Fix: Renamed to "US Market Heatmap" with subtitle "S&P 500 by sector and market cap".
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Theme observer re-rendered all widgets on every DOM mutation
Priority: Medium
Affected Files: `js/stocks.js` (initStocksThemeObserver)
Root Cause: The MutationObserver fired on any `data-theme` or `class` attribute change and immediately re-rendered all 5 TradingView widgets, even if the theme didn't actually change (e.g., from a CSS class toggle for something unrelated).
Fix: Added last-theme tracking (`_lastTheme`) to short-circuit if the theme is unchanged. Added 150ms debounce. Only rerenders lazy-loaded widgets that have already been rendered.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — Nested interactive elements (span[role="button"] inside button)
Priority: Medium
Affected Files: `js/stocks.js` (renderCompanyGrid), `css/stocks.css`
Root Cause: The old card grid used `<button class="stocks-co-card">` containing `<span role="button" tabindex="0" class="stocks-fav-star">`. Nested interactive elements are invalid HTML and cause screen reader / keyboard focus issues.
Fix: Replaced card grid entirely with a semantic `<ul>/<li>` watchlist row layout. Each row has two separate `<button>` elements (company select + favorite star) as siblings — no nesting.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

Bug: AI Stocks — News tab did not filter future-dated or duplicate articles
Priority: Low
Affected Files: `js/stocks.js` (renderNewsTab)
Root Cause: (1) Articles with `published_at` dates in the future were shown. (2) Articles with duplicate URLs or titles could appear multiple times. (3) Articles with non-HTTP URLs were used in `href` attributes (potential XSS vector).
Fix: Added future-date filter (`pubDate > today`), URL scheme validation (`http://` or `https://`), and deduplication by URL and normalized title.
Fixed By: Claude Code (claude-sonnet-4-6)
Date Fixed: 2026-07-25
Status: Fixed

---

# Recently Fixed Bugs (pre-2026-07-25)

---

Bug: togglePoliticalRiskLayer() references undefined variable `countyLayer`
Priority: Medium
Affected Files: `js/map.js` (line ~991)
Root Cause: `togglePoliticalRiskLayer()` was calling `countyLayer.setStyle(...)`, but `countyLayer` is never defined. The correct variable is `countyGeoLayer`.
Fix: Replaced `countyLayer` with `countyGeoLayer`; also added re-apply of `selectedCountyStyle()` to preserve selected county outline after restyle.
Discovered By: Claude Code (claude-sonnet-4-6) during ARCGIS_FEATURE_GAP_AUDIT pass
Date Discovered: 2026-07-18
Fixed By: Claude Code (claude-sonnet-4-6) — Phase 2 session
Date Fixed: 2026-07-18
Status: Fixed

---

Bug: Filter panel and legend panel positions not persisted to localStorage across sessions
Priority: Low
Affected Files: `js/map.js` (initFilterPanelControls, initLeafletMap)
Root Cause: `fpSavedPos` and `lgSavedPos` are computed during drag and stored in module-level variables, but they are never written to localStorage and are never read back on init. The panel always opens at its CSS default position on page load.
Fix Needed: On dragend, serialize `fpSavedPos` / `lgSavedPos` to a localStorage key (e.g. `dc-panel-positions-v1`). On init, read that key and apply the saved positions if they exist and are within the viewport.
Discovered By: Claude Code (claude-sonnet-4-6) during ARCGIS_FEATURE_GAP_AUDIT pass
Date Discovered: 2026-07-18
Status: Active — not yet fixed

---

# Recently Fixed Bugs (2026-07-16)

---

Bug: Mobile detail-sheet close button (×) does not respond to tap
Priority: High
Affected Files: `js/map.js`, `css/style.css`
Root Cause: Two compounding issues. (1) The `#detail-panel` had no `pointer-events: none` when off-screen (`translateY(110%)`), so element geometry could intercept touches in edge cases. (2) The detailClose listener only called `closeMobileSheet()` (class removal) without clearing `selectedFips` or resetting county style; additionally, iOS Safari sometimes swallows click events on elements inside Leaflet's map context before they reach the button. A `touchend` handler was present on `#measure-clear-btn` but was missing the crucial `touchstart` preventDefault to block Leaflet's own gesture recogniser from consuming the gesture first.
Fix: (1) Added `pointer-events: none; visibility: hidden` to the closed-state `#detail-panel` CSS in the mobile media query; restoring both on `.sheet-open`. (2) Replaced `closeMobileSheet` listener on detailClose with `requestCloseDetailSheet()` — a single function that also clears `selectedFips` and resets county style. (3) Added explicit `touchstart` (stopPropagation) + `touchend` (preventDefault + stopPropagation) handlers on the close button.
Testing Performed: Code inspection; confirmed correct CSS specificity and JS call chain.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: "Click map to start" empty-state card floats visibly on mobile load
Priority: Medium
Affected Files: `css/style.css`
Root Cause: `#detail-panel` is `position: fixed; transform: translateY(110%)` on mobile. While `translateY(110%)` positions the panel off-screen, the element had no `pointer-events: none; visibility: hidden` guard in the closed state. On some iOS Safari viewport sizes the panel top-edge could be visible near the bottom of the map area, and ghost-touches were still being absorbed by the panel.
Fix: Added `pointer-events: none; visibility: hidden` to `#detail-panel` in `@media (max-width: 700px)`, and `pointer-events: auto; visibility: visible` to `#detail-panel.sheet-open`. `visibility` uses a `transition: visibility 0s linear Xs` delay so it hides only after the slide-down animation finishes and appears immediately on open.
Testing Performed: Code inspection.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: GIS toolbar buttons overlap the county bottom-sheet header and close button on mobile
Priority: High
Affected Files: `css/style.css`, `js/map.js`
Root Cause: `#map-gis-bar` (`z-index: 450`, `position: absolute`) is inside `#map-container`. `#detail-panel.sheet-open` was `z-index: 500` (already raised in PR #100). However, on some iOS Safari versions stacking context rendering for position:fixed children of position:fixed parents may not strictly follow z-index order, allowing the GIS bar to visually or touch-intercept the sheet header. Additionally, there was no mechanism to clip the GIS bar height when the sheet was open, so its buttons extended down into the sheet's visible area.
Fix: When the sheet is open, `body.detail-sheet-open` class is added. CSS `body.detail-sheet-open #map-gis-bar { max-height: calc(var(--sheet-top, 30dvh) - 28px); overflow: hidden; }` clips toolbar buttons that would overlap the sheet. `--sheet-top` is set from JS in `openMobileSheet()` (estimated immediately, refined after the 0.28s transition). The `#detail-panel-close` button also gets explicit `pointer-events: auto; position: relative; z-index: 1` so no pseudo-elements or overlays can shadow it.
Testing Performed: Code inspection.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

Bug: Swipe-down gesture on detail sheet handle only checked threshold, gave no visual feedback
Priority: High
Affected Files: `js/map.js`
Root Cause: The prior implementation (added in PR #100) only checked `dy > 60` on `touchend` and called `closeMobileSheet()`. The panel never followed the user's finger during the gesture.
Fix: Replaced the old handle-only handler with `initDetailSheetSwipe()` — a new function called from `init()`. The gesture listens to `touchstart` on both `#detail-panel-handle` and `#detail-header` (excluding interactive children via INTERACTIVE selector), then `touchmove`/`touchend`/`touchcancel` on the panel itself. During drag the panel's `transform: translateY(px)` is set in real-time with `transition: none`. On release: if `dy > 80` OR swipe velocity `> 0.35 px/ms`, a 260 ms `ease-out` animation slides the panel out before calling `requestCloseDetailSheet()`; otherwise the panel snaps back to `translateY(0)` in 240 ms. `_sheetClosing` flag prevents re-entrant calls during the animation.
Testing Performed: Code inspection; node syntax check passed.
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-16

# Fixed Bugs

Bug: Map Layers panel closes when clicking outside on desktop
Solution: Added `if (window.innerWidth > 700) return;` guard inside `onOutsideTap` in `initFilterPanelControls()`. Matches existing 700px CSS breakpoint. Mobile tap-to-close preserved.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Layer toggles only work once — clicking a toggle twice has no visible effect
Solution: Added `e.preventDefault()` to the desktop `click` handler on each `.filter-row` label inside `renderFilterPanel()`. The browser's native label→input click-forwarding was dispatching a second synthetic click on the wrapped checkbox, which toggled `input.checked` via pre-activation, bubbled back through the label, and fired `handleToggle` a second time — undoing the first toggle. `e.preventDefault()` stops the native forwarding so each user click results in exactly one `handleToggle` call.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Orange county outline trail appears when click-dragging across the map on desktop
Solution: Added drag-guard state variables (isMouseDown, isDraggingMap, suppressClickUntil, hoveredCountyLayer). Hooked Leaflet dragstart/dragend/mousedown/mouseup. mouseover/mousemove return early when drag is in progress. clearHoveredCounty() called on dragstart and dragend.
Files Changed: `js/map.js`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Filter panel toggles non-interactive on iOS Safari
Solution: Replaced document-level change listener with per-row touchend handler that calls handleToggle() directly, bypassing iOS Safari's broken label→input click-forwarding when -webkit-user-select:none is set on the label.
Files Changed: `js/map.js`, `css/style.css`
Fixed By: Claude Code (claude-sonnet-4-6)
Date: 2026-07-09

Bug: Filter panel overlapping search bar on mobile
Solution: Dynamic maxHeight capping in openFilterPanel() using map-container.getBoundingClientRect().height.
Files Changed: `js/map.js`
Fixed By: Claude Code
Date: 2026-07-09

Bug: Filter panel at wrong stacking level — iOS touch hit-area clipped by overflow:hidden ancestor
Solution: Moved #filter-panel and #filter-panel-backdrop to body level (outside #app and #map-container). Both now position:fixed in root stacking context.
Files Changed: `index.html`, `css/style.css`, `js/map.js`
Fixed By: Claude Code
Date: 2026-07-09

# Do Not Reintroduce

- Do not let Leaflet panes render above application UI controls. Preserve the `#leaflet-map` stacking/isolation behavior documented in `AI_CONTEXT.md`.
- Do not lose the selected county highlight after toggling layers. Re-apply selected county styling after broad county style resets.
- Do not regress mobile map usability. Detail panels, layer controls, legend behavior, and dashboard collapse must remain usable on phone-sized screens.
- Do not replace verified or vendored dependencies with CDN-only dependencies without documenting the deployment tradeoff.
