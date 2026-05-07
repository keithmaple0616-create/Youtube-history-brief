const form = document.querySelector("#eventForm");
const output = document.querySelector("#output");
const statusBox = document.querySelector("#status");
const generateTopicsBtn = document.querySelector("#generateTopicsBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const developBtn = document.querySelector("#developBtn");
const scriptBtn = document.querySelector("#scriptBtn");
const productionBtn = document.querySelector("#productionBtn");
const clearBtn = document.querySelector("#clearBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const apiKeyInput = document.querySelector("#apiKey");
const modelInput = document.querySelector("#model");
const modelOptions = document.querySelector("#modelOptions");
const providerInput = document.querySelector("#provider");
const minimaxRegionInput = document.querySelector("#minimaxRegion");
const minimaxRegionRow = document.querySelector("#minimaxRegionRow");
const saveSettingsBtn = document.querySelector("#saveSettings");
const testKeyBtn = document.querySelector("#testKeyBtn");
const selectedAngleInput = document.querySelector("#selectedAngle");

const storageKeys = {
  apiKey: "yhst_api_key",
  model: "yhst_model",
  provider: "yhst_provider",
  minimaxRegion: "yhst_minimax_region",
  providerApiKeys: "yhst_provider_api_keys",
  settingsVersion: "yhst_settings_version",
  lastOutput: "yhst_last_output",
  lastForm: "yhst_last_form",
  selectedAngle: "yhst_selected_angle"
};

const currentSettingsVersion = "2";

const defaultModels = {
  deepseek: "deepseek-v4-flash",
  minimax: "MiniMax-M2.7",
  openai: "gpt-5-mini"
};

const providerModels = {
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  minimax: ["MiniMax-M2.7"],
  openai: ["gpt-5-mini"]
};

const stageLabels = {
  topics: "阶段一：选题方向",
  plan: "阶段二：视频方案",
  script: "阶段三：脚本 Brief",
  production: "阶段四：制作包"
};

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function formData() {
  return {
    eventTitle: document.querySelector("#eventTitle").value.trim(),
    eventDescription: document.querySelector("#eventDescription").value.trim(),
    sourceLink: document.querySelector("#sourceLink").value.trim(),
    creatorNotes: document.querySelector("#creatorNotes").value.trim(),
    targetLength: document.querySelector("#targetLength").value,
    sensitivity: document.querySelector("#sensitivity").value,
    tone: document.querySelector("#tone").value,
    provider: providerInput.value,
    minimaxRegion: minimaxRegionInput.value,
    model: modelInput.value.trim() || defaultModels[providerInput.value],
    selectedAngle: selectedAngleInput.value.trim(),
    workspace: output.textContent.trim()
  };
}

function fillForm(data) {
  const settingsFields = new Set(["provider", "model", "minimaxRegion"]);
  for (const [key, value] of Object.entries(data)) {
    if (settingsFields.has(key)) continue;
    const field = document.querySelector(`#${key}`);
    if (field) field.value = value;
  }
}

function providerApiKeys() {
  const raw = localStorage.getItem(storageKeys.providerApiKeys);
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function apiKeyForProvider(provider) {
  return providerApiKeys()[provider] || "";
}

function saveApiKeyForProvider(provider, apiKey) {
  const keys = providerApiKeys();
  if (apiKey) {
    keys[provider] = apiKey;
  } else {
    delete keys[provider];
  }
  localStorage.setItem(storageKeys.providerApiKeys, JSON.stringify(keys));
}

function migrateLegacyApiKey(provider) {
  const legacyKey = localStorage.getItem(storageKeys.apiKey);
  if (!legacyKey || apiKeyForProvider(provider)) return;
  saveApiKeyForProvider(provider, legacyKey);
}

function migrateSettingsVersion() {
  const version = localStorage.getItem(storageKeys.settingsVersion);
  if (version === currentSettingsVersion) return;

  const savedProvider = localStorage.getItem(storageKeys.provider);
  const savedModel = localStorage.getItem(storageKeys.model);
  const savedLooksLegacyMiniMax = !savedProvider || savedProvider === "minimax" || savedModel === "MiniMax-M2.7";

  if (savedLooksLegacyMiniMax) {
    localStorage.setItem(storageKeys.provider, "deepseek");
    localStorage.setItem(storageKeys.model, defaultModels.deepseek);
  }

  localStorage.setItem(storageKeys.settingsVersion, currentSettingsVersion);
}

function loadState() {
  migrateSettingsVersion();
  const savedProvider = localStorage.getItem(storageKeys.provider) || "deepseek";
  if (savedProvider !== "deepseek") migrateLegacyApiKey(savedProvider);
  providerInput.value = savedProvider;
  minimaxRegionInput.value = localStorage.getItem(storageKeys.minimaxRegion) || "cn";
  modelInput.value = localStorage.getItem(storageKeys.model) || defaultModels[providerInput.value];
  apiKeyInput.value = apiKeyForProvider(providerInput.value);
  selectedAngleInput.value = localStorage.getItem(storageKeys.selectedAngle) || "";
  updateProviderUi();

  const savedForm = localStorage.getItem(storageKeys.lastForm);
  if (savedForm) fillForm(JSON.parse(savedForm));

  const savedOutput = localStorage.getItem(storageKeys.lastOutput);
  if (savedOutput) {
    output.textContent = savedOutput;
    setStatus("已恢复上一次工作台内容。", "success");
  }
}

function validateEventInput(payload) {
  if (!payload.eventTitle && !payload.eventDescription) {
    setStatus("请至少输入热点事件标题或事件描述。", "error");
    return false;
  }
  return true;
}

function validateSelectedAngle(payload) {
  if (!payload.selectedAngle) {
    setStatus("请先把你选中的选题方向复制到「你选中的方向」里。", "error");
    return false;
  }
  return true;
}

async function runStage(stage) {
  const payload = formData();
  if (!validateEventInput(payload)) return;
  if (stage !== "topics" && !validateSelectedAngle(payload)) return;

  localStorage.setItem(storageKeys.lastForm, JSON.stringify(payload));
  localStorage.setItem(storageKeys.selectedAngle, payload.selectedAngle);

  setButtonsDisabled(true);
  const label = stageLabels[stage];
  setStatus(`正在生成：${label}。`);

  const existing = output.textContent.trim();
  const separator = existing && !existing.startsWith("工作流：") ? "\n\n---\n\n" : "";
  output.textContent = `${existing}${separator}正在生成 ${label}...`;

  try {
    const response = await fetch("/api/step", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeyInput.value.trim()
      },
      body: JSON.stringify({ ...payload, stage })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "生成失败。");

    appendStageOutput(label, data.text || "没有返回内容。");
    setStatus(`${label} 已生成。你可以修改后继续下一步。`, "success");
  } catch (error) {
    appendStageOutput(label, `生成失败。\n\n${error.message}`);
    setStatus(error.message, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

function appendStageOutput(label, text) {
  const current = output.textContent
    .replace(/\n?\n?---\n\n正在生成 .+$/s, "")
    .replace(/正在生成 .+$/s, "")
    .trim();
  const next = current && !current.startsWith("工作流：") ? `${current}\n\n---\n\n${text}` : text;
  output.textContent = next.trim();
  localStorage.setItem(storageKeys.lastOutput, output.textContent);
}

function setButtonsDisabled(disabled) {
  generateTopicsBtn.disabled = disabled;
  developBtn.disabled = disabled;
  scriptBtn.disabled = disabled;
  productionBtn.disabled = disabled;
}

function saveSettings() {
  localStorage.setItem(storageKeys.provider, providerInput.value);
  localStorage.setItem(storageKeys.minimaxRegion, minimaxRegionInput.value);
  localStorage.setItem(storageKeys.model, modelInput.value.trim() || defaultModels[providerInput.value]);
  saveApiKeyForProvider(providerInput.value, apiKeyInput.value.trim());
  setStatus("设置已保存在这台电脑上。", "success");
}

async function testApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus("请先填写 API Key。", "error");
    return;
  }

  testKeyBtn.disabled = true;
  setStatus("正在测试 API Key...");

  try {
    const response = await fetch("/api/test-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        provider: providerInput.value,
        minimaxRegion: minimaxRegionInput.value,
        model: modelInput.value.trim()
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "API Key 测试失败。");

    setStatus(`API Key 测试成功：${data.provider} / ${data.model}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    testKeyBtn.disabled = false;
  }
}

function useSample() {
  fillForm({
    eventTitle: "美国公众对联邦机构的信任持续下降",
    eventDescription:
      "最近美国政治争论中，一个反复出现的问题是：联邦机构是否变得过于强大、过于政治化，或者已经和普通选民脱节。这个问题出现在关于行政国家、公共卫生机构、执法部门、法院和选举管理的争论中。",
    sourceLink: "",
    creatorNotes:
      "探索这到底是自由与官僚体系的冲突，还是更深层的合法性危机。可以谨慎使用中国王朝史，但避免直接说美国就是晚明。",
    targetLength: "12-15 分钟",
    sensitivity: "中",
    tone: "冷静、严肃、有历史感、适合 YouTube",
    provider: "deepseek",
    minimaxRegion: "cn",
    model: "deepseek-v4-flash"
  });
  selectedAngleInput.value = "";
  updateProviderUi();
  setStatus("示例已填入。先点击「1. 生成选题方向」。", "success");
}

function updateProviderDefaultModel() {
  const provider = providerInput.value;
  const current = modelInput.value.trim();
  const knownModels = Object.values(providerModels).flat();
  if (!current || knownModels.includes(current)) {
    modelInput.value = defaultModels[provider];
  }
  apiKeyInput.value = apiKeyForProvider(provider);
  localStorage.setItem(storageKeys.provider, provider);
  localStorage.setItem(storageKeys.model, modelInput.value.trim() || defaultModels[provider]);
  updateProviderUi();
}

function updateProviderUi() {
  const isMiniMax = providerInput.value === "minimax";
  minimaxRegionRow.style.display = isMiniMax ? "flex" : "none";
  updateModelOptions();
}

function updateModelOptions() {
  const models = providerModels[providerInput.value] || [];
  modelOptions.innerHTML = "";
  for (const model of models) {
    const option = document.createElement("option");
    option.value = model;
    modelOptions.appendChild(option);
  }
}

async function copyOutput() {
  await navigator.clipboard.writeText(output.textContent);
  setStatus("结果已复制。", "success");
}

function downloadMarkdown() {
  const blob = new Blob([output.textContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `youtube-workflow-${date}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Markdown 文件已下载。", "success");
}

function clearWorkspace() {
  output.textContent = `工作流：

1. 生成选题方向：只做判断，不写脚本。
2. 生成视频方案：选择一个方向后，展开标题、Hook、历史案例、中国视角和大纲。
3. 生成脚本 Brief：把方案整理成可交给 Codex 写正式稿的创作简报。
4. 生成制作包：在正式稿确认后，把脚本转成 B-roll、分镜、屏幕文字、Shorts 和发布清单。`;
  selectedAngleInput.value = "";
  localStorage.removeItem(storageKeys.lastOutput);
  localStorage.removeItem(storageKeys.selectedAngle);
  setStatus("工作台已清空，可以开始新的热点。", "success");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runStage("topics");
});
developBtn.addEventListener("click", () => runStage("plan"));
scriptBtn.addEventListener("click", () => runStage("script"));
productionBtn.addEventListener("click", () => runStage("production"));
saveSettingsBtn.addEventListener("click", saveSettings);
testKeyBtn.addEventListener("click", testApiKey);
sampleBtn.addEventListener("click", useSample);
clearBtn.addEventListener("click", clearWorkspace);
copyBtn.addEventListener("click", copyOutput);
downloadBtn.addEventListener("click", downloadMarkdown);
providerInput.addEventListener("change", updateProviderDefaultModel);
minimaxRegionInput.addEventListener("change", saveSettings);
modelInput.addEventListener("input", () => {
  localStorage.setItem(storageKeys.model, modelInput.value.trim() || defaultModels[providerInput.value]);
});
selectedAngleInput.addEventListener("input", () => {
  localStorage.setItem(storageKeys.selectedAngle, selectedAngleInput.value.trim());
});

loadState();
