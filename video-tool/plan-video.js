#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--script") args.script = argv[++i];
    else if (token === "--out") args.out = argv[++i];
    else if (token === "--lane") args.lane = argv[++i];
  }
  return args;
}

function cleanText(text) {
  return extractPrimaryScript(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+\s+/gm, "")
    .replace(/\[[^\]]{0,160}\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^(target length|tone|core thesis|visual identity|notes?)\s*:/i.test(line))
    .filter(Boolean)
    .join(" ");
}

function extractPrimaryScript(text) {
  const raw = String(text || "");
  const englishMarkers = [
    /#\s*8\.\s*英文脚本草稿/i,
    /#\s*English Script/i,
    /English Script/i
  ];
  const endMarkers = [
    /\n#\s*9\.\s*中文脚本草稿/i,
    /\n#\s*中文审稿版/i,
    /中文审稿版/i,
    /中文脚本草稿/i,
    /\n#\s*Sources/i,
    /\n##\s*Sources/i,
    /\n资料核查/i
  ];

  let start = 0;
  for (const marker of englishMarkers) {
    const match = raw.match(marker);
    if (match?.index !== undefined) {
      start = match.index + match[0].length;
      break;
    }
  }

  let end = raw.length;
  const tail = raw.slice(start);
  for (const marker of endMarkers) {
    const match = tail.match(marker);
    if (match?.index !== undefined) {
      end = start + match.index;
      break;
    }
  }

  return raw.slice(start, end);
}

function splitSentences(text) {
  const cleaned = cleanText(text);
  const matches = cleaned.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [];
  return matches
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18)
    .filter((sentence) => !/^(target length|tone|core thesis|visual identity|notes?)\s*:/i.test(sentence));
}

function stripVisualDirectives(text) {
  return String(text || "")
    .replace(/\[Visual:[^\]]+\]/gi, " ")
    .replace(/\[VERIFY[^\]]+\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  const words = String(text || "").match(/[A-Za-z0-9$%.-]+|[\u4e00-\u9fff]/g) || [];
  return words.length;
}

function parseScriptSections(script) {
  const primary = extractPrimaryScript(script).replace(/\r/g, "");
  const sections = [];
  let current = {
    title: "Opening",
    visualNote: "",
    blocks: []
  };

  function pushCurrent() {
    current.blocks = current.blocks.map(stripVisualDirectives).filter(Boolean);
    if (current.blocks.length || current.title !== "Opening") sections.push(current);
  }

  for (const rawLine of primary.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(target length|tone|core thesis|visual identity|notes?)\s*:/i.test(line)) continue;

    const heading = line.match(/^#{1,3}\s*(?:\d+\.\s*)?(.+)$/);
    if (heading) {
      pushCurrent();
      current = {
        title: heading[1].trim(),
        visualNote: "",
        blocks: []
      };
      continue;
    }

    const visual = line.match(/^\[Visual:\s*([^\]]+)\]$/i);
    if (visual) {
      current.visualNote = visual[1].trim();
      continue;
    }

    current.blocks.push(line);
  }

  pushCurrent();
  return sections.filter((section) => section.blocks.length);
}

