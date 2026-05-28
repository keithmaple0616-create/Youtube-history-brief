#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") args.plan = argv[++i];
    else if (token === "--out") args.out = argv[++i];
    else if (token === "--max-beats") args.maxBeats = Number(argv[++i]);
    else if (token === "--audio-dir") args.audioDir = argv[++i];
  }
  return args;
}

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else rejectRun(new Error(stderr || stdout || `${command} failed with exit code ${code}`));
    });
  });
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value, max = 220) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function wrapWords(value, lineLength = 46, maxLines = 5) {
  const words = cleanText(value, 420).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > lineLength) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function paletteFor(type) {
  if (type === "evidence") return { accent: "#4c7da8", tint: "#d7f1ff", label: "REAL / SOURCE-LIKE MATERIAL" };
  if (type === "diagram" || type === "chart") return { accent: "#d1a451", tint: "#ffe1a3", label: "STRUCTURE / EXPLANATION" };
  if (type === "generated-illustration") return { accent: "#b23a34", tint: "#ffd7d2", label: "ILLUSTRATION ONLY" };
  return { accent: "#b23a34", tint: "#f4ead8", label: "CHAPTER / TITLE CARD" };
}

async function probeDuration(path) {
  try {
    const result = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path
    ]);
    const duration = Number(result.stdout.trim());
    return Number.isFinite(duration) ? duration : 0;
  } catch {
    return 0;
  }
}

function textLines(lines, x, y, size, fill, weight = 400, gap = 1.28) {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * size * gap}" fill="${fill}" font-size="${size}" font-family="Arial, Helvetica, sans-serif" font-weight="${weight}">${escapeXml(line)}</text>`
  ).join("\n");
}

