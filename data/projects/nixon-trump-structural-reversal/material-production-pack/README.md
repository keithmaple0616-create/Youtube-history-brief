# Trump China / Nixon China Material Production Pack

This pack replaces the old publish-candidate render path. Do not use the old MP4 as the target style; it overuses existing still images.

Goal:

```text
Real/source-like material first
archive and documents second
explanatory graphics third
AI images only as labeled atmosphere
title cards only as punctuation
```

## Files

- `visual-mix-plan.md`: the correct material structure for the full video.
- `external-sourcing-prompts.md`: prompts/search queries for footage, archive, documents, maps, and source screenshots you should collect externally.
- `image2-prompts.md`: manual Codex image generation prompts for non-evidence atmosphere plates only.
- `asset-intake-template.json`: fill this after you collect or generate assets.

## Target Mix

For this 12-15 minute video:

- Real footage: 40-50%.
- Archive/photos/documents/maps/source screenshots: 25-35%.
- Explanatory graphics: 15-25%.
- AI atmosphere images: 0-8%.
- Title cards: under 6%.

## Production Order

1. Collect the high-priority external source assets first.
2. Generate only the AI atmosphere plates that are marked optional or fallback.
3. Fill `asset-intake-template.json` with local paths, sources, rights notes, and labels.
4. Rebuild the HyperFrames review project from the filled intake.
5. Only then render a new MP4.

## Hard Rule

Do not create AI images of Trump, Nixon, Mao, Xi, Kissinger, or any real political figure as if they were news or archive evidence.

Generated images in this pack are for:

- abstract strategic atmosphere
- archive-table metaphor
- chapter background texture
- non-specific institutional mood

They are not evidence.
