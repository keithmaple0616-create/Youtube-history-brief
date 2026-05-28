const state = {
  project: null,
  projects: [],
  data: null,
  tab: "summary",
  tabText: ""
};

const $ = (id) => document.getElementById(id);
const refs = {
  title: $("title"),
  lane: $("lane"),
  targetVersion: $("targetVersion"),
  scriptText: $("scriptText"),
  scriptStats: $("scriptStats"),
  createProject: $("createProject"),
  loadSample: $("loadSample"),
  refreshProjects: $("refreshProjects"),
  projectList: $("projectList"),
  generatePlan: $("generatePlan"),
  finalVideo: $("finalVideo"),
  saveIntake: $("saveIntake"),
  checkAssets: $("checkAssets"),
  videoLink: $("videoLink"),
  currentProject: $("currentProject"),
  evidenceMetric: $("evidenceMetric"),
  diagramMetric: $("diagramMetric"),
  pptMetric: $("pptMetric"),
  statusLine: $("statusLine"),
  summaryView: $("summaryView"),
  textView: $("textView"),
  assetIntakeText: $("assetIntakeText"),
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
      <span>${project.lane} · ${project.hasPlan ? "已生成分镜" : "未生成分镜"} · ${project.hasVideo ? "有视频" : "未生成视频"}</span>
    `;
    button.addEventListener("click", () => loadProject(project.id));
    refs.projectList.append(button);
  }
}

function updateControls() {
  const hasProject = Boolean(state.project);
  const hasPlan = Boolean(state.data?.plan);
  refs.generatePlan.disabled = !hasProject;
  refs.finalVideo.disabled = !hasPlan;
  refs.saveIntake.disabled = !hasPlan;
  refs.checkAssets.disabled = !hasPlan;
  refs.currentProject.textContent = state.project ? state.project.title : "未创建";
}

function updateMetrics() {
  const beats = state.data?.plan?.beats || [];
  refs.evidenceMetric.textContent = beats.length ? `${beats.length} 段` : "--";
  refs.diagramMetric.textContent = fileText("external-sourcing-prompts.md") || fileText("image2-prompts.md") ? "已生成" : "--";
  refs.pptMetric.textContent = state.data?.videoUrl ? "已生成" : state.data?.plan ? "待生成" : "--";
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
      <h2>生产进度</h2>
      <div class="mix-grid">
        <span>分镜段<strong>${beats.length || "--"}</strong></span>
        <span>搜索素材<strong>${fileText("external-sourcing-prompts.md") ? "已生成" : "--"}</strong></span>
        <span>image2<strong>${fileText("image2-prompts.md") ? "已生成" : "--"}</strong></span>
        <span>视频<strong>${state.data?.videoUrl ? "已生成" : "--"}</strong></span>
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
  renderProjectList();
}

async function loadProject(id) {
  setStatus("正在读取项目...");
  const payload = await api(`/api/projects/${encodeURIComponent(id)}`);
  state.project = payload.project;
  state.data = payload;
  refs.scriptText.value = await fetch(`/outputs/video-projects/${encodeURIComponent(id)}/script.md`).then((res) => res.text());
  refs.assetIntakeText.value = fileText("asset-intake.json");
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
  refs.assetIntakeText.value = "";
  await refreshProjects();
  renderTab();
  setStatus("项目已创建，可以生成视频素材规划");
}

async function runAction(action, label) {
  if (!state.project) return;
  setStatus(`正在${label}...`);
  const body = ["review", "render", "final-video"].includes(action)
    ? {
        targetVersion: refs.targetVersion.value
      }
    : {};
  const payload = await api(`/api/projects/${encodeURIComponent(state.project.id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  state.project = payload.project;
  state.data = payload;
  refs.assetIntakeText.value = fileText("asset-intake.json");
  if (payload.videoUrl) {
    refs.videoLink.href = payload.videoUrl;
    refs.videoLink.classList.remove("disabled");
  }
  await refreshProjects();
  renderTab();
  setStatus(`${label}完成`);
}

async function saveIntake() {
  if (!state.project) return;
  setStatus("正在保存素材回填...");
  const payload = await api(`/api/projects/${encodeURIComponent(state.project.id)}/intake`, {
    method: "POST",
    body: JSON.stringify({ intake: refs.assetIntakeText.value })
  });
  state.project = payload.project;
  state.data = payload;
  renderTab();
  setStatus("素材回填已保存");
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
refs.finalVideo.addEventListener("click", () => runAction("final-video", "生成完整视频").catch((error) => setStatus(error.message)));
refs.saveIntake.addEventListener("click", () => saveIntake().catch((error) => setStatus(error.message)));
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
