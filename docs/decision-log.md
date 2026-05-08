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
