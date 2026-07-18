# Active Bugs

---

Bug: togglePoliticalRiskLayer() references undefined variable `countyLayer`
Priority: Medium
Affected Files: `js/map.js` (line ~1003)
Root Cause: `togglePoliticalRiskLayer()` calls `countyLayer.setStyle(...)` and `countyLayer.eachLayer(...)`, but `countyLayer` is never defined in this scope. The correct variable is `countyGeoLayer` (the Leaflet GeoJSON layer for counties). This means the choropleth does not restyle when the political risk layer is toggled on or off.
Fix Needed: Replace `countyLayer` with `countyGeoLayer` in `togglePoliticalRiskLayer()`. Also re-apply `selectedCountyStyle()` to `countyLayerByFips[selectedFips]` after the restyle call.
Discovered By: Claude Code (claude-sonnet-4-6) during ARCGIS_FEATURE_GAP_AUDIT pass
Date Discovered: 2026-07-18
Status: Active — not yet fixed

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
