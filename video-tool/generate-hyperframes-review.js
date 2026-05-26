#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";

const designMarkdown = `## Style Prompt

Editorial Documentary x Geopolitical Map Essay. The review project should feel like a premium North American YouTube history essay: grounded, sharp, and cinematic without becoming flashy. Real or source-grounded material is the visual base; motion graphics explain structure only when the argument needs them. The mood is calm tension rather than spectacle.

## Colors

- Ink canvas: \`#071017\`
- Paper text: \`#f4ead8\`
- Muted caption: \`#c8bfae\`
- Diplomatic red: \`#b23a34\`
- Strategic blue: \`#4c7da8\`
- Map gold: \`#d1a451\`

## Typography

- Headlines: Georgia, Times New Roman, serif
- Labels/captions: Arial, Inter, system-ui, sans-serif

## Motion Rules

- Use slow push-ins on footage and archival images, 4-7% max.
- Use line drawing, node pulses, and map-like geometry for structural ideas.
- Keep transitions brief: 8-14 frames, no flashy wipes.
- Chapter titles appear as short punctuation, not persistent lower thirds.
- Keep all text in safe zones; do not place large type over faces.

## What NOT to Do

- Do not keep a chapter title on screen for an entire section.
- Do not bury real footage under dark overlays.
- Do not use large text over faces, flags, or handshakes.
- Do not make the video feel like a slide deck.
- Do not let decorative animation compete with narration.
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") args.plan = argv[++i];
    else if (token === "--intake") args.intake = argv[++i];
    else if (token === "--out") args.out = argv[++i];
    else if (token === "--max-beats") args.maxBeats = Number(argv[++i]);
    else if (token === "--title") args.title = argv[++i];
  }
  return args;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function assetPathFromItem(item) {
  return String(item?.returnedPath || item?.expectedPath || "").trim();
}

function assetKind(path) {
  const ext = extname(path).toLowerCase();
  if ([".mp4", ".mov", ".webm"].includes(ext)) return "video";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  if ([".html", ".htm"].includes(ext)) return "html";
  return "";
}

async function resolveAsset({ item, intakeDir, outDir }) {
  const raw = assetPathFromItem(item);
  if (!raw) return null;

  const absolute = isAbsolute(raw) ? raw : resolve(intakeDir, raw);
  const fileExists = await exists(absolute);
  if (!fileExists) {
    return {
      raw,
      absolute,
      src: "",
      exists: false,
      kind: assetKind(raw)
    };
  }

  return {
    raw,
    absolute,
    src: relative(outDir, absolute).replaceAll("\\", "/"),
    exists: true,
    kind: assetKind(absolute)
  };
}

function visualCategory(scene) {
  if (scene.reviewType === "footage") return "footage";
  if (scene.reviewType === "image" && scene.visualType === "evidence") return "archivePhoto";
  if (scene.reviewType === "image") return "documentaryImage";
  if (scene.visualType === "evidence") return "footage";
  if (scene.visualType === "chart") return "chart";
  if (scene.visualType === "diagram") return "diagram";
  if (scene.visualType === "generated-illustration") return "generatedIllustration";
  if (scene.visualType === "title-card" || scene.visualType === "chapter-card") return "titleCard";
  return "document";
}

function ratio(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function highestRisk(values) {
  if (values.includes("high")) return "high";
  if (values.includes("medium")) return "medium";
  return "low";
}

function sceneFlags(scene) {
  const flags = [];
  if (!scene.asset?.exists) flags.push("missing-asset");
  if (scene.rightsRisk === "high") flags.push("high-rights-risk");
  if (["evidence", "chart"].includes(scene.visualType) && !scene.asset?.exists) flags.push("source-required");
  if (scene.visualType === "generated-illustration" && scene.assetTask?.onScreenLabel !== "not required") flags.push("illustration-label-required");
  if (scene.reviewType === "diagram-placeholder") flags.push("ppt-risk");
  return flags;
}

function buildReviewManifest({ data, title }) {
  const totalDuration = data.durationSec || 0;
  const visualMix = {
    footage: 0,
    archivePhoto: 0,
    document: 0,
    map: 0,
    chart: 0,
    diagram: 0,
    generatedIllustration: 0,
    titleCard: 0,
    documentaryImage: 0
  };

  for (const scene of data.scenes) {
    const category = visualCategory(scene);
    visualMix[category] = (visualMix[category] || 0) + scene.duration;
  }

  const evidenceSec = visualMix.footage + visualMix.archivePhoto + visualMix.document + visualMix.map + visualMix.documentaryImage;
  const diagramSec = visualMix.diagram + visualMix.chart;
  const titleSec = visualMix.titleCard;
  const generatedSec = visualMix.generatedIllustration;
  const missingAssets = data.scenes.filter((scene) => !scene.asset?.exists);
  const sceneRiskValues = data.scenes.map((scene) => scene.rightsRisk || "low");
  const pptRisk = ratio(diagramSec + titleSec, totalDuration) > 45 || ratio(evidenceSec, totalDuration) < 45
    ? "high"
    : ratio(diagramSec + titleSec, totalDuration) > 30
      ? "medium"
      : "low";
  const fakeEvidenceRisk = data.scenes.some((scene) => scene.visualType === "generated-illustration" && /president|trump|biden|xi|putin|news|document|screenshot/i.test(`${scene.summary} ${scene.visualNote}`))
    ? "medium"
    : "low";
  const mustFixBeforeRender = [];

  if (pptRisk === "high") mustFixBeforeRender.push("Real/source-like material is too weak for a documentary review. Replace some diagram/title placeholders with footage, archive, map, document, or source screenshot assets.");
  if (highestRisk(sceneRiskValues) === "high") mustFixBeforeRender.push("At least one scene has high rights risk.");
  if (fakeEvidenceRisk !== "low") mustFixBeforeRender.push("Generated illustration may be confused with real evidence. Replace or label clearly.");
  if (missingAssets.some((scene) => ["evidence", "chart"].includes(scene.visualType))) mustFixBeforeRender.push("Evidence/chart scenes are missing source assets.");

  return {
    schemaVersion: 1,
    projectTitle: title || data.scenes[0]?.sectionTitle || "HyperFrames Review Project",
    durationEstimateSec: totalDuration,
    beatCount: data.scenes.length,
    visualMix,
    visualMixPercent: Object.fromEntries(Object.entries(visualMix).map(([key, value]) => [key, ratio(value, totalDuration)])),
    riskSummary: {
      pptRisk,
      copyrightRisk: highestRisk(sceneRiskValues),
      fakeEvidenceRisk
    },
    missingAssets: missingAssets.map((scene) => ({
      beatId: scene.id,
      visualType: scene.visualType,
      neededAsset: scene.visualGoal,
      expectedPath: scene.asset?.raw || "",
      taskType: scene.assetTask?.taskType || ""
    })),
    mustFixBeforeRender,
    recommendedNextActions: [
      "Replace the first 10 seconds with real footage or source-like material before polishing graphics.",
      "Convert repeated diagram placeholders into footage/document/map beats where possible.",
      "Fill sourceUrl, license, owner, and accessDate for evidence and chart assets.",
      "Use generated images only as labeled illustration or atmosphere."
    ]
  };
}

function reviewTypeForBeat(beat, intakeItem, asset) {
  if (asset?.exists && asset.kind === "video") return "footage";
  if (asset?.exists && asset.kind === "image") return "image";
  if (beat.type === "evidence") return "evidence-placeholder";
  if (beat.type === "diagram" || beat.type === "chart" || intakeItem?.taskType === "code-diagram") return "diagram-placeholder";
  if (beat.type === "title-card" || beat.type === "chapter-card") return "title-card";
  if (beat.type === "generated-illustration") return "illustration-placeholder";
  return "documentary-placeholder";
}

function durationForBeat(beat) {
  if (beat.type === "chapter-card") return 4;
  if (beat.type === "title-card") return 7;
  return clamp(Math.round(Number(beat.estimatedDurationSec || 8) / 3), 6, 8);
}

async function buildReviewData({ plan, intake, intakePath, outDir, maxBeats }) {
  const intakeDir = dirname(resolve(intakePath));
  const intakeByBeat = new Map((intake.items || []).map((item) => [item.beatId, item]));
  const selectedBeats = (plan.beats || []).slice(0, maxBeats || 12);
  let cursor = 0;
  const scenes = [];

  for (const beat of selectedBeats) {
    const intakeItem = intakeByBeat.get(beat.id) || null;
    const asset = await resolveAsset({ item: intakeItem, intakeDir, outDir });
    const duration = durationForBeat(beat);
    scenes.push({
      id: beat.id,
      order: beat.order,
      start: cursor,
      duration,
      sectionTitle: beat.sectionTitle,
      role: beat.role,
      visualType: beat.type,
      reviewType: reviewTypeForBeat(beat, intakeItem, asset),
      rightsRisk: beat.rightsRisk,
      screenText: beat.screenText,
      caption: beat.caption,
      emphasis: beat.emphasis,
      summary: beat.summary,
      sourcePolicy: beat.sourcePolicy,
      visualGoal: beat.visualGoal,
      visualNote: beat.visualNote,
      asset: asset ? {
        exists: asset.exists,
        kind: asset.kind,
        src: asset.src,
        raw: asset.raw
      } : null,
      assetTask: intakeItem ? {
        taskType: intakeItem.taskType,
        priority: intakeItem.priority,
        status: intakeItem.status,
        onScreenLabel: intakeItem.onScreenLabel
      } : null
    });
    scenes[scenes.length - 1].reviewFlags = sceneFlags(scenes[scenes.length - 1]);
    cursor += duration;
  }

  const counts = scenes.reduce((acc, scene) => {
    acc[scene.reviewType] = (acc[scene.reviewType] || 0) + 1;
    return acc;
  }, {});

  return {
    schemaVersion: 1,
    sourcePlan: plan.source || "visual-plan",
    lane: plan.lane || "history",
    sourceFiles: {
      visualPlan: "",
      intake: intakePath
    },
    durationSec: cursor,
    scenes,
    review: {
      purpose: "HyperFrames review project for pacing, material mix, missing assets, and PPT risk.",
      materialMix: counts,
      gates: [
        "Does the opening begin with concrete people, places, documents, or events?",
        "Does any section rely on diagrams before the viewer sees source-grounded material?",
        "Are placeholders clearly marked as placeholders?",
        "Are generated visuals labeled as illustration when needed?",
        "Can weak sections be fixed by sourcing footage rather than adding more text?"
      ]
    }
  };
}

function sceneVisual(scene) {
  const label = scene.assetTask?.status === "ready" ? "SOURCE READY" : "PLACEHOLDER";
  if (scene.reviewType === "footage") {
    return `<video class="media" src="${escapeAttr(scene.asset.src)}" muted playsinline></video>`;
  }
  if (scene.reviewType === "image") {
    return `<img class="media" src="${escapeAttr(scene.asset.src)}" alt="">`;
  }
  if (scene.reviewType === "title-card") {
    return `<div class="title-plate">
      <div class="plate-kicker">${escapeHtml(scene.role)}</div>
      <h2>${escapeHtml(scene.screenText || scene.sectionTitle)}</h2>
    </div>`;
  }
  if (scene.reviewType === "diagram-placeholder") {
    return `<div class="diagram-plate">
      <div class="node node-a">U.S.</div>
      <div class="node node-b">China</div>
      <div class="node node-c">Pressure</div>
      <div class="line line-ab"></div>
      <div class="line line-bc"></div>
      <div class="line line-ca"></div>
      <div class="plate-label">DIAGRAM SLOT</div>
    </div>`;
  }
  if (scene.reviewType === "evidence-placeholder") {
    return `<div class="source-plate">
      <div class="film-card one"></div>
      <div class="film-card two"></div>
      <div class="plate-label">SOURCE MATERIAL NEEDED</div>
      <div class="small-note">${escapeHtml(scene.visualGoal)}</div>
    </div>`;
  }
  return `<div class="source-plate illustration">
    <div class="plate-label">${label}</div>
    <div class="small-note">${escapeHtml(scene.visualGoal || "Illustrative visual")}</div>
  </div>`;
}

function sceneMarkup(scene) {
  return `<section id="${escapeAttr(scene.id)}" class="scene ${escapeAttr(scene.reviewType)}" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="0">
    <div class="visual-wrap">
      ${sceneVisual(scene)}
      <div class="grain"></div>
    </div>
    <div class="hud">
      <div class="source-label">${escapeHtml(scene.reviewType.replaceAll("-", " "))}</div>
      <div class="risk ${escapeAttr(scene.rightsRisk)}">rights: ${escapeHtml(scene.rightsRisk)}</div>
    </div>
    <div class="lower">
      <div class="section">${escapeHtml(scene.sectionTitle)}</div>
      <div class="caption">${escapeHtml(scene.caption || scene.summary)}</div>
      <div class="meta">${escapeHtml(scene.assetTask?.taskType || "no asset task")} · ${escapeHtml(scene.assetTask?.status || "not tracked")}</div>
    </div>
  </section>`;
}

function htmlForReview(data) {
  const sceneIds = data.scenes.map((scene) => scene.id);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: #071017;
        color: #f4ead8;
        font-family: Arial, Inter, system-ui, sans-serif;
      }
      [data-composition-id="review"] {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background:
          radial-gradient(circle at 74% 18%, rgba(76, 125, 168, 0.16), transparent 30%),
          linear-gradient(180deg, #071017, #0a151d 60%, #05090d);
      }
      .scene {
        position: absolute;
        inset: 0;
        opacity: 0;
        overflow: hidden;
      }
      .visual-wrap {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #071017;
      }
      .media {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .grain {
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(0deg, transparent 0 7px, rgba(244, 234, 216, 0.035) 7px 8px),
          linear-gradient(90deg, rgba(7, 16, 23, 0.42), transparent 28%, transparent 70%, rgba(7, 16, 23, 0.46));
        opacity: 0.48;
        pointer-events: none;
      }
      .title-plate,
      .source-plate,
      .diagram-plate {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 120px 150px;
        gap: 24px;
      }
      .title-plate h2 {
        max-width: 1180px;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 78px;
        line-height: 0.96;
        font-weight: 700;
        color: #f4ead8;
      }
      .plate-kicker,
      .plate-label,
      .small-note {
        max-width: 780px;
        color: #c8bfae;
        font-size: 18px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .source-plate {
        background:
          radial-gradient(circle at 28% 38%, rgba(209, 164, 81, 0.16), transparent 24%),
          linear-gradient(135deg, rgba(178, 58, 52, 0.16), transparent 42%),
          #071017;
      }
      .source-plate.illustration {
        background:
          radial-gradient(circle at 65% 34%, rgba(76, 125, 168, 0.17), transparent 25%),
          linear-gradient(145deg, rgba(244, 234, 216, 0.07), transparent 44%),
          #071017;
      }
      .film-card {
        position: absolute;
        width: 530px;
        height: 330px;
        border: 1px solid rgba(244, 234, 216, 0.22);
        background:
          linear-gradient(135deg, rgba(244, 234, 216, 0.15), rgba(7, 16, 23, 0.4)),
          repeating-linear-gradient(90deg, rgba(244, 234, 216, 0.06) 0 8px, transparent 8px 16px);
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
      }
      .film-card.one { right: 190px; top: 170px; transform: rotate(2deg); }
      .film-card.two { right: 370px; top: 360px; transform: rotate(-3deg); opacity: 0.72; }
      .diagram-plate {
        background:
          linear-gradient(90deg, rgba(7, 16, 23, 0.2), rgba(7, 16, 23, 0.76)),
          radial-gradient(circle at 52% 48%, rgba(76, 125, 168, 0.13), transparent 34%);
      }
      .node {
        position: absolute;
        width: 170px;
        height: 170px;
        border-radius: 50%;
        border: 1px solid rgba(244, 234, 216, 0.32);
        display: grid;
        place-items: center;
        color: #f4ead8;
        font-weight: 900;
        letter-spacing: 0.12em;
        background: rgba(7, 16, 23, 0.72);
        z-index: 3;
      }
      .node-a { left: 420px; top: 330px; border-color: rgba(76, 125, 168, 0.74); }
      .node-b { left: 875px; top: 210px; border-color: rgba(178, 58, 52, 0.74); }
      .node-c { left: 1120px; top: 590px; border-color: rgba(209, 164, 81, 0.74); }
      .line {
        position: absolute;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(209, 164, 81, 0.86), transparent);
        transform-origin: left center;
        z-index: 2;
      }
      .line-ab { left: 585px; top: 395px; width: 340px; transform: rotate(-15deg); }
      .line-bc { left: 1010px; top: 365px; width: 300px; transform: rotate(56deg); }
      .line-ca { left: 580px; top: 520px; width: 620px; transform: rotate(18deg); }
      .hud {
        position: absolute;
        left: 54px;
        top: 42px;
        right: 54px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 8;
        pointer-events: none;
      }
      .source-label,
      .risk {
        padding: 9px 12px;
        border: 1px solid rgba(244, 234, 216, 0.18);
        background: rgba(7, 16, 23, 0.7);
        color: #f4ead8;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .risk.medium { border-color: rgba(209, 164, 81, 0.6); color: #d1a451; }
      .risk.high { border-color: rgba(178, 58, 52, 0.8); color: #ff9a8f; }
      .lower {
        position: absolute;
        left: 64px;
        right: 64px;
        bottom: 46px;
        z-index: 8;
        display: grid;
        grid-template-columns: 320px 1fr 320px;
        gap: 24px;
        align-items: end;
        padding: 18px 20px;
        border-top: 1px solid rgba(244, 234, 216, 0.18);
        background: linear-gradient(180deg, transparent, rgba(7, 16, 23, 0.74));
      }
      .section,
      .meta {
        color: #c8bfae;
        font-size: 15px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .caption {
        color: #f4ead8;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 33px;
        line-height: 1.15;
        text-wrap: balance;
      }
    </style>
  </head>
  <body>
    <div data-composition-id="review" data-width="1920" data-height="1080" data-duration="${data.durationSec}" data-start="0" data-track-index="0">
      <script type="application/json" id="review-data">${escapeHtml(JSON.stringify(data))}</script>
      ${data.scenes.map(sceneMarkup).join("\n      ")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const sceneIds = ${JSON.stringify(sceneIds)};
      const sceneData = ${JSON.stringify(data.scenes.map((scene) => ({ id: scene.id, start: scene.start, duration: scene.duration })))};
      const tl = gsap.timeline({ paused: true });
      sceneData.forEach((scene) => {
        const selector = "#" + scene.id;
        tl.set(selector, { opacity: 1 }, scene.start);
        tl.fromTo(selector + " .visual-wrap", { scale: 1.035 }, { scale: 1.075, duration: scene.duration, ease: "none" }, scene.start);
        tl.from(selector + " .caption", { y: 22, opacity: 0, duration: 0.45, ease: "power3.out" }, scene.start + 0.2);
        tl.from(selector + " .source-label", { y: -16, opacity: 0, duration: 0.35, ease: "power2.out" }, scene.start + 0.15);
        tl.from(selector + " .node", { scale: 0.88, opacity: 0, stagger: 0.08, duration: 0.45, ease: "power3.out" }, scene.start + 0.35);
        tl.from(selector + " .line", { scaleX: 0, opacity: 0, stagger: 0.08, duration: 0.55, ease: "power2.out" }, scene.start + 0.55);
        tl.to(selector, { opacity: 0, duration: 0.35, ease: "power2.inOut" }, scene.start + scene.duration - 0.35);
      });
      window.__timelines.review = tl;
    </script>
  </body>
</html>
`;
}

