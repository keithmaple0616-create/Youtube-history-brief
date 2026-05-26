import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const sharp = require("/Users/xionglili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const scriptPath = join(root, "outputs", "trump-china-nixon-structural-reversal-script-2026-05-19.md");
const outDir = join(root, "outputs", "publish-candidate-trump-china-nixon-v4-visual-design");
const audioDir = join(outDir, "audio");
const segmentDir = join(outDir, "segments");
const finalPath = join(outDir, "trump-china-nixon-publish-candidate.mp4");
const manifestPath = join(outDir, "build-notes.md");

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => join(dir, name));
}

const rawImageAssets = [
  ...listImages(join(root, "outputs", "publish-assets", "nixon-1972")),
  ...listImages(join(root, "outputs", "publish-assets", "whitehouse-gallery")),
  ...listImages(join(root, "outputs", "publish-assets", "browser-captures"))
];

const rawVideoAssets = [
  join(root, "outputs", "nixon-trump-structural-reversal", "quick-draft-v3-video-footage.mp4")
].filter(existsSync);

let visualAssets = [];

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
  }
}

function cleanText(text) {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^Target length:.+$/gmi, "")
    .replace(/^Tone:.+$/gmi, "")
    .replace(/^Core thesis:.+$/gmi, "")
    .replace(/\*\*/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function extractSections(markdown) {
  const english = markdown.split(/^# 中文审稿版/m)[0].replace(/^# English Script\s*/m, "");
  const matches = [...english.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? english.length;
    return {
      number: match[1],
      title: match[2].trim(),
      text: cleanText(english.slice(start, end))
    };
  }).filter((section) => section.text.length > 100);
}

function wrapForDrawtext(text, maxChars = 34, maxLines = 4) {
  const words = String(text).replace(/[:']/g, "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.join("\n");
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgLines(text, x, y, size, color, family = "Arial", weight = 500, lineHeight = 1.22) {
  return String(text).split("\n").map((line, index) =>
    `<text x="${x}" y="${y + index * size * lineHeight}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`
  ).join("\n");
}

async function writeSvgPng(path, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path);
}

function titleSvg({ title, subtitle, eyebrow = "CURRENT EVENTS THROUGH HISTORICAL MEMORY" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#101827"/>
        <stop offset="62%" stop-color="#080b10"/>
        <stop offset="100%" stop-color="#1a130d"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <rect x="90" y="245" width="10" height="385" fill="#aa332f"/>
    <circle cx="1550" cy="230" r="190" fill="#4f7cac" opacity="0.14"/>
    <circle cx="1600" cy="820" r="250" fill="#aa332f" opacity="0.12"/>
    ${svgLines(eyebrow, 116, 285, 25, "#aa332f", "Arial", 800)}
    ${svgLines(wrapForDrawtext(title, 34, 3), 110, 380, 76, "#f4ead8", "Georgia", 700, 1.1)}
    ${svgLines(subtitle, 116, 565, 34, "#d8c7a2", "Arial", 500)}
  </svg>`;
}

function sectionOverlaySvg(section) {
  const headline = `${section.number}. ${section.title}`;
  const pull = section.text.split(/[.!?]\s+/).find((sentence) => sentence.length > 60) || section.text.slice(0, 120);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <rect x="0" y="866" width="1920" height="214" fill="#05070b" opacity="0.70"/>
    <rect x="0" y="866" width="1920" height="1" fill="#d8c7a2" opacity="0.28"/>
    <rect x="72" y="908" width="7" height="116" fill="#aa332f"/>
    ${svgLines(`SECTION ${section.number}`, 104, 910, 18, "#aa332f", "Arial", 800)}
    ${svgLines(wrapForDrawtext(headline, 58, 2), 104, 956, 34, "#f4ead8", "Georgia", 700, 1.14)}
    ${svgLines(wrapForDrawtext(pull, 92, 2), 760, 934, 22, "#d8c7a2", "Arial", 500, 1.28)}
  </svg>`;
}

function sectionCardSvg(section) {
  return titleSvg({
    title: `${section.number}. ${section.title}`,
    subtitle: "A documentary essay on strategic memory and great-power rivalry",
    eyebrow: "CHAPTER"
  });
}

async function prepareVisualAssets() {
  const cleanDir = join(outDir, "clean-assets");
  await mkdir(cleanDir, { recursive: true });
  const cleanedImages = [];
  for (let i = 0; i < rawImageAssets.length; i += 1) {
    const target = join(cleanDir, `image-${String(i + 1).padStart(2, "0")}.png`);
    if (!existsSync(target)) {
      await sharp(rawImageAssets[i])
        .trim({ background: "#000000", threshold: 18 })
        .resize(1920, 1080, { fit: "cover", position: "center" })
        .modulate({ brightness: 1.08, saturation: 1.05 })
        .png()
        .toFile(target);
    }
    cleanedImages.push({ type: "image", path: target });
  }

  visualAssets = [
    ...cleanedImages,
    ...rawVideoAssets.map((path) => ({ type: "video", path }))
  ];
}

async function run(command, args, options = {}) {
  const { stdout, stderr } = await exec(command, args, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 20,
    ...options
  });
  return `${stdout}${stderr}`;
}

async function duration(path) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    path
  ]);
  return Number(stdout.trim());
}

