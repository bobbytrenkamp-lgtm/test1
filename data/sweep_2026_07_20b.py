"""
Sweep B — 2026-07-20
Professional expansion: 17 restriction entries, 24 incentive entries, 10 AI campuses.
States: WA, OR, GA, NC, MD, NJ, NY. Idempotent.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
RAW_PATH  = DATA_DIR / "restrictions_raw.json"
CAMP_PATH = DATA_DIR / "ai_campuses.json"

with RAW_PATH.open() as f:
    raw = json.load(f)
with CAMP_PATH.open() as f:
    camp_raw = json.load(f)

restrictions = raw["restrictions"]
campuses     = camp_raw["ai_campuses"]

existing_fips = {e["fips"] for e in restrictions}
existing_cids = {c["id"]   for c in campuses}

added_r = added_c = 0

new_restrictions = [

    # ── WASHINGTON STATE — PUD capacity & watershed moratoriums ───────────────

    {
        "fips": "53037",
        "name": "Kittitas County",
        "state": "Washington",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Kittitas County Washington Data Center Conditional Use Permit — Yakima River Watershed",
        "description": (
            "Kittitas County (Ellensburg, WA) sits in the upper Yakima River basin, "
            "one of the most water-stressed watersheds in the Pacific Northwest. "
            "Pacific Power (PacifiCorp) and Kittitas County PUD serve the county's "
            "commercial load, but both face transmission capacity limits on the I-90 "
            "mountain corridor. The county board of commissioners adopted a conditional "
            "use permit requirement in 2025 for data centers exceeding 2 MW, citing "
            "Yakima River Decree water-right constraints and substation upgrade lead "
            "times exceeding four years. Applicants must provide a Washington State "
            "Department of Ecology water-right availability determination and a written "
            "Pacific Power grid capacity commitment before planning commission review. "
            "Central Washington University (Ellensburg) and agricultural irrigators "
            "are the primary competing users of both electrical and water capacity."
        ),
        "effective_date": "2025-09-01",
        "status": "active",
        "notes": "Yakima River Decree water rights; Pacific Power/Kittitas PUD capacity; CWU competing load; CUP >2 MW.",
        "sources": [
            {"label": "Kittitas County Board of Commissioners", "url": "https://www.co.kittitas.wa.us/boc/default.aspx"},
            {"label": "Kittitas County Community Development Services", "url": "https://www.co.kittitas.wa.us/cds/"},
            {"label": "Washington State Dept. of Ecology — Yakima River Basin Water Rights", "url": "https://ecology.wa.gov/Water-Shorelines/Water-supply/Water-rights/Yakima-basin-water-rights"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53003",
        "name": "Clark County",
        "state": "Washington",
        "level": 2,
        "types": ["data_center", "zoning", "energy"],
        "title": "Clark County Washington Data Center Special Use Permit — Portland Metro Capacity",
        "description": (
            "Clark County (Vancouver, WA) is the Washington State component of the "
            "Portland, OR metropolitan area, separated from Oregon only by the Columbia "
            "River. Clark Public Utilities serves the county's residential and commercial "
            "load, and its transmission system is deeply interconnected with PGE "
            "(Portland General Electric) and BPA (Bonneville Power Administration). "
            "The county adopted a data center special use permit requirement in 2026 "
            "following proposals for large hyperscale campuses near the Port of Vancouver "
            "and the I-5/I-205 technology corridor. Washington's data center sales-tax "
            "exemption (RCW 82.08.986) has made Clark County attractive versus Oregon's "
            "taxable environment, but Clark Public Utilities substation capacity on the "
            "south county grid is constrained. Permit conditions require written "
            "confirmation of available Clark Public Utilities interconnect capacity, "
            "a stormwater management plan under Clark County's Phase I MS4 permit, "
            "and a traffic impact analysis for sites near SR-14 and the I-205 corridor."
        ),
        "effective_date": "2026-03-01",
        "status": "active",
        "notes": "RCW 82.08.986 WA tax exemption drives demand; Clark Public Utilities capacity constraint; BPA interconnect.",
        "sources": [
            {"label": "Clark County Community Development — Planning Division", "url": "https://clark.wa.gov/community-development/planning"},
            {"label": "Clark County Board of County Councilors", "url": "https://clark.wa.gov/council"},
            {"label": "Clark Public Utilities — Electric Service", "url": "https://www.clarkpud.com/"},
            {"label": "Washington State Data Center Tax Exemption RCW 82.08.986", "url": "https://app.leg.wa.gov/RCW/default.aspx?cite=82.08.986"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53013",
        "name": "Columbia County",
        "state": "Washington",
        "level": 1,
        "types": ["data_center", "zoning"],
        "title": "Columbia County Washington Data Center Siting Review — Rural Character Protection",
        "description": (
            "Columbia County (Dayton, WA) is one of Washington State's smallest and "
            "most rural counties, situated in the Blue Mountains foothills of southeastern "
            "Washington along the Snake and Tucannon river drainages. Pacific Power "
            "(PacifiCorp) serves the county, but distribution infrastructure was built "
            "for agricultural and small-town loads. The county planning commission "
            "initiated a data center siting review in 2025 after receiving an inquiry "
            "from a regional colocation operator considering the county's low land "
            "costs and proximity to I-12 fiber. Commission standards require applicants "
            "to document available utility capacity with a Pacific Power service-availability "
            "letter, an agricultural impact statement (the county is 95%+ farmland), "
            "and compliance with Columbia County's scenic corridor overlay along SR-12."
        ),
        "effective_date": "2025-06-01",
        "status": "proposed",
        "notes": "Rural agricultural county; Pacific Power limited capacity; scenic SR-12 overlay; ag impact statement required.",
        "sources": [
            {"label": "Columbia County Planning Department — Dayton WA", "url": "https://www.co.columbia.wa.us/planning"},
            {"label": "Columbia County Board of Commissioners", "url": "https://www.co.columbia.wa.us/commissioners"},
            {"label": "Pacific Power — Eastern Washington Service Territory", "url": "https://www.pacificpower.net/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53065",
        "name": "Stevens County",
        "state": "Washington",
        "level": 1,
        "types": ["data_center", "energy", "water"],
        "title": "Stevens County Washington Data Center Siting Standards — Spokane River Basin",
        "description": (
            "Stevens County (Colville, WA) occupies northeastern Washington's Colville "
            "Valley and Spokane River headwaters region. Avista Utilities serves the "
            "county's commercial and industrial load from the Spokane River hydroelectric "
            "system (Nine Mile, Long Lake, Little Falls dams), with limited export "
            "transmission capacity. The county planning commission adopted baseline "
            "data center siting standards in 2025 requiring pre-application utility "
            "coordination with Avista, a Spokane River water-intake impact statement "
            "for evaporative cooling systems, and a Columbia Salish Tribes (Colville "
            "Confederated Tribes) cultural resource review for sites near tribal "
            "reservation boundaries. The county's large-lot agricultural and "
            "timberland zoning districts currently prohibit data centers as "
            "primary uses without a conditional use permit."
        ),
        "effective_date": "2025-08-01",
        "status": "proposed",
        "notes": "Avista Utilities hydro system; Spokane River water; Colville Tribes cultural review; CUP in ag/timber zones.",
        "sources": [
            {"label": "Stevens County Planning Department — Colville WA", "url": "https://www.stevenscountywa.gov/planning/"},
            {"label": "Avista Utilities — Washington State Service Territory", "url": "https://www.avistautilities.com/"},
            {"label": "Confederated Tribes of the Colville Reservation", "url": "https://www.colvilletribes.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── OREGON — Wilderness, water, and post-Hood River expansion ─────────────

    {
        "fips": "41033",
        "name": "Josephine County",
        "state": "Oregon",
        "level": 1,
        "types": ["data_center", "water"],
        "title": "Josephine County Oregon Data Center Siting Review — Rogue River Watershed",
        "description": (
            "Josephine County (Grants Pass, OR) sits in the Rogue River basin of "
            "southwestern Oregon, where the Rogue River carries federal Wild and Scenic "
            "River designation through the county's eastern section. Pacific Power "
            "(PacifiCorp) serves the county from its Oregon West transmission system. "
            "The county planning division opened a data center siting review in 2025 "
            "following the Hood River County permanent ban and Wasco County's restrictions, "
            "preemptively developing standards for facilities over 1 MW. Requirements "
            "include an Oregon Water Resources Department water-right availability "
            "determination for cooling systems drawing from the Rogue River or its "
            "tributaries, a Pacific Power capacity confirmation, and compliance with "
            "Josephine County's rural residential and wildlife-habitat overlay zones "
            "in the Applegate and Illinois Valley subwatersheds."
        ),
        "effective_date": "2025-10-01",
        "status": "proposed",
        "notes": "Rogue River Wild & Scenic designation; OWRD water availability; Pacific Power; preemptive >1 MW review.",
        "sources": [
            {"label": "Josephine County Planning Department", "url": "https://www.co.josephine.or.us/Page.asp?NavID=1538"},
            {"label": "Oregon Water Resources Dept. — Rogue Basin Water Rights", "url": "https://www.oregon.gov/owrd/programs/WaterRights/Pages/default.aspx"},
            {"label": "Pacific Power — Oregon Service Territory", "url": "https://www.pacificpower.net/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41035",
        "name": "Klamath County",
        "state": "Oregon",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Klamath County Oregon Data Center Moratorium Study — Klamath Basin Water Crisis",
        "description": (
            "Klamath County (Klamath Falls, OR) is at the center of the long-running "
            "Klamath Basin water crisis — a conflict among irrigators, tribal nations "
            "(Klamath Tribes, Yurok, Karuk, Hoopa Valley), and endangered coho salmon "
            "that has consumed decades of federal litigation. The county board of "
            "commissioners approved a moratorium study in 2025 covering new data center "
            "applications that would require more than 500 acre-feet of annual water "
            "withdrawal, citing the ongoing federal Klamath Compact renegotiation and "
            "Upper Klamath Lake water-right adjudication. Pacific Power/PacifiCorp "
            "serves the county but the Klamath River dam removal project (completed "
            "2024) has changed hydropower availability on PacifiCorp's Oregon system. "
            "The Oregon Department of Environmental Quality's Klamath Basin water "
            "quality plan further restricts new thermal discharge permits."
        ),
        "effective_date": "2025-11-01",
        "status": "proposed",
        "notes": "Klamath Basin water crisis; tribal water rights adjudication; PacifiCorp dam removal; ODEQ thermal discharge.",
        "sources": [
            {"label": "Klamath County Board of Commissioners", "url": "https://www.klamathcounty.org/132/Board-of-County-Commissioners"},
            {"label": "Klamath County Planning Dept.", "url": "https://www.klamathcounty.org/253/Planning-Department"},
            {"label": "Oregon Dept. of Environmental Quality — Klamath Basin", "url": "https://www.oregon.gov/deq/water/pages/klamath-basin.aspx"},
            {"label": "Klamath Tribes — Water Rights", "url": "https://klamathtribes.org/water-rights/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41063",
        "name": "Wallowa County",
        "state": "Oregon",
        "level": 1,
        "types": ["data_center", "zoning"],
        "title": "Wallowa County Oregon Data Center Rural Character Siting Standards",
        "description": (
            "Wallowa County (Enterprise, OR) is Oregon's 'Little Switzerland' — a "
            "remote northeastern county bordering Idaho and Washington, encompassing "
            "the Wallowa Mountains, Eagle Cap Wilderness, and the upper Snake River "
            "Hells Canyon corridor. Pacific Power (PacifiCorp) provides service via "
            "a long single-feed 115 kV transmission line from the west, making the "
            "county's electrical infrastructure among the most vulnerable in Oregon "
            "to large new loads. The county planning commission adopted rural-character "
            "data center siting standards in 2025 restricting facilities exceeding "
            "500 kW load in Exclusive Farm Use (EFU) and Forest zones, requiring "
            "a Pacific Power written capacity confirmation and Eagle Cap Wilderness "
            "viewshed impact analysis for sites visible from designated wilderness. "
            "Wallowa Lake State Park and the Nez Perce National Historical Park "
            "anchor local tourism opposition to large industrial facilities."
        ),
        "effective_date": "2025-07-01",
        "status": "active",
        "notes": "Eagle Cap Wilderness viewshed; Pacific Power single-feed 115kV vulnerability; EFU/Forest zone prohibition.",
        "sources": [
            {"label": "Wallowa County Planning Department — Enterprise OR", "url": "https://www.co.wallowa.or.us/planning/"},
            {"label": "Wallowa County Board of Commissioners", "url": "https://www.co.wallowa.or.us/commissioners/"},
            {"label": "Pacific Power — Eastern Oregon Transmission", "url": "https://www.pacificpower.net/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── GEORGIA — Troup/Meriwether moratorium wave spreading ─────────────────

    {
        "fips": "13125",
        "name": "Glynn County",
        "state": "Georgia",
        "level": 2,
        "types": ["data_center", "zoning", "water"],
        "title": "Glynn County Georgia Data Center Conditional Use Permit — Golden Isles Corridor",
        "description": (
            "Glynn County (Brunswick, GA) anchors Georgia's Golden Isles coast and "
            "hosts the Port of Brunswick — the nation's leading automobile import/export "
            "terminal operated by the Georgia Ports Authority. The county planning "
            "commission adopted a conditional use permit requirement for data centers "
            "in 2025, driven by concerns about water withdrawal from the Floridan "
            "Aquifer system (the sole drinking water source for the county), Georgia "
            "Power's limited substation capacity on the Brunswick peninsula, and "
            "the character of the Sea Island/Jekyll Island resort corridor. The "
            "Brunswick-Golden Isles Airport's instrument-landing systems impose "
            "height restrictions on tall industrial structures in the northwestern "
            "industrial zone, further constraining siting options. CUP applicants "
            "must provide a Georgia Environmental Protection Division water-withdrawal "
            "permit or pre-application determination and a Georgia Power service-capacity "
            "letter for facilities exceeding 5 MW."
        ),
        "effective_date": "2025-05-01",
        "status": "active",
        "notes": "Port of Brunswick GPA; Floridan Aquifer sole drinking source; Georgia Power peninsula capacity; airport height limits.",
        "sources": [
            {"label": "Glynn County Planning and Zoning", "url": "https://www.glynncounty.org/148/Planning-Zoning"},
            {"label": "Glynn County Board of Commissioners", "url": "https://www.glynncounty.org/114/Board-of-Commissioners"},
            {"label": "Georgia EPD — Water Withdrawal Permitting", "url": "https://epd.georgia.gov/watershed-protection-branch/water-withdrawal-permitting"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13143",
        "name": "Haralson County",
        "state": "Georgia",
        "level": 1,
        "types": ["data_center", "zoning"],
        "title": "Haralson County Georgia Data Center Siting Standards — Adjacent Carroll Moratorium",
        "description": (
            "Haralson County (Buchanan, GA) is a rural piedmont county immediately "
            "west of Carroll County, which enacted an active data center moratorium "
            "in 2024. As Carroll County moratorium displaced inbound inquiries to "
            "adjacent jurisdictions, Haralson County's planning staff began fielding "
            "applications and adopted baseline siting standards in 2025. Georgia "
            "Power (Southern Company) serves the county on a relatively lightly loaded "
            "distribution network originally designed for small manufacturing and "
            "residential customers. The siting standards require a Georgia Power "
            "pre-application capacity meeting for any facility exceeding 1 MW, "
            "documentation of water source and expected evaporative cooling volume, "
            "and a noise-impact study for facilities near the county's several "
            "residential communities in the Tallapoosa River valley."
        ),
        "effective_date": "2025-08-01",
        "status": "proposed",
        "notes": "Adjacent Carroll County moratorium; Georgia Power limited rural capacity; Tallapoosa River valley communities.",
        "sources": [
            {"label": "Haralson County Board of Commissioners", "url": "https://www.haralsoncounty.org/"},
            {"label": "Haralson County Planning and Zoning", "url": "https://www.haralsoncounty.org/planning-zoning"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13145",
        "name": "Harris County",
        "state": "Georgia",
        "level": 1,
        "types": ["data_center", "water", "zoning"],
        "title": "Harris County Georgia Data Center Siting Review — Adjacent Meriwether and Troup Moratoriums",
        "description": (
            "Harris County (Hamilton, GA) lies between Meriwether County (active "
            "conditional use permit zone) to the north and Troup County (active "
            "moratorium) to the south, forming a pincer of data center restriction "
            "that has redirected applications into Harris County. The county planning "
            "commission opened a siting review in 2025, examining the county's "
            "water infrastructure along the Chattahoochee River's Goat Rock and "
            "Oliver Dam reservoirs (Georgia Power hydroelectric). Georgia Power's "
            "Hamilton-area substation serves primarily residential and small commercial "
            "load; significant upgrades are required for hyperscale data center "
            "development. The review resulted in a temporary permitting pause "
            "while the county drafts data-center-specific conditional use permit "
            "criteria, expected to be adopted in 2026."
        ),
        "effective_date": "2025-12-01",
        "status": "proposed",
        "notes": "Adjacent Troup moratorium and Meriwether CUP; Chattahoochee River hydro reservoirs; Georgia Power substation upgrade needed.",
        "sources": [
            {"label": "Harris County Board of Commissioners", "url": "https://www.harriscountyga.gov/"},
            {"label": "Harris County Planning Department", "url": "https://www.harriscountyga.gov/departments/planning/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13219",
        "name": "Oconee County",
        "state": "Georgia",
        "level": 2,
        "types": ["data_center", "zoning", "water"],
        "title": "Oconee County Georgia Data Center Conditional Use Permit — Athens Metro Growth",
        "description": (
            "Oconee County (Watkinsville, GA) is one of Georgia's fastest-growing "
            "counties as a southern suburb of Athens-Clarke County (home to the "
            "University of Georgia). The county adopted a data center conditional "
            "use permit requirement in 2024 following applications from operators "
            "seeking proximity to UGA's research network and Athens fiber infrastructure "
            "while avoiding Clarke County's higher regulatory burden. Georgia Power "
            "serves Oconee County from Athens-area substations that are heavily loaded "
            "from residential growth. CUP conditions require a Georgia Power written "
            "capacity letter, a Oconee County water authority pre-application meeting "
            "for facilities using more than 50,000 gallons per day from the Calls "
            "Creek or North Oconee River surface water systems, and a traffic impact "
            "analysis for sites on SR-15 or US-78."
        ),
        "effective_date": "2024-10-01",
        "status": "active",
        "notes": "UGA Athens suburb growth; Georgia Power heavily loaded from residential; Calls Creek / N. Oconee River water; CUP.",
        "sources": [
            {"label": "Oconee County Planning Department", "url": "https://www.oconeecounty.com/planning"},
            {"label": "Oconee County Board of Commissioners", "url": "https://www.oconeecounty.com/board-of-commissioners"},
            {"label": "Oconee County Water Authority", "url": "https://www.oconeecounty.com/water-authority"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13233",
        "name": "Polk County",
        "state": "Georgia",
        "level": 2,
        "types": ["data_center", "zoning"],
        "title": "Polk County Georgia Data Center Moratorium — Adjacent Carroll County Wave",
        "description": (
            "Polk County (Cedartown, GA) borders Carroll County to the east — the "
            "epicenter of northwest Georgia's 2024-2025 data center moratorium wave. "
            "Polk County enacted its own six-month data center moratorium in late 2025 "
            "after fielding multiple unsolicited developer inquiries in the months "
            "following Carroll County's moratorium. The county cited inadequate Georgia "
            "Power substation capacity in the Cedartown industrial zone, an aging "
            "wastewater treatment plant already operating near permitted capacity, "
            "and a desire to develop specific zoning standards before permitting "
            "any facility over 2 MW. The moratorium was extended for an additional "
            "six months in early 2026 while the planning commission developed "
            "a data center overlay zoning district with specific infrastructure "
            "requirements for power, water, and emergency access."
        ),
        "effective_date": "2025-10-01",
        "status": "active",
        "notes": "Adjacent Carroll County moratorium overflow; Georgia Power Cedartown substation limited; WWTP capacity; >2 MW threshold.",
        "sources": [
            {"label": "Polk County Board of Commissioners — Cedartown GA", "url": "https://www.polkgeorgia.gov/"},
            {"label": "Polk County Planning and Zoning", "url": "https://www.polkgeorgia.gov/planning-zoning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── NORTH CAROLINA — Duke Energy constraint wave ───────────────────────────

    {
        "fips": "37167",
        "name": "Stanly County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "Stanly County North Carolina Data Center Siting Standards — Duke Energy Carolinas Constraints",
        "description": (
            "Stanly County (Albemarle, NC) is a Piedmont county on the Yadkin-Pee Dee "
            "River, served by Duke Energy Carolinas from the Badin-Albemarle transmission "
            "corridor. The county planning board adopted data center siting standards "
            "in 2025 following several applications that would have collectively required "
            "more new substation capacity than Duke Energy Carolinas has committed to "
            "the county through 2030. Stanly County's existing industrial base — "
            "including Pfizer's Albemarle distribution center and Alcoa's historic "
            "Badin aluminum smelter site (now Novelis remelt operations) — already "
            "claims priority on existing substation capacity. Standards require written "
            "Duke Energy Carolinas service availability confirmation before any "
            "data center application is accepted as complete."
        ),
        "effective_date": "2025-07-01",
        "status": "proposed",
        "notes": "Duke Energy Carolinas Badin-Albemarle constraint; Novelis/Alcoa industrial priority; Yadkin-Pee Dee River.",
        "sources": [
            {"label": "Stanly County Planning Department", "url": "https://www.stanlycountync.gov/planning"},
            {"label": "Stanly County Board of Commissioners", "url": "https://www.stanlycountync.gov/commissioners"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37169",
        "name": "Stokes County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "water"],
        "title": "Stokes County North Carolina Data Center Siting Review — Dan River Watershed",
        "description": (
            "Stokes County (Danbury, NC) occupies the Dan River headwaters in the "
            "North Carolina Blue Ridge foothills bordering Virginia. Duke Energy "
            "Carolinas serves the county, but Stokes County is one of the more "
            "lightly loaded counties in the Duke Energy Carolinas portfolio and "
            "has limited substation capacity for large new industrial loads. The "
            "county planning board opened a data center siting review in 2025 "
            "following the broader Piedmont moratorium wave, citing Dan River "
            "water-quality concerns (the Dan River was the site of a 2014 Duke "
            "Energy coal-ash spill that contaminated drinking water in Virginia) "
            "and rural character preservation. The county's portion of Hanging Rock "
            "State Park is a major outdoor recreation destination. Review standards "
            "require a water-quality impact analysis for cooling water systems "
            "discharging to Dan River tributaries."
        ),
        "effective_date": "2025-09-01",
        "status": "proposed",
        "notes": "Dan River 2014 coal-ash spill legacy; Duke Energy Carolinas lightly loaded; Hanging Rock SP rural character.",
        "sources": [
            {"label": "Stokes County Planning Department", "url": "https://www.stokescountync.gov/planning"},
            {"label": "Stokes County Board of Commissioners", "url": "https://www.stokescountync.gov/commissioners"},
            {"label": "NC DEQ — Dan River Basin Water Quality", "url": "https://www.deq.nc.gov/about/divisions/water-resources/planning/basin-planning/yadkin-pee-dee-river-basin"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MARYLAND ──────────────────────────────────────────────────────────────

    {
        "fips": "24017",
        "name": "Charles County",
        "state": "Maryland",
        "level": 2,
        "types": ["data_center", "zoning", "energy"],
        "title": "Charles County Maryland Data Center Conditional Use Permit — Southern Maryland Corridor",
        "description": (
            "Charles County (La Plata, MD) anchors Maryland's Southern Maryland "
            "technology corridor, bordered by the Potomac River and Mattawoman Creek. "
            "The county's Indian Head Naval Surface Warfare Center — one of the Navy's "
            "principal ordnance and explosive research facilities — drives significant "
            "defense computing demand. Southern Maryland Electric Cooperative (SMECO) "
            "and Pepco Holdings serve the county, but transmission capacity from "
            "PJM's southern Maryland import paths is constrained, particularly "
            "following the planned retirement of the Morgantown Power Plant. "
            "Charles County adopted a data center conditional use permit requirement "
            "in 2025, citing Mattawoman Creek tributary impervious-surface limits "
            "under the Maryland Stormwater Management Act, limited SMECO substation "
            "availability, and the county's designation as a Critical Area under "
            "the Chesapeake Bay Critical Area Act for parcels within 1,000 feet "
            "of the tidal Potomac and its tributaries."
        ),
        "effective_date": "2025-06-01",
        "status": "active",
        "notes": "Indian Head NSWC defense computing; SMECO/Pepco PJM import constraint; Chesapeake Bay Critical Area; CUP.",
        "sources": [
            {"label": "Charles County Department of Planning and Growth Management", "url": "https://www.charlescountymd.gov/services/planning-and-growth-management"},
            {"label": "Charles County Board of County Commissioners", "url": "https://www.charlescountymd.gov/government/board-of-commissioners"},
            {"label": "Southern Maryland Electric Cooperative (SMECO)", "url": "https://www.smeco.coop/"},
            {"label": "Maryland Chesapeake Bay Critical Area Commission", "url": "https://www.mde.state.md.us/programs/water/chesapeakebay/Pages/criticalarea.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "24019",
        "name": "Calvert County",
        "state": "Maryland",
        "level": 1,
        "types": ["data_center", "energy", "water"],
        "title": "Calvert County Maryland Data Center Siting Review — Calvert Cliffs Nuclear Plant Buffer",
        "description": (
            "Calvert County (Prince Frederick, MD) is home to Calvert Cliffs Nuclear "
            "Power Plant — two Constellation Energy pressurized-water reactors generating "
            "approximately 1,750 MW for PJM — on the western shore of the Chesapeake "
            "Bay. The county planning commission initiated a data center siting review "
            "in 2025 following an inquiry from an operator seeking to co-locate "
            "adjacent to the nuclear plant's transmission interconnect. The NRC Emergency "
            "Planning Zone (EPZ) extends 10 miles from Calvert Cliffs, covering most "
            "of the county and imposing emergency-planning requirements on any large "
            "new occupancy in the zone. Calvert County's Chesapeake Bay Critical Area "
            "designation and SMECO service-territory capacity constraints further "
            "complicate large facility siting. Review standards require NRC EPZ "
            "compatibility documentation and a Maryland Department of the Environment "
            "water appropriation permit for any Patuxent River or Bay withdrawal."
        ),
        "effective_date": "2025-09-01",
        "status": "proposed",
        "notes": "Calvert Cliffs NRC EPZ 10-mile zone; Chesapeake Bay Critical Area; SMECO capacity; MDE water appropriation.",
        "sources": [
            {"label": "Calvert County Department of Planning and Zoning", "url": "https://www.calvertcountymd.gov/275/Planning-Zoning"},
            {"label": "Calvert County Board of County Commissioners", "url": "https://www.calvertcountymd.gov/131/Board-of-County-Commissioners"},
            {"label": "NRC — Calvert Cliffs Nuclear Power Plant Emergency Planning Zone", "url": "https://www.nrc.gov/info-finder/reactors/cal.html"},
            {"label": "Constellation Energy — Calvert Cliffs Nuclear Power Plant", "url": "https://www.constellationenergy.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── NEW JERSEY ────────────────────────────────────────────────────────────

    {
        "fips": "34037",
        "name": "Sussex County",
        "state": "New Jersey",
        "level": 1,
        "types": ["data_center", "water", "zoning"],
        "title": "Sussex County New Jersey Data Center Siting Restriction — Highlands Water Protection Area",
        "description": (
            "Sussex County (Newton, NJ) falls almost entirely within the New Jersey "
            "Highlands Region protected under the New Jersey Highlands Water Protection "
            "and Planning Act of 2004 (N.J.S.A. 13:20-1 et seq.). The Highlands Act "
            "establishes a Preservation Area and a Planning Area with stringent water-"
            "resource and impervious-cover restrictions, creating substantial barriers "
            "to large industrial development including data centers. Jersey Central Power "
            "& Light (JCP&L / FirstEnergy) serves the county with limited transmission "
            "import capacity from the PJM western New Jersey interface. Data centers "
            "exceeding 1 acre of impervious cover or requiring more than 100,000 "
            "gallons per day of water withdrawal in the Preservation Area require "
            "a Highlands Council Resource Assessment and may be barred entirely. "
            "The county planning board requires applicants to provide a Highlands "
            "Act consistency determination from the NJ Highlands Council before "
            "any data center application can be deemed complete."
        ),
        "effective_date": "2004-08-10",
        "status": "active",
        "notes": "NJ Highlands Act N.J.S.A. 13:20-1; Preservation Area restrictions; JCP&L limited transmission; HCR assessment required.",
        "sources": [
            {"label": "New Jersey Highlands Council", "url": "https://www.highlands.state.nj.us/"},
            {"label": "NJ Highlands Water Protection and Planning Act N.J.S.A. 13:20-1", "url": "https://www.njleg.state.nj.us/Bills/20042005/AL05/251_.PDF"},
            {"label": "Sussex County Division of Land Use", "url": "https://www.sussex.nj.us/cn/webpages/showPagecn.php?pid=planningboard"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── INCENTIVE ENTRIES ─────────────────────────────────────────────────────

    # ── Georgia ───────────────────────────────────────────────────────────────

    {
        "fips": "13021",
        "name": "Bibb County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Bibb County Georgia Macon Technology Corridor and Data Center Incentive",
        "description": (
            "Bibb County (Macon, GA) is central Georgia's largest city and the seat "
            "of the Bibb County consolidated government. The Municipal Electric Authority "
            "of Georgia (MEAG Power) delivers competitive wholesale electricity to "
            "Macon Water Authority through the city's own distribution system, providing "
            "favorable industrial rates for large commercial customers. Mercer University "
            "and Middle Georgia State University anchor research computing and workforce "
            "development for the county's technology sector. The Macon-Bibb County "
            "Industrial Authority administers tax-abatement programs (Georgia's PILOT "
            "agreements and Opportunity Zone credits) for qualifying data center "
            "investments in the SR-247 and US-80 industrial corridors. I-16 and I-75 "
            "intersect at Macon, carrying the primary fiber pathways connecting Atlanta "
            "to Savannah and to the I-95 Southeast coastal backbone."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "MEAG Power wholesale rates; Mercer/Middle GA State Universities; I-16/I-75 fiber node; PILOT tax abatement.",
        "sources": [
            {"label": "Macon-Bibb County Industrial Authority", "url": "https://www.maconbibb.us/industrial-authority/"},
            {"label": "MEAG Power — Municipal Electric Authority of Georgia", "url": "https://www.meagpower.org/"},
            {"label": "Georgia Department of Economic Development — Data Center Incentives", "url": "https://www.georgia.org/competitive-advantages/incentives/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13051",
        "name": "Chatham County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai", "energy"],
        "title": "Chatham County Georgia Savannah Port Technology and Data Center Hub",
        "description": (
            "Chatham County (Savannah, GA) is home to the Port of Savannah — the "
            "busiest single-terminal container port in the United States and the "
            "nation's third-largest container port overall, operated by the Georgia "
            "Ports Authority. GPA's logistics AI operations, predictive vessel-scheduling "
            "systems, and container-dwell analytics generate substantial and growing "
            "computing demand. Georgia Power (Southern Company) serves the county "
            "with industrial rates and access to the Georgia integrated transmission "
            "system. Savannah College of Art and Design (SCAD), Georgia Southern's "
            "Armstrong Campus, and the Savannah Technical College provide technology "
            "workforce pipelines. The Savannah Economic Development Authority (SEDA) "
            "administers Georgia's data center incentives and Opportunity Zone "
            "tax benefits for qualifying investments in Savannah's Port Wentworth "
            "and West Chatham industrial corridors. Gulfstream Aerospace's Savannah "
            "design and manufacturing campus anchors high-value AI/simulation demand."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "GPA Port of Savannah largest US container terminal; Gulfstream Aerospace AI; Georgia Power industrial; SEDA incentives.",
        "sources": [
            {"label": "Savannah Economic Development Authority (SEDA)", "url": "https://www.seda.org/"},
            {"label": "Georgia Ports Authority — Garden City Terminal", "url": "https://www.gaports.com/"},
            {"label": "Georgia Power — Savannah Industrial Service", "url": "https://www.georgiapower.com/business/business-rates.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13085",
        "name": "Dawson County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Dawson County Georgia Blue Ridge Foothills Technology and Data Center Zone",
        "description": (
            "Dawson County (Dawsonville, GA) occupies Georgia's Blue Ridge Mountain "
            "foothills north of Atlanta along GA-400, the primary corridor connecting "
            "metro Atlanta to the North Georgia mountains. The county has attracted "
            "significant e-commerce logistics operations (including Amazon's Dawsonville "
            "delivery station and multiple third-party logistics providers) that generate "
            "AI-driven order fulfillment and route optimization computing demand. "
            "Georgia Power serves the county with access to the North Georgia "
            "transmission corridor. Georgia's data center exemption from sales and "
            "use tax on qualifying equipment (O.C.G.A. §48-8-3(68)) applies. "
            "The Dawson County Development Authority administers local tax-abatement "
            "agreements for qualifying technology investments. The county's proximity "
            "to Lake Lanier and the Chattahoochee National Forest attracts a knowledge "
            "economy workforce from the Atlanta northern suburbs."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "GA-400 Atlanta northern corridor; Amazon logistics AI; Georgia Power; O.C.G.A. §48-8-3(68) exemption.",
        "sources": [
            {"label": "Dawson County Development Authority", "url": "https://www.dawsoncounty.org/development-authority"},
            {"label": "Georgia Department of Economic Development — Dawson County", "url": "https://www.georgia.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13131",
        "name": "Greene County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Greene County Georgia Lake Oconee Resort Corridor Data Center Incentive",
        "description": (
            "Greene County (Greensboro, GA) anchors the Lake Oconee resort corridor, "
            "home to the Reynolds Plantation and Ritz-Carlton Lodge luxury resort "
            "communities along the Georgia Power-operated Lake Oconee reservoir. "
            "The county has attracted technology-sector relocations from Atlanta as "
            "remote-work dynamics brought high-income knowledge workers to the "
            "lake community, creating demand for nearby edge computing and data center "
            "capacity. Georgia Power operates the Wallace Dam that creates Lake Oconee, "
            "and the county's position on Georgia Power's load-balancing system "
            "provides competitive industrial rates. Georgia's data center sales-tax "
            "exemption (O.C.G.A. §48-8-3(68)) applies. The Greene County Joint "
            "Development Authority participates in Georgia EMC's industrial location "
            "program to attract qualifying computing infrastructure."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Lake Oconee Georgia Power reservoir; Reynolds Plantation tech workforce; O.C.G.A. §48-8-3(68); Atlanta remote worker migration.",
        "sources": [
            {"label": "Greene County Joint Development Authority", "url": "https://www.greenecountyga.gov/economic-development"},
            {"label": "Georgia Power — Lake Oconee Wallace Dam", "url": "https://www.georgiapower.com/company/about-us/hydro-operations.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13147",
        "name": "Hart County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Hart County Georgia Lake Hartwell Hydropower Corridor Data Center Incentive",
        "description": (
            "Hart County (Hartwell, GA) anchors Georgia's portion of Lake Hartwell — "
            "the U.S. Army Corps of Engineers reservoir on the Savannah River system "
            "straddling the Georgia-South Carolina border. Duke Energy Carolinas and "
            "Georgia Power both serve portions of the county, creating a competitive "
            "utility environment. Hart County has attracted light manufacturing and "
            "distribution operations from the I-85 Northeast Georgia corridor. "
            "Georgia's data center incentive framework (O.C.G.A. §48-8-3(68)) applies "
            "to qualifying computing equipment investments. The Hart County Industrial "
            "Building Authority administers local PILOT (Payment in Lieu of Taxes) "
            "agreements for qualifying technology investments. The county's location "
            "at the intersection of Georgia and South Carolina data center incentive "
            "regimes makes it attractive for operators seeking flexibility across "
            "two state programs."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Lake Hartwell Army Corps hydro; dual Duke Energy Carolinas / Georgia Power service; O.C.G.A. §48-8-3(68); I-85 corridor.",
        "sources": [
            {"label": "Hart County Industrial Building Authority", "url": "https://www.hartcountyga.gov/economic-development"},
            {"label": "U.S. Army Corps of Engineers — Hartwell Lake", "url": "https://www.sas.usace.army.mil/Missions/Civil-Works/Recreation/Hartwell-Lake/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13277",
        "name": "Tift County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Tift County Georgia USDA Ag Research and I-75 Data Center Corridor",
        "description": (
            "Tift County (Tifton, GA) is the home of the USDA Agricultural Research "
            "Service's Southeast Area hub and the University of Georgia Tifton Campus — "
            "a leading agricultural research institution for peanut, cotton, and vegetable "
            "crop sciences. These research institutions drive AI-enabled precision "
            "agriculture computing demand. Georgia Power serves the county with "
            "industrial rates, and the county's I-75 location midway between Atlanta "
            "and the Florida state line provides strong fiber-corridor connectivity. "
            "The Tift County Development Authority participates in Georgia's data center "
            "incentive programs (O.C.G.A. §48-8-3(68)) and administers local tax "
            "abatement for qualifying computing infrastructure. The county hosts "
            "a Cargill peanut-processing facility and Koch Foods poultry operations "
            "that drive agricultural supply-chain AI computing."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "USDA ARS Southeast / UGA Tifton ag AI anchor; Georgia Power; O.C.G.A. §48-8-3(68); I-75 fiber midpoint FL-ATL.",
        "sources": [
            {"label": "Tift County Development Authority", "url": "https://www.tiftcounty.org/economic-development"},
            {"label": "USDA ARS Southeast Area — Tifton GA", "url": "https://www.ars.usda.gov/southeast-area/"},
            {"label": "University of Georgia Tifton Campus", "url": "https://www.caes.uga.edu/about/county/tifton.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── North Carolina ────────────────────────────────────────────────────────

    {
        "fips": "37051",
        "name": "Cumberland County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Cumberland County North Carolina Fort Liberty Defense AI and Data Center Incentive",
        "description": (
            "Cumberland County (Fayetteville, NC) is home to Fort Liberty (formerly "
            "Fort Bragg) — the largest U.S. Army installation in the world by population "
            "and headquarters of U.S. Army Forces Command, the XVIII Airborne Corps, "
            "the 82nd Airborne Division, and U.S. Army Special Operations Command "
            "(USASOC). The installation's scale and classified computing requirements "
            "make Cumberland County one of the most defense-AI-dense counties in the "
            "United States. Pope Army Airfield and Simmons Army Airfield support "
            "C4ISR computing on the installation. Duke Energy Progress serves the "
            "county and base, and North Carolina's data center property-tax exemption "
            "(G.S. §105-275(45)) applies to qualifying commercial investments. "
            "The Fayetteville-Cumberland County Economic Development Corporation "
            "markets the region's defense-tech ecosystem and fast-growth logistics corridor."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Fort Liberty USASOC/82nd Airborne/FORSCOM defense AI; Duke Energy Progress; G.S. §105-275(45); Fayetteville EDC.",
        "sources": [
            {"label": "Fayetteville Cumberland County Economic Development Corporation", "url": "https://www.faytechcc.com/"},
            {"label": "Fort Liberty (Fort Bragg) — U.S. Army", "url": "https://home.army.mil/liberty/"},
            {"label": "North Carolina Data Center Property Tax Exemption G.S. §105-275", "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/PDF/BySection/Chapter_105/GS_105-275.pdf"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37067",
        "name": "Forsyth County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Forsyth County North Carolina Wake Forest Innovation Quarter Data Center Incentive",
        "description": (
            "Forsyth County (Winston-Salem, NC) hosts the Wake Forest Innovation "
            "Quarter — a 170-acre urban innovation district anchored by Wake Forest "
            "University School of Medicine, Atrium Health Wake Forest Baptist Medical "
            "Center, and Winston-Salem State University. The Innovation Quarter drives "
            "substantial biomedical AI and precision medicine computing demand. "
            "Duke Energy Carolinas serves the county with competitive industrial rates "
            "and access to the Carolinas integrated grid. North Carolina's data center "
            "property-tax exemption (G.S. §105-275(45)) applies to qualifying equipment. "
            "The Winston-Salem Business Alliance administers local incentive programs "
            "including Opportunity Zone tax benefits for Winston-Salem's downtown "
            "industrial redevelopment areas. The county's I-40 and US-421 fiber "
            "corridors connect the Triad to the Research Triangle and Greensboro."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Wake Forest Innovation Quarter biomedical AI anchor; Duke Energy Carolinas; G.S. §105-275(45); I-40/US-421 fiber.",
        "sources": [
            {"label": "Wake Forest Innovation Quarter — Winston-Salem NC", "url": "https://www.innovationquarter.com/"},
            {"label": "Winston-Salem Business Alliance", "url": "https://www.wsbizalliance.com/"},
            {"label": "Atrium Health Wake Forest Baptist Medical Center AI", "url": "https://www.wakehealth.edu/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37105",
        "name": "Lee County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Lee County North Carolina Sanford Manufacturing AI and Data Center Incentive",
        "description": (
            "Lee County (Sanford, NC) sits in the Piedmont manufacturing corridor "
            "between Chatham County (Research Triangle spillover, active moratorium) "
            "and Montgomery County, served by Duke Energy Progress. The county's "
            "industrial base includes Pfizer's large Sanford pharmaceutical manufacturing "
            "campus, Smith Douglas Homes, and a growing logistics cluster along "
            "US-421. Pfizer's Sanford site is one of the largest pharmaceutical "
            "manufacturing facilities in the United States and drives substantial "
            "AI-based process control, quality management, and supply-chain computing. "
            "North Carolina's data center property-tax exemption (G.S. §105-275(45)) "
            "applies. The Lee County Economic Development Corporation markets the "
            "county's pharmaceutical AI ecosystem and competitive Duke Energy "
            "Progress industrial rates."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Pfizer Sanford pharma manufacturing AI anchor; Duke Energy Progress; G.S. §105-275(45); US-421 fiber corridor.",
        "sources": [
            {"label": "Lee County Economic Development Corporation", "url": "https://www.leecountync.gov/economic-development"},
            {"label": "North Carolina Data Center Tax Exemption G.S. §105-275", "url": "https://www.ncleg.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37191",
        "name": "Wayne County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Wayne County North Carolina Seymour Johnson AFB Defense Computing and Data Center Incentive",
        "description": (
            "Wayne County (Goldsboro, NC) hosts Seymour Johnson Air Force Base — "
            "the 4th Fighter Wing's home base for F-15E Strike Eagle aircraft and "
            "one of the Air Force's largest tactical fighter installations. The base "
            "drives substantial C4ISR, targeting, and mission-planning AI computing. "
            "Duke Energy Progress serves both the base and county commercial operations. "
            "Wayne County's industrial base includes Syngenta crop science operations "
            "and Mount Olive Pickle Company (the largest independent pickle company "
            "in the United States), both of which drive agricultural AI computing. "
            "North Carolina's data center property-tax exemption (G.S. §105-275(45)) "
            "applies. The Wayne County Economic Development Commission markets the "
            "county's defense-tech and agricultural-AI ecosystem with competitive "
            "Duke Energy Progress industrial rates."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Seymour Johnson AFB 4th FW F-15E computing; Syngenta ag AI; Duke Energy Progress; G.S. §105-275(45).",
        "sources": [
            {"label": "Wayne County Economic Development Commission", "url": "https://www.waynegov.com/economic-development"},
            {"label": "Seymour Johnson Air Force Base — 4th Fighter Wing", "url": "https://www.seymourjohnson.af.mil/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37195",
        "name": "Wilson County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Wilson County North Carolina Tobacco Belt Technology Transition and Data Center Incentive",
        "description": (
            "Wilson County (Wilson, NC) is in the heart of North Carolina's historic "
            "bright-leaf tobacco belt, and has undertaken one of the state's more "
            "deliberate post-tobacco economic transitions. The Wilson County Economic "
            "Development Council has recruited advanced manufacturing and logistics "
            "operations with assistance from Duke Energy Progress's industrial siting "
            "program. North Carolina's data center property-tax exemption (G.S. §105-275(45)) "
            "applies to qualifying equipment investments. The county's US-264 and "
            "US-301 corridors carry the principal fiber pathways connecting Rocky "
            "Mount and Goldsboro to the Raleigh-Durham Triangle. Merck's Wilson "
            "County pharmaceutical manufacturing site and Carolina Hurricanes "
            "practice facility anchor technology-sector employment in the county."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Post-tobacco economic transition; Merck pharma AI; Duke Energy Progress; G.S. §105-275(45); US-264/301 fiber.",
        "sources": [
            {"label": "Wilson County Economic Development Council", "url": "https://www.wilsonedc.com/"},
            {"label": "North Carolina Data Center Property Tax Exemption G.S. §105-275", "url": "https://www.ncleg.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── New York ──────────────────────────────────────────────────────────────

    {
        "fips": "36077",
        "name": "Otsego County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Otsego County New York Cooperstown Edge Computing and NYSEG Incentive",
        "description": (
            "Otsego County (Cooperstown, NY) hosts the Baseball Hall of Fame and "
            "the Bassett Healthcare Network — one of upstate New York's major rural "
            "health systems — alongside SUNY Oneonta and Hartwick College. These "
            "anchor institutions drive healthcare AI, sports analytics, and academic "
            "computing demand. New York State Electric & Gas (NYSEG / Avangrid) "
            "serves the county with access to NYISO Zone E. New York State's data "
            "center incentive program (REAP — Renewable Energy Access Program) and "
            "Empire State Development's capital-region economic development grants "
            "support qualifying technology infrastructure investments. The county's "
            "proximity to Oneonta (Otsego/Delaware county line) fiber nodes and "
            "the I-88 corridor provides connectivity to Albany and Binghamton markets."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Bassett Healthcare AI anchor; SUNY Oneonta; NYSEG/Avangrid; NYISO Zone E; Empire State Development grants.",
        "sources": [
            {"label": "Otsego County Economic Development", "url": "https://www.otsegocounty.com/departments/economic_development/index.php"},
            {"label": "NYSEG — New York State Electric & Gas (Avangrid)", "url": "https://www.nyseg.com/"},
            {"label": "Empire State Development — Upstate NY Data Center Incentives", "url": "https://esd.ny.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36093",
        "name": "Schenectady County",
        "state": "New York",
        "level": -1,
        "types": ["data_center", "ai", "energy"],
        "title": "Schenectady County New York GE Vernova Research and Advanced Energy Data Center Hub",
        "description": (
            "Schenectady County (Schenectady, NY) is the birthplace of American "
            "electric power, home to GE's historic Research and Development Center "
            "(now GE Vernova's Global Research Center on the Niskayuna campus) — "
            "one of the world's premier industrial AI and energy technology research "
            "institutions. GE Vernova's power generation, grid solutions, and wind "
            "energy divisions drive substantial simulation, digital-twin, and "
            "machine-learning computing demand. National Grid serves the county "
            "from the NYISO's Capital District nodes with access to New York's "
            "clean energy grid (approximately 70% zero-carbon). New York's data "
            "center incentive programs through Empire State Development and the "
            "Mohawk Valley Regional Economic Development Council support qualifying "
            "technology infrastructure. Union College and the Albany NanoTech "
            "corridor (Albany County border) anchor semiconductor and AI workforce "
            "pipelines."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "GE Vernova Global Research Center AI anchor; National Grid NYISO Capital District; Albany NanoTech adjacent; Union College.",
        "sources": [
            {"label": "Schenectady County Metroplex Development Authority", "url": "https://www.schenectadymetroplex.com/"},
            {"label": "GE Vernova Global Research Center — Niskayuna NY", "url": "https://www.gevernova.com/research"},
            {"label": "National Grid — New York Capital Region", "url": "https://www.nationalgridus.com/"},
            {"label": "Mohawk Valley Regional Economic Development Council", "url": "https://regionalcouncils.ny.gov/mohawk-valley"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36101",
        "name": "St. Lawrence County",
        "state": "New York",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "St. Lawrence County New York Seaway Power and Canadian Border Data Center Incentive",
        "description": (
            "St. Lawrence County (Canton/Potsdam, NY) borders Canada along the St. "
            "Lawrence River and benefits from the St. Lawrence-FDR Power Project — "
            "a 912 MW hydroelectric facility operated by the New York Power Authority "
            "(NYPA) and Ontario Power Generation jointly. NYPA's low-cost hydropower "
            "allocations (St. Lawrence Power) are available to qualifying industrial "
            "customers in the county, providing among the lowest industrial electric "
            "rates in New York State. National Grid and NYPA serve the county. "
            "Clarkson University and SUNY Canton and SUNY Potsdam anchor research "
            "computing. The county's Canadian fiber interconnects (via the Seaway "
            "International Bridge at Ogdensburg and the Thousand Islands Bridge) "
            "provide cross-border connectivity for operators requiring Canadian "
            "data residency paths. New York's climate-positive data center "
            "incentives under the CLCPA framework apply to qualifying facilities."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "NYPA St. Lawrence Power low-cost hydro; Clarkson/SUNY Potsdam/Canton; Canadian fiber bridge; NYPA REPS allocations.",
        "sources": [
            {"label": "St. Lawrence County Industrial Development Agency (SLCIDA)", "url": "https://www.slcida.com/"},
            {"label": "New York Power Authority — St. Lawrence Hydroelectric Power", "url": "https://www.nypa.gov/power/generation/st-lawrence-fdr-power-project"},
            {"label": "Clarkson University — St. Lawrence County Research Computing", "url": "https://www.clarkson.edu/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36111",
        "name": "Ulster County",
        "state": "New York",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Ulster County New York Hudson Valley Technology Corridor Data Center Incentive",
        "description": (
            "Ulster County (Kingston, NY) anchors the mid-Hudson Valley technology "
            "corridor, approximately 90 miles north of New York City on the I-87 "
            "(New York State Thruway) fiber backbone. Central Hudson Gas & Electric "
            "serves the county with access to NYISO Zone G. The county has attracted "
            "significant remote-work migration from New York City, creating a knowledge-"
            "economy workforce base. IBM's historic research presence in adjacent "
            "Dutchess County (Poughkeepsie) provides workforce and supply-chain ties. "
            "Kingston's Tech City redevelopment zone (the former IBM manufacturing "
            "campus) is a designated Brownfield Opportunity Area with state tax credits "
            "for qualifying technology investments. New York's data center incentive "
            "framework through Empire State Development supports qualifying facilities "
            "in the Hudson Valley region."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "IBM Poughkeepsie workforce adjacent; Central Hudson / NYISO Zone G; Kingston Tech City BOA; NYC remote workforce.",
        "sources": [
            {"label": "Ulster County Economic Development", "url": "https://ulstercountyny.gov/economic-development"},
            {"label": "Central Hudson Gas & Electric — NYISO Zone G", "url": "https://www.centralhudson.com/"},
            {"label": "Kingston Tech City — Brownfield Opportunity Area", "url": "https://kingston-ny.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36113",
        "name": "Warren County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Warren County New York Glens Falls Adirondack Data Center and Clean Power Incentive",
        "description": (
            "Warren County (Glens Falls, NY) anchors the southern Adirondack gateway "
            "along the I-87 corridor connecting Albany to Montreal. National Grid and "
            "NYSEG (Avangrid) serve the county with access to NYISO Zone D/E hydro- "
            "and wind-dominated power. The Glens Falls-Queensbury area has attracted "
            "healthcare AI operations from Glens Falls Hospital (a regional trauma "
            "center) and technology employers from the paper-mill legacy industrial "
            "base (Georgia-Pacific, Finch Paper). New York's data center incentive "
            "programs through the North Country Regional Economic Development Council "
            "and Empire State Development support qualifying technology investments. "
            "The county's proximity to the Adirondack Mountain fiber corridor and "
            "the Route 9 / I-87 technology cluster provides connectivity to the "
            "Montreal and Albany markets. Cool ambient temperatures reduce mechanical "
            "cooling costs for computing facilities."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "I-87 Albany-Montreal fiber; National Grid NYISO hydro-rich; Glens Falls Hospital AI; cool ambient temps; paper mill redevelopment.",
        "sources": [
            {"label": "Warren County Economic Development Corporation", "url": "https://www.warrencountyny.gov/economicdevelopment"},
            {"label": "National Grid — New York Northern Region", "url": "https://www.nationalgridus.com/"},
            {"label": "Glens Falls Hospital", "url": "https://www.glensfallshospital.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "36115",
        "name": "Washington County",
        "state": "New York",
        "level": -1,
        "types": ["data_center"],
        "title": "Washington County New York Vermont Border Green Energy Data Center Incentive",
        "description": (
            "Washington County (Fort Ann/Hudson Falls, NY) straddles the Vermont "
            "border along Lake Champlain, connected via the I-87 corridor and "
            "trans-Adirondack fiber routes to both the Albany and Burlington markets. "
            "National Grid serves the county with access to NYISO Zone D power that "
            "is increasingly wind- and hydro-dominated. The county has attracted "
            "light manufacturing and agricultural technology operations from the "
            "Lake Champlain Valley. Green Mountain Power's Vermont grid interconnects "
            "at the New York border, giving operators the option of Vermont Renewable "
            "Energy Standard-compliant power procurement. New York's CLCPA-aligned "
            "data center incentive framework and Empire State Development capital "
            "grants support qualifying technology investments in the Slate Valley "
            "industrial redevelopment corridor (Granville/Fair Haven slate quarries)."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "VT border Green Mountain Power interconnect; National Grid NYISO Zone D; I-87 Albany-Burlington fiber; Slate Valley brownfield.",
        "sources": [
            {"label": "Washington County Economic Development and Planning", "url": "https://www.washingtoncountyny.gov/307/Economic-Development"},
            {"label": "National Grid — Lake Champlain Valley Service Area", "url": "https://www.nationalgridus.com/"},
            {"label": "Empire State Development — North Country Regional Council", "url": "https://regionalcouncils.ny.gov/north-country"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Oregon ────────────────────────────────────────────────────────────────

    {
        "fips": "41019",
        "name": "Douglas County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Douglas County Oregon Roseburg Timber AI and Pacific Power Data Center Incentive",
        "description": (
            "Douglas County (Roseburg, OR) is one of Oregon's largest timber-producing "
            "counties, home to Weyerhaeuser, Roseburg Forest Products, and Interfor "
            "sawmill and engineered-wood operations. These industrial operations drive "
            "AI-based yield optimization, predictive maintenance, and forest-inventory "
            "computing demand. Pacific Power (PacifiCorp) serves the county from the "
            "Oregon West transmission system with competitive industrial rates. "
            "Oregon's data center equipment property-tax exemption and the Roseburg "
            "Urban Renewal Agency's technology-investment incentives support qualifying "
            "computing facilities. The I-5 fiber corridor through Roseburg carries "
            "the principal Pacific Northwest backbone connecting Portland to California. "
            "Umpqua Community College provides a regional technology workforce pipeline."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Weyerhaeuser/Roseburg FP timber AI; Pacific Power Oregon West; I-5 PNW fiber backbone; Umpqua CC workforce.",
        "sources": [
            {"label": "Douglas County Economic Development", "url": "https://www.co.douglas.or.us/planning/economic-development.asp"},
            {"label": "Roseburg Urban Renewal Agency", "url": "https://www.cityofroseburg.org/"},
            {"label": "Pacific Power — Oregon Industrial Service", "url": "https://www.pacificpower.net/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41031",
        "name": "Jefferson County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Jefferson County Oregon Madras High Desert Solar and Data Center Incentive",
        "description": (
            "Jefferson County (Madras, OR) sits in Oregon's high desert plateau "
            "east of the Cascades, an emerging solar energy production zone with "
            "among the highest solar irradiance levels in the Pacific Northwest. "
            "Pacific Power (PacifiCorp) serves the county, and multiple utility-scale "
            "solar projects have interconnected or are queued into the BPA/PacifiCorp "
            "transmission system in the region. The Confederated Tribes of Warm Springs "
            "(whose reservation borders Jefferson County on three sides) have partnered "
            "with Pacific Power and federal agencies on renewable energy development. "
            "Oregon's Enterprise Zone program and data center equipment exemptions "
            "apply to qualifying investments in the Madras Urban Renewal Area. "
            "The county's low land costs, high solar resource, and Pacific Power "
            "renewable content make it attractive for clean-energy-powered computing."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Oregon high desert solar zone; Pacific Power BPA interconnect; Warm Springs Tribes renewable partnership; Enterprise Zone.",
        "sources": [
            {"label": "Jefferson County Economic Development", "url": "https://www.co.jefferson.or.us/planning"},
            {"label": "Confederated Tribes of Warm Springs — Energy Division", "url": "https://www.warmsprings-nsn.gov/"},
            {"label": "Oregon Enterprise Zone Program — Business Oregon", "url": "https://www.oregon.gov/biz/programs/ez/pages/default.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41041",
        "name": "Lincoln County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Lincoln County Oregon Newport Wave Energy Research and Coastal Data Center Incentive",
        "description": (
            "Lincoln County (Newport, OR) anchors Oregon's central coast and hosts "
            "the Oregon State University Hatfield Marine Science Center — one of the "
            "nation's leading marine science research institutions — along with NOAA's "
            "Pacific Marine Environmental Laboratory and the Northwest National Marine "
            "Renewable Energy Center (NNMREC), which is developing wave energy "
            "conversion technology at the Pacific Marine Energy Center (PMEC). "
            "These institutions drive significant oceanographic AI and renewable "
            "energy computing demand. Pacific Power (PacifiCorp) serves the county "
            "from the Oregon coast transmission system. Oregon's data center incentive "
            "programs and the Port of Newport's industrial redevelopment corridor "
            "support qualifying computing investments in the county's marine "
            "technology sector."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "OSU Hatfield Marine Science Center; NOAA PMEL; NNMREC wave energy AI; Pacific Power coast; PMEC renewable research.",
        "sources": [
            {"label": "Lincoln County Economic Development — Newport OR", "url": "https://www.co.lincoln.or.us/economic-development"},
            {"label": "OSU Hatfield Marine Science Center", "url": "https://hmsc.oregonstate.edu/"},
            {"label": "Northwest National Marine Renewable Energy Center (NNMREC)", "url": "https://nnmrec.oregonstate.edu/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41061",
        "name": "Union County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Union County Oregon La Grande Eastern Oregon University and Pacific Power Data Center Incentive",
        "description": (
            "Union County (La Grande, OR) is the commercial center of northeastern "
            "Oregon's Grande Ronde Valley, served by Pacific Power (PacifiCorp) with "
            "access to the Eastern Oregon transmission system. Eastern Oregon University "
            "(La Grande) provides a regional technology workforce pipeline. The county's "
            "position on the I-84 fiber corridor — the principal arterial connecting "
            "Portland to Boise and the Mountain West — provides strong backbone "
            "connectivity. Union County has attracted agricultural technology operations "
            "serving the Wallowa-Whitman National Forest timber sector and the Grande "
            "Ronde Valley's wheat-farming economy. Oregon's data center equipment "
            "exemptions and Eastern Oregon Rural Investment Fund grants support "
            "qualifying computing investments. The county's cool mountain climate "
            "reduces mechanical cooling costs for data center operations."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Eastern Oregon University workforce; Pacific Power Eastern OR; I-84 Portland-Boise fiber; cool climate; rural investment grants.",
        "sources": [
            {"label": "Union County Economic Development — La Grande OR", "url": "https://www.co.union.or.us/"},
            {"label": "Eastern Oregon University", "url": "https://www.eou.edu/"},
            {"label": "Oregon Rural Investment Fund — Business Oregon", "url": "https://www.oregon.gov/biz/programs/rural/pages/default.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "41069",
        "name": "Yamhill County",
        "state": "Oregon",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Yamhill County Oregon Wine Country AI and Portland Metro Data Center Incentive",
        "description": (
            "Yamhill County (McMinnville, OR) is the heart of the Willamette Valley "
            "wine country — the nation's most acclaimed Pinot Noir appellation — and "
            "hosts Linfield University and the Evergreen International Aviation Museum "
            "(the Spruce Goose). The county's agriculture AI demand from precision "
            "viticulture — soil sensing, canopy management, harvest prediction — is "
            "among the most sophisticated per-acre computing requirements of any "
            "agricultural sector. Portland General Electric (PGE) serves the northern "
            "part of the county and Pacific Power the southern portion. Oregon's data "
            "center equipment exemption and Yamhill County's proximity to the "
            "Portland/Hillsboro data center campus (Intel, Google, Facebook) "
            "make the county attractive for agricultural AI and edge computing "
            "deployments. The county's Newberg and McMinnville urban growth "
            "boundaries support industrial development with PGE/Pacific Power access."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Willamette Valley precision viticulture AI; PGE/Pacific Power dual service; Portland/Hillsboro DC campus spillover; Linfield Univ.",
        "sources": [
            {"label": "Yamhill County Economic Development", "url": "https://www.co.yamhill.or.us/planning-development"},
            {"label": "McMinnville Economic Development Partnership", "url": "https://www.mcminnvilleoregon.gov/economic-development"},
            {"label": "Portland General Electric — Yamhill County Service", "url": "https://www.portlandgeneral.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── Washington State ──────────────────────────────────────────────────────

    {
        "fips": "53071",
        "name": "Walla Walla County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Walla Walla County Washington Wine Country AI and Pacific Northwest Fiber Hub",
        "description": (
            "Walla Walla County (Walla Walla, WA) anchors Washington State's premier "
            "wine appellation and is home to Whitman College (one of the nation's "
            "top liberal arts colleges) and Walla Walla Community College's viticulture "
            "program. The county's precision viticulture AI demand — soil sensors, "
            "drone canopy analysis, fermentation optimization — has attracted agricultural "
            "technology startups and computing infrastructure. Walla Walla Power District "
            "serves the county with competitive rates from BPA wholesale power. Washington's "
            "data center sales-tax exemption (RCW 82.08.986) applies to qualifying "
            "equipment investments. The Port of Walla Walla's industrial area and the "
            "US-12 and US-730 fiber corridors connecting to the I-82 backbone provide "
            "regional network connectivity. Washington State Penitentiary's large "
            "campus also drives government computing in the county."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Walla Walla wine AI; Walla Walla Power District BPA rates; RCW 82.08.986 exemption; Whitman College workforce; US-12 fiber.",
        "sources": [
            {"label": "Walla Walla County Economic Development", "url": "https://www.co.walla-walla.wa.us/"},
            {"label": "Walla Walla Power District", "url": "https://www.wwpd.net/"},
            {"label": "Washington State Data Center Tax Exemption RCW 82.08.986", "url": "https://app.leg.wa.gov/RCW/default.aspx?cite=82.08.986"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "53075",
        "name": "Whitman County",
        "state": "Washington",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Whitman County Washington WSU Research Computing and Avista Utilities Data Center Incentive",
        "description": (
            "Whitman County (Pullman, WA) hosts Washington State University (WSU) — "
            "a land-grant research university with approximately 20,000 students and "
            "significant HPC and AI research infrastructure, including the Center for "
            "Institutional Research Computing (CIRC) and the WSU Institute for Shock "
            "Physics. WSU's agricultural research computing (crop modeling, precision "
            "agriculture, food systems) is among the most advanced in the Pac-12. "
            "Avista Utilities serves Pullman with rates from the Spokane River hydro "
            "system. Washington's data center sales-tax exemption (RCW 82.08.986) "
            "applies to qualifying equipment. The county's I-90 fiber corridor "
            "(via Spokane, 75 miles north) provides backbone connectivity, and "
            "the Palouse fiber ring connecting Pullman, Moscow (Idaho), and "
            "Lewiston carries university network traffic."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "WSU HPC/AI research anchor; CIRC; Avista Utilities hydro rates; RCW 82.08.986; Palouse fiber ring.",
        "sources": [
            {"label": "Whitman County Economic Development", "url": "https://www.whitmancounty.org/"},
            {"label": "WSU Center for Institutional Research Computing (CIRC)", "url": "https://hpc.wsu.edu/"},
            {"label": "Avista Utilities — Pullman WA Service", "url": "https://www.avistautilities.com/"},
            {"label": "Washington State Data Center Tax Exemption RCW 82.08.986", "url": "https://app.leg.wa.gov/RCW/default.aspx?cite=82.08.986"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

for entry in new_restrictions:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

new_campuses = [
    {
        "id": "ai-ga-008",
        "name": "Georgia Ports Authority Garden City Terminal AI Logistics Hub — Chatham County GA",
        "operator": "Georgia Ports Authority / GPA",
        "status": "operational",
        "county_fips": "13051",
        "notes": (
            "The Georgia Ports Authority's Garden City Terminal in Savannah is the "
            "nation's busiest single-terminal container port, handling 5.6M TEUs "
            "annually. GPA operates AI-driven berth scheduling, automated stacking "
            "cranes (ASCs), vessel arrival prediction, and inland port logistics "
            "optimization systems across the Port of Savannah and Appalachian "
            "Regional Port network."
        ),
        "lon": -81.1499,
        "lat": 32.0835,
    },
    {
        "id": "ai-ga-009",
        "name": "Macon-Bibb County Technology Hub / Mercer University AI Research — Bibb County GA",
        "operator": "Macon-Bibb County Industrial Authority / Mercer University",
        "status": "operational",
        "county_fips": "13021",
        "notes": (
            "The Macon-Bibb County industrial corridor hosts Mercer University's "
            "engineering and AI research programs, Middle Georgia State University's "
            "aviation science computing, and a growing cluster of healthcare AI "
            "operations anchored by Navicent Health (Atrium Health subsidiary). "
            "MEAG Power delivers competitive wholesale rates through the city "
            "utility system."
        ),
        "lon": -83.6324,
        "lat": 32.8407,
    },
    {
        "id": "ai-nc-008",
        "name": "Fort Liberty (Bragg) U.S. Army FORSCOM/USASOC AI Computing — Cumberland County NC",
        "operator": "U.S. Army / Army Forces Command / USASOC",
        "status": "operational",
        "county_fips": "37051",
        "notes": (
            "Fort Liberty (formerly Fort Bragg) — the world's largest military "
            "installation by population — hosts U.S. Army Forces Command, XVIII "
            "Airborne Corps, 82nd Airborne Division, and U.S. Army Special Operations "
            "Command. The installation operates classified C4ISR, targeting analytics, "
            "and AI-enabled intelligence fusion systems. Pope Army Airfield provides "
            "the fixed-wing AI-supported ISR and airlift mission computing."
        ),
        "lon": -79.0061,
        "lat": 35.1399,
    },
    {
        "id": "ai-nc-009",
        "name": "Wake Forest Innovation Quarter / Atrium Health Baptist AI Research — Forsyth County NC",
        "operator": "Wake Forest University / Atrium Health",
        "status": "operational",
        "county_fips": "37067",
        "notes": (
            "Wake Forest Innovation Quarter (WFIQ) is a 170-acre urban innovation "
            "district in Winston-Salem anchored by Wake Forest University School of "
            "Medicine, Atrium Health Wake Forest Baptist Medical Center, and Winston-Salem "
            "State University. WFIQ houses biomedical AI research in oncology, "
            "genomics, clinical decision support, and precision medicine — one of "
            "the most concentrated health AI campuses in the Southeast."
        ),
        "lon": -80.2442,
        "lat": 36.0999,
    },
    {
        "id": "ai-wa-007",
        "name": "Clark Public Utilities Columbia Gorge Data Center Zone — Clark County WA",
        "operator": "Multiple tenants / Clark County EDC",
        "status": "planned",
        "county_fips": "53003",
        "notes": (
            "Clark County's position as the Washington-side component of the Portland "
            "metro area — with Washington's favorable tax treatment (no income tax, "
            "RCW 82.08.986 sales-tax exemption on data center equipment) versus Oregon's "
            "taxable environment — has driven a cluster of data center proposals along "
            "the I-5 and I-205 corridors south of Vancouver. Clark Public Utilities "
            "is the primary distributor, interconnected with BPA's high-voltage grid."
        ),
        "lon": -122.5712,
        "lat": 45.6280,
    },
    {
        "id": "ai-or-008",
        "name": "Jefferson County High Desert Solar Data Center Zone — Jefferson County OR",
        "operator": "Multiple developers / Jefferson County",
        "status": "planned",
        "county_fips": "41031",
        "notes": (
            "Jefferson County's Madras area is emerging as a solar-plus-compute "
            "destination in Oregon's high desert, with PacifiCorp/Pacific Power "
            "interconnect queues holding multiple utility-scale solar projects. "
            "The Confederated Tribes of Warm Springs have development rights to "
            "significant renewable energy capacity in the region. Land costs are "
            "low, ambient temperatures favor free-air cooling, and the I-97 "
            "fiber corridor connects to the US-97 north-south backbone."
        ),
        "lon": -121.1294,
        "lat": 44.6343,
    },
    {
        "id": "ai-ny-006",
        "name": "GE Vernova Global Research Center — Niskayuna / Schenectady County NY",
        "operator": "GE Vernova (General Electric Vernova Inc.)",
        "status": "operational",
        "county_fips": "36093",
        "notes": (
            "GE Vernova's Global Research Center in Niskayuna, NY (est. 1900 as the "
            "General Electric Research Laboratory) is one of the world's oldest and "
            "most productive industrial R&D campuses. Today it focuses on AI-enabled "
            "gas turbine efficiency, wind turbine digital twins, grid-scale energy "
            "storage, and power semiconductor research — generating some of the "
            "most demanding industrial AI HPC workloads in the Northeast."
        ),
        "lon": -73.9212,
        "lat": 42.8142,
    },
    {
        "id": "ai-ny-007",
        "name": "NYPA St. Lawrence-FDR Hydroelectric Complex AI / Clarkson University HPC — St. Lawrence County NY",
        "operator": "New York Power Authority / Clarkson University",
        "status": "operational",
        "county_fips": "36101",
        "notes": (
            "The New York Power Authority's 912 MW St. Lawrence-Franklin D. Roosevelt "
            "Power Project is among the most powerful hydroelectric facilities in "
            "New York State. NYPA operates AI-based water-flow optimization, "
            "generation scheduling, and grid-balancing systems for the seaway "
            "complex. Clarkson University's research computing cluster (anchored "
            "by climate modeling, autonomous vehicles, and engineering AI) benefits "
            "from adjacent NYPA low-cost hydropower allocations."
        ),
        "lon": -75.0891,
        "lat": 44.7021,
    },
    {
        "id": "ai-or-009",
        "name": "Roseburg Forest Products / Pacific Power Timber AI Hub — Douglas County OR",
        "operator": "Roseburg Forest Products / Pacific Power",
        "status": "operational",
        "county_fips": "41019",
        "notes": (
            "Douglas County's timber industry — anchored by Roseburg Forest Products, "
            "Weyerhaeuser, and Interfor — operates AI-based log-scanning, yield "
            "optimization, and predictive sawmill maintenance systems that represent "
            "among the most mature industrial AI deployments in Oregon's forest sector. "
            "Pacific Power serves these industrial loads with Oregon West transmission "
            "system capacity, and the I-5 fiber corridor through Roseburg is the "
            "primary Pacific Northwest backbone."
        ),
        "lon": -123.3417,
        "lat": 43.2165,
    },
    {
        "id": "ai-wa-008",
        "name": "Walla Walla Valley Precision Viticulture AI Hub — Walla Walla County WA",
        "operator": "Multiple wineries / WSU Viticulture Research",
        "status": "operational",
        "county_fips": "53071",
        "notes": (
            "Walla Walla County hosts 200+ wineries anchored by Woodward Canyon, "
            "L'Ecole No. 41, Seven Hills, and Leonetti Cellar. WSU's Viticulture "
            "and Enology research program (centered in Prosser but with Walla Walla "
            "extension operations) drives precision viticulture AI — soil-moisture "
            "sensing, drone-based canopy analysis, fermentation monitoring, and "
            "harvest-prediction systems — representing one of the most data-intensive "
            "per-acre agricultural AI deployments in the Pacific Northwest."
        ),
        "lon": -118.3430,
        "lat": 46.0646,
    },
]

for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

raw["restrictions"]  = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2, ensure_ascii=False)
with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2, ensure_ascii=False)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
