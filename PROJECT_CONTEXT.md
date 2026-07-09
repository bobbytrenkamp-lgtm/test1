# Project Overview

This application is an interactive US map for tracking data center construction restrictions, AI regulations, high-intensity computing limits, moratoriums, tax incentives, and related infrastructure context at state, county, and city levels.

The intended user experience is a polished, fast, Google Maps-like regulatory map. Users should be able to pan, zoom, search, toggle layers, select a county, and immediately understand the full regulatory picture that applies to that location.

The long-term vision is to become a reliable nationwide intelligence tool for data center and AI infrastructure planning. The map should combine verified regulation data, facility and infrastructure overlays, source citations, and mobile-friendly exploration so users can compare jurisdictions without losing geographic context.

# Tech Stack

- Framework: No frontend framework; static single-page application.
- Languages: HTML, CSS, JavaScript, Python for data processing and validation.
- Mapping libraries: Leaflet.js v1.9.4, topojson-client v3, us-atlas county/state TopoJSON.
- UI libraries: No major UI framework; custom responsive CSS and native browser controls.
- Data sources: Curated local JSON files in `data/`, including county restrictions, state regulations, sample facility/infrastructure overlays, tax incentives, water stress, county names, and monitoring reports.
- Deployment method: GitHub Pages from the `main` branch, with GitHub Actions for Pages deployment, data updates, and legislation monitoring.

# Design Philosophy

- The application should feel like Google Maps: familiar pan/zoom behavior, natural basemap details, and smooth location exploration.
- Prioritize mobile-first design. Map selection, panels, filters, and legends must remain usable on phone-sized screens.
- Maintain a polished professional interface suitable for planning, policy, and infrastructure research.
- Avoid fixing one feature by breaking another. Treat map behavior, layer toggles, search, mobile layout, and detail panels as connected systems.
- Keep UI consistent across desktop and mobile. Controls may adapt, but visual language and feature availability should remain coherent.

# Current Major Features

## Completed Features

- Leaflet-based interactive US map with native pan, zoom, and touch support.
- County-level choropleth layer for restriction severity.
- State-level regulation layer beneath counties.
- Basemap modes for standard, satellite, and hybrid views.
- Layer toggles for sample data centers, AI campuses, power infrastructure, transmission, fiber, water stress, utilities, and tax incentives.
- County and facility search with autocomplete.
- Clickable counties with detail panel content.
- Responsive dashboard, legend, layer panel, stats bar, and mobile bottom-sheet detail panel.
- Vendored map dependencies for more reliable static deployment.

## Partially Completed Features

- City regulation layer: required by product direction, but not yet fully represented as a distinct verified data layer.
- Real facility and infrastructure datasets: current overlay files include sample or placeholder content that should be replaced or verified.
- State-level detail content: state regulations are shown as a layer, but selected county details need richer state policy integration.
- County name coverage: `data/county_names.json` exists, but future work should verify all fallback behavior.

## Planned Features

- Verified city-level regulation data and display.
- Overlapping regulation display that combines state, county, and city rules in one selected-place view.
- Deeper Google Maps-like zoom behavior with natural city and landmark visibility.
- Shareable links for selected counties, layers, and map positions.
- More complete verified data center, utility, water, tax, power, and fiber datasets.

# Map Requirements

- The map must support a statewide regulation layer.
- The map must support a county regulation layer.
- The map must support a city regulation layer.
- The map must be able to display overlapping regulations.
- A selected county should show:
  1. State regulations.
  2. County regulations.
  3. City regulations inside that county, when available.
- The map should support deeper zooming like Google Maps.
- Cities and landmarks should appear naturally when zooming.

# Rules For AI Assistants

- Always read `PROJECT_CONTEXT.md` before coding.
- Always read `AI_CHANGELOG.md` before coding.
- Always read `BUG_TRACKER.md` before coding.
- Never remove existing functionality without explaining why.
- Preserve working features.
- Make targeted changes and avoid large rewrites unless explicitly justified.
- Update `AI_CHANGELOG.md` after every coding session.
- Update `BUG_TRACKER.md` when fixing or discovering bugs.
- Leave clear instructions for the next AI assistant.
