import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join, normalize } from "node:path";

const root = process.cwd();
loadEnvFile(join(root, ".env"));

const publicDir = join(root, "public");
const radarDir = join(root, "radar");
const generatedVideoDir = join(root, "video", "remotion", "generated");
const port = Number(process.env.PORT || 5123);
const defaultProvider = process.env.AI_PROVIDER || "deepseek";
const defaultMiniMaxRegion = process.env.MINIMAX_REGION || "cn";
const defaultMiniMaxTtsModel = process.env.MINIMAX_TTS_MODEL || "speech-2.8-turbo";
const defaultMiniMaxTtsVoice = process.env.MINIMAX_TTS_VOICE_ID || "English_expressive_narrator";
const defaultModels = {
  deepseek: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  minimax: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
  openai: process.env.OPENAI_MODEL || "gpt-5-mini"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".m4a": "audio/mp4",
  ".ico": "image/x-icon"
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function buildPrompt(input) {
  return `
You are a senior YouTube strategist, historian, and scriptwriter for a long-form English-language channel aimed at North American audiences.

Channel positioning:
"Current events through historical memory, with a Chinese civilizational lens."

The channel uses a current event as the entry point, explains the deeper historical pattern, and adds a Chinese historical or cultural lens. It must avoid propaganda, partisan slogans, forced analogies, and "China is superior" framing.

Creator input:
- Hot event title: ${input.eventTitle || "Not provided"}
- Event description: ${input.eventDescription || "Not provided"}
- Source link: ${input.sourceLink || "Not provided"}
- Creator notes: ${input.creatorNotes || "Not provided"}
- Target length: ${input.targetLength || "12-15 minutes, strictly under 15 minutes"}
- Tone: ${input.tone || "calm, serious, historically literate, YouTube-friendly"}
- Sensitivity level: ${input.sensitivity || "medium"}

Output language requirements:
- Use Simplified Chinese for strategy, analysis, explanations, scoring, outline notes, and research checklist.
- Keep YouTube-facing English packaging in English when it is meant to be shown to North American viewers.
- Provide both an English narration script and a Chinese narration script.
- The Chinese script should be a faithful creator-facing Chinese version of the English script, not a separate Chinese-market rewrite.
- Keep the English script natural for North American audiences.
- Keep the Chinese script clear enough for the creator to review, revise, and record from if desired.
- Keep the final video under 15 minutes. Prefer one main current-event frame, one main historical mirror, and one Chinese lens. Avoid side quests.

Generate a complete working package in Markdown with these exact sections and Chinese section titles:

# 1. 事件简报
- 简洁总结
- 主要人物/机构
- 为什么现在重要
- 背后的深层张力

# 2. 选题角度
Create 5 angles. For each, write in Chinese except the working English title:
- 英文工作标题
- 核心问题
- 一句话论点
- 主要历史框架
- 中国历史/文化视角
- 对北美观众的吸引力

# 3. 选题评分
For each angle, score and explain in Chinese:
- 热点相关性：1-10
- 历史深度：1-10
- 中国视角独特性：1-10
- 北美观众理解难度：1-10
- 长视频潜力：1-10
- 风险等级：低/中/高
- 推荐意见

# 4. 推荐方向
Pick the strongest angle and explain why in Chinese.

# 5. 历史关联与类比边界
- 美国或北美历史关联
- 欧洲或全球历史关联
- 中国历史关联
- 可用概念
- 类比在哪里失效
- 应避免的误导性比较

# 6. YouTube 包装
- 5 个英文标题选项
- 3 个英文缩略图文字选项，每个 2-5 个词
- 3 个英文开场 hook
- 英文视频简介草稿
- 英文置顶评论问题
- 中文解释：为什么这些包装适合北美观众

# 7. 长视频大纲
Use this structure:
1. 冷开场
2. 热点事件铺垫
3. 更深层问题
4. 历史镜像
5. 中国视角
6. 类比的边界
7. 为什么这件事影响当下
8. 结尾思考

For each section include:
- 目的
- 关键点
- B-roll 关键词
- 屏幕文字建议

# 8. 英文脚本草稿
Write a polished English narration draft for the selected angle.
Include section headings, natural spoken language, and notes in brackets where research or citation verification is needed.
Do not invent precise statistics, quotes, or obscure facts without marking them for verification.
This script is for the final North American YouTube audience.

# 9. 中文脚本草稿
Write a complete Simplified Chinese version of the English script.
It should preserve the argument, structure, examples, nuance, and citation placeholders.
It should read naturally in Chinese for the creator's review and revision.

# 10. Shorts 切片点子
Create 5 short-form clip ideas. Include:
- 英文 Shorts 标题
- 中文说明
- 适合截取的核心观点

# 11. 资料核查清单
List in Chinese the claims, examples, statistics, dates, quotes, or sensitive assertions the creator should verify before recording.
`;
}

function buildBaseContext(input) {
  return `
You are a senior YouTube strategist, historian, and scriptwriter for a long-form English-language channel aimed at North American audiences.

Channel positioning:
"Current events through historical memory, with a Chinese civilizational lens."

The channel uses a current event as the entry point, explains the deeper historical pattern, and adds a Chinese historical or cultural lens. It must avoid propaganda, partisan slogans, forced analogies, and "China is superior" framing.

Creator input:
- Hot event title: ${input.eventTitle || "Not provided"}
- Event description: ${input.eventDescription || "Not provided"}
- Source link: ${input.sourceLink || "Not provided"}
- Creator notes: ${input.creatorNotes || "Not provided"}
- Target length: ${input.targetLength || "12-15 minutes, strictly under 15 minutes"}
- Tone: ${input.tone || "calm, serious, historically literate, YouTube-friendly"}
- Sensitivity level: ${input.sensitivity || "medium"}

Output rules:
- Use Simplified Chinese for creator-facing strategy, analysis, scoring, production notes, and research checklist.
- Use English for YouTube-facing titles, hooks, descriptions, narration, thumbnail text, and Shorts titles intended for North American viewers.
- Do not invent precise statistics, quotes, dates, or obscure facts without marking them for verification.
- Distinguish useful similarity from false equivalence.
- Keep the final video under 15 minutes. Prefer one main current-event frame, one main historical mirror, and one Chinese lens. Avoid side quests.
- Output Markdown only.
`;
}

function buildStepPrompt(input) {
  const context = buildBaseContext(input);
  const selected = input.selectedAngle || "Not selected yet";
  const workspace = input.workspace || "No previous workspace content.";

  if (input.stage === "topics") {
    return `${context}

Current task: STAGE 1 - CREATIVE ANGLE EVALUATION.

Goal:
The creator already has a current event or a weekly radar candidate. Help the creator choose the best storytelling angle for this channel.
Do NOT write a script. Do NOT create a production plan. Do NOT produce a full video outline yet.

Output exactly:

# 阶段一：创作角度评估

## 1. 事件简报
- 简洁总结
- 主要人物/机构
- 为什么现在重要
- 背后的深层张力

## 2. 可选创作角度
Create 3-5 candidate angles. For each:
- 方向编号
- 英文工作标题
- 中文内部标题
- 核心问题
- 一句话论点
- 主要历史框架
- 中国历史/文化视角
- 对北美观众的吸引力
- 可能误区

## 3. 角度评分
For each angle, score:
- 热点相关性：1-10
- 历史深度：1-10
- 中国视角自然度：1-10
- 北美观众理解门槛：1-10
- 长视频潜力：1-10
- 制作难度：低/中/高
- 政治/事实风险：低/中/高

## 4. 推荐优先级
Rank the top 3 angles and explain why.

## 5. 下一步给创作者的动作
Tell the creator to copy one selected angle into the selected-angle box before generating the Codex script brief.`;
  }

  if (input.stage === "plan") {
    return `${context}

Current task: STAGE 2 - VIDEO PLAN.

Selected direction:
${selected}

Previous workspace:
${workspace}

Goal:
Turn the selected direction into a concrete video plan. Do NOT write the full script yet.

Output exactly:

# 阶段二：视频方案

## 1. 最终选题判断
- 这个方向为什么值得做
- 观众点击理由
- 频道差异化理由
- 最大风险

## 2. 核心论点
- 主论点
- 反直觉点
- 观众看完应该改变的理解

## 3. YouTube 包装
- 8 个英文标题
- 5 个英文缩略图文字，每个 2-5 个词
- 5 个英文开场 Hook
- 英文视频简介草稿
- 英文置顶评论问题
- 中文说明：每种包装分别服务什么点击心理

## 4. 历史素材设计
- 美国/北美主历史案例
- 中国历史/文化主视角
- 可选辅助案例
- 不建议使用的弱类比
- 类比边界

## 5. 长视频大纲
Use this structure:
1. 冷开场
2. 热点事件铺垫
3. 更深层问题
4. 历史镜像
5. 中国视角
6. 类比边界
7. 当下意义
8. 结尾思考

For each section include:
- 目的
- 关键点
- 预计时长
- B-roll 关键词
- 屏幕文字建议
- 需要核查的资料

## 6. 脚本前检查
List what the creator should confirm or modify before generating the script.`;
  }

  if (input.stage === "script") {
    return `${context}

Current task: STAGE 2 - SCRIPT BRIEF FOR CODEX.

Selected creative angle:
${selected}

Previous workspace, usually the angle evaluation:
${workspace}

Goal:
Prepare a rigorous creator-facing brief that will be handed to Codex/GPT-5.5 to write the final English script. Do NOT write the full script. Do NOT output a draft narration.

Output exactly:

# 阶段二：Codex 脚本 Brief

## 1. 给 Codex 的写作任务
- 用中文说明这期视频要写成什么
- 明确目标观众、目标时长、语气、频道定位
- 明确最终交付要包含英文正式脚本和中文审稿版

## 2. 核心创作判断
- 一句话主论点
- 观众必须带走的理解
- 最强反直觉点
- 情绪曲线
- 结尾要留下的问题

## 3. 推荐英文包装
- 最推荐英文标题
- 备选英文标题 5 个
- 缩略图文字 5 个，每个 2-5 个词
- 最推荐开场 Hook 3 个

## 4. 脚本结构 Brief
Use 6-8 sections for a 12-15 minute video.
For each section:
- 英文章节名
- 中文目的
- 预计时长
- 必须表达的观点
- 可用历史案例
- 可用中国历史/文化视角
- 需要避免的写法

## 5. 事实核查清单
List every claim that must be verified before Codex writes or before recording.
Mark sensitive or uncertain claims clearly.

## 6. 中国视角使用说明
- 哪个中国历史概念最适合
- 为什么自然
- 类比边界
- 禁止的简单类比

## 7. 写作风格要求
- 英文旁白风格
- 中文审稿版风格
- 禁止使用的套话
- 如何处理政治敏感与事实不确定

## 8. 可直接复制给 Codex 的最终任务指令
Write a polished prompt in Chinese that the creator can copy to Codex/GPT-5.5. It must include all important requirements above and ask Codex to write the final English narration script plus faithful Chinese review version.`;
  }

  if (input.stage === "production") {
    return `${context}

Current task: STAGE 3 - VIDEO PRODUCTION PACKAGE.

Selected direction:
${selected}

Confirmed final script from Codex/GPT-5.5:
${input.finalScript || "Not provided"}

Previous workspace:
${workspace}

Goal:
Convert the approved final script into a practical video production package for a weekly, quality-first YouTube documentary essay. Do NOT rewrite the entire script.

Non-negotiable production principle:
- This channel must not look like an animated PowerPoint.
- Real moving footage must be treated as the base layer whenever possible.
- Archival photos are allowed, but long sections made only of static images should be flagged.
- Motion graphics, maps, and title cards are explanation layers, not the whole video.
- For a 60-90 second sample, aim for at least 40-60% real moving footage by screen time.
- For a full 8-15 minute episode, every major section should include moving footage, archival footage, or documentary-style source material, unless there is a clear reason it cannot.
- Use AI-generated images only as clearly illustrative visuals. Never present AI images of real historical or political figures as real footage.

Output exactly:

# 阶段三：视频制作包

## 1. 制作总览
- 视频核心承诺
- 目标观众
- 视觉风格
- 节奏建议
- 一周一更、质量优先的取舍原则
- 真实视频素材比例目标
- 哪些地方最容易变成 PPT

## 2. 分段剪辑表
Create a section-by-section editing table from the confirmed script.
For each section include:
- 时间段/预计时长
- 对应旁白摘要
- 画面目标
- 必须使用的视频素材，英文搜索关键词为主
- 可使用的图片/档案图
- 需要制作的图表/地图/时间线
- 屏幕文字
- 素材类型标记：真实视频/档案视频/档案图片/地图图解/新闻截图/AI 插画/标题卡
- PPT 风险：低/中/高
- 如果 PPT 风险为中或高，给出替代方案

## 3. 镜头级 Shot List
Create 18-35 shot entries for the first 3-5 minutes or for the provided script excerpt if it is shorter.
For each shot include:
- 镜头编号
- 对应旁白句/段
- 建议时长
- 画面内容
- 素材类型
- 英文素材搜索关键词
- 运动方式：真实视频原运动/慢推近/慢拉远/平移/图解动画/硬切/叠化
- 是否必须是真实视频：是/否
- 版权/事实核查提醒

## 4. 素材清单
Group by priority:
- 必须寻找的真实视频素材
- 可替代的官方/公共领域视频素材
- 历史档案视频
- 历史档案图片
- 新闻截图/网页截图
- 地图/时间线/图解
- 可谨慎使用的 AI 插画
- 版权注意事项

## 5. Remotion 初剪建议
- 推荐视频长度
- 时间线结构
- 真实视频段落
- 图片段落
- 图解段落
- 配音处理
- 背景音乐和音效
- 字幕策略
- 第一版 MP4 验收标准

## 6. Shorts 切片
Create 8 Shorts ideas. For each:
- 英文 Shorts 标题
- 中文说明
- 适合截取的核心句
- 建议时长
- 结尾引导

## 7. 发布包
- 最推荐英文标题
- 备选标题
- 英文简介
- 标签/关键词
- 章节时间戳草稿
- 置顶评论

## 8. 最终核查清单
- 事实核查
- 政治敏感表述
- 中国历史类比边界
- 画面版权
- AI 图片/视频误导风险
- 真实视频比例是否足够
- 是否仍然像 PPT
- 字幕与发音
- 发布前检查`;
  }

  return `${context}

Output a short Chinese error message saying the requested stage is unknown.`;
}

async function generatePackage(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const provider = normalizeProvider(body.provider || defaultProvider);
  const minimaxRegion = body.minimaxRegion || defaultMiniMaxRegion;
  const apiKey = getApiKey(req, provider);
  if (!apiKey) {
    sendJson(res, 400, {
      error: `缺少 ${providerLabel(provider)} API Key。请在页面左下角设置里填写。`
    });
    return;
  }

  if (!body.eventTitle && !body.eventDescription) {
    sendJson(res, 400, { error: "请至少输入热点事件标题或事件描述。" });
    return;
  }

  const model = body.model || defaultModels[provider];
  const prompt = buildPrompt(body);

  try {
    const result = await callProvider({ provider, apiKey, model, prompt, minimaxRegion, useMiniMaxPackageMode: true });

    sendJson(res, 200, { text: result.text, model, provider, minimaxRegion });
  } catch (error) {
    const status = error.status || 500;
    sendJson(res, status, {
      error: error.message || "生成失败。请检查网络连接和 API Key。",
      details: error.details
    });
  }
}

async function generateStep(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const provider = normalizeProvider(body.provider || defaultProvider);
  const minimaxRegion = body.minimaxRegion || defaultMiniMaxRegion;
  const apiKey = getApiKey(req, provider);
  if (!apiKey) {
    sendJson(res, 400, {
      error: `缺少 ${providerLabel(provider)} API Key。请在页面左下角设置里填写。`
    });
    return;
  }

  if (!body.eventTitle && !body.eventDescription) {
    sendJson(res, 400, { error: "请至少输入热点事件标题或事件描述。" });
    return;
  }

  const stage = normalizeStage(body.stage);
  if (stage !== "topics" && !body.selectedAngle) {
    sendJson(res, 400, { error: "请先填写你选中的选题方向，再继续下一步。" });
    return;
  }

  const model = body.model || defaultModels[provider];
  const prompt = buildStepPrompt({ ...body, stage });

  try {
    const result = await callProvider({ provider, apiKey, model, prompt, minimaxRegion });

    sendJson(res, 200, { text: result.text, model, provider, minimaxRegion, stage });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "生成失败。请检查网络连接和 API Key。",
      details: error.details
    });
  }
}

