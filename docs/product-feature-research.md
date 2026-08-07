# Product feature research

## Product thesis

This product should be an evidence-first research workspace with controlled automation, not a general chatbot. Its strongest loop is:

1. Understand the decision the user is trying to make.
2. Ask one useful clarification when essential context is missing.
3. Build a visible research plan with explicit cost and source rules.
4. Gather evidence and preserve provenance.
5. Produce an answer that can be audited, challenged, and revised.
6. Pause before consequential automation or payment.

The defensible product advantage is the combination of answer quality, source traceability, persistent workflows, and human control. A polished chat surface matters, but it is not the product by itself.

## Feature opportunities

| Priority | Feature | User value | Status |
| --- | --- | --- | --- |
| P0 | Research depth modes | Lets users trade speed and spend for depth | Integrated |
| P0 | Source policy | Makes freshness, primary-source preference, allowlists, and blocklists explicit | Integrated |
| P0 | Evidence quality score | Exposes citation coverage and source diversity instead of a vague confidence label | Integrated |
| P0 | Feedback and answer revision | Turns one-shot reports into an iterative research loop | Integrated |
| P0 | Suggested follow-ups | Helps users continue analysis without guessing the next prompt | Integrated |
| P0 | Clarification node | Prevents expensive research on underspecified questions | Integrated |
| P1 | Live search connectors | Current web and commerce evidence through Playwright Chromium | Integrated |
| P1 | Source-level credibility controls | Labels primary, secondary, sponsored, stale, and disputed evidence | Next |
| P1 | Claim ledger | Shows every major claim, its supporting evidence, and conflicting evidence | Next |
| P1 | Research memory | Reuses user-approved facts and preferences across threads with clear provenance | Next |
| P1 | Change monitoring | Re-runs saved research and reports only meaningful source or conclusion changes | Partial: schedules exist |
| P1 | Export and sharing | Generates stable report links, PDF/Markdown export, and citation bundles | Next |
| P2 | Team review | Adds comments, assignments, approvals, and version comparison | Later |
| P2 | Browser observation | Captures page state for workflows that cannot use an API | Later, permission-gated |
| P2 | Action execution | Performs approved external actions after a preview and confirmation step | Later, security review required |
| P2 | Provider marketplace | Routes tasks across specialized paid research tools with spend controls | Partial: provider/payment model exists |

## Integrated behavior

### Research modes

- `quick`: planning, search, retrieval, writing, and editing.
- `deep`: the full research, verification, enrichment, analysis, writing, and editing path.
- `compare`: emphasizes independent verification, enrichment, and comparative analysis.

The chosen mode is persisted on the job and copied into every step policy.

### Source policy

Every job carries:

- primary-source preference;
- freshness window;
- optional allowed domains;
- blocked domains.

Domain constraints are enforced before evidence is stored. They are also provided to the DeepSeek writing node.

### Evidence quality

The deterministic quality gate reports:

- citation coverage;
- source diversity;
- unsupported or missing evidence references;
- a visible 0–100 score.

DeepSeek cannot approve its own output. If its draft introduces an unsupported URL, the graph rejects it and retains the grounded fallback report.

### Feedback loop

Users can rate an answer, save feedback, or request a revision. Revisions are immutable report versions linked with `supersedes_report_id`; the previous report remains available in history.

## Recommended next integration

Move Playwright research into the durable worker queue so long browser runs survive API restarts and can scale independently. Keep browser and model credentials server-side, persist screenshots in object storage for production, and retain the evidence gate after every provider path.