function splitLongBlock(block, targetWords) {
  if (wordCount(block) <= targetWords * 1.35) return [block];
  const sentences = splitSentences(block);
  const chunks = [];
  let current = [];
  let count = 0;

  for (const sentence of sentences) {
    const words = wordCount(sentence);
    if (current.length && count + words > targetWords) {
      chunks.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += words;
  }

  if (current.length) chunks.push(current.join(" "));
  return chunks.length ? chunks : [block];
}

function segmentScript(script, lane) {
  const targetWords = lane === "finance" ? 96 : 118;
  const sections = parseScriptSections(script);
  const beats = [];

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      beats.push({
        sectionTitle: section.title,
        visualNote: section.visualNote,
        text: section.title,
        role: "chapter",
        sectionIndex,
        isChapterIntro: true
      });
    }

    let current = [];
    let currentWords = 0;

    function flush() {
      if (!current.length) return;
      beats.push({
        sectionTitle: section.title,
        visualNote: section.visualNote,
        text: current.join(" "),
        role: sectionIndex === 0 && beats.length === 0 ? "hook" : "argument",
        sectionIndex,
        isChapterIntro: false
      });
      current = [];
      currentWords = 0;
    }

    for (const block of section.blocks) {
      const parts = splitLongBlock(block, targetWords);
      for (const part of parts) {
        const words = wordCount(part);
        if (current.length && currentWords + words > targetWords) flush();
        current.push(part);
        currentWords += words;
        if (currentWords >= targetWords) flush();
      }
    }
    flush();
  });

  return beats.slice(0, 90);
}

function chunkSentences(sentences, targetWords = 42) {
  const chunks = [];
  let current = [];
  let count = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean).length || Math.ceil(sentence.length / 6);
    if (current.length && count + words > targetWords) {
      chunks.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += words;
  }

  if (current.length) chunks.push(current.join(" "));
  return chunks.slice(0, 80);
}

function classifyBeat(segment, index, total, lane) {
  const text = segment.text;
  const late = total > 6 && index > total - 3;
  const visualNote = segment.visualNote || "";
  const combined = `${text} ${visualNote}`;
  const hasNumbers = lane === "finance"
    ? /\b\d{2,4}\b|%|\$|\bmillion\b|\bbillion\b|\btrillion\b|\binflation\b|\brate\b|\bmarket\b|\bearnings\b|\brevenue\b|\bdebt\b/i.test(combined)
    : /%|\$|\bmillion\b|\bbillion\b|\btrillion\b|\binflation\b|\brate\b|\bmarket\b|\bearnings\b|\brevenue\b|\bdebt\b/i.test(combined);
  const hasHistory = /history|historical|dynasty|empire|cold war|nixon|mao|soviet|rome|ming|qing|1972|century|archive|footage/i.test(combined);
  const hasCurrentPolitics = /president|congress|election|washington|beijing|china|trump|biden|policy|government|white house|foreign ministry/i.test(combined);
  const hasStructure = /because|therefore|structure|system|incentive|triangle|legitimacy|trust|bureaucracy|supply chain|risk|power|relationship|interdependence|competition/i.test(combined);
  const asksForChart = /chart|data|market|earnings|inflation|revenue|debt|tariff|trade|supply chain|semiconductor|export controls|sanctions/i.test(combined);

  if (index === 0) return "title-card";
  if (segment.isChapterIntro) return "chapter-card";
  if (hasNumbers || lane === "finance") return "chart";
  if (asksForChart && lane !== "history") return "chart";
  if (late && wordCount(text) <= 28) return "chapter-card";
  if (hasStructure) return "diagram";
  if (hasHistory) return "evidence";
  if (hasCurrentPolitics) return "evidence";
  return "generated-illustration";
}

function visualDecision(type) {
  const decisions = {
    "title-card": {
      assetType: "kinetic text + atmosphere plate",
      sourcePolicy: "No factual footage required; generated/abstract background is acceptable.",
      fallback: "Editorial title card with subtle map or document texture.",
      rightsRisk: "low"
    },
    evidence: {
      assetType: "official/public-domain/cleared still or video",
      sourcePolicy: "Use only official, public-domain, Creative Commons, or licensed material. Do not scrape news sites.",
      fallback: "Source-labeled document treatment, archive still with parallax, or map timeline.",
      rightsRisk: "medium"
    },
    diagram: {
      assetType: "map / relationship diagram / process graphic",
      sourcePolicy: "Can be fully generated as graphics because it explains structure rather than proving an event.",
      fallback: "HyperFrames animated diagram.",
      rightsRisk: "low"
    },
    chart: {
      assetType: "data chart / market chart / timeline",
      sourcePolicy: "Requires verifiable data source if numbers appear on screen.",
      fallback: "Unnumbered conceptual chart until data is verified.",
      rightsRisk: "medium"
    },
    "generated-illustration": {
      assetType: "AI illustration / editorial atmosphere plate",
      sourcePolicy: "Must be clearly illustrative; avoid fake current-event footage or real-politician fabrications.",
      fallback: "Abstract texture, document collage, or kinetic typography.",
      rightsRisk: "low if labeled; medium if it resembles evidence"
    },
    "chapter-card": {
      assetType: "chapter card / thesis card",
      sourcePolicy: "No factual footage required.",
      fallback: "Typography over generated paper/map texture.",
      rightsRisk: "low"
    }
  };
  return decisions[type] || decisions["generated-illustration"];
}

