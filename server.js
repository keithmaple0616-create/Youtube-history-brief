import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
loadEnvFile(join(root, ".env"));

const publicDir = join(root, "public");
const port = Number(process.env.PORT || 5123);
const defaultProvider = process.env.AI_PROVIDER || "minimax";
const defaultMiniMaxRegion = process.env.MINIMAX_REGION || "cn";
const defaultModels = {
  minimax: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
  openai: process.env.OPENAI_MODEL || "gpt-5-mini"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
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

Current task: STAGE 1 - TOPIC RADAR.

Goal:
Help the creator decide which topic direction is worth making. Do NOT write a script. Do NOT create a detailed video plan yet.

Output exactly:

# 阶段一：选题雷达

## 1. 事件简报
- 简洁总结
- 主要人物/机构
- 为什么现在重要
- 背后的深层张力

## 2. 选题方向
Create 6 candidate directions. For each:
- 方向编号
- 英文工作标题
- 中文内部标题
- 核心问题
- 一句话论点
- 主要历史框架
- 中国历史/文化视角
- 对北美观众的吸引力
- 可能误区

## 3. 选题评分
For each direction, score:
- 热点相关性：1-10
- 历史深度：1-10
- 中国视角自然度：1-10
- 北美观众理解门槛：1-10
- 长视频潜力：1-10
- 制作难度：低/中/高
- 政治/事实风险：低/中/高

## 4. 推荐优先级
Rank the top 3 directions and explain why.

## 5. 下一步给创作者的动作
Tell the creator to copy one selected direction into the selected-angle box before continuing.`;
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

Current task: STAGE 3 - SCRIPT.

Selected direction:
${selected}

Approved plan / previous workspace:
${workspace}

Goal:
Write the script only after the direction and plan are established.

Output exactly:

# 阶段三：脚本

## 1. 英文脚本草稿
Write a polished English narration script for North American YouTube viewers.
Requirements:
- Use natural spoken language.
- Include section headings.
- Include light visual notes in brackets only when helpful.
- Mark uncertain statistics, direct quotes, dates, and claims with [VERIFY].
- Keep the argument coherent even if concise.
- Include a real ending, not just setup.

## 2. 中文审稿版
Write a faithful Simplified Chinese version of the English script for creator review.
Requirements:
- Preserve structure, nuance, examples, and verification placeholders.
- Make it readable in Chinese.
- Do not rewrite it for a Chinese-market audience.

## 3. 录制前修改建议
List 8-12 concrete edits the creator should consider before recording.`;
  }

  if (input.stage === "production") {
    return `${context}

Current task: STAGE 4 - PRODUCTION PACKAGE.

Selected direction:
${selected}

Script / previous workspace:
${workspace}

Goal:
Convert the established topic, plan, and script into a practical video production package. Do NOT rewrite the entire script.

Output exactly:

# 阶段四：制作包

## 1. 制作总览
- 视频核心承诺
- 目标观众
- 视觉风格
- 节奏建议
- 15 分钟以内的取舍原则

## 2. 分段剪辑表
For each major section:
- 时间段
- 旁白目标
- 画面类型
- B-roll 搜索关键词，英文为主
- 屏幕文字
- 需要制作的图表/地图/时间线

## 3. 素材清单
- 新闻画面
- 历史档案画面
- 中国历史视觉素材
- 数据图表
- 地图/时间线
- 版权注意事项

## 4. Ken Burns 图片分镜表
Create a practical image storyboard for a "still images + Ken Burns" editing style.

Requirements:
- 生成 12-24 个画面条目，按视频顺序排列，适配 15 分钟以内视频。
- 每个画面对应一个清晰的文案段落或语义转折，不要逐句切图。
- 优先使用可由 ChatGPT/AI 图片生成的画面；涉及真实新闻人物、真实机构争议、具体历史档案时，标注“建议使用真实素材/需版权核查”。
- 图片提示词必须用英文，适合 16:9 YouTube 画面。
- 图片里不要出现文字、水印、logo、字幕。
- 风格要统一：cinematic editorial documentary style, realistic, historically grounded, muted colors, 16:9, no text.

For each image include:
- 画面编号
- 对应文案/段落
- 画面目的
- 英文图片生成提示词
- Ken Burns 动作：慢推近/慢拉远/左到右平移/右到左平移/轻微上移/静止
- 建议时长，通常 6-12 秒
- 文件名，例如 001_institutional_trust_decline.png
- 适合 AI 生成：是/否/谨慎
- 备注：事实、版权或历史准确性提醒

## 5. Shorts 切片
Create 8 Shorts ideas. For each:
- 英文 Shorts 标题
- 中文说明
- 适合截取的核心句
- 建议时长
- 结尾引导

## 6. 发布包
- 最推荐英文标题
- 备选标题
- 英文简介
- 标签/关键词
- 章节时间戳草稿
- 置顶评论

## 7. 最终核查清单
- 事实核查
- 政治敏感表述
- 中国历史类比边界
- 画面版权
- AI 图片历史准确性
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
      error: `缺少 ${provider === "minimax" ? "MiniMax" : "OpenAI"} API Key。请在页面左下角设置里填写。`
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
    const result = provider === "minimax"
      ? await callMiniMax({ apiKey, model, prompt, region: minimaxRegion })
      : await callOpenAI({ apiKey, model, prompt });

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
      error: `缺少 ${provider === "minimax" ? "MiniMax" : "OpenAI"} API Key。请在页面左下角设置里填写。`
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
    const result = provider === "minimax"
      ? await callMiniMaxSingle({ apiKey, model, prompt, region: minimaxRegion })
      : await callOpenAI({ apiKey, model, prompt });

    sendJson(res, 200, { text: result.text, model, provider, minimaxRegion, stage });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "生成失败。请检查网络连接和 API Key。",
      details: error.details
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
  return provider === "openai" ? "openai" : "minimax";
}

function normalizeStage(stage) {
  const allowed = new Set(["topics", "plan", "script", "production"]);
  return allowed.has(stage) ? stage : "topics";
}

function getApiKey(req, provider) {
  const headerKey = req.headers["x-api-key"] || req.headers["x-openai-key"];
  const key = headerKey || (provider === "minimax" ? process.env.MINIMAX_API_KEY : process.env.OPENAI_API_KEY);
  return normalizeApiKey(key);
}

function normalizeApiKey(key) {
  if (!key) return "";
  return String(key).trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
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

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(port, () => {
  console.log(`YouTube History Script Tool running at http://localhost:${port}`);
});
