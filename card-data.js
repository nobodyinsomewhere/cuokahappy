window.CardDataService = (() => {
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
        generated_by: "Tavern Card Generator V3"
      }
    };
  }

  function normalizeImportedCard(obj, imageDataUrl = "") {
    const data = obj?.data || obj || {};

    return {
      id: Utils.uid("char"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

  function applyTemplateFill(ch) {
    const next = { ...ch };

    if (!next.summary) {
      next.summary = "外冷内稳、具有观察力和控制感的原创角色。";
    }

    if (!next.description) {
      next.description = `${next.name || "{{char}}"}外表克制冷静，习惯先观察局势再行动。擅长通过细节判断他人的意图，不会轻易暴露真实情绪。`;
    }

    if (!next.personality) {
      next.personality = "敏锐，克制，礼貌，疏离，情绪稳定，偶尔带一点试探意味。";
    }

    if (!next.scenario) {
      next.scenario = `在一个适合秘密交易或深夜交谈的场景中，${next.userName || "{{user}}"}与${next.charName || "{{char}}"}第一次真正接触。`;
    }

    if (!next.firstMes) {
      next.firstMes = `${next.charName || "{{char}}"}抬眼看向你，语气平静。\n\n“你来得比我预想中早。”`;
    }

    if (!next.mesExample) {
      next.mesExample = `<START>
${next.charName || "{{char}}"}: 你看起来不像是路过。
${next.userName || "{{user}}"}: 那你觉得我是来做什么的？
${next.charName || "{{char}}"}: 我更想听你自己说。`;
    }

    if (!next.creatorNotes) {
      next.creatorNotes = "写作重点：保持角色稳定性，避免突然过度热情或严重 OOC。";
    }

    return next;
  }

  return {
    buildDefinition,
    toCardJson,
    normalizeImportedCard,
    applyTemplateFill
  };
})();