function makeImagePrompt({ beat, lane, index }) {
  const visualSubject = imageSubject(beat, lane);
  const palette = lane === "finance"
    ? "charcoal newsroom canvas, restrained green and amber market accents, brushed metal and paper texture"
    : lane === "tech"
      ? "graphite interface canvas, restrained cyan and signal-red accents, glass, cables, lab light, archival paper"
      : "dark archive canvas, cold blue shadows, diplomatic red accents, aged map gold, paper and film grain";
  return {
    id: `gen-${String(index + 1).padStart(3, "0")}`,
    beatId: beat.id,
    use: beat.role,
    purpose: beat.type === "generated-illustration" ? "illustrative atmosphere" : "background plate or fallback",
    prompt: [
      "Create a 16:9 editorial documentary illustration.",
      `Subject: ${visualSubject}`,
      `Narrative moment: ${beat.summary}`,
      beat.sectionTitle ? `Chapter context: ${beat.sectionTitle}.` : "",
      `Lane: ${lane}.`,
      "Composition: cinematic wide frame, layered foreground/midground/background, one clear focal object, strong directional light, usable negative space in the upper-left or lower-right for later typography, no text baked into the image.",
      `Style: premium editorial documentary, realistic lighting, subtle 2.5D depth cues, ${palette}, not glossy stock photography, not a poster, not a presentation slide.`,
      "Camera language: 35mm documentary lens, low contrast shadows, shallow atmospheric depth, a frame that can hold slow parallax movement.",
      "Safety and accuracy: do not depict real current politicians, do not fabricate a news photo, do not create fake screenshots, no logos, no watermarks, no legible invented documents."
    ].filter(Boolean).join(" "),
    saveAs: `assets/generated/${beat.id}-${beat.type === "generated-illustration" ? "illustration" : "background"}.png`,
    mustLabelOnScreen: beat.type === "generated-illustration" ? "Illustration" : "Optional"
  };
}

function imageSubject(beat, lane) {
  if (beat.type === "title-card") {
    return lane === "finance"
      ? "an abstract financial intelligence briefing desk with layered charts, dim monitors, paper notes, and market tension, no readable text"
      : "an archival intelligence briefing table with maps, diplomatic cables, redacted papers, and a subtle world map glow, no readable text";
  }
  if (beat.type === "chapter-card") {
    return "a dark museum-like chapter background with archival paper, map fragments, and a single shaft of light, no readable text";
  }
  if (/supply chain|semiconductor|export controls|sanctions|materials/i.test(beat.text)) {
    return "a conceptual supply-chain pressure room: shipping routes, semiconductor wafers, sealed export-control folders, and faint map lines, no readable text";
  }
  if (/minefield|tariff|trade|container|port|cargo|market/i.test(beat.text)) {
    return "a container port at night treated as a strategic minefield, cranes, cargo containers, glowing route lines, customs folders, no readable labels";
  }
  if (/red line|map|fall|danger|risk/i.test(beat.text)) {
    return "a symbolic geopolitical map table with many glowing risk lines crossing an ocean, some bright and some barely visible, no labels";
  }
  if (/ritual|protocol|communiqué|ceremony|envoy/i.test(beat.text)) {
    return "a historical diplomatic ritual scene suggested through empty chairs, polished floor reflections, ceremonial shadows, and archival atmosphere, no real leaders";
  }
  if (/distant neighbors|pressed against each other|bridge|battlefield/i.test(beat.text)) {
    return "two distant capitals compressed onto the same map table, ocean routes folding inward, bridge lines turning into tense boundary lines, no labels";
  }
  if (/shi|configuration|momentum|shape of power|triangle/i.test(beat.text)) {
    return "a strategic geometry study on an archive table: triangular force lines, shifting weights, map pins, and shadowed documents, no readable text";
  }
  return `a visual metaphor for: ${beat.summary}`;
}

