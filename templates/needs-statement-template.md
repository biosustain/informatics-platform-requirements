---
title: Project Data Needs Statement
description: Capture what a project team needs and why, in their own words, as the input to a requirement specification.
order: 1
---

# Project Data Needs Statement

> **Who fills this in.** The project team, with whoever knows the day-to-day
> practice. You are not expected to write requirements — no "the system shall".
> Describe what goes wrong today and what you need to be able to do. The
> Informatics Platform team turns that into requirements with you.
>
> **The most valuable thing you can add is evidence.** A need with a number, a
> quote or an example attached survives prioritisation. A need without one reads
> as a preference.
>
> Leave anything you do not know as **unknown**. Guessing is worse than a gap.

## Document Control

| Item | Value |
| --- | --- |
| Project / campaign | [Name, and a stable link or ID if one exists] |
| Team / department | [Team] |
| Scientific or business lead | [Name, role] |
| Who filled this in | [Names] |
| Date | [YYYY-MM-DD] |
| Data classification | [Public / internal / confidential; any personal data?] |
| Supporting evidence attached | [Surveys, example files, SOPs, screenshots, counts] |

## What the team does

[Two or three sentences. What work produces this data, what instruments or
systems are involved, and what the data is ultimately for.]

**Who touches the data:** [Who creates it, who analyses it, who else needs it —
now and in the foreseeable future, including people who inherit projects.]

## What goes wrong today

[The problem in plain terms. Be specific about the failure, not the fix.]

**Evidence:**

| What we observe | Evidence |
| --- | --- |
| [e.g. nobody can reuse a colleague's data] | [e.g. survey of all 8 users: mean 1.8/5 for a colleague's data vs 4.1 for their own] |

## Current state

How it actually works now, not how it is supposed to.

| Aspect | Today |
| --- | --- |
| How metadata is recorded | [Where, by whom, in what form] |
| Where raw data is stored | [All the places, including personal drives] |
| Where processed results go | [ ] |
| How records are identified and linked | [ ] |
| Related data from other instruments or systems | [ ] |
| Known workarounds people have built | [Private scripts, spreadsheets, renaming tools — these are strong signals] |

## What we need to be able to do

One row per need. Write each as an outcome, not a feature. If you find yourself
naming a tool or a screen, put it under "Solutions already in mind" instead, and
write the underlying need here.

**Good:** "Compare growth rate between strains across runs performed by different people."
**Not a need:** "A dashboard."

| ID | We need to be able to… | Why it matters / what it unblocks | Who needs it | How often | Evidence |
| --- | --- | --- | --- | --- | --- |
| NEED-01 | [Outcome] | [Consequence if it does not happen] | [Role] | [Daily / per run / per project / rarely] | [Quote, count, example] |

If some needs are more important than others, say so in your own terms — "we
cannot publish without this", "this is a convenience". Formal priority comes
later; your framing is what drives it.

## Questions the data must answer

If your team has recurring questions it asks of this data, list them verbatim.
These are the sharpest input to a requirement specification, because each one can
be checked against the finished system.

| ID | Question | Asked by | How often |
| --- | --- | --- | --- |
| Q-01 | [e.g. "Which strain grows fastest under condition X across all our runs?"] | [ ] | [ ] |

## Constraints and context

| Topic | Detail |
| --- | --- |
| Deadlines or external drivers | [Publication, grant, audit, instrument arrival] |
| Security, access or network limits | [VPN-only systems, credential handling, who must not see what] |
| Effort the team can commit | [Honestly — who will actually enter metadata, and how much time per run] |
| Existing standards or templates to respect | [ ] |
| Systems already in use | [Which, and whether they are working] |
| Out of scope | [What this is explicitly not about] |

## Solutions already in mind

Park ideas here rather than losing them. They will be read as hypotheses, not
requirements, and the underlying need will be identified before anything is
designed.

| Idea | What problem you think it solves |
| --- | --- |
| [ ] | [ ] |

## Decisions not yet made

Things your team has not agreed internally. Naming them here stops them being
discovered halfway through a build.

| Open question | Who should decide | Blocks what |
| --- | --- | --- |
| [ ] | [ ] | [ ] |

## What "better" would look like

[In a year, how would you know this worked? One or two sentences. Concrete if
possible — "a new group member can use last year's runs without asking anyone".]
