window.StorageService = (() => {
  const STORE_KEY = "tavern_card_v3_store";
  const API_KEY = "tavern_card_v3_api";

  function defaultCharacter() {
    return {
      id: Utils.uid("char"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      name: "未命名角色",
      version: "1.0",
      creator: "",
      tags: [],
      summary: "",
      userName: "{{user}}",
      charName: "{{char}}",
      description: "",
      personality: "",
      scenario: "",
      firstMes: "",
      mesExample: "",
      creatorNotes: "",
      definition: "",
      avatarDataUrl: "",
      themeColor: "#6f86ff",
      themeColor2: "#9b5cff",
      alternateGreetings: []
    };
  }

  function defaultStore() {
    const first = defaultCharacter();
    return {
      currentId: first.id,
      characters: [first]
    };
  }

  function loadStore() {
    const parsed = Utils.safeJsonParse(localStorage.getItem(STORE_KEY), null);
    if (!parsed || !Array.isArray(parsed.characters) || !parsed.characters.length) {
      const ds = defaultStore();
      saveStore(ds);
      return ds;
    }
    return parsed;
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function getCurrent(store) {
    return store.characters.find(c => c.id === store.currentId) || store.characters[0] || null;
  }

  function setCurrent(store, id) {
    store.currentId = id;
    saveStore(store);
  }

  function createCharacter(store) {
    const ch = defaultCharacter();
    store.characters.unshift(ch);
    store.currentId = ch.id;
    saveStore(store);
    return ch;
  }

  function duplicateCharacter(store, sourceId) {
    const src = store.characters.find(c => c.id === sourceId);
    if (!src) return null;

    const cloned = {
      ...structuredClone(src),
      id: Utils.uid("char"),
      name: src.name + "（副本）",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    store.characters.unshift(cloned);
    store.currentId = cloned.id;
    saveStore(store);
    return cloned;
  }

  function upsertCharacter(store, character) {
    character.updatedAt = Date.now();
    const index = store.characters.findIndex(c => c.id === character.id);

    if (index >= 0) {
      store.characters[index] = character;
    } else {
      store.characters.unshift(character);
    }

    saveStore(store);
  }

  function deleteCharacter(store, id) {
    if (store.characters.length <= 1) return false;
    store.characters = store.characters.filter(c => c.id !== id);

    if (store.currentId === id) {
      store.currentId = store.characters[0]?.id || null;
    }

    saveStore(store);
    return true;
  }

  function saveApiConfig(config) {
    localStorage.setItem(API_KEY, JSON.stringify(config));
  }

  function loadApiConfig() {
    return Utils.safeJsonParse(localStorage.getItem(API_KEY), {
      baseUrl: "",
      apiKey: "",
      model: ""
    });
  }

  return {
    defaultCharacter,
    loadStore,
    saveStore,
    getCurrent,
    setCurrent,
    createCharacter,
    duplicateCharacter,
    upsertCharacter,
    deleteCharacter,
    saveApiConfig,
    loadApiConfig
  };
})();