function makeDiagramSpec(beat, index) {
  const kind = beat.type === "chart"
    ? "chart"
    : /map|china|washington|beijing|border|frontier|pacific/i.test(beat.text)
      ? "map"
      : /timeline|history|1972|century|dynasty|cold war/i.test(beat.text)
        ? "timeline"
        : "relationship";

  return {
    id: `diagram-${String(index + 1).padStart(3, "0")}`,
    beatId: beat.id,
    kind,
    sectionTitle: beat.sectionTitle,
    goal: beat.summary,
    sourceText: beat.text,
    requiredLabels: diagramLabels(beat, kind),
    visualLayers: diagramLayers(beat, kind),
    dataNeeds: kind === "chart" ? chartDataNeeds(beat) : [],
    animation: kind === "relationship"
      ? ["nodes appear", "pressure lines draw", "key label pulses", "old structure collapses into new structure"]
      : kind === "map"
        ? ["map fades in", "nodes pulse", "route line grows", "risk label appears"]
        : kind === "chart"
          ? ["axis appears", "series draws", "callout highlights turning point"]
          : ["timeline baseline draws", "dates appear", "comparison bands slide in"],
    style: "dark editorial documentary, restrained red/blue/gold accents, source labels, safe-zone text",
    implementationHint: "Build as HyperFrames/HTML first; keep all labels editable in code rather than baked into images."
  };
}

function diagramLayers(beat, kind) {
  const base = ["background texture", "primary geometry", "labels", "callout", "source note"];
  if (kind === "map") return ["dark basemap", "actor nodes", "route or pressure lines", "risk highlights", "source note"];
  if (kind === "timeline") return ["timeline rail", "date markers", "comparison bands", "turning-point callout", "source note"];
  if (kind === "chart") return ["axis grid", "verified data series", "threshold or event marker", "callout", "source note"];
  if (/triangle|soviet|nixon|1972/i.test(beat.text)) return ["three actor nodes", "fear/pressure edges", "opening channel", "collapsed comparison", "source note"];
  return base;
}

function chartDataNeeds(beat) {
  const needs = [];
  if (/tariff|trade|export|import|wto|supply chain/i.test(beat.text)) needs.push("trade/tariff series with source and date range");
  if (/semiconductor|chip|materials|rare earth/i.test(beat.text)) needs.push("technology control or materials dependency data source");
  if (/market|earnings|revenue|inflation|debt|rate/i.test(beat.text)) needs.push("market or macro series with source and access date");
  return needs.length ? needs : ["verified numeric source before showing values"];
}

