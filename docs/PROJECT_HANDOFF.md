# Project Handoff

Last updated: 2026-05-25

## Resume Protocol

When a Codex thread gets stuck or a new thread starts, read these first:

1. `README.md`
2. `docs/PROJECT_HANDOFF.md`
3. `docs/video-tool-requirements.md`
4. `docs/decision-log.md`
5. `video-tool/README.md`

Then continue from the "Next Step" section below.

## Current Project Goal

Build a local tool for a North America-facing English YouTube historical current-affairs channel.

The main app is a Brief workspace:

```text
current event / weekly radar -> topic angle evaluation -> Codex script brief
```

The video tool is separate:

```text
approved script -> visual plan -> manual image2 prompts -> diagram specs -> asset tasks -> later assembly
```

## Current State

Main Brief app:

- Runs at `http://localhost:5123`.
- Should stay focused on topic angle and Codex script brief.
- Do not put video production controls back into this app.

Video tool:

- Located in `video-tool/`.
- `plan-video.js` creates a script-to-visual-planning package.
- Current planning output uses section-aware semantic beats, richer image2 prompts, HyperFrames-oriented diagram specs, and an asset intake/return checklist.
- `check-assets.js` validates returned local assets and required rights metadata from `asset-intake.json`.
- The old technical MP4 smoke-test renderer has been removed. Do not bring that path back as the main product direction.

Key requirement doc:

- `docs/video-tool-requirements.md`

## Important Decisions

- Do not automatically scrape news websites for video/images.
- Do not build a giant universal stock footage library as the core strategy.
- Use image2 manually through Codex; the formal tool should output prompts and save paths, not call the API.
- Generated images are illustrative, not evidence.
- The video must not feel like PowerPoint.
- HyperFrames is the preferred experimentation layer for visual language once planning quality is good.
- Remotion can be reconsidered after the workflow stabilizes.

## Recent Problem

The one-minute MP4 test renderer proved a local MP4 can be generated from `visual-plan.json`, but the initial output looked like a slide deck with huge text.

Do not keep polishing that path as the main product direction. It has been removed from the cleaned project.

## Next Step

Continue improving the planning-to-assembly handoff:

1. Review the v0.3 planning package quality on one history script and one finance/tech script.
2. Tune evidence-vs-diagram classification where the storyboard overuses diagrams.
3. Add a first HyperFrames review project generator that consumes `visual-plan.json` plus `asset-intake.json`.
4. Keep MP4 rendering behind the material-pack and review-project gates.

## Latest Useful Commands

Generate a visual planning package:

```bash
npm run video:plan -- \
  --script outputs/trump-china-nixon-structural-reversal-script-2026-05-19.md \
  --out outputs/video-tool-v0.3-planning-demo \
  --lane history
```

Expected output files include:

- `visual-plan.json`
- `storyboard.md`
- `image-prompts.md`
- `diagram-specs.json`
- `captions.json`
- `asset-manifest.json`
- `asset-checklist.md`
- `asset-intake.json`
- `asset-return-checklist.md`

Run syntax checks:

```bash
node --check server.js
node --check public/app.js
node --check video-tool/plan-video.js
node --check video-tool/check-assets.js
```

Check returned assets after manual generation/sourcing:

```bash
npm run video:check-assets -- \
  --intake outputs/video-tool-v0.3-planning-demo/asset-intake.json
```

MP4 rendering should wait until a material pack and HyperFrames review project have been checked.
