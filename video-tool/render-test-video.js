#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DEFAULT_DURATION = 60;
const DEFAULT_BEAT_SECONDS = 10;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") args.plan = argv[++i];
    else if (token === "--out") args.out = argv[++i];
    else if (token === "--duration") args.duration = Number(argv[++i]);
    else if (token === "--image") args.image = argv[++i];
  }
  return args;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stderr || stdout}`));
    });
  });
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.join("\n");
}

function safeScreenText(beat) {
  const raw = beat.screenText || beat.emphasis || beat.summary || beat.caption || "";
  return String(raw).replace(/[“”]/g, '"').replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

function typeLabel(type) {
  return {
    "title-card": "TITLE",
    evidence: "EVIDENCE",
    diagram: "DIAGRAM",
    chart: "CHART",
    "generated-illustration": "ILLUSTRATION",
    "chapter-card": "CHAPTER"
  }[type] || String(type || "BEAT").toUpperCase();
}

function paletteFor(type, index) {
  const palettes = {
    "title-card": ["0x071018", "0xb7332f", "0xd8c7a2"],
    evidence: ["0x0b111a", "0x4f7cac", "0xd8c7a2"],
    diagram: ["0x090d12", "0xb7332f", "0x4f7cac"],
    chart: ["0x081018", "0x4f7cac", "0xf2ead8"],
    "generated-illustration": ["0x0d1117", "0xd8c7a2", "0xb7332f"],
    "chapter-card": ["0x100d0a", "0xd8c7a2", "0xb7332f"]
  };
  return palettes[type] || (index % 2 ? palettes.diagram : palettes.evidence);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function imageDataUri(imagePath) {
  if (!imagePath || !existsSync(imagePath)) return "";
  const bytes = await readFile(imagePath);
  const ext = imagePath.toLowerCase().endsWith(".jpg") || imagePath.toLowerCase().endsWith(".jpeg")
    ? "jpeg"
    : "png";
  return `data:image/${ext};base64,${bytes.toString("base64")}`;
}

function slideHtml({ beat, index, backgroundDataUri }) {
  const [bg, accent, secondary] = paletteFor(beat.type, index);
  const heading = index === 0 ? "The Photograph That Deceives" : safeScreenText(beat);
  const caption = beat.caption || beat.summary;
  const label = typeLabel(beat.type);
  const progressWidth = Math.round(((index + 1) / 6) * 500);
  const backgroundStyle = backgroundDataUri
    ? `background-image: linear-gradient(90deg, rgba(0,0,0,.52), rgba(0,0,0,.16)), url("${backgroundDataUri}");`
    : `background:
        radial-gradient(circle at 18% 20%, ${accent.replace("0x", "#")}44, transparent 27%),
        radial-gradient(circle at 82% 38%, ${secondary.replace("0x", "#")}33, transparent 30%),
        linear-gradient(135deg, ${bg.replace("0x", "#")}, #05070b 72%);`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #05070b;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #f2ead8;
  }
  .frame {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
    ${backgroundStyle}
  }
  .frame::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 48px 48px;
    opacity: .18;
  }
  .shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0,0,0,.62), rgba(0,0,0,.08) 54%, rgba(0,0,0,.42)),
      linear-gradient(0deg, rgba(0,0,0,.38), transparent 44%);
  }
  .rail {
    position: absolute;
    left: 78px;
    top: 72px;
    width: 5px;
    height: 96px;
    background: ${accent.replace("0x", "#")};
  }
  .label {
    position: absolute;
    left: 92px;
    top: 72px;
    color: ${secondary.replace("0x", "#")};
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 2.4px;
  }
  .title {
    position: absolute;
    left: 92px;
    top: 112px;
    width: 440px;
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    font-size: ${index === 0 ? 44 : 32}px;
    line-height: 1.05;
    letter-spacing: 0;
    text-wrap: balance;
    text-shadow: 0 10px 30px rgba(0,0,0,.45);
  }
  .source-note {
    position: absolute;
    left: 548px;
    top: 78px;
    width: 330px;
    text-align: left;
    color: #a9b0bb;
    font-size: 15px;
    line-height: 1.3;
    letter-spacing: .6px;
    text-transform: uppercase;
  }
  .lower-third {
    position: absolute;
    left: 92px;
    top: 390px;
    width: 780px;
    padding: 12px 16px 12px 18px;
    border-left: 4px solid ${accent.replace("0x", "#")};
    background: rgba(0,0,0,.46);
    color: #fff7e8;
    font-weight: 600;
    font-size: 19px;
    line-height: 1.22;
  }
  .progress-track {
    position: absolute;
    left: 92px;
    top: 508px;
    width: 420px;
    height: 4px;
    background: rgba(255,255,255,.12);
  }
  .progress {
    width: ${progressWidth}px;
    height: 4px;
    background: ${accent.replace("0x", "#")};
  }
  .visual {
    position: absolute;
    left: 520px;
    top: 144px;
    width: 360px;
    height: 240px;
  }
  .archive-card {
    position: absolute;
    border: 1px solid rgba(242,234,216,.32);
    background:
      linear-gradient(135deg, rgba(216,199,162,.22), rgba(216,199,162,.04)),
      rgba(6,10,16,.72);
    box-shadow: 0 24px 80px rgba(0,0,0,.38);
  }
  .archive-card.one {
    left: 28px;
    top: 24px;
    width: 190px;
    height: 130px;
    transform: rotate(-2deg);
  }
  .archive-card.two {
    right: 18px;
    top: 72px;
    width: 176px;
    height: 118px;
    transform: rotate(2deg);
  }
  .archive-card::before {
    content: "";
    position: absolute;
    inset: 14px;
    border-top: 7px solid rgba(242,234,216,.28);
    border-bottom: 28px solid rgba(242,234,216,.12);
    background: repeating-linear-gradient(0deg, rgba(242,234,216,.16), rgba(242,234,216,.16) 3px, transparent 3px, transparent 18px);
  }
  .diagram-line {
    position: absolute;
    height: 3px;
    transform-origin: left center;
    background: linear-gradient(90deg, ${accent.replace("0x", "#")}, ${secondary.replace("0x", "#")});
    opacity: .8;
    box-shadow: 0 0 28px ${accent.replace("0x", "#")}66;
  }
  .line-a { left: 94px; top: 74px; width: 156px; transform: rotate(25deg); }
  .line-b { left: 112px; top: 175px; width: 145px; transform: rotate(-28deg); }
  .line-c { left: 82px; top: 174px; width: 208px; transform: rotate(0deg); opacity: .45; }
  .node {
    position: absolute;
    width: 86px;
    height: 86px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 1px solid rgba(242,234,216,.28);
    background: rgba(7,12,18,.74);
    color: #f2ead8;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: .6px;
    text-align: center;
    box-shadow: 0 18px 60px rgba(0,0,0,.38);
  }
  .node.us { left: 34px; top: 46px; }
  .node.china { right: 34px; top: 50px; }
  .node.third { left: 138px; bottom: 14px; color: ${secondary.replace("0x", "#")}; }
  .map-lines {
    position: absolute;
    inset: 0;
    opacity: .55;
    background:
      radial-gradient(circle at 24% 42%, ${accent.replace("0x", "#")}88 0 5px, transparent 6px),
      radial-gradient(circle at 74% 42%, ${secondary.replace("0x", "#")}88 0 5px, transparent 6px),
      radial-gradient(circle at 50% 82%, #d8c7a288 0 5px, transparent 6px);
  }
  .visual-title {
    position: absolute;
    left: 20px;
    bottom: 10px;
    color: rgba(242,234,216,.68);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="shade"></div>
    ${visualMarkup(beat)}
    <div class="rail"></div>
    <div class="label">${escapeHtml(label)} ${String(index + 1).padStart(2, "0")} / 06</div>
    <div class="title">${escapeHtml(wrapText(heading, index === 0 ? 23 : 24, 2)).replace(/\n/g, "<br>")}</div>
    <div class="source-note">${escapeHtml(sourceNote(beat))}</div>
    <div class="lower-third">${escapeHtml(wrapText(caption, 60, 2)).replace(/\n/g, "<br>")}</div>
    <div class="progress-track"><div class="progress"></div></div>
  </div>
</body>
</html>`;
}

function sourceNote(beat) {
  if (beat.type === "diagram") return "Structural diagram";
  if (beat.type === "evidence") return "Evidence slot - source required";
  if (beat.type === "title-card") return "Generated background plate";
  return "Illustrative visual";
}

function visualMarkup(beat) {
  if (beat.type === "diagram") {
    return `<div class="visual">
      <div class="map-lines"></div>
      <div class="diagram-line line-a"></div>
      <div class="diagram-line line-b"></div>
      <div class="diagram-line line-c"></div>
      <div class="node us">U.S.</div>
      <div class="node china">China</div>
      <div class="node third">Third<br>Power</div>
      <div class="visual-title">Power Configuration</div>
    </div>`;
  }
  if (beat.type === "evidence") {
    return `<div class="visual">
      <div class="archive-card one"></div>
      <div class="archive-card two"></div>
      <div class="visual-title">Archival Evidence Placeholder</div>
    </div>`;
  }
  return `<div class="visual">
    <div class="visual-title">Atmosphere Plate</div>
  </div>`;
}

async function renderSegment({ beat, index, outDir, imagePath }) {
  const segmentPath = join(outDir, `segment-${String(index + 1).padStart(2, "0")}.mp4`);
  const htmlPath = join(outDir, `slide-${String(index + 1).padStart(2, "0")}.html`);
  const rawPngPath = `${htmlPath}.png`;
  const framePath = join(outDir, `frame-${String(index + 1).padStart(2, "0")}.png`);
  const backgroundDataUri = index === 0 ? await imageDataUri(imagePath) : "";
  await writeFile(htmlPath, slideHtml({ beat, index, backgroundDataUri }), "utf8");

  await run("qlmanage", ["-t", "-s", String(WIDTH), "-o", outDir, htmlPath]);
  await run("ffmpeg", [
    "-y",
    "-i", rawPngPath,
    "-vf", `crop=${WIDTH}:${HEIGHT}:0:0,format=rgba`,
    framePath
  ]);

  await run("ffmpeg", [
    "-y",
    "-loop", "1",
    "-i", framePath,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-t", String(DEFAULT_BEAT_SECONDS),
    "-vf", [
      [
        "zoompan=z='min(zoom+0.00028,1.035)'",
        "x='iw/2-(iw/zoom/2)'",
        "y='ih/2-(ih/zoom/2)'",
        `d=${DEFAULT_BEAT_SECONDS * FPS}`,
        `s=${WIDTH}x${HEIGHT}`,
        `fps=${FPS}`
      ].join(":"),
      "fade=t=in:st=0:d=0.35",
      `fade=t=out:st=${DEFAULT_BEAT_SECONDS - 0.35}:d=0.35`,
      "format=yuv420p"
    ].join(","),
    "-shortest",
    "-r", String(FPS),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "96k",
    segmentPath
  ]);
  return segmentPath;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.plan) {
    console.error("Usage: node video-tool/render-test-video.js --plan outputs/video-tool-v0.1-demo/visual-plan.json --out outputs/video-tool-one-minute-test/test.mp4 [--image path]");
    process.exit(1);
  }

  const planPath = resolve(args.plan);
  const outPath = resolve(args.out || join("outputs", "video-tool-one-minute-test", "one-minute-test.mp4"));
  const outDir = dirname(outPath);
  const workDir = join(outDir, "work");
  const duration = Number.isFinite(args.duration) ? args.duration : DEFAULT_DURATION;
  const beatCount = Math.max(1, Math.min(12, Math.ceil(duration / DEFAULT_BEAT_SECONDS)));
  const imagePath = args.image ? resolve(args.image) : "";

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const beats = (plan.beats || []).slice(0, beatCount);
  if (!beats.length) throw new Error(`No beats found in ${planPath}`);

  await mkdir(workDir, { recursive: true });
  const segmentPaths = [];
  for (let i = 0; i < beats.length; i += 1) {
    segmentPaths.push(await renderSegment({ beat: beats[i], index: i, outDir: workDir, imagePath }));
  }

  const concatPath = join(workDir, "concat.txt");
  await writeFile(concatPath, segmentPaths.map((item) => `file '${item.replace(/'/g, "'\\''")}'`).join("\n") + "\n", "utf8");
  await run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-c", "copy",
    outPath
  ]);

  const notes = [
    "# One Minute Test Render",
    "",
    `- Source plan: \`${planPath}\``,
    `- Output: \`${outPath}\``,
    `- Duration target: ${duration} seconds`,
    `- Beats rendered: ${beats.length}`,
    `- Background image: ${imagePath || "none"}`,
    "",
    "This is a rough technical draft. It validates the script-to-plan-to-MP4 path, not final visual quality."
  ].join("\n");
  await writeFile(join(outDir, "build-notes.md"), `${notes}\n`, "utf8");

  console.log(`Rendered ${basename(outPath)}`);
  console.log(outPath);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
