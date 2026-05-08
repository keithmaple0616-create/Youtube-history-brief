# MVP Requirements

## MVP Definition

A tool that takes either a manually entered current event or a weekly radar Markdown report candidate, evaluates the strongest creative angles, and generates a creator-facing script brief for Codex/GPT-5.5.

## Primary User Story

As a creator, I want to start from a current event or a weekly radar candidate, compare several historically grounded creative angles, choose one, and generate a rigorous script brief that I can hand to Codex for the final English script and Chinese review version.

## Inputs

The MVP should support manual input fields:

- Current event title.
- Short event description.
- Optional source link.
- Optional notes from the creator.
- Optional target video length.
- Optional desired tone.
- Optional political sensitivity level.

The MVP should also support weekly radar reports:

- Local Markdown reports stored in `radar/`.
- A report list in the UI.
- Opening a report inside the workspace for manual review.
- Manual copy of one chosen candidate into the event intake fields.

## Required Modules

### 1. Event Intake

Purpose:

Capture the current event and normalize it into a usable creative brief.

Outputs:

- Clean event summary.
- Main actors.
- Why it matters now.
- Main controversy or tension.
- Possible deeper themes.

### 2. Creative Angle Evaluator

Purpose:

Generate multiple possible creative angles from the event. This replaces generic "topic directions" because the creator often already has a concrete news event.

Each angle should include:

- Working English title.
- Core question.
- Historical frame.
- Chinese lens.
- Target audience appeal.
- One-sentence thesis.

Recommended default: 3-5 angles.

### 3. Topic Scoring

Purpose:

Help the creator decide which angle is worth developing.

Scoring dimensions:

- Current relevance: 1-10.
- Historical depth: 1-10.
- Chinese lens uniqueness: 1-10.
- North American audience clarity: 1-10.
- Long-form potential: 1-10.
- Risk level: low, medium, or high.

The tool should also provide:

- Why this angle works.
- Why it may fail.
- Recommended use case.

### 4. Historical Parallel Builder

Purpose:

Generate useful historical connections without forcing weak analogies.

Outputs:

- US or North American historical parallels.
- European or global historical parallels.
- Chinese historical parallels.
- Relevant concepts.
- Analogy limits.
- Misleading comparisons to avoid.

### 5. Script Brief Generator

Purpose:

Translate the selected angle into a rigorous brief for Codex/GPT-5.5, not a final script.

Outputs:

- Writing task for Codex.
- Core thesis.
- Counterintuitive point.
- Viewer takeaway.
- English title and hook options.
- 6-8 section script structure.
- Historical mirror.
- Chinese historical/cultural lens.
- Analogy limits.
- Fact-check list.
- Style and sensitivity requirements.
- A final prompt that can be copied into Codex.

Default target length:

- 12-15 minutes, strictly under 15 minutes.

## Non-Functional Requirements

The tool should:

- Preserve the channel positioning across outputs.
- Avoid partisan slogans.
- Avoid presenting Chinese history as morally superior by default.
- Explain Chinese concepts in North American-friendly language.
- Distinguish between similarity and equivalence.
- Flag risky claims and weak analogies.
- Prefer clarity over academic density.

## MVP Success Criteria

The MVP is useful if it can:

- Read weekly radar Markdown reports from `radar/`.
- Turn one current event into 3-5 viable creative angles.
- Help the creator choose the strongest angle.
- Produce a script brief that feels specific to the channel, not generic.
- Hand off cleanly to the `youtube-history-scriptwriter` Codex skill for final writing.
- Warn when a historical comparison is too weak or too politically risky.

## Explicit Non-Goals For Current MVP

- Do not generate the final script inside the local tool.
- Do not generate the video production package before the final script is approved.
- Do not parse radar Markdown into clickable candidates yet.
- Do not integrate image generation yet.