async function listRadarReports(req, res) {
  try {
    await mkdir(radarDir, { recursive: true });
    const entries = await readdir(radarDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    sendJson(res, 200, { files });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "读取 radar 报告失败。" });
  }
}

async function getRadarReport(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const file = basename(url.searchParams.get("file") || "");

  if (!file || !/\.md$/i.test(file)) {
    sendJson(res, 400, { error: "请选择一个 Markdown 报告。" });
    return;
  }

  const filePath = join(radarDir, file);
  if (!filePath.startsWith(radarDir) || !existsSync(filePath)) {
    sendJson(res, 404, { error: "没有找到这份 radar 报告。" });
    return;
  }

  try {
    const text = await readFile(filePath, "utf8");
    sendJson(res, 200, { file, text });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "读取 radar 报告失败。" });
  }
}

function slugify(value, fallback = "history-video") {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
  return slug || fallback;
}

function cleanScriptText(text) {
  return String(text || "")
    .replace(/^#+\s+.+$/gm, "")
    .replace(/\[[^\]]{0,120}\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function splitSentences(text) {
  const cleaned = cleanScriptText(text);
  const matches = cleaned.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [];
  return matches
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18)
    .slice(0, 24);
}

function titleFromInput(input) {
  const raw = input.eventTitle || input.selectedAngle || splitSentences(input.finalScript || "")[0] || "History Video Draft";
  return String(raw).replace(/^#+\s*/, "").replace(/\s+/g, " ").slice(0, 90);
}

function buildDraftBeats(input) {
  const sentences = splitSentences(input.finalScript || "");
  const seed = sentences.length ? sentences : [
    "Paste a confirmed final script into the tool to generate a real rough-cut timeline.",
    "Replace each placeholder with real moving footage, archival video, maps, or source-grounded documentary material.",
    "Use this Remotion project as a reviewable first cut, not as the final published video."
  ];

  return seed.slice(0, 120).map((sentence, index) => {
    const durationSeconds = Math.max(7, Math.min(12, Math.ceil(sentence.length / 58) + 5));
    const kind = index === 0
      ? "title"
      : index % 5 === 0
        ? "map"
        : index % 3 === 0
          ? "archive"
          : "footage";

    return {
      id: index + 1,
      durationSeconds,
      kind,
      narration: sentence,
      screenText: sentence.length > 96 ? `${sentence.slice(0, 93)}...` : sentence,
      assetNeed: kind === "footage"
        ? "Real moving footage required"
        : kind === "archive"
          ? "Archival footage or public-domain stills"
          : kind === "map"
            ? "Map, timeline, or explanatory graphic"
            : "Title card",
      searchKeywords: `${titleFromInput(input)} documentary footage ${index + 1}`,
      media: null,
      audio: null
    };
  });
}

const videoExts = new Set([".mp4", ".mov", ".webm"]);
const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const audioExts = new Set([".mp3", ".wav", ".aiff", ".aif", ".m4a"]);

async function collectMediaFiles(directory, limit = 80) {
  const base = normalize(String(directory || "").trim());
  if (!base || !existsSync(base)) return [];

  const rootStat = await stat(base).catch(() => null);
  if (!rootStat?.isDirectory()) return [];

  const found = [];
  async function walk(current) {
    if (found.length >= limit) return;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (found.length >= limit) return;
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      const type = videoExts.has(ext) ? "video" : imageExts.has(ext) ? "image" : audioExts.has(ext) ? "audio" : "";
      if (!type) continue;

      found.push({
        fullPath,
        originalName: entry.name,
        type,
        ext
      });
    }
  }

  await walk(base);
  return found;
}

async function copyMediaIntoProject(files, assetsDir) {
  const copied = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = `${String(index + 1).padStart(2, "0")}-${slugify(file.originalName.replace(file.ext, ""), "asset")}${file.ext}`;
    const destination = join(assetsDir, safeName);
    await copyFile(file.fullPath, destination);
    copied.push({
      ...file,
      fileName: safeName,
      publicPath: `assets/${safeName}`
    });
  }
  return copied;
}

function assignMediaToBeats(beats, mediaFiles) {
  const videos = mediaFiles.filter((file) => file.type === "video");
  const images = mediaFiles.filter((file) => file.type === "image");
  const visuals = [...videos, ...images];
  if (!visuals.length) return beats;

  return beats.map((beat, index) => {
    const preferred = beat.kind === "footage" && videos.length
      ? videos[index % videos.length]
      : beat.kind !== "title" && images.length
        ? images[index % images.length]
        : visuals[index % visuals.length];

    return {
      ...beat,
      media: preferred
        ? {
            type: preferred.type,
            src: preferred.publicPath,
            originalName: preferred.originalName
          }
        : null
    };
  });
}

function narrationTextFromBeats(beats) {
  return beats.map((beat) => beat.narration).join("\n\n");
}

function getMiniMaxTtsEndpoint(region) {
  return region === "global"
    ? "https://api.minimax.io/v1/t2a_v2"
    : "https://api.minimaxi.com/v1/t2a_v2";
}

async function synthesizeMiniMaxTts({ apiKey, region, model, voiceId, text, outputPath }) {
  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return false;

  const response = await fetch(getMiniMaxTtsEndpoint(region), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      text: cleanText.slice(0, 9800),
      stream: false,
      language_boost: "auto",
      output_format: "hex",
      voice_setting: {
        voice_id: voiceId,
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.base_resp?.status_code) {
    const message = data.base_resp?.status_msg || data.error?.message || data.message || "MiniMax TTS request failed.";
    throw Object.assign(new Error(message), { status: response.status, details: data });
  }

  const audioHex = data.data?.audio;
  if (!audioHex) throw Object.assign(new Error("MiniMax TTS did not return audio."), { details: data });
  await writeFile(outputPath, Buffer.from(audioHex, "hex"));
  return true;
}

async function addMiniMaxNarrationToBeats({ beats, assetsDir, apiKey, region, model, voiceId }) {
  if (!apiKey) return { beats, generated: 0 };

  let generated = 0;
  const nextBeats = [];
  for (const beat of beats) {
    const fileName = `narration-${String(beat.id).padStart(2, "0")}.mp3`;
    const outputPath = join(assetsDir, fileName);
    await synthesizeMiniMaxTts({
      apiKey,
      region,
      model,
      voiceId,
      text: beat.narration,
      outputPath
    });
    generated += 1;
    nextBeats.push({
      ...beat,
      audio: {
        type: "generated",
        src: `assets/${fileName}`,
        provider: "minimax",
        voiceId
      }
    });
  }

  return { beats: nextBeats, generated };
}

function remotionVideoSource() {
  return `import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import data from "./draft-data.json";

type Beat = {
  id: number;
  durationSeconds: number;
  kind: "title" | "footage" | "archive" | "map";
  narration: string;
  screenText: string;
  assetNeed: string;
  searchKeywords: string;
  media: null | {
    type: "video" | "image";
    src: string;
    originalName: string;
  };
  audio: null | {
    type: "generated" | "uploaded";
    src: string;
    provider: string;
    voiceId?: string;
  };
};

const fps = 30;
const beats = data.beats as Beat[];
const durationInFrames = beats.reduce((sum, beat) => sum + beat.durationSeconds * fps, 0);
const narrationAudio = data.narrationAudio as null | string;

const palette = {
  bg: "#0d1117",
  ink: "#f2ead8",
  muted: "#a9b0bb",
  paper: "#d8c7a2",
  red: "#b7332f",
  blue: "#4f7cac",
};

const cumulativeStart = (index: number) =>
  beats.slice(0, index).reduce((sum, beat) => sum + beat.durationSeconds * fps, 0);

const fitText = (text: string, max = 120) =>
  text.length > max ? \`\${text.slice(0, max - 3)}...\` : text;

const MediaLayer: React.FC<{beat: Beat; progress: number}> = ({beat, progress}) => {
  if (!beat.media) return null;

  const scale = interpolate(progress, [0, 1], [1.04, 1.12]);
  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: \`scale(\${scale})\`,
    filter: "contrast(1.04) saturate(0.92)",
  };

  return (
    <AbsoluteFill>
      {beat.media.type === "video" ? (
        <OffthreadVideo src={staticFile(beat.media.src)} muted style={mediaStyle} />
      ) : (
        <Img src={staticFile(beat.media.src)} style={mediaStyle} />
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(5,8,13,0.86), rgba(5,8,13,0.38) 42%, rgba(5,8,13,0.68)), linear-gradient(0deg, rgba(0,0,0,0.58), transparent 42%, rgba(0,0,0,0.24))",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 90,
          bottom: 48,
          maxWidth: 520,
          color: "rgba(242,234,216,0.72)",
          fontSize: 19,
          lineHeight: 1.3,
          textAlign: "right",
        }}
      >
        {beat.media.type.toUpperCase()} / {fitText(beat.media.originalName, 58)}
      </div>
    </AbsoluteFill>
  );
};

const EditorialBackground: React.FC<{beat: Beat; progress: number}> = ({beat, progress}) => {
  const kind = beat.kind;
  const drift = interpolate(progress, [0, 1], [-18, 18]);
  const accent = kind === "map" ? palette.blue : kind === "archive" ? palette.paper : palette.red;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 28% 26%, rgba(183,51,47,0.24), transparent 27%), radial-gradient(circle at 74% 42%, rgba(79,124,172,0.2), transparent 29%), linear-gradient(135deg, #111722, #07090d 64%, #17120d)",
      }}
    >
      <MediaLayer beat={beat} progress={progress} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          transform: \`translateX(\${drift}px)\`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 112,
          top: 92,
          width: 560,
          height: 620,
          border: \`1px solid \${accent}66\`,
          background:
            kind === "footage"
              ? "linear-gradient(135deg, rgba(79,124,172,0.2), rgba(0,0,0,0.25)), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px)"
              : kind === "archive"
                ? "linear-gradient(180deg, rgba(216,199,162,0.24), rgba(0,0,0,0.2)), repeating-linear-gradient(90deg, rgba(242,234,216,0.05) 0 2px, transparent 2px 24px)"
                : "radial-gradient(circle at 40% 45%, rgba(79,124,172,0.28), transparent 18%), radial-gradient(circle at 64% 54%, rgba(183,51,47,0.24), transparent 16%)",
          boxShadow: "0 28px 70px rgba(0,0,0,0.42)",
          transform: \`translateY(\${drift * -0.6}px) rotate(\${kind === "archive" ? -1 : 1}deg)\`,
        }}
      >
        <div
          style={{
            margin: 32,
            height: 360,
            border: "1px solid rgba(242,234,216,0.28)",
            display: "grid",
            placeItems: "center",
            color: palette.paper,
            fontSize: 28,
            fontWeight: 800,
            textAlign: "center",
            padding: 28,
          }}
        >
          {kind === "footage" ? "REAL FOOTAGE SLOT" : kind === "archive" ? "ARCHIVAL SLOT" : kind === "map" ? "MAP / GRAPHIC SLOT" : "TITLE"}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.55), transparent 30%, transparent 74%, rgba(0,0,0,0.42)), repeating-linear-gradient(0deg, rgba(255,255,255,0.025), rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const BeatScene: React.FC<{beat: Beat; localFrame: number; totalFrames: number}> = ({beat, localFrame, totalFrames}) => {
  const progress = Math.min(1, localFrame / Math.max(1, totalFrames));
  const opacityIn = interpolate(localFrame, [0, 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const opacityOut = interpolate(localFrame, [totalFrames - 18, totalFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const opacity = Math.min(opacityIn, opacityOut);
  const y = interpolate(localFrame, [0, 24], [36, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill style={{backgroundColor: palette.bg, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif", opacity}}>
      {beat.audio ? <Audio src={staticFile(beat.audio.src)} /> : null}
      <EditorialBackground beat={beat} progress={progress} />
      <div style={{position: "absolute", left: 96, top: 88, width: 980, transform: \`translateY(\${y}px)\`}}>
        <div style={{color: palette.red, font: "800 22px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: 2}}>
          {String(beat.id).padStart(2, "0")} / {beat.kind.toUpperCase()}
        </div>
        <div style={{marginTop: 30, fontFamily: "Georgia, Times New Roman, serif", fontSize: 74, lineHeight: 0.98, fontWeight: 700, maxWidth: 930}}>
          {fitText(beat.screenText, 96)}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 82,
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <div style={{borderLeft: \`5px solid \${palette.red}\`, background: "rgba(9,12,18,0.8)", padding: "20px 24px", fontSize: 30, lineHeight: 1.28}}>
          {fitText(beat.narration, 180)}
        </div>
        <div style={{border: "1px solid rgba(242,234,216,0.22)", background: "rgba(255,255,255,0.05)", padding: 18, color: palette.muted, fontSize: 20, lineHeight: 1.35}}>
          <b style={{color: palette.paper}}>Asset need</b>
          <br />
          {beat.assetNeed}
          <br />
          <br />
          <b style={{color: palette.paper}}>Search</b>
          <br />
          {fitText(beat.searchKeywords, 88)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RoughCut: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      {narrationAudio ? <Audio src={staticFile(narrationAudio)} /> : null}
      {beats.map((beat, index) => {
        const from = cumulativeStart(index);
        const duration = beat.durationSeconds * fps;
        return (
          <Sequence key={beat.id} from={from} durationInFrames={duration}>
            <BeatScene beat={beat} localFrame={frame - from} totalFrames={duration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="HistoryRoughCut"
    component={RoughCut}
    durationInFrames={durationInFrames}
    fps={fps}
    width={1920}
    height={1080}
  />
);
`;
}

async function createVideoDraft(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  if (!body.finalScript) {
    sendJson(res, 400, { error: "请先粘贴已确认的正式文案。" });
    return;
  }

  const title = titleFromInput(body);
  const createdAt = new Date();
  const timestamp = createdAt.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const slug = `${slugify(title)}-${timestamp}`;
  const projectDir = join(generatedVideoDir, slug);
  const srcDir = join(projectDir, "src");
  const assetsDir = join(projectDir, "public", "assets");
  const outputPath = join(root, "outputs", `${slug}.mp4`);

  await mkdir(srcDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await mkdir(join(root, "outputs"), { recursive: true });

  const rawMedia = await collectMediaFiles(body.assetDirectory);
  const copiedMedia = await copyMediaIntoProject(rawMedia, assetsDir);
  const copiedAudio = copiedMedia.find((file) => file.type === "audio");
  let beats = assignMediaToBeats(buildDraftBeats(body), copiedMedia);
  const durationSeconds = beats.reduce((sum, beat) => sum + beat.durationSeconds, 0);

  const narrationText = narrationTextFromBeats(beats);
  const narrationTextPath = join(assetsDir, "narration.txt");
  let narrationAudio = copiedAudio?.publicPath || null;
  const ttsSummary = {
    provider: copiedAudio ? "uploaded" : "none",
    model: "",
    voiceId: "",
    generatedClips: 0,
    fallback: ""
  };

  await writeFile(narrationTextPath, narrationText, "utf8");
  if (copiedAudio) {
    ttsSummary.voiceId = copiedAudio.originalName;
  } else {
    const minimaxTtsApiKey = normalizeApiKey(process.env.MINIMAX_TTS_API_KEY || process.env.MINIMAX_API_KEY);
    const minimaxTtsModel = process.env.MINIMAX_TTS_MODEL || defaultMiniMaxTtsModel;
    const minimaxTtsVoice = String(body.narrationVoice || process.env.MINIMAX_TTS_VOICE_ID || defaultMiniMaxTtsVoice).trim();
    if (minimaxTtsApiKey) {
      try {
        const result = await addMiniMaxNarrationToBeats({
          beats,
          assetsDir,
          apiKey: minimaxTtsApiKey,
          region: body.minimaxRegion || defaultMiniMaxRegion,
          model: minimaxTtsModel,
          voiceId: minimaxTtsVoice
        });
        beats = result.beats;
        ttsSummary.provider = "minimax";
        ttsSummary.model = minimaxTtsModel;
        ttsSummary.voiceId = minimaxTtsVoice;
        ttsSummary.generatedClips = result.generated;
      } catch (error) {
        ttsSummary.fallback = error.message || "MiniMax TTS failed.";
      }
    }
  }

  if (!narrationAudio && ttsSummary.provider !== "minimax") {
    const generatedAudioPath = join(assetsDir, "generated-narration.aiff");
    const voice = String(body.narrationVoice || "Samantha").replace(/[^A-Za-z0-9 _-]/g, "").trim() || "Samantha";
    try {
      await runCommand("say", ["-v", voice, "-f", narrationTextPath, "-o", generatedAudioPath], { cwd: projectDir });
      narrationAudio = "assets/generated-narration.aiff";
      ttsSummary.provider = "macos-say";
      ttsSummary.voiceId = voice;
    } catch {
      narrationAudio = null;
      ttsSummary.provider = "none";
    }
  }

  const mediaSummary = {
    sourceDirectory: body.assetDirectory || "",
    copied: copiedMedia.map((file) => ({
      type: file.type,
      originalName: file.originalName,
      publicPath: file.publicPath
    })),
    narrationAudio,
    tts: ttsSummary
  };

  const data = {
    title,
    createdAt: createdAt.toISOString(),
    projectRoot: projectDir,
    notes: "Replace placeholder slots with real footage, archival video, maps, and licensed stills before final publishing.",
    narrationAudio,
    mediaSummary,
    ttsSummary,
    beats
  };

  const packageJson = {
    name: slug,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      preview: "remotion studio src/index.ts",
      render: `remotion render src/index.ts HistoryRoughCut ${JSON.stringify(outputPath)} --codec=h264 --audio-codec=aac --pixel-format=yuv420p`
    },
    dependencies: {
      "@remotion/cli": "^4.0.390",
      remotion: "^4.0.390",
      react: "^18.3.1",
      "react-dom": "^18.3.1"
    },
    devDependencies: {
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
      typescript: "^5.6.3"
    }
  };

  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      jsx: "react-jsx",
      strict: true,
      moduleResolution: "Bundler",
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true
    },
    include: ["src"]
  };

  const readme = `# ${title}

This is an auto-generated Remotion rough-cut project from the YouTube History Script Tool.

## What This Draft Is

- A reviewable first-cut skeleton.
- It turns the confirmed script into timed beats.
- It highlights asset needs and PPT risk before serious editing.
- It does not download footage or clear rights.

## Commands

\`\`\`bash
cd ${projectDir}
npm install
npm run preview
npm run render
\`\`\`

Rendered MP4 target:

\`${outputPath}\`

## Asset Rule

Replace placeholder visual slots with real moving footage whenever possible. Use archival photos, maps, and AI illustration only as supporting layers, not as the entire video.
`;

  await writeFile(join(projectDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  await writeFile(join(projectDir, "tsconfig.json"), `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
  await writeFile(join(srcDir, "draft-data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await writeFile(join(assetsDir, "media-summary.json"), `${JSON.stringify(mediaSummary, null, 2)}\n`, "utf8");
  await writeFile(join(srcDir, "video.tsx"), remotionVideoSource(), "utf8");
  await writeFile(join(srcDir, "root.tsx"), `export {RemotionRoot} from "./video";\n`, "utf8");
  await writeFile(join(srcDir, "index.ts"), `import {registerRoot} from "remotion";\nimport {RemotionRoot} from "./root";\n\nregisterRoot(RemotionRoot);\n`, "utf8");
  await writeFile(join(projectDir, "README.md"), readme, "utf8");

  const markdown = `# 阶段四：Remotion 初剪项目

## 1. 已生成项目

- 项目名称：${slug}
- 项目目录：\`${projectDir}\`
- 数据文件：\`${join(srcDir, "draft-data.json")}\`
- 预计时长：${Math.round(durationSeconds)} 秒
- 分镜数量：${beats.length}
- 已接入素材：${copiedMedia.filter((file) => file.type !== "audio").length} 个视频/图片
- 配音方式：${ttsSummary.provider === "minimax" ? `MiniMax ${ttsSummary.model} / ${ttsSummary.voiceId}，${ttsSummary.generatedClips} 段` : narrationAudio ? `整条音频：${ttsSummary.provider}` : "未生成配音"}
- 素材目录：${body.assetDirectory ? `\`${body.assetDirectory}\`` : "未填写，已使用占位视觉"}
- 输出目标：\`${outputPath}\`

## 2. 下一步命令

\`\`\`bash
cd ${projectDir}
npm install
npm run preview
npm run render
\`\`\`

## 3. 使用方式

这个初剪项目会优先播放你提供的本地视频/图片，并把旁白音频挂到时间线里；缺素材的镜头会继续显示素材需求提示。下一步需要把 \`public/assets\` 中不合适的素材替换为真实视频、档案视频、地图、图解或已授权图片。

## 4. 质量提醒

- 这不是最终片。
- 它是给你检查节奏、分段、画面需求和 PPT 风险的第一版。
- 发布前必须补真实素材、配音、版权核查和事实核查。
`;

  sendJson(res, 200, {
    text: markdown,
    projectDir,
    outputPath,
    slug,
    beats: beats.length,
    durationSeconds,
    mediaCount: copiedMedia.filter((file) => file.type !== "audio").length,
    narrationAudio,
    narrationClips: ttsSummary.generatedClips,
    ttsProvider: ttsSummary.provider
  });
}

function isInside(parent, child) {
  const normalizedParent = normalize(parent);
  const normalizedChild = normalize(child);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      env: process.env
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const output = `${stdout}\n${stderr}`.trim();
      if (code === 0) {
        resolve({ output });
      } else {
        reject(Object.assign(new Error(output || `${command} exited with code ${code}`), { code, output }));
      }
    });
  });
}

