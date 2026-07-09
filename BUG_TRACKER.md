# Active Bugs

Bug:
Priority:
Affected Files:
Description:
Possible Cause:
Assigned/Working AI:
Status:

No active bugs at this time.

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
