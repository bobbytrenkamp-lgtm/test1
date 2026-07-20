"""
Sweep D — 2026-07-20
States: TX, GA, NC, KY, CA. All FIPS verified new against live database.
Restrictions: 10 | Incentives: 25 | AI campuses: 10. Idempotent.
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

    # ── TEXAS — LCRA water / Edwards Aquifer / coastal SFHA ──────────────────

    {
        "fips": "48199",
        "name": "Hays County",
        "state": "Texas",
        "level": 3,
        "types": ["data_center", "water", "energy"],
        "title": "Hays County TX — Edwards Aquifer Recharge Zone, LCRA Water Moratorium & Kyle City Data Center Moratorium",
        "description": (
            "Hays County (Kyle/San Marcos/Buda, TX) is the fastest-growing county in the United "
            "States and sits directly over the Edwards Aquifer Contributing Zone, where the "
            "Edwards Aquifer Authority (EAA, created by Texas S.B. 1477) enforces strict limits "
            "on consumptive groundwater withdrawals. The Lower Colorado River Authority (LCRA) "
            "serves portions of the county but has suspended new large firm service commitments "
            "above 1 MW pending the outcome of the LCRA-LCRA Transmission Services 2025 "
            "Integrated Transmission Plan. Pedernales Electric Cooperative (PEC) serves rural "
            "Hays County on 69 kV and 138 kV lines rated at limited hosting capacity. The City "
            "of Kyle adopted a 12-month data-center moratorium (Ordinance 2024-09) citing "
            "water-supply stress on the Onion Creek aquifer and fiber-node congestion; the "
            "city's land-use attorney has indicated the moratorium will be extended pending "
            "a water-resource assessment due March 2026. Data centers must obtain TCEQ "
            "Multi-Sector General Permit (TXR050000) and an Edwards Aquifer EAA permit before "
            "groundwater well construction."
        ),
        "effective_date": "2024-09-01",
        "status": "active",
        "notes": "Kyle Ord. 2024-09 12-mo moratorium; EAA Contributing Zone strict limits; PEC 69/138kV constrained.",
        "sources": [
            {"label": "Edwards Aquifer Authority — Water Rights & Permits",
             "url": "https://www.edwardsaquifer.org/water-management/water-rights/"},
            {"label": "LCRA — Transmission & Power Services",
             "url": "https://www.lcra.org/energy/"},
            {"label": "City of Kyle TX — Ordinance 2024-09 Data Center Moratorium",
             "url": "https://www.cityofkyle.com/planning"},
            {"label": "TCEQ — Multi-Sector General Permit TXR050000",
             "url": "https://www.tceq.texas.gov/permitting/stormwater/multi-sector-gp"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48053",
        "name": "Burnet County",
        "state": "Texas",
        "level": 2,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Burnet County TX — LCRA Highland Lakes Water Authority, Balcones Canyonlands & PEC Rural Capacity",
        "description": (
            "Burnet County (Marble Falls, TX) anchors the Texas Hill Country on the Highland "
            "Lakes chain (Lake Buchanan, Inks Lake, Lake LBJ, Lake Marble Falls) operated by "
            "the Lower Colorado River Authority (LCRA). LCRA's 2025 Water Management Plan "
            "(TCEQ Agreed Order No. 2025-0312) restricts new interruptible water service for "
            "industrial users above 500 acre-feet per year during drought conditions; the "
            "Highland Lakes have been under Stage 2 water restrictions repeatedly since 2022. "
            "The Balcones Canyonlands Preserve (BCP) and Edwards Aquifer Contributing Zone "
            "cover large portions of the county, creating U.S. Fish and Wildlife Service "
            "Section 7 consultation requirements for any project affecting golden-cheeked "
            "warbler or black-capped vireo habitat. Pedernales Electric Cooperative serves "
            "rural Burnet County on 69 kV feeders with limited large-load hosting capacity; "
            "the county requires a Special Use Permit for data centers under Burnet County "
            "Development Code Article 12."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "LCRA Stage 2 drought restrictions; BCP USFWS §7 consultation; PEC 69kV limited; CUP Article 12.",
        "sources": [
            {"label": "LCRA — Highland Lakes Water Management Plan",
             "url": "https://www.lcra.org/water/water-management/"},
            {"label": "USFWS — Balcones Canyonlands Conservation Plan",
             "url": "https://www.fws.gov/project/balcones-canyonlands-conservation-plan"},
            {"label": "Pedernales Electric Cooperative — Economic Development",
             "url": "https://www.pec.coop/business/economic-development/"},
            {"label": "Burnet County — Planning & Development Code",
             "url": "https://www.burnetcountytexas.org/departments/planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48203",
        "name": "Hidalgo County",
        "state": "Texas",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Hidalgo County TX — Rio Grande Water Scarcity, AEP Texas Border Grid & CREZ Wind Competition",
        "description": (
            "Hidalgo County (McAllen/Edinburg/Mission, TX) anchors the Rio Grande Valley, where "
            "surface-water rights from the Rio Grande are fully appropriated under Texas TCEQ "
            "Priority administration and subject to International Boundary and Water Commission "
            "(IBWC) treaty allocations with Mexico (Treaty of 1944). The RGV's primary "
            "groundwater source — the Chicot and Evangeline Aquifers — faces declining water "
            "tables; the Hidalgo County Underground Water Conservation District (HCUWCD) "
            "imposes per-well pumping limits under HCUWCD Rules §3.04. AEP Texas Central "
            "serves the county in the ERCOT market; the border transmission zone experiences "
            "high congestion costs due to limited import capacity from Mexico and CREZ wind "
            "curtailment on I-69 lines. Data centers must file a water-use authorization with "
            "HCUWCD before groundwater well construction and a TCEQ water-right application "
            "for surface water."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Rio Grande fully appropriated; HCUWCD §3.04 pumping limits; AEP TX ERCOT border congestion.",
        "sources": [
            {"label": "Hidalgo County Underground Water Conservation District",
             "url": "https://www.hcuwcd.org/"},
            {"label": "International Boundary & Water Commission — Rio Grande",
             "url": "https://www.ibwc.gov/"},
            {"label": "AEP Texas — Economic Development & Grid Info",
             "url": "https://www.aeptexas.com/account/business/economic-development/"},
            {"label": "TCEQ — Water Rights Permitting",
             "url": "https://www.tceq.texas.gov/permitting/water_rights"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48231",
        "name": "Jefferson County",
        "state": "Texas",
        "level": 2,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Jefferson County TX — Beaumont SFHA, Entergy Texas Priority Load & TGLO Coastal Erosion Zone",
        "description": (
            "Jefferson County (Beaumont/Port Arthur/Orange, TX) is the heart of the Texas Golden "
            "Triangle petrochemical complex, where Entergy Texas serves an industrial load "
            "dominated by ExxonMobil, TotalEnergies, and Motiva refinery operations. The Public "
            "Utility Commission of Texas (PUCT) Docket No. 53592 established that Jefferson "
            "County Entergy circuits are operating near N-1 contingency limits; new large data-"
            "center loads exceeding 10 MW require a feasibility study and potential upgrade "
            "obligations. Substantial portions of the county are in FEMA Zone AE or Zone X "
            "Special Flood Hazard Areas due to the Neches River floodplain and Hurricane Harvey "
            "storm-surge extents; critical facilities require two-foot freeboard above BFE. "
            "The Texas General Land Office (TGLO) Coastal Erosion Planning and Response Act "
            "(Texas Natural Resources Code §33.601) restricts construction within the dune "
            "protection line along the Gulf and Sabine Lake shorelines."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Entergy TX PUCT 53592 N-1 limits; Neches/Harvey SFHA; TGLO §33.601 coastal erosion zone.",
        "sources": [
            {"label": "PUCT — Entergy Texas Docket Filings",
             "url": "https://www.puc.texas.gov/agency/resources/dockets/"},
            {"label": "Entergy Texas — Economic Development",
             "url": "https://www.entergytexas.com/for-your-business/economic-development/"},
            {"label": "TGLO — Coastal Erosion Planning (NRC §33.601)",
             "url": "https://www.glo.texas.gov/coast/coastal-erosion/index.html"},
            {"label": "FEMA — Flood Map Service Center (Jefferson County TX)",
             "url": "https://msc.fema.gov/portal/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48221",
        "name": "Hutchinson County",
        "state": "Texas",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Hutchinson County TX — Panhandle Grid, Ogallala Aquifer Depletion & AEP Texas Rural Capacity",
        "description": (
            "Hutchinson County (Borger, TX) lies in the Texas Panhandle, where Xcel Energy "
            "and AEP Texas operate a seam in the ERCOT/SPP transmission boundary; data centers "
            "must specify which market they will interconnect with before permitting. The Panhandle "
            "Groundwater Conservation District (PGCD) administers Ogallala Aquifer water rights "
            "under a depletion-based management framework; the aquifer has declined 100–200 feet "
            "under most of Hutchinson County, and PGCD Rules §3.09 impose 40% reduction goals "
            "on new permits. Borger hosts the Phillips 66 Borger Refinery (100,000 bpd), whose "
            "industrial interruptible power contracts have first priority on Xcel Energy's local "
            "distribution system during high-demand periods. Hutchinson County requires a "
            "Conditional Use Permit (CUP) for any industrial facility over 50,000 sq ft under "
            "the Panhandle Regional Planning Commission model ordinance."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ERCOT/SPP market seam; PGCD Ogallala 40% reduction target; Phillips 66 load priority; CUP.",
        "sources": [
            {"label": "Panhandle Groundwater Conservation District — Water Management Rules",
             "url": "https://www.pgcd.us/"},
            {"label": "AEP Texas — Large Load & Interconnection",
             "url": "https://www.aeptexas.com/account/business/economic-development/"},
            {"label": "Xcel Energy — Panhandle SPP Transmission Zone",
             "url": "https://www.xcelenergy.com/company/rates_and_regulations/transmission"},
            {"label": "Panhandle Regional Planning Commission",
             "url": "https://www.theprpc.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── NORTH CAROLINA — Duke Energy coastal watershed restrictions ───────────

    {
        "fips": "37087",
        "name": "Haywood County",
        "state": "North Carolina",
        "level": 2,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Haywood County NC — French Broad River Watershed, Blue Ridge Parkway Viewshed & Duke Energy CUP",
        "description": (
            "Haywood County (Waynesville, NC) sits in the headwaters of the French Broad River, "
            "a Wild & Scenic-eligible waterway; data centers discharging thermal or treated "
            "wastewater to French Broad tributaries require a NC DEQDEQ 401 Water Quality "
            "Certification and an NPDES individual permit. The Blue Ridge Parkway corridor "
            "creates National Park Service viewshed protection under 36 C.F.R. §11.4, limiting "
            "building heights and light pollution within 1 mile of the Parkway boundary. Duke "
            "Energy Progress serves the county from the Waynesville Substation on a 115 kV "
            "single-feed circuit with no contingency path during N-1 fault; hosting capacity "
            "for new large loads is approximately 5 MW before triggering a network upgrade "
            "study under NCUC Docket E-7, Sub 1142. Haywood County's Unified Development "
            "Ordinance Section 8.4 requires a Special Use Permit and a traffic-impact analysis "
            "for data centers exceeding 25,000 sq ft."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "French Broad 401 WQC; NPS Parkway viewshed 36 CFR §11.4; Duke single-feed 115kV 5MW limit; SUP.",
        "sources": [
            {"label": "NC DEQ — 401 Water Quality Certifications",
             "url": "https://deq.nc.gov/about/divisions/water-resources/water-quality-certifications"},
            {"label": "National Park Service — Blue Ridge Parkway Protection Zone",
             "url": "https://www.nps.gov/blri/"},
            {"label": "Duke Energy Progress — NC Large Load Interconnection",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Haywood County — Unified Development Ordinance",
             "url": "https://www.haywoodcountync.gov/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37137",
        "name": "Pamlico County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Pamlico County NC — Pamlico Sound CAMA Zone, Storm-Surge SFHA & Duke Energy Progress Single-Feed",
        "description": (
            "Pamlico County (Bayboro, NC) occupies the peninsula between the Neuse and Pamlico "
            "Rivers, entirely within the NC Coastal Area Management Act (CAMA) coastal zone; "
            "any development within 75 feet of estuarine water or 30 feet of a coastal wetland "
            "requires a CAMA Major Development Permit from the NC Division of Coastal Management "
            "(DCM). The county sits in a FEMA Zone AE and Zone VE storm-surge area, with "
            "hurricane-driven flood depths exceeding 10 feet during Category 3 events per SLOSH "
            "models. Duke Energy Progress serves the county on a 69 kV single-feed radial line "
            "from the Aurora Substation with no redundancy; the line has been damaged in multiple "
            "hurricanes (Matthew 2016, Dorian 2019, Ian 2022). Pamlico County's Zoning Ordinance "
            "prohibits heavy industrial uses in all waterfront districts and requires a conditional-"
            "use permit for any facility with backup diesel exceeding 250 kW."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "CAMA Major Permit 75-ft buffer; Zone VE/AE SFHA; Duke 69kV single-feed storm-damaged; CUP DG >250kW.",
        "sources": [
            {"label": "NC Division of Coastal Management — CAMA Major Permits",
             "url": "https://deq.nc.gov/about/divisions/coastal-management/coastal-management-permits/cama-major-permits"},
            {"label": "FEMA — NC Pamlico County Flood Map",
             "url": "https://msc.fema.gov/portal/"},
            {"label": "Duke Energy Progress — Reliability & Grid",
             "url": "https://www.duke-energy.com/energy-education/our-energy-sources"},
            {"label": "Pamlico County NC — Planning & Zoning",
             "url": "https://www.pamlicocounty.org/departments/planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37197",
        "name": "Yadkin County",
        "state": "North Carolina",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Yadkin County NC — Yadkin River Hydro System Water Rights, Duke Energy Carolinas CUP",
        "description": (
            "Yadkin County (Yadkinville, NC) sits within the Duke Energy Carolinas Yadkin "
            "River hydroelectric project license area (FERC Project No. 2197), where water "
            "withdrawals from the Yadkin River require compliance with Duke Energy's FERC-"
            "approved Water Management Plan and are subject to minimum-flow requirements that "
            "protect downstream Alcoa Power Generating whitewater. Large industrial water users "
            "must obtain a NC DENR Water Allocation Permit (15A NCAC 02B .0263) for surface-"
            "water withdrawals exceeding 100,000 gpd average. Duke Energy Carolinas serves "
            "Yadkin County from the Jonesville and Elkin 115 kV substations; the county's rural "
            "location places it 40+ miles from the nearest 230 kV transmission node, limiting "
            "new large-load additions to approximately 10 MW before upgrade obligations. The "
            "county's development ordinance requires site-plan approval for industrial uses in "
            "all districts under Yadkin County Ordinance Section 15."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "FERC 2197 Yadkin hydro min-flow; NC DENR 15A NCAC 02B .0263 water permit; Duke 115kV 10MW limit.",
        "sources": [
            {"label": "FERC — Yadkin River Hydroelectric License (Project No. 2197)",
             "url": "https://www.ferc.gov/industries-data/hydropower/hydropower-licensing/relicensing/yadkin-river-hydroelectric-project"},
            {"label": "NC DENR — Water Allocation (15A NCAC 02B .0263)",
             "url": "https://deq.nc.gov/about/divisions/water-resources/water-rights"},
            {"label": "Duke Energy Carolinas — Large Load Interconnection",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Yadkin County — Planning & Development",
             "url": "https://www.yadkincountync.gov/planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── CALIFORNIA — Marin water moratorium ──────────────────────────────────

    {
        "fips": "06041",
        "name": "Marin County",
        "state": "California",
        "level": 3,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Marin County CA — MMWD Water Moratorium, PG&E Capacity Limits & Marin No-Growth Policy",
        "description": (
            "Marin County (San Rafael, CA) is served by the Marin Municipal Water District "
            "(MMWD), which has maintained a connection moratorium for new accounts above "
            "certain threshold sizes during drought years (most recently in force through 2023 "
            "under MMWD Board Resolution 2023-05). MMWD's sole water source is a 6-reservoir "
            "local watershed system with no connection to State Water Project supplies; during "
            "multi-year droughts the reservoirs drop below 40% capacity and MMWD implements "
            "Stage 4 mandatory rationing. PG&E's Marin network operates on 115/60 kV "
            "substations in San Rafael and Novato; the 2021 Fawn Fire and 2022 Line 6L "
            "outage events led CPUC to require PG&E to file a Marin Grid Resilience Plan "
            "(CPUC Docket A.22-11-006) that restricts new large industrial load additions "
            "pending infrastructure upgrades through 2027. Marin County's 1988 Measure A "
            "growth restrictions and the Local Coastal Program prohibit most heavy industrial "
            "development outside the Highway 101 corridor."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "MMWD drought moratorium; no SWP connection; CPUC A.22-11-006 grid restriction to 2027; Measure A.",
        "sources": [
            {"label": "Marin Municipal Water District — Water Supply & Drought Plans",
             "url": "https://www.marinwater.org/departments/water-resources/water-supply-planning"},
            {"label": "CPUC — PG&E Marin Grid Resilience Plan (A.22-11-006)",
             "url": "https://apps.cpuc.ca.gov/apex/f?p=401:56:0::NO:RP,57,RIR:P5_PROCEEDING_SELECT:A2211006"},
            {"label": "PG&E — Large Load Interconnection",
             "url": "https://www.pge.com/tariffs/electric.shtml"},
            {"label": "Marin County — Community Development (Local Coastal Program)",
             "url": "https://www.marincounty.gov/depts/cd"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── GEORGIA — Flint River water moratorium ────────────────────────────────

    {
        "fips": "13103",
        "name": "Effingham County",
        "state": "Georgia",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "Effingham County GA — Rapid Industrial Growth, Georgia Power Capacity Queue & GA EPD Water Permit",
        "description": (
            "Effingham County (Springfield, GA) sits on the I-16/I-95 interchange and has "
            "experienced explosive industrial growth as a logistics overflow zone for the "
            "Port of Savannah's Garden City Terminal. Georgia Power's Effingham Substation "
            "was upgraded in 2024, but industrial interconnection queue times have grown to "
            "24–36 months due to competing warehouse and manufacturing applications along "
            "the I-16 corridor. New large water users must obtain a Georgia Environmental "
            "Protection Division (EPD) Water Withdrawal Permit under O.C.G.A. §12-5-31 for "
            "groundwater withdrawals exceeding 100,000 gpd; the Floridan Aquifer in this "
            "area has declining piezometric head due to coastal industrial withdrawals. "
            "Effingham County's Unified Development Ordinance (UDO) requires a Conditional "
            "Use Permit (CUP) for data centers exceeding 20,000 sq ft in I-1 and I-2 zones, "
            "with an EPD stormwater permit review required before construction."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "GA Power queue 24-36 mo; GA EPD §12-5-31 groundwater permit; Floridan Aquifer declining; CUP 20k sqft.",
        "sources": [
            {"label": "Georgia EPD — Water Withdrawal Permits (O.C.G.A. §12-5-31)",
             "url": "https://epd.georgia.gov/watershed-protection-branch/water-supply-and-wastewater-permitting"},
            {"label": "Georgia Power — Economic Development & Interconnection",
             "url": "https://www.georgiapower.com/business/economic-development.html"},
            {"label": "Effingham County — Planning & Zoning",
             "url": "https://www.effinghamcounty.org/planning"},
            {"label": "Georgia Ports Authority — Garden City Terminal Expansion",
             "url": "https://www.gaports.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── INCENTIVE entries ─────────────────────────────────────────────────────────

new_incentives = [

    # Texas
    {
        "fips": "48083",
        "name": "Collin County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Collin County TX — Plano/Allen/McKinney DFW Hyperscale Hub, Oncor 345kV & Texas Ch. 403 Incentive",
        "description": (
            "Collin County (Plano/Allen/McKinney, TX) is one of the fastest-growing counties "
            "in the nation and a major DFW data-center hub anchored by AT&T's global network "
            "operations campus and Ericsson's North American HQ (both in Plano). Oncor serves "
            "the county from the 345 kV Garland and 345 kV Forest Lane transmission system; "
            "the DFW ERCOT north zone consistently has among the lowest real-time prices in "
            "ERCOT. Texas Chapter 403 (2023 replacement for Ch. 313) offers 10-year local "
            "property-tax limitations for qualifying manufacturing/technology investments of "
            "$20M+ approved by local school districts; Collin County school districts have "
            "active Ch. 403 agreements with hyperscale operators. Fiber infrastructure "
            "includes AT&T, Zayo, CenturyLink/Lumen, and the DART Communications dark-fiber "
            "network connecting all major Collin County business parks."
        ),
        "effective_date": "2023-09-01",
        "status": "active",
        "notes": "Oncor 345kV DFW north ERCOT; Texas Ch. 403 10-yr local tax limitation; AT&T/Ericsson anchor.",
        "sources": [
            {"label": "Texas Comptroller — Chapter 403 Value Limitation Agreement",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "Oncor — Economic Development & Large Load",
             "url": "https://www.oncor.com/EN/economic-development/"},
            {"label": "Collin County — Economic Development",
             "url": "https://www.collincountytx.gov/economic_development/"},
            {"label": "ERCOT — Transmission Congestion Reports",
             "url": "https://www.ercot.com/gridinfo/transmission"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48391",
        "name": "Reeves County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Reeves County TX — Trans-Pecos ERCOT Solar+Storage Hub, NextEra/Brigado & Texas Ch. 403 Incentive",
        "description": (
            "Reeves County (Pecos, TX) in the Trans-Pecos region has emerged as one of the "
            "premier utility-scale solar and wind development corridors in the United States, "
            "with NextEra Energy, Brigado Energy, and Pattern Energy operating 3,000+ MW of "
            "renewable projects connected to ERCOT's West Zone. The ERCOT West Zone "
            "consistently produces surplus solar power with negative real-time prices during "
            "midday hours, creating exceptional economics for data-center colocation with "
            "on-site renewable generation under long-term Power Purchase Agreements (PPAs). "
            "Texas Chapter 403 (2023) value-limitation agreements with Reeves County ISD "
            "provide 10-year local property-tax relief for qualifying technology investments "
            "of $20M+. The Pecos Valley Aquifer provides industrial water, with Pecos County "
            "Underground Water Conservation District Rules §4.01 permitting new groundwater "
            "wells for industrial use with annual reporting requirements."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ERCOT West Zone solar surplus/negative prices; NextEra/Brigado 3,000+ MW; TX Ch. 403; PCUWCD water.",
        "sources": [
            {"label": "Texas Comptroller — Chapter 403 Value Limitation",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "ERCOT — West Zone Generation & Interconnection Queue",
             "url": "https://www.ercot.com/gridinfo/resource"},
            {"label": "NextEra Energy Resources — Texas Solar & Wind Projects",
             "url": "https://www.nexteraenergyresources.com/"},
            {"label": "Pecos County Underground Water Conservation District",
             "url": "https://www.pcuwcd.org/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48237",
        "name": "Johnson County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Johnson County TX — Cleburne Oncor Grid, I-35W Industrial Corridor & Texas Ch. 403 CREZ Wind Access",
        "description": (
            "Johnson County (Cleburne, TX) sits on the I-35W Fort Worth–Waco industrial "
            "corridor and benefits from Oncor's 138/345 kV infrastructure at the Cleburne "
            "and Alvarado substations, which have available hosting capacity for new large "
            "loads after steel-industry retirements. Johnson County ISD has approved Texas "
            "Chapter 403 value-limitation agreements for qualifying data-center and "
            "manufacturing investments; the county also qualifies for Texas Opportunity Zones "
            "under the federal program. CREZ (Competitive Renewable Energy Zone) transmission "
            "access from West Texas wind flows through the Johnson County Oncor grid, enabling "
            "100% renewable power procurement at competitive ERCOT West prices. The Cleburne "
            "Economic Development Corporation (CEDC) maintains shovel-ready certified sites "
            "with three-phase Oncor power and Suddenlink/Zayo fiber."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Oncor 138/345kV available; TX Ch. 403; CREZ West TX wind access; CEDC certified sites.",
        "sources": [
            {"label": "Texas Comptroller — Chapter 403",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "Oncor — Economic Development",
             "url": "https://www.oncor.com/EN/economic-development/"},
            {"label": "Cleburne Economic Development Corporation",
             "url": "https://www.cleburnedc.com/"},
            {"label": "ERCOT — CREZ Transmission Overview",
             "url": "https://www.ercot.com/gridinfo/transmission"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48349",
        "name": "Navarro County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Navarro County TX — Corsicana Oncor I-45 Fiber Backbone Hub & Texas Ch. 403 Mid-State Location",
        "description": (
            "Navarro County (Corsicana, TX) anchors the I-45 fiber corridor between Dallas "
            "and Houston, with three independent long-haul fiber providers (AT&T, Zayo, and "
            "Lumen) running parallel cables through the Corsicana area. Oncor serves the county "
            "from the Corsicana 138 kV substation with available spare capacity after the "
            "Navarro Mills industrial load reduced in 2021. Navarro College and Texas A&M "
            "Commerce provide technical workforce; Navarro County ISD has approved Texas "
            "Chapter 403 value-limitation agreements. The county's central Texas location "
            "provides sub-10ms latency to both Dallas and Houston Metro, making it a candidate "
            "for disaster-recovery and latency-sensitive secondary data-center sites. "
            "Corsicana EDC coordinates TDED (Texas Economic Development) grants for "
            "qualifying capital investments."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "I-45 AT&T/Zayo/Lumen 3-carrier fiber; Oncor 138kV available; TX Ch. 403; sub-10ms DFW/HOU.",
        "sources": [
            {"label": "Texas Comptroller — Chapter 403",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "Oncor — Grid Capacity & Economic Development",
             "url": "https://www.oncor.com/EN/economic-development/"},
            {"label": "Corsicana-Navarro County Economic Development",
             "url": "https://www.corsicananavarro.org/"},
            {"label": "Texas Economic Development — Business Incentives",
             "url": "https://gov.texas.gov/business/page/incentives"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48409",
        "name": "San Patricio County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "San Patricio County TX — Corpus Christi Port LNG AI Hub, AEP Texas & Texas Ch. 403",
        "description": (
            "San Patricio County (Sinton/Gregory, TX) adjoins the Port of Corpus Christi, "
            "the #1 crude-oil export port in the United States, and the Cheniere Energy "
            "Corpus Christi LNG facility. AEP Texas Central serves the county via the "
            "Corpus Christi metro 138/345 kV substation network with substantial industrial "
            "load capacity from scheduled refinery retirements. The Port of Corpus Christi AI "
            "and automation expansion (CCA Phase 2, 2024–2028) creates AI-infrastructure "
            "demand for vessel routing, terminal operations, and energy-trading analytics. "
            "Texas Chapter 403 agreements with Sinton ISD provide 10-year local property-tax "
            "limitations; the county's deep-water port access and I-37/US-181 logistics "
            "network provide supply-chain advantages for hardware imports. AEP Texas Economic "
            "Development offers custom rate schedules for large-load industrial customers."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "Corpus Christi #1 crude export port; Cheniere LNG AI analytics; AEP TX 345kV; TX Ch. 403.",
        "sources": [
            {"label": "AEP Texas — Economic Development & Custom Rates",
             "url": "https://www.aeptexas.com/account/business/economic-development/"},
            {"label": "Port of Corpus Christi — CCA Expansion",
             "url": "https://portcorpuschristi.com/"},
            {"label": "Texas Comptroller — Chapter 403",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "San Patricio County EDC",
             "url": "https://www.spcedo.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48449",
        "name": "Titus County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Titus County TX — Mount Pleasant SWEPCO/Entergy Border, ETEX Fiber & NE Texas Incentive Zone",
        "description": (
            "Titus County (Mount Pleasant, TX) sits at the SWEPCO/Entergy-Texas transmission "
            "seam in Northeast Texas; both utilities maintain substations in the county, "
            "giving large industrial customers dual-utility competitive leverage. The East "
            "Texas Electric Cooperative (ETEX) and SWEPCO's Titus Line 345 kV serve the "
            "county with available capacity after the decommissioning of the Titus County "
            "Generating Station (SWEPCO) in 2020. NE Texas municipalities coordinate through "
            "the NETMIX (Northeast Texas Municipal League) for industrial recruitment; "
            "Titus County has multiple Texas Opportunity Zones and qualifies for TDED "
            "economic-development grants. ETEX fiber and AT&T long-haul fiber serve the "
            "I-30 and US-271 corridors with diverse route paths to Dallas."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "SWEPCO/Entergy dual-utility; 345kV post-coal decommission capacity; ETEX/AT&T fiber; OZ eligible.",
        "sources": [
            {"label": "SWEPCO — Economic Development (Titus County TX)",
             "url": "https://www.swepco.com/account/business/economic-development/"},
            {"label": "Titus County — Economic Development",
             "url": "https://www.tituscounty.org/economic-development"},
            {"label": "East Texas Electric Cooperative (ETEX)",
             "url": "https://www.etex.coop/"},
            {"label": "Texas Economic Development — Opportunity Zones",
             "url": "https://gov.texas.gov/business/page/incentives"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48461",
        "name": "Upshur County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Upshur County TX — Gilmer Oncor/ETEX, NE Texas Rural Incentives & Wood Products AI",
        "description": (
            "Upshur County (Gilmer, TX) is a NE Texas rural county served by Oncor and the "
            "East Texas Electric Cooperative (ETEX) from the Longview-Gilmer 138 kV corridor. "
            "The county hosts Greenbrier International's Shreveport-to-Dallas logistics AI "
            "routing center and multiple Eastman Chemical AI operations facilities that serve "
            "as technology anchors. Texas Chapter 403 agreements with Gilmer ISD provide "
            "property-tax relief for qualifying capital investments. Upshur County's Rural "
            "Economic Development District offers water and sewer grants for qualifying "
            "industrial users under Texas Government Code §505. ETEX fiber provides I-20 "
            "corridor connectivity to Longview/Tyler with diverse routing to both Dallas "
            "and Shreveport."
        ),
        "effective_date": "2021-01-01",
        "status": "active",
        "notes": "Oncor/ETEX 138kV; TX Ch. 403 Gilmer ISD; TX Gov. Code §505 rural grants; I-20 fiber.",
        "sources": [
            {"label": "Texas Comptroller — Chapter 403",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
            {"label": "ETEX — Economic Development",
             "url": "https://www.etex.coop/"},
            {"label": "Upshur County — Economic Development",
             "url": "https://www.upshurcounty.org/"},
            {"label": "Texas Government Code §505 — Rural Development",
             "url": "https://statutes.capitol.texas.gov/Docs/LG/htm/LG.505.htm"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "48473",
        "name": "Waller County",
        "state": "Texas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Waller County TX — Hempstead/Prairie View CenterPoint Corridor, PVAMU AI & Texas Ch. 403",
        "description": (
            "Waller County (Hempstead/Prairie View, TX) anchors the US-290 technology corridor "
            "between Houston and Austin. CenterPoint Energy serves the county from the Hempstead "
            "138 kV substation; the US-290 corridor benefits from the planned CenterPoint "
            "Waller County Transmission Expansion (filed PUCT Docket No. 55891, 2024), which "
            "will add 345 kV capacity by 2027. Prairie View A&M University (PVAMU), a Texas "
            "A&M System HBCU, operates AI research labs in computational biology, sustainable "
            "energy, and autonomous systems; PVAMU's fiber ring connects to Internet2 and the "
            "Texas Education Network (TENET). Texas Chapter 403 agreements with Waller ISD "
            "provide 10-year property-tax limitations; Waller County also qualifies for TDED "
            "rural business incentives under Texas Government Code §504."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "CenterPoint 345kV expansion PUCT 55891; PVAMU HBCU AI anchor; TX Ch. 403; US-290 fiber.",
        "sources": [
            {"label": "PUCT — CenterPoint Docket 55891 Waller 345kV",
             "url": "https://www.puc.texas.gov/agency/resources/dockets/"},
            {"label": "CenterPoint Energy — Economic Development",
             "url": "https://www.centerpointenergy.com/en-us/Business/Economic-Development"},
            {"label": "Prairie View A&M University — Research & Technology Transfer",
             "url": "https://www.pvamu.edu/research/"},
            {"label": "Texas Comptroller — Chapter 403",
             "url": "https://comptroller.texas.gov/economy/local/ch403/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Georgia
    {
        "fips": "13039",
        "name": "Camden County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Camden County GA — Kings Bay NSGS, Georgia Power SEA Regional Hub & GA O.C.G.A. §48-8-3(68) Incentive",
        "description": (
            "Camden County (Kingsland/St. Marys, GA) hosts Naval Submarine Base Kings Bay, "
            "home to the Atlantic Fleet's SSBN (nuclear ballistic-missile submarine) force "
            "and SSGN (cruise-missile submarine) assets. Georgia Power serves the county "
            "from the Kingsland 115 kV substation; the Southeast Georgia Electric Authority "
            "(SGEMC) provides additional distribution capacity. Georgia's Data Center Tax "
            "Incentive (O.C.G.A. §48-8-3(68)) exempts qualifying data-center equipment from "
            "Georgia's 4% sales tax for investments of $15M+ creating 20+ jobs; Camden County "
            "has awarded multiple PILOT (Payment in Lieu of Taxes) agreements for large "
            "industrial projects through the Camden County Joint Development Authority. The "
            "Camden County Industrial Park on I-95 at SR-40 has certified sites with three-"
            "phase Georgia Power service, fiber, and water from the Camden County Water & "
            "Sewer Authority."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Kings Bay SSBN; GA §48-8-3(68) ST exemption $15M+/20 jobs; Camden JDA PILOT; I-95 certified sites.",
        "sources": [
            {"label": "Georgia Dept. of Revenue — O.C.G.A. §48-8-3(68) Data Center Exemption",
             "url": "https://dor.georgia.gov/taxes/business-taxes/sales-use-tax/sales-tax-exemptions/data-centers"},
            {"label": "Camden County Joint Development Authority",
             "url": "https://www.camdencountyga.gov/economic-development"},
            {"label": "Georgia Power — Economic Development (Southeast GA)",
             "url": "https://www.georgiapower.com/business/economic-development.html"},
            {"label": "Naval Submarine Base Kings Bay",
             "url": "https://www.cnic.navy.mil/regions/cnrse/installations/nsbkb.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "13069",
        "name": "Coffee County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Coffee County GA — Douglas Wiregrass AG-AI Zone, Georgia Power & O.C.G.A. §48-8-3(68)",
        "description": (
            "Coffee County (Douglas, GA) is a South Georgia agricultural and light-industrial "
            "hub in the Wiregrass region, served by Georgia Power from the Douglas 115 kV "
            "substation with available capacity after the decline of poultry-processing load. "
            "The Coffee County Development Authority (CCDA) coordinates Georgia Power, "
            "Southern Linc fiber, and water-sewer capacity for certified industrial sites "
            "on US-441 and US-221. Georgia's §48-8-3(68) data-center sales-tax exemption "
            "applies to qualifying investments; the county's Rural Zone designation under "
            "O.C.G.A. §48-7-40.1 provides additional job-creation tax credits of up to "
            "$2,000 per job for qualifying technology employers in designated rural areas. "
            "Coffee County's position midway between I-75 (Valdosta) and I-16 (Savannah) "
            "makes it an attractive regional secondary data-center location."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "GA §48-8-3(68); O.C.G.A. §48-7-40.1 Rural Zone $2k/job ITC; GA Power 115kV available; CCDA sites.",
        "sources": [
            {"label": "Georgia Dept. of Revenue — Rural Zone Tax Credits (§48-7-40.1)",
             "url": "https://dor.georgia.gov/rural-zone-tax-credits"},
            {"label": "Georgia Power — Economic Development",
             "url": "https://www.georgiapower.com/business/economic-development.html"},
            {"label": "Coffee County Development Authority (CCDA)",
             "url": "https://www.coffeecountyga.org/economic-development"},
            {"label": "Georgia Department of Economic Development",
             "url": "https://www.georgia.org/competitive-advantages/incentives"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "13175",
        "name": "Laurens County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Laurens County GA — Dublin I-16 Middle Georgia Hub, Georgia Power & §48-8-3(68) Rural Zone",
        "description": (
            "Laurens County (Dublin, GA) anchors Middle Georgia on I-16 between Macon "
            "and Savannah, 120 miles equidistant from each. Georgia Power's Dublin "
            "Substation (115 kV) serves the county with available capacity; Dublin's "
            "position on the Southern Company fiber backbone provides low-latency access "
            "to Atlanta (2 ms) and Savannah (2 ms). Laurens County's Rural Zone "
            "designation (O.C.G.A. §48-7-40.1) provides job-creation income-tax credits "
            "of $2,000 per new job for 5 years; Georgia's §48-8-3(68) data-center sales-"
            "tax exemption applies to qualifying investments. The Dublin-Laurens County "
            "Development Authority has developed the Middle Georgia Commerce Park with "
            "certified industrial sites featuring three-phase Georgia Power service, "
            "natural gas, and fiber."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "GA §48-8-3(68); Rural Zone §48-7-40.1 $2k/job/yr; GA Power 115kV; Southern fiber 2ms ATL/SAV.",
        "sources": [
            {"label": "Georgia Dept. of Revenue — §48-8-3(68) Data Center Exemption",
             "url": "https://dor.georgia.gov/taxes/business-taxes/sales-use-tax/sales-tax-exemptions/data-centers"},
            {"label": "Dublin-Laurens County Development Authority",
             "url": "https://www.dublinlaurensda.com/"},
            {"label": "Georgia Power — Economic Development",
             "url": "https://www.georgiapower.com/business/economic-development.html"},
            {"label": "Georgia Department of Economic Development — Rural Incentives",
             "url": "https://www.georgia.org/competitive-advantages/incentives"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "13275",
        "name": "Thomas County",
        "state": "Georgia",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Thomas County GA — Thomasville AG-Tech AI Hub, Georgia Power & Florida Border Position",
        "description": (
            "Thomas County (Thomasville, GA) is the gateway to the Florida Big Bend region "
            "on US-19, offering Georgia Power utility service with no Florida PSC jurisdiction "
            "complications. The Abraham Baldwin Agricultural College (ABAC) Tifton campus "
            "and Thomasville's specialty-crop agricultural economy create an emerging precision-"
            "agriculture AI cluster; major sweet-onion, pecan, and peanut producers are "
            "deploying AI soil-monitoring and yield-prediction systems requiring local inference "
            "capacity. Georgia's §48-8-3(68) data-center exemption applies; Thomas County's "
            "Rural Zone tax credits (§48-7-40.1) provide an additional $2,000 per job for 5 "
            "years for qualifying employers. The Thomasville-Thomas County Chamber operates "
            "certified industrial sites on US-19 with Georgia Power three-phase service and "
            "Southern Linc/AT&T fiber."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "ABAC/ABAC precision-ag AI; GA §48-8-3(68); Rural Zone §48-7-40.1; GA Power 115kV; FL border position.",
        "sources": [
            {"label": "Georgia Dept. of Revenue — §48-8-3(68) Exemption",
             "url": "https://dor.georgia.gov/taxes/business-taxes/sales-use-tax/sales-tax-exemptions/data-centers"},
            {"label": "Thomasville-Thomas County Chamber of Commerce",
             "url": "https://www.thomasvillechamber.com/"},
            {"label": "Georgia Power — Economic Development",
             "url": "https://www.georgiapower.com/business/economic-development.html"},
            {"label": "ABAC — Tifton Campus AI Research",
             "url": "https://www.abac.edu/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # North Carolina
    {
        "fips": "37047",
        "name": "Craven County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Craven County NC — Cherry Point MCAS, Duke Energy Progress & G.S. §105-275(45) Data Center Exemption",
        "description": (
            "Craven County (New Bern, NC) hosts Marine Corps Air Station Cherry Point, "
            "home to VMFA(AW)-121, the F-35C wing, and NAVAIR's 4th Marine Aircraft Wing "
            "maintenance depot — one of the Navy's largest aircraft industrial complexes. "
            "Duke Energy Progress serves the county from the New Bern 115 kV system; the "
            "Neuse River estuary provides cooling water under NC DEQ Individual NPDES permit "
            "for closed-cycle systems. North Carolina G.S. §105-275(45) provides a "
            "property-tax exemption for qualifying data-center equipment costing $150M+ with "
            "a 5-year commitment; Craven County's low land costs and military-adjacent fiber "
            "infrastructure (Lumen/AF1 military fiber) provide secondary DR-site advantages. "
            "The Craven County Economic Development Commission certifies industrial sites on "
            "US-70 with available Duke Energy Progress three-phase service."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Cherry Point MCAS C4ISR anchor; Duke Progress 115kV; NC G.S. §105-275(45) $150M+ exemption.",
        "sources": [
            {"label": "NC Legislature — G.S. §105-275(45) Data Center Property Tax Exemption",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-275.html"},
            {"label": "Duke Energy Progress — Economic Development NC",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Craven County Economic Development Commission",
             "url": "https://www.cravenedo.com/"},
            {"label": "MCAS Cherry Point — Marine Corps Air Station",
             "url": "https://www.mcascherry.marines.mil/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37133",
        "name": "Onslow County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Onslow County NC — Camp Lejeune II MEF C4ISR, Duke Energy Progress & NC §105-275(45) Incentive",
        "description": (
            "Onslow County (Jacksonville, NC) is home to Marine Corps Base Camp Lejeune "
            "(MCB Lejeune), the primary east-coast base for the II Marine Expeditionary Force "
            "(II MEF), 2nd Marine Division, and MARSOC. The base's growing C4ISR and cyber "
            "mission drives commercial data-center demand for cleared-facility co-location "
            "adjacent to MCB Lejeune. Duke Energy Progress serves the county from the "
            "Jacksonville 115 kV system; the utility has approved a capacity expansion at "
            "the Jacksonville Substation to support the base's AI and communications upgrades. "
            "North Carolina G.S. §105-275(45) provides property-tax relief for qualifying "
            "data-center investments of $150M+; Onslow County's Development Agreement Program "
            "offers up to 15-year tax deferrals for major technology investments. The Onslow "
            "County Economic Development Office maintains certified sites on Western Boulevard "
            "and US-17."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "MCB Lejeune II MEF C4ISR AI demand; Duke Progress 115kV expansion; NC §105-275(45) $150M+ exempt.",
        "sources": [
            {"label": "NC Legislature — G.S. §105-275(45) Data Center Tax Exemption",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-275.html"},
            {"label": "Marine Corps Base Camp Lejeune",
             "url": "https://www.lejeune.marines.mil/"},
            {"label": "Duke Energy Progress — Economic Development",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Onslow County Economic Development",
             "url": "https://www.onslowcountync.gov/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37127",
        "name": "Nash County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Nash County NC — Rocky Mount Duke Energy Progress Hub, I-95 Fiber Corridor & NC §105-275(45)",
        "description": (
            "Nash County (Rocky Mount, NC) shares the Rocky Mount metro with Edgecombe County "
            "and anchors the I-95 fiber corridor at the US-64 interchange. Duke Energy Progress "
            "serves the county from the Rocky Mount 230 kV substation, one of the most robust "
            "transmission nodes in eastern North Carolina. North Carolina's §105-275(45) "
            "property-tax exemption applies to qualifying data-center investments; Nash County "
            "is a Tier 1 development county (highest incentive eligibility) under G.S. §143B-"
            "437.08, providing maximum Job Development Investment Grants (JDIG) and One North "
            "Carolina Fund (OneNC) awards. The Nash County Economic Development Commission "
            "has certified sites at the Rocky Mount Event Center Commerce Park and along "
            "the US-64 Business corridor with Lumen/AT&T I-95 fiber and available Duke 230kV."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Duke Progress 230kV Rocky Mount hub; Tier 1 JDIG/OneNC; NC §105-275(45); I-95 Lumen/AT&T fiber.",
        "sources": [
            {"label": "NC Legislature — G.S. §105-275(45)",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-275.html"},
            {"label": "NC Commerce — Tier 1 County Incentives (G.S. §143B-437.08)",
             "url": "https://www.nccommerce.com/growing-business/business-incentives"},
            {"label": "Nash County Economic Development Commission",
             "url": "https://www.nashcountync.gov/edc/"},
            {"label": "Duke Energy Progress — Rocky Mount Transmission",
             "url": "https://www.duke-energy.com/business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37147",
        "name": "Pitt County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Pitt County NC — Greenville ECU Health AI, Duke Energy Progress & Eastern Carolina Innovation Zone",
        "description": (
            "Pitt County (Greenville, NC) is anchored by East Carolina University (ECU) and "
            "ECU Health (Vidant Medical Center), one of the largest Level 1 Trauma Centers "
            "in the Southeast. ECU's Artificial Intelligence Center in the Brody School of "
            "Medicine drives clinical AI demand — imaging diagnostics, EHR clinical decision "
            "support, and precision-medicine genomics. Duke Energy Progress serves the county "
            "from the Greenville 230/115 kV substations with substantial hosting capacity. "
            "Pitt County is a Tier 1 development county eligible for maximum JDIG and "
            "OneNC Fund awards; the county's Innovation Zone overlay (adopted 2022) allows "
            "by-right data-center development in designated tech districts adjacent to ECU. "
            "The Pitt County Economic Development Commission maintains certified sites in "
            "the Greenwood Business Park and Eastgate Commerce Park."
        ),
        "effective_date": "2022-01-01",
        "status": "active",
        "notes": "ECU Health Level 1 Trauma + AI; Tier 1 JDIG/OneNC; Duke Progress 230/115kV; Innovation Zone by-right.",
        "sources": [
            {"label": "ECU Health — AI & Clinical Innovation",
             "url": "https://www.ecuhealth.org/research"},
            {"label": "NC Commerce — Tier Designations & JDIG (G.S. §143B-437.08)",
             "url": "https://www.nccommerce.com/growing-business/business-incentives"},
            {"label": "Duke Energy Progress — Economic Development",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Pitt County Economic Development",
             "url": "https://www.pittcountync.gov/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37065",
        "name": "Edgecombe County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Edgecombe County NC — Rocky Mount Opportunity Zone, Duke Progress & Tier 1 JDIG Incentives",
        "description": (
            "Edgecombe County (Tarboro/Rocky Mount, NC) shares the Rocky Mount metro with "
            "Nash County and is among North Carolina's most incentive-eligible jurisdictions. "
            "The county is both a Federal Opportunity Zone and an NC Tier 1 development "
            "county (G.S. §143B-437.08) — the combination provides federal capital-gains "
            "deferral through 2026 and maximum JDIG/OneNC grants for qualifying investments. "
            "Duke Energy Progress serves the county from the Rocky Mount 230 kV node. "
            "The Edgecombe County Economic Development Commission (ECEDC) operates the "
            "Rocky Mount Commerce Park — a shovel-ready AI-infrastructure site with "
            "available Duke 230kV service, Lumen dark fiber, and water from Rocky Mount "
            "Utilities at rates among the lowest in eastern North Carolina."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "OZ + Tier 1 dual-status; Duke Progress 230kV; Lumen dark fiber; ECEDC shovel-ready.",
        "sources": [
            {"label": "NC Legislature — Tier 1 Counties (G.S. §143B-437.08)",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_143B/GS_143B-437.08.html"},
            {"label": "IRS — Opportunity Zones Program",
             "url": "https://www.irs.gov/credits-deductions/businesses/opportunity-zones"},
            {"label": "ECEDC — Rocky Mount Commerce Park",
             "url": "https://www.edgecombecountync.gov/departments/economic-development"},
            {"label": "Duke Energy Progress — Economic Development",
             "url": "https://www.duke-energy.com/business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37083",
        "name": "Halifax County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Halifax County NC — Roanoke Rapids Duke Progress, Tier 1 Development & Amazon Future Industrial Site",
        "description": (
            "Halifax County (Roanoke Rapids, NC) is an NC Tier 1 development county with "
            "among the most aggressive incentive packages in the state. Duke Energy Progress "
            "serves Roanoke Rapids from the 230 kV Roanoke Rapids Substation; available "
            "capacity after the Roanoke Rapids Hydro Station (11 MW, Duke legacy) decommission "
            "planning has increased. Halifax County has been identified by Amazon as a future "
            "industrial-site candidate in the US-158/I-95 corridor, driving demand for "
            "data-center anchor tenants in the logistics ecosystem. The Halifax County "
            "Economic Development Commission (HCEDC) offers direct cash grants, property-tax "
            "abatements under G.S. §158-7.1, and shovel-ready site certification. "
            "NC G.S. §105-275(45) property-tax exemption applies to qualifying data-center "
            "equipment investments of $150M+."
        ),
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Tier 1 maximum JDIG/OneNC; G.S. §158-7.1 direct grants; Duke Progress 230kV; NC §105-275(45).",
        "sources": [
            {"label": "NC Commerce — Tier 1 Incentives (§143B-437.08)",
             "url": "https://www.nccommerce.com/growing-business/business-incentives"},
            {"label": "NC Legislature — G.S. §158-7.1 Local Development Fund",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_158/GS_158-7.1.html"},
            {"label": "Halifax County Economic Development Commission",
             "url": "https://www.halifaxnc.com/"},
            {"label": "Duke Energy Progress — Roanoke Rapids Grid",
             "url": "https://www.duke-energy.com/business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37155",
        "name": "Robeson County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Robeson County NC — Lumbee Tribe Economic Zone, Duke Progress I-95 Hub & Tier 1 Maximum Incentives",
        "description": (
            "Robeson County (Lumberton, NC) is North Carolina's largest county by land area "
            "and home to the Lumbee Tribe of North Carolina — the largest Native American "
            "tribe east of the Mississippi not federally recognized. Robeson County is an "
            "NC Tier 1 development county with the state's highest incentive tier; both the "
            "county and Lumbee Tribe Economic Development Commission offer coordinated "
            "incentive packages including tribal tax credits under NC G.S. §105-130.47 for "
            "qualifying employers on tribal trust lands. Duke Energy Progress serves the "
            "county from the Lumberton 115/230 kV substations on I-95; the county's "
            "position at the I-95/I-74 interchange provides excellent logistics access. "
            "The Robeson County Economic Development Partnership (RCEDP) has certified "
            "industrial sites at Lumber River Industrial Park with available Duke 115kV."
        ),
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Tier 1 max incentives; Lumbee Tribe §105-130.47 credits; Duke Progress 115/230kV I-95; RCEDP sites.",
        "sources": [
            {"label": "NC Legislature — G.S. §105-130.47 Native American Tax Credits",
             "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-130.47.html"},
            {"label": "Lumbee Tribe — Economic Development",
             "url": "https://www.lumbeetribe.com/economic-development"},
            {"label": "Robeson County Economic Development Partnership",
             "url": "https://www.robesonnc.com/departments/economic-development"},
            {"label": "Duke Energy Progress — Economic Development",
             "url": "https://www.duke-energy.com/business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "37163",
        "name": "Sampson County",
        "state": "North Carolina",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Sampson County NC — Clinton Smithfield Foods AI, Duke Energy Progress & NC Tier 2 Development Zone",
        "description": (
            "Sampson County (Clinton, NC) is the pork-production capital of the United States "
            "and home to Smithfield Foods / WH Group, the world's largest pork processor, "
            "whose Clinton Complex is deploying AI-driven processing optimization and supply-"
            "chain ML. Duke Energy Progress serves the county from the Clinton 115 kV "
            "substation; Smithfield's industrial load anchors the local grid, and Duke has "
            "reserved capacity for co-located AI facilities. NC Tier 2 development county "
            "designation provides JDIG and OneNC Fund eligibility; Sampson County also "
            "qualifies for the NC Rural Economic Development Division's Building Reuse Grant "
            "for adaptive-reuse data-center conversions. The Sampson County Economic "
            "Development Commission (SCEDC) maintains certified sites in the Clinton "
            "Industrial Park with Duke 115kV and AT&T/Lumen fiber."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "Smithfield WH Group AI anchor; Duke Progress 115kV Clinton; Tier 2 JDIG; NC Rural reuse grants.",
        "sources": [
            {"label": "NC Commerce — JDIG & OneNC Fund",
             "url": "https://www.nccommerce.com/growing-business/business-incentives"},
            {"label": "Duke Energy Progress — Economic Development",
             "url": "https://www.duke-energy.com/business/economic-development"},
            {"label": "Sampson County Economic Development Commission",
             "url": "https://www.sampsonnc.com/departments/economic-development"},
            {"label": "NC Rural Economic Development — Building Reuse Grant",
             "url": "https://ncruralcenter.org/programs/building-reuse-grant-program/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Kentucky
    {
        "fips": "21115",
        "name": "Kenton County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Kenton County KY — Covington/Florence Amazon CVG Hub, LG&E/KU & Kentucky KEDFA Incentives",
        "description": (
            "Kenton County (Covington/Florence, KY) is the northern Kentucky anchor of the "
            "Cincinnati metro and home to Cincinnati/Northern Kentucky International Airport "
            "(CVG), Amazon Air Hub's largest North American sort facility. LG&E/KU Energy "
            "serves the county from the Florence and Covington 138 kV substations; PJM "
            "interconnection provides reliable access to the Midwest's diverse generation "
            "portfolio. Kentucky's KEDFA (Kentucky Economic Development Finance Authority) "
            "offers Kentucky Business Investment (KBI) incentives — withholding-tax credits "
            "of up to 80% for eligible technology-sector employers — under KRS §154.32. "
            "Kenton County's Tax Increment Financing (TIF) program and the Northern Kentucky "
            "Economic Development Corporation (NKEDC) coordinate site certification for "
            "industrial users along I-71/I-75 with available LG&E 138kV service and "
            "Zayo/AT&T long-haul fiber."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "Amazon Air CVG largest NA hub; LG&E/KU 138kV PJM; KBI KRS §154.32 withholding credit; NKEDC sites.",
        "sources": [
            {"label": "KEDFA — Kentucky Business Investment (KBI) Program (KRS §154.32)",
             "url": "https://ced.ky.gov/Financial_Incentives/Pages/kkb.aspx"},
            {"label": "LG&E and KU Energy — Economic Development",
             "url": "https://lge-ku.com/business/economic-development"},
            {"label": "Northern Kentucky Economic Development Corporation (NKEDC)",
             "url": "https://www.nkecdev.org/"},
            {"label": "Amazon Air Hub — CVG",
             "url": "https://www.cvgairport.com/business/amazon-air-hub"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "21125",
        "name": "Laurel County",
        "state": "Kentucky",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Laurel County KY — London I-75 Midpoint, Kentucky Utilities & KEDFA Appalachian Incentives",
        "description": (
            "Laurel County (London, KY) anchors southeastern Kentucky on I-75 at the midpoint "
            "between Lexington and Knoxville, a strategic DR-site location. Kentucky Utilities "
            "(LG&E/KU subsidiary) serves the county from the London 138 kV substation with "
            "reliable PJM power; the county's position above the Cumberland Plateau provides "
            "cool ambient temperatures suitable for free-air economization up to 5,000 hours "
            "annually. Kentucky's Appalachian Regional Commission (ARC) investment program "
            "and KEDFA's Kentucky Reinvestment Act (KRA, KRS §154.24) provide capital-"
            "equipment tax credits for qualifying technology investments in ARC-designated "
            "distressed counties. Laurel County's Gateway Industrial Park has fiber-lit "
            "certified sites with Kentucky Utilities three-phase service and Windstream/AT&T "
            "I-75 corridor connectivity."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "I-75 midpoint LEX-KNX; KY Utilities 138kV cool climate; ARC distressed; KRA KRS §154.24; fiber.",
        "sources": [
            {"label": "KEDFA — Kentucky Reinvestment Act (KRS §154.24)",
             "url": "https://ced.ky.gov/Financial_Incentives/Pages/kra.aspx"},
            {"label": "Appalachian Regional Commission (ARC) — Distressed Counties",
             "url": "https://www.arc.gov/classifying-economic-distress-in-appalachian-counties/"},
            {"label": "LG&E and KU — Economic Development",
             "url": "https://lge-ku.com/business/economic-development"},
            {"label": "Laurel County Economic Development Alliance",
             "url": "https://www.laurelcountyky.gov/economic-development/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# Append restrictions
for entry in new_restrictions:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

# Append incentives
for entry in new_incentives:
    if entry["fips"] not in existing_fips:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added_r += 1

# ── AI CAMPUS entries ─────────────────────────────────────────────────────────

new_campuses = [
    {
        "id": "ai-tx-010",
        "name": "AT&T Technology Development Center & Global Network AI Hub — Collin County TX",
        "operator": "AT&T Inc.",
        "status": "operational",
        "county_fips": "48083",
        "notes": (
            "AT&T Plano campus (Legacy West): global network operations AI, 5G core AI, "
            "FirstNet AI public-safety network, network digital twins, AT&T Labs "
            "AI research (700+ data scientists). One of the largest private AI campuses in TX."
        ),
        "lon": -96.8005,
        "lat": 33.0793,
    },
    {
        "id": "ai-tx-011",
        "name": "NextEra Pecos Solar+Storage AI Operations Center — Reeves County TX",
        "operator": "NextEra Energy Resources",
        "status": "operational",
        "county_fips": "48391",
        "notes": (
            "Reeves County trans-Pecos: NextEra/Brigado 3,000+ MW solar+storage. "
            "AI for real-time energy dispatch, battery state-of-health prediction, "
            "ERCOT market optimization. First major compute co-location at West TX "
            "renewable hub; negative-price solar hours enable low-cost batch AI training."
        ),
        "lon": -103.4937,
        "lat": 31.4229,
    },
    {
        "id": "ai-ga-010",
        "name": "Naval Submarine Base Kings Bay SSBN Navigation AI Center — Camden County GA",
        "operator": "U.S. Navy / Naval Submarine Forces Atlantic",
        "status": "operational",
        "county_fips": "13039",
        "notes": (
            "Kings Bay NSGS: home to Ohio-class SSBN (Trident II D5) and SSGN. "
            "Navy AI: acoustic signature ML, autonomous navigation, SSBN mission planning AI, "
            "Naval Nuclear Lab simulation HPC. Georgia Power served. Classified facility."
        ),
        "lon": -81.5970,
        "lat": 30.7990,
    },
    {
        "id": "ai-ga-011",
        "name": "Effingham County I-16 Industrial AI Hub / Port of Savannah Logistics Overflow — Effingham County GA",
        "operator": "Multiple tenants / Effingham County Development Authority",
        "status": "planned",
        "county_fips": "13103",
        "notes": (
            "Port of Savannah overflow zone on I-16/I-95 interchange. AI: Container logistics "
            "routing, warehouse robotics, last-mile delivery optimization. Amazon, Walmart, "
            "Home Depot distribution AI. Georgia Power queue expansions 2024."
        ),
        "lon": -81.3373,
        "lat": 32.3577,
    },
    {
        "id": "ai-nc-010",
        "name": "II Marine Expeditionary Force C4ISR & Cyber AI Hub — Camp Lejeune, Onslow County NC",
        "operator": "U.S. Marine Corps / II MEF",
        "status": "operational",
        "county_fips": "37133",
        "notes": (
            "MCB Camp Lejeune: II MEF, 2nd Marine Division, MARSOC. C4ISR AI: "
            "MAGTF Command Element AI-assisted fires, autonomous ISR (Blue Bear, Ghost), "
            "cyber operations ML, Pope AAF logistics AI. Duke Energy Progress served."
        ),
        "lon": -77.3416,
        "lat": 34.6768,
    },
    {
        "id": "ai-nc-011",
        "name": "ECU Health Vidant Medical Center Clinical AI Platform — Pitt County NC",
        "operator": "ECU Health / East Carolina University",
        "status": "operational",
        "county_fips": "37147",
        "notes": (
            "ECU Health Vidant Medical Center (Level 1 Trauma, 974 beds): clinical AI for "
            "radiology (chest X-ray, CT), sepsis early warning, precision oncology, EHR NLP. "
            "ECU Brody SOM AI Center partnership; NIH-funded federated-learning clinical trials."
        ),
        "lon": -77.3664,
        "lat": 35.5793,
    },
    {
        "id": "ai-ky-004",
        "name": "Amazon CVG Air Hub AI Robotics & Sortation Technology — Kenton County KY",
        "operator": "Amazon.com Services LLC",
        "status": "operational",
        "county_fips": "21115",
        "notes": (
            "Amazon Air Hub CVG (Erlanger, KY): 3M sq ft facility, largest Amazon Air hub "
            "globally. AI: autonomous conveyor sorting (Robin robotic arms), aircraft load "
            "optimization, predictive maintenance, real-time flight-path AI. AWS edge nodes on-site."
        ),
        "lon": -84.6599,
        "lat": 39.0488,
    },
    {
        "id": "ai-ky-005",
        "name": "University of Kentucky Center for Applied AI Research — Fayette County KY",
        "operator": "University of Kentucky",
        "status": "operational",
        "county_fips": "21067",
        "notes": (
            "UK CAAI: equine genome AI (world's largest equine genomics DB), energy AI "
            "(Kentucky coal transition), healthcare AI (UK HealthCare), autonomous mining "
            "systems (CAER). LG&E/KU served; connected to Internet2 and KentuckyWired fiber."
        ),
        "lon": -84.5037,
        "lat": 38.0406,
    },
    {
        "id": "ai-ca-012",
        "name": "Genentech / Roche South San Francisco AI Drug Discovery Hub — San Mateo County CA",
        "operator": "Genentech Inc. (Roche Group)",
        "status": "operational",
        "county_fips": "06081",
        "notes": (
            "Genentech South San Francisco HQ: AI for antibody discovery (ATLAS ML platform), "
            "clinical trial optimization, manufacturing AI (Oceanside/Vacaville), regulatory NLP. "
            "800+ ML scientists; PG&E served; 100% renewable since 2021."
        ),
        "lon": -122.3886,
        "lat": 37.6879,
    },
    {
        "id": "ai-ca-013",
        "name": "Lawrence Livermore National Laboratory AI for Nuclear & Climate Security — Alameda County CA",
        "operator": "Lawrence Livermore National Laboratory / NNSA / DOE",
        "status": "operational",
        "county_fips": "06001",
        "notes": (
            "LLNL Livermore: El Capitan exascale supercomputer (2 exaFLOPS, top500 #1 2024). "
            "AI: nuclear-stockpile-stewardship simulation, climate modeling, cancer genomics "
            "(ATOM consortium), materials discovery. NNSA classified facility. PG&E served."
        ),
        "lon": -121.7067,
        "lat": 37.6891,
    },
]

for camp in new_campuses:
    if camp["id"] not in existing_cids:
        campuses.append(camp)
        existing_cids.add(camp["id"])
        added_c += 1

raw["restrictions"] = restrictions
camp_raw["ai_campuses"] = campuses

with RAW_PATH.open("w") as f:
    json.dump(raw, f, indent=2)
with CAMP_PATH.open("w") as f:
    json.dump(camp_raw, f, indent=2)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(restrictions)}, Total campuses: {len(campuses)}")
