# Video Production Architecture

## Purpose

This document defines how the tool should grow from a script brief workspace into a YouTube video production assistant.

The goal is not to make a one-click AI video factory. The goal is to help the creator turn a historically grounded argument into a watchable documentary-style video draft, with enough structure for human review and enough automation to avoid starting from zero every time.

## Core Product Shift

The current MVP is intentionally focused on topic judgment and script briefs:

```text
Current event -> Creative angle -> Codex script brief
```

The next video layer should begin only after the final script is approved:

```text
Approved script -> Storyboard -> Asset plan -> Voiceover -> Video draft -> Human review -> Export
```

This avoids a common failure mode: generating visuals before the argument is clear. It also avoids the "animated PowerPoint" problem, where the video becomes a sequence of title cards instead of an edited viewing experience.

## Product Principle

The video tool should treat real visual material as the base layer and motion graphics as the explanation layer.

Good default:

```text
Archival images / footage
+ slow camera movement
+ source-aware captions
+ voiceover
+ music and sound design
+ occasional maps, timelines, and diagrams
```

Bad default:

```text
Big text slide
+ abstract graphic
+ subtitle
+ next text slide
```

## Recommended System Layers

### 1. Script Package

Input:

- Approved English script.
- Chinese review version.
- Fact-check notes.
- Channel tone instructions.

Output:

- Segmented script, divided into scenes.
- Estimated voiceover timing.
- Claim list.
- Visual intent for each scene.

The script package is the source of truth for the video plan.

### 2. Storyboard And Shot List

Purpose:

Translate writing into video language.

Each segment should include:

- Voiceover text.
- Target duration.
- What the viewer should see.
- Suggested footage or image type.
- Whether the shot should be real archival material, generated illustration, map, title card, or motion graphic.
- On-screen text, if any.
- Transition idea.
- Risk notes, especially for uncertain facts or sensitive imagery.

Example:

```text
Voiceover:
Nixon went to China because Washington and Beijing both feared a third power more than they feared each other: the Soviet Union.

Visual plan:
0-4s: Nixon 1972 visit photo, slow push-in.
4-8s: Cold War map with U.S., China, Soviet Union.
8-12s: Triangle lines animate, Soviet node emphasized.

Asset needs:
- Nixon China visit archival photo.
- Cold War world map base.
- Soviet Union visual reference.
```

### 3. Asset Library

Purpose:

Make the video look real and reusable, not synthetic and disposable.

The library should store:

- Public-domain archival photos.
- Government photos and footage.
- Licensed stock footage.
- News screenshots used under an editorial workflow.
- Generated maps and diagrams.
- Generated supporting illustrations when clearly labeled as illustration, not historical evidence.

Each asset should track:

- File path.
- Source URL.
- Rights status.
- Required attribution.
- Related topic or historical period.
- Suggested use.
- Risk level.

Suggested data fields:

```json
{
  "id": "nixon-china-1972-arrival-001",
  "title": "Nixon China visit arrival",
  "type": "archival_photo",
  "sourceUrl": "",
  "rightsStatus": "public_domain_or_needs_review",
  "attribution": "",
  "tags": ["nixon", "china", "1972", "diplomacy"],
  "riskLevel": "medium",
  "localPath": "data/assets/nixon-china-1972-arrival-001.jpg"
}
```

### 4. Voiceover

Purpose:

Create a timing backbone for the video.

MVP behavior:

- Generate temporary AI voiceover for testing.
- Store audio beside the script package.
- Use the voiceover duration to time storyboard segments.

Later behavior:

- Support a consistent channel voice.
- Keep pronunciation notes for Chinese names, historical terms, and political figures.
- Support retakes by paragraph, not only full-script regeneration.

### 5. Video Assembly

Recommended roles:

- Remotion: main video timeline, real assets, captions, audio, export.
- HyperFrames: high-quality explainer animations such as maps, timelines, title cards, and relationship diagrams.
- FFmpeg: final encoding, audio cleanup, compression, and format conversion.

Why this split:

- Remotion is better for full video editing logic.
- HyperFrames is useful for focused motion graphic segments.
- FFmpeg is reliable for final media processing.

