import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const sharp = require("/Users/xionglili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const outDir = join(root, "outputs", "video-tool-one-minute-sample-20260525");
const mediaDir = join(root, "hyperframes", "trump-china-90s", "media");
const segmentDir = join(outDir, "segments");
const frameDir = join(outDir, "frames");
const narrationPath = join(outDir, "narration.mp3");
const finalPath = join(outDir, "trump-china-nixon-one-minute-sample.mp4");
const contactSheetPath = join(outDir, "contact-sheet.jpg");
const midpointSheetPath = join(outDir, "contact-sheet-midpoints.jpg");

const narration = `Some photographs arrive already wearing someone else's memory. When Trump landed in Beijing, the image invited one obvious comparison: Nixon in 1972. But the resemblance is deceptive. Nixon went to China because Washington and Beijing both feared a third power more than they feared each other: the Soviet Union. That triangle gave diplomacy a reason to work. Today, there is no equivalent Soviet shadow pulling the United States and China together. The relationship is not opening. It is being managed under pressure. Trade, chips, ships, data, and Taiwan all sit inside the same nervous map. In the Nixon era, economic contact was a bridge to be built. In this era, economic contact is often a minefield to be mapped. So the question is not whether Trump recreated Nixon. The question is whether two rival powers can build habits of managed hostility before a photograph becomes a crisis.`;

const scenes = [
  {
    id: "01-memory",
    duration: 11,
    type: "video",
    src: join(mediaDir, "v3-intro-arrival.mp4"),
    eyebrow: "THE PHOTOGRAPH",
    title: "A familiar image can hide a different structure",
    caption: "Beijing arrival as historical echo"
  },
  {
    id: "02-triangle",
    duration: 12,
    type: "image",
    src: join(mediaDir, "nixon-arrival-01.png"),
    eyebrow: "1972",
    title: "Nixon's opening was triangle diplomacy",
    caption: "U.S. + China balancing Soviet pressure"
  },
  {
    id: "03-no-shadow",
    duration: 12,
    type: "video",
    src: join(mediaDir, "trump-handshake-clip.mp4"),
    eyebrow: "2026",
    title: "This time, no shared enemy pulls them together",
    caption: "Risk management, not strategic opening"
  },
  {
    id: "04-minefield",
    duration: 13,
    type: "video",
    src: join(mediaDir, "motion-footage-gop30.mp4"),
    eyebrow: "ECONOMIC CONTACT",
    title: "The bridge became a minefield",
    caption: "Trade, chips, data, shipping lanes"
  },
  {
    id: "05-question",
    duration: 12,
    type: "image",
    src: join(mediaDir, "xinhua-meeting.png"),
    eyebrow: "THE REAL QUESTION",
    title: "Can rivalry be managed before the image becomes a crisis?",
    caption: "Managed hostility is not inspiring. It may still matter."
  }
];

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

function endpoint() {
  return (process.env.MINIMAX_REGION || "cn") === "global"
    ? "https://api.minimax.io/v1/t2a_v2"
    : "https://api.minimaxi.com/v1/t2a_v2";
}

async function synthesizeNarration() {
  if (existsSync(narrationPath)) return;
  const apiKey = process.env.MINIMAX_TTS_API_KEY || process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("Missing MINIMAX_TTS_API_KEY or MINIMAX_API_KEY in .env");

  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo",
      text: narration,
      stream: false,
      language_boost: "English",
      output_format: "hex",
      voice_setting: {
        voice_id: process.env.MINIMAX_TTS_VOICE_ID || "English_expressive_narrator",
        speed: 1.03,
        vol: 1,
        pitch: -1
      },
      audio_setting: {
        sample_rate: 44100,
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
  await writeFile(narrationPath, Buffer.from(data.data.audio, "hex"));
}

async function run(command, args) {
  const { stdout, stderr } = await exec(command, args, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 40
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

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/);
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
  return lines;
}

function textSvg(lines, x, y, size, color, weight = 500, family = "Arial", lineHeight = 1.18) {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * size * lineHeight}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`
  ).join("\n");
}

function overlaySvg(scene, index) {
  const titleLines = wrap(scene.title, 35, 3);
  const captionLines = wrap(scene.caption, 52, 2);
  const showTriangle = scene.id === "02-triangle";
  const showMinefield = scene.id === "04-minefield";
  const showQuestion = scene.id === "05-question";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#071017" stop-opacity="0.80"/>
        <stop offset="52%" stop-color="#071017" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#071017" stop-opacity="0.12"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1920" height="1080" fill="#071017" opacity="0.04"/>
    <rect width="1920" height="1080" fill="url(#shade)"/>
    <rect x="82" y="740" width="860" height="250" rx="0" fill="#05080d" opacity="0.78"/>
    <rect x="82" y="760" width="6" height="210" fill="#b23a34"/>
    <text x="110" y="800" fill="#d1a451" font-family="Arial" font-size="22" font-weight="800" letter-spacing="4">${escapeXml(scene.eyebrow)}</text>
    ${textSvg(titleLines, 110, 865, 52, "#f4ead8", 700, "Georgia", 1.08)}
    ${textSvg(captionLines, 110, 958, 27, "#c8bfae", 600, "Arial", 1.25)}
    <text x="1720" y="96" fill="#c8bfae" opacity="0.72" font-family="Arial" font-size="22" font-weight="700">0${index + 1}</text>
    ${showTriangle ? triangleGraphic() : ""}
    ${showMinefield ? minefieldGraphic() : ""}
    ${showQuestion ? questionGraphic() : ""}
  </svg>`;
}

function triangleGraphic() {
  return `
    <g opacity="0.95" filter="url(#glow)">
      <line x1="1220" y1="260" x2="1045" y2="610" stroke="#4c7da8" stroke-width="4"/>
      <line x1="1220" y1="260" x2="1430" y2="610" stroke="#4c7da8" stroke-width="4"/>
      <line x1="1045" y1="610" x2="1430" y2="610" stroke="#b23a34" stroke-width="4" stroke-dasharray="14 12"/>
      <circle cx="1220" cy="260" r="18" fill="#d1a451"/>
      <circle cx="1045" cy="610" r="18" fill="#4c7da8"/>
      <circle cx="1430" cy="610" r="18" fill="#b23a34"/>
      <text x="1184" y="222" fill="#f4ead8" font-size="24" font-family="Arial" font-weight="700">Soviet pressure</text>
      <text x="988" y="664" fill="#f4ead8" font-size="24" font-family="Arial" font-weight="700">U.S.</text>
      <text x="1390" y="664" fill="#f4ead8" font-size="24" font-family="Arial" font-weight="700">China</text>
    </g>`;
}

function minefieldGraphic() {
  const labels = ["chips", "ships", "data", "Taiwan", "tariffs"];
  return `<g opacity="0.9">
    ${labels.map((label, index) => {
      const x = 1090 + index * 118;
      const y = 320 + (index % 2) * 105;
      return `<circle cx="${x}" cy="${y}" r="42" fill="#071017" stroke="#b23a34" stroke-width="3"/><text x="${x - 34}" y="${y + 8}" fill="#f4ead8" font-family="Arial" font-size="21" font-weight="700">${label}</text>`;
    }).join("")}
    <path d="M1040 610 C1180 500 1340 680 1540 520" stroke="#d1a451" stroke-width="5" fill="none" stroke-dasharray="12 12"/>
    <text x="1080" y="700" fill="#c8bfae" font-family="Arial" font-size="25" font-weight="700">interdependence becomes terrain</text>
  </g>`;
}

function questionGraphic() {
  return `<g opacity="0.92">
    <path d="M1110 305 C1280 240 1475 280 1580 430 C1670 558 1645 724 1510 806" stroke="#d1a451" stroke-width="5" fill="none"/>
    <circle cx="1510" cy="806" r="12" fill="#b23a34"/>
    <text x="1110" y="265" fill="#f4ead8" font-family="Georgia" font-size="44" font-weight="700">managed hostility</text>
    <text x="1190" y="872" fill="#c8bfae" font-family="Arial" font-size="24" font-weight="700">channels, procedures, restraint</text>
  </g>`;
}

async function writeOverlay(scene, index) {
  const path = join(frameDir, `${scene.id}.png`);
  await sharp(Buffer.from(overlaySvg(scene, index))).png().toFile(path);
  return path;
}

async function makeScene(scene, index) {
  const overlay = await writeOverlay(scene, index);
  const out = join(segmentDir, `${scene.id}.mp4`);

  const inputArgs = scene.type === "image"
    ? ["-loop", "1", "-framerate", "30", "-i", scene.src]
    : ["-stream_loop", "-1", "-i", scene.src];
  const baseFilter = scene.type === "image"
    ? "[0:v]scale=2200:1238:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.00016,1.05)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,eq=contrast=1.04:saturation=1.04:brightness=0.05[base]"
    : "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setpts=PTS-STARTPTS,eq=contrast=1.04:saturation=1.05:brightness=0.08[base]";

  await run("ffmpeg", [
    "-y",
    ...inputArgs,
    "-loop", "1", "-i", overlay,
    "-t", String(scene.duration),
    "-filter_complex",
    `${baseFilter};[base][1:v]overlay=0:0,fade=t=in:st=0:d=0.25,fade=t=out:st=${Math.max(0, scene.duration - 0.35)}:d=0.35,format=yuv420p[v]`,
    "-map", "[v]",
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    out
  ]);
  return out;
}

async function concatVideo(paths, out) {
  const listPath = join(outDir, "concat.txt");
  writeFileSync(listPath, paths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n"));
  const inputArgs = paths.flatMap((path) => ["-i", path]);
  const normalizers = paths.map((_, index) => `[${index}:v:0]fps=30,setsar=1,format=yuv420p[v${index}]`).join(";");
  const inputs = paths.map((_, index) => `[v${index}]`).join("");
  await run("ffmpeg", [
    "-y",
    ...inputArgs,
    "-filter_complex",
    `${normalizers};${inputs}concat=n=${paths.length}:v=1:a=0,format=yuv420p[v]`,
    "-map", "[v]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    out
  ]);
}

async function muxAudio(videoPath) {
  const ambient = join(mediaDir, "ambient-bed.mp3");
  const lowHit = join(mediaDir, "low-hit.wav");
  const pulse = join(mediaDir, "soft-pulse.wav");
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  await run("ffmpeg", [
    "-y",
    "-i", videoPath,
    "-i", narrationPath,
    "-stream_loop", "-1", "-i", ambient,
    "-i", lowHit,
    "-i", pulse,
    "-filter_complex",
    `[1:a]volume=1.55,afade=t=in:st=0:d=0.15,apad=pad_dur=4[vo];` +
      `[2:a]atrim=0:${totalDuration},volume=0.24,afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2[bed];` +
      "[3:a]volume=0.35,atrim=0:0.9,adelay=350|350[hit];" +
      "[4:a]volume=0.24,atrim=0:0.8,adelay=11000|11000[p1];" +
      "[4:a]volume=0.20,atrim=0:0.8,adelay=35000|35000[p2];" +
      `[vo][bed][hit][p1][p2]amix=inputs=5:duration=longest:normalize=0,atrim=0:${totalDuration},loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
    "-map", "0:v:0",
    "-map", "[a]",
    "-t", String(totalDuration),
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    finalPath
  ]);
}

async function makeContactSheet() {
  await run("ffmpeg", [
    "-y",
    "-i", finalPath,
    "-vf", "fps=1/8,scale=480:-1,tile=4x2",
    "-frames:v", "1",
    contactSheetPath
  ]);
}

async function makeMidpointSheet() {
  const times = [5, 17, 29, 42, 54];
  const framePaths = [];
  for (const time of times) {
    const framePath = join(outDir, "qa-frames", `t${time}.jpg`);
    framePaths.push(framePath);
    await mkdir(join(outDir, "qa-frames"), { recursive: true });
    await run("ffmpeg", [
      "-y",
      "-v", "error",
      "-i", finalPath,
      "-ss", String(time),
      "-frames:v", "1",
      framePath
    ]);
  }

  const inputArgs = framePaths.flatMap((path) => ["-i", path]);
  const scaled = framePaths.map((_, index) => `[${index}:v]scale=384:-1[f${index}]`).join(";");
  const inputs = framePaths.map((_, index) => `[f${index}]`).join("");
  await run("ffmpeg", [
    "-y",
    "-v", "error",
    ...inputArgs,
    "-filter_complex",
    `${scaled};${inputs}hstack=inputs=${framePaths.length}[v]`,
    "-map", "[v]",
    "-frames:v", "1",
    midpointSheetPath
  ]);
}

async function main() {
  loadEnv();
  await mkdir(outDir, { recursive: true });
  await mkdir(segmentDir, { recursive: true });
  await mkdir(frameDir, { recursive: true });

  for (const scene of scenes) {
    if (!existsSync(scene.src)) throw new Error(`Missing media asset: ${scene.src}`);
  }

  await synthesizeNarration();
  const scenePaths = [];
  for (let i = 0; i < scenes.length; i += 1) {
    scenePaths.push(await makeScene(scenes[i], i));
  }

  const videoOnlyPath = join(outDir, "video-only.mp4");
  await concatVideo(scenePaths, videoOnlyPath);
  await muxAudio(videoOnlyPath);
  await makeContactSheet();
  await makeMidpointSheet();

  const finalDuration = await duration(finalPath);
  const voiceDuration = await duration(narrationPath);
  writeFileSync(join(outDir, "build-notes.md"), `# One-Minute Sample Build Notes

- Output: \`${finalPath}\`
- Contact sheet: \`${contactSheetPath}\`
- Midpoint contact sheet: \`${midpointSheetPath}\`
- Duration: ${finalDuration.toFixed(2)} seconds
- Narration duration: ${voiceDuration.toFixed(2)} seconds
- Voice provider: MiniMax
- TTS model: ${process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo"}
- Voice ID: ${process.env.MINIMAX_TTS_VOICE_ID || "English_expressive_narrator"}
- Visual style: Editorial Documentary x Geopolitical Map Essay

## Caveat

This is a one-minute review sample, not a cleared final master. It uses local project media and code-generated overlays to test rhythm, voice, and visual direction.
`);

  console.log(JSON.stringify({ finalPath, contactSheetPath, finalDuration, voiceDuration }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
