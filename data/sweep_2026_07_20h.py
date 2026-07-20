#!/usr/bin/env python3
"""
Sweep H — 2026-07-20 — County additions N–Z
Adds incentive / restriction entries for New York, North Carolina, Ohio,
Oklahoma, Tennessee, Texas, Virginia, and Wisconsin.
Idempotent: skips any FIPS or campus ID already present in the database.
"""

import json

DATA_PATH = "data"

with open(f"{DATA_PATH}/restrictions_raw.json") as f:
    data = json.load(f)
restrictions = data["restrictions"]
existing_fips = {e["fips"] for e in restrictions}

with open(f"{DATA_PATH}/ai_campuses.json") as f:
    cdata = json.load(f)
campuses = cdata["ai_campuses"]
existing_cids = {c["id"] for c in campuses}

new_entries = [
    # ── NEW YORK ──────────────────────────────────────────────────────────────
    # NYC DEP watershed restriction counties
    {
        "fips": "36025", "name": "Delaware County", "state": "New York",
        "level": 2, "types": ["water", "land_use"],
        "title": "NYC DEP Catskill/Delaware Watershed Use Restrictions",
        "description": "Delaware County lies within the NYC Delaware watershed. NYC DEP regulations under 10 NYCRR Part 128 restrict impervious surface, wastewater discharge, and stormwater management for facilities exceeding 10,000 sq ft, requiring DEP approval and mitigation measures for large-scale data center development.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "NYC DEP Watershed Rules and Regulations (10 NYCRR Part 128) apply to all development in the NYC watershed. Large data centers may need Stormwater Pollution Prevention Plans (SWPPP) reviewed by DEP.",
        "sources": [
            {"label": "NYC DEP Watershed Rules and Regulations", "url": "https://www.nyc.gov/site/dep/water/watershed-rules-and-regulations.page"},
            {"label": "10 NYCRR Part 128 – NYC Water Supply Watershed Rules", "url": "https://www.dec.ny.gov/regulations/4590.html"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "36039", "name": "Greene County", "state": "New York",
        "level": 2, "types": ["water", "land_use"],
        "title": "NYC DEP Catskill Watershed Use Restrictions",
        "description": "Greene County encompasses Catskill watershed headwaters feeding the Ashokan Reservoir. NYC DEP regulations under 10 NYCRR Part 128 impose strict impervious surface limits, phosphorus TMDL requirements, and mandatory stormwater review for large commercial developments including data centers.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "Schoharie and Catskill Creek headwaters subject to enhanced DEP review. Ashokan Reservoir recharge zone.",
        "sources": [
            {"label": "NYC DEP Watershed Rules and Regulations", "url": "https://www.nyc.gov/site/dep/water/watershed-rules-and-regulations.page"},
            {"label": "Catskill/Delaware Watershed – NYS DEC", "url": "https://www.dec.ny.gov/lands/5265.html"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "36095", "name": "Schoharie County", "state": "New York",
        "level": 3, "types": ["water", "land_use"],
        "title": "NYC DEP Schoharie Reservoir Restricted Development Zone",
        "description": "Schoharie County is the primary source watershed for the Schoharie Reservoir (Gilboa Dam), feeding the Catskill Aqueduct. NYC DEP exercises stringent development restrictions under 10 NYCRR Part 128 including mandatory DEP site plan review, prohibitions on certain industrial uses, and phosphorus discharge limits that effectively preclude large data center cooling tower operations without extensive permitting.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "Schoharie Reservoir supplies roughly 25% of NYC water supply. Highest DEP restriction tier. Large data centers (>25,000 sq ft) subject to full Environmental Impact Review.",
        "sources": [
            {"label": "NYC DEP Watershed Rules and Regulations", "url": "https://www.nyc.gov/site/dep/water/watershed-rules-and-regulations.page"},
            {"label": "NYC DEP Filtration Avoidance Determination – Catskill/Delaware", "url": "https://www.nyc.gov/site/dep/water/filtration-avoidance-determination.page"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "36105", "name": "Sullivan County", "state": "New York",
        "level": 1, "types": ["water", "land_use"],
        "title": "NYC DEP Delaware Watershed Partial Restrictions",
        "description": "Sullivan County contains portions of the Delaware watershed (Rondout and Neversink Reservoir recharge zones). NYC DEP regulations under 10 NYCRR Part 128 require stormwater management plan approval for commercial facilities over 10,000 sq ft. Northern portions of the county fall outside the watershed and are unrestricted.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "Neversink and Rondout Reservoirs within Sullivan County. Partial watershed coverage — southern portions outside DEP jurisdiction.",
        "sources": [
            {"label": "NYC DEP Watershed Rules and Regulations", "url": "https://www.nyc.gov/site/dep/water/watershed-rules-and-regulations.page"},
            {"label": "Rondout/Neversink Watershed Maps – NYC DEP", "url": "https://www.nyc.gov/site/dep/water/watershed-maps.page"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # NY incentive counties — NYPA ReCharge NY + Excelsior Jobs Program
    {
        "fips": "36003", "name": "Allegany County", "state": "New York",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NY Excelsior Jobs Program & NYPA ReCharge NY – Southern Tier",
        "description": "Allegany County qualifies for New York's Excelsior Jobs Program (N-Y Tax Law §31) providing refundable tax credits up to 6.85% of wages, plus NYPA ReCharge NY hydropower allocation for large loads. Empire State Development (ESD) REDC designates Southern Tier as a priority region for data center recruitment.",
        "effective_date": "2011-01-01", "status": "active",
        "notes": "Southern Tier Regional Economic Development Council priority designation. NYPA hydropower available for facilities exceeding 1 MW load.",
        "sources": [
            {"label": "NY Excelsior Jobs Program – Empire State Development", "url": "https://esd.ny.gov/excelsior-jobs-program"},
            {"label": "NYPA ReCharge New York Program", "url": "https://www.nypa.gov/services/recharge-ny"},
            {"label": "NY Tax Law §31 – Excelsior Jobs Tax Credit", "url": "https://www.tax.ny.gov/bus/excelsior/excelsior_jobs_program.htm"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "36009", "name": "Cattaraugus County", "state": "New York",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NY Excelsior Jobs Program & NYPA ReCharge NY – Western NY",
        "description": "Cattaraugus County in Western New York qualifies for Excelsior Jobs Program credits and NYPA ReCharge NY low-cost hydropower from the Niagara Project. National Grid provides transmission infrastructure. County offers sales tax exemption on energy for qualifying commercial uses.",
        "effective_date": "2011-01-01", "status": "active",
        "notes": "Buffalo-Niagara REDC region. NYPA Niagara power allocation available for qualifying large loads.",
        "sources": [
            {"label": "NY Excelsior Jobs Program – Empire State Development", "url": "https://esd.ny.gov/excelsior-jobs-program"},
            {"label": "NYPA ReCharge New York Program", "url": "https://www.nypa.gov/services/recharge-ny"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "36011", "name": "Cayuga County", "state": "New York",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NY Central NY REDC Excelsior Jobs Program",
        "description": "Cayuga County qualifies under the Central New York REDC strategic plan for data center recruitment. Excelsior Jobs Program provides wage, investment, and R&D tax credits (N-Y Tax Law §§31–36). National Grid transmission access. Proximity to the CNY Biotech Accelerator and emerging tech corridor.",
        "effective_date": "2011-01-01", "status": "active",
        "notes": "Central New York Regional Economic Development Council priority area. Finger Lakes adjacent with available industrial sites.",
        "sources": [
            {"label": "NY Excelsior Jobs Program – Empire State Development", "url": "https://esd.ny.gov/excelsior-jobs-program"},
            {"label": "NYPA ReCharge New York Program", "url": "https://www.nypa.gov/services/recharge-ny"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── NORTH CAROLINA ────────────────────────────────────────────────────────
    {
        "fips": "37045", "name": "Cleveland County", "state": "North Carolina",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NC Data Center Sales Tax Exemption – Cleveland County (Tier 2)",
        "description": "Cleveland County (Shelby) is eligible for North Carolina's data center sales tax exemption under N.C. Gen. Stat. §105-164.13(55). Designated Tier 2 under the NC development tier system, providing enhanced JDIG multiplier and additional OneNC Fund match. Duke Energy Carolinas provides industrial power. County EDC offers property tax incentive grants under G.S. §158-7.1.",
        "effective_date": "2007-01-01", "status": "active",
        "notes": "Tier 2 county enhances JDIG value. Former textile manufacturing sites provide available large-footprint industrial land.",
        "sources": [
            {"label": "NC Data Center Sales Tax Exemption – NCDOR", "url": "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-technical-bulletins/data-centers"},
            {"label": "N.C. Gen. Stat. §105-164.13(55) – Data Center Exemption", "url": "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-164.13.html"},
            {"label": "NC Development Tier Designations", "url": "https://www.nccommerce.com/grants-incentives/nc-county-tier-designations"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "37089", "name": "Henderson County", "state": "North Carolina",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NC Data Center Sales Tax Exemption – Henderson County",
        "description": "Henderson County (Hendersonville) eligible for NC §105-164.13(55) data center sales tax exemption. Duke Energy Carolinas provides industrial power in the Western NC mountains. Proximity to the Asheville tech corridor and Blue Ridge Parkway. County EDC offers local incentive grants.",
        "effective_date": "2007-01-01", "status": "active",
        "notes": "Western NC mountain climate provides natural cooling advantage. Duke Energy Progress service territory.",
        "sources": [
            {"label": "NC Data Center Sales Tax Exemption – NCDOR", "url": "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-technical-bulletins/data-centers"},
            {"label": "Henderson County EDC", "url": "https://www.hendersoncountync.gov/economic-development"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "37171", "name": "Surry County", "state": "North Carolina",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "NC Data Center Sales Tax Exemption – Surry County (Tier 2)",
        "description": "Surry County (Mount Airy, Dobson) eligible for NC §105-164.13(55) data center sales tax exemption. Designated Tier 2 with enhanced JDIG multiplier. Duke Energy Carolinas and Surry-Yadkin Electric Membership Corporation provide power. Available rural industrial parcels with Blue Ridge Mountain proximity.",
        "effective_date": "2007-01-01", "status": "active",
        "notes": "Tier 2 county. Northern Piedmont agricultural land with available large sites and transmission access.",
        "sources": [
            {"label": "NC Data Center Sales Tax Exemption – NCDOR", "url": "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-technical-bulletins/data-centers"},
            {"label": "NC Commerce JDIG Program", "url": "https://www.nccommerce.com/grants-incentives/jdig"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── OHIO ──────────────────────────────────────────────────────────────────
    {
        "fips": "39097", "name": "Madison County", "state": "Ohio",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Ohio Data Center Sales Tax Exemption – Madison County",
        "description": "Madison County (London, West Jefferson) eligible for Ohio ORC §5739.02(B)(42a) data center equipment sales tax exemption. Located on the I-70 corridor west of Columbus with AEP Ohio high-voltage transmission capacity. Ohio Job Creation Tax Credit (JCTC) available for qualifying operations.",
        "effective_date": "2009-01-01", "status": "active",
        "notes": "I-70 corridor with large available parcels and AEP Ohio 138kV/345kV transmission infrastructure west of Columbus.",
        "sources": [
            {"label": "ORC §5739.02(B)(42a) – Ohio Data Center Sales Tax Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ohio Job Creation Tax Credit – ODSA", "url": "https://development.ohio.gov/business/business-incentives/job-creation-tax-credit"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "39109", "name": "Miami County", "state": "Ohio",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Ohio Data Center Sales Tax Exemption – Miami County (Dayton Metro)",
        "description": "Miami County (Troy, Piqua) eligible for Ohio ORC §5739.02(B)(42a) data center equipment exemption. AES Ohio (Dayton Power and Light) provides industrial transmission north of Dayton. Ohio JCTC available. I-75 corridor between Dayton and Lima provides fiber access.",
        "effective_date": "2009-01-01", "status": "active",
        "notes": "Dayton metro north corridor. AES Ohio (DP&L) service territory with available transmission capacity.",
        "sources": [
            {"label": "ORC §5739.02(B)(42a) – Ohio Data Center Sales Tax Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ohio Job Creation Tax Credit – ODSA", "url": "https://development.ohio.gov/business/business-incentives/job-creation-tax-credit"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "39025", "name": "Clermont County", "state": "Ohio",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Ohio Data Center Sales Tax Exemption – Clermont County (Cincinnati East)",
        "description": "Clermont County (Milford, Batavia) eligible for Ohio ORC §5739.02(B)(42a) data center equipment exemption. Duke Energy Ohio provides transmission in this eastern Cincinnati suburb. Ohio JCTC and JobsOhio site development grants available for qualifying projects. I-275 beltway provides fiber corridor.",
        "effective_date": "2009-01-01", "status": "active",
        "notes": "Cincinnati eastern suburb with I-275 fiber corridor. Duke Energy Ohio transmission capacity available.",
        "sources": [
            {"label": "ORC §5739.02(B)(42a) – Ohio Data Center Sales Tax Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ohio Job Creation Tax Credit – ODSA", "url": "https://development.ohio.gov/business/business-incentives/job-creation-tax-credit"},
            {"label": "Clermont County EDC", "url": "https://www.clermontcountyohio.gov/economic-development"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "39165", "name": "Warren County", "state": "Ohio",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Ohio Data Center Sales Tax Exemption – Warren County (Mason)",
        "description": "Warren County (Mason, Lebanon, Springboro) eligible for Ohio ORC §5739.02(B)(42a) data center equipment exemption. Duke Energy Ohio provides industrial service in this fast-growing Cincinnati north suburb. Ohio JCTC and JobsOhio grants available. I-71 corridor fiber access.",
        "effective_date": "2009-01-01", "status": "active",
        "notes": "Mason is one of Ohio's fastest-growing tech employer bases. Duke Energy Ohio service; I-71/SR-741 industrial corridor.",
        "sources": [
            {"label": "ORC §5739.02(B)(42a) – Ohio Data Center Sales Tax Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ohio Job Creation Tax Credit – ODSA", "url": "https://development.ohio.gov/business/business-incentives/job-creation-tax-credit"},
            {"label": "Warren County Port Authority Economic Development", "url": "https://www.wcpa.org/business-development/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── OKLAHOMA ──────────────────────────────────────────────────────────────
    {
        "fips": "40039", "name": "Custer County", "state": "Oklahoma",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Oklahoma Quality Jobs & Data Center Exemption – Custer County",
        "description": "Custer County (Elk City, Clinton) eligible for Oklahoma Quality Jobs Program (68 O.S. §3601) providing 5% payroll rebate for 10 years, data center ad valorem exemption (68 O.S. §2902), and sales tax exemption on qualifying equipment (68 O.S. §1357.9). Western Farmers Electric Cooperative (WFEC) provides renewable wind-integrated power at competitive rates on the Oklahoma Panhandle Energy Corridor.",
        "effective_date": "2000-01-01", "status": "active",
        "notes": "Wind energy corridor — WFEC power mix includes significant wind generation. Available large parcels on I-40.",
        "sources": [
            {"label": "Oklahoma Quality Jobs Program – ODFA", "url": "https://www.oklahomaincentives.org/quality-jobs-program/"},
            {"label": "68 O.S. §1357.9 – Oklahoma Data Center Sales Tax Exemption", "url": "https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=94887"},
            {"label": "Oklahoma Dept of Commerce – Business Incentives", "url": "https://www.okcommerce.gov/doing-business/business-incentives/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "40053", "name": "Grady County", "state": "Oklahoma",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Oklahoma Quality Jobs & Data Center Exemption – Grady County",
        "description": "Grady County (Chickasha, Tuttle) eligible for Oklahoma Quality Jobs Program and data center ad valorem and sales tax exemptions. OG&E (Oklahoma Gas and Electric) provides industrial transmission south of OKC on I-44 corridor. Oklahoma Department of Commerce FastTrack program available.",
        "effective_date": "2000-01-01", "status": "active",
        "notes": "Oklahoma City southern suburb corridor. OG&E industrial service with available 138kV capacity on I-44.",
        "sources": [
            {"label": "Oklahoma Quality Jobs Program – ODFA", "url": "https://www.oklahomaincentives.org/quality-jobs-program/"},
            {"label": "68 O.S. §1357.9 – Oklahoma Data Center Sales Tax Exemption", "url": "https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=94887"},
            {"label": "Oklahoma Dept of Commerce – Business Incentives", "url": "https://www.okcommerce.gov/doing-business/business-incentives/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "40083", "name": "Logan County", "state": "Oklahoma",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Oklahoma Quality Jobs & Data Center Exemption – Logan County (Guthrie)",
        "description": "Logan County (Guthrie) eligible for Oklahoma Quality Jobs Program (68 O.S. §3601) and data center exemptions. OG&E provides industrial service in this OKC northern suburb. Oklahoma's former territorial capital Guthrie is seeing data center interest due to OKC metro adjacency and available land. Oklahoma EDGE grants available through Department of Commerce.",
        "effective_date": "2000-01-01", "status": "active",
        "notes": "OKC northern orbit, I-35 corridor. OG&E service territory adjacent to OKC metro transmission infrastructure.",
        "sources": [
            {"label": "Oklahoma Quality Jobs Program – ODFA", "url": "https://www.oklahomaincentives.org/quality-jobs-program/"},
            {"label": "68 O.S. §1357.9 – Oklahoma Data Center Sales Tax Exemption", "url": "https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=94887"},
            {"label": "Oklahoma Dept of Commerce – Business Incentives", "url": "https://www.okcommerce.gov/doing-business/business-incentives/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── TENNESSEE ─────────────────────────────────────────────────────────────
    {
        "fips": "47043", "name": "Dickson County", "state": "Tennessee",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Tennessee Qualified Data Center Act – Dickson County",
        "description": "Dickson County (Dickson) benefits from Tennessee's Qualified Data Center Act (T.C.A. §67-6-395) providing a 20-year sales and use tax exemption on equipment, cooling, and energy for qualifying data centers investing at least $100M. Tennessee Valley Authority (TVA) provides power through Cumberland Electric Membership Corporation. County offers PILOT agreements through the Industrial Development Board.",
        "effective_date": "2015-01-01", "status": "active",
        "notes": "NW Nashville orbit on I-40. TVA/CEMC power with available 115kV service points. PILOT agreements available from IDB.",
        "sources": [
            {"label": "T.C.A. §67-6-395 – Tennessee Qualified Data Center Act", "url": "https://law.justia.com/codes/tennessee/title-67/chapter-6/part-3/section-67-6-395/"},
            {"label": "Tennessee Dept of ECD FastTrack Infrastructure", "url": "https://www.tn.gov/ecd/topic/fasttrack-infrastructure-program.html"},
            {"label": "TVA Economic Development – Industrial Power", "url": "https://www.tva.com/energy/economic-development"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "47047", "name": "Fayette County", "state": "Tennessee",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Tennessee Qualified Data Center Act – Fayette County (Memphis East)",
        "description": "Fayette County (Somerville, Oakland) eligible for T.C.A. §67-6-395 Qualified Data Center Act 20-year tax exemption. Memphis Light, Gas and Water (MLGW) and TVA provide power in this growing Memphis eastern suburb. Tennessee FastTrack infrastructure grants available for site development.",
        "effective_date": "2015-01-01", "status": "active",
        "notes": "Memphis eastern suburban growth corridor. MLGW/TVA service. I-40 fiber route proximity.",
        "sources": [
            {"label": "T.C.A. §67-6-395 – Tennessee Qualified Data Center Act", "url": "https://law.justia.com/codes/tennessee/title-67/chapter-6/part-3/section-67-6-395/"},
            {"label": "Tennessee Dept of ECD FastTrack Infrastructure", "url": "https://www.tn.gov/ecd/topic/fasttrack-infrastructure-program.html"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "47073", "name": "Hawkins County", "state": "Tennessee",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Tennessee Qualified Data Center Act – Hawkins County (Tri-Cities)",
        "description": "Hawkins County (Rogersville, Church Hill) eligible for T.C.A. §67-6-395 Qualified Data Center Act. Holston Electric Cooperative (TVA power distributor) and Appalachian Power (AEP) serve the area. Tri-Cities Regional Airport (TRI) connectivity. Eastman Chemical Company workforce provides STEM talent pipeline.",
        "effective_date": "2015-01-01", "status": "active",
        "notes": "Tri-Cities metro (Kingsport/Johnson City/Bristol) talent pool from Eastman and Tennessee Eastman. Available industrial sites.",
        "sources": [
            {"label": "T.C.A. §67-6-395 – Tennessee Qualified Data Center Act", "url": "https://law.justia.com/codes/tennessee/title-67/chapter-6/part-3/section-67-6-395/"},
            {"label": "TVA Economic Development – Industrial Power", "url": "https://www.tva.com/energy/economic-development"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "47099", "name": "Lawrence County", "state": "Tennessee",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Tennessee Qualified Data Center Act – Lawrence County",
        "description": "Lawrence County (Lawrenceburg) eligible for T.C.A. §67-6-395 Qualified Data Center Act. Elk River Public Utility District and TVA provide power. Tennessee FastTrack infrastructure grants available. County is Tier 3 economically distressed, providing maximum state incentive eligibility.",
        "effective_date": "2015-01-01", "status": "active",
        "notes": "Tier 3 distressed county — maximum Tennessee FastTrack eligibility. Elk River PUD/TVA power. Available rural sites.",
        "sources": [
            {"label": "T.C.A. §67-6-395 – Tennessee Qualified Data Center Act", "url": "https://law.justia.com/codes/tennessee/title-67/chapter-6/part-3/section-67-6-395/"},
            {"label": "Tennessee Dept of ECD FastTrack Infrastructure", "url": "https://www.tn.gov/ecd/topic/fasttrack-infrastructure-program.html"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── TEXAS ─────────────────────────────────────────────────────────────────
    {
        "fips": "48015", "name": "Austin County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Austin County",
        "description": "Austin County (Sealy, Bellville) on the I-10 corridor between Houston and San Antonio is eligible for Texas Tax Code Ch.403 sales tax exemption on qualifying data center equipment. CenterPoint Energy provides transmission service. County offers Chapter 381 economic development agreements. Growing as Houston metro expands westward on I-10.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "I-10 Houston-San Antonio corridor midpoint. CenterPoint Energy service with available transmission capacity.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Texas Comptroller – Qualifying Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/publications/94-116.php"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "48071", "name": "Chambers County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Chambers County",
        "description": "Chambers County (Mont Belvieu, Baytown adjacent) on I-10 east of Houston eligible for Texas Tax Code Ch.403 data center sales tax exemption. CenterPoint Energy provides large industrial transmission. Mont Belvieu is a major petrochemical hub with significant existing industrial power infrastructure and fiber access from Houston.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "Mont Belvieu is a major NGL hub with heavy industrial power infrastructure. CenterPoint large industrial service available.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Chambers County EDC", "url": "https://chamberscountytx.gov/economic-development"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "48051", "name": "Burleson County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Burleson County",
        "description": "Burleson County (Caldwell, Somerville) adjacent to Bryan/College Station eligible for Texas Tax Code Ch.403 data center sales tax exemption. Oncor and Bluebonnet Electric Cooperative provide transmission. Proximity to Texas A&M University provides STEM workforce. Chapter 381 agreements available.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "College Station/Bryan metro adjacent. Texas A&M tech workforce pipeline. Oncor/Bluebonnet service territory.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Burleson County EDC", "url": "https://www.burlesoncountytx.com/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "48063", "name": "Camp County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Camp County (NE Texas)",
        "description": "Camp County (Pittsburg) in Northeast Texas eligible for Texas Tax Code Ch.403 data center sales tax exemption. SWEPCO (AEP Southwestern Electric Power) provides industrial transmission on the Arkansas-Louisiana-Texas power grid. Chapter 380/381 agreements available from county. NE Texas rural fiber routes along US-271.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "SWEPCO/AEP NE Texas service territory. Rural county with available large parcels and industrial zoning.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Texas Comptroller – Qualifying Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/publications/94-116.php"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "48159", "name": "Franklin County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Franklin County",
        "description": "Franklin County (Mount Vernon) in Northeast Texas eligible for Texas Tax Code Ch.403 data center sales tax exemption. SWEPCO (AEP) provides industrial transmission. Proximity to Lake Bob Sandlin provides cooling water access. Rural county with large available parcels on US-67.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "NE Texas rural corridor. SWEPCO/AEP service territory. Lake Bob Sandlin cooling water proximity.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Texas Comptroller – Qualifying Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/publications/94-116.php"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "48059", "name": "Callahan County", "state": "Texas",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Texas Ch.403 Data Center Exemption – Callahan County (Abilene East)",
        "description": "Callahan County (Baird) adjacent to Abilene is eligible for Texas Tax Code Ch.403 data center sales tax exemption. Oncor provides transmission in this West Texas corridor. County sits in one of Texas's premier wind energy zones with abundant renewable power access. Chapter 381 agreements available.",
        "effective_date": "2013-09-01", "status": "active",
        "notes": "West Texas wind energy corridor. Oncor 138kV/345kV transmission with substantial renewable integration.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
            {"label": "Texas Comptroller – Qualifying Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/publications/94-116.php"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── VIRGINIA ──────────────────────────────────────────────────────────────
    {
        "fips": "51045", "name": "Craig County", "state": "Virginia",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Virginia DCIG Data Center Investment Grant – Craig County",
        "description": "Craig County (New Castle) eligible for Virginia's Data Center Investment Grant (DCIG) under Va. Code §58.1-3851 providing sales and use tax exemption on data center purchases for qualifying investments. Appalachian Power (AEP) provides transmission. Designated Tier 3 (highest distress) under GO Virginia, providing maximum incentive eligibility and VEDP Rural Business Expansion grants.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "Tier 3 distressed county — maximum GO Virginia incentive eligibility. Appalachian Power AEP service territory with available rural sites.",
        "sources": [
            {"label": "Va. Code §58.1-3851 – Virginia Data Center Sales Tax Exemption", "url": "https://law.lis.virginia.gov/vacode/title58.1/chapter38/section58.1-3851/"},
            {"label": "GO Virginia Initiative – Regional Incentives", "url": "https://www.govirginia.org/incentives/"},
            {"label": "VEDP Data Center Incentives", "url": "https://www.vedp.org/incentive/data-center-sales-and-use-tax-exemptions"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "51089", "name": "Henry County", "state": "Virginia",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Virginia DCIG + Tobacco Commission Grants – Henry County",
        "description": "Henry County (Martinsville) eligible for Virginia's Data Center Investment Grant (DCIG) under Va. Code §58.1-3851. AEP Appalachian Power provides transmission. Virginia Tobacco Region Revitalization Commission (TRRC) grants additionally available for data center capital investments in this designated tobacco-transition county. GO Virginia distressed-region designation provides maximum incentive tier.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "Tobacco Region Opportunity Fund stacks with DCIG. Martinsville Speedway and former textile/furniture sites available as large-footprint industrial land.",
        "sources": [
            {"label": "Va. Code §58.1-3851 – Virginia Data Center Sales Tax Exemption", "url": "https://law.lis.virginia.gov/vacode/title58.1/chapter38/section58.1-3851/"},
            {"label": "Virginia Tobacco Commission Opportunity Fund", "url": "https://www.vatobaccocommission.org/grants/opportunity-fund/"},
            {"label": "VEDP Data Center Incentives", "url": "https://www.vedp.org/incentive/data-center-sales-and-use-tax-exemptions"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "51185", "name": "Tazewell County", "state": "Virginia",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Virginia DCIG + VCEDA – Tazewell County (SW Virginia)",
        "description": "Tazewell County (Bluefield, Tazewell) eligible for Virginia's Data Center Investment Grant (DCIG) under Va. Code §58.1-3851 and Virginia Coalfield Economic Development Authority (VCEDA) grants. Appalachian Power (AEP) provides transmission in Southwest Virginia's coalfield region. GO Virginia maximum distressed-area incentive tier applies.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "VCEDA Infrastructure Development Fund available for site preparation and utility extension. Maximum GO Virginia incentive tier. Bluefield College/Virginia Highlands CC provide workforce.",
        "sources": [
            {"label": "Va. Code §58.1-3851 – Virginia Data Center Sales Tax Exemption", "url": "https://law.lis.virginia.gov/vacode/title58.1/chapter38/section58.1-3851/"},
            {"label": "VCEDA – Coalfield Economic Development Authority", "url": "https://www.vceda.us/business-investment/"},
            {"label": "VEDP Data Center Incentives", "url": "https://www.vedp.org/incentive/data-center-sales-and-use-tax-exemptions"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "51195", "name": "Wise County", "state": "Virginia",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Virginia DCIG + VCEDA – Wise County (SW Virginia Coalfields)",
        "description": "Wise County (Norton, Wise) eligible for Virginia's Data Center Investment Grant (DCIG) under Va. Code §58.1-3851 and Virginia Coalfield Economic Development Authority (VCEDA) grants. Appalachian Power provides transmission in the deepest Southwest Virginia coalfield region. GO Virginia Coalfield Region designation provides the maximum distressed-area incentive tier. UVA Wise provides STEM workforce.",
        "effective_date": "2010-01-01", "status": "active",
        "notes": "UVA Wise provides STEM workforce pipeline. VCEDA infrastructure fund available. Maximum incentive tier under GO Virginia.",
        "sources": [
            {"label": "Va. Code §58.1-3851 – Virginia Data Center Sales Tax Exemption", "url": "https://law.lis.virginia.gov/vacode/title58.1/chapter38/section58.1-3851/"},
            {"label": "VCEDA – Coalfield Economic Development Authority", "url": "https://www.vceda.us/business-investment/"},
            {"label": "VEDP Data Center Incentives", "url": "https://www.vedp.org/incentive/data-center-sales-and-use-tax-exemptions"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    # ── WISCONSIN ─────────────────────────────────────────────────────────────
    {
        "fips": "55015", "name": "Calumet County", "state": "Wisconsin",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Wisconsin Data Center Sales Tax Exemption – Calumet County (Fox Cities)",
        "description": "Calumet County (Chilton, Sherwood) in the Fox Cities area eligible for Wisconsin Wis. Stat. §77.54(57m) data center sales tax exemption covering servers, storage, cooling, and UPS equipment for facilities investing at least $75M. Wisconsin Public Service (WPS) provides industrial power. WEDC enterprise zone credits available.",
        "effective_date": "2013-01-01", "status": "active",
        "notes": "Fox Cities/Appleton metro area. WPS clean energy commitment. WEDC enterprise zone program stacks with §77.54(57m) exemption.",
        "sources": [
            {"label": "Wis. Stat. §77.54(57m) – Wisconsin Data Center Exemption", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/77/54/57m"},
            {"label": "Wisconsin Economic Development Corp – Data Center Tax Exemption", "url": "https://wedc.org/programs-and-resources/data-center-tax-exemption/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "55027", "name": "Dodge County", "state": "Wisconsin",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Wisconsin Data Center Sales Tax Exemption – Dodge County",
        "description": "Dodge County (Beaver Dam, Waupun) eligible for Wisconsin Wis. Stat. §77.54(57m) data center sales tax exemption. Wisconsin Public Service (WPS) provides power. I-90/I-94 corridor north of Madison provides fiber access. Available rural industrial parcels with WPS industrial rates.",
        "effective_date": "2013-01-01", "status": "active",
        "notes": "Madison-Milwaukee midpoint corridor. WPS service. Available large parcels with I-90/94 fiber corridor access.",
        "sources": [
            {"label": "Wis. Stat. §77.54(57m) – Wisconsin Data Center Exemption", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/77/54/57m"},
            {"label": "Wisconsin Economic Development Corp – Data Center Tax Exemption", "url": "https://wedc.org/programs-and-resources/data-center-tax-exemption/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "55055", "name": "Jefferson County", "state": "Wisconsin",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Wisconsin Data Center Sales Tax Exemption – Jefferson County",
        "description": "Jefferson County (Jefferson, Watertown, Fort Atkinson) eligible for Wisconsin Wis. Stat. §77.54(57m) data center sales tax exemption. WE Energies and MGE (Madison Gas and Electric) both serve portions of Jefferson County. I-94 corridor between Milwaukee and Madison provides fiber spine access. WEDC enterprise zone credits available.",
        "effective_date": "2013-01-01", "status": "active",
        "notes": "Milwaukee-Madison I-94 midpoint. Served by both WE Energies and MGE. Strong fiber corridor.",
        "sources": [
            {"label": "Wis. Stat. §77.54(57m) – Wisconsin Data Center Exemption", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/77/54/57m"},
            {"label": "Wisconsin Economic Development Corp – Data Center Tax Exemption", "url": "https://wedc.org/programs-and-resources/data-center-tax-exemption/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
    {
        "fips": "55089", "name": "Ozaukee County", "state": "Wisconsin",
        "level": -1, "types": ["data_center", "energy", "tax"],
        "title": "Wisconsin Data Center Sales Tax Exemption – Ozaukee County (Milwaukee North)",
        "description": "Ozaukee County (Grafton, Port Washington, Cedarburg) in the northern Milwaukee suburbs eligible for Wisconsin Wis. Stat. §77.54(57m) data center sales tax exemption. WE Energies provides industrial transmission on I-43 corridor. Proximity to Milwaukee's existing data center cluster. WEDC enterprise zone credits available.",
        "effective_date": "2013-01-01", "status": "active",
        "notes": "North Milwaukee suburban corridor. WE Energies 138kV transmission. Milwaukee metro data center cluster spillover.",
        "sources": [
            {"label": "Wis. Stat. §77.54(57m) – Wisconsin Data Center Exemption", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/77/54/57m"},
            {"label": "Wisconsin Economic Development Corp – Data Center Tax Exemption", "url": "https://wedc.org/programs-and-resources/data-center-tax-exemption/"},
            {"label": "WEDC Enterprise Zone Credits", "url": "https://wedc.org/programs-and-resources/enterprise-zone-credits/"},
        ],
        "lifecycle_stage": "effective", "pipeline_verified": False, "last_reviewed": None,
    },
]

# Campus additions — max existing IDs per state:
# ny: ai-ny-007 → ai-ny-008
# nc: ai-nc-011 → ai-nc-012
# oh: ai-oh-007 → ai-oh-008
# ok: ai-ok-006 → ai-ok-007
# tn: ai-tn-008 → ai-tn-009
# tx: ai-tx-011 → ai-tx-012
# va: ai-va-012 → ai-va-013
# wi: ai-wi-003 → ai-wi-004

new_campuses = [
    {
        "id": "ai-ny-008",
        "name": "GlobalFoundries Malta – Saratoga County NY",
        "operator": "GlobalFoundries (semiconductor + adjacent DC campus)",
        "county": "Saratoga County",
        "state": "New York",
        "fips": "36091",
        "capacity_mw": 120,
        "year_announced": 2023,
        "status": "under_construction",
        "notes": "GlobalFoundries Fab 8 campus in Malta NY driving adjacent hyperscale data center investment. NYPA ReCharge NY power available. Empire State Development Excelsior credits.",
        "sources": [
            {"label": "NYPA ReCharge New York Program", "url": "https://www.nypa.gov/services/recharge-ny"},
            {"label": "NY Excelsior Jobs Program – ESD", "url": "https://esd.ny.gov/excelsior-jobs-program"},
        ],
    },
    {
        "id": "ai-nc-012",
        "name": "Cleveland County Data Center Site – Shelby NC",
        "operator": "Duke Energy / NC Incentive Site",
        "county": "Cleveland County",
        "state": "North Carolina",
        "fips": "37045",
        "capacity_mw": 80,
        "year_announced": 2024,
        "status": "planned",
        "notes": "Cleveland County Tier 2 JDIG site. Duke Energy Carolinas available 115kV capacity. Former textile industry brownfield redevelopment.",
        "sources": [
            {"label": "NC Data Center Sales Tax Exemption – NCDOR", "url": "https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-technical-bulletins/data-centers"},
        ],
    },
    {
        "id": "ai-oh-008",
        "name": "New Albany Tech Campus – Licking/Franklin Counties OH",
        "operator": "Google / Meta / Amazon (separate campuses)",
        "county": "Licking County",
        "state": "Ohio",
        "fips": "39089",
        "capacity_mw": 800,
        "year_announced": 2017,
        "status": "operational",
        "notes": "New Albany Smart Growth District spans Licking/Franklin county line. Among the largest data center concentrations in the Midwest. AEP Ohio dedicated substations.",
        "sources": [
            {"label": "ORC §5739.02(B)(42a) – Ohio Data Center Exemption", "url": "https://codes.ohio.gov/ohio-revised-code/section-5739.02"},
            {"label": "Ohio Job Creation Tax Credit – ODSA", "url": "https://development.ohio.gov/business/business-incentives/job-creation-tax-credit"},
        ],
    },
    {
        "id": "ai-ok-007",
        "name": "OKC Metro Data Center Campus – Canadian County",
        "operator": "Multiple (Switch / DataBank / Aligned)",
        "county": "Canadian County",
        "state": "Oklahoma",
        "fips": "40017",
        "capacity_mw": 150,
        "year_announced": 2022,
        "status": "under_construction",
        "notes": "OKC western suburb corridor. OG&E renewable energy available. Quality Jobs Program payroll rebate active.",
        "sources": [
            {"label": "Oklahoma Quality Jobs Program – ODFA", "url": "https://www.oklahomaincentives.org/quality-jobs-program/"},
        ],
    },
    {
        "id": "ai-tn-009",
        "name": "Dickson County Business Park Data Center",
        "operator": "Multiple / TVA Site",
        "county": "Dickson County",
        "state": "Tennessee",
        "fips": "47043",
        "capacity_mw": 100,
        "year_announced": 2023,
        "status": "planned",
        "notes": "Nashville NW corridor data center site. TVA Green Invest renewable option. PILOT agreement through Dickson County IDB.",
        "sources": [
            {"label": "T.C.A. §67-6-395 – Tennessee Qualified Data Center Act", "url": "https://law.justia.com/codes/tennessee/title-67/chapter-6/part-3/section-67-6-395/"},
            {"label": "TVA Economic Development", "url": "https://www.tva.com/energy/economic-development"},
        ],
    },
    {
        "id": "ai-tx-012",
        "name": "Chambers County Industrial Data Center – Mont Belvieu TX",
        "operator": "CenterPoint / Industrial Operator",
        "county": "Chambers County",
        "state": "Texas",
        "fips": "48071",
        "capacity_mw": 200,
        "year_announced": 2024,
        "status": "planned",
        "notes": "Mont Belvieu NGL/petrochemical industrial zone adjacent I-10. CenterPoint Energy high-voltage industrial service. TX Ch.403 exemption eligible.",
        "sources": [
            {"label": "Texas Tax Code Ch.403 – Data Center Exemption", "url": "https://comptroller.texas.gov/taxes/exempt/data-centers.php"},
        ],
    },
    {
        "id": "ai-va-013",
        "name": "Pittsylvania County Mega Site – Southern Virginia",
        "operator": "VEDP / IDA Pittsylvania County",
        "county": "Pittsylvania County",
        "state": "Virginia",
        "fips": "51143",
        "capacity_mw": 300,
        "year_announced": 2022,
        "status": "planned",
        "notes": "Southern Virginia Mega Site positioned for hyperscale data center. VEDP DCIG and Tobacco Commission grants stacked. Dominion Energy transmission build-out underway.",
        "sources": [
            {"label": "VEDP Data Center Incentives", "url": "https://www.vedp.org/incentive/data-center-sales-and-use-tax-exemptions"},
            {"label": "Virginia Tobacco Commission Opportunity Fund", "url": "https://www.vatobaccocommission.org/grants/opportunity-fund/"},
        ],
    },
    {
        "id": "ai-wi-004",
        "name": "Milwaukee Metro Data Center Campus – Ozaukee County",
        "operator": "Equinix / Iron Mountain",
        "county": "Ozaukee County",
        "state": "Wisconsin",
        "fips": "55089",
        "capacity_mw": 60,
        "year_announced": 2023,
        "status": "planned",
        "notes": "Milwaukee north suburb corridor on I-43. WE Energies 138kV service. Wisconsin §77.54(57m) exemption and WEDC enterprise zone credits applicable.",
        "sources": [
            {"label": "Wis. Stat. §77.54(57m) – Wisconsin Data Center Exemption", "url": "https://docs.legis.wisconsin.gov/statutes/statutes/77/54/57m"},
        ],
    },
]

# Apply restriction/incentive entries
added = 0
skipped = 0
for entry in new_entries:
    if entry["fips"] in existing_fips:
        skipped += 1
    else:
        restrictions.append(entry)
        existing_fips.add(entry["fips"])
        added += 1

print(f"Restriction/incentive entries: {added} added, {skipped} skipped (already present)")

data["restrictions"] = restrictions
with open(f"{DATA_PATH}/restrictions_raw.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

# Apply campus entries
camp_added = 0
camp_skipped = 0
for campus in new_campuses:
    if campus["id"] in existing_cids:
        camp_skipped += 1
    else:
        campuses.append(campus)
        existing_cids.add(campus["id"])
        camp_added += 1

print(f"AI campuses: {camp_added} added, {camp_skipped} skipped (already present)")

cdata["ai_campuses"] = campuses
with open(f"{DATA_PATH}/ai_campuses.json", "w") as f:
    json.dump(cdata, f, indent=2)
    f.write("\n")

print(f"Total restrictions: {len(restrictions)}")
print(f"Total AI campuses: {len(campuses)}")
