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
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
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
summary, description, personality, scenario, firstMes, mesExample, creatorNotes

要求：
1. 保持人物一致性
2. 文风自然，可直接用于酒馆角色卡
3. 如果字段已有内容，则在原有基础上增强，不要完全推翻
4. 返回严格 JSON，不要带 Markdown 代码块

已知角色信息：
${JSON.stringify(character, null, 2)}
    `.trim();
  }

  function parseAiJson(content) {
    const direct = Utils.safeJsonParse(content, null);
    if (direct) return direct;
    const match = String(content || "").match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) return Utils.safeJsonParse(match[1], null);
    const start = String(content || "").indexOf("{");
    const end = String(content || "").lastIndexOf("}");
    if (start >= 0 && end > start) return Utils.safeJsonParse(String(content).slice(start, end + 1), null);
    return null;
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
      throw new Error("AI 返回的不是合法 JSON，请重试或更换更稳定的模型。");
    }

    return parsed;
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