function readmeForReview(data, args) {
  return `# HyperFrames Review Project

This is a generated review project, not a cleared final video.

## Source

- Visual plan: \`${args.plan}\`
- Asset intake: \`${args.intake}\`
- Lane: \`${data.lane}\`
- Duration: ${data.durationSec}s
- Scenes: ${data.scenes.length}

## Purpose

Use this project to review pacing, material mix, missing assets, and PPT risk before spending time on final sourcing or polish.

## Commands

\`\`\`bash
cd ${process.cwd()}
npm run video:audit-plan -- --plan ${args.plan}
open ${args.out}/index.html
\`\`\`

If HyperFrames CLI is available, open this folder in the HyperFrames preview workflow and inspect the first 60-90 seconds.

## Review Gates

${data.review.gates.map((gate) => `- ${gate}`).join("\n")}

## Material Mix

${Object.entries(data.review.materialMix).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Asset Work

- Replace \`SOURCE MATERIAL NEEDED\` placeholders with official/public-domain/licensed footage or archive stills.
- Replace \`DIAGRAM SLOT\` placeholders only after the section has enough source-grounded material.
- Keep generated visuals labeled as illustration when they could be mistaken for evidence.
`;
}

function hyperframesConfig(data) {
  return {
    schemaVersion: 1,
    entry: "index.html",
    compositions: [
      {
        id: "review",
        width: 1920,
        height: 1080,
        duration: data.durationSec,
        fps: 30
      }
    ]
  };
}