async function renderVideoDraft(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const projectDir = normalize(body.projectDir || "");
  if (!projectDir || !isInside(generatedVideoDir, projectDir) || !existsSync(join(projectDir, "package.json"))) {
    sendJson(res, 400, { error: "请先生成一个有效的 Remotion 初剪项目。" });
    return;
  }

  try {
    if (!existsSync(join(projectDir, "node_modules"))) {
      await runCommand("npm", ["install"], { cwd: projectDir });
    }

    const renderResult = await runCommand("npm", ["run", "render"], { cwd: projectDir });
    const dataPath = join(projectDir, "src", "draft-data.json");
    const data = JSON.parse(readFileSync(dataPath, "utf8"));
    const slug = basename(projectDir);
    const outputPath = join(root, "outputs", `${slug}.mp4`);
    const exists = existsSync(outputPath);

    const markdown = `# 阶段五：MP4 渲染结果

## 1. 渲染状态

- 状态：${exists ? "成功" : "未确认"}
- 项目目录：\`${projectDir}\`
- 输出视频：\`${outputPath}\`
- 分镜数量：${data.beats?.length || 0}

## 2. 说明

这个 MP4 是完整脚本生成的初剪骨架，包含已拆分分镜、字幕、素材需求提示、已接入的本地视频/图片以及旁白音频。它仍然不是最终发布片；下一步要替换不合适的素材、精修配音、做版权核查和最终剪辑。

## 3. 渲染日志摘要

\`\`\`text
${renderResult.output.slice(-3000)}
\`\`\`
`;

    sendJson(res, 200, {
      text: markdown,
      projectDir,
      outputPath,
      ok: exists
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "渲染 MP4 失败。",
      details: error.output
    });
  }
}