function svgForBeat({ beat, index, total, plan }) {
  const palette = paletteFor(beat.type);
  const title = wrapWords(`${index + 1}. ${beat.sectionTitle || plan.title || "Video Sample"}`, 34, 2);
  const body = wrapWords(beat.summary || beat.text || beat.visualGoal || "", 58, 5);
  const visual = wrapWords(`${String(beat.type || "visual").toUpperCase()} · ${beat.visualGoal || beat.sourcePolicy || ""}`, 48, 3);
  const progress = Math.round(((index + 1) / total) * 1660);
  const nodes = Array.from({ length: 9 }, (_, i) => {
    const cx = 220 + i * 170;
    const cy = 810 + (i % 2) * 56;
    const active = i <= Math.round((index / Math.max(total - 1, 1)) * 8);
    return `<circle cx="${cx}" cy="${cy}" r="${active ? 18 : 10}" fill="${active ? palette.accent : "#39434d"}" opacity="${active ? 0.95 : 0.55}"/>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#071017"/>
  <rect x="0" y="0" width="1920" height="1080" fill="#0f1a22" opacity="0.58"/>
  <rect x="90" y="76" width="1740" height="928" rx="34" fill="#111b23" stroke="#2c3842" stroke-width="2"/>
  <rect x="90" y="76" width="22" height="928" fill="${palette.accent}"/>
  <text x="140" y="146" fill="#c8bfae" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="700">${escapeXml(plan.lane || "history")} · MP4 SAMPLE · ${escapeXml(palette.label)}</text>
  <rect x="140" y="186" width="${progress}" height="8" rx="4" fill="${palette.accent}"/>
  <rect x="${140 + progress}" y="186" width="${1660 - progress}" height="8" rx="4" fill="#33404a"/>
  ${textLines(title, 140, 315, 76, "#f4ead8", 700, 1.12)}
  ${textLines(body, 145, 515, 44, "#f4ead8", 400, 1.35)}
  <rect x="1220" y="430" width="510" height="230" rx="26" fill="#182028" stroke="${palette.accent}" stroke-width="3"/>
  ${textLines(visual, 1260, 505, 34, palette.tint, 700, 1.28)}
  <text x="1260" y="640" fill="#c8bfae" font-size="25" font-family="Arial, Helvetica, sans-serif">素材回填后这里会替换为 footage / archive / map / image2</text>
  <line x1="220" y1="838" x2="1580" y2="838" stroke="#33404a" stroke-width="4"/>
  ${nodes}
  <text x="140" y="950" fill="#c8bfae" font-size="28" font-family="Arial, Helvetica, sans-serif">Low-fidelity sample for pacing. Not final publish render.</text>
</svg>`;
}

async function buildAudioTrack({ beats, audioDir, outDir }) {
  if (!audioDir) return null;
  const audioFiles = [];
  for (const beat of beats) {
    const path = resolve(audioDir, `${beat.id}.mp3`);
    try {
      const duration = await probeDuration(path);
      if (duration > 0) audioFiles.push({ beatId: beat.id, path, duration });
    } catch {
      // Missing audio clips are allowed for rough samples.
    }
  }
  if (!audioFiles.length) return null;

  const concatPath = join(outDir, "audio.ffconcat");
  const lines = ["ffconcat version 1.0"];
  for (const file of audioFiles) {
    lines.push(`file '${file.path.replaceAll("'", "'\\''")}'`);
  }
  await writeFile(concatPath, `${lines.join("\n")}\n`, "utf8");
  const narrationPath = join(outDir, "narration.mp3");
  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c:a",
    "libmp3lame",
    "-q:a",
    "4",
    "narration.mp3"
  ], outDir);
  return { narrationPath, files: audioFiles };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.plan || !args.out) {
    console.error("Usage: node video-tool/render-sample.js --plan outputs/video-projects/demo/visual-plan.json --out outputs/video-projects/demo/renders/sample.mp4 [--max-beats 12]");
    process.exit(1);
  }

  const plan = JSON.parse(await readFile(args.plan, "utf8"));
  const beats = (plan.beats || []).slice(0, args.maxBeats || 12);
  if (!beats.length) throw new Error("visual-plan.json contains no beats.");

  const outDir = resolve(dirname(args.out));
  const framesDir = join(outDir, "frames");
  await mkdir(framesDir, { recursive: true });
  const audioTrack = await buildAudioTrack({ beats, audioDir: args.audioDir, outDir });

  const concatLines = ["ffconcat version 1.0"];
  let duration = 0;
  for (const [index, beat] of beats.entries()) {
    const name = `frame-${String(index + 1).padStart(3, "0")}`;
    const svgPath = join(framesDir, `${name}.svg`);
    const pngPath = join(framesDir, `${name}.png`);
    await writeFile(svgPath, svgForBeat({ beat, index, total: beats.length, plan }), "utf8");
    await run("sips", ["-s", "format", "png", svgPath, "--out", pngPath]);
    const audioDuration = audioTrack?.files.find((file) => file.beatId === beat.id)?.duration || 0;
    const beatDuration = audioDuration > 0
      ? Math.max(3, audioDuration + 0.25)
      : Math.max(3, Math.min(14, Number(beat.estimatedDurationSec || 6)));
    concatLines.push(`file '${pngPath.replaceAll("'", "'\\''")}'`);
    concatLines.push(`duration ${beatDuration}`);
    duration += beatDuration;
  }
  const lastFrame = join(framesDir, `frame-${String(beats.length).padStart(3, "0")}.png`);
  concatLines.push(`file '${lastFrame.replaceAll("'", "'\\''")}'`);
  const concatPath = join(outDir, "frames.ffconcat");
  await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");

  const videoOnlyName = audioTrack ? "video-only.mp4" : basename(args.out);
  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-vf",
    "format=yuv420p,fps=30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    videoOnlyName
  ], outDir);

  if (audioTrack) {
    await run("ffmpeg", [
      "-y",
      "-i",
      videoOnlyName,
      "-i",
      "narration.mp3",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-shortest",
      basename(args.out)
    ], outDir);
  }

  await writeFile(join(outDir, "render-report.md"), `# Render Report\n\n- Output: \`${args.out}\`\n- Duration: ${duration}s\n- Beats rendered: ${beats.length}\n- Audio clips: ${audioTrack?.files.length || 0}\n- Renderer: SVG frames + ffmpeg${audioTrack ? " + narration audio" : ""}\n\nThis sample is for pacing and structure review. Replace placeholders with sourced footage/images before final publishing.\n`, "utf8");
  console.log(`Rendered sample MP4: ${args.out}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
