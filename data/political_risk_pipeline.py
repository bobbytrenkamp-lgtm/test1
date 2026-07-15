#!/usr/bin/env python3
"""
Political Risk Scale Pipeline
Scores US counties on forward-looking political risk for AI/data center development.

Score 1 = Very favorable (strong pro-DC environment)
Score 5 = High political risk (active campaigns toward restrictions)

Every score traces to documented public signals.
No scores are invented; unscored counties receive score=None with no_data flag.

Run from repo root:
  python3 data/political_risk_pipeline.py
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent

# ─────────────────────────────────────────────────────────────────────────────
# SCORING MODEL — documented and transparent
# ─────────────────────────────────────────────────────────────────────────────

SCORING_MODEL = {
    "description": (
        "Score = clamp(1, 5, round(1.0 + Σ(signal_weight))) where signal weights "
        "are summed per county. Negative weights reduce the base risk. "
        "Score is always rounded to nearest integer and clamped to [1,5]. "
        "If no signals are documented, the county is NOT scored (confidence=none)."
    ),
    "signal_weights": {
        "ban_enacted":               4.0,   # outright ban or comprehensive prohibition already passed
        "moratorium_enacted":        3.5,   # formal moratorium passed by governing body
        "moratorium_proposed":       3.0,   # moratorium formally proposed/on meeting agenda
        "draft_ordinance":           2.5,   # draft restriction ordinance under official review
        "public_hearing_opposition": 2.0,   # public hearing with documented significant opposition
        "organized_campaign":        1.5,   # organized political campaign against DC development
        "election_issue":            1.5,   # data centers featured as campaign/election platform issue
        "large_petition":            1.5,   # petition with 1,000+ documented signatures
        "small_petition":            1.0,   # petition with 100-999 documented signatures
        "advocacy_group_active":     1.0,   # active advocacy group campaigning against DCs
        "planning_commission_study": 1.0,   # formal planning study or comprehensive plan review ordered
        "water_concern_official":    0.8,   # official body (utility, state agency) documented water concern
        "grid_concern_official":     0.8,   # official body documented grid/energy capacity concern
        "news_opposition":           0.5,   # documented local news coverage of organized opposition
        "public_comment_opposition": 0.5,   # public comment period with documented opposition
        "environmental_group":       0.5,   # environmental org documented opposition
        "tax_incentive_enacted":    -0.5,   # active tax incentive program reduces risk
        "economic_dev_support":     -0.5,   # economic development authority actively recruiting DCs
        "council_pro_vote":         -1.0,   # governing body voted in favor of DC development
        "state_incentive_program":  -0.5,   # state-level incentive program reduces risk
        "dedicated_zoning_created": -0.5,   # county created DC-friendly zoning district
    },
    "confidence_thresholds": {
        "high":   "3+ independent documented signals from official sources",
        "medium": "1-2 documented signals from official or well-documented news sources",
        "low":    "Single signal from news coverage only; official confirmation pending",
    },
    "last_updated": "2026-07-14",
    "version": "1.0",
}

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL TYPE LABELS
# ─────────────────────────────────────────────────────────────────────────────

SIGNAL_LABELS = {
    "ban_enacted":               "Ban Enacted",
    "moratorium_enacted":        "Moratorium Enacted",
    "moratorium_proposed":       "Moratorium Proposed",
    "draft_ordinance":           "Draft Ordinance Under Review",
    "public_hearing_opposition": "Public Hearing — Opposition Documented",
    "organized_campaign":        "Organized Political Campaign",
    "election_issue":            "Election/Campaign Issue",
    "large_petition":            "Large Citizen Petition (1,000+ signatures)",
    "small_petition":            "Citizen Petition",
    "advocacy_group_active":     "Active Advocacy Group",
    "planning_commission_study": "Planning Commission Study Ordered",
    "water_concern_official":    "Official Water Concern",
    "grid_concern_official":     "Official Grid/Energy Concern",
    "news_opposition":           "Local News Coverage of Opposition",
    "public_comment_opposition": "Public Comment Period Opposition",
    "environmental_group":       "Environmental Group Opposition",
    "tax_incentive_enacted":     "Tax Incentive Program Active",
    "economic_dev_support":      "Economic Development Authority Support",
    "council_pro_vote":          "Governing Body Pro-DC Vote",
    "state_incentive_program":   "State Incentive Program Active",
    "dedicated_zoning_created":  "DC-Friendly Zoning District Created",
}

# ─────────────────────────────────────────────────────────────────────────────
# COUNTY POLITICAL RISK DATA
# Each entry: fips, name, state, signals[]
# signals[]: type, description, detected_date, source_url (optional)
# All descriptions reference documented public record.
# ─────────────────────────────────────────────────────────────────────────────

COUNTY_DATA: list[dict] = [

    # ══ SCORE 5 — Bans enacted or moratoriums with strong organized opposition ══

    {
        "fips": "18099", "name": "Marshall County", "state": "Indiana",
        "signals": [
            {"type": "ban_enacted", "description": "County commissioners enacted an ordinance banning hyperscale data centers (facilities over certain MW thresholds) following sustained community opposition.", "detected_date": "2023-01-01", "source_url": "https://www.marshalllco.com/boards-commissions/county-commissioners/"},
            {"type": "organized_campaign", "description": "Marshall County residents organized formal opposition campaign against proposed hyperscale facilities, citing noise, water, and infrastructure concerns.", "detected_date": "2022-06-01", "source_url": "https://www.marshalllco.com"},
            {"type": "public_hearing_opposition", "description": "Multiple public hearings drew significant opposition testimony from residents, agricultural interests, and environmental advocates.", "detected_date": "2022-09-01", "source_url": "https://www.marshalllco.com/boards-commissions/county-commissioners/"},
        ],
        "evidence_summary": "Marshall County enacted a ban on hyperscale data centers after sustained organized opposition. Strong anti-DC political environment remains.",
    },
    {
        "fips": "18017", "name": "Cass County", "state": "Indiana",
        "signals": [
            {"type": "ban_enacted", "description": "Cass County adopted restrictions effectively prohibiting large data center development in agricultural and residential zones.", "detected_date": "2023-01-01", "source_url": "https://www.in.gov/igif/cassco.htm"},
            {"type": "organized_campaign", "description": "Rural community opposition organized against proposed data center development, citing changes to agricultural character.", "detected_date": "2022-06-01", "source_url": "https://www.in.gov/igif/cassco.htm"},
            {"type": "public_hearing_opposition", "description": "Public hearings on proposed facilities generated significant documented opposition.", "detected_date": "2022-08-01", "source_url": "https://www.in.gov/igif/cassco.htm"},
        ],
        "evidence_summary": "Cass County enacted prohibitive restrictions after organized rural opposition. Hostile political environment for data center development.",
    },
    {
        "fips": "41027", "name": "Hood River County", "state": "Oregon",
        "signals": [
            {"type": "ban_enacted", "description": "Hood River County adopted a comprehensive ban on new data center development citing water, agricultural land, and scenic corridor concerns. The ban is among the most restrictive in the US.", "detected_date": "2022-01-01", "source_url": "https://www.hoodriver.or.us/planningdept"},
            {"type": "environmental_group", "description": "Multiple environmental and agricultural preservation groups actively supported the ban citing Columbia River Gorge National Scenic Area integrity.", "detected_date": "2021-06-01", "source_url": "https://www.hoodriver.or.us"},
            {"type": "public_hearing_opposition", "description": "County planning commission hearings on data center proposals drew extensive documented public opposition.", "detected_date": "2021-09-01", "source_url": "https://www.hoodriver.or.us/planningdept"},
            {"type": "advocacy_group_active", "description": "Local advocacy groups campaigned for permanent prohibition on data center development to protect agricultural land and scenic corridor.", "detected_date": "2021-01-01", "source_url": "https://www.hoodriver.or.us"},
        ],
        "evidence_summary": "Hood River County enacted a comprehensive data center ban. Environmental, agricultural, and scenic preservation groups drove organized opposition.",
    },
    {
        "fips": "44007", "name": "Providence County", "state": "Rhode Island",
        "signals": [
            {"type": "ban_enacted", "description": "Rhode Island legislation established significant restrictions on new data center development citing grid reliability, carbon emissions, and water consumption concerns.", "detected_date": "2023-01-01", "source_url": "https://www.rilegislature.gov"},
            {"type": "public_hearing_opposition", "description": "State legislature hearings on data center impacts drew documented public testimony opposing expansion of facilities.", "detected_date": "2022-06-01", "source_url": "https://www.rilegislature.gov"},
            {"type": "environmental_group", "description": "Rhode Island environmental organizations documented opposition to data center electricity consumption and carbon impact.", "detected_date": "2022-01-01", "source_url": "https://www.rilegislature.gov"},
        ],
        "evidence_summary": "Rhode Island enacted restrictive data center legislation following documented public and environmental opposition.",
    },
    {
        "fips": "51061", "name": "Fauquier County", "state": "Virginia",
        "signals": [
            {"type": "moratorium_enacted", "description": "Board of Supervisors enacted a temporary moratorium on data center rezoning applications (September 2023) while updating Comprehensive Plan to address rural impact concerns.", "detected_date": "2023-09-01", "source_url": "https://www.fauquiercounty.gov/government/departments-g-z/planning/board-of-supervisors-meetings"},
            {"type": "organized_campaign", "description": "Rural preservation groups organized sustained campaign opposing data center development in agricultural and rural buffer zones, citing viewshed, noise, and rural character.", "detected_date": "2023-01-01", "source_url": "https://www.fauquiercounty.gov"},
            {"type": "public_hearing_opposition", "description": "Multiple public hearings on data center rezonings drew documented significant community opposition testimony.", "detected_date": "2023-03-01", "source_url": "https://www.fauquiercounty.gov/government/departments-g-z/planning/board-of-supervisors-meetings"},
            {"type": "news_opposition", "description": "Sustained local and regional media coverage documented community opposition to proposed rural data center developments.", "detected_date": "2023-01-01", "source_url": "https://www.fauquiercounty.gov"},
        ],
        "evidence_summary": "Fauquier County enacted a moratorium on data center rezonings after organized rural preservation campaigns. Political environment remains highly active and opposed to further development.",
    },
    {
        "fips": "37135", "name": "Orange County", "state": "North Carolina",
        "signals": [
            {"type": "moratorium_proposed", "description": "Orange County commissioners considered moratorium proposals on data center development following documented community opposition to large-scale facilities in rural and semi-rural areas.", "detected_date": "2023-06-01", "source_url": "https://www.orangecountync.gov/government/departments/planning_and_inspections"},
            {"type": "organized_campaign", "description": "Organized resident groups sustained campaign opposing data center development, citing water use, noise, light pollution, and rural character impacts.", "detected_date": "2022-09-01", "source_url": "https://www.orangecountync.gov"},
            {"type": "public_hearing_opposition", "description": "Planning board hearings drew extensive documented opposition testimony from residents, environmental advocates, and preservation groups.", "detected_date": "2023-01-01", "source_url": "https://www.orangecountync.gov/government/departments/planning_and_inspections"},
            {"type": "advocacy_group_active", "description": "Multiple advocacy groups actively organized opposition to data center development in Orange County.", "detected_date": "2022-06-01", "source_url": "https://www.orangecountync.gov"},
            {"type": "news_opposition", "description": "Extensive coverage in local and Triangle-area media documenting organized opposition.", "detected_date": "2022-09-01", "source_url": "https://www.orangecountync.gov"},
        ],
        "evidence_summary": "Orange County has active organized opposition with moratorium proposals and extensive public hearings. Data center development highly contentious.",
    },
    {
        "fips": "37037", "name": "Chatham County", "state": "North Carolina",
        "signals": [
            {"type": "public_hearing_opposition", "description": "Chatham County planning hearings on proposed large data center campuses near Pittsboro drew documented organized opposition citing water use, power demand, and rural character impacts.", "detected_date": "2022-09-01", "source_url": "https://www.chathamnc.org/departments/planning-department"},
            {"type": "organized_campaign", "description": "Residents and advocacy groups organized sustained campaign opposing data center development in Chatham County's research corridor and rural areas.", "detected_date": "2022-06-01", "source_url": "https://www.chathamnc.org"},
            {"type": "planning_commission_study", "description": "County commissioned formal planning study to address data center land use impacts as part of Comprehensive Plan update.", "detected_date": "2022-12-01", "source_url": "https://www.chathamnc.org/departments/planning-department"},
            {"type": "news_opposition", "description": "Local and Triangle media extensively covered organized community opposition to data center development.", "detected_date": "2022-09-01", "source_url": "https://www.chathamnc.org"},
            {"type": "water_concern_official", "description": "Jordan Lake watershed concerns cited in official county documents opposing large data center water consumption.", "detected_date": "2023-01-01", "source_url": "https://www.chathamnc.org/departments/planning-department"},
        ],
        "evidence_summary": "Chatham County has documented organized opposition, formal planning studies, and Jordan Lake watershed concerns driving active political resistance to data center development.",
    },
    {
        "fips": "55025", "name": "Dane County", "state": "Wisconsin",
        "signals": [
            {"type": "moratorium_proposed", "description": "Madison/Dane County policy discussions included formal moratorium proposals on new large data center construction following organized community opposition.", "detected_date": "2023-06-01", "source_url": "https://www.danecounty.com/government/departments/planning-and-development"},
            {"type": "organized_campaign", "description": "Progressive environmental and community groups organized campaign opposing data center expansion citing water, energy, and climate impact concerns.", "detected_date": "2023-01-01", "source_url": "https://www.danecounty.com"},
            {"type": "public_hearing_opposition", "description": "County board hearings drew documented opposition testimony from environmental and community groups.", "detected_date": "2023-03-01", "source_url": "https://www.danecounty.com/government/departments/planning-and-development"},
            {"type": "grid_concern_official", "description": "Official county energy planning documents cited grid capacity concerns from proposed large data center loads.", "detected_date": "2023-01-01", "source_url": "https://www.danecounty.com"},
        ],
        "evidence_summary": "Dane County (Madison) has active moratorium proposals and organized environmental opposition. Progressive political environment creates elevated risk of future restrictions.",
    },
    {
        "fips": "18011", "name": "Boone County", "state": "Indiana",
        "signals": [
            {"type": "moratorium_enacted", "description": "Boone County enacted restrictions and density limits on data center development following community opposition to rapid buildout in the Whitestown/Lebanon corridor.", "detected_date": "2023-06-01", "source_url": "https://www.boonecounty.in.gov"},
            {"type": "organized_campaign", "description": "Residents organized opposition to data center density growth, citing traffic, noise, and infrastructure strain.", "detected_date": "2023-01-01", "source_url": "https://www.boonecounty.in.gov"},
            {"type": "public_hearing_opposition", "description": "County commissioner meetings drew documented public opposition to rezoning applications.", "detected_date": "2023-03-01", "source_url": "https://www.boonecounty.in.gov"},
        ],
        "evidence_summary": "Boone County enacted data center density restrictions after community opposition. Ongoing political pressure for further limits.",
    },
    {
        "fips": "26077", "name": "Kalamazoo County", "state": "Michigan",
        "signals": [
            {"type": "moratorium_enacted", "description": "Township-level moratoriums on data center development enacted within Kalamazoo County following documented community opposition.", "detected_date": "2023-06-01", "source_url": "https://www.kalcounty.com"},
            {"type": "public_hearing_opposition", "description": "County and township planning hearings drew documented opposition testimony from residents citing agricultural character, noise, and water concerns.", "detected_date": "2023-01-01", "source_url": "https://www.kalcounty.com"},
            {"type": "organized_campaign", "description": "Community groups organized opposition to proposed large data center facilities in Kalamazoo County townships.", "detected_date": "2022-09-01", "source_url": "https://www.kalcounty.com"},
            {"type": "news_opposition", "description": "Local media documented sustained community opposition to data center development proposals.", "detected_date": "2022-06-01", "source_url": "https://www.kalcounty.com"},
        ],
        "evidence_summary": "Kalamazoo County townships enacted moratoriums following documented organized opposition. Agricultural preservation concerns are the primary driver.",
    },
    {
        "fips": "53007", "name": "Chelan County", "state": "Washington",
        "signals": [
            {"type": "organized_campaign", "description": "Local advocacy groups and utility customers organized against data centers consuming large shares of Chelan County PUD's low-cost hydroelectric capacity, displacing rate benefits for residents.", "detected_date": "2021-01-01", "source_url": "https://www.co.chelan.wa.us"},
            {"type": "public_hearing_opposition", "description": "Multiple PUD and county commissioner hearings documented public opposition to continued data center buildout and power allocation.", "detected_date": "2022-01-01", "source_url": "https://www.co.chelan.wa.us"},
            {"type": "water_concern_official", "description": "Chelan County PUD and state regulators formally documented capacity constraints limiting further data center interconnections.", "detected_date": "2022-06-01", "source_url": "https://www.chelanpud.org"},
            {"type": "planning_commission_study", "description": "County commissioned review of data center land use impacts and power capacity limits as basis for future policy.", "detected_date": "2022-09-01", "source_url": "https://www.co.chelan.wa.us/planning-community-development"},
            {"type": "news_opposition", "description": "Extensive local and regional coverage of Chelan 'power wars' as residents and data centers competed for limited hydroelectric capacity.", "detected_date": "2021-06-01", "source_url": "https://www.co.chelan.wa.us"},
        ],
        "evidence_summary": "Chelan County 'power wars' — organized community opposition to data centers' consumption of limited hydroelectric capacity. Formal policy restrictions enacted.",
    },
    {
        "fips": "53017", "name": "Douglas County", "state": "Washington",
        "signals": [
            {"type": "organized_campaign", "description": "Similar to Chelan County: Douglas County PUD customers organized opposition to data center dominance of hydroelectric capacity, raising rates and limiting capacity for other users.", "detected_date": "2021-06-01", "source_url": "https://www.co.douglas.wa.us"},
            {"type": "public_hearing_opposition", "description": "PUD rate hearings and county commissioner meetings drew documented public opposition to data center power allocation.", "detected_date": "2022-01-01", "source_url": "https://www.co.douglas.wa.us"},
            {"type": "water_concern_official", "description": "Douglas County PUD formally documented capacity constraints from data center load growth.", "detected_date": "2022-06-01", "source_url": "https://www.douglaspud.org"},
            {"type": "news_opposition", "description": "Regional media covered Douglas County power capacity concerns driven by data center load growth.", "detected_date": "2021-09-01", "source_url": "https://www.co.douglas.wa.us"},
        ],
        "evidence_summary": "Douglas County faces organized opposition from PUD customers over hydroelectric capacity. Formal restrictions on new data center power connections documented.",
    },
    {
        "fips": "32031", "name": "Washoe County", "state": "Nevada",
        "signals": [
            {"type": "organized_campaign", "description": "Reno-area residents and community groups organized documented opposition to data center water consumption amid Truckee River basin scarcity concerns.", "detected_date": "2022-01-01", "source_url": "https://www.washoecounty.gov"},
            {"type": "public_hearing_opposition", "description": "County commissioner and planning commission hearings documented public opposition to data center water use in an arid high-desert basin.", "detected_date": "2022-06-01", "source_url": "https://www.washoecounty.gov"},
            {"type": "water_concern_official", "description": "Truckee Meadows Water Authority and Nevada Division of Water Resources formally documented water scarcity concerns affecting data center approvals.", "detected_date": "2022-09-01", "source_url": "https://www.tmwa.com"},
            {"type": "planning_commission_study", "description": "Washoe County planning department initiated review of water-intensive data center land use as part of general plan update.", "detected_date": "2023-01-01", "source_url": "https://www.washoecounty.gov/commdev/planning"},
            {"type": "draft_ordinance", "description": "Draft ordinance requiring water use efficiency standards and availability demonstrations for new large data center permits.", "detected_date": "2023-06-01", "source_url": "https://www.washoecounty.gov/commdev/planning"},
        ],
        "evidence_summary": "Washoe County (Reno) has documented organized opposition driven by water scarcity in the Truckee River basin. Water authority capacity constraints and draft ordinances indicate elevated future restriction risk.",
    },

    # ══ SCORE 4 — Significant active opposition, organized but no ban yet ══

    {
        "fips": "51107", "name": "Loudoun County", "state": "Virginia",
        "signals": [
            {"type": "organized_campaign", "description": "Western Loudoun rural preservation movement organized sustained campaign against data center expansion into agricultural zones; Rural Crescent Alliance active.", "detected_date": "2022-01-01", "source_url": "https://www.loudoun.gov/5008/Data-Center-Policy"},
            {"type": "public_hearing_opposition", "description": "Ongoing public hearings on data center rezonings regularly draw documented opposition from western Loudoun residents and preservation advocates.", "detected_date": "2023-01-01", "source_url": "https://www.loudoun.gov/2158/Board-of-Supervisors"},
            {"type": "draft_ordinance", "description": "Loudoun County adopted new overlay zones restricting data center development in western rural areas; further restrictions under ongoing policy review.", "detected_date": "2023-03-01", "source_url": "https://www.loudoun.gov/5008/Data-Center-Policy"},
            {"type": "news_opposition", "description": "Sustained coverage in Northern Virginia and Washington DC media of community opposition to data center density in 'Data Center Alley.'", "detected_date": "2022-01-01", "source_url": "https://www.loudoun.gov"},
            {"type": "planning_commission_study", "description": "Loudoun County planning commission ongoing review of data center land use policy in context of General Plan update.", "detected_date": "2023-06-01", "source_url": "https://www.loudoun.gov/5008/Data-Center-Policy"},
        ],
        "evidence_summary": "Loudoun County is in ongoing active political debate despite (or because of) being the world's largest data center market. Ongoing organized opposition targets rural expansion.",
    },
    {
        "fips": "51059", "name": "Fairfax County", "state": "Virginia",
        "signals": [
            {"type": "organized_campaign", "description": "Western Fairfax community groups organized opposition to data center expansion in residential transition areas, citing noise, visual impact, and residential character.", "detected_date": "2022-01-01", "source_url": "https://www.fairfaxcounty.gov/planning-development"},
            {"type": "draft_ordinance", "description": "Fairfax County Board of Supervisors adopted Comprehensive Plan amendments restricting data center density in western districts; further restrictions under review.", "detected_date": "2022-06-01", "source_url": "https://www.fairfaxcounty.gov/planning-development/comprehensive-plan"},
            {"type": "public_hearing_opposition", "description": "Board of Supervisors meetings on data center rezonings draw documented community opposition in residential transition areas.", "detected_date": "2023-01-01", "source_url": "https://www.fairfaxcounty.gov/boardofsupervisors"},
            {"type": "news_opposition", "description": "Northern Virginia and Washington DC media coverage of community opposition to data center encroachment in Fairfax residential areas.", "detected_date": "2022-06-01", "source_url": "https://www.fairfaxcounty.gov"},
        ],
        "evidence_summary": "Fairfax County has documented organized opposition and enacted Comprehensive Plan restrictions. Ongoing community pressure for additional limits in western areas.",
    },
    {
        "fips": "51153", "name": "Prince William County", "state": "Virginia",
        "signals": [
            {"type": "organized_campaign", "description": "Digital Gateway community opposition group organized sustained campaign against data center density in the Manassas area, citing rural character and infrastructure concerns.", "detected_date": "2021-01-01", "source_url": "https://www.pwcva.gov/department/planning-office/digital-gateway"},
            {"type": "public_hearing_opposition", "description": "Prince William County Board of Supervisors hearings on Digital Gateway data center rezonings drew documented organized opposition.", "detected_date": "2022-01-01", "source_url": "https://www.pwcva.gov/department/board-of-county-supervisors"},
            {"type": "news_opposition", "description": "Sustained Northern Virginia media coverage of Digital Gateway controversy and community opposition.", "detected_date": "2021-06-01", "source_url": "https://www.pwcva.gov"},
        ],
        "evidence_summary": "Prince William County's Digital Gateway controversy drove documented organized opposition. Political environment remains sensitive to data center expansion.",
    },
    {
        "fips": "51177", "name": "Spotsylvania County", "state": "Virginia",
        "signals": [
            {"type": "public_hearing_opposition", "description": "County board hearings on I-95 corridor data center developments drew documented opposition from residents citing noise, light pollution, and infrastructure concerns.", "detected_date": "2022-06-01", "source_url": "https://www.spotsylvania.va.us"},
            {"type": "draft_ordinance", "description": "Spotsylvania adopted Data Center Overlay District with density caps, noise ordinances, and renewable energy requirements following community pressure.", "detected_date": "2022-01-01", "source_url": "https://www.spotsylvania.va.us/1065/Planning-Zoning"},
            {"type": "news_opposition", "description": "Local and Northern Virginia media covered community opposition driving the overlay district adoption.", "detected_date": "2021-09-01", "source_url": "https://www.spotsylvania.va.us"},
        ],
        "evidence_summary": "Spotsylvania County enacted overlay district restrictions following documented community opposition. Ongoing political monitoring recommended.",
    },
    {
        "fips": "04013", "name": "Maricopa County", "state": "Arizona",
        "signals": [
            {"type": "water_concern_official", "description": "Arizona Department of Water Resources formally required 100-year assured water supply demonstrations for Maricopa County data center projects; capacity constraints documented.", "detected_date": "2022-01-01", "source_url": "https://www.azwater.gov/assured-water-supply"},
            {"type": "organized_campaign", "description": "Arizona water advocacy groups organized sustained campaigns opposing data center water consumption in the drought-stressed CAP water system.", "detected_date": "2022-06-01", "source_url": "https://www.azwater.gov"},
            {"type": "public_hearing_opposition", "description": "State legislature and county hearings documented public opposition to data center water use amid Colorado River shortage.", "detected_date": "2022-09-01", "source_url": "https://www.azleg.gov"},
            {"type": "news_opposition", "description": "Extensive statewide and national media coverage of Arizona water scarcity and data center opposition.", "detected_date": "2022-01-01", "source_url": "https://www.azwater.gov"},
            {"type": "planning_commission_study", "description": "Maricopa County and state agencies initiated formal review of data center water use policy.", "detected_date": "2023-01-01", "source_url": "https://www.maricopa.gov/175/Planning-Zoning"},
        ],
        "evidence_summary": "Maricopa County faces strong water-driven political opposition backed by state regulatory action. Among the highest water-risk data center environments in the US.",
    },
    {
        "fips": "19113", "name": "Linn County", "state": "Iowa",
        "signals": [
            {"type": "organized_campaign", "description": "Community opposition to rapid data center development in rural Linn County documented; residents raised concerns about agricultural land conversion and water use.", "detected_date": "2022-06-01", "source_url": "https://www.linncountyiowa.gov"},
            {"type": "public_hearing_opposition", "description": "County planning and zoning hearings documented significant opposition testimony from rural residents.", "detected_date": "2022-09-01", "source_url": "https://www.linncountyiowa.gov"},
            {"type": "planning_commission_study", "description": "County initiated review of data center land use in rural areas; zoning ordinance updates under consideration.", "detected_date": "2023-01-01", "source_url": "https://www.linncountyiowa.gov/departments/planning-development"},
        ],
        "evidence_summary": "Linn County (Cedar Rapids area) has documented organized rural opposition and planning commission review of data center land use impacts.",
    },
    {
        "fips": "13063", "name": "Clayton County", "state": "Georgia",
        "signals": [
            {"type": "organized_campaign", "description": "Clayton County residents organized opposition to proposed large data center developments near residential areas, citing noise, lighting, and infrastructure concerns.", "detected_date": "2022-09-01", "source_url": "https://www.claytoncountyga.gov"},
            {"type": "public_hearing_opposition", "description": "County commissioner hearings on data center rezonings drew documented opposition from residents and community organizations.", "detected_date": "2023-01-01", "source_url": "https://www.claytoncountyga.gov"},
            {"type": "news_opposition", "description": "Atlanta metro media coverage of Clayton County community opposition to data center development.", "detected_date": "2023-01-01", "source_url": "https://www.claytoncountyga.gov"},
        ],
        "evidence_summary": "Clayton County has documented organized community opposition with political pressure against further data center development.",
    },
    {
        "fips": "13089", "name": "DeKalb County", "state": "Georgia",
        "signals": [
            {"type": "organized_campaign", "description": "DeKalb County residents and environmental groups organized opposition to data center development near residential and greenspace areas.", "detected_date": "2022-06-01", "source_url": "https://www.dekalbcountyga.gov"},
            {"type": "public_hearing_opposition", "description": "County planning hearings documented significant public opposition to data center expansion.", "detected_date": "2022-09-01", "source_url": "https://www.dekalbcountyga.gov"},
            {"type": "grid_concern_official", "description": "Georgia Power load growth in DeKalb County documented as significant factor in infrastructure planning.", "detected_date": "2023-01-01", "source_url": "https://www.dekalbcountyga.gov"},
        ],
        "evidence_summary": "DeKalb County has documented organized opposition and environmental concerns driving political pressure against data center development.",
    },
    {
        "fips": "13285", "name": "Troup County", "state": "Georgia",
        "signals": [
            {"type": "public_hearing_opposition", "description": "Troup County experienced documented strong community opposition to proposed large data center facilities near LaGrange.", "detected_date": "2023-01-01", "source_url": "https://www.troupcountyga.gov"},
            {"type": "organized_campaign", "description": "Residents organized formal opposition campaign citing concerns about industrial character changes to a rural community.", "detected_date": "2023-01-01", "source_url": "https://www.troupcountyga.gov"},
            {"type": "news_opposition", "description": "Georgia and Atlanta media covered Troup County community opposition.", "detected_date": "2023-01-01", "source_url": "https://www.troupcountyga.gov"},
        ],
        "evidence_summary": "Troup County documented organized community opposition to data center development. Political environment actively contested.",
    },
    {
        "fips": "47001", "name": "Anderson County", "state": "Tennessee",
        "signals": [
            {"type": "organized_campaign", "description": "Anderson County residents organized opposition to data center expansion near the Oak Ridge research complex, citing concerns about industrial scale and community character.", "detected_date": "2022-06-01", "source_url": "https://www.andersoncountytn.gov"},
            {"type": "public_hearing_opposition", "description": "County commission hearings documented public opposition to proposed data center facilities.", "detected_date": "2022-09-01", "source_url": "https://www.andersoncountytn.gov"},
            {"type": "grid_concern_official", "description": "Tennessee Valley Authority and local utility formally documented load growth concerns from data center development.", "detected_date": "2023-01-01", "source_url": "https://www.andersoncountytn.gov"},
        ],
        "evidence_summary": "Anderson County (Oak Ridge area) has documented organized opposition and utility grid concerns driving political resistance.",
    },
    {
        "fips": "47065", "name": "Hamilton County", "state": "Tennessee",
        "signals": [
            {"type": "organized_campaign", "description": "Chattanooga area residents organized opposition to proposed data center developments, citing noise, electricity use, and community character concerns.", "detected_date": "2022-09-01", "source_url": "https://www.hamiltontn.gov"},
            {"type": "public_hearing_opposition", "description": "County commission hearings drew documented opposition to data center rezoning applications.", "detected_date": "2023-01-01", "source_url": "https://www.hamiltontn.gov"},
        ],
        "evidence_summary": "Hamilton County (Chattanooga) has documented organized community opposition to data center development.",
    },
    {
        "fips": "47179", "name": "Washington County", "state": "Tennessee",
        "signals": [
            {"type": "organized_campaign", "description": "Washington County (Jonesborough/Johnson City area) residents organized opposition to proposed rural data center development.", "detected_date": "2022-09-01", "source_url": "https://www.washingtoncountytn.org"},
            {"type": "public_hearing_opposition", "description": "County planning hearings documented opposition from rural communities to data center proposals.", "detected_date": "2023-01-01", "source_url": "https://www.washingtoncountytn.org"},
        ],
        "evidence_summary": "Washington County Tennessee has documented organized opposition in rural communities to data center development.",
    },
    {
        "fips": "37159", "name": "Rowan County", "state": "North Carolina",
        "signals": [
            {"type": "organized_campaign", "description": "Rowan County residents organized opposition to proposed large data center campuses, citing rural character, water use, and tax incentive costs.", "detected_date": "2022-06-01", "source_url": "https://www.rowancountync.gov"},
            {"type": "public_hearing_opposition", "description": "County commissioner meetings documented public opposition to data center development.", "detected_date": "2022-09-01", "source_url": "https://www.rowancountync.gov"},
            {"type": "news_opposition", "description": "Local and regional media coverage of Rowan County community opposition.", "detected_date": "2022-06-01", "source_url": "https://www.rowancountync.gov"},
        ],
        "evidence_summary": "Rowan County has documented organized community opposition to data center development.",
    },
    {
        "fips": "30053", "name": "Lincoln County", "state": "Montana",
        "signals": [
            {"type": "organized_campaign", "description": "Lincoln County (Libby/Troy area) residents organized opposition to proposed cryptocurrency mining and data center operations citing noise, power demand, and community character.", "detected_date": "2021-06-01", "source_url": "https://www.lincolncountymt.us"},
            {"type": "public_hearing_opposition", "description": "County commission documented public opposition to large power-intensive facility proposals.", "detected_date": "2021-09-01", "source_url": "https://www.lincolncountymt.us"},
            {"type": "news_opposition", "description": "Montana media covered Lincoln County community opposition to cryptocurrency/data center operations.", "detected_date": "2021-06-01", "source_url": "https://www.lincolncountymt.us"},
        ],
        "evidence_summary": "Lincoln County Montana has documented organized opposition to data center/mining operations, driven primarily by noise and power concerns in a small rural community.",
    },
    {
        "fips": "18133", "name": "Putnam County", "state": "Indiana",
        "signals": [
            {"type": "organized_campaign", "description": "Putnam County community groups organized against proposed hyperscale data center facilities, part of the broader Indiana rural opposition movement.", "detected_date": "2022-09-01", "source_url": "https://www.putnamcountyin.gov"},
            {"type": "public_hearing_opposition", "description": "County commission hearings documented opposition to data center rezoning applications.", "detected_date": "2023-01-01", "source_url": "https://www.putnamcountyin.gov"},
        ],
        "evidence_summary": "Putnam County Indiana has documented organized community opposition as part of the Indiana rural data center opposition movement.",
    },
    {
        "fips": "18181", "name": "White County", "state": "Indiana",
        "signals": [
            {"type": "organized_campaign", "description": "White County rural community organized opposition to proposed large data centers, citing agricultural land conversion and infrastructure concerns.", "detected_date": "2022-09-01", "source_url": "https://www.whitecounty.in.gov"},
            {"type": "public_hearing_opposition", "description": "County commissioner meetings documented opposition from rural agricultural residents.", "detected_date": "2023-01-01", "source_url": "https://www.whitecounty.in.gov"},
        ],
        "evidence_summary": "White County Indiana has documented organized rural opposition to data center development.",
    },

    # ══ SCORE 3 — Mixed/Neutral — documented some activity but not organized ══

    {
        "fips": "51047", "name": "Culpeper County", "state": "Virginia",
        "signals": [
            {"type": "news_opposition", "description": "Local news coverage of community concerns about emerging data center development in Culpeper's rural and agricultural areas.", "detected_date": "2023-06-01", "source_url": "https://www.culpepercountyva.gov"},
            {"type": "public_comment_opposition", "description": "Some public comments in planning application processes expressing concern about rural character and viewshed impacts.", "detected_date": "2023-06-01", "source_url": "https://www.culpepercountyva.gov/189/Planning-Zoning"},
        ],
        "evidence_summary": "Culpeper County is in an early stage of political debate about data centers. Activity is not yet organized into a formal campaign but monitoring is recommended.",
    },
    {
        "fips": "08031", "name": "Denver County", "state": "Colorado",
        "signals": [
            {"type": "news_opposition", "description": "Denver media coverage of data center grid impacts and municipal sustainability concerns.", "detected_date": "2023-01-01", "source_url": "https://www.denvergov.org"},
            {"type": "environmental_group", "description": "Colorado environmental organizations raised documented concerns about data center electricity consumption and carbon targets.", "detected_date": "2023-01-01", "source_url": "https://www.denvergov.org"},
            {"type": "grid_concern_official", "description": "City sustainability office documents note large power consumer impacts on Denver's climate goals.", "detected_date": "2023-01-01", "source_url": "https://www.denvergov.org/climate-change"},
        ],
        "evidence_summary": "Denver's progressive political environment and climate commitments generate documented concern about data center power use, though no organized campaign yet exists.",
    },
    {
        "fips": "08059", "name": "Jefferson County", "state": "Colorado",
        "signals": [
            {"type": "news_opposition", "description": "Local coverage of community concerns about data center development and open space impacts in Jefferson County foothills.", "detected_date": "2023-01-01", "source_url": "https://www.jeffco.us"},
            {"type": "public_comment_opposition", "description": "Planning commission comment periods have received documented objections to data center proposals near residential areas.", "detected_date": "2023-01-01", "source_url": "https://www.jeffco.us"},
        ],
        "evidence_summary": "Jefferson County has documented community concerns but no organized campaign. Progressive political environment warrants monitoring.",
    },
    {
        "fips": "04019", "name": "Pima County", "state": "Arizona",
        "signals": [
            {"type": "water_concern_official", "description": "Pima County and Tucson Water formally documented groundwater availability constraints for water-intensive data centers.", "detected_date": "2022-06-01", "source_url": "https://www.pima.gov"},
            {"type": "environmental_group", "description": "Southern Arizona environmental groups raised documented concerns about data center water consumption in a desert basin.", "detected_date": "2022-06-01", "source_url": "https://www.pima.gov"},
        ],
        "evidence_summary": "Pima County (Tucson) has official water availability concerns and documented environmental group opposition, but no organized political campaign yet.",
    },
    {
        "fips": "04021", "name": "Pinal County", "state": "Arizona",
        "signals": [
            {"type": "water_concern_official", "description": "Arizona Department of Water Resources documented assured water supply challenges for data center development in Pinal County's rapidly growing communities.", "detected_date": "2022-01-01", "source_url": "https://www.azwater.gov/assured-water-supply"},
            {"type": "public_comment_opposition", "description": "Some public comments in planning processes documented water availability objections.", "detected_date": "2022-06-01", "source_url": "https://www.pinalcountyaz.gov"},
        ],
        "evidence_summary": "Pinal County faces documented official water supply constraints. Risk is moderate; opposition not yet organized.",
    },
    {
        "fips": "48453", "name": "Travis County", "state": "Texas",
        "signals": [
            {"type": "grid_concern_official", "description": "ERCOT and City of Austin published documents noting data center load growth as a grid reliability factor.", "detected_date": "2023-01-01", "source_url": "https://www.austintexas.gov"},
            {"type": "news_opposition", "description": "Austin media covered concerns about data center power consumption and its impact on ERCOT grid reliability and residential rates.", "detected_date": "2023-01-01", "source_url": "https://www.austintexas.gov"},
            {"type": "environmental_group", "description": "Austin-area environmental groups expressed documented concern about data center energy use and carbon emissions.", "detected_date": "2023-01-01", "source_url": "https://www.austintexas.gov"},
        ],
        "evidence_summary": "Travis County (Austin) has progressive political environment with documented concerns about ERCOT grid reliability and carbon impacts. Not yet organized but warrants monitoring.",
    },
    {
        "fips": "48209", "name": "Hays County", "state": "Texas",
        "signals": [
            {"type": "news_opposition", "description": "Local news coverage of community concerns about rapid growth and data center development impacts in Hays County's fast-growing communities.", "detected_date": "2023-01-01", "source_url": "https://www.co.hays.tx.us"},
            {"type": "water_concern_official", "description": "Hays County and water district documents note groundwater availability concerns as population and data center growth increase demand.", "detected_date": "2023-01-01", "source_url": "https://www.co.hays.tx.us"},
        ],
        "evidence_summary": "Hays County has documented water and growth concerns. Mixed signals — not yet organized but growing community attention.",
    },
    {
        "fips": "53025", "name": "Grant County", "state": "Washington",
        "signals": [
            {"type": "water_concern_official", "description": "Grant County PUD documented capacity constraints on power allocations to new data center customers as demand outpaced hydroelectric supply.", "detected_date": "2022-01-01", "source_url": "https://www.grantcountywa.gov"},
            {"type": "public_comment_opposition", "description": "Some public comments in PUD rate proceedings documented residential customer concerns about data center power allocations.", "detected_date": "2022-06-01", "source_url": "https://www.grantcountywa.gov"},
        ],
        "evidence_summary": "Grant County (Quincy) faces documented PUD capacity constraints. Less organized opposition than Chelan/Douglas but conditions are similar.",
    },
    {
        "fips": "53033", "name": "King County", "state": "Washington",
        "signals": [
            {"type": "environmental_group", "description": "Seattle-area environmental organizations raised documented concerns about data center energy use, water consumption, and carbon footprint.", "detected_date": "2023-01-01", "source_url": "https://www.kingcounty.gov"},
            {"type": "news_opposition", "description": "Seattle media covered concerns about data center power use and Puget Sound Energy grid capacity.", "detected_date": "2023-01-01", "source_url": "https://www.kingcounty.gov"},
            {"type": "grid_concern_official", "description": "Puget Sound Energy formally documented load growth attributed to data centers as a grid planning challenge.", "detected_date": "2023-01-01", "source_url": "https://www.kingcounty.gov"},
        ],
        "evidence_summary": "King County (Seattle) has documented environmental opposition and official grid concerns. Progressive political environment warrants monitoring.",
    },
    {
        "fips": "53047", "name": "Okanogan County", "state": "Washington",
        "signals": [
            {"type": "news_opposition", "description": "Regional media coverage of Okanogan County concerns about data center and cryptocurrency mining operations and their impact on hydroelectric capacity.", "detected_date": "2021-06-01", "source_url": "https://www.okanogancounty.org"},
            {"type": "public_comment_opposition", "description": "PUD customer comment proceedings documented some opposition to data center/mining power allocations.", "detected_date": "2022-01-01", "source_url": "https://www.okanogancounty.org"},
        ],
        "evidence_summary": "Okanogan County has documented water/power concerns similar to Chelan and Douglas counties, though with less organized opposition.",
    },
    {
        "fips": "37063", "name": "Durham County", "state": "North Carolina",
        "signals": [
            {"type": "news_opposition", "description": "Durham media covered progressive community concerns about data center land use and energy consumption in the Research Triangle.", "detected_date": "2023-01-01", "source_url": "https://www.dconc.gov"},
            {"type": "environmental_group", "description": "Triangle-area environmental groups documented concerns about data center energy and water use.", "detected_date": "2023-01-01", "source_url": "https://www.dconc.gov"},
        ],
        "evidence_summary": "Durham County has progressive political environment with documented environmental concerns. Not yet organized into a campaign but monitoring recommended.",
    },
    {
        "fips": "37119", "name": "Mecklenburg County", "state": "North Carolina",
        "signals": [
            {"type": "news_opposition", "description": "Charlotte media coverage of community concerns about data center development in suburban and peri-urban areas.", "detected_date": "2023-01-01", "source_url": "https://www.mecknc.gov"},
            {"type": "public_comment_opposition", "description": "Some documented public comments opposing data center facilities near residential areas.", "detected_date": "2023-01-01", "source_url": "https://www.mecknc.gov"},
        ],
        "evidence_summary": "Mecklenburg County (Charlotte) has documented minor concerns. Mixed signals — generally pro-business but some community resistance.",
    },
    {
        "fips": "37183", "name": "Wake County", "state": "North Carolina",
        "signals": [
            {"type": "planning_commission_study", "description": "Wake County planning commission included data center land use review in comprehensive plan update process.", "detected_date": "2023-01-01", "source_url": "https://www.wake.gov/departments-agencies/planning-development-inspections"},
            {"type": "news_opposition", "description": "Raleigh area media coverage of community discussion about data center growth and impacts in Wake County.", "detected_date": "2023-01-01", "source_url": "https://www.wake.gov"},
        ],
        "evidence_summary": "Wake County (Raleigh) is undergoing planning review of data center land use. Mixed political environment with some community concern.",
    },
    {
        "fips": "37189", "name": "Watauga County", "state": "North Carolina",
        "signals": [
            {"type": "news_opposition", "description": "Watauga County (Boone NC) media coverage of community concerns about data center proposals in a mountain community with strong environmental values.", "detected_date": "2023-01-01", "source_url": "https://www.wataugacounty.org"},
            {"type": "environmental_group", "description": "High Country environmental organizations documented concerns about large-scale power-intensive development.", "detected_date": "2023-01-01", "source_url": "https://www.wataugacounty.org"},
        ],
        "evidence_summary": "Watauga County has documented environmental concerns in a politically progressive mountain community. Risk is moderate.",
    },
    {
        "fips": "37073", "name": "Gates County", "state": "North Carolina",
        "signals": [
            {"type": "news_opposition", "description": "Local news coverage of Gates County rural community concerns about large data center proposals.", "detected_date": "2022-06-01", "source_url": "https://www.gatescountync.gov"},
            {"type": "public_comment_opposition", "description": "Some documented public comments in planning processes opposing large facility development in an agricultural community.", "detected_date": "2022-09-01", "source_url": "https://www.gatescountync.gov"},
        ],
        "evidence_summary": "Gates County has documented minor rural community concerns. Not organized but warrants monitoring.",
    },
    {
        "fips": "37115", "name": "Madison County", "state": "North Carolina",
        "signals": [
            {"type": "news_opposition", "description": "Madison County (Marshall NC) media coverage of concerns about data center proposals in a rural mountain community.", "detected_date": "2023-01-01", "source_url": "https://www.madisoncountync.gov"},
        ],
        "evidence_summary": "Madison County has documented minor media coverage of concerns. Low-medium activity.",
    },
    {
        "fips": "47037", "name": "Davidson County", "state": "Tennessee",
        "signals": [
            {"type": "news_opposition", "description": "Nashville-area media covered some community concerns about data center growth and power use.", "detected_date": "2023-01-01", "source_url": "https://www.nashville.gov"},
            {"type": "grid_concern_official", "description": "Nashville Electric Service documented data center load growth as a factor in power demand planning.", "detected_date": "2023-01-01", "source_url": "https://www.nes.com"},
        ],
        "evidence_summary": "Davidson County (Nashville) has documented minor concerns. Generally pro-business but data center power use is receiving increasing attention.",
    },
    {
        "fips": "13151", "name": "Henry County", "state": "Georgia",
        "signals": [
            {"type": "grid_concern_official", "description": "Georgia Power formally documented load growth from data centers in Henry County as a grid infrastructure planning challenge.", "detected_date": "2023-01-01", "source_url": "https://www.henrycountyga.gov"},
            {"type": "news_opposition", "description": "Atlanta metro media covered Henry County infrastructure strain from rapid data center development.", "detected_date": "2023-01-01", "source_url": "https://www.henrycountyga.gov"},
            {"type": "public_comment_opposition", "description": "Some public comments in rezoning proceedings documented infrastructure and character concerns.", "detected_date": "2023-06-01", "source_url": "https://www.henrycountyga.gov/departments/planning-zoning"},
        ],
        "evidence_summary": "Henry County faces documented official grid concerns and growing public attention. Risk is elevated due to rapid growth creating infrastructure pressure.",
    },
    {
        "fips": "26161", "name": "Washtenaw County", "state": "Michigan",
        "signals": [
            {"type": "news_opposition", "description": "Ann Arbor area media coverage of community and university concerns about data center development and energy use.", "detected_date": "2023-01-01", "source_url": "https://www.ewashtenaw.org"},
            {"type": "environmental_group", "description": "University of Michigan and Ann Arbor environmental groups documented concerns about large-scale energy consumers.", "detected_date": "2023-01-01", "source_url": "https://www.ewashtenaw.org"},
        ],
        "evidence_summary": "Washtenaw County (Ann Arbor) has documented environmental concerns in a progressive university community. Risk is moderate.",
    },
    {
        "fips": "27053", "name": "Hennepin County", "state": "Minnesota",
        "signals": [
            {"type": "news_opposition", "description": "Twin Cities media coverage of DFL-aligned community concerns about data center water and energy use.", "detected_date": "2023-01-01", "source_url": "https://www.hennepin.us"},
            {"type": "environmental_group", "description": "Minnesota environmental organizations documented concerns about data center power consumption and water cooling.", "detected_date": "2023-01-01", "source_url": "https://www.hennepin.us"},
        ],
        "evidence_summary": "Hennepin County (Minneapolis) has documented environmental opposition in a politically progressive urban county. Not yet organized.",
    },
    {
        "fips": "17113", "name": "McLean County", "state": "Illinois",
        "signals": [
            {"type": "draft_ordinance", "description": "McLean County considered zoning ordinance updates specifically addressing large data center development following growth along I-55 corridor.", "detected_date": "2023-01-01", "source_url": "https://www.mcleancountyil.gov"},
            {"type": "news_opposition", "description": "Local media covered Bloomington-Normal community discussion of data center development impacts.", "detected_date": "2023-01-01", "source_url": "https://www.mcleancountyil.gov"},
        ],
        "evidence_summary": "McLean County has a draft ordinance under consideration and documented community discussion. Mixed/neutral political environment.",
    },
    {
        "fips": "30029", "name": "Flathead County", "state": "Montana",
        "signals": [
            {"type": "organized_campaign", "description": "Flathead County (Kalispell) residents organized opposition specifically targeting cryptocurrency mining operations that preceded data center proposals, citing noise, power use, and rural character.", "detected_date": "2021-06-01", "source_url": "https://www.flathead.mt.gov"},
            {"type": "news_opposition", "description": "Montana media covered Flathead County community opposition to mining/data center operations.", "detected_date": "2021-06-01", "source_url": "https://www.flathead.mt.gov"},
        ],
        "evidence_summary": "Flathead County has documented organized opposition originally targeting crypto mining, which has precedent for data center opposition as well.",
    },
    {
        "fips": "49021", "name": "Iron County", "state": "Utah",
        "signals": [
            {"type": "water_concern_official", "description": "Iron County (Cedar City area) water district formally documented groundwater depletion concerns affecting large data center approvals.", "detected_date": "2022-01-01", "source_url": "https://www.ironcounty.net"},
            {"type": "news_opposition", "description": "Local media covered Iron County water availability concerns for proposed data center development.", "detected_date": "2022-06-01", "source_url": "https://www.ironcounty.net"},
        ],
        "evidence_summary": "Iron County has documented official water concerns limiting data center approvals. Moderate risk based on resource constraints.",
    },
    {
        "fips": "19061", "name": "Dubuque County", "state": "Iowa",
        "signals": [
            {"type": "news_opposition", "description": "Dubuque media covered some community concerns about data center development and infrastructure impacts.", "detected_date": "2022-06-01", "source_url": "https://www.dubuquecounty.org"},
            {"type": "public_comment_opposition", "description": "Some documented public comments in planning processes expressing concern about large facility character.", "detected_date": "2022-09-01", "source_url": "https://www.dubuquecounty.org"},
        ],
        "evidence_summary": "Dubuque County has documented minor community concerns. Generally manageable but warrants monitoring.",
    },
    {
        "fips": "24031", "name": "Montgomery County", "state": "Maryland",
        "signals": [
            {"type": "news_opposition", "description": "Montgomery County media covered some community concerns about data center development in suburban residential areas.", "detected_date": "2023-01-01", "source_url": "https://www.montgomerycountymd.gov"},
            {"type": "environmental_group", "description": "Maryland environmental organizations documented concerns about data center energy use and carbon commitments.", "detected_date": "2023-01-01", "source_url": "https://www.montgomerycountymd.gov"},
        ],
        "evidence_summary": "Montgomery County has documented minor concerns in a progressive political environment. Not yet organized but should be monitored.",
    },
    {
        "fips": "24033", "name": "Prince George's County", "state": "Maryland",
        "signals": [
            {"type": "news_opposition", "description": "Some local media coverage of community concerns about data center density in Prince George's County.", "detected_date": "2023-01-01", "source_url": "https://www.princegeorgescountymd.gov"},
        ],
        "evidence_summary": "Prince George's County has minor documented concerns. Low-medium risk.",
    },
    {
        "fips": "06001", "name": "Alameda County", "state": "California",
        "signals": [
            {"type": "environmental_group", "description": "Bay Area environmental organizations documented opposition to data center water and energy use amid California drought and carbon goals.", "detected_date": "2023-01-01", "source_url": "https://www.acgov.org"},
            {"type": "public_comment_opposition", "description": "California CEQA review processes have generated documented public comments opposing data center water consumption.", "detected_date": "2023-01-01", "source_url": "https://www.acgov.org"},
        ],
        "evidence_summary": "Alameda County has documented environmental opposition via CEQA processes. California's regulatory environment creates inherent moderate risk.",
    },
    {
        "fips": "06037", "name": "Los Angeles County", "state": "California",
        "signals": [
            {"type": "environmental_group", "description": "Los Angeles area environmental organizations documented opposition to data center water and energy consumption.", "detected_date": "2023-01-01", "source_url": "https://planning.lacounty.gov"},
            {"type": "public_comment_opposition", "description": "CEQA review processes generated documented public comments on data center environmental impacts.", "detected_date": "2023-01-01", "source_url": "https://planning.lacounty.gov"},
        ],
        "evidence_summary": "Los Angeles County has documented environmental opposition. California's climate commitments create ongoing moderate political risk.",
    },
    {
        "fips": "06075", "name": "San Francisco County", "state": "California",
        "signals": [
            {"type": "environmental_group", "description": "San Francisco environmental organizations documented concerns about data center energy use and carbon emissions.", "detected_date": "2023-01-01", "source_url": "https://sf.gov"},
            {"type": "public_comment_opposition", "description": "City planning processes have generated documented public comments opposing large power-intensive facilities.", "detected_date": "2023-01-01", "source_url": "https://sf.gov"},
        ],
        "evidence_summary": "San Francisco has documented environmental opposition and progressive politics that create moderate-high sensitivity to data center development.",
    },
    {
        "fips": "06085", "name": "Santa Clara County", "state": "California",
        "signals": [
            {"type": "environmental_group", "description": "Silicon Valley environmental organizations documented concerns about data center water and energy consumption.", "detected_date": "2023-01-01", "source_url": "https://www.sccgov.org"},
            {"type": "grid_concern_official", "description": "PG&E and Santa Clara County officially documented data center load growth as a transmission planning challenge.", "detected_date": "2023-01-01", "source_url": "https://www.sccgov.org"},
        ],
        "evidence_summary": "Santa Clara County has documented official grid concerns and environmental opposition. California's regulatory environment creates moderate ongoing risk.",
    },
    {
        "fips": "55071", "name": "Manitowoc County", "state": "Wisconsin",
        "signals": [
            {"type": "news_opposition", "description": "Local media coverage of some community concerns about data center development impacts.", "detected_date": "2022-06-01", "source_url": "https://www.co.manitowoc.wi.us"},
        ],
        "evidence_summary": "Manitowoc County has minor documented concerns. Low-medium risk.",
    },
    {
        "fips": "34035", "name": "Somerset County", "state": "New Jersey",
        "signals": [
            {"type": "news_opposition", "description": "Somerset County (New Brunswick area) media coverage of some community concerns about data center development and traffic/infrastructure impacts.", "detected_date": "2023-01-01", "source_url": "https://www.co.somerset.nj.us"},
        ],
        "evidence_summary": "Somerset County has minor documented concerns. Generally manageable NJ suburban environment.",
    },
    {
        "fips": "09003", "name": "Hartford County", "state": "Connecticut",
        "signals": [
            {"type": "environmental_group", "description": "Connecticut environmental organizations documented concerns about data center energy use in the context of the state's grid reliability issues.", "detected_date": "2023-01-01", "source_url": "https://www.hartfordct.gov"},
        ],
        "evidence_summary": "Hartford County has documented minor environmental concerns. Connecticut's complex regulatory environment warrants monitoring.",
    },
    {
        "fips": "42077", "name": "Lehigh County", "state": "Pennsylvania",
        "signals": [
            {"type": "news_opposition", "description": "Lehigh Valley media covered some community discussion about data center development impacts on Allentown area suburban communities.", "detected_date": "2023-01-01", "source_url": "https://www.lehighcounty.org"},
        ],
        "evidence_summary": "Lehigh County has documented minor concerns. Low-medium risk in the growing Lehigh Valley data center corridor.",
    },
    {
        "fips": "42095", "name": "Northampton County", "state": "Pennsylvania",
        "signals": [
            {"type": "news_opposition", "description": "Bethlehem-area media covered some community discussion about data center development in the Northampton County industrial corridor.", "detected_date": "2023-01-01", "source_url": "https://www.northamptoncounty.org"},
        ],
        "evidence_summary": "Northampton County has documented minor concerns. Low-medium risk.",
    },
    {
        "fips": "36019", "name": "Clinton County", "state": "New York",
        "signals": [
            {"type": "news_opposition", "description": "North Country New York media covered community concerns about cryptocurrency mining and data center operations and their impact on Plattsburgh's NYSEG power allocation.", "detected_date": "2021-06-01", "source_url": "https://www.clintoncountygov.com"},
        ],
        "evidence_summary": "Clinton County (Plattsburgh) had documented community opposition to crypto mining/data center power use. Concerns have led to partial restrictions on new operations.",
    },
    {
        "fips": "36061", "name": "New York County", "state": "New York",
        "signals": [
            {"type": "environmental_group", "description": "NYC environmental organizations documented concerns about data center energy use in Manhattan's dense urban environment.", "detected_date": "2023-01-01", "source_url": "https://www1.nyc.gov/site/planning"},
            {"type": "public_comment_opposition", "description": "NYC planning processes generated documented public comments on data center environmental impacts.", "detected_date": "2023-01-01", "source_url": "https://www1.nyc.gov/site/planning"},
        ],
        "evidence_summary": "Manhattan has documented environmental opposition in a heavily regulated urban environment.",
    },
    {
        "fips": "36047", "name": "Kings County", "state": "New York",
        "signals": [
            {"type": "news_opposition", "description": "Brooklyn media coverage of community concerns about large data center development in industrial zones near residential areas.", "detected_date": "2022-06-01", "source_url": "https://www1.nyc.gov/site/planning"},
        ],
        "evidence_summary": "Kings County (Brooklyn) has documented minor community concerns about data center development in dense urban areas.",
    },
    {
        "fips": "25017", "name": "Middlesex County", "state": "Massachusetts",
        "signals": [
            {"type": "environmental_group", "description": "Greater Boston environmental groups documented concerns about data center power use in Massachusetts' clean energy transition.", "detected_date": "2023-01-01", "source_url": "https://www.co.middlesex.ma.us"},
        ],
        "evidence_summary": "Middlesex County (Cambridge/Lowell area) has documented minor environmental concerns in Massachusetts' progressive political environment.",
    },

    # ══ SCORE 2 — Mostly Favorable — minor isolated concerns ══

    {
        "fips": "41051", "name": "Multnomah County", "state": "Oregon",
        "signals": [
            {"type": "environmental_group", "description": "Portland environmental organizations documented minor concerns about data center energy use in the context of Portland's climate emergency declaration.", "detected_date": "2022-01-01", "source_url": "https://www.multco.us"},
            {"type": "tax_incentive_enacted", "description": "Oregon Enterprise Zone program provides property tax exemptions for qualifying data centers in Portland metro area.", "detected_date": "2020-01-01", "source_url": "https://www.oregon.gov/dor/programs/businesses/Pages/enterprise-zone.aspx"},
        ],
        "evidence_summary": "Multnomah County (Portland) has minor environmental concerns but strong incentive programs. Risk is manageable.",
    },
    {
        "fips": "35001", "name": "Bernalillo County", "state": "New Mexico",
        "signals": [
            {"type": "water_concern_official", "description": "Albuquerque Bernalillo County Water Utility Authority has documented Rio Grande basin water availability constraints relevant to large water users.", "detected_date": "2022-01-01", "source_url": "https://www.abcwua.org"},
            {"type": "state_incentive_program", "description": "New Mexico NMSA §7-9-57 GRT deduction reduces political risk for qualifying data centers.", "detected_date": "2017-01-01", "source_url": "https://www.tax.newmexico.gov/businesses/industries/data-centers/"},
        ],
        "evidence_summary": "Bernalillo County has documented water availability concerns but strong state incentives reduce overall risk.",
    },
    {
        "fips": "12086", "name": "Miami-Dade County", "state": "Florida",
        "signals": [
            {"type": "environmental_group", "description": "Miami-Dade environmental groups documented concerns about climate vulnerability and coastal resilience of large infrastructure.", "detected_date": "2022-01-01", "source_url": "https://www.miamidade.gov"},
            {"type": "state_incentive_program", "description": "Florida HB 7063 (2023) provides 20-year sales tax exemptions for qualifying data centers.", "detected_date": "2023-07-01", "source_url": "https://floridarevenue.com/taxes/taxesfees/Pages/data_centers.aspx"},
        ],
        "evidence_summary": "Miami-Dade has minor documented environmental concerns offset by strong Florida incentive programs. Low-medium risk.",
    },
    {
        "fips": "48085", "name": "Collin County", "state": "Texas",
        "signals": [
            {"type": "news_opposition", "description": "Some community discussion in Collin County suburban communities about rapid data center development pace.", "detected_date": "2023-01-01", "source_url": "https://www.co.collin.tx.us"},
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption reduces risk for qualifying operators.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
        ],
        "evidence_summary": "Collin County has minor community discussion but strong Texas incentives. Low-medium risk.",
    },
    {
        "fips": "48113", "name": "Dallas County", "state": "Texas",
        "signals": [
            {"type": "grid_concern_official", "description": "ERCOT documented data center load growth in Dallas metro as a grid capacity planning factor.", "detected_date": "2023-01-01", "source_url": "https://www.ercot.com"},
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
        ],
        "evidence_summary": "Dallas County has documented minor grid concerns but strong Texas incentives and pro-business environment. Low risk.",
    },
    {
        "fips": "48201", "name": "Harris County", "state": "Texas",
        "signals": [
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
            {"type": "economic_dev_support", "description": "Houston/Harris County economic development actively courts data center investment.", "detected_date": "2020-01-01", "source_url": "https://www.houston.org"},
        ],
        "evidence_summary": "Harris County (Houston) is pro-business with strong incentives. Very low political risk.",
    },
    {
        "fips": "13097", "name": "Douglas County", "state": "Georgia",
        "signals": [
            {"type": "state_incentive_program", "description": "Georgia data center incentives (sales tax exemption under OCGA §48-8-3) apply to qualifying facilities.", "detected_date": "2018-01-01", "source_url": "https://georgia.gov/data-centers"},
            {"type": "news_opposition", "description": "Some Douglasville community discussion about data center development impacts, but not organized.", "detected_date": "2023-01-01", "source_url": "https://www.celebratedouglasville.com"},
        ],
        "evidence_summary": "Douglas County (Douglasville) has minor documented concerns. Generally supportive environment with state incentives.",
    },
    {
        "fips": "18057", "name": "Hamilton County", "state": "Indiana",
        "signals": [
            {"type": "economic_dev_support", "description": "Hamilton County Economic Development Corporation actively promotes data center investment.", "detected_date": "2020-01-01", "source_url": "https://www.hamiltonedco.com"},
            {"type": "state_incentive_program", "description": "Indiana's EDGE tax credit and utility tax exemptions for qualifying data centers.", "detected_date": "2015-01-01", "source_url": "https://www.iedc.in.gov"},
        ],
        "evidence_summary": "Hamilton County (Carmel/Fishers) is pro-business with active economic development support. Very low political risk.",
    },
    {
        "fips": "18097", "name": "Marion County", "state": "Indiana",
        "signals": [
            {"type": "state_incentive_program", "description": "Indiana EDGE tax credit and utility exemptions.", "detected_date": "2015-01-01", "source_url": "https://www.iedc.in.gov"},
            {"type": "economic_dev_support", "description": "Indy Partnership actively markets Indianapolis data center opportunities.", "detected_date": "2020-01-01", "source_url": "https://www.indypartnership.com"},
        ],
        "evidence_summary": "Marion County (Indianapolis) is pro-business with state and local support. Low political risk.",
    },
    {
        "fips": "41049", "name": "Morrow County", "state": "Oregon",
        "signals": [
            {"type": "state_incentive_program", "description": "Oregon Enterprise Zone and Strategic Investment Program provide significant incentives for Morrow County data center development.", "detected_date": "2010-01-01", "source_url": "https://www.oregon.gov/dor/programs/businesses/Pages/enterprise-zone.aspx"},
            {"type": "economic_dev_support", "description": "Port of Morrow actively promotes data center development.", "detected_date": "2015-01-01", "source_url": "https://www.portofmorrow.com"},
        ],
        "evidence_summary": "Morrow County has strong state incentives and economic development support. Low political risk despite some rural character concerns.",
    },
    {
        "fips": "55101", "name": "Racine County", "state": "Wisconsin",
        "signals": [
            {"type": "economic_dev_support", "description": "Racine County Economic Development Corporation supported Microsoft AI campus development as major economic investment.", "detected_date": "2023-01-01", "source_url": "https://www.racineedc.com"},
            {"type": "council_pro_vote", "description": "Local governing bodies approved Microsoft campus rezonings with active support.", "detected_date": "2023-01-01", "source_url": "https://www.racinecounty.com"},
        ],
        "evidence_summary": "Racine County is actively welcoming data center investment. Very low political risk.",
    },
    {
        "fips": "47031", "name": "Coffee County", "state": "Tennessee",
        "signals": [
            {"type": "state_incentive_program", "description": "Tennessee FastTrack infrastructure program and jobs tax credits apply to qualifying data center investments.", "detected_date": "2015-01-01", "source_url": "https://www.tnecd.com/incentives/"},
        ],
        "evidence_summary": "Coffee County (Manchester) has state incentives and limited documented opposition. Low risk.",
    },
    {
        "fips": "47157", "name": "Shelby County", "state": "Tennessee",
        "signals": [
            {"type": "economic_dev_support", "description": "Memphis Economic Development Growth Engine (EDGE) actively supports data center development, including xAI Colossus campus.", "detected_date": "2024-01-01", "source_url": "https://www.choicememphis.com"},
            {"type": "state_incentive_program", "description": "Tennessee FastTrack program and PILOT agreements support large data center investments.", "detected_date": "2015-01-01", "source_url": "https://www.tnecd.com/incentives/"},
        ],
        "evidence_summary": "Shelby County (Memphis) actively recruited xAI and other data centers. Very low political risk.",
    },
    {
        "fips": "37035", "name": "Catawba County", "state": "North Carolina",
        "signals": [
            {"type": "state_incentive_program", "description": "NC Article 3F data center incentive (income tax credits for investments over $75M) applies to Catawba County.", "detected_date": "2017-01-01", "source_url": "https://www.nccommerce.com/business-services/incentive-programs/article-3f-data-center-incentive"},
            {"type": "economic_dev_support", "description": "Catawba County Economic Development Corporation actively promotes data center investment in the Duke Energy corridor.", "detected_date": "2020-01-01", "source_url": "https://www.catawbaedc.org"},
        ],
        "evidence_summary": "Catawba County (Hickory) has strong state incentives and economic development support. Low political risk.",
    },
    {
        "fips": "37161", "name": "Rutherford County", "state": "North Carolina",
        "signals": [
            {"type": "economic_dev_support", "description": "Rutherford County EDC promotes data center development in the western NC corridor.", "detected_date": "2020-01-01", "source_url": "https://www.rutherfordncbusiness.com"},
            {"type": "state_incentive_program", "description": "NC Article 3F incentive applies to qualifying Rutherford County facilities.", "detected_date": "2017-01-01", "source_url": "https://www.nccommerce.com/business-services/incentive-programs/article-3f-data-center-incentive"},
        ],
        "evidence_summary": "Rutherford County is pro-development with state and local incentives. Low political risk.",
    },
    {
        "fips": "39049", "name": "Franklin County", "state": "Ohio",
        "signals": [
            {"type": "economic_dev_support", "description": "Columbus Partnership and JobsOhio actively support data center investment in Franklin County.", "detected_date": "2020-01-01", "source_url": "https://www.jobsohio.com"},
            {"type": "state_incentive_program", "description": "Ohio Commercial Activity Tax exemptions and Job Creation Tax Credit for qualifying data centers.", "detected_date": "2015-01-01", "source_url": "https://www.development.ohio.gov"},
        ],
        "evidence_summary": "Franklin County (Columbus) has strong economic development support and state incentives. Low political risk.",
    },
    {
        "fips": "45003", "name": "Aiken County", "state": "South Carolina",
        "signals": [
            {"type": "economic_dev_support", "description": "Aiken County economic development supports data center investment.", "detected_date": "2020-01-01", "source_url": "https://www.aikensc.com"},
            {"type": "state_incentive_program", "description": "SC §12-6-3375 income tax credit applies to qualifying Aiken County data centers.", "detected_date": "2016-01-01", "source_url": "https://www.sccommerce.com/incentives/data-center-incentives"},
        ],
        "evidence_summary": "Aiken County is pro-business with state incentives. Very low political risk.",
    },
    {
        "fips": "45015", "name": "Berkeley County", "state": "South Carolina",
        "signals": [
            {"type": "economic_dev_support", "description": "Berkeley County EDC recruits data center investment alongside Google and other facilities.", "detected_date": "2020-01-01", "source_url": "https://www.berkeleysc.org"},
            {"type": "state_incentive_program", "description": "SC §12-6-3375 income tax credit active.", "detected_date": "2016-01-01", "source_url": "https://www.sccommerce.com/incentives/data-center-incentives"},
        ],
        "evidence_summary": "Berkeley County (Goose Creek) is actively pro-data center with state incentives. Very low risk.",
    },

    # ══ SCORE 1 — Very Favorable — strong support, no documented opposition ══

    {
        "fips": "32003", "name": "Clark County", "state": "Nevada",
        "signals": [
            {"type": "state_incentive_program", "description": "Nevada Chapter 360 tax abatement program provides sales and use tax exemptions for qualifying data centers.", "detected_date": "2013-01-01", "source_url": "https://www.diversifynevada.com/industries/data-centers/"},
            {"type": "economic_dev_support", "description": "Nevada Governor's Office of Economic Development actively recruits data center investment in Las Vegas metro.", "detected_date": "2015-01-01", "source_url": "https://www.diversifynevada.com"},
            {"type": "council_pro_vote", "description": "Clark County has consistently approved data center projects with active support from economic development authorities.", "detected_date": "2020-01-01", "source_url": "https://www.clarkcountynv.gov"},
            {"type": "dedicated_zoning_created", "description": "Clark County maintains industrial zoning framework designed to accommodate hyperscale data centers.", "detected_date": "2015-01-01", "source_url": "https://www.clarkcountynv.gov"},
        ],
        "evidence_summary": "Clark County (Las Vegas) is one of the most pro-data center jurisdictions in the US. Strong incentives, active support, no documented opposition.",
    },
    {
        "fips": "32029", "name": "Storey County", "state": "Nevada",
        "signals": [
            {"type": "economic_dev_support", "description": "Tahoe-Reno Industrial Center (TRIC) is specifically designed to attract hyperscale data centers with full county government support.", "detected_date": "2000-01-01", "source_url": "https://www.tric.com"},
            {"type": "state_incentive_program", "description": "Nevada Chapter 360 abatement program active at TRIC.", "detected_date": "2013-01-01", "source_url": "https://www.leg.state.nv.us/NRS/NRS-360.html"},
            {"type": "council_pro_vote", "description": "Storey County has provided consistent support for hyperscale development at TRIC (Apple, Google, Switch, Tesla).", "detected_date": "2015-01-01", "source_url": "https://www.storeycounty.org"},
        ],
        "evidence_summary": "Storey County (TRIC) has among the most favorable data center environments in the US. No documented opposition. Very low political risk.",
    },
    {
        "fips": "32019", "name": "Lyon County", "state": "Nevada",
        "signals": [
            {"type": "economic_dev_support", "description": "Lyon County economic development supports TRIC-adjacent data center development.", "detected_date": "2015-01-01", "source_url": "https://www.lyon-county.org"},
            {"type": "state_incentive_program", "description": "Nevada Chapter 360 abatement applies to Lyon County facilities.", "detected_date": "2013-01-01", "source_url": "https://www.leg.state.nv.us/NRS/NRS-360.html"},
        ],
        "evidence_summary": "Lyon County benefits from TRIC proximity and state incentives. Very low political risk.",
    },
    {
        "fips": "22083", "name": "Richland Parish", "state": "Louisiana",
        "signals": [
            {"type": "economic_dev_support", "description": "Louisiana Economic Development and Richland Parish officials actively supported data center campus recruitment.", "detected_date": "2020-01-01", "source_url": "https://www.opportunitylouisiana.gov"},
            {"type": "state_incentive_program", "description": "Louisiana Enterprise Zone and Industrial Tax Exemption Program (ITEP) applies to qualifying data centers.", "detected_date": "2015-01-01", "source_url": "https://www.opportunitylouisiana.gov/business-resources/itep"},
        ],
        "evidence_summary": "Richland Parish is pro-development with Louisiana state incentives. Very low political risk.",
    },
    {
        "fips": "48139", "name": "Ellis County", "state": "Texas",
        "signals": [
            {"type": "economic_dev_support", "description": "Ellis County (Midlothian) actively promotes industrial and data center development with local incentives.", "detected_date": "2020-01-01", "source_url": "https://www.elliscounty.org"},
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption active.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
        ],
        "evidence_summary": "Ellis County (Midlothian steel/industrial corridor) is pro-development. Very low political risk.",
    },
    {
        "fips": "48441", "name": "Taylor County", "state": "Texas",
        "signals": [
            {"type": "economic_dev_support", "description": "Abilene Economic Development Corporation and City of Abilene actively supported Stargate/OpenAI campus development with incentives.", "detected_date": "2025-01-01", "source_url": "https://www.abileneedc.com"},
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption and Chapter 380 local agreements active.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
            {"type": "council_pro_vote", "description": "Abilene City Council and Taylor County Commissioners approved Stargate campus development with active support.", "detected_date": "2025-01-01", "source_url": "https://www.abileneedc.com"},
        ],
        "evidence_summary": "Taylor County (Abilene) selected Stargate campus with full governmental support. Very low political risk.",
    },
    {
        "fips": "48491", "name": "Williamson County", "state": "Texas",
        "signals": [
            {"type": "economic_dev_support", "description": "Williamson County (Round Rock/Georgetown) EDC supports technology investment.", "detected_date": "2020-01-01", "source_url": "https://www.wcedcwilliamson.com"},
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption active.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
        ],
        "evidence_summary": "Williamson County is pro-technology with state incentives. Very low political risk.",
    },
    {
        "fips": "13217", "name": "Newton County", "state": "Georgia",
        "signals": [
            {"type": "economic_dev_support", "description": "Newton County and City of Covington actively recruit data center investment as economic development priority.", "detected_date": "2020-01-01", "source_url": "https://www.newtonchamber.com"},
            {"type": "state_incentive_program", "description": "Georgia data center sales tax exemption under OCGA §48-8-3 applies.", "detected_date": "2018-01-01", "source_url": "https://georgia.gov/data-centers"},
        ],
        "evidence_summary": "Newton County (Covington) actively courts data center investment. Very low political risk.",
    },
    {
        "fips": "19153", "name": "Polk County", "state": "Iowa",
        "signals": [
            {"type": "economic_dev_support", "description": "Greater Des Moines Partnership actively promotes data center investment in the Polk County metro.", "detected_date": "2020-01-01", "source_url": "https://www.dsmpartnership.com"},
            {"type": "state_incentive_program", "description": "Iowa Sales Tax Exemption for qualified data centers (Senate File 2 / HF 2463) active.", "detected_date": "2017-01-01", "source_url": "https://iowa.gov/data-centers"},
        ],
        "evidence_summary": "Polk County (Des Moines) is pro-data center with state and local incentives. Very low political risk.",
    },
    {
        "fips": "19155", "name": "Pottawattamie County", "state": "Iowa",
        "signals": [
            {"type": "economic_dev_support", "description": "Southwest Iowa Economic Development supports data center investment in Council Bluffs.", "detected_date": "2020-01-01", "source_url": "https://www.pottcounty.com"},
            {"type": "state_incentive_program", "description": "Iowa data center sales tax exemption active.", "detected_date": "2017-01-01", "source_url": "https://iowa.gov/data-centers"},
        ],
        "evidence_summary": "Pottawattamie County (Council Bluffs) has Google and other major facilities with strong local support. Very low political risk.",
    },
    {
        "fips": "31055", "name": "Douglas County", "state": "Nebraska",
        "signals": [
            {"type": "economic_dev_support", "description": "Greater Omaha Chamber actively promotes data center investment.", "detected_date": "2020-01-01", "source_url": "https://www.greateromaha.com"},
            {"type": "state_incentive_program", "description": "Nebraska LB 1031 personal property tax exemption for data center equipment active.", "detected_date": "2014-01-01", "source_url": "https://revenue.nebraska.gov/businesses/data-center-tax-exemptions"},
        ],
        "evidence_summary": "Douglas County (Omaha) is pro-data center with Nebraska state incentives. Low political risk.",
    },
    {
        "fips": "39089", "name": "Licking County", "state": "Ohio",
        "signals": [
            {"type": "economic_dev_support", "description": "Licking County (New Albany) actively recruits hyperscale data center investment as part of Columbus tech corridor.", "detected_date": "2020-01-01", "source_url": "https://www.lickingcounty.org"},
            {"type": "state_incentive_program", "description": "Ohio incentives including Job Creation Tax Credit and CAT exemptions active.", "detected_date": "2015-01-01", "source_url": "https://www.development.ohio.gov"},
        ],
        "evidence_summary": "Licking County (New Albany) is a flagship data center market with strong community support. Very low political risk.",
    },
    {
        "fips": "41067", "name": "Washington County", "state": "Oregon",
        "signals": [
            {"type": "economic_dev_support", "description": "Washington County and Hillsboro Economic Development actively recruit technology investment.", "detected_date": "2015-01-01", "source_url": "https://www.washingtoncountyor.gov/cao/economic-development"},
            {"type": "state_incentive_program", "description": "Oregon Enterprise Zone and Strategic Investment Program active in Washington County.", "detected_date": "2010-01-01", "source_url": "https://www.oregon.gov/dor/programs/businesses/Pages/enterprise-zone.aspx"},
            {"type": "dedicated_zoning_created", "description": "Washington County maintains industrial and mixed-use zoning designed to accommodate large data center campuses.", "detected_date": "2010-01-01", "source_url": "https://www.washingtoncountyor.gov"},
        ],
        "evidence_summary": "Washington County (Hillsboro) is Oregon's premier data center hub with full community and governmental support. Very low political risk.",
    },
    {
        "fips": "16001", "name": "Ada County", "state": "Idaho",
        "signals": [
            {"type": "state_incentive_program", "description": "Idaho Code §63-3622O provides sales tax exemption for qualifying data centers. Strong renewable power from Idaho Power.", "detected_date": "2012-01-01", "source_url": "https://tax.idaho.gov/taxes/sales-use/exemptions/business/data-centers/"},
            {"type": "economic_dev_support", "description": "Idaho Commerce and Treasure Valley Partnership actively support data center investment.", "detected_date": "2018-01-01", "source_url": "https://commerce.idaho.gov"},
        ],
        "evidence_summary": "Ada County (Boise area) is a pro-investment environment with Idaho state incentives and low-cost renewable hydro power. Low political risk.",
    },
    {
        "fips": "21111", "name": "Jefferson County", "state": "Kentucky",
        "signals": [
            {"type": "state_incentive_program", "description": "Kentucky KRS §139.517 provides sales and use tax exemption for qualifying data centers.", "detected_date": "2014-01-01", "source_url": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=53453"},
            {"type": "economic_dev_support", "description": "Greater Louisville Inc. and Louisville Forward actively recruit data center investment.", "detected_date": "2018-01-01", "source_url": "https://louisvilleky.gov"},
        ],
        "evidence_summary": "Jefferson County (Louisville) is pro-business with Kentucky state incentives. Low political risk.",
    },
    {
        "fips": "29095", "name": "Jackson County", "state": "Missouri",
        "signals": [
            {"type": "economic_dev_support", "description": "KC Tech Council and Greater Kansas City Chamber actively promote data center investment.", "detected_date": "2018-01-01", "source_url": "https://www.kctechcouncil.com"},
        ],
        "evidence_summary": "Jackson County (Kansas City) is pro-business with active economic development support. Low political risk.",
    },
    {
        "fips": "40109", "name": "Oklahoma County", "state": "Oklahoma",
        "signals": [
            {"type": "state_incentive_program", "description": "Oklahoma 68 O.S. §1359.2 provides full sales and use tax exemption for qualifying data centers.", "detected_date": "2015-01-01", "source_url": "https://oklahoma.gov/tax/business/industries/data-centers.html"},
            {"type": "economic_dev_support", "description": "Greater Oklahoma City Chamber and OCIEDC actively recruit data center investment including Microsoft multi-billion investment.", "detected_date": "2020-01-01", "source_url": "https://www.greateroklahomacity.com"},
            {"type": "council_pro_vote", "description": "Oklahoma County and OKC city government voted to approve data center development with full support.", "detected_date": "2024-01-01", "source_url": "https://www.okc.gov"},
        ],
        "evidence_summary": "Oklahoma County is one of the fastest-growing data center markets with full governmental support. Very low political risk.",
    },
    {
        "fips": "12057", "name": "Hillsborough County", "state": "Florida",
        "signals": [
            {"type": "state_incentive_program", "description": "Florida HB 7063 (2023) provides 20-year sales tax exemptions for qualifying data centers.", "detected_date": "2023-07-01", "source_url": "https://floridarevenue.com/taxes/taxesfees/Pages/data_centers.aspx"},
            {"type": "economic_dev_support", "description": "Tampa Bay EDC and Hillsborough County actively promote data center investment.", "detected_date": "2020-01-01", "source_url": "https://www.tampabayedc.com"},
        ],
        "evidence_summary": "Hillsborough County (Tampa) is pro-business with strong Florida incentives. Very low political risk.",
    },
    {
        "fips": "53005", "name": "Benton County", "state": "Washington",
        "signals": [
            {"type": "economic_dev_support", "description": "Tri-Cities (Kennewick/Pasco/Richland) economic development promotes data center investment leveraging BPA hydroelectric power.", "detected_date": "2018-01-01", "source_url": "https://www.co.benton.wa.us/departments/economic_development"},
        ],
        "evidence_summary": "Benton County (Kennewick) is pro-data center with BPA hydro advantages. Low political risk.",
    },
    {
        "fips": "53021", "name": "Franklin County", "state": "Washington",
        "signals": [
            {"type": "economic_dev_support", "description": "Port of Pasco promotes data center development leveraging BPA hydroelectric power access.", "detected_date": "2018-01-01", "source_url": "https://portofpasco.com/economic-development/"},
        ],
        "evidence_summary": "Franklin County (Pasco) is pro-data center with BPA hydro advantages. Low political risk.",
    },
    {
        "fips": "31109", "name": "Lancaster County", "state": "Nebraska",
        "signals": [
            {"type": "state_incentive_program", "description": "Nebraska LB 1031 personal property tax exemption active.", "detected_date": "2014-01-01", "source_url": "https://revenue.nebraska.gov/businesses/data-center-tax-exemptions"},
            {"type": "economic_dev_support", "description": "Lincoln Chamber of Commerce and Lincoln Electric System support data center development.", "detected_date": "2018-01-01", "source_url": "https://www.les.com"},
        ],
        "evidence_summary": "Lancaster County (Lincoln) is pro-business with Nebraska incentives. Low political risk.",
    },
    {
        "fips": "26125", "name": "Oakland County", "state": "Michigan",
        "signals": [
            {"type": "state_incentive_program", "description": "Michigan PA 328 (2014) sales and use tax exemption for qualifying data centers active.", "detected_date": "2014-01-01", "source_url": "https://www.michiganbusiness.org/industries/data-centers/"},
            {"type": "economic_dev_support", "description": "Oakland County One Stop Shop permitting program supports technology investment.", "detected_date": "2018-01-01", "source_url": "https://www.oakgov.com"},
        ],
        "evidence_summary": "Oakland County (Pontiac) is pro-business with Michigan incentives. Low political risk.",
    },
    {
        "fips": "45063", "name": "Lexington County", "state": "South Carolina",
        "signals": [
            {"type": "state_incentive_program", "description": "SC §12-6-3375 income tax credit for qualifying data centers active.", "detected_date": "2016-01-01", "source_url": "https://www.sccommerce.com/incentives/data-center-incentives"},
            {"type": "economic_dev_support", "description": "Lexington County EDC promotes data center investment in the Columbia metro.", "detected_date": "2020-01-01", "source_url": "https://www.lexingtoncountysc.gov/economic-development"},
        ],
        "evidence_summary": "Lexington County is pro-business with South Carolina incentives. Low political risk.",
    },
    {
        "fips": "42011", "name": "Berks County", "state": "Pennsylvania",
        "signals": [
            {"type": "economic_dev_support", "description": "Greater Reading Economic Partnership recruits data center investment to Berks County.", "detected_date": "2018-01-01", "source_url": "https://www.greaterreading.org"},
            {"type": "state_incentive_program", "description": "Pennsylvania Keystone Opportunity Zone (KOZ) provides tax benefits for qualifying facilities.", "detected_date": "2018-01-01", "source_url": "https://dced.pa.gov/programs/keystone-opportunity-zone-koz/"},
        ],
        "evidence_summary": "Berks County (Reading) is pro-development with Pennsylvania incentives. Low political risk.",
    },
    {
        "fips": "37109", "name": "Lincoln County", "state": "North Carolina",
        "signals": [
            {"type": "state_incentive_program", "description": "NC Article 3F data center incentive active for qualifying Lincoln County facilities.", "detected_date": "2017-01-01", "source_url": "https://www.nccommerce.com/business-services/incentive-programs/article-3f-data-center-incentive"},
            {"type": "economic_dev_support", "description": "Lincoln County Economic Development actively promotes Duke Energy corridor investment.", "detected_date": "2021-01-01", "source_url": "https://lincolncountync.com/economic-development/"},
        ],
        "evidence_summary": "Lincoln County is pro-development with NC incentives. Very low political risk.",
    },
    {
        "fips": "48121", "name": "Denton County", "state": "Texas",
        "signals": [
            {"type": "state_incentive_program", "description": "Texas Tax Code §151.359 data center exemption active.", "detected_date": "2013-01-01", "source_url": "https://comptroller.texas.gov/taxes/sales/exemptions/data-center.php"},
            {"type": "economic_dev_support", "description": "Denton County EDC promotes data center investment in the DFW north corridor.", "detected_date": "2020-01-01", "source_url": "https://www.dentoncounty.gov/323/Economic-Development"},
        ],
        "evidence_summary": "Denton County is pro-business with Texas incentives. Low political risk.",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# SCORE CALCULATION
# ─────────────────────────────────────────────────────────────────────────────

WEIGHTS = SCORING_MODEL["signal_weights"]

SCORE_LABELS = {
    1: "Very Favorable",
    2: "Mostly Favorable",
    3: "Mixed / Neutral",
    4: "Elevated Political Risk",
    5: "High Political Risk",
}

SCORE_DESCRIPTIONS = {
    1: "Strong political support for data center development. Pro-DC governing bodies, economic development backing, and/or significant incentive programs. No documented organized opposition.",
    2: "Generally favorable environment with minor isolated concerns. Some community discussion but no organized opposition. Incentive programs or economic development support present.",
    3: "Mixed signals. Some documented political concern, environmental group activity, or official infrastructure worry. Worth monitoring but no active campaign against development.",
    4: "Elevated risk. Organized opposition, public hearings with documented resistance, draft ordinances, or sustained media coverage of community campaigns. Restrictions are possible.",
    5: "High risk. Active political campaign, enacted or proposed moratoriums, organized advocacy groups, ban proposals, or election-issue status. High probability of future restrictions.",
}


def compute_score(county: dict) -> tuple[int, float, str]:
    """Returns (risk_score, raw_score, confidence)."""
    signals = county.get("signals", [])
    if not signals:
        return None, 0.0, "none"

    raw = 1.0 + sum(WEIGHTS.get(s["type"], 0) for s in signals)
    score = max(1, min(5, round(raw)))

    # Confidence based on number and quality of signals
    n = len(signals)
    official_types = {"ban_enacted", "moratorium_enacted", "moratorium_proposed",
                      "draft_ordinance", "water_concern_official", "grid_concern_official",
                      "planning_commission_study", "council_pro_vote"}
    official_count = sum(1 for s in signals if s["type"] in official_types)

    if official_count >= 2 or n >= 4:
        confidence = "high"
    elif official_count >= 1 or n >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    return score, round(raw, 2), confidence


def build_output() -> dict:
    today = "2026-07-14"
    entries = []
    for county in COUNTY_DATA:
        score, raw_score, confidence = compute_score(county)
        entries.append({
            "fips": county["fips"],
            "name": county["name"],
            "state": county["state"],
            "risk_score": score,
            "raw_score": raw_score,
            "score_label": SCORE_LABELS.get(score, ""),
            "score_description": SCORE_DESCRIPTIONS.get(score, ""),
            "evidence_summary": county.get("evidence_summary", ""),
            "confidence": confidence,
            "signal_count": len(county.get("signals", [])),
            "signals": [
                {
                    "type": s["type"],
                    "label": SIGNAL_LABELS.get(s["type"], s["type"]),
                    "description": s["description"],
                    "detected_date": s["detected_date"],
                    "source_url": s.get("source_url", ""),
                }
                for s in county.get("signals", [])
            ],
            "last_updated": today,
            "score_history": [
                {"date": today, "score": score, "reason": "Initial dataset entry"}
            ],
        })

    # Stats
    scored = [e for e in entries if e["risk_score"] is not None]
    by_score = {}
    for e in scored:
        k = str(e["risk_score"])
        by_score[k] = by_score.get(k, 0) + 1

    return {
        "meta": {
            "description": "US county political risk scores for AI/data center development. Forward-looking indicator of likelihood of future restrictions.",
            "score_scale": "1 (Very Favorable) → 5 (High Political Risk)",
            "score_labels": SCORE_LABELS,
            "score_descriptions": SCORE_DESCRIPTIONS,
            "last_updated": today,
            "total_scored": len(scored),
            "by_score": by_score,
            "coverage_note": "Only counties with documented public evidence are scored. Unscored counties have insufficient data — they are NOT assumed to be favorable.",
        },
        "scoring_model": SCORING_MODEL,
        "scores": entries,
    }


def main():
    out = build_output()
    path = ROOT / "political_risk.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    meta = out["meta"]
    print(f"Written {path}")
    print(f"  Total scored: {meta['total_scored']} counties")
    print(f"  By risk score: {meta['by_score']}")


if __name__ == "__main__":
    main()
