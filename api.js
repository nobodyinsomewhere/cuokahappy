window.ApiService = (() => {
  async function chatCompletion({ baseUrl, apiKey, model, messages }) {
    const url = (baseUrl || "").replace(/\/+$/, "") + "/chat/completions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API 请求失败：${res.status} ${text}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  function buildPrompt(character) {
    return `你是一个角色卡写作助手。请根据已有字段补全角色设定，并返回严格 JSON，字段包括：
summary, description, personality, scenario, firstMes, mesExample, creatorNotes

要求：
1. 保持人物一致性
2. 文风自然，可直接用于酒馆角色卡
3. 如果字段已有内容，则在原有基础上增强，不要完全推翻
4. 返回严格 JSON，不要带 Markdown 代码块

已知角色信息：
${JSON.stringify(character, null, 2)}
`;
  }

  async function generateCharacterFields(cfg, character) {
    const content = await chatCompletion({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
      messages: [
        { role: "system", content: "你是一个严谨的角色卡设定生成器。" },
        { role: "user", content: buildPrompt(character) }
      ]
    });

    const parsed = Utils.safeJsonParse(content, null);
    if (!parsed) {
      throw new Error("AI 返回的不是合法 JSON，请重试或调整模型。");
    }
    return parsed;
  }

  return {
    generateCharacterFields
  };
})();