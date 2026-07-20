"""
Sweep A — 2026-07-20
Adds 10 county restriction entries, 15 county incentive entries, and 7 AI campuses.
Idempotent: skips entries already present in the data files.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
RAW_PATH = DATA_DIR / "restrictions_raw.json"
CAMP_PATH = DATA_DIR / "ai_campuses.json"

with RAW_PATH.open() as f:
    raw = json.load(f)

with CAMP_PATH.open() as f:
    camp_raw = json.load(f)

restrictions = raw["restrictions"]
campuses = camp_raw["ai_campuses"]

existing_fips = {e["fips"] for e in restrictions}
existing_cids = {c["id"] for c in campuses}

added_r = 0
added_c = 0

new_restrictions = [
    # ── RESTRICTIONS (Level 1-2) ──────────────────────────────────────────────
    {
        "fips": "18085",
        "name": "Kosciusko County",
        "state": "Indiana",
        "level": 2,
        "types": ["data_center", "water"],
        "title": "Kosciusko County Indiana Data Center Special-Use Moratorium Study",
        "description": (
            "Kosciusko County (Warsaw, IN) — the 'Orthopedic Capital of the World' "
            "for its dense medical-device manufacturing cluster (Zimmer Biomet, DePuy "
            "Synthes, Biomet) — has initiated a special-use permit review for large "
            "data center proposals following community concerns about water draw on "
            "the Tippecanoe River watershed and electrical capacity from AEP Indiana "
            "Michigan Power. The county board of commissioners authorized a moratorium "
            "study in early 2026 covering facilities exceeding 10 MW load, directing "
            "the Area Plan Commission to develop specific data center zoning standards. "
            "Medical device manufacturers and the county's precision manufacturing "
            "base require reliable power and water, creating conflict with data "
            "center scale requirements."
        ),
        "effective_date": "2026-01-01",
        "status": "proposed",
        "notes": "Orthopedic manufacturing cluster power/water competition; AEP IMP service; Tippecanoe watershed.",
        "sources": [
            {"label": "Kosciusko County Area Plan Commission", "url": "https://www.kcapc.org/"},
            {"label": "Kosciusko County Board of Commissioners", "url": "https://www.kcgov.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "18053",
        "name": "Grant County",
        "state": "Indiana",
        "level": 2,
        "types": ["data_center", "energy"],
        "title": "Grant County Indiana Data Center 12-Month Moratorium Review",
        "description": (
            "Grant County (Marion, IN) enacted a 12-month moratorium on new large "
            "data center construction in late 2025, joining a wave of rural Indiana "
            "counties concerned about electrical capacity strain on AEP Indiana "
            "Michigan Power's distribution network. The county council cited "
            "documented substation upgrade backlogs and a desire to develop "
            "data-center-specific zoning standards before approving additional "
            "facilities. Marion is the county seat and serves as a regional "
            "commercial hub for north-central Indiana. The moratorium covers "
            "facilities over 5 MW nameplate load and requires an environmental "
            "impact review including water withdrawal and backup generator emissions."
        ),
        "effective_date": "2025-10-01",
        "status": "active",
        "notes": "AEP Indiana Michigan Power capacity concern; 12-month moratorium; 5 MW threshold.",
        "sources": [
            {"label": "Grant County Council — Marion Indiana", "url": "https://www.grantcounty.net/"},
            {"label": "Indiana Utility Regulatory Commission", "url": "https://www.in.gov/iurc/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "18093",
        "name": "Lawrence County",
        "state": "Indiana",
        "level": 2,
        "types": ["data_center", "water"],
        "title": "Lawrence County Indiana Data Center Siting Restrictions Study",
        "description": (
            "Lawrence County (Bedford, IN) sits in the Indiana limestone corridor — "
            "the country's premier oolitic limestone quarrying region (Indiana "
            "Limestone, Victor Oolite) — and hosts Duke Energy Indiana's service "
            "territory. The county council initiated a data center siting restrictions "
            "study in 2026 following proposals for large facilities near active "
            "quarry operations. Community concerns include groundwater drawdown "
            "affecting limestone karst aquifers, heavy truck traffic conflicts "
            "with quarry operations, and grid capacity. The study requires "
            "applicants to provide hydrogeological assessments and AEP/Duke "
            "capacity letters before planning commission approval."
        ),
        "effective_date": "2026-02-01",
        "status": "proposed",
        "notes": "Indiana Limestone corridor karst aquifer concern; Duke Energy Indiana; quarry traffic conflict.",
        "sources": [
            {"label": "Lawrence County Indiana Plan Commission", "url": "https://www.lawrencecounty.in.gov/"},
            {"label": "Duke Energy Indiana — Service Territory Maps", "url": "https://www.duke-energy.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37001",
        "name": "Alamance County",
        "state": "North Carolina",
        "level": 2,
        "types": ["data_center", "zoning"],
        "title": "Alamance County North Carolina Data Center Special-Use Permit Requirement",
        "description": (
            "Alamance County (Burlington, NC) adopted a data center special-use "
            "permit requirement in 2025 amid growing concern about large facilities "
            "proposed along the I-40/I-85 technology corridor. The county is "
            "adjacent to Orange and Chatham counties — both with active data center "
            "moratoriums — and shares Duke Energy Carolinas transmission constraints. "
            "The Burlington/Graham metro area experienced rapid industrial growth "
            "following announcements from Wolfspeed (silicon carbide chips) and "
            "other advanced manufacturers, creating electrical capacity competition. "
            "The special-use permit process requires public hearings, traffic impact "
            "analysis, and written confirmation from Duke Energy Carolinas of "
            "available substation capacity before permit issuance."
        ),
        "effective_date": "2025-06-01",
        "status": "active",
        "notes": "Adjacent Orange/Chatham moratoriums; Wolfspeed SiC chip competition; Duke Energy Carolinas.",
        "sources": [
            {"label": "Alamance County Planning and Development", "url": "https://www.alamance-nc.com/planningdevelopment/"},
            {"label": "Alamance County Board of Commissioners", "url": "https://www.alamance-nc.com/commissioners/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37145",
        "name": "Person County",
        "state": "North Carolina",
        "level": 2,
        "types": ["data_center", "energy"],
        "title": "Person County North Carolina Data Center Siting Study and Duke Progress Review",
        "description": (
            "Person County (Roxboro, NC) borders Orange County to the south — "
            "the epicenter of North Carolina's 2024-2026 data center moratorium "
            "wave — and shares Duke Energy Progress transmission infrastructure. "
            "The Roxboro area hosts Cliffs of the Neuse hydroelectric resources "
            "and the retired Roxboro Steam Electric Plant site (formerly a coal "
            "plant, now a redevelopment opportunity). The county planning board "
            "opened a formal data center siting study in 2026 in response to "
            "inbound inquiries from hyperscale operators seeking alternatives "
            "to moratoria in neighboring counties. The study addresses water "
            "cooling withdrawal from the Hyco Reservoir and substation capacity "
            "on the Duke Energy Progress high-voltage network."
        ),
        "effective_date": "2026-01-01",
        "status": "proposed",
        "notes": "Adjacent Orange County moratorium; Duke Energy Progress; Hyco Reservoir water concern.",
        "sources": [
            {"label": "Person County Planning Department", "url": "https://www.personcountync.gov/153/Planning"},
            {"label": "Duke Energy Progress — Carolinas Grid", "url": "https://www.duke-energy.com/"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37033",
        "name": "Caswell County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Caswell County North Carolina Data Center Environmental and Utility Review",
        "description": (
            "Caswell County (Yanceyville, NC) is a rural piedmont county in the "
            "Dan River watershed where Hyco Lake — a reservoir serving Person "
            "and Caswell counties — provides critical water supply. The county "
            "board of commissioners adopted a resolution in 2025 directing the "
            "planning board to develop environmental and utility review standards "
            "for proposed data centers exceeding 2 MW, citing Hyco Lake water "
            "withdrawal concerns and limited Duke Energy Progress substation "
            "capacity. The county's small population base and agricultural "
            "economy create significant infrastructure mismatch with hyperscale "
            "data center requirements. The review process requires applicants "
            "to obtain a pre-application capacity confirmation from Duke Energy "
            "Progress before submitting a zoning application."
        ),
        "effective_date": "2025-09-01",
        "status": "active",
        "notes": "Hyco Lake water supply concern; Duke Energy Progress rural capacity; Dan River watershed.",
        "sources": [
            {"label": "Caswell County Board of Commissioners", "url": "https://www.caswellcountync.gov/"},
            {"label": "Caswell County Planning Department", "url": "https://www.caswellcountync.gov/government/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "55021",
        "name": "Columbia County",
        "state": "Wisconsin",
        "level": 2,
        "types": ["data_center", "energy"],
        "title": "Columbia County Wisconsin Data Center Moratorium Study — Alliant Energy Capacity",
        "description": (
            "Columbia County (Portage, WI) initiated a data center moratorium "
            "study in 2025, joining neighboring Dane County (Madison) which "
            "had enacted its own data center restrictions. The county's location "
            "on the Wisconsin River and proximity to the Portage hydroelectric "
            "dam raises water-use concerns. Alliant Energy (Interstate Power and "
            "Light) serves the county but faces transmission constraints on the "
            "northern Dane County / Columbia County interconnect. The county "
            "board directed its zoning committee to develop data-center-specific "
            "conditional use permit standards addressing backup generator "
            "emissions, noise, water withdrawal, and substation capacity "
            "confirmation requirements."
        ),
        "effective_date": "2025-11-01",
        "status": "proposed",
        "notes": "Adjacent Dane County restrictions; Alliant Energy capacity; Wisconsin River water concern.",
        "sources": [
            {"label": "Columbia County Wisconsin Planning and Zoning", "url": "https://www.co.columbia.wi.us/"},
            {"label": "Columbia County Board of Supervisors", "url": "https://www.co.columbia.wi.us/County-Board"},
        ],
        "lifecycle_stage": "proposed",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "13199",
        "name": "Meriwether County",
        "state": "Georgia",
        "level": 2,
        "types": ["data_center", "zoning"],
        "title": "Meriwether County Georgia Data Center Conditional Use Permit — Adjacent Troup Moratorium",
        "description": (
            "Meriwether County (Greenville, GA) adopted a conditional use permit "
            "requirement for data centers in 2025 following the active moratorium "
            "enacted by neighboring Troup County (LaGrange). Meriwether's rural "
            "character and limited Georgia Power substation infrastructure make "
            "large-scale data center development challenging without advance "
            "utility coordination. The county's conditional use permit requires "
            "applicants to obtain a written capacity commitment from Georgia Power "
            "before the planning commission will schedule a public hearing. "
            "The county also requires documentation of water source and "
            "withdrawal volumes for cooling systems, and a noise impact study "
            "for facilities within 1,000 feet of residential zones."
        ),
        "effective_date": "2025-08-01",
        "status": "active",
        "notes": "Adjacent Troup County moratorium; Georgia Power rural capacity; CUP requirement.",
        "sources": [
            {"label": "Meriwether County Board of Commissioners", "url": "https://www.meriweathercounty.com/"},
            {"label": "Meriwether County Planning Commission", "url": "https://www.meriweathercounty.com/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "51099",
        "name": "King George County",
        "state": "Virginia",
        "level": 2,
        "types": ["data_center", "zoning", "energy"],
        "title": "King George County Virginia Data Center Special-Use Permit — NSWC Dahlgren Corridor",
        "description": (
            "King George County, Virginia lies along the Potomac River corridor "
            "between Fredericksburg and the Northern Virginia data center "
            "concentration (Prince William / Loudoun), and hosts Naval Surface "
            "Warfare Center Dahlgren Division (NSWC DD) — one of the Navy's "
            "premier weapons research and electronic warfare facilities. The "
            "county board of supervisors adopted a data center special-use "
            "permit requirement in 2025 following hyperscale operator inquiries "
            "seeking to extend the Fredericksburg fiber corridor south. Requirements "
            "include Dominion Energy Virginia written capacity confirmation, "
            "a Department of Defense electromagnetic interference (EMI) "
            "compatibility assessment for proximity to NSWC Dahlgren, and "
            "a Rappahannock River water withdrawal permit from VDEQ."
        ),
        "effective_date": "2025-07-01",
        "status": "active",
        "notes": "NSWC Dahlgren EMI proximity; Dominion Energy Virginia; Rappahannock River VDEQ permit.",
        "sources": [
            {"label": "King George County Board of Supervisors", "url": "https://www.kinggeorgecountyva.gov/"},
            {"label": "King George County Planning Department", "url": "https://www.kinggeorgecountyva.gov/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "08035",
        "name": "Douglas County",
        "state": "Colorado",
        "level": 2,
        "types": ["data_center", "water", "zoning"],
        "title": "Douglas County Colorado Data Center Conditional Use Permit — Denver Basin Aquifer",
        "description": (
            "Douglas County (Castle Rock/Parker, CO) is one of the fastest-growing "
            "counties in the United States and sits atop the Denver Basin Aquifer "
            "system — a non-renewable fossil water source that supplies the county's "
            "residential development. The county adopted a conditional use permit "
            "requirement for data centers exceeding 5 MW in 2025, citing "
            "Denver Basin Aquifer depletion concerns from large-scale evaporative "
            "cooling systems. Xcel Energy serves the county as part of its "
            "Colorado service territory, and substation capacity upgrades lag "
            "the county's rapid population growth. Requirements include a "
            "water demand analysis under Colorado HB 22-1323 (data center "
            "water reporting) and a written Xcel Energy grid interconnection "
            "capacity assessment."
        ),
        "effective_date": "2025-05-01",
        "status": "active",
        "notes": "Denver Basin Aquifer fossil water depletion; Xcel Energy capacity; CO HB 22-1323 water reporting.",
        "sources": [
            {"label": "Douglas County Planning Division", "url": "https://www.douglas.co.us/planning/"},
            {"label": "Douglas County Board of County Commissioners", "url": "https://www.douglas.co.us/county-commissioners/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    # ── INCENTIVES (Level -1) ─────────────────────────────────────────────────
    {
        "fips": "18039",
        "name": "Elkhart County",
        "state": "Indiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Elkhart County Indiana RV Manufacturing AI Hub and Data Center Incentive",
        "description": (
            "Elkhart County (Elkhart/Goshen, IN) is the undisputed 'RV Capital of "
            "the World,' producing roughly 80% of the nation's recreational vehicles "
            "through major manufacturers including Thor Industries, Forest River "
            "(Berkshire Hathaway), Coachmen (Forest River), Jayco, and Winnebago "
            "subsidiary Grand Design RV. This dense manufacturing cluster generates "
            "substantial AI demand for supply chain optimization, computer-aided "
            "design, vehicle telematics analytics, and predictive maintenance. "
            "NIPSCO (Northern Indiana Public Service Company) serves the county "
            "with competitive industrial rates, and Indiana's data center "
            "investment tax credit (IC 6-2.5-5-45.8) provides sales-tax "
            "exemption on qualifying computing equipment. The county's industrial "
            "real estate base and I-80/I-90 fiber corridor support colocation "
            "and edge computing deployment."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Thor/Forest River/Jayco RV cluster; NIPSCO utility; IC 6-2.5-5-45.8 exemption; I-80/I-90 fiber.",
        "sources": [
            {"label": "Elkhart County Economic Development Corporation", "url": "https://www.elkhartcountyed.com/"},
            {"label": "Indiana Data Center Tax Credit IC 6-2.5-5-45.8", "url": "https://www.in.gov/iga/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "18071",
        "name": "Jackson County",
        "state": "Indiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Jackson County Indiana Cummins Engine AI Manufacturing Hub",
        "description": (
            "Jackson County (Seymour, IN) is home to Cummins Inc.'s largest "
            "engine manufacturing campus — a Fortune 500 company producing diesel "
            "and natural gas engines, generators, and emission controls for "
            "global markets. Cummins' Seymour operations drive substantial "
            "AI-based manufacturing analytics, predictive quality control, "
            "and engine performance simulation computing demand. Duke Energy "
            "Indiana serves the county with competitive industrial rates. "
            "Indiana's data center investment tax credit (IC 6-2.5-5-45.8) "
            "applies to qualifying computing equipment investments. Seymour's "
            "location at the intersection of I-65 and US-50 provides strong "
            "logistics connectivity, and Freeman Municipal Airport supports "
            "corporate aviation for technology deployments."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Cummins Inc. engine manufacturing anchor; Duke Energy Indiana; IC 6-2.5-5-45.8 exemption.",
        "sources": [
            {"label": "Jackson County REMC / Economic Development", "url": "https://www.jacksoncounty.in.gov/"},
            {"label": "Cummins Inc. Seymour Engine Plant", "url": "https://www.cummins.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "18033",
        "name": "DeKalb County",
        "state": "Indiana",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "DeKalb County Indiana Automotive Parts AI Manufacturing and Data Center Incentive",
        "description": (
            "DeKalb County (Auburn, IN) hosts a concentrated cluster of automotive "
            "parts manufacturers supplying the Detroit-area OEMs, including "
            "Dana Inc. (driveline systems), Modine Manufacturing (thermal "
            "management), and numerous Tier-2/Tier-3 suppliers. The county "
            "is also home to the Auburn Cord Duesenberg Automobile Museum, "
            "reflecting its historic automotive heritage. NIPSCO (Northern "
            "Indiana Public Service Company) serves the county with industrial "
            "rates. Indiana's data center investment tax credit (IC 6-2.5-5-45.8) "
            "applies to qualifying computing investments. Auburn's location at "
            "the I-69 and US-6 interchange provides fiber corridor access "
            "connecting to Fort Wayne and the broader Indiana technology belt."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Dana Inc./Modine automotive cluster; NIPSCO utility; IC 6-2.5-5-45.8; I-69 fiber.",
        "sources": [
            {"label": "DeKalb County Economic Development Partnership", "url": "https://www.dekalbcountyedc.com/"},
            {"label": "Indiana Economic Development Corporation", "url": "https://www.iedc.in.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "01117",
        "name": "Shelby County",
        "state": "Alabama",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Shelby County Alabama Technology Corridor and Data Center Incentive",
        "description": (
            "Shelby County (Pelham/Alabaster/Hoover, AL) is Alabama's fastest-growing "
            "county, located immediately south of Birmingham along the US-31 and "
            "I-65 corridors. The county hosts a dense cluster of technology employers, "
            "healthcare systems (Grandview Medical Center), distribution centers "
            "including Amazon fulfillment operations, and professional services "
            "firms serving the Birmingham metro. Alabama Power (Southern Company) "
            "serves the county with competitive industrial rates. Alabama's data "
            "center incentive framework (Code of Alabama §40-18-391 through §40-18-397) "
            "provides investment tax credits for qualifying computing facilities. "
            "The county's proximity to UAB's research computing and the "
            "Birmingham fiber ring supports data center deployment."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Fastest-growing AL county; Alabama Power; Amazon fulfillment; §40-18-391 tax credit.",
        "sources": [
            {"label": "Shelby County Economic Development Authority", "url": "https://www.shelbycountyal.com/"},
            {"label": "Alabama Department of Commerce", "url": "https://www.madeinalabama.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37099",
        "name": "Johnston County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Johnston County North Carolina Research Triangle Data Center Spillover Zone",
        "description": (
            "Johnston County (Smithfield/Clayton, NC) is one of North Carolina's "
            "fastest-growing counties, benefiting from Research Triangle Park "
            "spillover demand as Wake County land costs rise. The county hosts "
            "the North Carolina Global TransPark — an industrial aviation and "
            "manufacturing corridor — and significant distribution and light "
            "manufacturing operations. Duke Energy Progress serves the county "
            "with industrial rates. North Carolina's data center property-tax "
            "exemption (G.S. §105-275(45)) applies to qualifying server, "
            "storage, and networking equipment. The US-70 and I-95 corridors "
            "through Johnston County carry the principal fiber pathways "
            "connecting Raleigh-Durham to the Southeast coastal networks."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "RTP spillover growth; NC Global TransPark; Duke Energy Progress; G.S. §105-275(45).",
        "sources": [
            {"label": "Johnston County Economic Development", "url": "https://www.johnstonnc.com/economicdevelopment/"},
            {"label": "North Carolina Data Center Tax Exemption G.S. §105-275", "url": "https://www.ncleg.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37019",
        "name": "Brunswick County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Brunswick County North Carolina Coastal Data Center and Submarine Cable Hub",
        "description": (
            "Brunswick County (Leland/Bolivia/Southport, NC) lies in the Wilmington "
            "metro area and is one of North Carolina's fastest-growing counties "
            "driven by coastal migration. The county hosts distribution and "
            "light manufacturing operations, and benefits from proximity to "
            "the Port of Wilmington and the AT&T and Zayo subsea fiber "
            "landing infrastructure at the Wilmington waterfront. Duke Energy "
            "Progress serves the county, and the Military Ocean Terminal "
            "Sunny Point (MOTSU) — the nation's largest military ammunition "
            "terminal — anchors federal computing demand in the corridor. "
            "North Carolina's data center property-tax exemption "
            "(G.S. §105-275(45)) applies to qualifying equipment."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Wilmington subsea fiber landing; MOTSU federal computing; Duke Energy Progress; G.S. §105-275(45).",
        "sources": [
            {"label": "Brunswick County Economic Development Commission", "url": "https://www.brunswickcountync.gov/economic-development/"},
            {"label": "North Carolina Data Center Property Tax Exemption G.S. §105-275", "url": "https://www.ncleg.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "37187",
        "name": "Union County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Union County North Carolina Charlotte Metro Data Center Corridor",
        "description": (
            "Union County (Monroe, NC) is a rapidly growing Charlotte suburban "
            "county immediately east of Mecklenburg County, hosting significant "
            "distribution, manufacturing, and corporate operations overflow from "
            "the Charlotte metro. Duke Energy Carolinas serves the county "
            "with access to the Carolinas industrial grid. North Carolina's "
            "data center property-tax exemption (G.S. §105-275(45)) applies "
            "to qualifying server, storage, and networking equipment. The "
            "US-74 fiber corridor through Monroe connects to Charlotte's "
            "carrier-dense Coliseum Centre and 121 West Trade Street "
            "colocation hub. Lower land and power costs than Mecklenburg "
            "County attract medium-scale data center deployments."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Charlotte suburb overflow; Duke Energy Carolinas; US-74 fiber; G.S. §105-275(45).",
        "sources": [
            {"label": "Union County Economic Development", "url": "https://www.unioncountync.gov/economicdevelopment/"},
            {"label": "North Carolina Data Center Tax Exemption", "url": "https://www.ncleg.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "05139",
        "name": "Union County",
        "state": "Arkansas",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Union County Arkansas El Dorado Energy Corridor and Data Center Incentive",
        "description": (
            "Union County (El Dorado, AR) anchors Arkansas's historic oil and gas "
            "production belt, hosting Murphy Oil Corporation's global headquarters "
            "and a dense cluster of petrochemical processing operations. The "
            "county's industrial electrical grid — served by Entergy Arkansas — "
            "was built to handle large industrial loads, making it well-suited "
            "for data center energy demands. Arkansas's data center sales-tax "
            "exemption (Ark. Code §26-52-437) applies to qualifying computing "
            "equipment. El Dorado's Southern Arkansas University (SAU) provides "
            "a technology workforce pipeline, and the Murphy USA corporate "
            "campus anchors high-value computing demand in the region."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Murphy Oil HQ anchor; Entergy Arkansas industrial grid; AR Code §26-52-437 exemption.",
        "sources": [
            {"label": "El Dorado Economic Development Corporation (EDCOR)", "url": "https://www.eldoradoar.gov/"},
            {"label": "Arkansas Data Center Tax Exemption §26-52-437", "url": "https://www.arkleg.state.ar.us/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "28095",
        "name": "Marshall County",
        "state": "Mississippi",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Marshall County Mississippi Memphis Metro Edge Data Center and TVA Incentive",
        "description": (
            "Marshall County (Holly Springs, MS) is a rapidly growing Memphis "
            "suburban county on the Tennessee state line, benefiting from "
            "manufacturing and logistics overflow from the Memphis metro area. "
            "The county hosts rust belt industrial redevelopment opportunities "
            "and is served by Tennessee Valley Authority (TVA) wholesale "
            "power through Marshall County Electric Power Association (MLGW). "
            "Mississippi's data center incentive program and county industrial "
            "development bonds (Miss. Code §57-1-1 et seq.) support qualifying "
            "technology facility investments. Rust College and Mississippi "
            "University for Women provide regional education anchors, and "
            "US-72 connects to the Memphis fiber gateway."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Memphis metro edge; TVA/Marshall County EPA wholesale power; MS industrial bond §57-1-1.",
        "sources": [
            {"label": "Marshall County Economic Development Authority", "url": "https://www.marshallcountyeda.com/"},
            {"label": "Mississippi Development Authority", "url": "https://www.mississippi.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "28155",
        "name": "Union County",
        "state": "Mississippi",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Union County Mississippi Toyota Manufacturing and Data Center Incentive",
        "description": (
            "Union County (New Albany/Blue Springs, MS) hosts Toyota Motor "
            "Manufacturing Mississippi (TMMMS) — Toyota's primary U.S. Corolla "
            "production facility — which opened in 2011 and employs approximately "
            "2,000 workers. TMMMS drives substantial automotive AI computing "
            "demand for production quality, supply chain optimization, and "
            "connected vehicle data processing. The county is served by "
            "Northeast Mississippi Electric Power Association (NMEPA) operating "
            "on TVA wholesale power. Mississippi's data center sales-tax "
            "exemption (Miss. Code §27-65-17) applies to qualifying equipment. "
            "New Albany's location at the US-72/MS-15 interchange provides "
            "fiber connectivity to Memphis and Birmingham technology markets."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Toyota TMMMS automotive AI; NMEPA/TVA power; Miss. Code §27-65-17 exemption.",
        "sources": [
            {"label": "Union County Economic Development Foundation", "url": "https://www.unioncountyed.com/"},
            {"label": "Mississippi Data Center Tax Exemption §27-65-17", "url": "https://www.sos.ms.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "35028",
        "name": "Los Alamos County",
        "state": "New Mexico",
        "level": -1,
        "types": ["data_center", "ai", "energy"],
        "title": "Los Alamos County New Mexico LANL Supercomputer and National Security AI Hub",
        "description": (
            "Los Alamos County hosts Los Alamos National Laboratory (LANL), "
            "the nation's premier nuclear weapons research institution and "
            "home to some of the world's most powerful supercomputers, "
            "including the Trinity system (formerly #6 globally) and the "
            "upcoming Crossroads (El Capitan-class) successor. LANL operates "
            "under the National Nuclear Security Administration (NNSA) and "
            "drives extraordinary AI/ML computing demand for stockpile "
            "stewardship, materials science, climate modeling, and national "
            "security analytics. Public Utility Company of New Mexico (PNM) "
            "serves the county with access to New Mexico's wind and solar "
            "grid. The county's unique status as an unincorporated county "
            "and LANL's federal land exemptions create a specialized "
            "regulatory environment for technology development."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "LANL Trinity/Crossroads supercomputers; NNSA nuclear weapons AI; PNM power; federal land status.",
        "sources": [
            {"label": "Los Alamos National Laboratory — Computing Programs", "url": "https://www.lanl.gov/"},
            {"label": "Los Alamos County Economic Development", "url": "https://www.losalamosnm.us/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "35011",
        "name": "Curry County",
        "state": "New Mexico",
        "level": -1,
        "types": ["data_center", "energy", "ai"],
        "title": "Curry County New Mexico Cannon AFB Wind Energy and Data Center Corridor",
        "description": (
            "Curry County (Clovis, NM) hosts Cannon Air Force Base, home to "
            "the 27th Special Operations Wing (27th SOW) — Air Force Special "
            "Operations Command's premier fixed-wing aviation unit — which "
            "operates C-130H, CV-22B, and AC-130 platforms requiring "
            "substantial intelligence, surveillance, and reconnaissance (ISR) "
            "computing. On the commercial side, Curry County sits in one of "
            "New Mexico's premier wind energy production corridors, with "
            "multiple large wind farms feeding into Xcel Energy New Mexico's "
            "grid. New Mexico's data center equipment sales-tax exemption "
            "(NMSA §7-9-54.2) and renewable energy tax credits support "
            "qualifying computing investments powered by wind energy."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Cannon AFB 27th SOW ISR computing; Xcel Energy NM wind corridor; NMSA §7-9-54.2 exemption.",
        "sources": [
            {"label": "Clovis/Curry County Economic Development Corporation", "url": "https://www.clovisnm.gov/"},
            {"label": "New Mexico Data Center Tax Exemption NMSA §7-9-54.2", "url": "https://www.nmlegis.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "54039",
        "name": "Kanawha County",
        "state": "West Virginia",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Kanawha County West Virginia Charleston Capital Data Center and Tax Incentive",
        "description": (
            "Kanawha County (Charleston, WV) is West Virginia's most populous "
            "county and state capital, hosting state government computing "
            "infrastructure and a growing technology services sector. "
            "Appalachian Power (American Electric Power subsidiary) serves "
            "the county with industrial rates competitive with neighboring "
            "states. West Virginia's data center tax incentive (WV Code "
            "§11-15-9(b)(16)) provides sales-tax exemption on qualifying "
            "computer hardware and equipment. The county's federal and "
            "state government computing demand, combined with the West "
            "Virginia University/WVURC research system, supports colocation "
            "and government-focused data center investment. The I-64/I-77 "
            "interchange in Charleston anchors the regional fiber gateway."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "WV state capital government computing; Appalachian Power/AEP; WV Code §11-15-9(b)(16).",
        "sources": [
            {"label": "Charleston Area Alliance — West Virginia Economic Development", "url": "https://www.charlestonareaalliance.com/"},
            {"label": "West Virginia Data Center Incentive WV Code §11-15-9", "url": "https://code.wvlegislature.gov/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "47119",
        "name": "Maury County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center", "ai", "energy"],
        "title": "Maury County Tennessee General Motors EV and Data Center Incentive",
        "description": (
            "Maury County (Spring Hill, TN) hosts the General Motors Spring Hill "
            "Manufacturing plant — now GM's primary Cadillac Lyriq EV production "
            "facility following a $2 billion retooling — one of the largest single "
            "manufacturing AI deployments in the Southeast. Tennessee Valley "
            "Authority (TVA) wholesale power is delivered through Middle Tennessee "
            "Electric Membership Corporation. Tennessee has no state income tax, "
            "and the Tennessee Headquarters Tax Credit (Tenn. Code Ann. §67-4-2109) "
            "alongside the data center sales-tax exemption (Tenn. Code Ann. "
            "§67-6-206) support qualifying computing facility investment. "
            "Spring Hill's explosive residential growth has also attracted "
            "technology services and logistics computing demand."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "GM Cadillac Lyriq EV plant anchor; TVA/MTEMC power; Tenn. Code §67-6-206 exemption.",
        "sources": [
            {"label": "Maury County Industrial Development Board", "url": "https://www.maurycounty-tn.gov/"},
            {"label": "Tennessee Data Center Sales Tax Exemption §67-6-206", "url": "https://www.tn.gov/revenue/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
    {
        "fips": "47165",
        "name": "Sumner County",
        "state": "Tennessee",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Sumner County Tennessee Meta Gallatin Campus and Data Center Hub",
        "description": (
            "Sumner County (Gallatin, TN) hosts Meta Platforms' Gallatin Data "
            "Center — one of Meta's largest owned data centers globally at "
            "approximately 2.5 million square feet, supporting Facebook, "
            "Instagram, WhatsApp, and AI training workloads. The campus is "
            "served by Tennessee Valley Authority (TVA) power through Nashville "
            "Electric Service (NES). Tennessee's data center sales-tax "
            "exemption (Tenn. Code Ann. §67-6-206) applies to qualifying "
            "server, storage, and networking equipment. Meta's presence "
            "has triggered a broader data center cluster in the Gallatin "
            "industrial corridor, and the county has become a designated "
            "AI infrastructure hub in the TVA service territory. No state "
            "income tax and TVA's grid modernization investment amplify "
            "Sumner County's attractiveness."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Meta Gallatin campus anchor; TVA/NES power; Tenn. Code §67-6-206 exemption; AI hub designation.",
        "sources": [
            {"label": "Sumner County Economic Development — Gallatin TN", "url": "https://www.sumnercountyedc.com/"},
            {"label": "Tennessee Valley Authority — Data Center Power Programs", "url": "https://www.tva.com/"},
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
        "id": "ai-in-008",
        "name": "Thor Industries / Forest River RV Manufacturing AI Center — Elkhart County IN",
        "operator": "Thor Industries / Forest River (Berkshire Hathaway)",
        "status": "operational",
        "county_fips": "18039",
        "notes": (
            "Elkhart County's RV manufacturing cluster — anchored by Thor Industries "
            "and Forest River — operates AI-driven design, supply chain, and "
            "telematics analytics systems supporting approximately 80% of U.S. "
            "recreational vehicle production. Computing operations span Thor's "
            "Airstream, Keystone, and Grand Design brands and Forest River's "
            "50+ subsidiary brands."
        ),
        "lon": -85.9766,
        "lat": 41.6834,
    },
    {
        "id": "ai-in-009",
        "name": "Cummins Inc. Seymour Engine Manufacturing AI Hub — Jackson County IN",
        "operator": "Cummins Inc.",
        "status": "operational",
        "county_fips": "18071",
        "notes": (
            "Cummins Inc.'s Seymour, Indiana engine manufacturing campus operates "
            "AI-based production quality control, predictive maintenance, and "
            "engine performance simulation systems for diesel and natural gas "
            "engines shipped globally. Seymour is one of Cummins' largest "
            "manufacturing facilities and a center of the company's digital "
            "manufacturing transformation."
        ),
        "lon": -85.8897,
        "lat": 38.9556,
    },
    {
        "id": "ai-nm-002",
        "name": "Los Alamos National Laboratory Trinity/Crossroads Supercomputer — Los Alamos County NM",
        "operator": "Los Alamos National Laboratory (DOE/NNSA)",
        "status": "operational",
        "county_fips": "35028",
        "notes": (
            "LANL's Trinity system (formerly ranked #6 globally at 41.5 PFLOPS) "
            "and its successor Crossroads support nuclear weapons stockpile "
            "stewardship simulation, materials science, climate modeling, and "
            "national security AI/ML workloads under the National Nuclear Security "
            "Administration. LANL is co-managed by Triad National Security LLC "
            "(Battelle/University of California/Texas A&M)."
        ),
        "lon": -106.2954,
        "lat": 35.8811,
    },
    {
        "id": "ai-nc-007",
        "name": "Johnston County Research Triangle Industrial AI Park — Johnston County NC",
        "operator": "Multiple tenants / Johnston County EDA",
        "status": "planned",
        "county_fips": "37099",
        "notes": (
            "Johnston County is developing an AI and advanced manufacturing "
            "industrial park along the US-70 corridor to capture Research "
            "Triangle Park overflow demand. Anchor tenants include distribution "
            "and light manufacturing operations supported by Duke Energy Progress "
            "industrial power. Proximity to Raleigh-Durham fiber rings makes "
            "the county attractive for edge computing and disaster recovery."
        ),
        "lon": -78.3696,
        "lat": 35.5093,
    },
    {
        "id": "ai-ms-006",
        "name": "Toyota Motor Manufacturing Mississippi (TMMMS) AI Production System — Union County MS",
        "operator": "Toyota Motor Manufacturing Mississippi",
        "status": "operational",
        "county_fips": "28155",
        "notes": (
            "Toyota's Blue Springs, Mississippi plant (TMMMS) produces the Corolla "
            "sedan and employs approximately 2,000 workers. The facility operates "
            "Toyota's Toyota Production System (TPS) AI quality inspection, "
            "supply chain analytics, and connected vehicle data processing "
            "systems, representing one of the most significant automotive AI "
            "deployments in the Deep South."
        ),
        "lon": -88.9291,
        "lat": 34.6481,
    },
    {
        "id": "ai-tn-008",
        "name": "General Motors Spring Hill Cadillac Lyriq EV AI Manufacturing — Maury County TN",
        "operator": "General Motors",
        "status": "operational",
        "county_fips": "47119",
        "notes": (
            "GM's Spring Hill Manufacturing complex was retooled with a $2 billion "
            "investment to produce the Cadillac Lyriq EV and LYRIQ-V, becoming "
            "one of the most advanced AI-enabled automotive manufacturing facilities "
            "in the U.S. The plant operates computer vision quality systems, "
            "battery management AI, and connected vehicle over-the-air update "
            "infrastructure."
        ),
        "lon": -86.9299,
        "lat": 35.7523,
    },
    {
        "id": "ai-al-004",
        "name": "Shelby County Alabama Technology Corridor — Birmingham Metro South",
        "operator": "Multiple tenants / Shelby County EDA",
        "status": "operational",
        "county_fips": "01117",
        "notes": (
            "Shelby County's US-31 and I-65 technology corridor hosts Amazon "
            "fulfillment AI robotics operations, Grandview Medical Center's "
            "clinical AI systems, and a dense cluster of professional services "
            "firms serving the Birmingham metro. The corridor benefits from "
            "Alabama Power's competitive industrial rates and the county's "
            "status as Alabama's fastest-growing community."
        ),
        "lon": -86.7999,
        "lat": 33.3773,
    },
]

for campus in new_campuses:
    if campus["id"] not in existing_cids:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        added_c += 1

raw["restrictions"] = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2, ensure_ascii=False)

with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2, ensure_ascii=False)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
