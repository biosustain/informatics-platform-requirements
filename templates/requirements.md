---
title: Project Data Strategy and Requirements
description: Superseded by the needs statement + requirement specification pair. Kept so questionnaires started before the split still open.
hidden: true
---

# Project Data Strategy and Requirements

> **Template.** Replace bracketed prompts, remove guidance that does not apply, and keep unresolved items visible. Complete this with the project team and Informatics Platform team; do not treat an assumed platform capability as confirmed until its owner and evidence are recorded.

## Document Control

| Item | Value |
| --- | --- |
| Project / campaign | [Name and stable project link or ID] |
| Team / department | [Team] |
| Business / scientific lead | [Name, role] |
| Informatics Platform contact | [Name, role] |
| Status | [Draft / in review / agreed / superseded] |
| Version and date | [Version, YYYY-MM-DD] |
| Related documents | [Links to proposals, architecture, protocols, existing data strategy] |

## Purpose

**Project in brief:** [What the team does and the project lifecycle.]

**Scope:** [Which project workflows and platform components are in scope, such as the Data Catalog, Benchling, data lake, ingestion, processing, or compute? Note what is out of scope.]

## Target Data Strategy

Describe the intended path from project data to a useful outcome. Keep it at the level needed to identify Informatics Platform fit and gaps; mark proposals and unknowns clearly.

| Topic | Project-specific strategy |
| --- | --- |
| Main workflow and users | [Who creates, manages, analyzes, and uses the data?] |
| Data sources and outputs | [What data enters, where it comes from, and what needs to come out?] |
| Organizing unit and identifiers | [Project, campaign, experiment, sample, or other; how records link across systems.] |
| Systems of record | [Where authoritative metadata, raw data, processed data, and results should live.] |
| Data flow | [How data should move between source systems, platform components, analysis, and users.] |
| Metadata and reuse | [What context is needed to find, interpret, compare, or reuse the data?] |
| Access and lifecycle | [Who needs access, and any known sharing, retention, or preservation needs.] |

### Platform capability fit

Record what the project needs from the platform and what still needs confirmation. Capability examples are not commitments that a service is available or suitable.

| Capability | Project need | Current fit / evidence | Gap or action needed |
| --- | --- | --- | --- |
| [Data Catalog, Benchling, data lake, ingestion, processing, compute, provenance, APIs, other] | [Need] | [Confirmed / partial / unknown; evidence or owner] | [Build, integrate, configure, investigate, or none] |

## Requirements

List the project needs that the Informatics Platform team should assess and prioritize. Write each as an observable outcome, link it to the reason it matters, and state how the project team will know it is met. Priority reflects project value, not implementation effort.

**Priority:** `P0` essential; `P1` high; `P2` useful; `P3` later.

| ID | Requirement | Why it matters | Priority | Acceptance check | Owner / dependency | Status |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | [The system or service shall... Describe one observable need.] | [Goal, workflow, or evidence] | [P0-P3] | [How to verify it is met] | [Owner or dependency] | [Proposed / agreed / deferred] |

## Acceptance and Review

This document is ready for prioritization when:

- The project purpose and scope are clear.
- The target data strategy describes the key data flow and identifies relevant platform capabilities, gaps, and unknowns.
- Each requirement has a priority, rationale, acceptance check, and owner or dependency.
- The project and Informatics Platform teams have reviewed the requirements and agree on the next decision or action.

| Reviewer | Name | Decision / comments | Date |
| --- | --- | --- | --- |
| Project lead | [Name] | [Agreed / changes requested] | [Date] |
| Informatics Platform | [Name] | [Prioritize / investigate / defer; comments] | [Date] |

## Appendix: Requirement Record Example

> Illustrative only; replace with a project-specific need.

| Field | Example |
| --- | --- |
| ID | REQ-01 |
| Requirement | The service shall link each ingested result to its project and originating run. |
| Why it matters | Users need to find results by project and trace them to their source. |
| Priority | P1 - High |
| Acceptance check | Given results with valid project and run identifiers, users can retrieve each result under the correct project and run. Records with missing identifiers are reported for resolution. |
| Owner / dependency | Project data owner; source system provides stable identifiers. |
| Status | Proposed |
