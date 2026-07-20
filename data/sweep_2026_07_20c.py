"""
Sweep C — 2026-07-20
Professional expansion: PA, OH, MI, MN, IA, KS, NE, MT, ID, ND, SD.
Restriction entries: 15 | Incentive entries: 22 | AI campuses: 10. Idempotent.
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

    # ── PENNSYLVANIA — coal country / watershed constraints ───────────────────

    {
        "fips": "42069",
        "name": "Lackawanna County",
        "state": "Pennsylvania",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Lackawanna County PA — PPL Electric CUP & Lackawanna River 401 Water Quality Certification",
        "description": (
            "Lackawanna County (Scranton, PA) is served primarily by PPL Electric Utilities, "
            "whose Northeastern Pennsylvania transmission zone faces growing capacity constraints "
            "as legacy coal-plant retirements outpace renewable interconnections. The county's "
            "primary water source, the Lackawanna River, is a Pennsylvania Department of "
            "Environmental Protection (PA DEP) Cold Water Fishery (CWF) stream; data center "
            "thermal discharge or consumptive withdrawals exceeding 1.0 MGD require a Section 401 "
            "Water Quality Certification under the Clean Water Act and a Susquehanna River Basin "
            "Commission (SRBC) consumptive-use approval. Lackawanna County's zoning ordinance "
            "requires a Conditional Use Permit (CUP) for data centers exceeding 5 MW, with PA DEP "
            "air-quality review (Title V or minor source) for on-site emergency diesel generators. "
            "Coal-ash legacy contamination in the Lackawanna River corridor triggers additional "
            "environmental review under Pennsylvania's Act 2 land-recycling program for any "
            "brownfield data-center development in the former anthracite mining belt."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "PPL Electric transmission zone NE-PA; SRBC consumptive-use threshold; Act 2 brownfield.",
        "sources": [
            {"label": "PPL Electric Utilities — Interconnection & Grid Capacity",
             "url": "https://www.pplelectric.com/for-my-business/large-business/interconnection"},
            {"label": "PA DEP — Section 401 Water Quality Certification",
             "url": "https://www.dep.pa.gov/Business/Water/CleanWater/WaterQuality/StreamRedesignation/Pages/401WQC.aspx"},
            {"label": "SRBC — Consumptive Use Approvals",
             "url": "https://www.srbc.net/permitting/consumptive-use/index.html"},
            {"label": "Lackawanna County — Unified Development Code",
             "url": "https://www.lackawannacounty.org/planning-and-zoning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "42079",
        "name": "Luzerne County",
        "state": "Pennsylvania",
        "level": 2,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Luzerne County PA — Coal-Ash Legacy, Susquehanna River SRBC Threshold & PPL Grid Constraints",
        "description": (
            "Luzerne County (Wilkes-Barre, PA) sits at the confluence of the North and West "
            "Branches of the Susquehanna River and contains extensive legacy coal-ash impoundments "
            "from former anthracite collieries, many of which are active Superfund or PA Act 2 sites. "
            "PA DEP's Coal Ash (Residual Waste) regulations (25 Pa. Code Ch. 299) impose additional "
            "groundwater monitoring requirements for data centers built on or near former mining land. "
            "PPL Electric Utilities serves the county; the Wilkes-Barre substation was upgraded in "
            "2023 but PJM interconnection queues for large industrial loads remain 36–48 months. "
            "SRBC consumptive-use permits are required for groundwater or surface-water withdrawals "
            "above 100,000 gpd average. Luzerne County's Act 537 sewage-planning requirements and "
            "the Wyoming Valley Sanitary Authority capacity limits create additional timeline risk "
            "for data centers relying on public water and sewer."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "PJM queue 36-48 mo; SRBC permit >100k gpd avg; Act 537 sewage planning.",
        "sources": [
            {"label": "PA DEP — Residual Waste (Coal Ash) Regulations 25 Pa. Code Ch. 299",
             "url": "https://www.dep.pa.gov/Business/Land/Waste/Solid/ResidualandTreatedMedical/Pages/default.aspx"},
            {"label": "SRBC — Project Review & Consumptive Use",
             "url": "https://www.srbc.net/permitting/project-review/index.html"},
            {"label": "PPL Electric — Large Load Interconnection",
             "url": "https://www.pplelectric.com/for-my-business/large-business/interconnection"},
            {"label": "Luzerne County Planning Commission",
             "url": "https://www.luzernecounty.org/departments/planning_zoning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── OHIO — hyperscale corridor constraints ────────────────────────────────

    {
        "fips": "39159",
        "name": "Union County",
        "state": "Ohio",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "Union County Ohio — AEP Ohio Capacity Trigger & Honda Marysville Load Priority",
        "description": (
            "Union County (Marysville, OH) is home to Honda of America Manufacturing's flagship "
            "Marysville Auto Plant and East Liberty Auto Plant, which together draw some of the "
            "largest industrial loads on AEP Ohio's Columbus metro transmission system. AEP Ohio's "
            "updated large-load interconnection policy (filed FERC ER24-803, 2024) requires a "
            "system-impact study for new data-center loads exceeding 5 MW in circuits already "
            "serving industrial anchor customers. The Public Utilities Commission of Ohio (PUCO) "
            "Order 24-0376-EL-ATA directed AEP Ohio to prioritize critical manufacturing in "
            "capacity allocation disputes. Union County zoning requires a conditional-use permit "
            "for data centers exceeding 25,000 sq ft under Section 17.04 of the Unified Development "
            "Code; the EDA-designated corridor along US-33 between Marysville and Dublin is subject "
            "to additional economic-impact review."
        ),
        "effective_date": "2024-06-01",
        "status": "active",
        "notes": "AEP Ohio FERC ER24-803; PUCO 24-0376-EL-ATA; Honda load priority US-33 corridor.",
        "sources": [
            {"label": "AEP Ohio — Large Load Interconnection Policy",
             "url": "https://www.aepohio.com/account/business/economic-development/"},
            {"label": "PUCO — Case 24-0376-EL-ATA (AEP Ohio Load Priority Order)",
             "url": "https://dis.puc.state.oh.us/"},
            {"label": "Union County Ohio — Unified Development Code",
             "url": "https://www.co.union.oh.us/Departments/Planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MINNESOTA — Xcel nuclear EPZ & PUC moratorium ────────────────────────

    {
        "fips": "27141",
        "name": "Sherburne County",
        "state": "Minnesota",
        "level": 2,
        "types": ["data_center", "energy", "environmental"],
        "title": "Sherburne County MN — Xcel Energy Monticello Nuclear Plant EPZ & MN PUC Grid Deferral",
        "description": (
            "Sherburne County (Elk River, MN) contains the Xcel Energy Monticello Nuclear Generating "
            "Plant (NGP), a 671 MW boiling-water reactor whose 10-mile emergency planning zone (EPZ) "
            "covers most of the county. The U.S. Nuclear Regulatory Commission's Monticello EPZ creates "
            "siting and emergency-response complications for large data centers that qualify as 'critical "
            "facilities' under Minnesota Emergency Management rules (Minn. R. 7440.0390). The Minnesota "
            "Public Utilities Commission issued Order 09-1261 establishing that new large industrial "
            "loads in Xcel Energy's Northern States Power zone require a Transmission Cost Impact Study "
            "before interconnection; this requirement was reaffirmed for AI-scale loads in the 2024 "
            "Triennial Integrated Resource Plan review. Sherburne County's comprehensive plan designates "
            "the I-94 corridor for light-industrial uses, and the Sherburne County Board has imposed a "
            "180-day study period for data-center proposals exceeding 20 MW under Ord. 185 (2024)."
        ),
        "effective_date": "2024-09-01",
        "status": "active",
        "notes": "Monticello NGP 10-mi EPZ; MN PUC TCIS requirement; 180-day study period Ord. 185.",
        "sources": [
            {"label": "NRC — Monticello Nuclear Generating Plant Emergency Planning Zone",
             "url": "https://www.nrc.gov/reactors/operating/ops-experience/power-uprates/app-submitted/mn-monticello.html"},
            {"label": "MN PUC — Xcel Energy NSP Integrated Resource Plan 2024",
             "url": "https://mn.gov/puc/"},
            {"label": "Sherburne County — Comprehensive Plan & Zoning Ordinance 185",
             "url": "https://www.co.sherburne.mn.us/216/Planning"},
            {"label": "Xcel Energy — Large Load Interconnection",
             "url": "https://www.xcelenergy.com/company/rates_and_regulations/transmission/interconnection_requests"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "27021",
        "name": "Chisago County",
        "state": "Minnesota",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Chisago County MN — Xcel Energy Rural Feeder Congestion & St. Croix River Watershed",
        "description": (
            "Chisago County (Center City, MN) lies north of the Twin Cities metro along the St. Croix "
            "National Scenic Riverway. The county is served by Xcel Energy (Northern States Power) on "
            "rural 69kV and 115kV feeders that interconnect at the Cambridge or North Branch substations. "
            "Both substations have limited hosting capacity for new large loads without distribution "
            "upgrades priced at $3–8 million per MW in the 2024 Xcel Distribution Resource Plan. "
            "The St. Croix River corridor falls under Wisconsin–Minnesota interstate compact protections "
            "and the National Wild & Scenic Rivers Act (16 U.S.C. §1271); consumptive water "
            "withdrawals from the St. Croix Basin require Minnesota DNR permit (Minn. Stat. §103G.271) "
            "and may trigger federal Wild & Scenic consultation for facilities within 1 mile of the river. "
            "Chisago County's interim ordinance (Res. 2024-055) requires a 120-day review for data "
            "centers exceeding 1 MW until the comprehensive plan update is complete."
        ),
        "effective_date": "2024-08-01",
        "status": "active",
        "notes": "Xcel 69/115kV feeder limits; St. Croix Wild & Scenic; DNR 103G.271 water permit.",
        "sources": [
            {"label": "Minnesota DNR — Water Appropriation Permits (103G.271)",
             "url": "https://www.dnr.state.mn.us/waters/watermgmt_section/appropriations/index.html"},
            {"label": "National Park Service — St. Croix National Scenic Riverway",
             "url": "https://www.nps.gov/sacn/index.htm"},
            {"label": "Chisago County — Planning & Zoning",
             "url": "https://www.co.chisago.mn.us/193/Planning-Zoning"},
            {"label": "Xcel Energy — Distribution Resource Plan 2024",
             "url": "https://www.xcelenergy.com/company/rates_and_regulations/transmission"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── IOWA — floodplain & river constraints ─────────────────────────────────

    {
        "fips": "19097",
        "name": "Iowa County",
        "state": "Iowa",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Iowa County Iowa — Iowa River 100-Year Floodplain & MidAmerican Energy Rural Feeder Capacity",
        "description": (
            "Iowa County (Marengo, IA) straddles the Iowa River corridor, where FEMA-designated "
            "100-year floodplain areas cover significant portions of the county's industrially zoned "
            "land. Data centers in Special Flood Hazard Areas (SFHAs) require FEMA Elevation Certificates "
            "and may need Letters of Map Revision (LOMRs) before construction, adding 12–24 months to "
            "project timelines. Iowa County is served by MidAmerican Energy (Berkshire Hathaway) on "
            "rural 69kV distribution feeders; the nearest 115kV substation is in Amana or Williamsburg, "
            "with limited spare transformer capacity. Iowa DNR's Water Allocation Program (Iowa Code "
            "§455B.265) requires permits for surface or groundwater withdrawals exceeding 25,000 gpd. "
            "The county's comprehensive plan designates the Iowa River corridor as agricultural/natural "
            "areas overlay, limiting heavy industrial uses including large-scale data centers."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "Iowa River 100-yr SFHA; MidAmerican 69kV feeder; Iowa DNR §455B.265 water permit.",
        "sources": [
            {"label": "FEMA — Flood Map Service Center (Iowa County, IA)",
             "url": "https://msc.fema.gov/portal/"},
            {"label": "Iowa DNR — Water Allocation Permits (§455B.265)",
             "url": "https://www.iowadnr.gov/Environmental-Protection/Water-Quality/Water-Quantity"},
            {"label": "MidAmerican Energy — Economic Development & Large Load",
             "url": "https://www.midamericanenergy.com/business/economic-development"},
            {"label": "Iowa County Planning & Zoning",
             "url": "https://www.iowacounty.org/planning-zoning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── NORTH DAKOTA — Red River floodplain constraint ───────────────────────

    {
        "fips": "38017",
        "name": "Cass County",
        "state": "North Dakota",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Cass County ND — Red River Floodplain, Xcel Energy Capacity & ND PSC Interconnection",
        "description": (
            "Cass County (Fargo, ND) is bisected by the Red River of the North, North America's "
            "largest northward-flowing river and one of the most flood-prone urban corridors in the "
            "United States. FEMA Special Flood Hazard Areas cover extensive industrial-zoned land in "
            "the Fargo metro, requiring floodproofing to 2-foot freeboard above BFE for critical "
            "facilities. Xcel Energy (Northern States Power – ND Division) serves the Fargo metro; "
            "the Xcel Energy Fargo Substation was upgraded in 2022 but PJM-adjacent MISO North Central "
            "transmission congestion limits new large-load hosting capacity to approximately 40 MW "
            "before triggering network upgrades under MISO's Large Generator Interconnection Procedures. "
            "The North Dakota Public Service Commission (ND PSC) requires a Certificate of Site "
            "Compatibility for facilities with cumulative backup generator capacity exceeding 100 MW "
            "under N.D.C.C. §49-22. Cass County requires a special use permit for data centers "
            "in all zoning districts under the Fargo-Cass County Joint Zoning Ordinance."
        ),
        "effective_date": "2023-06-01",
        "status": "active",
        "notes": "Red River SFHA; MISO NC congestion; ND PSC §49-22 cert; Fargo-Cass joint SUP.",
        "sources": [
            {"label": "Cass County — Joint Planning & Zoning (Fargo-Cass)",
             "url": "https://www.casscountynd.gov/county/depts/planning/Pages/default.aspx"},
            {"label": "ND PSC — Certificate of Site Compatibility (§49-22)",
             "url": "https://www.psc.nd.gov/"},
            {"label": "MISO — Large Generator Interconnection Procedures",
             "url": "https://www.misoenergy.org/planning/generator-interconnection/"},
            {"label": "Xcel Energy — NSP North Dakota Transmission",
             "url": "https://www.xcelenergy.com/company/rates_and_regulations/transmission"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── KANSAS — KCC approval threshold ──────────────────────────────────────

    {
        "fips": "20173",
        "name": "Sedgwick County",
        "state": "Kansas",
        "level": 2,
        "types": ["data_center", "energy", "water"],
        "title": "Sedgwick County KS — Evergy KCC Large-Load Approval & Little Arkansas River Water Rights",
        "description": (
            "Sedgwick County (Wichita, KS) is Evergy's largest service territory by load; the "
            "Kansas Corporation Commission (KCC) Docket No. 24-EVRG-001-GIE established new "
            "interconnection procedures requiring pre-application meetings and feasibility studies "
            "for any new data-center load exceeding 10 MW. Sedgwick County contains the "
            "Little Arkansas River aquifer recharge zone, designated by the Kansas Department of "
            "Agriculture (KDA) Division of Water Resources as a Groundwater Management District 2 "
            "(GMD2) controlled area (K.S.A. 82a-1020); consumptive groundwater withdrawals require "
            "a water-right license and annual reporting to KDA. The Kansas Department of Health and "
            "Environment (KDHE) requires air-quality permits for on-site diesel generator capacity "
            "exceeding 500 kW (KDHE Air Quality Bureau, K.A.R. 28-19-517). Sedgwick County's "
            "updated zoning resolution (Res. Z-2024-05) requires a special-use permit for data "
            "centers in I-1 and I-2 industrial districts and a traffic-impact study for facilities "
            "exceeding 100,000 sq ft."
        ),
        "effective_date": "2024-04-01",
        "status": "active",
        "notes": "KCC Docket 24-EVRG-001-GIE; KDA GMD2 water right; KDHE air permit >500kW DG.",
        "sources": [
            {"label": "Kansas Corporation Commission — Electric Utility Dockets",
             "url": "https://www.kcc.ks.gov/utilities/electric/electric-utility-dockets"},
            {"label": "Kansas Dept. of Agriculture — Division of Water Resources GMD2",
             "url": "https://www.agriculture.ks.gov/divisions-programs/dwr/water-resources"},
            {"label": "KDHE — Air Quality Permits (K.A.R. 28-19-517)",
             "url": "https://www.kdhe.ks.gov/173/Air-Permits"},
            {"label": "Sedgwick County — Planning & Development Services",
             "url": "https://www.sedgwickcounty.org/planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── NEBRASKA — OPPD/MUD threshold ────────────────────────────────────────

    {
        "fips": "31055",
        "name": "Douglas County",
        "state": "Nebraska",
        "level": 1,
        "types": ["data_center", "energy", "water"],
        "title": "Douglas County NE — OPPD Large-Load Study & MUD Water Capacity Trigger (Omaha)",
        "description": (
            "Douglas County (Omaha, NE) is served by the Omaha Public Power District (OPPD) and "
            "the Metropolitan Utilities District (MUD) for water and natural gas. OPPD's Economic "
            "Development Large-Load Policy requires a 90-day system-impact study for new customers "
            "requesting more than 5 MW of firm load; data-center loads exceeding 20 MW additionally "
            "require OPPD Board approval under OPPD Resolution 6320 (2023). MUD's Water Supply "
            "Master Plan (2022) projects water capacity margin tightening by 2028 due to Omaha "
            "metro population growth and the planned Meta and Google data-center expansions; new "
            "large industrial water customers (>250,000 gpd) are subject to a demand-management "
            "agreement under MUD Rule 15. Nebraska's LB 1020 (2024) provides a personal-property "
            "tax exemption for qualified data-center equipment, but Douglas County assessors apply "
            "the exemption only after OPPD large-load approval is documented."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "OPPD Res. 6320 Board approval >20 MW; MUD Rule 15 demand mgmt >250k gpd; LB 1020.",
        "sources": [
            {"label": "OPPD — Economic Development & Large Load Programs",
             "url": "https://www.oppd.com/business/economic-development/"},
            {"label": "Metropolitan Utilities District (MUD) — Water & Gas Service Rules",
             "url": "https://www.mudomaha.com/business/large-commercial-industrial/"},
            {"label": "Nebraska Legislature — LB 1020 (2024) Data Center Tax Exemption",
             "url": "https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=57137"},
            {"label": "Douglas County — Planning Department",
             "url": "https://www.douglascounty-ne.gov/departments/planning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MONTANA — NorthWestern Energy & Clark Fork ────────────────────────────

    {
        "fips": "30063",
        "name": "Missoula County",
        "state": "Montana",
        "level": 2,
        "types": ["data_center", "water", "energy", "environmental"],
        "title": "Missoula County MT — NorthWestern Energy Capacity, Clark Fork River 318 Certification & DEQ Permit",
        "description": (
            "Missoula County (Missoula, MT) sits at the confluence of the Clark Fork and Blackfoot "
            "Rivers, a nationally significant fisheries corridor. NorthWestern Energy serves the "
            "county from the Rattlesnake Substation and the Milltown/Superior 100 kV transmission "
            "line; maximum hosting capacity for new large industrial loads is approximately 15 MW "
            "before the Montana Public Service Commission (MT PSC) requires a Certificate of "
            "Environmental Compatibility (CEC) filing under MCA §75-20-211. Data centers using "
            "Clark Fork water for cooling must obtain a Montana DEQ 318 (formerly 401) Water Quality "
            "Certification and a water right from the Montana DNRC under MCA §85-2-302; the Clark "
            "Fork is fully appropriated in most reaches below Milltown Dam, meaning new surface-water "
            "rights are essentially unavailable without purchasing existing rights. Missoula County's "
            "Growth Policy and Zoning Resolution 15-024 designates heavy industrial uses as "
            "conditional-use in all districts outside the Wye industrial area; data centers "
            "exceeding 20 MW are classified as heavy industrial under the 2024 Missoula City-County "
            "Land Development Code update."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "MT PSC CEC §75-20-211; DNRC §85-2-302 Clark Fork fully appropriated; CUP heavy industrial.",
        "sources": [
            {"label": "MT PSC — Certificate of Environmental Compatibility (CEC) MCA §75-20-211",
             "url": "https://psc.mt.gov/"},
            {"label": "Montana DNRC — Water Rights Bureau (MCA §85-2-302)",
             "url": "https://dnrc.mt.gov/divisions/water/management/water-rights"},
            {"label": "Montana DEQ — Water Quality (318 Certification)",
             "url": "https://deq.mt.gov/water"},
            {"label": "Missoula County — Land Use & Planning",
             "url": "https://www.missoulacounty.us/government/community-development/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MONTANA — Gallatin River fast-growth restriction ─────────────────────

    {
        "fips": "30031",
        "name": "Gallatin County",
        "state": "Montana",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Gallatin County MT — Gallatin River Water Rights Moratorium & NorthWestern Energy Substation Queue",
        "description": (
            "Gallatin County (Bozeman, MT) is the fastest-growing county in Montana and has "
            "experienced explosive tech-sector migration since 2020. NorthWestern Energy's "
            "Bozeman Substation and the Bridger Transmission Line (100 kV) are constrained; "
            "the MT PSC accepted NorthWestern's 2024 Integrated Resource Plan noting that the "
            "Gallatin Valley faces load growth requiring a new 230 kV substation not expected "
            "to be energized until 2028–2030. The Montana Department of Natural Resources and "
            "Conservation (DNRC) has issued a temporary moratorium on new surface-water rights "
            "from the main stem of the Gallatin River (DNRC Order 2023-20) because the river "
            "is over-appropriated during low-flow periods (July–September) under the Yellowstone "
            "River Compact. Gallatin County's 2020 Growth Policy and proposed Large-Scale "
            "Development Ordinance (2024 draft) would require environmental impact assessment "
            "for data centers exceeding 5 MW or 50,000 sq ft, with mandatory public comment "
            "periods of at least 60 days."
        ),
        "effective_date": "2023-07-01",
        "status": "active",
        "notes": "NorthWestern 230kV sub not online until 2028-30; DNRC Order 2023-20 Gallatin surface moratorium.",
        "sources": [
            {"label": "Montana DNRC — Water Rights Temporary Moratorium Orders",
             "url": "https://dnrc.mt.gov/divisions/water/management/water-rights/adjudication"},
            {"label": "NorthWestern Energy — 2024 Integrated Resource Plan",
             "url": "https://www.northwesternenergy.com/regulatory-filings/integrated-resource-plan"},
            {"label": "MT PSC — NorthWestern Energy Regulatory Filings",
             "url": "https://psc.mt.gov/"},
            {"label": "Gallatin County — Planning & Community Development",
             "url": "https://www.gallatin.mt.gov/planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── IDAHO — Idaho Power Snake River water rights ──────────────────────────

    {
        "fips": "16027",
        "name": "Canyon County",
        "state": "Idaho",
        "level": 2,
        "types": ["data_center", "water", "energy"],
        "title": "Canyon County ID — Idaho Power Capacity Constraints & Snake River Water-Right Priority Date",
        "description": (
            "Canyon County (Nampa/Caldwell, ID) is Idaho's second-largest county and part of the "
            "booming Treasure Valley metro. Idaho Power's Treasure Valley transmission system faces "
            "severe capacity constraints driven by semiconductor fab expansions (Micron Boise) and "
            "residential load growth; the Idaho PUC approved Idaho Power's 2024 Integrated Resource "
            "Plan (Case IPC-E-24-12) acknowledging a 400+ MW peak demand deficit by 2028 requiring "
            "new peaking resources. Data-center applicants must complete Idaho Power's Large-Load "
            "Interconnection Study Process (LLISP), which averages 18–24 months. Canyon County's "
            "primary water source is the Snake River; Idaho Department of Water Resources (IDWR) "
            "administers the Snake River Basin Adjudication (SRBA) — new groundwater rights have "
            "2025 priority dates and are junior to virtually all existing agricultural rights, "
            "meaning curtailment risk during drought years is high. Canyon County's Zoning Ordinance "
            "Article 17 requires a Conditional Use Permit for data centers in all zones."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "Idaho PUC IPC-E-24-12; LLISP 18-24 mo; SRBA 2025 priority date junior to ag rights.",
        "sources": [
            {"label": "Idaho PUC — Case IPC-E-24-12 (Idaho Power IRP 2024)",
             "url": "https://puc.idaho.gov/Case/Details/?id=2024-05-15-01"},
            {"label": "Idaho IDWR — Snake River Basin Adjudication (SRBA)",
             "url": "https://idwr.idaho.gov/water-rights/SRBA/"},
            {"label": "Idaho Power — Large Load Interconnection Study Process",
             "url": "https://www.idahopower.com/energy-environment/energy-efficiency/economic-development/"},
            {"label": "Canyon County — Planning & Zoning",
             "url": "https://www.canyonco.org/departments/planning_zoning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── SOUTH DAKOTA — Big Sioux floodplain constraint ───────────────────────

    {
        "fips": "46099",
        "name": "Minnehaha County",
        "state": "South Dakota",
        "level": 1,
        "types": ["data_center", "water", "energy"],
        "title": "Minnehaha County SD — Big Sioux River Floodplain & Northwestern Energy Grid Capacity (Sioux Falls)",
        "description": (
            "Minnehaha County (Sioux Falls, SD) is South Dakota's most populous county and home to "
            "the state's largest data-center cluster, drawn by South Dakota's lack of corporate "
            "income tax and property-tax exemptions. Northwestern Energy (NWE) serves Sioux Falls; "
            "the Sioux Falls metro experienced a 22% load increase between 2020 and 2024, "
            "driven by data-center expansions. NWE filed a Certificate of Need (CON) with the "
            "South Dakota Public Utilities Commission (SD PUC) in 2024 (Docket EL24-003) for a "
            "new 115/230 kV substation; the CON process takes 12–18 months and creates queue "
            "uncertainty for applicants. Large data centers (>5 MW) located in the Big Sioux River "
            "flood-control channel SFHA require SD DOE Stormwater Industrial General Permit coverage "
            "and Minnehaha County Floodplain Development Permits. The SD PUC requires large "
            "industrial applicants to submit a Voluntary Load Curtailment Agreement during peak "
            "demand periods under SDCL 49-34A."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "NWE Docket EL24-003 CON; SDCL 49-34A curtailment; Big Sioux SFHA floodplain permit.",
        "sources": [
            {"label": "SD PUC — Dockets & Filings (EL24-003)",
             "url": "https://puc.sd.gov/"},
            {"label": "Northwestern Energy — Economic Development & Large Load",
             "url": "https://www.northwesternenergy.com/business/economic-development"},
            {"label": "Minnehaha County — Planning & Zoning",
             "url": "https://www.minnehahacounty.org/dept/planning/planning.php"},
            {"label": "SD DENR — Stormwater Industrial General Permit",
             "url": "https://denr.sd.gov/des/sw/indust.aspx"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MICHIGAN — Upper Peninsula power constraint ───────────────────────────

    {
        "fips": "26103",
        "name": "Marquette County",
        "state": "Michigan",
        "level": 2,
        "types": ["data_center", "energy", "water"],
        "title": "Marquette County MI — Upper Peninsula Power Single-Feed Constraint & Lake Superior Water",
        "description": (
            "Marquette County is the largest county in Michigan's Upper Peninsula and home to "
            "Northern Michigan University (NMU). Electrical service in the UP is provided by the "
            "Upper Peninsula Power Company (UPPCO), a MISO market participant whose single 138 kV "
            "AC transmission tie to the Lower Peninsula limits the region's ability to import power "
            "during peak demand. UPPCO's 2024 integrated resource plan filed with the Michigan "
            "Public Service Commission (MPSC — Case U-21376) identifies the Marquette County grid "
            "as capacity-constrained with no additional large-load hosting capacity before 2027 "
            "without a substation upgrade. Data centers may draw cooling water from Lake Superior, "
            "but Michigan DEQ Part 301 (NREPA) permits and a U.S. Army Corps Section 404 permit "
            "are required for any intake structure within the Great Lakes shoreline. Marquette "
            "County Zoning Ordinance Section 23.4 requires a special-use permit and traffic study "
            "for data centers exceeding 10,000 sq ft."
        ),
        "effective_date": "2024-01-01",
        "status": "active",
        "notes": "UPPCO MPSC U-21376 no capacity before 2027; Lake Superior NREPA Part 301 + USACE 404.",
        "sources": [
            {"label": "UPPCO / Michigan PSC — Case U-21376",
             "url": "https://mi-psc.force.com/sfc/servlet.shepherd/document/download/069t000000BFfqxAAD"},
            {"label": "Michigan PSC — UPPCO Electric Cases",
             "url": "https://mi-psc.force.com/"},
            {"label": "Michigan DEQ — Part 301 Great Lakes/Inland Waters Permits",
             "url": "https://www.michigan.gov/egle/about/organization/water-resources/inland-lakes-and-streams"},
            {"label": "Marquette County — Planning & Zoning",
             "url": "https://www.co.marquette.mi.us/departments/planning_and_zoning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # ── MICHIGAN — Blue Water Bridge / St. Clair industrial grid ─────────────

    {
        "fips": "26147",
        "name": "St. Clair County",
        "state": "Michigan",
        "level": 1,
        "types": ["data_center", "energy"],
        "title": "St. Clair County MI — DTE Energy Industrial Priority & MPSC Load-Growth Study (Blue Water)",
        "description": (
            "St. Clair County (Port Huron, MI) sits at the Blue Water Bridge US-Canada border "
            "crossing and hosts one of Michigan's densest concentrations of petroleum-chemical "
            "industrial load (Dow, Merichem, INEOS). DTE Energy serves the county via the "
            "Blue Water / Port Huron 120 kV system; the Michigan Public Service Commission "
            "(MPSC Case U-20794) found that the Blue Water transmission corridor has limited "
            "spare capacity for new large industrial loads due to existing chemical plant load "
            "factor patterns. Data-center proposals exceeding 10 MW require a DTE Industrial "
            "New Service Study (INSS) with a 120-day timeline; proposals exceeding 50 MW trigger "
            "a MISO Definitive Planning Phase (DPP) study costing up to $500,000. The county's "
            "industrial zoning (I-2/I-3) conditionally permits data centers under Ordinance "
            "No. 156 (2022) with site-plan review by the St. Clair County Metropolitan Planning "
            "Commission, including AIS (aquifer impact study) for groundwater withdrawals."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "DTE INSS 120 days; MISO DPP >50 MW; AIS groundwater; industrial chemical load priority.",
        "sources": [
            {"label": "Michigan PSC — DTE Energy Electric Cases",
             "url": "https://mi-psc.force.com/"},
            {"label": "DTE Energy — New Service / Large Load Interconnection",
             "url": "https://www.dteenergy.com/us/en/business/products-and-services/electric/new-service.html"},
            {"label": "St. Clair County Metropolitan Planning Commission",
             "url": "https://www.stclaircounty.org/Offices/MPO/"},
            {"label": "MISO — Definitive Planning Phase Study Process",
             "url": "https://www.misoenergy.org/planning/generator-interconnection/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },
]

# ── INCENTIVE entries ─────────────────────────────────────────────────────────

new_incentives = [

    # Pennsylvania
    {
        "fips": "42071",
        "name": "Lancaster County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Lancaster County PA — PA Keystone Opportunity Zone & PPL Grid Reliability Hub",
        "description": (
            "Lancaster County (Lancaster, PA) is served by PPL Electric Utilities on the "
            "reliable Lancaster 230/115 kV transmission system. Pennsylvania's Keystone "
            "Opportunity Zone (KOZ) program (72 P.S. §8903) provides up to 10 years of "
            "state and local tax abatement for businesses in designated zones; Lancaster "
            "County has active KOZ and Keystone Opportunity Expansion Zone (KOEZ) designations "
            "covering industrial parcels in East Hempfield and Manheim townships. The "
            "Lancaster County Economic Development Company (LCEDC) offers site-ready certified "
            "properties and coordinates PA Department of Community & Economic Development "
            "(DCED) grants under the Pennsylvania First Program (PF). Fiber connectivity "
            "is strong via Windstream/Kinetic and Comcast Business Ethernet along the US-30 "
            "and US-322 corridors."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "PA KOZ/KOEZ tax abatement; LCEDC site-ready; PPL Lancaster 230/115 kV hub.",
        "sources": [
            {"label": "PA DCED — Keystone Opportunity Zones (KOZ/KOEZ)",
             "url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz/"},
            {"label": "Lancaster County Economic Development Company (LCEDC)",
             "url": "https://www.lcedc.com/"},
            {"label": "PPL Electric — Economic Development",
             "url": "https://www.pplelectric.com/for-my-business/large-business/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "42129",
        "name": "Westmoreland County",
        "state": "Pennsylvania",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Westmoreland County PA — Mon Valley Economic Development & West Penn Power Capacity",
        "description": (
            "Westmoreland County (Greensburg, PA) anchors the Mon Valley / Pittsburgh eastern "
            "suburbs. West Penn Power (FirstEnergy subsidiary) serves the county via the "
            "Jeannette and Latrobe 138 kV substations, both of which have available capacity "
            "after legacy steel-industry load retirements. The Westmoreland County Industrial "
            "Development Corporation (WCIDC) operates Keystone Commons (former Volkswagen test "
            "track) and the Norwin Business Park as certified industrial sites with direct "
            "fiber and three-phase power. Pennsylvania's Data Center Investment Incentive "
            "(Act 48 of 2022, 72 P.S. §8923) provides a 100% sales-tax exemption on data-center "
            "equipment for qualifying investments of $25M+. Westmoreland County Enterprise Zone "
            "designations (PA Act 46 of 2003) provide local real-estate tax abatement on "
            "qualifying capital improvements for up to 10 years."
        ),
        "effective_date": "2022-07-01",
        "status": "active",
        "notes": "West Penn Power Jeannette/Latrobe 138kV available; PA Act 48 data center sales-tax exemption.",
        "sources": [
            {"label": "PA DCED — Data Center Investment Incentive Act 48 (2022)",
             "url": "https://dced.pa.gov/programs/data-center-investment-incentive/"},
            {"label": "Westmoreland County Industrial Development Corporation (WCIDC)",
             "url": "https://www.wcidc.com/"},
            {"label": "West Penn Power — Economic Development",
             "url": "https://www.firstenergycorp.com/content/customer/save_energy/pa/for_your_business/economic-development.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Ohio
    {
        "fips": "39041",
        "name": "Delaware County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Delaware County OH — Intel New Albany Adjacent Hyperscale Zone & Ohio HB 4 Tax Abatement",
        "description": (
            "Delaware County (Delaware, OH) sits immediately north of the Intel New Albany "
            "semiconductor fab campus and benefits from the same fiber, water, and transmission "
            "infrastructure buildout. AEP Ohio's Delaware County substations (Shale Hollow, "
            "Lewis Center) received $220M in upgrades in 2023–24 to support the Intel campus "
            "load, leaving spare capacity for adjacent data-center users. Ohio House Bill 4 "
            "(2023) provides a 7-year 100% personal-property tax exemption and a sales-tax "
            "exemption on qualifying data-center equipment for investments exceeding $100M in "
            "Ohio Opportunity Zones. Delaware County's Tax Incentive Review Council (TIRC) "
            "actively approves Community Reinvestment Area (CRA) agreements with 15-year real-"
            "property tax abatements for qualifying technology investments. Columbus Region "
            "2050 fiber backbone reaches Delaware County via US-23 and SR-36 corridors."
        ),
        "effective_date": "2023-01-01",
        "status": "active",
        "notes": "AEP Ohio $220M substation upgrade; Ohio HB 4 PPT exemption; CRA 15-yr abatement.",
        "sources": [
            {"label": "Ohio Development — Data Center Tax Exemption (Ohio HB 4, 2023)",
             "url": "https://development.ohio.gov/business/tax-incentives"},
            {"label": "AEP Ohio — Economic Development",
             "url": "https://www.aepohio.com/account/business/economic-development/"},
            {"label": "Delaware County — Economic Development",
             "url": "https://www.delawarecountyohio.gov/economic-development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "39089",
        "name": "Licking County",
        "state": "Ohio",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Licking County OH — Intel New Albany Intel Fab, AEP Ohio Grid & Ohio HB 4 Hyperscale Hub",
        "description": (
            "Licking County (Newark/New Albany, OH) is the site of Intel's planned $20 billion "
            "Ohio One semiconductor manufacturing campus — one of the largest infrastructure "
            "investments in U.S. history. AEP Ohio's Licking County substations received $300M+ "
            "in transmission upgrades as part of the Ohio One buildout, creating abundant capacity "
            "for co-located and adjacent hyperscale data centers. Licking County's TIF (Tax "
            "Increment Financing) agreements under Ohio R.C. §5709.40 provide up to 30-year "
            "property-tax deferrals on improvements in the Technology Campus District. Ohio HB 4 "
            "(2023) personal-property tax and sales-tax exemptions apply to qualifying data-center "
            "equipment. The Central Ohio Regional Airport (Heath) provides logistics access; "
            "Licking County Broadband Authority is deploying dark fiber to industrial parks."
        ),
        "effective_date": "2022-07-01",
        "status": "active",
        "notes": "Intel Ohio One adjacent; AEP $300M+ upgrades; Ohio R.C. 5709.40 TIF 30-yr; HB 4 PPT/ST exemption.",
        "sources": [
            {"label": "Ohio Development — Intel Ohio One & JobsOhio",
             "url": "https://development.ohio.gov/business/site-selection/success-stories/intel"},
            {"label": "AEP Ohio — Economic Development (Licking County)",
             "url": "https://www.aepohio.com/account/business/economic-development/"},
            {"label": "Licking County — Economic Development Department",
             "url": "https://www.lcounty.com/economicdevelopment/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Michigan
    {
        "fips": "26021",
        "name": "Berrien County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Berrien County MI — Indiana Michigan Power (I&M) Grid, Lake Michigan Cooling & MEDC Incentives",
        "description": (
            "Berrien County (Benton Harbor/St. Joseph, MI) is served by Indiana Michigan Power "
            "(I&M, an AEP subsidiary) from the Benton Harbor and Palisades 138/345 kV "
            "substations. The former Palisades Nuclear Plant site (decommissioning ongoing) "
            "leaves substantial 345 kV transmission infrastructure and a 345/138 kV substation "
            "available for repurposing as a data-center power hub. Michigan's Strategic Outreach "
            "and Attraction Reserve (SOAR) Fund provides grants up to $100M for critical "
            "technology investments; data centers >50 MW qualify under MEDC Program Guidelines. "
            "Michigan's Data Center Tax Incentive (MCL 211.9o, enacted 2016) provides personal-"
            "property tax exemption for qualifying data-center equipment. Lake Michigan once-"
            "through or closed-cycle cooling water is available via Lake Michigan Water Authority "
            "under NPDES permit from Michigan EGLE."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "I&M Palisades 345kV infra; MEDC SOAR Fund; MCL 211.9o PPT exemption; Lake Michigan cooling.",
        "sources": [
            {"label": "MEDC — Michigan Strategic Outreach and Attraction Reserve (SOAR)",
             "url": "https://www.michiganbusiness.org/grow/incentives/"},
            {"label": "Michigan Legislature — MCL 211.9o Data Center PPT Exemption",
             "url": "https://www.legislature.mi.gov/Laws/MCL/PublicActs?objectName=2016-PA-0135"},
            {"label": "Indiana Michigan Power — Economic Development",
             "url": "https://www.indianamichiganpower.com/account/business/economic-development/"},
            {"label": "Southwest Michigan First — Berrien County Site Selection",
             "url": "https://southwestmichiganfirst.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "26045",
        "name": "Eaton County",
        "state": "Michigan",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Eaton County MI — Consumers Energy HQ Campus, GM Delta Township EV & MEDC MCL 211.9o",
        "description": (
            "Eaton County (Charlotte/Delta Township, MI) hosts Consumers Energy's corporate "
            "headquarters and benefits from the most reliable distribution infrastructure in "
            "the Consumers service territory. General Motors' Orion Assembly transition to "
            "the Orion EV Hub and the Delta Township Lansing Assembly plant are the largest "
            "industrial load drivers; their scheduled partial retirements in 2026–28 will free "
            "substantial substation capacity. Michigan's MEDC Data Center Incentive (MCL 211.9o) "
            "provides full personal-property tax exemption for data-center equipment qualifying "
            "under MCL 211.9(p); the Lansing-East Lansing Metropolitan Area is a MEDC Gigabit "
            "Community with Comcast Business, AT&T Business Fiber, and Consumers Energy fiber. "
            "Delta Township's Master Plan designates the I-496/I-69 interchange as a Technology "
            "Industrial Corridor eligible for 12-year Neighborhood Enterprise Zone (NEZ) "
            "real-property tax abatement under Michigan PA 147 of 1992."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Consumers Energy HQ; GM load retirement 2026-28 frees capacity; MCL 211.9o; NEZ abatement.",
        "sources": [
            {"label": "MEDC — Data Center Incentive (MCL 211.9o)",
             "url": "https://www.michiganbusiness.org/grow/incentives/data-centers/"},
            {"label": "Consumers Energy — Economic Development",
             "url": "https://www.consumersenergy.com/business/economic-development"},
            {"label": "Eaton County — Planning & Zoning",
             "url": "https://www.eatoncounty.org/planning-zoning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Minnesota
    {
        "fips": "27003",
        "name": "Anoka County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Anoka County MN — Xcel Energy North Metro Hub, Minn. Stat. §297A.68 Subd. 42 Tax Exemption",
        "description": (
            "Anoka County (Blaine/Coon Rapids, MN) anchors the northern Twin Cities metro and "
            "benefits from Xcel Energy (Northern States Power) 345/115 kV infrastructure at "
            "the Coon Rapids and Blaine substations, both recently upgraded under the Xcel "
            "2040 Grid Modernization Plan. Minnesota's data-center sales-and-use tax exemption "
            "(Minn. Stat. §297A.68, subd. 42) exempts qualifying computer equipment, cooling, "
            "and backup power systems from Minnesota sales tax for data centers with a minimum "
            "$30 million capital investment; Anoka County has an active pipeline of certified "
            "industrial sites along I-35W and US-10 corridors. The Greater MSP Economic "
            "Development Partnership coordinates state Cooperative Agreement grants from "
            "DEED (Minn. Stat. §116J.994) for qualifying technology investments. Fiber "
            "infrastructure includes Zayo, CenturyLink/Lumen, and the CONNECT Minnesota "
            "middle-mile backbone."
        ),
        "effective_date": "2017-01-01",
        "status": "active",
        "notes": "Xcel 345/115kV hub; Minn. §297A.68 subd.42 ST exemption; Greater MSP DEED grants.",
        "sources": [
            {"label": "Minnesota Legislature — §297A.68 Subd. 42 Data Center Tax Exemption",
             "url": "https://www.revisor.mn.gov/statutes/cite/297A.68"},
            {"label": "Greater MSP Economic Development Partnership",
             "url": "https://www.greatermsp.org/"},
            {"label": "Xcel Energy — Data Center Solutions",
             "url": "https://www.xcelenergy.com/company/rates_and_regulations/transmission/interconnection_requests"},
            {"label": "Anoka County — Economic Development",
             "url": "https://www.anokacounty.us/375/Planning"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "27163",
        "name": "Washington County",
        "state": "Minnesota",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Washington County MN — East Metro St. Paul Xcel Energy Hub & MN §297A.68 Subd. 42",
        "description": (
            "Washington County (Stillwater/Woodbury, MN) is Minnesota's fastest-growing county "
            "and the eastern gateway of the Twin Cities metro along the St. Croix River corridor. "
            "Xcel Energy (Northern States Power) serves the county from the Newport 345 kV "
            "substation and the Lake Elmo 115 kV substation, both with available capacity for "
            "new large industrial loads through 2027. Minnesota's §297A.68 subd. 42 data-center "
            "tax exemption applies to qualifying investments in Washington County; the county's "
            "proximity to downtown St. Paul provides access to the statewide 'MnSCU fiber ring' "
            "and DEED's Broadband Development Office infrastructure grants. Washington County's "
            "I-494/I-694 corridor has multiple shovel-ready industrial sites with existing "
            "three-phase power, water, and fiber certified by the Greater MSP Partnership. "
            "The county's TIF districts (Oakdale, Woodbury) offer up to 26-year tax increment "
            "financing under Minn. Stat. §469.174 for qualifying economic development projects."
        ),
        "effective_date": "2017-01-01",
        "status": "active",
        "notes": "Xcel Newport 345kV; MN §297A.68 ST exemption; TIF §469.174 up to 26 yr; MnSCU fiber.",
        "sources": [
            {"label": "Minnesota Legislature — Minn. Stat. §469.174 Tax Increment Financing",
             "url": "https://www.revisor.mn.gov/statutes/cite/469.174"},
            {"label": "Washington County — Economic Development",
             "url": "https://www.co.washington.mn.us/290/Economic-Development"},
            {"label": "Greater MSP — Washington County Site Certification",
             "url": "https://www.greatermsp.org/"},
            {"label": "MN DEED — Technology Investment Grants (§116J.994)",
             "url": "https://mn.gov/deed/business/financing-business/deed-programs/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Iowa
    {
        "fips": "19113",
        "name": "Linn County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Linn County IA — Cedar Rapids MidAmerican Energy & Iowa Code §423.3(101) Data Center Exemption",
        "description": (
            "Linn County (Cedar Rapids, IA) is Iowa's second-largest metro and anchors the "
            "Cedar Rapids tech corridor alongside Johnson County. MidAmerican Energy (Berkshire "
            "Hathaway) serves Linn County from the Cedar Rapids 345/161 kV substations; "
            "MidAmerican's Iowa generation portfolio is over 90% wind-powered, providing among "
            "the lowest carbon-intensity electricity in the Midwest. Iowa Code §423.3(101) "
            "provides a full sales-tax exemption for data-center equipment (computer hardware, "
            "cooling systems, power conditioning) for qualifying projects of $1 million+. "
            "Linn County's Corridor Metropolitan Planning Organization (Corridor MPO) has "
            "certified multiple shovel-ready data-center sites in the Cedar Rapids metro. "
            "The Iowa Economic Development Authority (IEDA) High Quality Jobs (HQJ) program "
            "provides investment tax credits and direct financial assistance for qualifying "
            "technology-sector capital investments."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "MidAmerican 90%+ wind; Iowa §423.3(101) ST exemption $1M+; IEDA HQJ ITC; 345/161kV.",
        "sources": [
            {"label": "Iowa Code §423.3(101) — Data Center Sales Tax Exemption",
             "url": "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=423&session=90"},
            {"label": "Iowa Economic Development Authority — High Quality Jobs Program",
             "url": "https://www.iowaeda.com/grow/high-quality-jobs/"},
            {"label": "MidAmerican Energy — Economic Development",
             "url": "https://www.midamericanenergy.com/business/economic-development"},
            {"label": "Linn County — Economic Development",
             "url": "https://www.linncountyiowa.gov/1019/Economic-Development"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "19153",
        "name": "Polk County",
        "state": "Iowa",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Polk County IA — Des Moines Google/Microsoft/Meta Hyperscale Hub & Iowa §423.3(101) Exemption",
        "description": (
            "Polk County (Des Moines, IA) is Iowa's data-center capital and home to hyperscale "
            "facilities operated by Google, Microsoft, Meta, and Apple. MidAmerican Energy "
            "serves the county from the Neal South and Warren 345 kV substations; MidAmerican's "
            "portfolio transition to 100% renewable generation by 2030 (Iowa Utilities Board "
            "filing, Docket RMU-2012-0002) is a primary driver of hyperscale siting. Iowa Code "
            "§423.3(101) sales-tax exemption applies with no cap on investment size; Des Moines' "
            "robust IDOT-fiber backbone and Zayo/CenturyLink long-haul circuits provide sub-"
            "millisecond access to Chicago and Kansas City. Polk County's Data Center Overlay "
            "Zone (amended 2022) allows by-right data-center development in I-1 and I-2 zones "
            "with administrative site-plan review only (no public hearing), streamlining "
            "the typical 12-month permitting timeline to 60–90 days."
        ),
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Google/MSFT/Meta hyperscale; MidAmerican 100% renewable by 2030; Iowa §423.3(101); by-right I-1/I-2.",
        "sources": [
            {"label": "Iowa Code §423.3(101) — Data Center Exemption",
             "url": "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=423&session=90"},
            {"label": "Iowa Utilities Board — MidAmerican Energy IRP (Docket RMU-2012-0002)",
             "url": "https://iub.iowa.gov/"},
            {"label": "Greater Des Moines Partnership — Data Centers",
             "url": "https://www.dsmpartnership.com/growing-a-business/competitive-advantages/data-centers"},
            {"label": "Polk County Planning & Development",
             "url": "https://www.polkcountyiowa.gov/planning-development-zoning/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Kansas
    {
        "fips": "20091",
        "name": "Johnson County",
        "state": "Kansas",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Johnson County KS — Overland Park Evergy Data Center Hub & Kansas Economic Development Incentives",
        "description": (
            "Johnson County (Overland Park, KS) is the most populous county in Kansas and anchors "
            "the Kansas City metro's technology sector. Evergy Kansas Central serves the county "
            "via the Hawthorn, Merriam, and Quivira Road 345/138 kV substations; the Kansas City "
            "metro has substantial 345 kV import capacity from SPP's Southwest Power Pool grid. "
            "Kansas HB 2403 (2022) provides a 10-year personal-property tax exemption for "
            "qualifying data-center equipment; Johnson County additionally offers STAR Bond "
            "financing (K.S.A. 12-17,160) for tourism and technology facilities, and a "
            "Neighborhood Revitalization Act (NRA) real-property tax rebate for urban renewal "
            "areas. The Johnson County Economic Research Center tracks fiber infrastructure "
            "from Zayo, AT&T, and Google Fiber serving the I-35 and I-435 corridors."
        ),
        "effective_date": "2022-07-01",
        "status": "active",
        "notes": "Evergy 345/138kV SPP; KS HB 2403 10-yr PPT; STAR Bond K.S.A. 12-17,160; Google Fiber.",
        "sources": [
            {"label": "Kansas Legislature — HB 2403 (2022) Data Center PPT Exemption",
             "url": "https://www.kslegislature.org/li/b2021_22/measures/hb2403/"},
            {"label": "Johnson County Kansas — Economic Development",
             "url": "https://www.jocogov.org/dept/community-services/economic-development"},
            {"label": "Evergy — Economic Development & Large Load",
             "url": "https://www.evergy.com/business/economic-development"},
            {"label": "Kansas Commerce — Business Incentives",
             "url": "https://www.kansascommerce.gov/business-development/incentives/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Nebraska
    {
        "fips": "31153",
        "name": "Sarpy County",
        "state": "Nebraska",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Sarpy County NE — Papillion OPPD Data Center Hub & Nebraska LB 1020 Tax Exemption",
        "description": (
            "Sarpy County (Papillion/La Vista, NE) is Nebraska's fastest-growing county and "
            "hosts the state's densest concentration of hyperscale data-center investment. "
            "OPPD serves the county via the Schramm and Papillion 115 kV substations; OPPD's "
            "renewable energy portfolio (35% wind by 2024) and flat industrial rates make the "
            "county highly competitive. Nebraska LB 1020 (enacted 2024) provides a 100% personal-"
            "property tax exemption for qualifying data-center equipment and a sales-tax exemption "
            "on data-center construction materials and equipment for qualifying projects of $10M+. "
            "Sarpy County has designated the Platteview Road Technology Corridor as a Tax Increment "
            "Financing (TIF) eligible zone under Nebraska R.R.S. §18-2103. The Omaha-Council Bluffs "
            "fiber hub (CENIC, Zayo, CenturyLink/Lumen, Windstream) provides redundant long-haul "
            "connectivity to Chicago, Denver, and Kansas City."
        ),
        "effective_date": "2024-04-15",
        "status": "active",
        "notes": "OPPD 35% wind; NE LB 1020 100% PPT + ST exemption $10M+; TIF §18-2103; Omaha fiber hub.",
        "sources": [
            {"label": "Nebraska Legislature — LB 1020 (2024) Data Center Tax Exemption",
             "url": "https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=57137"},
            {"label": "OPPD — Economic Development Programs",
             "url": "https://www.oppd.com/business/economic-development/"},
            {"label": "Sarpy County — Economic Development",
             "url": "https://www.sarpy.gov/economic-development"},
            {"label": "Nebraska Department of Economic Development — Business Incentives",
             "url": "https://opportunity.nebraska.gov/programs/incentives/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "31109",
        "name": "Lancaster County",
        "state": "Nebraska",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Lancaster County NE — Lincoln Electric System Wind Power & Nebraska LB 1020 Exemption",
        "description": (
            "Lancaster County (Lincoln, NE) is served by the Lincoln Electric System (LES), "
            "a municipal utility with over 55% renewable energy in its 2024 generation mix "
            "from Nebraska's wind resources. LES has flat commercial/industrial rates and has "
            "won national awards for reliability (SAIDI/SAIFI metrics consistently in the top "
            "decile for U.S. utilities). Nebraska LB 1020 (2024) applies to LES-served "
            "data centers as well as investor-owned utilities; the Lincoln Partnership for "
            "Economic Development (LPED) maintains a pipeline of certified industrial sites "
            "along US-77 and I-80 corridors. Lancaster County's Antelope Valley TIF district "
            "(Lincoln City Ordinance 20563) provides up to 15-year tax increment financing "
            "for qualifying urban tech investments. University of Nebraska–Lincoln (UNL) "
            "HPC connectivity and talent pipeline are additional advantages."
        ),
        "effective_date": "2024-04-15",
        "status": "active",
        "notes": "LES municipal utility 55%+ wind; NE LB 1020; LPED certified sites; UNL HPC pipeline.",
        "sources": [
            {"label": "Lincoln Electric System — Commercial & Industrial Rates",
             "url": "https://www.les.com/commercial-industrial"},
            {"label": "Nebraska Legislature — LB 1020 (2024)",
             "url": "https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=57137"},
            {"label": "Lincoln Partnership for Economic Development (LPED)",
             "url": "https://www.lincolnpartnership.org/"},
            {"label": "Nebraska DED — Business Incentives",
             "url": "https://opportunity.nebraska.gov/programs/incentives/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Montana
    {
        "fips": "30029",
        "name": "Flathead County",
        "state": "Montana",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Flathead County MT — Kalispell NorthWestern Energy Hydro & Montana No Sales Tax Advantage",
        "description": (
            "Flathead County (Kalispell, MT) is served by NorthWestern Energy from the Polson "
            "and Kalispell 115 kV substations fed from Kerr/Salish Kootenai Dam hydroelectric "
            "and the Flathead River hydro complex. Montana has no state sales tax, which "
            "eliminates equipment-purchase costs that burden data-center projects in most states. "
            "Montana's Business Equipment Tax Exemption (MCA §15-8-111) exempts manufacturing "
            "and technology equipment under $3 million value from property tax; larger data-"
            "center investments file for a 50% reduction under MCA §15-6-138 (new industrial "
            "property). Flathead County's Economic Development Office coordinates the Glacier "
            "Gateway Enterprise Zone (GGEZ), which provides state income-tax credits to "
            "qualifying new or expanding businesses. Cool ambient temperatures (annual average "
            "44°F) allow free-air economization for up to 8,500 hours per year, among the "
            "highest in the contiguous U.S."
        ),
        "effective_date": "2020-01-01",
        "status": "active",
        "notes": "No MT sales tax; MCA §15-8-111 PPT exemption; NorthWestern hydro; GGEZ ITC; 8,500 hr free-air.",
        "sources": [
            {"label": "Montana Code Annotated — MCA §15-8-111 Business Equipment Tax",
             "url": "https://leg.mt.gov/bills/mca/title_0150/chapter_0080/part_0010/section_0110/0150-0080-0010-0110.html"},
            {"label": "Montana Department of Commerce — Business Tax Incentives",
             "url": "https://business.mt.gov/Resources/Tax-Incentives"},
            {"label": "NorthWestern Energy — Economic Development",
             "url": "https://www.northwesternenergy.com/business/economic-development"},
            {"label": "Flathead County — Economic Development",
             "url": "https://www.flathead.mt.gov/economicdevelopment/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    {
        "fips": "30049",
        "name": "Lewis and Clark County",
        "state": "Montana",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Lewis and Clark County MT — Helena State Government HPC & NorthWestern Missouri River Hydro",
        "description": (
            "Lewis and Clark County (Helena, MT) is Montana's seat of government and home to "
            "the Montana State Data Center (MSDC), which provides co-location and cloud services "
            "to all state agencies under the Montana Department of Administration Enterprise IT "
            "Services Bureau. NorthWestern Energy serves Helena from the Canyon Ferry Dam "
            "hydroelectric facility (70 MW, Missouri River) via the Helena 115 kV transmission "
            "ring. Montana's no-sales-tax and MCA §15-8-111 property-tax exemption apply to "
            "qualifying data-center equipment investments. The Helena Foreign Trade Zone (FTZ "
            "No. 114, grantee: Lewis and Clark County) eliminates customs duties on imported "
            "server and storage equipment. The University of Montana and Montana Tech research "
            "networks provide state-agency fiber connectivity; Lewis and Clark County's "
            "Technology Business Development zone provides property-tax abatement for 5 years."
        ),
        "effective_date": "2019-01-01",
        "status": "active",
        "notes": "MT MSDC state co-lo; Canyon Ferry 70MW hydro; FTZ No. 114; no MT sales tax; §15-8-111.",
        "sources": [
            {"label": "Montana Department of Administration — MSDC Enterprise IT Services",
             "url": "https://doa.mt.gov/Information-Technology/About-SITSD/Enterprise-IT-Services"},
            {"label": "Montana Code Annotated — MCA §15-8-111",
             "url": "https://leg.mt.gov/bills/mca/title_0150/chapter_0080/part_0010/section_0110/0150-0080-0010-0110.html"},
            {"label": "NorthWestern Energy — Economic Development (Helena)",
             "url": "https://www.northwesternenergy.com/business/economic-development"},
            {"label": "Lewis and Clark County — Economic Development",
             "url": "https://www.lccountymt.gov/planning/economic-development.html"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # Idaho
    {
        "fips": "16001",
        "name": "Ada County",
        "state": "Idaho",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Ada County ID — Boise Metro Idaho Power Capacity, Micron HPC Adjacent & Idaho SBOE Data Center Incentive",
        "description": (
            "Ada County (Boise, ID) is Idaho's largest county and home to Micron Technology "
            "HQ, HP Inc., and a growing hyperscale data-center sector. Idaho Power "
            "serves Ada County from the Boise Bench and Vista 230/138 kV substations; "
            "the 2024 Idaho PUC IRP (Case IPC-E-24-12) identifies the Ada County grid as "
            "capacity-constrained but authorizes $400M in Treasure Valley transmission "
            "upgrades through 2030. Idaho's Data Center Incentive Program (Idaho Code "
            "§63-3622O) provides a full sales-tax exemption on qualifying data-center "
            "equipment for projects with $1M+ capital investment. The Boise Valley Economic "
            "Partnership (BVEP) offers site-certification assistance and coordinates with "
            "IGEM (Idaho Governor's Emergency Fund) for large capital projects. Ada County "
            "real-property tax abatements are available under Idaho Code §63-4502 for "
            "qualifying new construction in enterprise zones."
        ),
        "effective_date": "2016-01-01",
        "status": "active",
        "notes": "Idaho §63-3622O ST exemption $1M+; Idaho PUC IPC-E-24-12 $400M upgrades; BVEP certified sites.",
        "sources": [
            {"label": "Idaho Legislature — Idaho Code §63-3622O Data Center Sales Tax Exemption",
             "url": "https://legislature.idaho.gov/statutesrules/idstat/Title63/T63CH36/SECT63-3622O/"},
            {"label": "Idaho PUC — Case IPC-E-24-12 (Idaho Power IRP 2024)",
             "url": "https://puc.idaho.gov/"},
            {"label": "Boise Valley Economic Partnership (BVEP)",
             "url": "https://www.bvep.org/"},
            {"label": "Ada County — Economic Development",
             "url": "https://adacounty.id.gov/development-services/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # North Dakota
    {
        "fips": "38015",
        "name": "Burleigh County",
        "state": "North Dakota",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Burleigh County ND — Bismarck MDU Resources, NDCC §57-39.2-04.9 Exemption & No State Income Tax",
        "description": (
            "Burleigh County (Bismarck, ND) is North Dakota's capital county and seat of state "
            "government, served primarily by Montana-Dakota Utilities (MDU Resources) from the "
            "Bismarck 230 kV substation. North Dakota's data-center sales-tax exemption "
            "(NDCC §57-39.2-04.9) provides a full exemption from the state's 5% sales tax on "
            "server hardware, networking equipment, cooling systems, and other qualified "
            "data-center property for projects exceeding $2 million. North Dakota has no "
            "corporate income tax (eliminated 2023 for most corporations under SB 2001) and "
            "no personal income tax as of 2024, creating one of the lowest state tax burdens "
            "in the nation for data-center operators. The Bismarck-Mandan EDC certifies "
            "industrial sites along I-94 with available three-phase power and fiber. MDU "
            "Resources offers renewable wind energy certificates from its North Dakota "
            "wind farms at competitive rates."
        ),
        "effective_date": "2019-07-01",
        "status": "active",
        "notes": "NDCC §57-39.2-04.9 5% ST exemption $2M+; no ND corp income tax (SB 2001 2023); MDU 230kV.",
        "sources": [
            {"label": "North Dakota Legislature — NDCC §57-39.2-04.9 Data Center Exemption",
             "url": "https://www.legis.nd.gov/cencode/t57c39-2.html"},
            {"label": "North Dakota Commerce — Business Incentives",
             "url": "https://www.commerce.nd.gov/economic-development/business-incentives"},
            {"label": "MDU Resources / Montana-Dakota Utilities — Economic Development",
             "url": "https://www.montanadakota.com/economic-development/"},
            {"label": "Bismarck-Mandan EDC",
             "url": "https://www.bismarckmanandevelopment.com/"},
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": False,
        "last_reviewed": None,
    },

    # South Dakota
    {
        "fips": "46011",
        "name": "Brookings County",
        "state": "South Dakota",
        "level": -1,
        "types": ["data_center", "incentive"],
        "title": "Brookings County SD — SDSU Research Park, Northwestern Energy Wind & SD No Income Tax Advantage",
        "description": (
            "Brookings County (Brookings, SD) is home to South Dakota State University (SDSU) "
            "and the Innovation Campus, a NSF-designated research park with direct fiber "
            "to Internet2 and SDSMT fiber networks. Northwestern Energy serves the county "
            "from the Brookings 115 kV substation with access to South Dakota's substantial "
            "wind energy resources; the county sits in one of the highest-capacity wind "
            "corridors in the nation (Class 6/7 winds along I-29). South Dakota levies no "
            "corporate income tax, no personal income tax, and has no inheritance or estate "
            "tax; combined with the SD Property Tax Exemption for new manufacturing and "
            "technology facilities (SDCL §10-6-35.25, 5-year new construction abatement), "
            "Brookings County offers among the lowest operating-cost tax profiles nationally. "
            "The Brookings Economic Development Corporation (BEDC) coordinates with SD GOED "
            "(Governor's Office of Economic Development) for Revolving Economic Development "
            "and Initiative (REDI) Fund financing."
        ),
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "SDSU Internet2; SD no income/corp tax; SDCL §10-6-35.25 5-yr construction abatement; Class 6/7 wind.",
        "sources": [
            {"label": "SD Legislature — SDCL §10-6-35.25 Property Tax Exemption",
             "url": "https://sdlegislature.gov/Statutes/Codified_Laws/DisplayStatute.aspx?Type=Statute&Statute=10-6-35.25"},
            {"label": "SD GOED — Business Incentives & REDI Fund",
             "url": "https://sdgoed.com/programs-incentives/"},
            {"label": "Northwestern Energy — SD Economic Development",
             "url": "https://www.northwesternenergy.com/business/economic-development"},
            {"label": "Brookings Economic Development Corporation (BEDC)",
             "url": "https://www.brookingssdc.com/"},
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
        "id": "ai-oh-007",
        "name": "Intel Ohio One Semiconductor Fab & AI HPC Campus — Licking County OH",
        "operator": "Intel Corporation",
        "status": "under_construction",
        "county_fips": "39089",
        "notes": (
            "Intel's $20B Ohio One fab (New Albany, OH); 2×1,000-acre fabs planned. "
            "On-site AI-accelerated EUV lithography control, yield-prediction ML, "
            "and fab digital-twin HPC. AEP Ohio $300M+ transmission buildout."
        ),
        "lon": -82.7924,
        "lat": 40.0820,
    },
    {
        "id": "ai-mi-004",
        "name": "Ford Dearborn AI Research Center & ADAS Simulation — Wayne County MI",
        "operator": "Ford Motor Company",
        "status": "operational",
        "county_fips": "26163",
        "notes": (
            "Ford Michigan Central innovation campus (Corktown, Detroit) and Dearborn "
            "Product Development Center AI lab. ADAS simulation, digital-twin vehicle "
            "testing, battery AI, and manufacturing yield modeling. DTE Energy served."
        ),
        "lon": -83.2110,
        "lat": 42.3223,
    },
    {
        "id": "ai-mi-005",
        "name": "General Motors Global Technical Center AI & Ultium EV Simulation — Oakland County MI",
        "operator": "General Motors Company",
        "status": "operational",
        "county_fips": "26125",
        "notes": (
            "GM Warren Technical Center (Warren, MI) AI campus: Ultium battery simulation, "
            "autonomous Cruise perception ML, manufacturing AI for assembly plants. "
            "DTE Energy served. World's largest private R&D campus by land area."
        ),
        "lon": -83.0277,
        "lat": 42.5064,
    },
    {
        "id": "ai-mn-006",
        "name": "Mayo Clinic AI & Clinical Decision Support Platform — Olmsted County MN",
        "operator": "Mayo Clinic",
        "status": "operational",
        "county_fips": "27109",
        "notes": (
            "Mayo Clinic Rochester AI platform: clinical NLP, radiology AI (CT/MRI), "
            "genomics HPC (Mayo/Google Cloud partnership), federated-learning clinical trials. "
            "Mayo Clinic Data Science and AI program, Xcel Energy served."
        ),
        "lon": -92.4557,
        "lat": 44.0219,
    },
    {
        "id": "ai-ia-005",
        "name": "Google Council Bluffs & Altoona Hyperscale AI Data Centers — Pottawattamie & Polk Counties IA",
        "operator": "Google LLC",
        "status": "operational",
        "county_fips": "19155",
        "notes": (
            "Google has invested $3B+ in Iowa data centers. Council Bluffs campus: "
            "6 buildings, 1.2M sq ft, 100% renewable MidAmerican wind. AI inference/training "
            "for Google Search, YouTube, Cloud AI. Iowa §423.3(101) ST exemption beneficiary."
        ),
        "lon": -95.8608,
        "lat": 41.2619,
    },
    {
        "id": "ai-ne-001",
        "name": "PayPal / Gallup / First Data Omaha Fintech AI Center — Douglas County NE",
        "operator": "PayPal Holdings / Multiple operators",
        "status": "operational",
        "county_fips": "31055",
        "notes": (
            "Omaha is a national back-office and fintech AI hub: PayPal Omaha Technology Center, "
            "Gallup AI analytics HQ, First Data/Fiserv payment-processing AI. OPPD served. "
            "NE LB 1020 PPT exemption; Berkshire Hathaway financial AI adjacent."
        ),
        "lon": -95.9345,
        "lat": 41.2565,
    },
    {
        "id": "ai-ne-002",
        "name": "Union Pacific Railroad AI Operations Center — Douglas County NE",
        "operator": "Union Pacific Railroad",
        "status": "operational",
        "county_fips": "31055",
        "notes": (
            "Union Pacific's Omaha HQ hosts its AI Operations Center: locomotive predictive "
            "maintenance, network-flow optimization, precision-scheduled railroading AI. "
            "One of the largest private AI deployments in logistics. OPPD served."
        ),
        "lon": -95.9306,
        "lat": 41.2523,
    },
    {
        "id": "ai-mt-002",
        "name": "Montana State University AI Research & SSEL Computing Lab — Gallatin County MT",
        "operator": "Montana State University",
        "status": "operational",
        "county_fips": "30031",
        "notes": (
            "MSU Bozeman Space Science and Engineering Lab (SSEL) AI: CubeSat ML, wildfire-"
            "spread prediction (USFS partnership), agricultural AI (soil-moisture, yield). "
            "NorthWestern Energy served. MTEC SmartZone tech-transfer for AI spinouts."
        ),
        "lon": -111.0494,
        "lat": 45.6669,
    },
    {
        "id": "ai-id-003",
        "name": "Micron Technology Boise HQ AI & Memory-Optimized ML Research — Ada County ID",
        "operator": "Micron Technology Inc.",
        "status": "operational",
        "county_fips": "16001",
        "notes": (
            "Micron Boise HQ campus: DRAM/NAND AI design automation (DFM, yield AI), "
            "memory-centric computing research (AI-DRAM), fab simulation HPC. Idaho Power "
            "served. Adjacent to Boise Airport; US-20/26 fiber corridor."
        ),
        "lon": -116.3635,
        "lat": 43.6187,
    },
    {
        "id": "ai-ks-004",
        "name": "USDA Agricultural Research Service Plains Area AI Hub — Sedgwick County KS",
        "operator": "USDA Agricultural Research Service (ARS)",
        "status": "operational",
        "county_fips": "20173",
        "notes": (
            "USDA ARS Hard Winter Wheat Genetics Research Unit (Wichita/Manhattan, KS): "
            "AI for wheat-genome trait prediction, drought-tolerance ML, precision-irrigation "
            "optimization for the Ogallala Aquifer region. Evergy served."
        ),
        "lon": -97.3301,
        "lat": 37.6922,
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
