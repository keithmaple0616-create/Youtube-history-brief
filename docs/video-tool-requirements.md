# Video Tool Requirements

This document captures the working agreement from the previous Codex threads. It is the source of truth for the standalone video tool direction.

## Product Boundary

The main YouTube History Script Tool is for deciding what to say.

The standalone video tool is for deciding how a finished script should be seen.

Keep these separate:

```text
Brief tool:
current event -> topic angles -> Codex script brief

Video tool:
approved script -> visual plan -> manual image2 prompts -> diagram specs -> asset checklist -> assembly package
```

Do not put video production UI or render controls back into the main Brief app.

## Core Workflow

The intended workflow is semi-automatic, not fully automatic:

```text
1. Creator approves the final script.
2. Video tool reads the script.
3. Tool generates visual beats and shot strategy.
4. Tool generates image2 prompts for manual Codex image generation.
5. Creator manually generates selected images in Codex and saves them to the suggested paths.
6. Tool uses returned assets plus diagram specs to assemble a review project.
7. HyperFrames or Remotion renders review video after the visual plan is good enough.
```

The first useful version should make the visual plan excellent before trying to automate full video rendering.

## What The Tool Should Generate

Minimum output package:

- `visual-plan.json`: structured beats, visual type, purpose, rights risk, screen emphasis, suggested assets.
- `storyboard.md`: human-readable shot list.
- `image-prompts.md`: prompts to paste into Codex image2 manually.
- `diagram-specs.json`: editable map, timeline, relationship, and chart specs.
- `captions.json`: subtitle and emphasis plan.
- Asset checklist: what must be sourced, generated, drawn, or verified.
- Rights checklist: which visuals are evidence and which are illustrative.
- `audit-report.md`: visual plan quality gate before sourcing assets or assembling a review video.

Later output package:

- HyperFrames or Remotion project.
- Asset manifest with paths for generated images and approved footage.
- Review render.
- Review manifest with visual mix, PPT risk, missing assets, and must-fix items.

## Visual Principles

The video must not feel like a PowerPoint deck.

Use this hierarchy:

```text
visual evidence / generated scene / motion footage first
diagram and map overlays second
small captions and emphasis text third
large title cards only at major transitions
```

Preferred style:

- Cinematic editorial documentary.
- Dark museum or archive-like canvas.
- Real video or motion where legally available.
- Image2-generated scenes for atmosphere, metaphor, and historical reconstruction.
- Editable diagrams for structure, not baked-in text-heavy images.
- Captions synchronized with voiceover but not covering the image.

Avoid:

- Full-screen text cards for every beat.
- PPT-like slide layouts.
- Giant subtitles covering the visual.
- Fake news footage.
- Fake screenshots.
- Generated images that look like factual evidence.
- Reusing the same video clip repeatedly as generic filler.

## Copyright And Sourcing Rules

Do not automatically scrape news websites for video or images.

Reasons:

- News video copyright risk is high.
- Many news images require paid licensing.
- Scraped material can make the workflow legally fragile.

Do not build a huge generic asset library as the core strategy.

Reasons:

- The tool should work for many topics and lanes.
- A universal library would become too large.
- Repeated generic clips will make videos feel cheap and recognizable.

Safer visual sources:

- Official government/public-domain sources.
- Licensed stock or creator-provided footage.
- Public-domain archives where verified.
- Image2-generated illustrative visuals, clearly not evidence.
- Code-native diagrams, maps, timelines, and charts.

## Role Of Image2

Image2 is important, but the production tool should not depend on OpenAI API access.

The tool should output manual generation prompts:

```text
Prompt:
...
Suggested save path:
assets/generated/gen-003.png
On-screen label:
Illustration / Optional / Not evidence
Usage:
background plate / metaphor / historical reconstruction / chapter transition
```

The creator manually generates images in Codex and saves the result into the project. The tool can then continue from local files.

Generated images should be used for:

- Historical atmosphere.
- Conceptual metaphors.
- Transitional plates.
- 2.5D/parallax scenes.
- Non-factual visual mood.

Generated images should not be used for:

- Fake current-event footage.
- Fake images of real current politicians.
- Fake screenshots, fake newspaper pages, or fake documents.
- Anything that could be mistaken for proof.

## Lanes

The tool should not be only for the history channel.

Initial lanes:

- `history`: politics, geopolitics, historical memory, culture.
- `finance`: earnings, markets, macro, company analysis.
- `tech`: platforms, AI, supply chains, policy.

Lane affects:

- Visual classification.
- Chart frequency.
- Image prompt style.
- Diagram vocabulary.
- Rights checklist.

## Assembly Direction

HyperFrames remains the preferred experimentation layer for visual language:

- good for motion design
- good for subtitles and emphasis
- good for fast iteration
- good for maps, diagrams, and editorial animation

Remotion can be considered later when the workflow is stable and needs a more reusable production pipeline.

Do not judge the video tool by the current one-minute MP4 test renderer. That renderer is only a technical proof that a plan can produce a local MP4. It is not the desired visual style or final assembly approach.

## Current Status

Implemented:

- `video-tool/plan-video.js`
- visual plan generation
- storyboard generation
- image2 manual prompt generation
- diagram specs
- captions
- basic lane support

Removed:

- The old one-minute MP4 renderer and publish-candidate sample scripts were removed during cleanup because they encouraged the wrong workflow: stitching existing local images into a video before the material plan was ready.

## Next Correct Step

Do not recreate or polish the PPT-like MP4 renderer.

Next step:

```text
Move into the video generation stage without skipping review gates:
1. Generate or revise visual-plan.json from the approved script.
2. Run video-tool/audit-plan.js to catch diagram overuse, evidence gaps, rights risk, and generated-image risk.
3. Fix the visual plan before asset work when the audit is blocked.
4. Source or generate assets using the asset checklist and image2 prompts.
5. Validate returned assets with check-assets.js.
6. Then generate a HyperFrames review project from visual-plan.json plus asset-intake.json.
7. Use the review manifest to decide which footage, archive, document, map, diagram, or illustration assets must be replaced before final render.
```
