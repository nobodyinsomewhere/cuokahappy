(() => {
  let store = StorageService.loadStore();
  const RECENT_API_PROVIDERS_KEY = "tavern_card_v3_recent_api_providers";
  let fetchedModels = [];

  const els = {
    toastWrap: document.getElementById("toastWrap"),
    themeSelect: document.getElementById("themeSelect"),
    characterSearch: document.getElementById("characterSearch"),
    characterList: document.getElementById("characterList"),
    statusText: document.getElementById("statusText"),

    newCharacterBtn: document.getElementById("newCharacterBtn"),
    duplicateCharacterBtn: document.getElementById("duplicateCharacterBtn"),
    deleteCurrentBtn: document.getElementById("deleteCurrentBtn"),
    saveCharacterBtn: document.getElementById("saveCharacterBtn"),
    fillTemplateBtn: document.getElementById("fillTemplateBtn"),

    importJsonBtn: document.getElementById("importJsonBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importPngBtn: document.getElementById("importPngBtn"),
    exportPngBtn: document.getElementById("exportPngBtn"),
    exportPreviewPngBtn: document.getElementById("exportPreviewPngBtn"),
    copyJsonBtn: document.getElementById("copyJsonBtn"),

    jsonFileInput: document.getElementById("jsonFileInput"),
    pngFileInput: document.getElementById("pngFileInput"),

    apiProviderName: document.getElementById("apiProviderName"),
    recentApiProviderSelect: document.getElementById("recentApiProviderSelect"),
    apiBaseUrl: document.getElementById("apiBaseUrl"),
    apiKey: document.getElementById("apiKey"),
    apiModel: document.getElementById("apiModel"),
    fetchModelsBtn: document.getElementById("fetchModelsBtn"),
    modelSearch: document.getElementById("modelSearch"),
    apiModelSelect: document.getElementById("apiModelSelect"),
    apiStatusText: document.getElementById("apiStatusText"),
    saveApiConfigBtn: document.getElementById("saveApiConfigBtn"),
    saveApiAndCloseBtn: document.getElementById("saveApiAndCloseBtn"),
    saveRecentProviderBtn: document.getElementById("saveRecentProviderBtn"),
    testApiBtn: document.getElementById("testApiBtn"),
    openApiSettingsBtn: document.getElementById("openApiSettingsBtn"),
    closeApiSettingsBtn: document.getElementById("closeApiSettingsBtn"),
    apiModal: document.getElementById("apiModal"),
    generateWithAiBtn: document.getElementById("generateWithAiBtn"),

    avatarUpload: document.getElementById("avatarUpload"),
    exportCanvas: document.getElementById("exportCanvas"),

    jsonPreview: document.getElementById("jsonPreview"),

    previewAvatar: document.getElementById("previewAvatar"),
    previewName: document.getElementById("previewName"),
    previewVersion: document.getElementById("previewVersion"),
    previewSummary: document.getElementById("previewSummary"),
    previewTags: document.getElementById("previewTags"),
    previewDescription: document.getElementById("previewDescription"),
    previewPersonality: document.getElementById("previewPersonality"),
    previewScenario: document.getElementById("previewScenario"),

    name: document.getElementById("name"),
    version: document.getElementById("version"),
    creator: document.getElementById("creator"),
    tags: document.getElementById("tags"),
    summary: document.getElementById("summary"),
    userName: document.getElementById("userName"),
    charName: document.getElementById("charName"),
    description: document.getElementById("description"),
    personality: document.getElementById("personality"),
    scenario: document.getElementById("scenario"),
    firstMes: document.getElementById("firstMes"),
    mesExample: document.getElementById("mesExample"),
    creatorNotes: document.getElementById("creatorNotes"),
    npcSettings: document.getElementById("npcSettings"),
    definition: document.getElementById("definition"),
    themeColor: document.getElementById("themeColor"),
    themeColor2: document.getElementById("themeColor2"),
    alternateGreetings: document.getElementById("alternateGreetings"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    sidebarOverlay: document.getElementById("sidebarOverlay"),
    sidebar: document.querySelector(".sidebar")
  };

  const fieldIds = [
    "name",
    "version",
    "creator",
    "tags",
    "summary",
    "userName",
    "charName",
    "description",
    "personality",
    "scenario",
    "firstMes",
    "mesExample",
    "creatorNotes",
    "npcSettings",
    "definition",
    "themeColor",
    "themeColor2",
    "alternateGreetings"
  ];

  function setStatus(text) {
    Utils.setStatus(text);
  }

  function toast(text) {
    Utils.toast(text);
  }

  function setApiStatus(text, kind = "") {
    if (!els.apiStatusText) return;
    els.apiStatusText.textContent = text;
    els.apiStatusText.dataset.kind = kind;
  }

  function humanizeError(err) {
    const text = err?.message || String(err || "未知错误");
    if (/401|unauthorized|invalid api key|incorrect api key/i.test(text)) return "Key 可能无效或无权限：" + text;
    if (/404|model.*not.*found|does not exist|模型不存在/i.test(text)) return "模型可能不存在或模型名填错：" + text;
    if (/400|bad_request|bad response status/i.test(text)) return "供应商返回 400：常见是 Base URL 层级、模型映射、请求格式或上游通道异常。" + text;
    if (/json|不是合法 JSON|Unexpected token/i.test(text)) return "返回不是 JSON：供应商可能返回了 HTML/错误页，或模型没有按要求输出 JSON。" + text;
    if (/Failed to fetch|NetworkError|CORS/i.test(text)) return "网络或 CORS 失败：浏览器可能无法直连该供应商，建议走可跨域的 OpenAI-compatible 网关。" + text;
    return text;
  }

  function escapeAttr(str = "") {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  }

  function loadRecentProviders() {
    const parsed = Utils.safeJsonParse(localStorage.getItem(RECENT_API_PROVIDERS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveRecentProviders(list) {
    localStorage.setItem(RECENT_API_PROVIDERS_KEY, JSON.stringify(list.slice(0, 12)));
  }

  function currentApiConfig() {
    return {
      name: els.apiProviderName.value.trim(),
      baseUrl: els.apiBaseUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.apiModel.value.trim()
    };
  }

  function renderRecentProviders() {
    const list = loadRecentProviders();
    els.recentApiProviderSelect.innerHTML = '<option value="">选择最近配置...</option>' + list.map((item, index) => `<option value="${index}">${escapeAttr(item.name || item.model || item.baseUrl || "未命名供应商")}</option>`).join("");
  }

  function saveCurrentProviderToRecent() {
    const config = currentApiConfig();
    if (!config.baseUrl || !config.model) {
      setApiStatus("至少填写 Base URL 和模型名后再保存。", "warn");
      return;
    }
    const list = loadRecentProviders().filter(item => !(item.baseUrl === config.baseUrl && item.model === config.model));
    list.unshift({ ...config, savedAt: Date.now() });
    saveRecentProviders(list);
    renderRecentProviders();
    setApiStatus("已保存到最近供应商。", "ok");
    toast("供应商配置已保存");
  }

  function applyRecentProvider(index) {
    const item = loadRecentProviders()[Number(index)];
    if (!item) return;
    els.apiProviderName.value = item.name || "";
    els.apiBaseUrl.value = item.baseUrl || "";
    els.apiKey.value = item.apiKey || "";
    els.apiModel.value = item.model || "";
    handleSaveApiConfig(false);
    setApiStatus("已载入最近供应商，可直接测试连接或拉模型。", "ok");
  }

  function renderModelOptions(models = fetchedModels, filter = "") {
    if (models.length) fetchedModels = models;
    const keyword = filter.trim().toLowerCase();
    const visible = keyword ? fetchedModels.filter(model => model.toLowerCase().includes(keyword)) : fetchedModels;
    els.apiModelSelect.innerHTML = '<option value="">选择拉取到的模型...</option>' + visible.map(model => `<option value="${escapeAttr(model)}">${escapeAttr(model)}</option>`).join("");
    els.apiModelSelect.classList.toggle("hidden", !fetchedModels.length);
    els.modelSearch.classList.toggle("hidden", !fetchedModels.length);
    if (fetchedModels.length) setApiStatus(`显示 ${visible.length}/${fetchedModels.length} 个模型。`, visible.length ? "ok" : "warn");
  }

  async function handleFetchModels() {
    els.fetchModelsBtn.disabled = true;
    els.fetchModelsBtn.textContent = "拉取中...";
    setApiStatus(`正在请求 ${ApiService.modelListUrl(els.apiBaseUrl.value)} ...`);
    try {
      const data = await ApiService.fetchModels(currentApiConfig());
      const models = ApiService.normalizeModelsPayload(data);
      renderModelOptions(models);
      if (models.length && !els.apiModel.value.trim()) els.apiModel.value = models[0];
      handleSaveApiConfig(false);
      setApiStatus(models.length ? `已拉取 ${models.length} 个模型，请优先从列表里选择。` : "请求成功，但没有解析到模型 ID。", models.length ? "ok" : "warn");
    } catch (err) {
      fetchedModels = [];
      renderModelOptions([]);
      setApiStatus(humanizeError(err), "bad");
    } finally {
      els.fetchModelsBtn.disabled = false;
      els.fetchModelsBtn.textContent = "拉模型";
    }
  }

  async function handleTestApi() {
    els.testApiBtn.disabled = true;
    els.testApiBtn.textContent = "测试中...";
    setApiStatus("正在测试 chat/completions ...");
    try {
      const result = await ApiService.testConnection(currentApiConfig());
      handleSaveApiConfig(false);
      setApiStatus(`连接成功：${result.slice(0, 80)}`, "ok");
      toast("API 连接正常");
    } catch (err) {
      setApiStatus(humanizeError(err), "bad");
    } finally {
      els.testApiBtn.disabled = false;
      els.testApiBtn.textContent = "测试连接";
    }
  }


  function currentCharacter() {
    return StorageService.getCurrent(store);
  }

  function getTheme() {
    return localStorage.getItem("tavern_card_v3_theme") || "glass-ice";
  }

  function applyTheme(theme) {
    const finalTheme = theme || "glass-ice";
    document.documentElement.setAttribute("data-theme", finalTheme);
    localStorage.setItem("tavern_card_v3_theme", finalTheme);
    if (els.themeSelect) {
      els.themeSelect.value = finalTheme;
    }
  }

  function initTheme() {
    const theme = getTheme();
    applyTheme(theme);

    if (els.themeSelect) {
      els.themeSelect.addEventListener("change", () => {
        applyTheme(els.themeSelect.value);
        toast("主题已切换");
      });
    }
  }

  function readFormIntoCharacter(ch) {
    ch.name = els.name.value.trim() || "未命名角色";
    ch.version = els.version.value.trim() || "1.0";
    ch.creator = els.creator.value.trim();
    ch.tags = Utils.splitTags(els.tags.value);
    ch.summary = els.summary.value.trim();
    ch.userName = els.userName.value.trim() || "{{user}}";
    ch.charName = els.charName.value.trim() || "{{char}}";
    ch.description = els.description.value.trim();
    ch.personality = els.personality.value.trim();
    ch.scenario = els.scenario.value.trim();
    ch.firstMes = els.firstMes.value.trim();
    ch.mesExample = els.mesExample.value.trim();
    ch.creatorNotes = els.creatorNotes.value.trim();
    ch.npcSettings = els.npcSettings.value.trim();
    ch.definition = els.definition.value;
    ch.themeColor = els.themeColor.value;
    ch.themeColor2 = els.themeColor2.value;
    ch.alternateGreetings = Utils.splitGreetings(els.alternateGreetings.value);
    return ch;
  }

  function fillForm(ch) {
    if (!ch) return;

    els.name.value = ch.name || "";
    els.version.value = ch.version || "1.0";
    els.creator.value = ch.creator || "";
    els.tags.value = Utils.joinTags(ch.tags);
    els.summary.value = ch.summary || "";
    els.userName.value = ch.userName || "{{user}}";
    els.charName.value = ch.charName || "{{char}}";
    els.description.value = ch.description || "";
    els.personality.value = ch.personality || "";
    els.scenario.value = ch.scenario || "";
    els.firstMes.value = ch.firstMes || "";
    els.mesExample.value = ch.mesExample || "";
    els.creatorNotes.value = ch.creatorNotes || "";
    els.npcSettings.value = ch.npcSettings || "";
    els.definition.value = ch.definition || "";
    els.themeColor.value = ch.themeColor || "#6f86ff";
    els.themeColor2.value = ch.themeColor2 || "#9b5cff";
    els.alternateGreetings.value = Utils.joinGreetings(ch.alternateGreetings);
  }

  function saveCurrentFromForm() {
    const ch = readFormIntoCharacter(currentCharacter());
    StorageService.upsertCharacter(store, ch);
    store = StorageService.loadStore();
  }

  function renderCharacterList() {
    const list = els.characterList;
    const search = (els.characterSearch.value || "").trim().toLowerCase();
    const current = currentCharacter();

    const filtered = store.characters.filter(ch => {
      const target = `${ch.name || ""} ${ch.summary || ""}`.toLowerCase();
      return !search || target.includes(search);
    });

    if (!filtered.length) {
      list.innerHTML = `
        <div class="character-item">
          <div class="name">没有匹配的角色</div>
          <div class="meta">试试别的关键词</div>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(ch => `
      <div class="character-item ${ch.id === current?.id ? "active" : ""}" data-id="${ch.id}">
        <div class="name">${escapeHtml(ch.name || "未命名角色")}</div>
        <div class="meta">${escapeHtml(Utils.truncate(ch.summary || "暂无简介", 44))}</div>
      </div>
    `).join("");

    [...list.querySelectorAll(".character-item[data-id]")].forEach(node => {
      node.addEventListener("click", () => {
        StorageService.setCurrent(store, node.dataset.id);
        store = StorageService.loadStore();
        renderAll();
      });
    });
  }

  function renderPreview(ch) {
    if (!ch) return;

    els.previewName.textContent = ch.name || "未命名角色";
    els.previewVersion.textContent = `v${ch.version || "1.0"}`;
    els.previewSummary.textContent = ch.summary || "一句话简介会显示在这里。";
    els.previewDescription.textContent = ch.description || "暂无描述";
    els.previewPersonality.textContent = ch.personality || "暂无人格设定";
    els.previewScenario.textContent = ch.scenario || "暂无场景";

    els.previewTags.innerHTML = (ch.tags || [])
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");

    if (ch.avatarDataUrl) {
      els.previewAvatar.src = ch.avatarDataUrl;
      els.previewAvatar.style.display = "block";
    } else {
      els.previewAvatar.removeAttribute("src");
      els.previewAvatar.style.display = "none";
    }
  }

  function renderJson(ch) {
    const json = CardDataService.toCardJson(ch);
    els.jsonPreview.textContent = JSON.stringify(json, null, 2);
  }

  function renderAll() {
    const ch = currentCharacter();
    renderCharacterList();
    fillForm(ch);
    renderPreview(ch);
    renderJson(ch);
  }

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  let _saveTimer = null;
  function debouncedSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      saveCurrentFromForm();
      renderPreview(currentCharacter());
      renderJson(currentCharacter());
      setStatus("已自动保存");
    }, 400);
  }

  async function handleAvatarUpload(file) {
    const ch = currentCharacter();
    ch.avatarDataUrl = await Utils.fileToDataURL(file);
    StorageService.upsertCharacter(store, ch);
    store = StorageService.loadStore();
    renderAll();
    toast("图片已更新");
  }

  async function handleImportJson(file) {
    const text = await Utils.fileToText(file);
    const parsed = Utils.safeJsonParse(text, null);
    if (!parsed) throw new Error("JSON 文件格式不合法");

    const ch = CardDataService.normalizeImportedCard(parsed);
    store.characters.unshift(ch);
    store.currentId = ch.id;
    StorageService.saveStore(store);
    store = StorageService.loadStore();
    renderAll();
    toast("JSON 已导入");
  }

  async function handleImportPng(file) {
    const result = await PngCard.importEmbeddedPng(file);
    const ch = CardDataService.normalizeImportedCard(result.parsed, result.imageDataUrl);

    store.characters.unshift(ch);
    store.currentId = ch.id;
    StorageService.saveStore(store);
    store = StorageService.loadStore();
    renderAll();
    toast("PNG 角色卡已导入");
  }

  function handleExportJson() {
    const ch = currentCharacter();
    const json = CardDataService.toCardJson(ch);
    Utils.downloadJson(`${Utils.sanitizeFilename(ch.name || "character")}.json`, json);
    toast("JSON 已导出");
  }

  async function handleCopyJson() {
    const ch = currentCharacter();
    await Utils.copyText(JSON.stringify(CardDataService.toCardJson(ch), null, 2));
    toast("JSON 已复制");
  }

  async function handleExportPreviewPng() {
    const ch = currentCharacter();
    const blob = await PngCard.exportPlainPng(ch, els.exportCanvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${Utils.sanitizeFilename(ch.name || "character")}-preview.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("卡面 PNG 已导出");
  }

  async function handleExportEmbeddedPng() {
    const ch = currentCharacter();
    const cardJson = CardDataService.toCardJson(ch);
    const blob = await PngCard.exportEmbeddedPng(ch, els.exportCanvas, cardJson);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${Utils.sanitizeFilename(ch.name || "character")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("PNG 角色卡已导出");
  }

  function handleTemplateFill() {
    const filled = CardDataService.applyTemplateFill(currentCharacter());
    StorageService.upsertCharacter(store, filled);
    store = StorageService.loadStore();
    renderAll();
    toast("已模板补全");
  }

  function handleSaveCurrent() {
    saveCurrentFromForm();
    renderAll();
    toast("已保存角色");
  }

  function handleDeleteCurrent() {
    const ch = currentCharacter();
    if (!confirm(`确定要删除角色「${ch.name || "未命名角色"}」吗？`)) return;
    const ok = StorageService.deleteCharacter(store, ch.id);
    if (!ok) {
      toast("至少保留一个角色");
      return;
    }
    store = StorageService.loadStore();
    renderAll();
    toast("已删除角色");
  }

  function handleNewCharacter() {
    StorageService.createCharacter(store);
    store = StorageService.loadStore();
    renderAll();
    toast("已新建角色");
  }

  function handleDuplicateCurrent() {
    StorageService.duplicateCharacter(store, currentCharacter().id);
    store = StorageService.loadStore();
    renderAll();
    toast("已复制角色");
  }

  function initApiConfig() {
    const config = StorageService.loadApiConfig() || {};
    els.apiProviderName.value = config.name || "";
    els.apiBaseUrl.value = config.baseUrl || "";
    els.apiKey.value = config.apiKey || "";
    els.apiModel.value = config.model || "";
    renderRecentProviders();
    renderModelOptions([]);
  }

  function handleSaveApiConfig(showToast = true) {
    StorageService.saveApiConfig(currentApiConfig());
    if (showToast) toast("API 配置已保存");
  }

  async function handleGenerateWithAi() {
    const config = currentApiConfig();

    if (!config.baseUrl || !config.model) {
      throw new Error("请先填写 Base URL 和模型名");
    }

    setStatus("AI 生成中...");
    els.generateWithAiBtn.disabled = true;
    els.generateWithAiBtn.textContent = "生成中...";

    try {
      const ch = currentCharacter();
      const generated = await ApiService.generateCharacterFields(config, ch);

      ch.summary = generated.summary || ch.summary;
      ch.description = generated.description || ch.description;
      ch.personality = generated.personality || ch.personality;
      ch.scenario = generated.scenario || ch.scenario;
      ch.firstMes = generated.firstMes || ch.firstMes;
      ch.mesExample = generated.mesExample || ch.mesExample;
      ch.creatorNotes = generated.creatorNotes || ch.creatorNotes;

      StorageService.upsertCharacter(store, ch);
      store = StorageService.loadStore();
      renderAll();
      setStatus("已生成");
      toast("AI 补全完成");
    } finally {
      els.generateWithAiBtn.disabled = false;
      els.generateWithAiBtn.textContent = "AI 补全设定";
    }
  }

  function openSidebar() {
    els.sidebar.classList.add("open");
    els.sidebarOverlay.classList.add("show");
  }

  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.sidebarOverlay.classList.remove("show");
  }

  function bindFormAutoSave() {
    fieldIds.forEach(id => {
      const el = els[id];
      if (!el) return;
      el.addEventListener("input", debouncedSave);
    });
  }

  function openApiModal() {
    els.apiModal.classList.add("show");
    els.apiModal.setAttribute("aria-hidden", "false");
    setTimeout(() => els.apiBaseUrl?.focus(), 0);
  }

  function closeApiModal() {
    els.apiModal.classList.remove("show");
    els.apiModal.setAttribute("aria-hidden", "true");
  }

  function bindEditorTabs() {
    const tabs = [...document.querySelectorAll(".editor-tab")];
    const panels = [...document.querySelectorAll(".tab-panel")];
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.tab;
        tabs.forEach(item => item.classList.toggle("active", item === tab));
        panels.forEach(panel => panel.classList.toggle("active", panel.dataset.tabPanel === key));
      });
    });
  }

  function bindPreviewTabs() {
    const tabs = [...document.querySelectorAll(".preview-tab")];
    const panels = [...document.querySelectorAll(".preview-tab-panel")];
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.previewTab;
        tabs.forEach(item => item.classList.toggle("active", item === tab));
        panels.forEach(panel => panel.classList.toggle("active", panel.dataset.previewPanel === key));
      });
    });
  }

  function handleSaveApiAndClose() {
    handleSaveApiConfig();
    closeApiModal();
  }

  function bindEvents() {
    bindFormAutoSave();
    bindEditorTabs();
    bindPreviewTabs();

    els.characterSearch.addEventListener("input", renderCharacterList);

    els.newCharacterBtn.addEventListener("click", handleNewCharacter);
    els.duplicateCharacterBtn.addEventListener("click", handleDuplicateCurrent);
    els.deleteCurrentBtn.addEventListener("click", handleDeleteCurrent);
    els.saveCharacterBtn.addEventListener("click", handleSaveCurrent);
    els.fillTemplateBtn.addEventListener("click", handleTemplateFill);

    els.avatarUpload.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await handleAvatarUpload(file);
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
      e.target.value = "";
    });

    els.importJsonBtn.addEventListener("click", () => els.jsonFileInput.click());
    els.importPngBtn.addEventListener("click", () => els.pngFileInput.click());

    els.jsonFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await handleImportJson(file);
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
      e.target.value = "";
    });

    els.pngFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await handleImportPng(file);
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
      e.target.value = "";
    });

    els.exportJsonBtn.addEventListener("click", handleExportJson);
    els.copyJsonBtn.addEventListener("click", async () => {
      try {
        await handleCopyJson();
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
    });

    els.exportPreviewPngBtn.addEventListener("click", async () => {
      try {
        await handleExportPreviewPng();
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
    });

    els.exportPngBtn.addEventListener("click", async () => {
      try {
        await handleExportEmbeddedPng();
      } catch (err) {
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
    });

    els.saveApiConfigBtn.addEventListener("click", () => handleSaveApiConfig(true));
    els.saveRecentProviderBtn.addEventListener("click", saveCurrentProviderToRecent);
    els.fetchModelsBtn.addEventListener("click", handleFetchModels);
    els.testApiBtn.addEventListener("click", handleTestApi);
    els.modelSearch.addEventListener("input", () => renderModelOptions(fetchedModels, els.modelSearch.value));
    els.apiModelSelect.addEventListener("change", () => {
      if (els.apiModelSelect.value) els.apiModel.value = els.apiModelSelect.value;
      handleSaveApiConfig(false);
    });
    els.recentApiProviderSelect.addEventListener("change", () => applyRecentProvider(els.recentApiProviderSelect.value));
    els.saveApiAndCloseBtn.addEventListener("click", handleSaveApiAndClose);
    els.openApiSettingsBtn.addEventListener("click", openApiModal);
    els.closeApiSettingsBtn.addEventListener("click", closeApiModal);
    els.apiModal.addEventListener("click", (e) => {
      if (e.target === els.apiModal) closeApiModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.apiModal.classList.contains("show")) closeApiModal();
    });
    els.generateWithAiBtn.addEventListener("click", async () => {
      try {
        await handleGenerateWithAi();
      } catch (err) {
        setStatus("生成失败");
        setApiStatus(humanizeError(err), "bad");
        toast("操作失败，查看页面提示");
      }
    });

    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener("click", openSidebar);
    }
    if (els.sidebarOverlay) {
      els.sidebarOverlay.addEventListener("click", closeSidebar);
    }
  }

  function init() {
    initTheme();
    initApiConfig();
    bindEvents();
    renderAll();
    setStatus("就绪");
  }

  init();
})();
