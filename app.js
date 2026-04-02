(() => {
  let store = StorageService.loadStore();
  const THEME_KEY = "tavern_card_v2_theme";

  const els = {
    toastContainer: document.getElementById("toastContainer"),
    characterList: document.getElementById("characterList"),
    statusText: document.getElementById("statusText"),

    newCharacterBtn: document.getElementById("newCharacterBtn"),
    duplicateCharacterBtn: document.getElementById("duplicateCharacterBtn"),
    deleteCurrentBtn: document.getElementById("deleteCurrentBtn"),
    saveCharacterBtn: document.getElementById("saveCharacterBtn"),

    importJsonBtn: document.getElementById("importJsonBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importPngBtn: document.getElementById("importPngBtn"),
    exportPngBtn: document.getElementById("exportPngBtn"),
    exportPreviewPngBtn: document.getElementById("exportPreviewPngBtn"),
    copyJsonBtn: document.getElementById("copyJsonBtn"),

    jsonFileInput: document.getElementById("jsonFileInput"),
    pngFileInput: document.getElementById("pngFileInput"),

    fillTemplateBtn: document.getElementById("fillTemplateBtn"),

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

    themeSelector: document.getElementById("themeSelector"),

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
    "name","version","creator","tags","summary","userName","charName",
    "description","personality","scenario","firstMes","mesExample",
    "creatorNotes","definition","themeColor","themeColor2","alternateGreetings"
  ];

  function setStatus(text) {
    if (els.statusText) els.statusText.textContent = text;
  }

  function showToast(message, type = "info", duration = 2200) {
    if (!els.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function notify(message, type = "info") {
    setStatus(message);
    showToast(message, type);
  }

  function currentCharacter() {
    return StorageService.getCurrent(store);
  }

  function applyTheme(theme) {
    const finalTheme = theme || "default";
    document.documentElement.setAttribute("data-theme", finalTheme);
    localStorage.setItem(THEME_KEY, finalTheme);
    if (els.themeSelector) {
      els.themeSelector.value = finalTheme;
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "default";
    applyTheme(savedTheme);
  }

  function buildDefinition(ch) {
    if (ch.definition?.trim()) return ch.definition.trim();

    const parts = [];
    if (ch.summary) parts.push(`# Summary\n${ch.summary}`);
    if (ch.description) parts.push(`# Description\n${ch.description}`);
    if (ch.personality) parts.push(`# Personality\n${ch.personality}`);
    if (ch.scenario) parts.push(`# Scenario\n${ch.scenario}`);
    return parts.join("\n\n").trim();
  }

  function toCardJson(ch) {
    return {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: ch.name || "未命名角色",
        description: ch.description || "",
        personality: ch.personality || "",
        scenario: ch.scenario || "",
        first_mes: ch.firstMes || "",
        mes_example: ch.mesExample || "",
        creator_notes: ch.creatorNotes || "",
        system_prompt: "",
        post_history_instructions: "",
        alternate_greetings: ch.alternateGreetings || [],
        tags: ch.tags || [],
        creator: ch.creator || "",
        character_version: ch.version || "1.0",
        extensions: {
          summary: ch.summary || "",
          user_name: ch.userName || "{{user}}",
          char_name: ch.charName || "{{char}}",
          avatar: ch.avatarDataUrl || "",
          themeColor: ch.themeColor || "#6f86ff",
          themeColor2: ch.themeColor2 || "#9b5cff"
        },
        definition: buildDefinition(ch)
      },
      meta: {
        exported_at: new Date().toISOString(),
        generated_by: "Tavern Card Generator V2"
      }
    };
  }

  function normalizeImportedCard(obj, imageDataUrl = "") {
    const data = obj.data || obj;
    return {
      id: Utils.uid(),
      createdAt: Utils.now(),
      updatedAt: Utils.now(),
      name: data.name || "未命名角色",
      version: data.character_version || "1.0",
      creator: data.creator || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.extensions?.summary || "",
      userName: data.extensions?.user_name || "{{user}}",
      charName: data.extensions?.char_name || "{{char}}",
      description: data.description || "",
      personality: data.personality || "",
      scenario: data.scenario || "",
      firstMes: data.first_mes || "",
      mesExample: data.mes_example || "",
      creatorNotes: data.creator_notes || "",
      definition: data.definition || "",
      avatarDataUrl: imageDataUrl || data.extensions?.avatar || "",
      themeColor: data.extensions?.themeColor || "#6f86ff",
      themeColor2: data.extensions?.themeColor2 || "#9b5cff",
      alternateGreetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings : []
    };
  }

  function renderCharacterList() {
    const cur = currentCharacter();
    els.characterList.innerHTML = store.characters.map(ch => `
      <div class="character-item ${ch.id === cur.id ? "active" : ""}" data-id="${ch.id}">
        <div class="name">${Utils.escapeHtml(ch.name || "未命名角色")}</div>
        <div class="meta">${Utils.escapeHtml(Utils.truncate(ch.summary || "暂无简介", 38))}</div>
      </div>
    `).join("");

    [...els.characterList.querySelectorAll(".character-item")].forEach(node => {
      node.addEventListener("click", () => {
        StorageService.setCurrent(store, node.dataset.id);
        store = StorageService.loadStore();
        renderAll();
      });
    });
  }

  function fillForm(ch) {
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

  function saveCurrentFromForm() {
    const ch = readFormIntoCharacter(currentCharacter());
    StorageService.upsertCharacter(store, ch);
    store = StorageService.loadStore();
  }

  function renderPreview(ch) {
    els.previewName.textContent = ch.name || "未命名角色";
    els.previewVersion.textContent = `v${ch.version || "1.0"}`;
    els.previewSummary.textContent = ch.summary || "一句话简介会显示在这里。";
    els.previewDescription.textContent = ch.description || "暂无描述";
    els.previewPersonality.textContent = ch.personality || "暂无人格设定";
    els.previewScenario.textContent = ch.scenario || "暂无场景";

    els.previewTags.innerHTML = (ch.tags || []).map(t => `<span class="tag">${Utils.escapeHtml(t)}</span>`).join("");

    if (ch.avatarDataUrl) {
      els.previewAvatar.src = ch.avatarDataUrl;
      els.previewAvatar.style.display = "block";
    } else {
      els.previewAvatar.removeAttribute("src");
      els.previewAvatar.style.display = "none";
    }
  }

  function renderJson(ch) {
    els.jsonPreview.textContent = JSON.stringify(toCardJson(ch), null, 2);
  }

  function renderAll() {
    const ch = currentCharacter();
    renderCharacterList();
    fillForm(ch);
    renderPreview(ch);
    renderJson(ch);
  }

  function applyTemplateFill() {
    const ch = currentCharacter();

    if (!ch.summary) {
      ch.summary = "外冷内稳、具有观察力和控制感的原创角色。";
    }
    if (!ch.description) {
      ch.description = `${ch.name || "{{char}}"}外表克制冷静，习惯先观察局势再行动。擅长通过细节判断他人的意图，不会轻易暴露真实情绪。`;
    }
    if (!ch.personality) {
      ch.personality = "敏锐，克制，礼貌，疏离，情绪稳定，偶尔带一点试探意味。";
    }
    if (!ch.scenario) {
      ch.scenario = `在一个适合秘密交易或深夜交谈的场景中，${ch.userName || "{{user}}"}与${ch.charName || "{{char}}"}第一次真正接触。`;
    }
    if (!ch.firstMes) {
      ch.firstMes = `${ch.charName || "{{char}}"}抬眼看向你，语气平静。\n\n“你来得比我预想中早。”`;
    }
    if (!ch.mesExample) {
      ch.mesExample = `<START>
${ch.charName || "{{char}}"}: 你看起来不像是路过。
${ch.userName || "{{user}}"}: 那你觉得我是来做什么的？
${ch.charName || "{{char}}"}: 我更想听你自己说。`;
    }
    if (!ch.creatorNotes) {
      ch.creatorNotes = "写作重点：保持角色稳定性，避免突然过度热情或严重 OOC。";
    }

    StorageService.upsertCharacter(store, ch);
    store = StorageService.loadStore();
    renderAll();
    notify("已模板补全", "success");
  }

  async function onAvatarUpload(file) {
    const ch = currentCharacter();
    ch.avatarDataUrl = await Utils.fileToDataURL(file);
    StorageService.upsertCharacter(store, ch);
    store = StorageService.loadStore();
    renderAll();
    notify("图片已更新", "success");
  }

  async function exportJson() {
    const ch = currentCharacter();
    const json = JSON.stringify(toCardJson(ch), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    Utils.downloadBlob(blob, `${safeFileName(ch.name || "character")}.json`);
    notify("JSON 已导出", "success");
  }

  async function copyJson() {
    const ch = currentCharacter();
    await Utils.copyText(JSON.stringify(toCardJson(ch), null, 2));
    notify("JSON 已复制", "success");
  }

  async function importJson(file) {
    const text = await file.text();
    const parsed = Utils.safeJsonParse(text, null);
    if (!parsed) throw new Error("JSON 文件格式不合法");

    const ch = normalizeImportedCard(parsed);
    store.characters.unshift(ch);
    store.currentId = ch.id;
    StorageService.saveStore(store);
    store = StorageService.loadStore();
    renderAll();
    notify("JSON 已导入", "success");
  }

  async function exportPreviewPng() {
    const ch = currentCharacter();
    const blob = await PngCard.exportPlainPng(ch, els.exportCanvas);
    Utils.downloadBlob(blob, `${safeFileName(ch.name || "character")}-preview.png`);
    notify("普通 PNG 已导出", "success");
  }

  async function exportEmbeddedPng() {
    const ch = currentCharacter();
    const cardJson = toCardJson(ch);
    const blob = await PngCard.exportEmbeddedPng(ch, els.exportCanvas, cardJson);
    Utils.downloadBlob(blob, `${safeFileName(ch.name || "character")}.png`);
    notify("PNG 角色卡已导出", "success");
  }

  async function importPng(file) {
    const res = await PngCard.importEmbeddedPng(file);
    const ch = normalizeImportedCard(res.parsed, res.imageDataUrl);
    store.characters.unshift(ch);
    store.currentId = ch.id;
    StorageService.saveStore(store);
    store = StorageService.loadStore();
    renderAll();
    notify("PNG 角色卡已导入", "success");
  }

  function saveApiConfig() {
    StorageService.saveApiConfig({
      baseUrl: els.apiBaseUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.apiModel.value.trim()
    });
    notify("API 配置已保存", "success");
  }

  async function generateWithAi() {
    const cfg = {
      baseUrl: els.apiBaseUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.apiModel.value.trim()
    };

    if (!cfg.baseUrl || !cfg.model) {
      throw new Error("请先填写 Base URL 和模型名");
    }

    setStatus("AI 生成中...");
    showToast("AI 生成中...", "info", 1500);

    const ch = currentCharacter();
    const generated = await ApiService.generateCharacterFields(cfg, ch);

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
    notify("AI 补全完成", "success");
  }

  function safeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_");
  }

  function bindEvents() {
    fieldIds.forEach(id => {
      els[id].addEventListener("input", () => {
        saveCurrentFromForm();
        renderAll();
        setStatus("已自动保存");
      });
    });

    if (els.themeSelector) {
      els.themeSelector.addEventListener("change", () => {
        applyTheme(els.themeSelector.value);
        notify("主题已切换", "success");
      });
    }

    els.saveCharacterBtn.addEventListener("click", () => {
      saveCurrentFromForm();
      renderAll();
      notify("已手动保存", "success");
    });

    els.newCharacterBtn.addEventListener("click", () => {
      StorageService.createCharacter(store);
      store = StorageService.loadStore();
      renderAll();
      notify("已新建角色", "success");
    });

    els.duplicateCharacterBtn.addEventListener("click", () => {
      StorageService.duplicateCharacter(store, currentCharacter().id);
      store = StorageService.loadStore();
      renderAll();
      notify("已复制角色", "success");
    });

    els.deleteCurrentBtn.addEventListener("click", () => {
      const ok = StorageService.deleteCharacter(store, currentCharacter().id);
      if (!ok) {
        notify("至少保留一个角色", "error");
        return;
      }
      store = StorageService.loadStore();
      renderAll();
      notify("已删除角色", "success");
    });

    els.fillTemplateBtn.addEventListener("click", applyTemplateFill);

    els.avatarUpload.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await onAvatarUpload(file);
      } catch (err) {
        alert(err.message || String(err));
        notify("图片上传失败", "error");
      }
      e.target.value = "";
    });

    els.exportJsonBtn.addEventListener("click", async () => {
      try {
        await exportJson();
      } catch (err) {
        alert(err.message || String(err));
        notify("JSON 导出失败", "error");
      }
    });

    els.copyJsonBtn.addEventListener("click", async () => {
      try {
        await copyJson();
      } catch (err) {
        alert(err.message || String(err));
        notify("JSON 复制失败", "error");
      }
    });

    els.importJsonBtn.addEventListener("click", () => els.jsonFileInput.click());
    els.jsonFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await importJson(file);
      } catch (err) {
        alert(err.message || String(err));
        notify("JSON 导入失败", "error");
      }
      e.target.value = "";
    });

    els.exportPreviewPngBtn.addEventListener("click", async () => {
      try {
        await exportPreviewPng();
      } catch (err) {
        alert(err.message || String(err));
        notify("普通 PNG 导出失败", "error");
      }
    });

    els.exportPngBtn.addEventListener("click", async () => {
      try {
        await exportEmbeddedPng();
      } catch (err) {
        alert(err.message || String(err));
        notify("PNG 角色卡导出失败", "error");
      }
    });

    els.importPngBtn.addEventListener("click", () => els.pngFileInput.click());
    els.pngFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await importPng(file);
      } catch (err) {
        alert(err.message || String(err));
        notify("PNG 角色卡导入失败", "error");
      }
      e.target.value = "";
    });

    const apiCfg = StorageService.loadApiConfig();
    els.apiBaseUrl.value = apiCfg.baseUrl || "";
    els.apiKey.value = apiCfg.apiKey || "";
    els.apiModel.value = apiCfg.model || "";

    els.saveApiConfigBtn.addEventListener("click", () => {
      try {
        saveApiConfig();
      } catch (err) {
        alert(err.message || String(err));
        notify("API 配置保存失败", "error");
      }
    });

    els.generateWithAiBtn.addEventListener("click", async () => {
      try {
        await generateWithAi();
      } catch (err) {
        alert(err.message || String(err));
        notify("AI 生成失败", "error");
      }
    });
  }

  initTheme();
  bindEvents();
  renderAll();
})();