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
const outDir = join(root, "outputs", "video-tool-reference-style-sample-20260525");
const frameDir = join(outDir, "frames");
const segmentDir = join(outDir, "segments");
const mediaDir = join(root, "hyperframes", "trump-china-90s", "media");
const narrationPath = join(outDir, "narration.mp3");
const finalPath = join(outDir, "trump-china-nixon-reference-style-sample.mp4");
const contactSheetPath = join(outDir, "contact-sheet-midpoints.jpg");

const narration = `Some photographs arrive already wearing someone else's memory. When Trump landed in Beijing, the image invited one obvious comparison: Nixon in 1972. But the resemblance is deceptive. Nixon went to China because Washington and Beijing both feared a third power more than they feared each other: the Soviet Union. That triangle gave diplomacy a reason to work. Today there is no equivalent Soviet shadow pulling the United States and China together. This is not a new opening. It is risk management between two powers already pressed against each other. Trade, chips, ships, data, and Taiwan sit inside the same nervous map. In the Nixon era, economic contact was a bridge to be built. In this era, economic contact is often a minefield to be mapped. So the question is not whether Trump recreated Nixon. The question is whether two rival powers can build habits of managed hostility before a photograph becomes a crisis.`;

const scenes = [
  {
    id: "01-cold-open",
    duration: 3,
    mode: "title",
    eyebrow: "COLD OPEN",
    title: "Not Nixon 2.0",
    sub: "The photograph is a trap."
  },
  {
    id: "02-arrival-evidence",
    duration: 3,
    mode: "evidence-video",
    media: join(mediaDir, "v3-intro-arrival.mp4"),
    eyebrow: "SOURCE WINDOW",
    title: "A familiar arrival",
    sub: "Use official / cleared footage here."
  },
  {
    id: "03-dossier",
    duration: 4,
    mode: "document",
    eyebrow: "解密 / DOSSIER",
    title: "The photograph is not the structure",
    sub: "Beijing, 2026  /  Nixon, 1972",
    evidence: join(mediaDir, "trump-arrival-01.png")
  },
  {
    id: "04-crumpled-paper",
    duration: 3,
    mode: "document",
    eyebrow: "MEMORY",
    title: "A famous image edits the past",
    sub: "What it hides matters more."
  },
  {
    id: "05-illustration",
    duration: 4,
    mode: "illustration",
    eyebrow: "历史回声",
    title: "A handshake can become a trap",
    sub: "Similarity on the surface. Reversal underneath."
  },
  {
    id: "06-nixon-evidence",
    duration: 3,
    mode: "evidence-image",
    media: join(mediaDir, "nixon-arrival-01.png"),
    eyebrow: "ARCHIVE WINDOW",
    title: "1972 had a third force",
    sub: "The image needs source clearance."
  },
  {
    id: "07-triangle",
    duration: 4,
    mode: "diagram",
    eyebrow: "1972",
    title: "Triangle diplomacy",
    sub: "Washington and Beijing both watched Moscow.",
    evidence: join(mediaDir, "nixon-arrival-02.png")
  },
  {
    id: "08-equation",
    duration: 4,
    mode: "data",
    eyebrow: "STRUCTURE",
    title: "Shared fear made opening rational",
    sub: "Not friendship. Calculation."
  },
  {
    id: "09-2026-evidence",
    duration: 3,
    mode: "evidence-video",
    media: join(mediaDir, "trump-handshake-clip.mp4"),
    eyebrow: "SOURCE WINDOW",
    title: "2026 looks similar",
    sub: "But the strategic gravity is gone."
  },
  {
    id: "10-map",
    duration: 4,
    mode: "map",
    eyebrow: "2026",
    title: "No shared enemy pulls them together",
    sub: "The relationship is managed under pressure.",
    evidence: join(mediaDir, "trump-handshake-clip.mp4")
  },
  {
    id: "11-risk-lines",
    duration: 4,
    mode: "map",
    eyebrow: "RISK MAP",
    title: "Many red lines, no single center",
    sub: "Taiwan, chips, data, shipping lanes"
  },
  {
    id: "12-data-sting",
    duration: 3,
    mode: "data",
    eyebrow: "经济接触",
    title: "The bridge became a minefield",
    sub: "Trade / chips / ships / data / Taiwan"
  },
  {
    id: "13-generated-plate",
    duration: 4,
    mode: "illustration",
    eyebrow: "ILLUSTRATION",
    title: "Interdependence becomes terrain",
    sub: "Generated visual, not evidence."
  },
  {
    id: "14-protocol",
    duration: 3,
    mode: "document",
    eyebrow: "PROTOCOL",
    title: "When agreements are thin, ritual gets thick",
    sub: "Room, table, flags, choreography."
  },
  {
    id: "15-summit-evidence",
    duration: 4,
    mode: "evidence-image",
    media: join(mediaDir, "xinhua-meeting.png"),
    eyebrow: "SOURCE WINDOW",
    title: "Evidence stays small and labeled",
    sub: "Main visual remains code/generated."
  },
  {
    id: "16-final-question",
    duration: 7,
    mode: "title",
    eyebrow: "THE QUESTION",
    title: "Can rivalry be managed before the image becomes a crisis?",
    sub: "The point is managed hostility, not nostalgia."
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

function ttsEndpoint() {
  return (process.env.MINIMAX_REGION || "cn") === "global"
    ? "https://api.minimax.io/v1/t2a_v2"
    : "https://api.minimaxi.com/v1/t2a_v2";
}

async function synthesizeNarration() {
  if (existsSync(narrationPath)) return;
  const apiKey = process.env.MINIMAX_TTS_API_KEY || process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("Missing MINIMAX_TTS_API_KEY or MINIMAX_API_KEY in .env");
  const response = await fetch(ttsEndpoint(), {
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

function text(lines, x, y, size, color, weight = 500, family = "Arial", lineHeight = 1.2, opacity = 1) {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * size * lineHeight}" fill="${color}" opacity="${opacity}" font-family="${family}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`
  ).join("\n");
}

function hud() {
  const dots = Array.from({ length: 18 }, (_, i) => `<circle cx="${200 + i * 86}" cy="58" r="2" fill="#d7cbb8" opacity="${i % 5 === 0 ? 0.7 : 0.25}"/>`).join("");
  const ticks = Array.from({ length: 28 }, (_, i) => `<rect x="${80 + i * 64}" y="1010" width="22" height="2" fill="#d7cbb8" opacity="${i % 4 === 0 ? 0.45 : 0.18}"/>`).join("");
  return `${dots}${ticks}<text x="78" y="62" fill="#a9322c" font-family="Arial" font-size="17" font-weight="800">HISTORY / CURRENT AFFAIRS</text><text x="78" y="1016" fill="#d7cbb8" opacity="0.55" font-family="Arial" font-size="15">VISUAL RECONSTRUCTION / NOT EVIDENCE UNLESS SOURCED</text>`;
}

function base(scene) {
  return `<defs>
    <radialGradient id="beam" cx="14%" cy="22%" r="72%">
      <stop offset="0%" stop-color="#1c3440" stop-opacity="0.95"/>
      <stop offset="52%" stop-color="#071017" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#020407" stop-opacity="1"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#beam)"/>
  <path d="M90 870 C420 620 540 288 1090 120 C1430 16 1670 70 1850 160" stroke="#eef0df" stroke-width="78" opacity="0.035" fill="none"/>
  <path d="M0 860 C460 620 750 870 1920 625" stroke="#4c7da8" stroke-width="2" opacity="0.12" fill="none"/>
  ${hud()}
  <text x="112" y="178" fill="#d1a451" font-family="Arial" font-size="22" font-weight="900" letter-spacing="6">${escapeXml(scene.eyebrow)}</text>
  ${text(wrap(scene.title, 26, 3), 108, 292, 78, "#f4ead8", 700, "Georgia", 1.06)}
  ${text(wrap(scene.sub, 58, 2), 114, 518, 29, "#c8bfae", 500, "Arial", 1.24)}
  <rect x="108" y="606" width="620" height="1" fill="#d1a451" opacity="0.52"/>`;
}

function documentScene(scene) {
  return `${base(scene)}
  <g transform="translate(1030 222) rotate(-2)">
    <rect width="575" height="392" fill="#e8dfc7"/>
    <rect x="38" y="48" width="250" height="18" fill="#071017" opacity="0.2"/>
    <rect x="38" y="94" width="500" height="3" fill="#071017" opacity="0.25"/>
    <rect x="38" y="126" width="452" height="3" fill="#071017" opacity="0.20"/>
    <rect x="38" y="158" width="476" height="3" fill="#071017" opacity="0.18"/>
    <rect x="355" y="245" width="145" height="64" fill="none" stroke="#a9322c" stroke-width="6"/>
    <text x="374" y="287" fill="#a9322c" font-family="Georgia" font-size="38" font-weight="700">DECLASSIFIED</text>
  </g>
  <g transform="translate(1134 670)">
    <rect width="360" height="206" fill="#05080d" opacity="0.86"/>
    <text x="28" y="54" fill="#d1a451" font-family="Arial" font-size="18" font-weight="800">SOURCE WINDOW</text>
    <text x="28" y="100" fill="#f4ead8" font-family="Georgia" font-size="35" font-weight="700">arrival image</text>
    <text x="28" y="142" fill="#c8bfae" font-family="Arial" font-size="20">Replace with official / cleared footage</text>
  </g>`;
}

function illustrationScene(scene) {
  return `${base(scene)}
  <g transform="translate(1030 260)">
    <path d="M80 270 C140 74 338 80 390 232 C438 365 232 470 80 270Z" fill="#0f252c" stroke="#d1a451" stroke-width="3"/>
    <path d="M105 260 C210 170 320 176 378 235" fill="none" stroke="#f4ead8" stroke-width="15" stroke-linecap="round"/>
    <path d="M126 284 C230 355 338 320 402 248" fill="none" stroke="#a9322c" stroke-width="15" stroke-linecap="round"/>
    <circle cx="124" cy="260" r="22" fill="#f4ead8"/>
    <circle cx="382" cy="238" r="22" fill="#a9322c"/>
    <text x="92" y="548" fill="#c8bfae" font-family="Arial" font-size="25">illustration / metaphor / not evidence</text>
  </g>`;
}

function diagramScene(scene) {
  return `${base(scene)}
  <g transform="translate(1010 202)">
    <line x1="320" y1="80" x2="110" y2="442" stroke="#4c7da8" stroke-width="5"/>
    <line x1="320" y1="80" x2="560" y2="442" stroke="#4c7da8" stroke-width="5"/>
    <line x1="110" y1="442" x2="560" y2="442" stroke="#a9322c" stroke-width="5" stroke-dasharray="16 14"/>
    <circle cx="320" cy="80" r="26" fill="#d1a451"/>
    <circle cx="110" cy="442" r="26" fill="#4c7da8"/>
    <circle cx="560" cy="442" r="26" fill="#a9322c"/>
    <text x="214" y="42" fill="#f4ead8" font-family="Georgia" font-size="34" font-weight="700">Soviet pressure</text>
    <text x="65" y="510" fill="#f4ead8" font-family="Arial" font-size="28" font-weight="800">U.S.</text>
    <text x="510" y="510" fill="#f4ead8" font-family="Arial" font-size="28" font-weight="800">China</text>
    <text x="92" y="620" fill="#c8bfae" font-family="Arial" font-size="24">diagram: code-native, editable, rights-safe</text>
  </g>`;
}

function mapScene(scene) {
  const nodes = [
    ["trade", 1060, 342],
    ["chips", 1210, 255],
    ["ships", 1390, 330],
    ["data", 1320, 490],
    ["Taiwan", 1520, 450]
  ];
  return `${base(scene)}
  <g>
    ${nodes.map(([label, x, y]) => `<circle cx="${x}" cy="${y}" r="54" fill="#071017" stroke="#a9322c" stroke-width="3"/><text x="${x - 36}" y="${y + 8}" fill="#f4ead8" font-family="Arial" font-size="22" font-weight="800">${label}</text>`).join("")}
    <path d="M1010 624 C1130 498 1360 672 1582 532" stroke="#d1a451" stroke-width="6" fill="none" stroke-dasharray="14 12"/>
    <path d="M1055 708 C1250 610 1430 760 1630 682" stroke="#4c7da8" stroke-width="3" fill="none" opacity="0.58"/>
    <text x="1058" y="790" fill="#c8bfae" font-family="Arial" font-size="26" font-weight="700">many red lines, no single center</text>
  </g>`;
}

function dataScene(scene) {
  return `${base(scene)}
  <g transform="translate(1020 238)">
    <text x="0" y="100" fill="#f4ead8" font-family="Arial" font-size="70" font-weight="900">TRADE</text>
    <text x="0" y="210" fill="#f4ead8" font-family="Arial" font-size="70" font-weight="900">CHIPS</text>
    <text x="0" y="320" fill="#f4ead8" font-family="Arial" font-size="70" font-weight="900">SHIPS</text>
    <text x="0" y="430" fill="#f4ead8" font-family="Arial" font-size="70" font-weight="900">DATA</text>
    <rect x="338" y="62" width="310" height="30" fill="#d1a451"/>
    <rect x="338" y="172" width="226" height="30" fill="#a9322c"/>
    <rect x="338" y="282" width="404" height="30" fill="#4c7da8"/>
    <rect x="338" y="392" width="270" height="30" fill="#d1a451"/>
    <text x="0" y="564" fill="#c8bfae" font-family="Arial" font-size="25">conceptual chart until data is verified</text>
  </g>`;
}

function titleScene(scene) {
  return `${base(scene)}
  <g transform="translate(1010 300)">
    <text x="0" y="112" fill="#f4ead8" font-family="Georgia" font-size="126" font-weight="700">${escapeXml(scene.title.split(" ")[0] || "")}</text>
    <text x="0" y="246" fill="#a9322c" font-family="Arial" font-size="92" font-weight="900">${escapeXml(scene.title.split(" ").slice(1).join(" ") || scene.title)}</text>
    <rect x="0" y="318" width="630" height="4" fill="#d1a451" opacity="0.7"/>
    <text x="0" y="390" fill="#c8bfae" font-family="Arial" font-size="28" font-weight="700">short punctuation card, not a full slide</text>
  </g>`;
}

function evidenceOverlayScene(scene) {
  return `<defs>
    <linearGradient id="leftShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#020407" stop-opacity="0.86"/>
      <stop offset="58%" stop-color="#071017" stop-opacity="0.44"/>
      <stop offset="100%" stop-color="#071017" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#leftShade)"/>
  ${hud()}
  <rect x="76" y="700" width="820" height="245" fill="#05080d" opacity="0.82"/>
  <rect x="76" y="700" width="7" height="245" fill="#a9322c"/>
  <text x="110" y="754" fill="#d1a451" font-family="Arial" font-size="21" font-weight="900" letter-spacing="4">${escapeXml(scene.eyebrow)}</text>
  ${text(wrap(scene.title, 30, 2), 108, 824, 56, "#f4ead8", 700, "Georgia", 1.05)}
  ${text(wrap(scene.sub, 54, 2), 112, 916, 25, "#c8bfae", 600, "Arial", 1.24)}
  <text x="1510" y="86" fill="#d7cbb8" opacity="0.72" font-family="Arial" font-size="20" font-weight="800">EVIDENCE / REPLACEABLE</text>`;
}

function sceneSvg(scene) {
  const body = scene.mode === "title"
    ? titleScene(scene)
    : scene.mode === "document"
    ? documentScene(scene)
    : scene.mode === "illustration"
      ? illustrationScene(scene)
      : scene.mode === "diagram"
        ? diagramScene(scene)
        : scene.mode === "map"
          ? mapScene(scene)
          : dataScene(scene);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${body}</svg>`;
}

async function makeScene(scene, index) {
  const frame = join(frameDir, `${scene.id}.png`);
  const out = join(segmentDir, `${scene.id}.mp4`);
  if (scene.mode === "evidence-video" || scene.mode === "evidence-image") {
    const overlay = join(frameDir, `${scene.id}-overlay.png`);
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${evidenceOverlayScene(scene)}</svg>`)).png().toFile(overlay);
    const inputArgs = scene.mode === "evidence-image"
      ? ["-loop", "1", "-framerate", "30", "-i", scene.media]
      : ["-stream_loop", "-1", "-i", scene.media];
    await run("ffmpeg", [
      "-y",
      ...inputArgs,
      "-loop", "1",
      "-i", overlay,
      "-t", String(scene.duration),
      "-filter_complex",
      "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setpts=PTS-STARTPTS,eq=contrast=1.04:saturation=1.03:brightness=0.04[base];[base][1:v]overlay=0:0,fade=t=in:st=0:d=0.12,fade=t=out:st=" + Math.max(0, scene.duration - 0.18) + ":d=0.18,format=yuv420p[v]",
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
  await sharp(Buffer.from(sceneSvg(scene))).png().toFile(frame);
  await run("ffmpeg", [
    "-y",
    "-loop", "1",
    "-framerate", "30",
    "-i", frame,
    "-t", String(scene.duration),
    "-vf",
    `zoompan=z='min(zoom+0.00010,1.035)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,fade=t=in:st=0:d=0.18,fade=t=out:st=${Math.max(0, scene.duration - 0.22)}:d=0.22,format=yuv420p`,
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
  const inputArgs = paths.flatMap((path) => ["-i", path]);
  const normalizers = paths.map((_, index) => `[${index}:v]fps=30,setsar=1,format=yuv420p[v${index}]`).join(";");
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

async function muxAudio(videoOnly) {
  const ambient = join(mediaDir, "ambient-bed.mp3");
  const lowHit = join(mediaDir, "low-hit.wav");
  const pulse = join(mediaDir, "soft-pulse.wav");
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  await run("ffmpeg", [
    "-y",
    "-i", videoOnly,
    "-i", narrationPath,
    "-stream_loop", "-1", "-i", ambient,
    "-i", lowHit,
    "-i", pulse,
    "-filter_complex",
    `[1:a]volume=1.55,afade=t=in:st=0:d=0.15,apad=pad_dur=4[vo];` +
      `[2:a]atrim=0:${total},volume=0.23,afade=t=in:st=0:d=1.4,afade=t=out:st=${Math.max(0, total - 2)}:d=2[bed];` +
      "[3:a]volume=0.38,atrim=0:0.9,adelay=300|300[hit];" +
      "[4:a]volume=0.22,atrim=0:0.8,adelay=10000|10000[p1];" +
      "[4:a]volume=0.20,atrim=0:0.8,adelay=35000|35000[p2];" +
      `[vo][bed][hit][p1][p2]amix=inputs=5:duration=longest:normalize=0,atrim=0:${total},loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
    "-map", "0:v:0",
    "-map", "[a]",
    "-t", String(total),
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    finalPath
  ]);
}

async function makeContactSheet() {
  const times = [2, 6, 10, 15, 20, 25, 31, 36, 41, 47, 52, 57];
  const framePaths = [];
  await mkdir(join(outDir, "qa-frames"), { recursive: true });
  for (const time of times) {
    const framePath = join(outDir, "qa-frames", `t${time}.jpg`);
    framePaths.push(framePath);
    await run("ffmpeg", ["-y", "-v", "error", "-i", finalPath, "-ss", String(time), "-frames:v", "1", framePath]);
  }
  const inputs = framePaths.flatMap((path) => ["-i", path]);
  const scaled = framePaths.map((_, index) => `[${index}:v]scale=320:-1[f${index}]`).join(";");
  const refs = framePaths.map((_, index) => `[f${index}]`).join("");
  await run("ffmpeg", [
    "-y",
    "-v", "error",
    ...inputs,
    "-filter_complex",
    `${scaled};${refs}xstack=inputs=${framePaths.length}:layout=0_0|320_0|640_0|960_0|0_180|320_180|640_180|960_180|0_360|320_360|640_360|960_360[v]`,
    "-map", "[v]",
    "-frames:v", "1",
    contactSheetPath
  ]);
}

async function main() {
  loadEnv();
  await mkdir(outDir, { recursive: true });
  await mkdir(frameDir, { recursive: true });
  await mkdir(segmentDir, { recursive: true });
  await synthesizeNarration();
  const scenePaths = [];
  for (let i = 0; i < scenes.length; i += 1) scenePaths.push(await makeScene(scenes[i], i));
  const videoOnly = join(outDir, "video-only.mp4");
  await concatVideo(scenePaths, videoOnly);
  await muxAudio(videoOnly);
  await makeContactSheet();
  const finalDuration = await duration(finalPath);
  const voiceDuration = await duration(narrationPath);
  writeFileSync(join(outDir, "build-notes.md"), `# Reference-Style Sample Build Notes

- Output: \`${finalPath}\`
- Contact sheet: \`${contactSheetPath}\`
- Duration: ${finalDuration.toFixed(2)} seconds
- Narration duration: ${voiceDuration.toFixed(2)} seconds
- Voice provider: MiniMax
- Visual direction: dark code-native documentary graphics, AI-illustration-like plates, data cards, small source windows.

## Rights Strategy

This style reduces rights exposure because the main image is code/generated. Evidence footage should remain small, sourced, and replaceable. Generated images and diagrams should never be presented as proof.
`);
  console.log(JSON.stringify({ finalPath, contactSheetPath, finalDuration, voiceDuration }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
