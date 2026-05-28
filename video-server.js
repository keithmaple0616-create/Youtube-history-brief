#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(rootDir, "public-video");
const projectsRoot = join(rootDir, "outputs", "video-projects");
const port = Number(process.env.PORT || process.env.VIDEO_PORT || 5124);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime"
};

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, status, payload) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(payload);
}

function slugify(value) {
  const slug = String(value || "untitled-video")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "untitled-video";
}

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function safeProjectDir(projectId) {
  const dir = resolve(projectsRoot, projectId);
  if (!inside(projectsRoot, dir)) throw new Error("Invalid project id.");
  return dir;
}

function safeWorkspacePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = resolve(rootDir, `.${decoded}`);
  if (!inside(rootDir, resolved)) throw new Error("Invalid path.");
  return resolved;
}

function safePublicPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = resolve(publicDir, `.${decoded}`);
  if (!inside(publicDir, resolved)) throw new Error("Invalid path.");
  return resolved;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function runNode(args, cwd = rootDir) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      const result = { code, stdout, stderr };
      if (code === 0) resolveRun(result);
      else {
        const error = new Error(stderr || stdout || `Command failed with exit code ${code}`);
        error.result = result;
        rejectRun(error);
      }
    });
  });
}

async function serveFile(res, absolutePath) {
  if (!(await exists(absolutePath))) return text(res, 404, "Not found");
  const ext = extname(absolutePath).toLowerCase();
  res.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
  createReadStream(absolutePath).pipe(res);
}

function relativeUrl(path) {
  return `/${relative(rootDir, path).replaceAll("\\", "/")}`;
}

async function listProjects() {
  await mkdir(projectsRoot, { recursive: true });
  const entries = await readdir(projectsRoot, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(projectsRoot, entry.name);
    const metaPath = join(dir, "project.json");
    let meta = { id: entry.name, title: entry.name, lane: "history" };
    if (await exists(metaPath)) {
      meta = { ...meta, ...JSON.parse(await readFile(metaPath, "utf8")) };
    }
    projects.push({
      ...meta,
      path: dir,
      hasPlan: await exists(join(dir, "visual-plan.json")),
      hasAudit: await exists(join(dir, "audit-report.md")),
      hasReview: await exists(join(dir, "review", "index.html")),
      hasVideo: await exists(join(dir, "renders", "sample.mp4"))
    });
  }
  return projects.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

async function listMaterialPacks() {
  const dataProjects = join(rootDir, "data", "projects");
  if (!(await exists(dataProjects))) return [];
  const entries = await readdir(dataProjects, { withFileTypes: true });
  const packs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packDir = join(dataProjects, entry.name, "material-production-pack");
    if (!(await exists(packDir))) continue;
    packs.push({
      id: entry.name,
      title: entry.name.replaceAll("-", " "),
      path: packDir,
      files: {
        readme: relativeUrl(join(packDir, "README.md")),
        externalSourcing: relativeUrl(join(packDir, "external-sourcing-prompts.md")),
        image2Prompts: relativeUrl(join(packDir, "image2-prompts.md")),
        visualMixPlan: relativeUrl(join(packDir, "visual-mix-plan.md")),
        intakeTemplate: relativeUrl(join(packDir, "asset-intake-template.json"))
      }
    });
  }
  return packs;
}

async function createExternalSourcing(projectDir) {
  const manifestPath = join(projectDir, "asset-manifest.json");
  if (!(await exists(manifestPath))) return "";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sourceTasks = (manifest.tasks || []).filter((task) =>
    ["source-evidence", "verified-chart"].includes(task.taskType)
  );
  const lines = [
    "# External Sourcing Prompts",
    "",
    "Use this list to find real footage, archive material, documents, maps, and verified charts. Do not use AI images as evidence.",
    "",
    "Recommended sources: White House, C-SPAN, U.S. State Department, Congress.gov, National Archives, Library of Congress, Wikimedia Commons, official PDFs, SEC, Federal Reserve, World Bank, IMF, and licensed stock footage platforms.",
    "",
    "## Tasks",
    ""
  ];
  if (!sourceTasks.length) {
    lines.push("- No source-evidence or verified-chart tasks were generated. Re-check the visual plan if the script contains factual claims.");
  }
  for (const task of sourceTasks) {
    lines.push(`### ${task.beatId}`);
    lines.push("");
    lines.push(`- Priority: ${task.priority}`);
    lines.push(`- Needed asset: ${task.neededAsset}`);
    lines.push(`- Suggested save path: \`${task.suggestedPath}\``);
    lines.push(`- Rights risk: ${task.rightsRisk}`);
    lines.push(`- Clearance note: ${task.clearanceNote}`);
    lines.push("- Search prompts:");
    for (const query of task.searchQueries || []) lines.push(`  - ${query}`);
    lines.push("");
  }
  const outPath = join(projectDir, "external-sourcing-prompts.md");
  await writeFile(outPath, `${lines.join("\n")}\n`, "utf8");
  return outPath;
}