async function testKey(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const provider = normalizeProvider(body.provider || defaultProvider);
  const minimaxRegion = body.minimaxRegion || defaultMiniMaxRegion;
  const apiKey = getApiKey(req, provider);
  const model = body.model || defaultModels[provider];

  if (!apiKey) {
    sendJson(res, 400, { error: "请先填写 API Key。" });
    return;
  }

  try {
    if (provider === "minimax") {
      await callMiniMaxPart({
        apiKey,
        model,
        endpoint: getMiniMaxEndpoint(minimaxRegion),
        prompt: "Reply with exactly: OK"
      });
    } else if (provider === "deepseek") {
      await callDeepSeek({ apiKey, model, prompt: "Reply with exactly: OK" });
    } else {
      await callOpenAI({ apiKey, model, prompt: "Reply with exactly: OK" });
    }

    sendJson(res, 200, { ok: true, provider, minimaxRegion, model });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "API Key 测试失败。",
      details: error.details
    });
  }
}

function normalizeProvider(provider) {
  if (provider === "openai") return "openai";
  if (provider === "deepseek") return "deepseek";
  return "minimax";
}

function providerLabel(provider) {
  if (provider === "deepseek") return "DeepSeek";
  if (provider === "minimax") return "MiniMax";
  return "OpenAI";
}

