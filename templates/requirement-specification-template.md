---
title: Project Data Strategy and Requirement Specification
description: Prioritised, testable requirements derived from a project needs statement, for assessment by the Informatics Platform team. Written by the needs-to-requirements skill, not filled in through the app.
hidden: true
---

# Project Data Strategy and Requirement Specification — [Project]

> **Derived from** [needs statement file name, version, date] **by** [author].
> Do not treat an assumed platform capability as confirmed until its owner and
> evidence are recorded. Items marked **unknown** have not been verified.

## Document Control

| Item | Value |
| --- | --- |
| Project / campaign | [Name and stable project link or ID] |
| Team / department | [Team] |
| Business / scientific lead | [Name, role] |
| Informatics Platform contact | [Name, role] |
| Data owner | [Who owns the scientific content, as distinct from the platform] |
| Status | [Draft / in review / agreed / superseded] |
| Version and date | [Version, YYYY-MM-DD] |
| Data classification | [Public / internal / confidential; personal data yes or no] |
| Source needs statement | [File name and version this was derived from] |
| Related documents | [ ] |

## Purpose

**Project in brief:** [What the team does and the project lifecycle.]

**Problem being solved:** [What is wrong today, with the evidence from the needs
statement. A requirement that cannot be traced to an observed problem is a
preference.]

**Scope:** [Which workflows and platform components are in scope. Note what is
out of scope and why.]

**Phasing:** [If delivery is staged, name the phases and what each includes, so
requirements can be tagged rather than argued over as one list.]

## Current State

The baseline each requirement is a change from. Without it, "improve
findability" has no test.

| Aspect | Today |
| --- | --- |
| [Metadata capture, raw storage, derived results, identifiers, cross-system links, workarounds] | [Current practice, with numbers or evidence] |

## Target Data Strategy

| Topic | Project-specific strategy |
| --- | --- |
| Main workflow and users | [ ] |
| Data sources and outputs | [ ] |
| Organizing unit and identifiers | [ ] |
| Systems of record | [Summarise; detail below.] |
| Data flow | [ ] |
| Metadata and reuse | [ ] |
| Access and lifecycle | [ ] |

### Systems of record

One system is authoritative per value; the others hold references, never copies.
Recording this prevents the same value being maintained in two places and
silently diverging.

| Entity / value | System of record | Held elsewhere as | Status |
| --- | --- | --- | --- |
| [What] | [Authoritative system] | [Reference, cached label, or not held] | [Confirmed / proposed / unknown] |

### Platform capability fit

Capability examples are not commitments that a service is available or suitable.

| Capability | Project need | Current fit / evidence | Gap or action needed |
| --- | --- | --- | --- |
| [Capability] | [Need] | [Confirmed / partial / unknown; evidence, owner, date] | [Build, integrate, configure, investigate, or none] |

## Requirements

Each requirement is one observable outcome, traced to the need it answers.
Include non-functional needs — access control, credential handling, network
constraints, data volume, retention — rather than leaving them implicit.

**Priority:** `P0` essential; `P1` high; `P2` useful; `P3` later. Priority
reflects project value, not implementation effort.
**Status:** `Proposed` / `Agreed` / `Blocked` / `Deferred`. Use `Blocked` when
the requirement waits on a decision rather than on work.

| ID | Requirement | Why it matters | Priority | Phase | Traces to | Acceptance check | Owner / dependency | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | [The system or service shall… one observable need] | [Goal, workflow, or evidence] | [P0–P3] | [Phase] | [NEED-nn, Q-nn] | [How to verify, including what happens in the negative case] | [Owner or dependency] | [Status] |

### Blocking decisions

Not work items, and not to be prioritised as if they were. A requirement with no
owner is usually waiting on one of these.

| # | Decision | Blocks | Owner |
| --- | --- | --- | --- |
| D-1 | [What must be decided] | [REQ IDs] | [Who decides] |

## Traceability

Every need is accounted for: converted, deferred, reclassified, or dropped with
a reason. This is what lets the project team check nothing was quietly lost.

| Need | Became | Note |
| --- | --- | --- |
| NEED-01 | REQ-01, REQ-04 | [ ] |
| NEED-02 | D-2 | Reclassified: a decision, not a requirement |
| NEED-03 | — | Out of scope: [reason] |

## Acceptance and Review

This document is ready for prioritization when:

- The project purpose and scope are clear.
- The current state is described, so each requirement reads as a change from a known baseline.
- Each kind of value has one named system of record.
- Each requirement has a priority, rationale, acceptance check, and owner or dependency.
- Every blocking decision has a named owner.
- Every need in the source statement appears in the traceability table.
- The project and Informatics Platform teams have reviewed and agree on the next decision or action.

| Reviewer | Name | Decision / comments | Date |
| --- | --- | --- | --- |
| Project lead | [Name] | [Agreed / changes requested] | [Date] |
| Informatics Platform | [Name] | [Prioritize / investigate / defer; comments] | [Date] |
| Data steward / standards | [Name] | [Comments] | [Date] |
