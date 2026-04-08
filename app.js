(() => {
  let store = StorageService.loadStore();

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

    apiBaseUrl: document.getElementById("apiBaseUrl"),
    apiKey: document.getElementById("apiKey"),
    apiModel: document.getElementById("apiModel"),
    saveApiConfigBtn: document.getElementById("saveApiConfigBtn"),
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
    definition: document.getElementById("definition"),
    themeColor: document.getElementById("themeColor"),
    themeColor2: document.getElementById("themeColor2"),
    alternateGreetings: document.getElementById("alternateGreetings")
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
    const ok = StorageService.deleteCharacter(store, currentCharacter().id);
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
    const config = StorageService.loadApiConfig();
    els.apiBaseUrl.value = config.baseUrl || "";
    els.apiKey.value = config.apiKey || "";
    els.apiModel.value = config.model || "";
  }

  function handleSaveApiConfig() {
    StorageService.saveApiConfig({
      baseUrl: els.apiBaseUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.apiModel.value.trim()
    });
    toast("API 配置已保存");
  }

  async function handleGenerateWithAi() {
    const config = {
      baseUrl: els.apiBaseUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.apiModel.value.trim()
    };

    if (!config.baseUrl || !config.model) {
      throw new Error("请先填写 Base URL 和模型名");
    }

    setStatus("AI 生成中...");

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
  }

  function bindFormAutoSave() {
    fieldIds.forEach(id => {
      const el = els[id];
      if (!el) return;
      el.addEventListener("input", () => {
        saveCurrentFromForm();
        renderAll();
        setStatus("已自动保存");
      });
    });
  }

  function bindEvents() {
    bindFormAutoSave();

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
        alert(err.message || String(err));
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
        alert(err.message || String(err));
      }
      e.target.value = "";
    });

    els.pngFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await handleImportPng(file);
      } catch (err) {
        alert(err.message || String(err));
      }
      e.target.value = "";
    });

    els.exportJsonBtn.addEventListener("click", handleExportJson);
    els.copyJsonBtn.addEventListener("click", async () => {
      try {
        await handleCopyJson();
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    els.exportPreviewPngBtn.addEventListener("click", async () => {
      try {
        await handleExportPreviewPng();
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    els.exportPngBtn.addEventListener("click", async () => {
      try {
        await handleExportEmbeddedPng();
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    els.saveApiConfigBtn.addEventListener("click", handleSaveApiConfig);
    els.generateWithAiBtn.addEventListener("click", async () => {
      try {
        await handleGenerateWithAi();
      } catch (err) {
        setStatus("生成失败");
        alert(err.message || String(err));
      }
    });
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
