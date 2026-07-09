# Active Bugs

Bug:
Priority:
Affected Files:
Description:
Possible Cause:
Assigned/Working AI:
Status:

No active bugs have been recorded in this shared tracker yet.

# Fixed Bugs

Bug:
Solution:
Files Changed:
Fixed By:
Date:

No fixed bugs have been recorded in this shared tracker yet.

# Do Not Reintroduce

- Do not let Leaflet panes render above application UI controls. Preserve the `#leaflet-map` stacking/isolation behavior documented in `AI_CONTEXT.md`.
- Do not lose the selected county highlight after toggling layers. Re-apply selected county styling after broad county style resets.
- Do not regress mobile map usability. Detail panels, layer controls, legend behavior, and dashboard collapse must remain usable on phone-sized screens.
- Do not replace verified or vendored dependencies with CDN-only dependencies without documenting the deployment tradeoff.
