const state = {
  project: null,
  projects: [],
  materialPacks: [],
  data: null,
  tab: "summary",
  tabText: ""
};

const $ = (id) => document.getElementById(id);
const refs = {
  title: $("title"),
  lane: $("lane"),
  targetVersion: $("targetVersion"),
  maxBeats: $("maxBeats"),
  scriptText: $("scriptText"),
  scriptStats: $("scriptStats"),
  createProject: $("createProject"),
  loadSample: $("loadSample"),
  refreshProjects: $("refreshProjects"),
  projectList: $("projectList"),
  materialPacks: $("materialPacks"),
  generatePlan: $("generatePlan"),
  runAudit: $("runAudit"),
  generateReview: $("generateReview"),
  renderVideo: $("renderVideo"),
  checkAssets: $("checkAssets"),
  reviewLink: $("reviewLink"),
  videoLink: $("videoLink"),
  currentProject: $("currentProject"),
  evidenceMetric: $("evidenceMetric"),
  diagramMetric: $("diagramMetric"),
  pptMetric: $("pptMetric"),
  statusLine: $("statusLine"),
  summaryView: $("summaryView"),
  textView: $("textView"),
  copyOutput: $("copyOutput")
};

function setStatus(message) {
  refs.statusLine.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function renderProjectList() {
  refs.projectList.innerHTML = "";
  if (!state.projects.length) {
    refs.projectList.innerHTML = '<p class="empty">还没有视频项目。</p>';
    return;
  }
  for (const project of state.projects) {
    const button = document.createElement("button");
    button.className = `project-item ${state.project?.id === project.id ? "active" : ""}`;
    button.innerHTML = `
      <strong>${project.title}</strong>
      <span>${project.lane} · ${project.hasPlan ? "已规划" : "未规划"} · ${project.hasReview ? "有审片页" : "无审片页"} · ${project.hasVideo ? "有视频" : "未渲染"}</span>
    `;
    button.addEventListener("click", () => loadProject(project.id));
    refs.projectList.append(button);
  }
}

function renderMaterialPacks() {
  refs.materialPacks.innerHTML = "";
  if (!state.materialPacks.length) {
    refs.materialPacks.innerHTML = '<p class="empty">暂无已保存素材包。</p>';
    return;
  }
  for (const pack of state.materialPacks) {
    const wrap = document.createElement("div");
    wrap.className = "pack-item";
    wrap.innerHTML = `
      <strong>${pack.title}</strong>
      <a href="${pack.files.externalSourcing}" target="_blank" rel="noreferrer">外部搜集</a>
      <a href="${pack.files.image2Prompts}" target="_blank" rel="noreferrer">image2</a>
      <a href="${pack.files.visualMixPlan}" target="_blank" rel="noreferrer">画面比例</a>
    `;
    refs.materialPacks.append(wrap);
  }
}

function updateControls() {
  const hasProject = Boolean(state.project);
  const hasPlan = Boolean(state.data?.plan);
  refs.generatePlan.disabled = !hasProject;
  refs.runAudit.disabled = !hasPlan;
  refs.generateReview.disabled = !hasPlan;
  refs.renderVideo.disabled = !hasPlan;
  refs.checkAssets.disabled = !hasPlan;
  refs.currentProject.textContent = state.project ? state.project.title : "未创建";
}

function updateMetrics() {
  const audit = state.data?.audit?.summary;
  const manifest = state.data?.reviewManifest;
  refs.evidenceMetric.textContent = audit ? `${audit.evidencePercent}%` : manifest ? `${Math.round((manifest.visualMixPercent.footage || 0) + (manifest.visualMixPercent.archivePhoto || 0) + (manifest.visualMixPercent.document || 0))}%` : "--";
  refs.diagramMetric.textContent = audit ? `${audit.diagramPercent}%` : manifest ? `${Math.round((manifest.visualMixPercent.diagram || 0) + (manifest.visualMixPercent.chart || 0))}%` : "--";
  refs.pptMetric.textContent = manifest?.riskSummary?.pptRisk || (audit?.status === "blocked" ? "high" : audit?.status === "review" ? "medium" : audit ? "low" : "--");
  if (state.data?.videoUrl) {
    refs.videoLink.href = state.data.videoUrl;
    refs.videoLink.classList.remove("disabled");
  }
}

function fileText(name) {
  return state.data?.files?.[name] || "";
}

function renderSummary() {
  const plan = state.data?.plan;
  const audit = state.data?.audit;
  const manifest = state.data?.reviewManifest;
  const beats = plan?.beats || [];
  const rows = beats.slice(0, 18).map((beat) => `
    <tr>
      <td>${beat.id || ""}</td>
      <td>${beat.sectionTitle || ""}</td>
      <td>${beat.type || ""}</td>
      <td>${beat.rightsRisk || ""}</td>
      <td>${beat.visualGoal || ""}</td>
    </tr>
  `).join("");
  refs.summaryView.innerHTML = `
    <div class="summary-block">
      <h2>素材比例总览</h2>
      <div class="mix-grid">
        <span>Beats<strong>${beats.length || "--"}</strong></span>
        <span>Audit<strong>${audit?.status || "--"}</strong></span>
        <span>PPT Risk<strong>${manifest?.riskSummary?.pptRisk || "--"}</strong></span>
        <span>Missing<strong>${manifest?.missingAssets?.length ?? "--"}</strong></span>
        <span>MP4<strong>${state.data?.videoUrl ? "ready" : "--"}</strong></span>
      </div>
    </div>
    <div class="summary-block">
      <h2>分段视频结构</h2>
      ${rows ? `<table><thead><tr><th>Beat</th><th>Section</th><th>Visual</th><th>Risk</th><th>Task</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">生成规划后会显示 beat 列表。</p>'}
    </div>
  `;
}

function renderTab() {
  const tabMap = {
    storyboard: "storyboard.md",
    external: "external-sourcing-prompts.md",
    image2: "image2-prompts.md",
    audit: "audit-report.md",
    assets: "asset-return-checklist.md"
  };
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.tab));
  const isSummary = state.tab === "summary";
  refs.summaryView.classList.toggle("active", isSummary);
  refs.textView.classList.toggle("active", !isSummary);
  if (isSummary) {
    renderSummary();
    state.tabText = refs.summaryView.innerText;
  } else {
    state.tabText = fileText(tabMap[state.tab]) || "这个文件还没有生成。";
    refs.textView.textContent = state.tabText;
  }
  updateMetrics();
  updateControls();
}

async function refreshProjects() {
  const payload = await api("/api/projects");
  state.projects = payload.projects || [];
  state.materialPacks = payload.materialPacks || [];
  renderProjectList();
  renderMaterialPacks();
}

async function loadProject(id) {
  setStatus("正在读取项目...");
  const payload = await api(`/api/projects/${encodeURIComponent(id)}`);
  state.project = payload.project;
  state.data = payload;
  refs.scriptText.value = await fetch(`/outputs/video-projects/${encodeURIComponent(id)}/script.md`).then((res) => res.text());
  updateScriptStats();
  renderProjectList();
  renderTab();
  setStatus("项目已载入");
}

async function createProject() {
  setStatus("正在创建项目...");
  const payload = await api("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      title: refs.title.value,
      lane: refs.lane.value,
      targetVersion: refs.targetVersion.value,
      scriptText: refs.scriptText.value
    })
  });
  state.project = payload.project;
  state.data = { project: payload.project, files: {}, plan: null, audit: null };
  await refreshProjects();
  renderTab();
  setStatus("项目已创建，可以生成视频素材规划");
}

async function runAction(action, label) {
  if (!state.project) return;
  setStatus(`正在${label}...`);
  const body = ["review", "render"].includes(action) ? { maxBeats: Number(refs.maxBeats.value || 12) } : {};
  const payload = await api(`/api/projects/${encodeURIComponent(state.project.id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  state.project = payload.project;
  state.data = payload;
  if (payload.reviewUrl) {
    refs.reviewLink.href = payload.reviewUrl;
    refs.reviewLink.classList.remove("disabled");
  }
  if (payload.videoUrl) {
    refs.videoLink.href = payload.videoUrl;
    refs.videoLink.classList.remove("disabled");
  }
  await refreshProjects();
  renderTab();
  setStatus(`${label}完成`);
}

async function checkAssets() {
  if (!state.project) return;
  setStatus("正在检查素材回填...");
  const payload = await api(`/api/projects/${encodeURIComponent(state.project.id)}/check-assets`, { method: "POST", body: "{}" });
  state.tab = "assets";
  state.tabText = `${payload.stdout}\n${payload.stderr}`.trim();
  refs.textView.textContent = state.tabText || "检查完成。";
  refs.summaryView.classList.remove("active");
  refs.textView.classList.add("active");
  setStatus(payload.ok ? "素材回填检查通过" : "素材回填仍有阻塞项");
}

function updateScriptStats() {
  refs.scriptStats.textContent = `${refs.scriptText.value.length.toLocaleString()} chars`;
  localStorage.setItem("videoDeskScript", refs.scriptText.value);
}

async function loadSample() {
  const text = await fetch("/data/projects/nixon-trump-structural-reversal/project.md").then((res) => res.text());
  refs.scriptText.value = text;
  refs.title.value = "Trump China Nixon Reversal";
  refs.lane.value = "history";
  updateScriptStats();
  setStatus("已填入现有 Trump/Nixon 项目稿");
}

refs.createProject.addEventListener("click", () => createProject().catch((error) => setStatus(error.message)));
refs.refreshProjects.addEventListener("click", () => refreshProjects().catch((error) => setStatus(error.message)));
refs.loadSample.addEventListener("click", () => loadSample().catch((error) => setStatus(error.message)));
refs.generatePlan.addEventListener("click", () => runAction("plan", "生成视频素材规划").catch((error) => setStatus(error.message)));
refs.runAudit.addEventListener("click", () => runAction("audit", "运行风险审查").catch((error) => setStatus(error.message)));
refs.generateReview.addEventListener("click", () => runAction("review", "生成审片项目").catch((error) => setStatus(error.message)));
refs.renderVideo.addEventListener("click", () => runAction("render", "渲染样片 MP4").catch((error) => setStatus(error.message)));
refs.checkAssets.addEventListener("click", () => checkAssets().catch((error) => setStatus(error.message)));
refs.scriptText.addEventListener("input", updateScriptStats);
refs.copyOutput.addEventListener("click", async () => {
  await navigator.clipboard.writeText(state.tabText || "");
  setStatus("当前内容已复制");
});
document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.tab = button.dataset.tab;
    renderTab();
  });
});

refs.scriptText.value = localStorage.getItem("videoDeskScript") || "";
updateScriptStats();
refreshProjects().then(renderTab).catch((error) => setStatus(error.message));