### 6. Review Workspace

The creator should be able to review:

- The script.
- The storyboard.
- Which asset is used for each line or scene.
- Which assets still need manual replacement.
- Which facts need checking.
- A preview render.
- Export settings.

The review workspace should make weak spots visible. It should not hide uncertain sources or pretend placeholders are finished footage.

## MVP Video Workflow

The first practical video MVP should be a 60-90 second sample generator:

```text
Approved script excerpt
-> AI voiceover
-> Storyboard with 8-12 beats
-> Manual or semi-manual asset selection
-> Remotion draft render
-> Human review
-> MP4 export
```

The creator-facing workflow should remain semi-automatic:

```text
OpenClaw + local tool -> topic candidates and brief
Codex + channel skill -> final English script and Chinese review version
Local tool video module -> storyboard, asset list, voiceover, rough cut, MP4 draft
Creator -> final judgment, fact review, rights review, and taste decisions
```

This is intentional. The channel publishes about once per week, so quality matters more than batch volume. The tool should reduce repetitive labor while preserving human judgment over argument, tone, sourcing, and final cut quality.

## Implemented Rough-Cut Generator

The local tool now includes a Remotion rough-cut stage after the video production package.

Flow:

```text
Confirmed final script -> /api/video-draft -> generated Remotion project -> preview/render commands
```

The generator creates a project under:

```text
video/remotion/generated/<slug>/
```

Each generated project contains:

- `src/draft-data.json` with timed beats derived from the final script.
- `src/video.tsx` with a cinematic editorial placeholder timeline.
- `public/assets/` for replacing placeholder slots with real footage, archival video, maps, and licensed stills.
- `README.md` with preview and render commands.

This stage is deliberately a first-cut skeleton, not a finished video. It exists to check pacing, visual needs, and PPT risk before spending time on sourcing and final edit polish.

For the Nixon/Trump sample, the first target should not be a full episode. It should be a watchable opening minute that proves the style:

- Real or credible archival Nixon imagery.
- Modern China/White House/Beijing visual material.
- News headline or document texture.
- Clear map explanation of the U.S.-China-Soviet triangle.
- Temporary AI voiceover.
- Basic music and transition sound design.

## Suggested Project Structure

```text
youtube-history-script-tool/
  data/
    projects/
      <project-id>/
        script-en.md
        script-zh-review.md
        storyboard.json
        assets.json
        voiceover.mp3
        review-notes.md

    assets/
      archival/
      stock/
      generated/
      screenshots/

  video/
    remotion/
      compositions/
      components/
      templates/

    hyperframes/
      explainers/
      title-cards/
      maps/

  outputs/
    <project-id>/
      draft.mp4
      final.mp4
      sources.md
      youtube-package.md
```

## Implementation Phases

### Phase A: Planning Documents

- Define video architecture.
- Define channel video style.
- Decide the first sample target.

### Phase B: Storyboard Data Model

- Add a structured storyboard format.
- Convert a script excerpt into timed beats.
- Add fields for asset needs and placeholder status.

### Phase C: Real Video Draft

- Build a Remotion composition for the 60-90 second opening.
- Use voiceover as the timing backbone.
- Add real or clearly marked placeholder assets.
- Export MP4.

### Phase D: Asset Workflow

- Add asset records.
- Track sources and rights.
- Support replacement of placeholder visuals.

### Phase E: Full Episode Support

- Scale from 60-90 seconds to 8-15 minutes.
- Add chapter structure.
- Add reusable maps, source cards, lower thirds, and end screens.

## Non-Goals For The Next Step

- Do not build automatic YouTube publishing.
- Do not build full automatic web-wide media scraping.
- Do not pretend AI-generated historical images are archival photos.
- Do not optimize for a one-click final video before the review workflow works.
- Do not continue improving abstract slide animations as the main video format.

## Success Criteria

The next successful sample should make a non-technical viewer feel:

- "This is a video, not a presentation."
- "The visuals are helping me understand the argument."
- "The historical material feels credible."
- "The pacing gives me a reason to keep watching."
- "The AI parts are assisting the documentary style, not replacing it."