function assetTaskForBeat(beat) {
  const base = {
    beatId: beat.id,
    order: beat.order,
    visualType: beat.type,
    rightsRisk: beat.rightsRisk,
    screenText: beat.screenText,
    summary: beat.summary,
    mustNotUse: [
      "scraped news footage",
      "fake screenshots",
      "AI images that look like factual evidence",
      "unverified copyrighted news photos"
    ]
  };

  if (beat.type === "title-card" || beat.type === "chapter-card") {
    return {
      ...base,
      taskType: "generated-background",
      priority: beat.order === 1 ? "high" : "medium",
      neededAsset: "image2-generated background plate or code-native title background",
      suggestedPath: `assets/generated/${beat.id}-background.png`,
      acceptableSources: ["manual Codex image2", "code-native HyperFrames background"],
      onScreenLabel: "optional",
      clearanceNote: "Safe if used as non-evidence background and no real person or fake document is depicted."
    };
  }

  if (beat.type === "generated-illustration") {
    return {
      ...base,
      taskType: "manual-image2",
      priority: "high",
      neededAsset: "illustrative image2 scene",
      suggestedPath: `assets/generated/${beat.id}-illustration.png`,
      acceptableSources: ["manual Codex image2"],
      onScreenLabel: "Illustration",
      clearanceNote: "Must be clearly illustrative; do not imply this is source footage or a real photograph."
    };
  }

  if (beat.type === "diagram" || beat.type === "chart") {
    return {
      ...base,
      taskType: beat.type === "chart" ? "verified-chart" : "code-diagram",
      priority: "high",
      neededAsset: beat.type === "chart"
        ? "editable chart with verified data source"
        : "editable HyperFrames/HTML diagram",
      suggestedPath: `assets/diagrams/${beat.id}-${beat.type}.html`,
      acceptableSources: beat.type === "chart"
        ? ["verified public data", "creator-provided data", "editable code chart"]
        : ["code-native HyperFrames diagram"],
      onScreenLabel: beat.type === "chart" ? "Source required" : "not required",
      clearanceNote: beat.type === "chart"
        ? "Do not show numbers without a cited source."
        : "Diagram is explanatory and can be fully code-generated."
    };
  }

  return {
    ...base,
    taskType: "source-evidence",
    priority: "high",
    neededAsset: "official, public-domain, Creative Commons, licensed, or creator-provided evidence visual",
    suggestedPath: `assets/evidence/${beat.id}-source.ext`,
    acceptableSources: [
      "official government source",
      "public-domain archive",
      "licensed stock/archive",
      "creator-provided material"
    ],
    searchQueries: beat.assetSearchQueries,
    onScreenLabel: "Source label required",
    clearanceNote: "Evidence visuals require source tracking and rights review. Do not replace with fake AI evidence."
  };
}

function buildAssetManifest(plan) {
  const tasks = plan.beats.map(assetTaskForBeat);
  const summary = tasks.reduce((acc, task) => {
    acc.total += 1;
    acc.byTaskType[task.taskType] = (acc.byTaskType[task.taskType] || 0) + 1;
    acc.byRightsRisk[task.rightsRisk] = (acc.byRightsRisk[task.rightsRisk] || 0) + 1;
    return acc;
  }, { total: 0, byTaskType: {}, byRightsRisk: {} });

  return {
    schemaVersion: 1,
    lane: plan.lane,
    purpose: "Manual asset sourcing and generation checklist for a review video.",
    rules: [
      "Do not scrape news sites.",
      "Track source and license for every evidence asset.",
      "Use image2 only for illustration, atmosphere, metaphor, or reconstruction.",
      "Keep diagrams and charts editable in code when possible.",
      "Generated images that could be mistaken for evidence must be labeled Illustration."
    ],
    summary,
    tasks
  };
}

function buildAssetIntake(manifest) {
  return {
    schemaVersion: 1,
    purpose: "Creator-filled return sheet for manually sourced, generated, or drawn assets.",
    instructions: [
      "After generating or sourcing an asset, save it to expectedPath or update returnedPath.",
      "For evidence assets, fill sourceUrl, license, owner, and accessDate before assembly.",
      "For generated images, fill generationTool and keep onScreenLabel as Illustration when required.",
      "Leave status as missing until the actual file exists locally."
    ],
    items: manifest.tasks.map((task) => ({
      beatId: task.beatId,
      taskType: task.taskType,
      priority: task.priority,
      expectedPath: task.suggestedPath,
      returnedPath: "",
      status: "missing",
      sourceUrl: "",
      license: "",
      owner: "",
      accessDate: "",
      generationTool: task.taskType === "manual-image2" || task.taskType === "generated-background" ? "Codex image generation" : "",
      onScreenLabel: task.onScreenLabel,
      rightsRisk: task.rightsRisk,
      notes: ""
    }))
  };
}

