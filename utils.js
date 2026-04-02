window.Utils = {
  uid() {
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  },

  now() {
    return new Date().toISOString();
  },

  safeJsonParse(text, fallback = null) {
    try { return JSON.parse(text); } catch { return fallback; }
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  },

  copyText(text) {
    return navigator.clipboard.writeText(text);
  },

  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  textToUint8(text) {
    return new TextEncoder().encode(text);
  },

  uint8ToText(uint8) {
    return new TextDecoder().decode(uint8);
  },

  splitTags(text) {
    return (text || "")
      .split(/[，,]/)
      .map(s => s.trim())
      .filter(Boolean);
  },

  joinTags(tags) {
    return (tags || []).join(", ");
  },

  splitGreetings(text) {
    return (text || "")
      .split("|")
      .map(s => s.trim())
      .filter(Boolean);
  },

  joinGreetings(arr) {
    return (arr || []).join(" | ");
  },

  truncate(text, max = 60) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "..." : text;
  },

  escapeHtml(str = "") {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
};