function packageJson(data) {
  return {
    private: true,
    type: "module",
    scripts: {
      preview: "hyperframes preview",
      render: "hyperframes render"
    },
    hyperframesReview: {
      durationSec: data.durationSec,
      scenes: data.scenes.length
    }
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.plan || !args.intake || !args.out) {
    console.error("Usage: node video-tool/generate-hyperframes-review.js --plan outputs/video-plan/visual-plan.json --intake outputs/video-plan/asset-intake.json --out hyperframes/review-project [--max-beats 12]");
    process.exit(1);
  }

  const plan = JSON.parse(await readFile(args.plan, "utf8"));
  const intake = JSON.parse(await readFile(args.intake, "utf8"));
  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const reviewData = await buildReviewData({
    plan,
    intake,
    intakePath: args.intake,
    outDir,
    maxBeats: args.maxBeats
  });
  reviewData.sourceFiles.visualPlan = args.plan;
  reviewData.title = args.title || reviewData.scenes[0]?.sectionTitle || "HyperFrames Review Project";
  const reviewManifest = buildReviewManifest({ data: reviewData, title: args.title });

  await mkdir(join(outDir, "data"), { recursive: true });
  await writeFile(join(outDir, "DESIGN.md"), designMarkdown, "utf8");
  await writeFile(join(outDir, "review-data.json"), `${JSON.stringify(reviewData, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "review-manifest.json"), `${JSON.stringify(reviewManifest, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "hyperframes.json"), `${JSON.stringify(hyperframesConfig(reviewData), null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "package.json"), `${JSON.stringify(packageJson(reviewData), null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "index.html"), htmlForReview(reviewData), "utf8");
  await writeFile(join(outDir, "README.md"), readmeForReview(reviewData, args), "utf8");
  await copyFile(args.plan, join(outDir, "data", "visual-plan.json"));
  await copyFile(args.intake, join(outDir, "data", "asset-intake.json"));
  await writeFile(join(outDir, "data", "review-manifest.json"), `${JSON.stringify(reviewManifest, null, 2)}\n`, "utf8");

  console.log(`HyperFrames review project created: ${outDir}`);
  console.log(`Scenes: ${reviewData.scenes.length}, duration: ${reviewData.durationSec}s`);
  console.log(`PPT risk: ${reviewManifest.riskSummary.pptRisk}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