function diagramLabels(beat, kind) {
  if (/triangle|soviet|nixon|1972/i.test(beat.text)) return ["U.S.", "China", "Soviet Union", "shared pressure", "strategic opening"];
  if (/supply chain|factory|app|semiconductor|export/i.test(beat.text)) return ["trade", "technology", "security", "pressure points"];
  if (/finance|market|earnings|inflation|revenue|debt/i.test(beat.text)) return ["baseline", "shock", "response", "risk"];
  if (kind === "map") return ["Washington", "Beijing", "Moscow", "Pacific"];
  if (kind === "timeline") return ["then", "turning point", "now"];
  return ["actor A", "actor B", "pressure", "constraint"];
}

function assetSearchQueries(beat, lane) {
  if (beat.type === "title-card" || beat.type === "chapter-card") return [];
  if (beat.type === "generated-illustration") return [];
  const queries = [];
  const text = beat.text.toLowerCase();
  if (/nixon|1972/.test(text)) queries.push("Nixon China visit public domain footage", "Nixon Library China visit photos public domain");
  if (/soviet|cold war/.test(text)) queries.push("Cold War public domain footage Soviet Union", "National Archives Cold War map footage");
  if (/trump|beijing|china/.test(text)) queries.push("White House China visit official footage", "C-SPAN China visit footage");
  if (/supply chain|semiconductor|export/.test(text)) queries.push("licensed semiconductor manufacturing b-roll", "public domain port cargo ship footage");
  if (lane === "finance") queries.push("licensed stock market data visualization b-roll", "SEC filing document closeup public domain");
  if (!queries.length) queries.push("official public domain archival footage", "licensed documentary b-roll");
  return [...new Set(queries)].slice(0, 4);
}

function summarize(text) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, 18).join(" ") + (words.length > 18 ? "..." : "");
}

function buildPlan(script, { lane = "history" } = {}) {
  const segments = segmentScript(script, lane);
  const total = segments.length;

  const beats = segments.map((segment, index) => {
    const text = segment.text;
    const type = classifyBeat(segment, index, total, lane);
    const decision = visualDecision(type);
    const durationBase = segment.isChapterIntro ? 5 : Math.round(wordCount(text) / 2.9);
    const estimatedDurationSec = type === "title-card"
      ? Math.min(12, Math.max(7, durationBase))
      : type === "chapter-card"
        ? 5
        : Math.min(24, Math.max(8, durationBase));
    return {
      id: `beat-${String(index + 1).padStart(3, "0")}`,
      order: index + 1,
      sectionTitle: segment.sectionTitle,
      sectionIndex: segment.sectionIndex,
      visualNote: segment.visualNote,
      estimatedDurationSec,
      role: segment.role === "chapter" ? "chapter" : index === 0 ? "hook" : index > total - 3 ? "closing" : "argument",
      type,
      text,
      summary: summarize(text),
      visualLayerPriority: visualLayerPriority(type),
      visualGoal: decision.assetType,
      sourcePolicy: decision.sourcePolicy,
      rightsRisk: decision.rightsRisk,
      fallback: decision.fallback,
      assetSearchQueries: ["evidence", "chart"].includes(type)
        ? assetSearchQueries({ text: `${text} ${segment.visualNote || ""}`, type }, lane)
        : [],
      screenText: extractScreenText(text, type),
      caption: text.split(/\s+/).slice(0, 22).join(" "),
      emphasis: extractEmphasis(text)
    };
  });

  const imagePrompts = beats
    .filter((beat) => beat.type === "generated-illustration" || beat.type === "chapter-card" || beat.order === 1 || beat.order === beats.length)
    .map((beat, index) => makeImagePrompt({ beat, lane, index }));

  const diagramSpecs = beats
    .filter((beat) => ["diagram", "chart"].includes(beat.type))
    .map(makeDiagramSpec);

  const captions = beats.map((beat) => ({
    beatId: beat.id,
    caption: beat.caption,
    emphasis: beat.emphasis,
    placement: "bottom safe zone",
    maxLines: 2
  }));

  return {
    schemaVersion: 1,
    lane,
    source: "script-to-video-plan",
    segmentation: {
      strategy: "section-aware semantic beats",
      beatCount: beats.length,
      target: "Each beat should be a visual decision, not a sentence card."
    },
    principles: [
      "Do not scrape proprietary news videos.",
      "Use official/public-domain/cleared assets for evidence.",
      "Use generated images only for illustration, atmosphere, metaphor, or historical reconstruction.",
      "Prefer diagrams when the argument is structural.",
      "Every beat should answer: evidence, explanation, atmosphere, or voice?"
    ],
    beats,
    imagePrompts,
    diagramSpecs,
    captions,
    reviewChecklist: [
      "Does any AI image look like fake evidence?",
      "Are all factual visuals sourced or labeled?",
      "Does any section rely on unlicensed news material?",
      "Is every chart backed by a real data source?",
      "Is there a visual event at least every 3-6 seconds?",
      "Can this visual system work for a different lane such as finance?"
    ]
  };
}

