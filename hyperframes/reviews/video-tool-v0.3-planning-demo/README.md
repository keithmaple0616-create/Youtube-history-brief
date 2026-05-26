# HyperFrames Review Project

This is a generated review project, not a cleared final video.

## Source

- Visual plan: `outputs/video-tool-v0.3-planning-demo/visual-plan.json`
- Asset intake: `outputs/video-tool-v0.3-planning-demo/asset-intake.json`
- Lane: `history`
- Duration: 82s
- Scenes: 12

## Purpose

Use this project to review pacing, material mix, missing assets, and PPT risk before spending time on final sourcing or polish.

## Commands

```bash
cd /Users/xionglili/Desktop/youtube-history-script-tool
npm run video:audit-plan -- --plan outputs/video-tool-v0.3-planning-demo/visual-plan.json
open hyperframes/reviews/video-tool-v0.3-planning-demo/index.html
```

If HyperFrames CLI is available, open this folder in the HyperFrames preview workflow and inspect the first 60-90 seconds.

## Review Gates

- Does the opening begin with concrete people, places, documents, or events?
- Does any section rely on diagrams before the viewer sees source-grounded material?
- Are placeholders clearly marked as placeholders?
- Are generated visuals labeled as illustration when needed?
- Can weak sections be fixed by sourcing footage rather than adding more text?

## Material Mix

- title-card: 4
- diagram-placeholder: 8

## Next Asset Work

- Replace `SOURCE MATERIAL NEEDED` placeholders with official/public-domain/licensed footage or archive stills.
- Replace `DIAGRAM SLOT` placeholders only after the section has enough source-grounded material.
- Keep generated visuals labeled as illustration when they could be mistaken for evidence.