function minimaxEndpoint() {
  return (process.env.MINIMAX_REGION || "cn") === "global"
    ? "https://api.minimax.io/v1/t2a_v2"
    : "https://api.minimaxi.com/v1/t2a_v2";
}

async function synthesize(section, audioPath) {
  if (existsSync(audioPath)) return;
  const apiKey = process.env.MINIMAX_TTS_API_KEY || process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("Missing MINIMAX_API_KEY in .env");

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(minimaxEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo",
          text: section.text.replace(/\s+/g, " ").slice(0, 9800),
          stream: false,
          language_boost: "English",
          output_format: "hex",
          voice_setting: {
            voice_id: process.env.MINIMAX_TTS_VOICE_ID || "English_expressive_narrator",
            speed: 1,
            vol: 1,
            pitch: 0
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
            channel: 1
          }
        })
      });

      const data = await response.json();
      if (!response.ok || data.base_resp?.status_code) {
        throw new Error(data.base_resp?.status_msg || data.error?.message || "MiniMax TTS failed");
      }
      if (!data.data?.audio) throw new Error("MiniMax TTS returned no audio");
      await writeFile(audioPath, Buffer.from(data.data.audio, "hex"));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
      }
    }
  }

  throw lastError;
}

async function makeTitleSegment(path) {
  const title = "Trump's China Visit Was Not Nixon 2.0";
  const subtitle = "A structural reversal in U.S.-China diplomacy";
  const png = join(outDir, "title-card.png");
  await writeSvgPng(png, titleSvg({ title, subtitle }));
  await run("ffmpeg", [
    "-y",
    "-loop", "1", "-framerate", "30", "-i", png,
    "-f", "lavfi", "-i", "sine=frequency=74:sample_rate=48000",
    "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000",
    "-t", "8",
    "-filter_complex", "[0:v]format=yuv420p[v];[1:a]volume=0.045,afade=t=in:st=0:d=1.2,afade=t=out:st=6.2:d=1.4[bgm];[2:a]volume=0.07,atrim=0:0.24,afade=t=out:st=0.14:d=0.10[sfx];[bgm][sfx]amix=inputs=2:duration=first:normalize=0[a]",
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
    path
  ]);
}