function visualLayerPriority(type) {
  if (type === "evidence") return "evidence first, captions second, diagram overlay only if needed";
  if (type === "generated-illustration") return "illustrative plate first, small label, no evidence claim";
  if (type === "diagram" || type === "chart") return "code-native explanatory motion first, tiny captions second";
  if (type === "title-card" || type === "chapter-card") return "brief title transition only";
  return "documentary visual first";
}

function extractEmphasis(text) {
  const clauses = text
    .split(/[,;:—.?!。！？]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 10)
    .sort((a, b) => Math.abs(36 - a.length) - Math.abs(36 - b.length));
  return clauses[0]?.slice(0, 72) || "";
}

function extractScreenText(text, type) {
  if (type === "title-card") return extractEmphasis(text).toUpperCase();
  if (type === "chapter-card") return extractEmphasis(text);
  const emphasis = extractEmphasis(text);
  if (!emphasis) return "";
  return emphasis.length > 42 ? `${emphasis.slice(0, 39)}...` : emphasis;
}

function storyboardMarkdown(plan, scriptPath) {
  const rows = plan.beats.map((beat) => [
    beat.order,
    beat.estimatedDurationSec,
    beat.sectionTitle,
    beat.type,
    beat.rightsRisk,
    beat.visualLayerPriority,
    beat.summary,
    beat.screenText,
    beat.assetSearchQueries.join("<br>") || beat.fallback
  ]);

  return `# Visual Storyboard

Source script: \`${scriptPath}\`

Lane: \`${plan.lane}\`

## Production Rule

This package plans visuals. It does not grant rights to footage. Use official/public-domain/cleared material for evidence; use generated images only as illustration.

## Shot List

| # | Sec | Section | Type | Rights Risk | Visual Priority | Script Summary | Screen Text | Search / Fallback |
|---:|---:|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]} | ${row[7]} | ${row[8]} |`).join("\n")}

## Review Checklist

${plan.reviewChecklist.map((item) => `- ${item}`).join("\n")}
`;
}

function imagePromptsMarkdown(plan) {
  return `# Image2 Manual Generation Prompts

Use these prompts manually in Codex image generation. Save generated files to the listed paths, then rerun or continue the video assembly workflow.

