window.ApiService = (() => {
  function normalizeEndpointBase(raw) {
    const base = String(raw || "").trim().replace(/\/+$/, "");
    if (!base) throw new Error("请先填写 Base URL");
    if (!/^https?:\/\//i.test(base)) throw new Error("Base URL 必须以 http:// 或 https:// 开头");
    return base.replace(/\/chat\/completions$/i, "");
  }

  function modelListUrl(baseUrl) {
    const base = normalizeEndpointBase(baseUrl);
    if (/\/v\d+$/i.test(base)) return base + "/models";
    return base + "/v1/models";
  }

  function chatCompletionUrl(baseUrl) {
    const base = String(baseUrl || "").trim().replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(base)) return base;
    if (/\/v\d+$/i.test(base)) return base + "/chat/completions";
    return base + "/v1/chat/completions";
  }

  function buildHeaders(apiKey) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    };
  }

  async function readErrorText(res) {
    const text = await res.text();
    const parsed = Utils.safeJsonParse(text, null);
    const message = parsed?.error?.message || parsed?.message || text;
    const hint = res.status === 400
      ? "\n\n常见原因：Base URL 层级、模型名/映射、请求格式或上游供应商通道异常。建议先拉模型并测试连接。"
      : "";
    return `${res.status} ${message || res.statusText}${hint}`;
  }

  async function fetchModels({ baseUrl, apiKey }) {
    const res = await fetch(modelListUrl(baseUrl), {
      headers: buildHeaders(apiKey),
      cache: "no-store"
    });
    if (!res.ok) throw new Error(await readErrorText(res));
    return await res.json();
  }

  function normalizeModelsPayload(data) {
    const list = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data)
          ? data
          : [];
    return [
      ...new Set(
        list
          .map(item => typeof item === "string" ? item : item?.id || item?.name || item?.model)
          .filter(Boolean)
      )
    ].sort();
  }

  async function chatCompletion({ baseUrl, apiKey, model, messages }) {
    const res = await fetch(chatCompletionUrl(baseUrl), {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        model,
        temperature: 0.85,
        max_tokens: 2200,
        messages
      })
    });

    if (!res.ok) {
      throw new Error(`API 请求失败：${await readErrorText(res)}`);
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    const content = message?.content ?? data?.choices?.[0]?.text ?? "";
    if (Array.isArray(content)) {
      return content.map(part => typeof part === "string" ? part : part?.text || "").join("");
    }
    return typeof content === "string" ? content : String(content || "");
  }

  async function testConnection(config) {
    if (!config.baseUrl || !config.model) throw new Error("请先填写 Base URL 和模型名");
    const content = await chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: "system", content: "你是连接测试助手。" },
        { role: "user", content: "只回复 OK" }
      ]
    });
    return content.trim() || "OK";
  }

  function buildPrompt(character) {
    return `
你是一个角色卡写作助手。请根据已有字段补全角色设定，并返回严格 JSON，字段包括：
summary, description, personality, scenario, firstMes, mesExample, creatorNotes, systemPrompt, postHistoryInstructions, characterBookText, userPersona

要求：
1. 保持人物一致性
2. 文风自然，可直接用于酒馆角色卡
3. 如果字段已有内容，则在原有基础上增强，不要完全推翻
4. 返回严格 JSON，不要带 Markdown 代码块

已知角色信息：
${JSON.stringify(character, null, 2)}
    `.trim();
  }

  function extractJsonCandidates(content) {
    const text = String(content || "").replace(/^\uFEFF/, "").trim();
    const candidates = [text];
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/gi) || [];
    for (const block of fenced) candidates.push(block.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
    for (let start = text.indexOf("{"); start >= 0; start = text.indexOf("{", start + 1)) {
      let depth = 0;
      let quoted = false;
      let escaped = false;
      for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === '"') quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === "{") depth += 1;
        else if (ch === "}" && --depth === 0) {
          candidates.push(text.slice(start, i + 1));
          break;
        }
      }
    }
    return candidates;
  }

  function parseAiJson(content) {
    for (const candidate of extractJsonCandidates(content)) {
      const parsed = Utils.safeJsonParse(candidate, null);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }
    return null;
  }

  function normalizeGeneratedFields(parsed) {
    const aliases = {
      firstMes: ["firstMes", "first_mes", "firstMessage", "first_message"],
      mesExample: ["mesExample", "mes_example", "exampleDialogue", "example_dialogue"],
      creatorNotes: ["creatorNotes", "creator_notes"],
      systemPrompt: ["systemPrompt", "system_prompt"],
      postHistoryInstructions: ["postHistoryInstructions", "post_history_instructions"],
      characterBookText: ["characterBookText", "character_book", "characterBook"],
      userPersona: ["userPersona", "user_persona"]
    };
    const result = {};
    for (const key of ["summary", "description", "personality", "scenario", "firstMes", "mesExample", "creatorNotes", "systemPrompt", "postHistoryInstructions", "characterBookText", "userPersona"]) {
      const sourceKeys = aliases[key] || [key];
      const value = sourceKeys.map(sourceKey => parsed[sourceKey]).find(value => typeof value === "string" && value.trim());
      if (value) result[key] = value.trim();
    }
    return result;
  }

  async function generateCharacterFields(config, character) {
    const content = await chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: "system", content: "你是一个严谨的角色卡设定生成器。必须只输出合法 JSON。" },
        { role: "user", content: buildPrompt(character) }
      ]
    });

    const parsed = parseAiJson(content);
    if (!parsed) {
      throw new Error("AI 返回中没有可解析的 JSON。请确认模型支持文本输出，并重试或更换模型。");
    }

    const normalized = normalizeGeneratedFields(parsed);
    if (!Object.keys(normalized).length) {
      throw new Error("AI 返回了 JSON，但没有可用的角色卡字段；请更换模型或检查提示词响应。");
    }
    return normalized;
  }

  return {
    fetchModels,
    generateCharacterFields,
    normalizeModelsPayload,
    testConnection,
    modelListUrl,
    chatCompletionUrl
  };
})();