function normalizeStage(stage) {
  const allowed = new Set(["topics", "script"]);
  return allowed.has(stage) ? stage : "topics";
}

function getApiKey(req, provider) {
  const headerKey = req.headers["x-api-key"] || req.headers["x-openai-key"];
  const envKey = provider === "minimax"
    ? process.env.MINIMAX_API_KEY
    : provider === "deepseek"
      ? process.env.DEEPSEEK_API_KEY
      : process.env.OPENAI_API_KEY;
  const key = headerKey || envKey;
  return normalizeApiKey(key);
}

function normalizeApiKey(key) {
  if (!key) return "";
  return String(key).trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
}

async function callProvider({ provider, apiKey, model, prompt, minimaxRegion, useMiniMaxPackageMode = false }) {
  if (provider === "minimax") {
    return useMiniMaxPackageMode
      ? callMiniMax({ apiKey, model, prompt, region: minimaxRegion })
      : callMiniMaxSingle({ apiKey, model, prompt, region: minimaxRegion });
  }

  if (provider === "deepseek") {
    return callDeepSeek({ apiKey, model, prompt });
  }

  return callOpenAI({ apiKey, model, prompt });
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You produce rigorous, YouTube-native strategy and script drafts. Follow the requested bilingual output structure exactly. Output only Markdown."
              }
            ]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }]
          }
        ],
        max_output_tokens: 18000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw Object.assign(new Error(data.error?.message || "OpenAI API 请求失败。"), {
        status: response.status,
        details: data
      });
    }

    return { text: data.output_text || extractOutputText(data) };
}

