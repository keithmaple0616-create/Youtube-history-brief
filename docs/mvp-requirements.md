# MVP Requirements

## MVP Definition

A tool that takes a manually entered current event and generates an English long-form YouTube video script package for a channel about current affairs, history, and Chinese civilizational analysis.

## Primary User Story

As a creator, I want to input a current event and receive several historically grounded YouTube topic options, so that I can choose a strong angle and generate an English script for a long-form video.

## Inputs

The MVP should support manual input fields:

- Current event title.
- Short event description.
- Optional source link.
- Optional notes from the creator.
- Optional target video length.
- Optional desired tone.
- Optional political sensitivity level.

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

### 2. Topic Angle Generator

Purpose:

Generate multiple possible video angles from the event.

Each angle should include:

- Working English title.
- Core question.
- Historical frame.
- Chinese lens.
- Target audience appeal.
- One-sentence thesis.

Recommended default: 5 angles.

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

### 5. YouTube Packaging Generator

Purpose:

Translate the topic into YouTube-native presentation.

Outputs:

- 5 title options.
- 3 thumbnail text options.
- 3 opening hooks.
- Video description draft.
- Pinned comment question.

### 6. Outline Generator

Purpose:

Generate a long-form video structure.

Default structure:

1. Cold open.
2. Current event setup.
3. The deeper question.
4. Historical mirror.
5. Chinese lens.
6. Where the analogy breaks.
7. Why this matters now.
8. Closing thought.

The tool may provide three outline styles:

- Steady and credible.
- More dramatic and YouTube-friendly.
- More narrative and story-driven.

### 7. English Script Generator

Purpose:

Generate an English script for a long-form YouTube video.

Script should include:

- Spoken narration.
- Section headings.
- Suggested B-roll keywords.
- On-screen text suggestions.
- Citation or research-needed placeholders.
- Notes where claims require verification.

Default target length:

- 20-35 minutes.

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

- Turn one current event into at least 5 viable topic angles.
- Help the creator choose the strongest angle.
- Produce an outline that feels specific to the channel, not generic.
- Generate a script draft that can be edited rather than rewritten from scratch.
- Warn when a historical comparison is too weak or too politically risky.

