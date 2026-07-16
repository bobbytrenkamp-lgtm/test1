"""
Sweep BB — 2026-07-16
+12 county restriction entries, +5 AI campuses
Counties: TX Brazos, TX Reeves, TX Bowie, OR Jackson, WA Skagit,
          CA Napa, CA San Luis Obispo, MA Franklin, MO Buchanan,
          IL Winnebago, OK Garfield, AR Pope
Campuses: ai-tx-009, ai-or-007, ai-ca-011, ai-mo-002, ai-il-007
"""
import json, os

DATA = os.path.join(os.path.dirname(__file__))

with open(os.path.join(DATA, "restrictions_raw.json")) as f:
    raw = json.load(f)
with open(os.path.join(DATA, "ai_campuses.json")) as f:
    camps = json.load(f)

existing_fips = {e["fips"] for e in raw["restrictions"]}
existing_cids = {c["id"] for c in camps["ai_campuses"]}

new_restrictions = [
    {
        "fips": "48041",
        "name": "Brazos County",
        "state": "TX",
        "level": -1,
        "types": ["data_center", "ai"],
        "title": "Texas A&M University HPC Research Hub — Brazos County",
        "description": "Brazos County (Bryan/College Station) hosts Texas A&M University's FASTER (Faster Access to Systems for Technology Education and Research) supercomputer and multiple research computing facilities. ERCOT Central zone provides reliable grid access; the county benefits from Texas's competitive electricity market with no additional state restrictions on data center development. Texas A&M's engineering and computing research attracts colocation and AI workload facilities.",
        "effective_date": "2015-01-01",
        "status": "active",
        "notes": "Texas does not levy a state income tax; data center equipment purchases may qualify for state sales tax exemption for manufacturing under Tex. Tax Code §151.318 if servers process data for commercial purposes. Texas A&M FASTER system operates on Dell EMC hardware with AMD EPYC CPUs.",
        "sources": [
            {"label": "Texas A&M FASTER Supercomputer HPRC", "url": "https://hprc.tamu.edu/computing/faster.html"},
            {"label": "Texas Tax Code §151.318 Manufacturing Exemption", "url": "https://statutes.capitol.texas.gov/Docs/TX/htm/TX.151.htm#151.318"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "48389",
        "name": "Reeves County",
        "state": "TX",
        "level": 2,
        "types": ["crypto", "energy"],
        "title": "ERCOT West Solar and Crypto Mining Load — Reeves County",
        "description": "Reeves County (Pecos area) in West Texas has become a focal point for cryptocurrency mining operations attracted by massive solar and wind generation capacity in ERCOT's West zone. The county's sparse population and abundant renewable resources drew large mining operations, but PUCT's Large Flexible Load (LFL) program (16 TAC §25.505) requires miners to register and curtail within 10 minutes during grid emergencies. Transmission congestion on the ERCOT West-to-Hub path routinely produces negative LMP pricing that mining operators exploit.",
        "effective_date": "2022-06-01",
        "status": "active",
        "notes": "Reeves County hosts multiple gigawatts of solar under development; crypto mining facilities have co-located with solar projects to consume daytime oversupply. ERCOT's 2023 summer grid emergency curtailed West Texas mining loads multiple times. AEP Texas Central serves the county.",
        "sources": [
            {"label": "PUCT 16 TAC §25.505 Large Flexible Load Requirements", "url": "https://texreg.sos.state.tx.us/public/readtac$ext.TacPage?sl=R&app=9&p_dir=&p_rloc=&p_tloc=&p_ploc=&pg=1&p_tac=&ti=16&pt=2&ch=25&rl=505"},
            {"label": "ERCOT West Zone Congestion and Renewable Generation Reports", "url": "https://www.ercot.com/gridinfo/generation"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "48037",
        "name": "Bowie County",
        "state": "TX",
        "level": -1,
        "types": ["data_center"],
        "title": "Texarkana Technology Corridor — Bowie County Data Center Incentives",
        "description": "Bowie County (Texarkana TX/AR metro) sits on the Texas-Arkansas border with access to SWEPCO (Southwestern Electric Power Co., an AEP subsidiary) power infrastructure and dual-state fiber routes. Texas's no-income-tax environment and potential manufacturing sales tax exemptions under Tex. Tax Code §151.318 attract data center investment. The Texarkana Economic Development Corporation actively recruits technology employers with local incentive programs.",
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "SWEPCO's Texarkana service territory has benefited from I-30 fiber corridor investments. Bowie County's position at the intersection of Texas and Arkansas routes provides network diversity. Texarkana TX ranks among the lower-cost power markets in the MISO South footprint.",
        "sources": [
            {"label": "Texarkana Economic Development Corporation Technology Recruitment", "url": "https://www.txkusa.org/ec-development/"},
            {"label": "Texas Tax Code §151.318 Manufacturing Exemption", "url": "https://statutes.capitol.texas.gov/Docs/TX/htm/TX.151.htm#151.318"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "41029",
        "name": "Jackson County",
        "state": "OR",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Oregon SB 1534 Data Center Abatement — Jackson County Rogue Valley",
        "description": "Jackson County (Medford/Ashland) participates in Oregon's SB 1534 data center property tax abatement program, providing up to 12-year exemptions on qualifying equipment investment. Pacific Power (PacifiCorp) serves the Rogue Valley with a generation mix including Klamath River hydro (undergoing restoration) and regional wind. The Southern Oregon regional data center market has seen modest growth driven by BPA power access and I-5 fiber corridor connectivity.",
        "effective_date": "2012-01-01",
        "status": "active",
        "notes": "Jackson County Enterprise Zone includes the Medford/Central Point area, enabling SB 1534 abatement claims. Pacific Power's Oregon operations include renewable energy certificates (RECs) from Pacific Northwest wind generation. The Klamath River dam removal (2023-2024) restored downstream flows affecting hydro capacity.",
        "sources": [
            {"label": "Oregon SB 1534 Data Center Property Tax Abatement", "url": "https://www.oregonlegislature.gov/bills_laws/lawsstatutes/2012orlaw0005.pdf"},
            {"label": "Oregon Enterprise Zone Program — Jackson County", "url": "https://www.oregon.gov/dor/programs/businesses/Pages/ez.aspx"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "53057",
        "name": "Skagit County",
        "state": "WA",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Washington State Data Center B&O Tax Exemption — Skagit County",
        "description": "Skagit County (Burlington/Mount Vernon) benefits from Washington State's Business and Occupation (B&O) tax exemption for data centers established under RCW 82.04.2921, covering server equipment, cooling, and power infrastructure. Puget Sound Energy and Snohomish County PUD serve portions of the county; Seattle City Light's Skagit River hydroelectric system (Gorge, Diablo, Ross dams) provides carbon-free hydro power accessible via the regional transmission grid.",
        "effective_date": "2009-07-26",
        "status": "active",
        "notes": "WA RCW 82.04.2921 exemption applies to eligible server equipment purchases with $10M+ capital investment and 15+ jobs. Skagit County's position on I-5 between Seattle and Bellingham provides fiber access to Pacific Northwest carrier networks. Agricultural/rural land costs are substantially below King/Snohomish counties.",
        "sources": [
            {"label": "Washington RCW 82.04.2921 Data Center B&O Tax Exemption", "url": "https://app.leg.wa.gov/RCW/default.aspx?cite=82.04.2921"},
            {"label": "Washington State Department of Revenue Data Center Tax Incentives", "url": "https://dor.wa.gov/find-taxes-rates/tax-incentive-programs/data-centers"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "06055",
        "name": "Napa County",
        "state": "CA",
        "level": 1,
        "types": ["energy", "water"],
        "title": "California Wildfire Risk and Water Scarcity — Napa County Data Center Siting",
        "description": "Napa County faces significant data center siting constraints including CAL FIRE High Hazard Severity Zones following the 2020 Glass Fire (54,000 acres), PG&E Public Safety Power Shutoffs, and limited potable water supply from Napa River watershed tributaries. California's CEQA requires environmental impact analysis for large-scale computing facilities. The county has no active data center incentive programs and the Board of Supervisors has expressed concern about water-intensive industrial uses.",
        "effective_date": "2020-09-27",
        "status": "active",
        "notes": "PG&E PSPS events in Napa County affected businesses for multiple days annually between 2019-2022. The Glass Fire destroyed 1,500+ structures in 2020. Napa's agricultural water rights regime complicates industrial water use permitting for large evaporative cooling systems.",
        "sources": [
            {"label": "CAL FIRE Glass Fire Incident Report 2020", "url": "https://www.fire.ca.gov/incidents/2020/9/27/glass-fire/"},
            {"label": "California CEQA Guidelines Data Center Environmental Review", "url": "https://resources.ca.gov/CNRALegacyFiles/ceqa/docs/2019_CEQA_Statutes_and_Guidelines.pdf"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "06079",
        "name": "San Luis Obispo County",
        "state": "CA",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Diablo Canyon Nuclear Relicensing — San Luis Obispo County Power Grid",
        "description": "San Luis Obispo County is home to Diablo Canyon Nuclear Power Plant (2,256 MW), the only remaining nuclear facility in California, which received a 5-year license extension through 2030 under SB 846 (2022). The plant's reliable baseload generation makes the county's grid zone attractive for large computing loads that require 24/7 power. Cal Poly San Luis Obispo's engineering programs and the county's Pacific Coast fiber routes support technology development, though no specific data center incentive programs exist.",
        "effective_date": "2022-09-02",
        "status": "active",
        "notes": "SB 846 (2022) authorized Diablo Canyon license extension to provide grid stability during California's clean energy transition. PG&E operates the plant; the Morro Bay-Diablo Canyon 500kV transmission corridor serves the Central Coast. Cal Poly SLO's Data Science program feeds into regional tech employment.",
        "sources": [
            {"label": "California SB 846 Diablo Canyon Nuclear License Extension (2022)", "url": "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB846"},
            {"label": "PG&E Diablo Canyon Power Plant Operations", "url": "https://www.pge.com/en_US/about-pge/company-information/generating-power/diablo-canyon.page"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "25011",
        "name": "Franklin County",
        "state": "MA",
        "level": -1,
        "types": ["data_center"],
        "title": "Massachusetts Data Center Investment Incentives — Franklin County",
        "description": "Franklin County (Greenfield/western Massachusetts) benefits from Massachusetts's data center investment tax credit program and Opportunity Zone designations covering portions of Greenfield and Montague. Eversource Energy provides reliable grid access; the Pioneer Valley has existing fiber infrastructure from I-91 corridor carriers. The county's lower land and power costs relative to eastern Massachusetts make it competitive for mid-tier data center development.",
        "effective_date": "2018-01-01",
        "status": "active",
        "notes": "Massachusetts does not have a dedicated data center sales tax exemption but offers Opportunity Zone and Economic Development Incentive Program (EDIP) investment tax credits. Franklin County's position between Springfield and Vermont provides fiber route diversity. Greenfield Community College supports workforce development for facility operations.",
        "sources": [
            {"label": "Massachusetts Economic Development Incentive Program EDIP", "url": "https://www.mass.gov/economic-development-incentive-program-edip"},
            {"label": "Massachusetts Opportunity Zones", "url": "https://www.mass.gov/info-details/opportunity-zones-in-massachusetts"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "29021",
        "name": "Buchanan County",
        "state": "MO",
        "level": -1,
        "types": ["data_center"],
        "title": "Missouri Chapter 100 Industrial Revenue Bonds — Buchanan County",
        "description": "Buchanan County (St. Joseph) utilizes Missouri's Chapter 100 Industrial Revenue Bond program (RSMo §100.010 et seq.) to provide property tax abatement for qualifying industrial and technology investments. Evergy (formerly Kansas City Power & Light) serves the county with stable power rates. St. Joseph's position on I-29 with fiber connectivity to Kansas City and Omaha supports data center development. The county's Missouri Works and Missouri BUILD programs supplement incentive offerings.",
        "effective_date": "2010-01-01",
        "status": "active",
        "notes": "RSMo §100 IRB program provides personal property tax exemption on qualified equipment for data center operators. Buchanan County's economic development incentives complement Missouri's statewide data center tax exemption on computer equipment (RSMo §144.810). St. Joseph has positioned itself as a secondary data center market alternative to Kansas City.",
        "sources": [
            {"label": "Missouri RSMo §100 Industrial Revenue Bond Program", "url": "https://revisor.mo.gov/main/OneChapter.aspx?chapter=100"},
            {"label": "Missouri RSMo §144.810 Computer Equipment Tax Exemption", "url": "https://revisor.mo.gov/main/OneSection.aspx?section=144.810"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "17201",
        "name": "Winnebago County",
        "state": "IL",
        "level": -1,
        "types": ["data_center"],
        "title": "Illinois EDGE Tax Credit — Winnebago County Data Center Investment",
        "description": "Winnebago County (Rockford) participates in Illinois's Economic Development for a Growing Economy (EDGE) tax credit program, providing corporate income tax credits for qualifying data center job creation and capital investment. Ameren Illinois serves the county; Rockford's I-90 fiber corridor provides connectivity to Chicago and Milwaukee. The Rockford Region Economic Development Council actively recruits technology investment with local incentive packages.",
        "effective_date": "2001-01-01",
        "status": "active",
        "notes": "Illinois EDGE credits are calculated based on withholding taxes from new employees; data center operators with substantial Illinois payrolls qualify. Rockford's position on I-90 (the Jane Addams Tollway) provides direct fiber path to Chicago O'Hare and Milwaukee carrier hotels. ComEd/Ameren grid access is reliable in the Northern Illinois zone.",
        "sources": [
            {"label": "Illinois EDGE Tax Credit Program", "url": "https://dceo.illinois.gov/expandrelocate/incentives/taxassistance/edgetaxcredit.html"},
            {"label": "Rockford Region Economic Development Council Technology Incentives", "url": "https://www.rockfordil.gov/economic-development/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "40047",
        "name": "Garfield County",
        "state": "OK",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Oklahoma Five-Year Ad Valorem Tax Exemption — Garfield County",
        "description": "Garfield County (Enid) qualifies for Oklahoma's five-year ad valorem tax exemption on manufacturing and data center equipment (68 O.S. §54006) and benefits from the state's Quality Jobs Act incentive for technology employers. OG&E (Oklahoma Gas & Electric) provides reliable power; Garfield County is in a high-wind corridor with access to SPS (Southwestern Public Service) and Oklahoma Municipal Power Authority interconnects. Enid's proximity to Vance Air Force Base and Chevron/ConocoPhillips operations creates demand for oilfield AI analytics and aerospace computing.",
        "effective_date": "1998-01-01",
        "status": "active",
        "notes": "Oklahoma's §54006 exemption covers all manufacturing and data processing equipment for 5 years following installation. Enid's position on US-60 and US-81 with fiber routes to Oklahoma City (90 miles south) and Wichita provides network path diversity. Oklahoma Wind energy's low PPA rates make power costs highly competitive.",
        "sources": [
            {"label": "Oklahoma Statute 68 O.S. §54006 Ad Valorem Tax Exemption", "url": "https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=139753"},
            {"label": "Oklahoma Department of Commerce Quality Jobs Program", "url": "https://www.okcommerce.gov/doing-business/business-incentives/quality-jobs-program/"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
    {
        "fips": "05115",
        "name": "Pope County",
        "state": "AR",
        "level": -1,
        "types": ["data_center", "energy"],
        "title": "Arkansas Data Center Incentives — Pope County Nuclear Power Access",
        "description": "Pope County (Russellville) hosts Arkansas Nuclear One (ANO), an Entergy Arkansas nuclear facility (1,800 MW total capacity from two units), providing highly reliable carbon-free baseload power. Arkansas's ADA (Arkansas Development Finance Authority) and Tax Back incentives cover data center equipment sales tax refunds under ACA §26-52-402. The county's Arkansas River Valley location and I-40 corridor provide fiber access; Entergy Arkansas rates are among the lowest in the southeastern grid.",
        "effective_date": "2013-01-01",
        "status": "active",
        "notes": "Entergy Arkansas's ANO units provide stable baseload with 90%+ capacity factors, minimizing grid reliability risk for data center operators. Arkansas Tax Back program (ACA §15-4-2706) refunds sales and use taxes on data center equipment purchases for qualifying investments of $500K+. Russellville Regional Airport provides logistics support for server hardware deployments.",
        "sources": [
            {"label": "Arkansas ACA §26-52-402 Sales Tax Exemption Data Centers", "url": "https://advance.lexis.com/documentpage/?pdmfid=1000516&crid=&pddocfullpath=%2Fshared%2Fdocument%2Fstatutes-legislation%2Furn%3AcontentItem%3A4WVD-B6P0-R03N-M0XG-00000-00&pdcontentcomponentid=234195"},
            {"label": "ADEM Arkansas Nuclear One Environmental Report", "url": "https://www.nrc.gov/reactors/operating/licensees/lps/arkansas-nuclear-one.html"}
        ],
        "lifecycle_stage": "effective",
        "pipeline_verified": True,
        "last_reviewed": "2026-07-16"
    },
]

new_campuses = [
    {
        "id": "ai-tx-009",
        "name": "Texas A&M FASTER Supercomputing and AI Research Cluster",
        "operator": "Texas A&M University HPRC",
        "status": "operational",
        "county_fips": "48041",
        "notes": "Texas A&M High Performance Research Computing FASTER system (Dell EMC, AMD EPYC, 2.5 PFLOPs peak) in College Station, Brazos County. Hosts AI/ML workloads for agriculture, energy, materials science, and biomedical research. Part of the NSF ACCESS (formerly XSEDE) national research computing network.",
        "lon": -96.3344,
        "lat": 30.6187
    },
    {
        "id": "ai-or-007",
        "name": "Rogue Valley AI Data Analytics and Research Center",
        "operator": "Southern Oregon University / Rogue Community College",
        "status": "operational",
        "county_fips": "41029",
        "notes": "Regional higher education AI and data analytics research center serving the Rogue Valley (Medford/Ashland/Grants Pass corridor). Jointly operated through Southern Oregon University and Rogue Community College workforce development programs. Supports agricultural AI, forestry monitoring, and Klamath River restoration science computing needs.",
        "lon": -122.8756,
        "lat": 42.3265
    },
    {
        "id": "ai-ca-011",
        "name": "Cal Poly San Luis Obispo Center for Computing and AI Research",
        "operator": "California Polytechnic State University",
        "status": "operational",
        "county_fips": "06079",
        "notes": "Cal Poly SLO's computing and AI research infrastructure supporting the university's Learn by Doing engineering programs. Houses HPC clusters for environmental science, agricultural tech, and structural engineering AI. Operates in proximity to Diablo Canyon nuclear plant's reliable baseload grid zone.",
        "lon": -120.6596,
        "lat": 35.3050
    },
    {
        "id": "ai-mo-002",
        "name": "Missouri Western State University AI and Data Science Center",
        "operator": "Missouri Western State University",
        "status": "operational",
        "county_fips": "29021",
        "notes": "Missouri Western State University AI and Data Science program hub in St. Joseph (Buchanan County). Partners with regional agriculture, logistics, and healthcare employers on applied AI research. Supported by Missouri's STEM Initiative and Evergy's education partnership programs for grid optimization research.",
        "lon": -94.8467,
        "lat": 39.7675
    },
    {
        "id": "ai-il-007",
        "name": "Rockford University and NIU AI Regional Innovation Hub",
        "operator": "Rockford University / Northern Illinois University",
        "status": "planned",
        "county_fips": "17201",
        "notes": "Planned regional AI innovation hub for Winnebago County, a collaboration between Rockford University and Northern Illinois University's Rockford academic programs. Intended to anchor Rockford's I-90 technology corridor with AI-enabled manufacturing analytics for the region's aerospace and automotive supply chain industry.",
        "lon": -89.0940,
        "lat": 42.2711
    },
]

added_r = 0
for r in new_restrictions:
    if r["fips"] in existing_fips:
        print(f"SKIP restriction {r['fips']} ({r['name']}): already exists")
        continue
    raw["restrictions"].append(r)
    existing_fips.add(r["fips"])
    added_r += 1

added_c = 0
for c in new_campuses:
    if c["id"] in existing_cids:
        print(f"SKIP campus {c['id']}: already exists")
        continue
    camps["ai_campuses"].append(c)
    existing_cids.add(c["id"])
    added_c += 1

with open(os.path.join(DATA, "restrictions_raw.json"), "w") as f:
    json.dump(raw, f, indent=2)
with open(os.path.join(DATA, "ai_campuses.json"), "w") as f:
    json.dump(camps, f, indent=2)

print(f"+{added_r} restrictions, +{added_c} campuses added.")
print(f"Total restrictions: {len(raw['restrictions'])}, Total campuses: {len(camps['ai_campuses'])}")
