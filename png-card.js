window.PngCard = (() => {
  const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function concatUint8(...arrays) {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
    }
    return out;
  }

  function u32be(num) {
    return new Uint8Array([
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ]);
  }

  function readU32BE(arr, offset) {
    return (
      (arr[offset] << 24) |
      (arr[offset + 1] << 16) |
      (arr[offset + 2] << 8) |
      arr[offset + 3]
    ) >>> 0;
  }

  function equalSig(bytes) {
    if (bytes.length < 8) return false;
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== PNG_SIG[i]) return false;
    }
    return true;
  }

  function makeChunk(type, data) {
    const typeBytes = Utils.textToUint8(type);
    const lengthBytes = u32be(data.length);
    const crcInput = concatUint8(typeBytes, data);
    const crcBytes = u32be(crc32(crcInput));
    return concatUint8(lengthBytes, typeBytes, data, crcBytes);
  }

  function parseChunks(bytes) {
    if (!equalSig(bytes)) throw new Error("不是合法 PNG 文件");
    const chunks = [];
    let offset = 8;

    while (offset < bytes.length) {
      const length = readU32BE(bytes, offset);
      const type = Utils.uint8ToText(bytes.slice(offset + 4, offset + 8));
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      const crcStart = dataEnd;
      const crcEnd = crcStart + 4;

      chunks.push({
        type,
        length,
        data: bytes.slice(dataStart, dataEnd),
        raw: bytes.slice(offset, crcEnd)
      });

      offset = crcEnd;
      if (type === "IEND") break;
    }

    return chunks;
  }

  function insertTextChunk(pngBytes, keyword, text) {
    const chunks = parseChunks(pngBytes);
    const textData = concatUint8(
      Utils.textToUint8(keyword),
      new Uint8Array([0]),
      Utils.textToUint8(text)
    );
    const textChunk = makeChunk("tEXt", textData);

    const out = [PNG_SIG];
    let inserted = false;

    for (const chunk of chunks) {
      if (!inserted && chunk.type === "IEND") {
        out.push(textChunk);
        inserted = true;
      }
      out.push(chunk.raw);
    }

    return concatUint8(...out);
  }

  function extractTextChunks(pngBytes) {
    const chunks = parseChunks(pngBytes);
    const map = [];

    for (const chunk of chunks) {
      if (chunk.type === "tEXt") {
        const zeroIndex = chunk.data.indexOf(0);
        if (zeroIndex > -1) {
          const keyword = Utils.uint8ToText(chunk.data.slice(0, zeroIndex));
          const text = Utils.uint8ToText(chunk.data.slice(zeroIndex + 1));
          map.push({ keyword, text });
        }
      }
    }

    return map;
  }

  function extractCharacterJson(pngBytes) {
    const texts = extractTextChunks(pngBytes);
    const hit =
      texts.find(x => x.keyword === "chara") ||
      texts.find(x => x.keyword === "character") ||
      texts.find(x => x.keyword === "ccv2");

    if (!hit) return null;
    return hit.text;
  }

  function dataURLToUint8(dataURL) {
    const base64 = dataURL.split(",")[1];
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }

  function uint8ToBlob(uint8, type = "image/png") {
    return new Blob([uint8], { type });
  }

  function isPngDataUrl(dataUrl) {
    return /^data:image\/png;base64,/i.test(dataUrl || "");
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function clipRoundRect(ctx, x, y, w, h, r) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
  }

  function getWrappedLines(ctx, text, maxWidth, font) {
    ctx.font = font;
    const rawLines = String(text || "").split("\n");
    const lines = [];

    for (const raw of rawLines) {
      let line = "";
      for (const ch of raw) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      lines.push(line || "");
    }

    return lines;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, font = "24px sans-serif") {
    const lines = getWrappedLines(ctx, text, maxWidth, font);
    ctx.font = font;
    let cy = y;
    for (const line of lines) {
      ctx.fillText(line, x, cy);
      cy += lineHeight;
    }
  }

  function drawBadge(ctx, text, x, y, color) {
    ctx.font = "bold 16px sans-serif";
    const w = Math.max(72, ctx.measureText(text).width + 26);
    roundRect(ctx, x, y, w, 34, 17);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x + 13, y + 22);
  }

  function drawPill(ctx, text, x, y, w, h) {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();
    ctx.fillStyle = "#dfe8f7";
    ctx.font = "15px sans-serif";
    ctx.fillText(text, x + 14, y + 23);
  }

  function drawSection(ctx, title, text, x, y, maxWidth) {
    const padding = 18;
    const titleH = 24;
    const bodyLines = getWrappedLines(ctx, text || "暂无内容", maxWidth - padding * 2, "16px sans-serif");
    const lineHeight = 28;
    const bodyH = bodyLines.length * lineHeight;
    const h = padding + titleH + 12 + bodyH + padding;

    roundRect(ctx, x, y, maxWidth, h, 20);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    ctx.fillStyle = "#aebcd4";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(title, x + padding, y + 28);

    ctx.fillStyle = "#eef3fb";
    ctx.font = "16px sans-serif";
    let ty = y + 58;
    for (const line of bodyLines) {
      ctx.fillText(line, x + padding, ty);
      ty += lineHeight;
    }

    return y + h;
  }

  async function exportCardCanvas(character, canvas) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const c1 = character.themeColor || "#6f86ff";
    const c2 = character.themeColor2 || "#9b5cff";

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0f1724");
    bg.addColorStop(1, "#0b0f16");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    function drawGlow(x, y, r, color) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGlow(W * 0.18, H * 0.12, 280, c1 + "66");
    drawGlow(W * 0.84, H * 0.08, 240, c2 + "55");
    drawGlow(W * 0.82, H * 0.85, 320, c1 + "22");

    roundRect(ctx, 40, 40, W - 80, H - 80, 36);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const left = 80;
    const top = 90;
    const avatarW = 300;
    const avatarH = 400;

    roundRect(ctx, left, top, avatarW, avatarH, 28);
    ctx.fillStyle = "#121927";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    if (character.avatarDataUrl) {
      try {
        const img = await loadImage(character.avatarDataUrl);
        clipRoundRect(ctx, left, top, avatarW, avatarH, 28);
        ctx.drawImage(img, left, top, avatarW, avatarH);
        ctx.restore();
      } catch {}
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NO IMAGE", left + avatarW / 2, top + avatarH / 2);
      ctx.textAlign = "left";
    }

    const rightX = 420;
    ctx.fillStyle = "#f3f7ff";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(character.name || "未命名角色", rightX, 140);

    ctx.font = "24px sans-serif";
    ctx.fillStyle = "rgba(243,247,255,0.82)";
    wrapText(
      ctx,
      character.summary || "一句话简介会显示在这里。",
      rightX,
      190,
      W - rightX - 80,
      38
    );

    drawBadge(ctx, `v${character.version || "1.0"}`, rightX, 255, c1);

    let tagX = rightX + 100;
    for (const tag of (character.tags || []).slice(0, 6)) {
      const w = Math.max(80, ctx.measureText(tag).width + 28);
      drawPill(ctx, tag, tagX, 242, w, 36);
      tagX += w + 10;
    }

    let sectionY = 330;
    sectionY = drawSection(ctx, "描述", character.description, rightX, sectionY, W - rightX - 80);
    sectionY = drawSection(ctx, "人格", character.personality, rightX, sectionY + 14, W - rightX - 80);
    drawSection(ctx, "场景", character.scenario, 80, 560, W - 160);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("Generated by Tavern Card Generator V2", 80, H - 70);

    return canvas.toDataURL("image/png");
  }

  async function exportPlainPng(character, canvas) {
    const dataUrl = await exportCardCanvas(character, canvas);
    const bytes = dataURLToUint8(dataUrl);
    return uint8ToBlob(bytes, "image/png");
  }

  async function exportEmbeddedPng(character, canvas, cardJsonObject) {
    const jsonText = JSON.stringify(cardJsonObject);

    // 1. 如果用户上传的是 PNG，直接以原图作为角色卡底图
    if (character.avatarDataUrl && isPngDataUrl(character.avatarDataUrl)) {
      const baseBytes = dataURLToUint8(character.avatarDataUrl);
      const merged = insertTextChunk(baseBytes, "chara", jsonText);
      return uint8ToBlob(merged, "image/png");
    }

    // 2. 如果用户上传的是 JPG / WEBP / 其他图片，先转成 PNG，再嵌入角色数据
    if (character.avatarDataUrl) {
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      try {
        const img = await loadImage(character.avatarDataUrl);
        const iw = img.width;
        const ih = img.height;

        const scale = Math.max(W / iw, H / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const nx = (W - nw) / 2;
        const ny = (H - nh) / 2;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, nx, ny, nw, nh);

        const dataUrl = canvas.toDataURL("image/png");
        const baseBytes = dataURLToUint8(dataUrl);
        const merged = insertTextChunk(baseBytes, "chara", jsonText);
        return uint8ToBlob(merged, "image/png");
      } catch (e) {
        throw new Error("图片处理失败，无法导出 PNG 角色卡");
      }
    }

    // 3. 如果用户根本没上传图片，才退回用默认卡面
    const dataUrl = await exportCardCanvas(character, canvas);
    const baseBytes = dataURLToUint8(dataUrl);
    const merged = insertTextChunk(baseBytes, "chara", jsonText);
    return uint8ToBlob(merged, "image/png");
  }

  async function importEmbeddedPng(file) {
    const arr = new Uint8Array(await Utils.fileToArrayBuffer(file));
    const jsonText = extractCharacterJson(arr);

    if (!jsonText) {
      throw new Error("这个 PNG 里没有找到角色数据");
    }

    const parsed = Utils.safeJsonParse(jsonText, null);
    if (!parsed) {
      throw new Error("PNG 中的角色数据不是合法 JSON");
    }

    return {
      parsed,
      imageDataUrl: await Utils.fileToDataURL(file)
    };
  }

  return {
    exportPlainPng,
    exportEmbeddedPng,
    importEmbeddedPng
  };
})();