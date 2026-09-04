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
        temperature: 0.2,
        max_tokens: 3200,
        stream: false,
        messages
      })
    });

    if (!res.ok) {
      throw new Error(`API 请求失败：${await readErrorText(res)}`);
    }

    const rawResponse = await res.text();
    const data = Utils.safeJsonParse(rawResponse, null);
    if (!data || typeof data !== "object") {
      const preview = rawResponse.replace(/\s+/g, " ").trim().slice(0, 240);
      throw new Error(`API 响应不是 JSON：${preview || "空响应"}`);
    }
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error("模型输出被截断（finish_reason=length），请减少补全字段或更换输出上限更高的模型。");
    }
    return extractCompletionText(data);
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
    const fields = {
      name: character.name || "",
      creator: character.creator || "",
      userName: character.userName || "{{user}}",
      charName: character.charName || "{{char}}",
      summary: character.summary || "",
      description: character.description || "",
      personality: character.personality || "",
      scenario: character.scenario || "",
      firstMes: character.firstMes || "",
      mesExample: character.mesExample || "",
      creatorNotes: character.creatorNotes || "",
      systemPrompt: character.systemPrompt || "",
      postHistoryInstructions: character.postHistoryInstructions || "",
      characterBookText: character.characterBookText || "",
      userPersona: character.userPersona || "",
      npcSettings: character.npcSettings || ""
    };
    const targetFields = [
      "summary", "description", "personality", "scenario", "firstMes", "mesExample",
      "creatorNotes", "systemPrompt", "postHistoryInstructions", "characterBookText", "userPersona"
    ].filter(key => !String(fields[key] || "").trim());
    const compactFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [
      key,
      String(value || "").slice(0, 5000)
    ]));
    return {
      targetFields,
      prompt: `
你是一个严谨的酒馆角色卡补全助手。只输出一个合法 JSON 对象，不要 Markdown，不要解释文字，不要代码围栏。

只允许生成这些空字段：${targetFields.join(", ") || "无"}
已有字段必须保持原样，不要返回已有字段，也不要改写、总结或缩短已有内容。
每个新字段控制在 600 字以内，内容要能直接用于 SillyTavern 角色卡。
字段名必须使用：summary, description, personality, scenario, firstMes, mesExample, creatorNotes, systemPrompt, postHistoryInstructions, characterBookText, userPersona。
如果没有可补全字段，返回 {}。

角色信息：
${JSON.stringify(compactFields, null, 2)}
      `.trim()
    };
  }

  function extractCompletionText(data) {
    const choice = data?.choices?.[0];
    const candidates = [choice?.message?.content, choice?.text, data?.output_text, data?.output, data?.response, choice?.message?.reasoning_content];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
      if (Array.isArray(candidate)) {
        const text = candidate.map(part => typeof part === "string" ? part : part?.text || part?.content || "").join("");
        if (text.trim()) return text;
      }
      if (candidate && typeof candidate === "object") {
        const text = candidate.text || candidate.content || candidate.output;
        if (typeof text === "string" && text.trim()) return text;
      }
    }
    return "";
  }

  function extractJsonCandidates(content) {
    const text = String(content || "")
      .replace(/^\uFEFF/, "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
      .trim();
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
      const variants = [candidate, candidate.replace(/,\s*([}\]])/g, "$1")];
      for (const variant of variants) {
        const parsed = Utils.safeJsonParse(variant, null);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          let result = parsed;
          for (let i = 0; i < 3; i += 1) {
            const nested = result?.data || result?.result || result?.output || result?.response;
            if (!nested || typeof nested !== "object" || Array.isArray(nested)) break;
            result = nested;
          }
          return result;
        }
      }
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
    const request = buildPrompt(character);
    if (!request.targetFields.length) {
      throw new Error("当前没有空字段可补全；已有内容不会被 AI 覆盖。");
    }
    const content = await chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: "system", content: "你是一个严谨的酒馆角色卡设定生成器。必须只输出合法 JSON。" },
        { role: "user", content: request.prompt }
      ]
    });

    const parsed = parseAiJson(content);
    if (!parsed) {
      const preview = String(content || "").replace(/\s+/g, " ").trim().slice(0, 240);
      throw new Error(`AI 返回不是合法 JSON。模型返回摘要：${preview || "空响应"}`);
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