async function callDeepSeek({ apiKey, model, prompt }) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You produce rigorous, YouTube-native strategy and script briefs. Follow the requested bilingual output structure exactly. Output only Markdown."
        },
        { role: "user", content: prompt }
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 12000
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(data.error?.message || data.message || "DeepSeek API 请求失败。"), {
      status: response.status,
      details: data
    });
  }

  return { text: data.choices?.[0]?.message?.content || "" };
}

async function callMiniMax({ apiKey, model, prompt, region }) {
  const endpoint = getMiniMaxEndpoint(region);
  const strategy = await callMiniMaxPart({
    apiKey,
    model,
    endpoint,
    prompt: `${prompt}

For this MiniMax call, output ONLY sections #1 to #7.
Be concise but specific. Do not output the English script, Chinese script, Shorts ideas, or research checklist yet.`
  });

  const englishScript = await callMiniMaxPart({
    apiKey,
    model,
    endpoint,
    prompt: `${prompt}

Here is the strategy package already generated:

${strategy}

Now output ONLY:

# 8. 英文脚本草稿

Write the strongest possible English narration draft within the output limit. Prioritize a complete argument over excessive length. Include section headings and citation placeholders where needed.`
  });

  const chineseScript = await callMiniMaxPart({
    apiKey,
    model,
    endpoint,
    prompt: `Translate and adapt the following English YouTube narration script into Simplified Chinese for the creator's review.

Requirements:
- Output ONLY "# 9. 中文脚本草稿".
- Preserve the argument, structure, nuance, examples, and citation placeholders.
- Do not rewrite it for a Chinese-market audience.
- Make it natural and readable in Chinese.

English script:

${englishScript}`
  });

  const followups = await callMiniMaxPart({
    apiKey,
    model,
    endpoint,
    prompt: `${prompt}

Here is the strategy package:

${strategy}

Here is the English script:

${englishScript}

Now output ONLY:

# 10. Shorts 切片点子
# 11. 资料核查清单`
  });

  return {
    text: [strategy, englishScript, chineseScript, followups].filter(Boolean).join("\n\n")
  };
}

