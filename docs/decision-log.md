# Decision Log

## 2026-05-05

### Decision: Start with manual input, not automatic news scraping

Reason:

Manual input keeps the MVP focused and reduces complexity. The current priority is topic judgment and script quality, not data ingestion.

### Decision: Target North American English-speaking audiences

Reason:

The channel's concept depends on explaining current North American political and cultural events through historical and Chinese civilizational lenses.

### Decision: Use Chinese history as an analytical lens, not as the topic by default

Reason:

The channel should help North American viewers understand issues they already care about. Chinese history provides differentiation, but the viewer's entry point is the current event.

### Decision: Prioritize topic packages before fully automated scripts

Reason:

The most scarce early-stage capability is selecting strong, differentiated topics. Script generation matters, but weak topics cannot be fixed by polished writing.

### Decision: Add analogy risk checks

Reason:

The channel can lose credibility if it forces comparisons such as "America is late Ming" or "Trump is Qin Shi Huang." The product must help distinguish similarity from equivalence.

## 2026-05-08

### Decision: Reposition the local tool as a Brief workspace

Reason:

The previous four-stage flow made the tool feel like a full video production pipeline, but the creator's real bottleneck is earlier: turning a hot event into a strong angle and a high-quality brief. Final script writing should be handled by Codex with the channel-specific skill.

### Decision: Remove video plan and production package from the main MVP flow

Reason:

Video plans, B-roll, image prompts, and Ken Burns storyboards depend on the final script. Generating them before the script is settled creates workflow conflict and unnecessary complexity.

### Decision: Add weekly radar Markdown support

Reason:

OpenClaw can run scheduled topic radar jobs and push summaries through Feishu. The local tool should read the resulting Markdown files from `radar/`, but the first version should keep selection manual instead of trying to parse every report format.

## 2026-05-19

### Decision: Keep video production outside the Brief MVP

Reason:

The Brief tool should stop at topic judgment and a Codex-ready script brief. Video production has different requirements and should be reusable for other lanes such as finance or technology. The separate `video-tool/` owns visual planning, image2 prompts, diagram specs, captions, and later assembly.

### Decision: Treat HyperFrames as an explainer layer, not the whole video system

Reason:

The first Nixon/Trump visual sample proved that abstract animated cards can test mood and argument structure, but they do not feel like a watchable YouTube video. The production workflow should use real archival or documentary-style visual material as the base layer, with HyperFrames reserved for maps, diagrams, title cards, and other focused motion graphics.

### Decision: Add a video production architecture after the script MVP

Reason:

The existing MVP deliberately ends at a Codex script brief. That remains correct for topic and writing quality. However, once a script is approved, the project needs a separate video workflow: storyboard, asset plan, temporary AI voiceover, video draft, review, and export. This should be documented before modifying the tool or rebuilding the sample.

### Decision: Prefer Remotion for full video assembly and HyperFrames for inserted explainers

Reason:

The target channel needs documentary editing: real visuals, timed voiceover, captions, music, and reusable reviewable timelines. Remotion is better suited to the full video timeline, while HyperFrames remains useful for polished explanatory animations.

### Decision: Keep the workflow semi-automatic for weekly quality

Reason:

The target cadence is about one strong video per week, not batch production. The intended workflow is: OpenClaw and the local tool generate topic candidates and a brief; Codex with the channel skill writes the final English script and Chinese review version; the local tool's video module turns the approved script into a storyboard, asset plan, voiceover, and rough MP4. Manual handoff is acceptable because it preserves quality control at the two most important points: final writing and final video judgment.

### Decision: Require real moving footage in video drafts

Reason:

The first two Nixon/Trump drafts still felt like polished presentations because they relied almost entirely on still images and graphics. The third draft improved once official White House video footage was added. Future video production packages should flag high PPT risk when a section lacks real footage, archival video, or source-grounded documentary material.

### Decision: Add a local Remotion rough-cut generator

Reason:

The creator needs a bridge between a text-only production package and a real video edit. The first implementation should not depend on an extra media API. Instead, the tool creates a local Remotion project from the confirmed final script, with timed beats, placeholder visual slots, asset needs, and render commands. This proves the production pipeline can move from script to reviewable MP4 while keeping sourcing, copyright, and final taste decisions under creator control.

## 2026-05-21

### Decision: Preserve project state in handoff documents to avoid context-loss failures

Reason:

Long Codex threads for this project have repeatedly failed during context compaction. Product requirements and decisions should not live only in chat history. `docs/PROJECT_HANDOFF.md` is now the resume entry point, and major requirements should be written into docs before continuing implementation.

### Decision: Treat the one-minute MP4 renderer as a smoke test, not the video product direction

Reason:

The renderer proved that `visual-plan.json` can produce a local MP4, but early outputs looked like presentation slides and oversized subtitles. The real product direction remains a planning-first workflow: visual plan, image2 prompts, diagram specs, asset tasks, rights checks, then later HyperFrames/Remotion assembly.

### Decision: Add asset manifest and checklist to the video planning package

Reason:

The video tool needs to show what must be sourced, generated, drawn, labeled, or rights-reviewed before assembly. `asset-manifest.json` and `asset-checklist.md` make the semi-automatic workflow explicit and reduce the temptation to use fake evidence or scrape copyrighted news assets.
