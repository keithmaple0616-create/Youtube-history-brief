# Video Tool

This is a separate, reusable script-to-visual-planning tool. It is intentionally decoupled from the YouTube History Script Tool so it can later support other lanes such as finance, technology, geopolitics, education, or business essays.

The tool does not try to scrape news footage or build a universal footage library. It creates a per-episode visual production package:

```text
approved script
-> visual beats
-> evidence / diagram / generated illustration / atmosphere decisions
-> manual image2 prompts
-> diagram specs
-> caption and emphasis plan
-> review checklist
```

## Current CLI

```bash
node video-tool/plan-video.js --script path/to/script.md --out outputs/video-plan-demo --lane history
```

After manually returning assets:

```bash
npm run video:check-assets -- --intake outputs/video-plan-demo/asset-intake.json
```

Outputs:

- `visual-plan.json`: structured visual beats and asset decisions.
- `storyboard.md`: creator-readable shot list and production notes.
- `image-prompts.md`: prompts to paste manually into Codex image generation.
- `diagram-specs.json`: map, timeline, relationship, and chart animation specs.
- `captions.json`: lightweight subtitle and kinetic emphasis plan.
- `asset-manifest.json`: structured manual sourcing/generation tasks.
- `asset-checklist.md`: creator-readable asset and rights checklist.
- `asset-intake.json`: creator-filled return sheet for generated, sourced, or drawn assets.
- `asset-return-checklist.md`: human-readable checklist for the manual asset return loop.

## One-Minute Test Render

The v0.2 test renderer turns the first beats in `visual-plan.json` into a rough one-minute MP4. It is a technical draft generator, not a final video engine.

```bash
npm run video:render-test -- \
  --plan outputs/video-tool-v0.1-demo/visual-plan.json \
  --out outputs/video-tool-one-minute-test/one-minute-test.mp4 \
  --duration 60 \
  --image outputs/video-tool-v0.1-demo/sample-image2/gen-001-sample.png
```

The renderer currently uses local HTML thumbnails plus FFmpeg, because this Mac FFmpeg build does not include `drawtext`. Output includes the MP4, rendered frame PNGs, segment files, a contact sheet if you generate one, and `build-notes.md`.

Supported lanes today:

- `history`: history, politics, geopolitics, culture essays.
- `finance`: market, business, earnings, macro, company analysis. This lane is more willing to classify beats as charts and data visuals.
- Any other lane value will still work, but it uses the general documentary rules.

## Manual Image2 Workflow

The tool does **not** call OpenAI or Codex image generation. It only writes prompts.

Recommended loop:

```text
1. Run the CLI.
2. Open image-prompts.md.
3. Paste one prompt into Codex image generation.
4. Save the image to the suggested path, for example `assets/generated/beat-003-background.png`.
5. Update `asset-intake.json` with returned paths, source/license fields, and notes.
6. Later assembly tools can read `visual-plan.json` and `asset-intake.json` together.
```

Generated images should be labeled as illustration when they could be mistaken for evidence. Do not use generated images as fake footage, fake screenshots, fake documents, or fake images of real current politicians.

## Design Principles

- Evidence is not decoration. Real official/public-domain/cleared material should be used where a factual claim needs proof.
- AI images are for illustration, atmosphere, metaphor, and historical reconstruction, not fake news footage.
- Generated images involving real current politicians or fabricated screenshots should be avoided.
- If a visual cannot be sourced safely, the fallback should be a diagram, map, document treatment, or clearly marked illustration.
- Every episode should have a project-local asset plan instead of relying on a huge global asset library.

## v0.1 Scope

This version is useful for planning, not final video assembly. It deliberately stops before rendering.

In scope:

- Script cleanup.
- Visual beat segmentation.
- Evidence / diagram / chart / generated illustration / title card classification.
- Rights-risk hints.
- Search queries for safe source discovery.
- Manual image2 prompt package.
- Diagram animation specs.
- Caption and kinetic-emphasis draft.
- Asset task manifest.
- Asset return/intake checklist for manual generation and sourcing.
- Rights and evidence/illustration checklist.

## v0.2 Test Scope

In scope:

- Read `visual-plan.json`.
- Render the first six beats as six 10-second cards.
- Use a supplied generated image as the first title-card background.
- Produce a 60-second local MP4 for workflow validation.

Still out of scope:

- Real motion design.
- Voiceover and music.
- Evidence footage download or rights clearance.
- Fully assembled HyperFrames/Remotion production output.

Out of scope for now:

- Automatic scraping or downloading news footage.
- Automatic image generation API calls.
- Full HyperFrames or Remotion project assembly.
- MP4 rendering.