async function callMiniMaxSingle({ apiKey, model, prompt, region }) {
  const endpoint = getMiniMaxEndpoint(region);
  const text = await callMiniMaxPart({ apiKey, model, endpoint, prompt });
  return { text };
}

function getMiniMaxEndpoint(region) {
  return region === "global"
    ? "https://api.minimax.io/v1/chat/completions"
    : "https://api.minimaxi.com/v1/chat/completions";
}

async function callMiniMaxPart({ apiKey, model, endpoint, prompt }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You produce rigorous, YouTube-native strategy and script drafts. Follow the requested bilingual output structure exactly. Output only Markdown."
        },
        { role: "user", content: prompt }
      ],
      stream: false,
      temperature: 0.7,
      max_completion_tokens: 4096
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(data.error?.message || data.message || "MiniMax API 请求失败。"), {
      status: response.status,
      details: data
    });
  }

  const text = data.choices?.[0]?.message?.content || "";
  return cleanMiniMaxOutput(text);
}

function cleanMiniMaxOutput(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractOutputText(data) {
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n\n");
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = extname(filePath);
  const content = await readFile(filePath);
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  res.end(content);
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      provider: defaultProvider,
      minimaxRegion: defaultMiniMaxRegion,
      model: defaultModels[defaultProvider]
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    await generatePackage(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/step") {
    await generateStep(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/test-key") {
    await testKey(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/radar") {
    await listRadarReports(req, res);
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/radar/report")) {
    await getRadarReport(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(port, () => {
  console.log(`YouTube History Script Tool running at http://localhost:${port}`);
});
