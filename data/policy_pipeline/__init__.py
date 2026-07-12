"""Government-source policy discovery pipeline for US datacenter restriction tracking.

This package discovers, normalizes, and tracks the lifecycle of US data center
and AI policy documents from official government sources. Discovered candidates
go into policy_candidates.json — they are NEVER automatically written to
restrictions_raw.json or map_data.json without human review.
"""
__version__ = "1.0.0"