async function makeSectionSegment(section, index, audioPath, segmentPath) {
  const dur = await duration(audioPath);
  const overlayPng = join(outDir, `overlay-${String(index + 1).padStart(2, "0")}.png`);
  await writeSvgPng(overlayPng, sectionOverlaySvg(section));
  const sectionTempDir = join(segmentDir, `section-${String(index + 1).padStart(2, "0")}`);
  await mkdir(sectionTempDir, { recursive: true });

  const sceneCount = Math.min(6, Math.max(4, Math.ceil(dur / 35)));
  const sceneDur = dur / sceneCount;
  const scenePaths = [];
  for (let scene = 0; scene < sceneCount; scene += 1) {
    const asset = visualAssets[(index * 5 + scene) % visualAssets.length];
    const scenePath = join(sectionTempDir, `scene-${String(scene + 1).padStart(2, "0")}.mp4`);
    scenePaths.push(scenePath);
    if (existsSync(scenePath)) continue;

    const inputArgs = asset.type === "image"
      ? ["-loop", "1", "-framerate", "30", "-i", asset.path]
      : ["-stream_loop", "-1", "-i", asset.path];
    const visualFilter = asset.type === "image"
      ? "[0:v]scale=2100:1182:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.00018,1.055)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,eq=contrast=1.03:saturation=1.05:brightness=0.02[base];[base][1:v]overlay=0:0,format=yuv420p[v]"
      : "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setpts=PTS-STARTPTS,eq=contrast=1.04:saturation=1.08:brightness=0.09[base];[base][1:v]overlay=0:0,format=yuv420p[v]";

    await run("ffmpeg", [
      "-y",
      ...inputArgs,
      "-loop", "1", "-i", overlayPng,
      "-t", String(Math.ceil(sceneDur * 100) / 100),
      "-filter_complex", visualFilter,
      "-map", "[v]",
      "-an",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
      scenePath
    ]);
  }

  const sceneList = join(sectionTempDir, "scenes.txt");
  writeFileSync(sceneList, scenePaths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n"));
  const visualOnlyPath = join(sectionTempDir, "visual-only.mp4");
  await run("ffmpeg", [
    "-y",
    "-f", "concat", "-safe", "0", "-i", sceneList,
    "-c", "copy",
    visualOnlyPath
  ]);

  await run("ffmpeg", [
    "-y",
    "-i", visualOnlyPath,
    "-i", audioPath,
    "-f", "lavfi", "-i", `sine=frequency=${index % 2 ? 98 : 82}:sample_rate=48000`,
    "-f", "lavfi", "-i", `sine=frequency=${index % 2 ? 880 : 660}:sample_rate=48000`,
    "-t", String(Math.ceil(dur * 100) / 100),
    "-filter_complex",
    `[1:a]volume=1.6,afade=t=in:st=0:d=0.15,afade=t=out:st=${Math.max(0, dur - 0.25).toFixed(2)}:d=0.25[vo];[2:a]volume=0.035,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, dur - 2).toFixed(2)}:d=2[bgm];[3:a]volume=0.08,atrim=0:0.22,afade=t=out:st=0.12:d=0.10[sfx];[vo][bgm][sfx]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
    "-map", "0:v:0",
    "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-shortest",
    segmentPath
  ]);
}

async function makeOutro(path) {
  const png = join(outDir, "outro-card.png");
  await writeSvgPng(png, titleSvg({
    title: "The question behind the handshake",
    subtitle: "What prevents rivalry from becoming collapse?",
    eyebrow: "SOURCES CHECKED: WHITE HOUSE / CHINESE GOVERNMENT / AP / AXIOS"
  }));
  await run("ffmpeg", [
    "-y",
    "-loop", "1", "-framerate", "30", "-i", png,
    "-f", "lavfi", "-i", "sine=frequency=68:sample_rate=48000",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
    "-t", "10",
    "-filter_complex", "[0:v]format=yuv420p[v];[1:a]volume=0.04,afade=t=in:st=0:d=1.4,afade=t=out:st=7.8:d=1.8[bgm];[2:a]volume=0.05,atrim=0:0.28,afade=t=out:st=0.16:d=0.12[sfx];[bgm][sfx]amix=inputs=2:duration=first:normalize=0[a]",
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
    path
  ]);
}

async function concatSegments(paths) {
  const listPath = join(outDir, "concat.txt");
  writeFileSync(listPath, paths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n"));
  await run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    finalPath
  ]);
}

async function contactSheet() {
  await run("ffmpeg", [
    "-y",
    "-i", finalPath,
    "-vf", "fps=1/75,scale=480:-1,tile=3x3",
    "-frames:v", "1",
    join(outDir, "contact-sheet.jpg")
  ]);
}

loadEnv();
await mkdir(audioDir, { recursive: true });
await mkdir(segmentDir, { recursive: true });

await prepareVisualAssets();
if (!visualAssets.length) throw new Error("No visual assets found.");

const sections = extractSections(readFileSync(scriptPath, "utf8"));
const segmentPaths = [];
const titlePath = join(segmentDir, "00-title.mp4");
await makeTitleSegment(titlePath);
segmentPaths.push(titlePath);

for (let i = 0; i < sections.length; i += 1) {
  const audioPath = join(audioDir, `${String(i + 1).padStart(2, "0")}-${sections[i].title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp3`);
  const segmentPath = join(segmentDir, `${String(i + 1).padStart(2, "0")}-${sections[i].title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp4`);
  console.log(`TTS ${i + 1}/${sections.length}: ${sections[i].title}`);
  await synthesize(sections[i], audioPath);
  if (!existsSync(segmentPath)) {
    console.log(`Video ${i + 1}/${sections.length}: ${basename(segmentPath)}`);
    await makeSectionSegment(sections[i], i, audioPath, segmentPath);
  } else {
    console.log(`Video ${i + 1}/${sections.length}: reuse ${basename(segmentPath)}`);
  }
  segmentPaths.push(segmentPath);
}

const outroPath = join(segmentDir, "99-outro.mp4");
await makeOutro(outroPath);
segmentPaths.push(outroPath);
await concatSegments(segmentPaths);
await contactSheet();

const totalDuration = await duration(finalPath);
const notes = `# Publish Candidate Build Notes

- Output: \`${finalPath}\`
- Contact sheet: \`${join(outDir, "contact-sheet.jpg")}\`
- Duration: ${Math.round(totalDuration)} seconds
- Script: \`${scriptPath}\`
- Voice provider: MiniMax
- TTS model: ${process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo"}
- Voice ID: ${process.env.MINIMAX_TTS_VOICE_ID || "English_expressive_narrator"}
- Visual assets:
${visualAssets.map((asset) => `  - ${asset.type}: \`${asset.path}\``).join("\n")}

## Release Caveat

This is a publish-candidate technical render, not a cleared final master. Before uploading, verify every factual claim, replace any placeholder or unlicensed visual material, review pronunciation, and confirm rights for all footage.
`;
writeFileSync(manifestPath, notes);
console.log(JSON.stringify({ finalPath, contactSheet: join(outDir, "contact-sheet.jpg"), duration: totalDuration }, null, 2));