${plan.imagePrompts.map((item) => `## ${item.id}

- Use: ${item.use}
- Beat: ${item.beatId}
- Purpose: ${item.purpose}
- Save as: \`${item.saveAs}\`
- On-screen label: ${item.mustLabelOnScreen}

\`\`\`text
${item.prompt}
\`\`\`
`).join("\n")}
`;
}

function assetIntakeMarkdown(intake) {
  return `# Asset Return Checklist

Use this after manual image generation, sourcing, or diagram creation. The matching machine-readable file is \`asset-intake.json\`.

## Return Tasks

| Beat | Task | Priority | Status | Expected Path | Source / License Needed | Notes |
|---|---|---|---|---|---|---|
${intake.items.map((item) => {
    const sourceNeeded = item.taskType === "source-evidence" || item.taskType === "verified-chart"
      ? "yes"
      : "no";
    return `| ${item.beatId} | ${item.taskType} | ${item.priority} | ${item.status} | \`${item.expectedPath}\` | ${sourceNeeded} | ${item.notes} |`;
  }).join("\n")}

## Assembly Gate

- Evidence assets must include source URL, owner/license, and access date in \`asset-intake.json\`.
- Generated images must remain labeled as illustration when required.
- Missing high-priority assets should be replaced with a code-native diagram or a clearly marked placeholder before any review render.
`;
}

function assetChecklistMarkdown(manifest) {
  const rows = manifest.tasks.map((task) => [
    task.order,
    task.beatId,
    task.taskType,
    task.priority,
    task.rightsRisk,
    task.neededAsset,
    task.suggestedPath,
    task.onScreenLabel,
    task.clearanceNote
  ]);

  return `# Asset Checklist

Purpose: manual sourcing, image2 generation, and rights review before assembling a real video.

## Rules

${manifest.rules.map((rule) => `- ${rule}`).join("\n")}

## Summary

- Total tasks: ${manifest.summary.total}
- By task type: ${Object.entries(manifest.summary.byTaskType).map(([key, value]) => `${key}: ${value}`).join(", ")}
- By rights risk: ${Object.entries(manifest.summary.byRightsRisk).map(([key, value]) => `${key}: ${value}`).join(", ")}

## Tasks

| # | Beat | Task | Priority | Risk | Needed Asset | Suggested Path | Label | Clearance Note |
|---:|---|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | \`${row[6]}\` | ${row[7]} | ${row[8]} |`).join("\n")}

## Evidence Search Queries

${manifest.tasks
    .filter((task) => task.searchQueries?.length)
    .map((task) => `### ${task.beatId}\n\n${task.searchQueries.map((query) => `- ${query}`).join("\n")}`)
    .join("\n\n") || "No evidence search queries generated."}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.script) {
    console.error("Usage: node video-tool/plan-video.js --script path/to/script.md --out outputs/video-plan-demo [--lane history|finance|tech]");
    process.exit(1);
  }

  const outDir = args.out || join("outputs", `video-plan-${Date.now()}`);
  const lane = args.lane || "history";
  const script = await readFile(args.script, "utf8");
  const plan = buildPlan(script, { lane });
  const assetManifest = buildAssetManifest(plan);
  const assetIntake = buildAssetIntake(assetManifest);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "visual-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "storyboard.md"), storyboardMarkdown(plan, args.script), "utf8");
  await writeFile(join(outDir, "image-prompts.md"), imagePromptsMarkdown(plan), "utf8");
  await writeFile(join(outDir, "diagram-specs.json"), `${JSON.stringify(plan.diagramSpecs, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "captions.json"), `${JSON.stringify(plan.captions, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "asset-manifest.json"), `${JSON.stringify(assetManifest, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "asset-checklist.md"), assetChecklistMarkdown(assetManifest), "utf8");
  await writeFile(join(outDir, "asset-intake.json"), `${JSON.stringify(assetIntake, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "asset-return-checklist.md"), assetIntakeMarkdown(assetIntake), "utf8");

  console.log(`Video plan created from ${basename(args.script)}`);
  console.log(outDir);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