async function createImage2Prompts(projectDir) {
  const src = join(projectDir, "image-prompts.md");
  if (!(await exists(src))) return "";
  const content = await readFile(src, "utf8");
  const safety = [
    "",
    "## Global Safety Rules",
    "",
    "- This is a clearly labeled conceptual illustration, not documentary evidence.",
    "- Do not depict real modern political figures.",
    "- Do not create fake news footage, fake documents, fake archival photos, or source-like screenshots.",
    "- Save only as illustration or atmosphere unless a human explicitly approves another use.",
    ""
  ].join("\n");
  const outPath = join(projectDir, "image2-prompts.md");
  await writeFile(outPath, content.replace("# Image2 Manual Generation Prompts", "# Image2 Generation Prompts") + safety, "utf8");
  return outPath;
}

async function createProject(payload) {
  const title = String(payload.title || "Untitled Video").trim();
  const lane = String(payload.lane || "history").trim();
  const createdAt = new Date().toISOString();
  const timePart = createdAt.slice(11, 19).replaceAll(":", "");
  const id = `${createdAt.slice(0, 10)}-${timePart}-${slugify(title)}`;
  const projectDir = safeProjectDir(id);
  await mkdir(projectDir, { recursive: true });

  let scriptText = String(payload.scriptText || "");
  if (!scriptText.trim() && payload.scriptPath) {
    const scriptPath = resolve(rootDir, String(payload.scriptPath));
    if (!inside(rootDir, scriptPath)) throw new Error("scriptPath must be inside the workspace.");
    scriptText = await readFile(scriptPath, "utf8");
  }
  if (!scriptText.trim()) throw new Error("Please paste a final script or provide a scriptPath.");

  const meta = { id, title, lane, createdAt, targetVersion: payload.targetVersion || "review-sample" };
  await writeFile(join(projectDir, "script.md"), scriptText, "utf8");
  await writeFile(join(projectDir, "project.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return { ...meta, path: projectDir };
}

async function readProject(projectId) {
  const projectDir = safeProjectDir(projectId);
  const metaPath = join(projectDir, "project.json");
  if (!(await exists(metaPath))) throw new Error("Project not found.");
  return { ...JSON.parse(await readFile(metaPath, "utf8")), path: projectDir };
}

async function readOutputFiles(projectDir) {
  const names = [
    "storyboard.md",
    "external-sourcing-prompts.md",
    "image2-prompts.md",
    "asset-checklist.md",
    "asset-return-checklist.md",
    "audit-report.md"
  ];
  const files = {};
  for (const name of names) {
    const path = join(projectDir, name);
    if (await exists(path)) files[name] = await readFile(path, "utf8");
  }
  const planPath = join(projectDir, "visual-plan.json");
  const auditJsonPath = join(projectDir, "audit-report.json");
  const reviewManifestPath = join(projectDir, "review", "review-manifest.json");
  const videoPath = join(projectDir, "renders", "sample.mp4");
  return {
    files,
    plan: (await exists(planPath)) ? JSON.parse(await readFile(planPath, "utf8")) : null,
    audit: (await exists(auditJsonPath)) ? JSON.parse(await readFile(auditJsonPath, "utf8")) : null,
    reviewManifest: (await exists(reviewManifestPath)) ? JSON.parse(await readFile(reviewManifestPath, "utf8")) : null,
    videoUrl: (await exists(videoPath)) ? relativeUrl(videoPath) : ""
  };
}

async function planProject(projectId) {
  const project = await readProject(projectId);
  await runNode(["video-tool/plan-video.js", "--script", join(project.path, "script.md"), "--out", project.path, "--lane", project.lane]);
  await createExternalSourcing(project.path);
  await createImage2Prompts(project.path);
  return { project, ...(await readOutputFiles(project.path)) };
}

async function auditProject(projectId) {
  const project = await readProject(projectId);
  await runNode(["video-tool/audit-plan.js", "--plan", join(project.path, "visual-plan.json"), "--out", project.path]);
  return { project, ...(await readOutputFiles(project.path)) };
}

async function reviewProject(projectId, maxBeats = 12) {
  const project = await readProject(projectId);
  const reviewDir = join(project.path, "review");
  await runNode([
    "video-tool/generate-hyperframes-review.js",
    "--plan",
    join(project.path, "visual-plan.json"),
    "--intake",
    join(project.path, "asset-intake.json"),
    "--out",
    reviewDir,
    "--max-beats",
    String(maxBeats || 12),
    "--title",
    project.title
  ]);
  return {
    project,
    reviewUrl: relativeUrl(join(reviewDir, "index.html")),
    ...(await readOutputFiles(project.path))
  };
}

async function renderProject(projectId, maxBeats = 12) {
  const project = await readProject(projectId);
  const reviewIndex = join(project.path, "review", "index.html");
  if (!(await exists(reviewIndex))) {
    await reviewProject(projectId, maxBeats);
  }
  const renderDir = join(project.path, "renders");
  const outputPath = join(renderDir, "sample.mp4");
  await mkdir(renderDir, { recursive: true });
  const result = await runNode([
    "video-tool/render-sample.js",
    "--plan",
    join(project.path, "visual-plan.json"),
    "--out",
    outputPath,
    "--max-beats",
    String(maxBeats || 12)
  ]);
  return {
    project,
    videoUrl: relativeUrl(outputPath),
    renderLog: [result.stdout, result.stderr].filter(Boolean).join("\n"),
    ...(await readOutputFiles(project.path))
  };
}

async function checkAssets(projectId) {
  const project = await readProject(projectId);
  try {
    const result = await runNode(["video-tool/check-assets.js", "--intake", join(project.path, "asset-intake.json")]);
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { ok: false, stdout: error.result?.stdout || "", stderr: error.result?.stderr || error.message };
  }
}

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "video-production-desk", port });
    }
    if (req.method === "GET" && url.pathname === "/api/projects") {
      return json(res, 200, { projects: await listProjects(), materialPacks: await listMaterialPacks() });
    }
    if (req.method === "POST" && url.pathname === "/api/projects") {
      return json(res, 201, { project: await createProject(await readBody(req)) });
    }

    const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) return json(res, 404, { error: "API route not found." });
    const projectId = decodeURIComponent(match[1]);
    const action = match[2] || "";
    if (req.method === "GET" && !action) {
      const project = await readProject(projectId);
      return json(res, 200, { project, ...(await readOutputFiles(project.path)) });
    }
    if (req.method === "POST" && action === "plan") return json(res, 200, await planProject(projectId));
    if (req.method === "POST" && action === "audit") return json(res, 200, await auditProject(projectId));
    if (req.method === "POST" && action === "review") {
      const body = await readBody(req);
      return json(res, 200, await reviewProject(projectId, Number(body.maxBeats || 12)));
    }
    if (req.method === "POST" && action === "render") {
      const body = await readBody(req);
      return json(res, 200, await renderProject(projectId, Number(body.maxBeats || 12)));
    }
    if (req.method === "POST" && action === "check-assets") return json(res, 200, await checkAssets(projectId));
    return json(res, 404, { error: "API route not found." });
  } catch (error) {
    return json(res, 400, { error: error.message || String(error) });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  if (url.pathname === "/") return serveFile(res, join(publicDir, "index.html"));
  if (url.pathname.startsWith("/outputs/") || url.pathname.startsWith("/data/")) {
    return serveFile(res, safeWorkspacePath(url.pathname));
  }
  try {
    return serveFile(res, safePublicPath(url.pathname));
  } catch {
    return text(res, 404, "Not found");
  }
});

server.listen(port, () => {
  console.log(`Video Production Desk: http://localhost:${port}`);
});
