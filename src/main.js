
// ====== ТЕМЫ ======
const THEMES = [
  {
    key: "std",
    name: "Стандарт",
    day: {
      "--background": "#E7EEF9",
      "--card-bg": "#F2F6FD",
      "--primary": "#3758F9",
      "--on-primary": "#FFFFFF",
      "--accent": "#7CA3FF",
      "--on-accent": "#0B1B4A",
      "--text-primary": "#0F172A",
      "--text-secondary": "#475569"
    },
    night: {
      "--background": "#0F172A",
      "--card-bg": "#17223D",
      "--primary": "#4670FF",
      "--on-primary": "#0A1429",
      "--accent": "#7CA3FF",
      "--on-accent": "#0A1429",
      "--text-primary": "#E5EDFF",
      "--text-secondary": "#A8B3CF"
    }
  },
  {
    key: "mint",
    name: "Мятный рассвет",
    day: {
      "--background": "#E7FCF7",
      "--card-bg": "#DFF8F2",
      "--primary": "#2DD4BF",
      "--on-primary": "#073B37",
      "--accent": "#A7F3D0",
      "--on-accent": "#0B3A33",
      "--text-primary": "#134E4A",
      "--text-secondary": "#2F7F77"
    },
    night: {
      "--background": "#0F2F2B",
      "--card-bg": "#13433D",
      "--primary": "#14B8A6",
      "--on-primary": "#062A27",
      "--accent": "#0F766E",
      "--on-accent": "#E6FFFA",
      "--text-primary": "#CFFAF1",
      "--text-secondary": "#8ADFD1"
    }
  },
  {
    key: "sakura",
    name: "Цветущая сакура",
    day: {
      "--background": "#FFF3F6",
      "--card-bg": "#FFE8EF",
      "--primary": "#F472B6",
      "--on-primary": "#4A0F2B",
      "--accent": "#F9A8D4",
      "--on-accent": "#4C1531",
      "--text-primary": "#6D0F3A",
      "--text-secondary": "#B02D6F"
    },
    night: {
      "--background": "#3A0C24",
      "--card-bg": "#4A1230",
      "--primary": "#E04797",
      "--on-primary": "#2C0A1B",
      "--accent": "#F58BC7",
      "--on-accent": "#2C0A1B",
      "--text-primary": "#FFD9EA",
      "--text-secondary": "#F9A8D4"
    }
  },
  {
    key: "amber",
    name: "Тёплый янтарь",
    day: {
      "--background": "#FFF7ED",
      "--card-bg": "#FFEAD6",
      "--primary": "#F59E42",
      "--on-primary": "#3D1E03",
      "--accent": "#FDE68A",
      "--on-accent": "#3A2A06",
      "--text-primary": "#5C2B07",
      "--text-secondary": "#9A5C1A"
    },
    night: {
      "--background": "#2E1A06",
      "--card-bg": "#3B2208",
      "--primary": "#C8711F",
      "--on-primary": "#1A0E02",
      "--accent": "#E9B956",
      "--on-accent": "#1A1203",
      "--text-primary": "#FFE8C7",
      "--text-secondary": "#F5C98E"
    }
  },
  {
    key: "forest",
    name: "Глубокий лес",
    day: {
      "--background": "#F0FDF4",
      "--card-bg": "#E3FAE9",
      "--primary": "#22C55E",
      "--on-primary": "#062413",
      "--accent": "#BBF7D0",
      "--on-accent": "#0A2F1C",
      "--text-primary": "#14532D",
      "--text-secondary": "#317E52"
    },
    night: {
      "--background": "#0F2518",
      "--card-bg": "#143222",
      "--primary": "#1FA154",
      "--on-primary": "#041A0E",
      "--accent": "#35D47E",
      "--on-accent": "#051E10",
      "--text-primary": "#CFF6DF",
      "--text-secondary": "#90D8B3"
    }
  },
  {
    key: "fire",
    name: "Вечерний костёр",
    day: {
      "--background": "#FFF6F4",
      "--card-bg": "#FFE8E7",
      "--primary": "#EF4444",
      "--on-primary": "#3E0A0A",
      "--accent": "#FCA5A5",
      "--on-accent": "#3A0C0C",
      "--text-primary": "#7F1D1D",
      "--text-secondary": "#B63A3A"
    },
    night: {
      "--background": "#2B0E0E",
      "--card-bg": "#3A1212",
      "--primary": "#D22E2E",
      "--on-primary": "#1A0707",
      "--accent": "#F07171",
      "--on-accent": "#1A0707",
      "--text-primary": "#FFCFCF",
      "--text-secondary": "#F5A5A5"
    }
  },
  {
    key: "aurora",
    name: "Северное сияние",
    day: {
      "--background": "#F2F5FF",
      "--card-bg": "#E3E9FF",
      "--primary": "#6366F1",
      "--on-primary": "#0D113A",
      "--accent": "#A5B4FC",
      "--on-accent": "#101B46",
      "--text-primary": "#312E81",
      "--text-secondary": "#4B51A6"
    },
    night: {
      "--background": "#151A3A",
      "--card-bg": "#1D2450",
      "--primary": "#4950F2",
      "--on-primary": "#0A0E2E",
      "--accent": "#7E8FFF",
      "--on-accent": "#0A0E2E",
      "--text-primary": "#DDE2FF",
      "--text-secondary": "#A9B2FF"
    }
  }
];

const THEME_STORAGE_KEY = "saviora_theme_v2";
const THEME_MODE_KEY = "saviora_theme_mode_v2"; // day/night
const THEME_STD = "std"; // стандартная (системная)

const API_URL = 'https://deepseek-api-key.lexsnitko.workers.dev';
const JWT_KEY = 'saviora_jwt';

const MAX_LAST_TURNS_TO_SEND = 6;
const MAX_TURNS_BEFORE_SUMMARY = 8;
const MAX_BLOCKTEXT_LEN_TO_SEND = 4000;
const MAX_USER_INPUT_LEN = 1200; // ограничение на длину ввода

// === Централизованная сборка payload для анализа и толкования ===
function buildAnalyzePayload({
  fullHistory = [],
  blockText = '',
  rollingSummary = null,
  extraSystemPrompt = null,
  maxTurns = MAX_LAST_TURNS_TO_SEND,
  maxBlockTextLen = MAX_BLOCKTEXT_LEN_TO_SEND
} = {}) {
  // Обрезаем текст блока
  const trimmedBlockText = (blockText || '').slice(0, maxBlockTextLen);

  // Берём последние N сообщений
  const lastTurns = (fullHistory || [])
    .slice(-maxTurns)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '')
    }));

  // Собираем payload
  return {
    blockText: trimmedBlockText,
    lastTurns,
    rollingSummary: rollingSummary || null,
    extraSystemPrompt: extraSystemPrompt || null
  };
}

const state = {
  user: null,
  jwt: null,
  dreams: [],
  currentDream: null,
  blocks: [],
  currentBlock: null,
  chatHistory: {},
  uiStep: 1,
  modals: {},
  isLoading: false,
  trialDaysLeft: null,
  globalFinalInterpretation: null,
  importSession: null,
  isGenerating: false,
};

const BLOCK_COLORS = [
  "#6C63FF", "#00B894", "#00BFFF", "#FFA500", "#FF6F61",
  "#FFB347", "#FF8C00", "#A259F7", "#43E97B", "#FF5E62"
];

///////////////////////
// === УТИЛИТЫ === //
///////////////////////
const utils = {
  uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  },
  showToast(msg, type = 'info', timeout = 2600) {
    const toast = document.getElementById('toastNotice');
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#2563eb');
    toast.style.display = 'block';
    toast.style.bottom = '32px';
    toast.style.opacity = '0.97';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.bottom = '12px';
      setTimeout(() => { toast.style.display = 'none'; }, 350);
    }, timeout);
  },
  escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  },
  formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
  debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },
  clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },
  copyToClipboard(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    utils.showToast('Скопировано!', 'success');
  }
};
utils.lighten = function(hex, percent = 20) {
  let num = parseInt(hex.replace('#',''),16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = (num >> 8 & 0x00FF) + Math.round(2.55 * percent);
  let b = (num & 0x0000FF) + Math.round(2.55 * percent);
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  return "#" + (0x1000000 + (r<<16) + (g<<8) + b).toString(16).slice(1);
};

/**
 * Показывает тултип над кнопкой луны на 3 секунды.
 * @param {string} text - Текст тултипа.
 */
function showMoonTooltip(text = 'Можно получить толкование блока') {
  const tooltip = document.getElementById('moonTooltip');
  if (!tooltip) return;
  tooltip.textContent = text;
  tooltip.classList.add('show');
  tooltip.style.display = 'block';
  setTimeout(() => {
    tooltip.classList.remove('show');
    setTimeout(() => { tooltip.style.display = 'none'; }, 250);
  }, 3000);
}

///////////////////////
// === API === //
///////////////////////
const api = {
  async request(path, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && state.jwt) headers['Authorization'] = 'Bearer ' + state.jwt;
    let resp;
    try {
      resp = await fetch(API_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      utils.showToast('Ошибка соединения с сервером', 'error');
      throw e;
    }
    if (resp.status === 401) {
      auth.logout(true);
      throw new Error('401');
    }
    if (resp.status === 403) {
      utils.showToast('Пробный период истёк', 'error');
      ui.showTrialExpired();
      throw new Error('403');
    }
    if (resp.status === 402) {
      utils.showToast('Лимит исчерпан, попробуйте позже', 'error');
      throw new Error('402');
    }
    let data;
    try { data = await resp.json(); } catch { data = {}; }
    if (!resp.ok) {
      utils.showToast(data?.error || 'Ошибка сервера', 'error');
      throw new Error(data?.error || 'Ошибка');
    }
    return data;
  },
  register(email, password) {
    return api.request('/register', { method: 'POST', body: { email, password }, auth: false });
  },
  login(email, password) {
    return api.request('/login', { method: 'POST', body: { email, password }, auth: false });
  },
  getMe() {
    return api.request('/me');
  },
  getDreams() {
    return api.request('/dreams');
  },
  saveDream(dream) {
    if (dream.id) return api.request(`/dreams/${dream.id}`, { method: 'PUT', body: dream });
    return api.request('/dreams', { method: 'POST', body: dream });
  },
  deleteDream(id) {
    return api.request(`/dreams/${id}`, { method: 'DELETE' });
  },
  analyze({ blockText, lastTurns, rollingSummary, extraSystemPrompt }) {
    // Новый контракт: lastTurns, rollingSummary, extraSystemPrompt
    return api.request('/analyze', {
      method: 'POST',
      body: { blockText, lastTurns, rollingSummary, extraSystemPrompt }
    });
  },
  summarize({ history, blockText, existingSummary }) {
    return api.request('/summarize', {
      method: 'POST',
      body: { history, blockText, existingSummary }
    });
  }
};

///////////////////////
// === АВТОРИЗАЦИЯ === //
///////////////////////
const auth = {
  async tryAutoLogin() {
    const jwt = localStorage.getItem(JWT_KEY);
    if (!jwt) return false;
    state.jwt = jwt;
    try {
      const me = await api.getMe();
      state.user = me.email;
      state.trialDaysLeft = me.trialDaysLeft;
      return true;
    } catch {
      auth.logout();
      return false;
    }
  },
  async login(force = false) {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      document.getElementById('loginMsg').textContent = 'Введите email и пароль';
      return;
    }
    document.getElementById('loginMsg').textContent = '';
    try {
      const res = await api.login(email, password);
      state.jwt = res.token;
      localStorage.setItem(JWT_KEY, res.token);
      await auth.tryAutoLogin();
      await dreams.load();
      ui.showMain();
    } catch (e) {
      document.getElementById('loginMsg').textContent = 'Неверный email или пароль';
    }
  },
  async register() {
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!email || !password) {
      document.getElementById('registerMsg').textContent = 'Введите email и пароль';
      return;
    }
    document.getElementById('registerMsg').textContent = '';
    try {
      await api.register(email, password);
      utils.showToast('Регистрация успешна! Войдите.', 'success');
      document.getElementById('tabLogin').click();
    } catch (e) {
      document.getElementById('registerMsg').textContent = 'Пользователь уже существует';
    }
  },
  logout(silent = false) {
    state.jwt = null;
    state.user = null;
    state.dreams = [];
    state.currentDream = null;
    state.blocks = [];
    state.currentBlock = null;
    state.chatHistory = {};
    state.uiStep = 1;
    state.trialDaysLeft = null;
    state.globalFinalInterpretation = null;
    localStorage.removeItem(JWT_KEY);
    if (!silent) ui.showAuth();
  }
};

///////////////////////
// === СНЫ === //
///////////////////////
const dreams = {
  async load() {
    const list = await api.getDreams();
    // Восстанавливаем rollingSummary и turnsCount у блоков
    state.dreams = list.map(dream => ({
      ...dream,
      blocks: (dream.blocks || []).map(b => ({
        ...b,
        rollingSummary: b.rollingSummary || null,
        turnsCount: typeof b.turnsCount === 'number' ? b.turnsCount : 0
      }))
    })).sort((a, b) => b.date - a.date);
    ui.updateCabinetList();
    ui.updateStorageBar();
  },
  async saveCurrent() {
    if (!state.currentDream) return;
    const dream = {
      ...state.currentDream,
      blocks: state.blocks.map(b => ({
        ...b,
        chat: state.chatHistory[b.id] || [],
        finalInterpretation: b.finalInterpretation || null,
        rollingSummary: b.rollingSummary || null,
        turnsCount: typeof b.turnsCount === 'number' ? b.turnsCount : 0
      })),
      globalFinalInterpretation: state.globalFinalInterpretation || null,
    };
    const saved = await api.saveDream(dream);
    state.currentDream = saved;
    await dreams.load();
    utils.showToast('Сон сохранён', 'success');
  },
  async delete(id) {
    await api.deleteDream(id);
    await dreams.load();
    utils.showToast('Сон удалён', 'success');
  },
  loadToEditor(dream) {
  state.currentDream = { ...dream };
  state.blocks = (dream.blocks || []).map(b => ({
    ...b,
    finalInterpretation: typeof b.finalInterpretation === 'string' ? b.finalInterpretation : null,
    rollingSummary: b.rollingSummary || null,
    turnsCount: typeof b.turnsCount === 'number' ? b.turnsCount : 0
  }));
  state.globalFinalInterpretation = dream.globalFinalInterpretation || null;
  state.chatHistory = {};
  for (const b of state.blocks) {
    state.chatHistory[b.id] = (b.chat || []).map(m => {
      if (typeof m === 'string') return { role: 'user', content: m };
      if (m && typeof m === 'object' && m.role && m.content) return m;
      return { role: 'user', content: String(m) };
    });
  }
  state.uiStep = 1;
  ui.showMain();
  ui.setStep(1);
  document.getElementById('dream').value = dream.dreamText || '';
  utils.showToast('Сон загружен для редактирования', 'success');
    ui.updateFinalInterpretButton();
  }
};

window.state = state;

///////////////////////
// === БЛОКИ === //
///////////////////////
const blocks = {
  add(start, end, text) {
    for (const b of state.blocks) {
      if ((start < b.end && end > b.start)) {
        utils.showToast('Блоки не должны пересекаться', 'error');
        return false;
      }
    }
    const id = utils.uuid();
    const colorIndex = state.blocks.length % BLOCK_COLORS.length;
    const block = {
      id, start, end, text, chat: [],
      finalInterpretation: null,
      colorIndex,
      rollingSummary: null,
      turnsCount: 0
    };
    state.blocks.push(block);
    state.chatHistory[id] = [];
    ui.updateBlocks();
    return true;
  },

  addWhole() {
    const el = document.getElementById('dream');
    if (!el) return;
    const text = el.value; // без trim, берём как есть
    if (!text) return;

    // Чистим существующие блоки
    state.blocks = [];

    // Один блок от начала до полной длины
    const start = 0;
    const end = text.length;
    const ok = blocks.add(start, end, text);
    if (ok) {
      // ВАЖНО: сразу перерисовать dreamView
      if (typeof ui.renderDreamTiles === 'function') ui.renderDreamTiles();
    }
  },

  addFromTiles() {
    const dreamView = document.getElementById('dreamView');
    if (!dreamView) return;
    const selected = Array.from(dreamView.querySelectorAll('.tile.selected'));
    if (!selected.length) {
      utils.showToast('Выделите плиточки для блока', 'error');
      return;
    }
    const starts = selected.map(s => parseInt(s.dataset.start, 10));
    const ends = selected.map(s => parseInt(s.dataset.end, 10));
    const start = Math.min(...starts);
    const end = Math.max(...ends);

    // Проверка на пересечение диапазонов
    for (const b of state.blocks) {
      if (!(end <= b.start || start >= b.end)) {
        utils.showToast('Этот фрагмент пересекается с уже добавленным блоком', 'error');
        return;
      }
    }

    const text = document.getElementById('dream').value.slice(start, end);
    const ok = blocks.add(start, end, text);
    if (!ok) return;

    // Снять выделение
    selected.forEach(s => s.classList.remove('selected'));

    ui.renderDreamTiles(); // перерисовать dreamView после добавления
    utils.showToast('Блок добавлен', 'success');
  },

  remove(id) {
  state.blocks = state.blocks.filter(b => b.id !== id);
  delete state.chatHistory[id];
  if (state.currentBlock && state.currentBlock.id === id) state.currentBlock = null;
  ui.updateBlocks();
  ui.renderDreamTiles();
  ui.updateChat();
  ui.updateFinalInterpretButton(); // ← добавь эту строку!
},

  select(id) {
    state.currentBlock = state.blocks.find(b => b.id === id) || null;
    ui.updateBlocks();       // только панель чипсов
    ui.renderDreamTiles();   // отдельно — только dreamView
    ui.updateChat();         // обновить чат
    ui.updateBlockInterpretButton();
    ui.updateBlockNav();
    ui.updateSendButton();
  }
};

function refreshSelectedBlocksUnified() {
  const dreamView = document.getElementById('dreamView');
  const hadSelection = dreamView ? dreamView.querySelectorAll('.tile.selected').length > 0 : false;

  const confirmMsg = hadSelection
    ? 'Обновить выбранные блоки? Текущие блоки будут очищены, а выделения сброшены.'
    : 'Очистить все блоки и сбросить выделения?';

  if (!confirm(confirmMsg)) return;

  // 1) Полностью очистить блоки и текущий выбор/чаты/итог
  state.blocks = [];
  state.currentBlock = null;
  state.chatHistory = {};
  state.globalFinalInterpretation = null;

  // 2) Снять выделение и стили с плиток, если отрисованы
  if (dreamView) {
    dreamView.querySelectorAll('.tile.selected').forEach(s => {
      s.classList.remove('selected');
      s.style.background = '';
      s.style.color = '';
      s.style.borderRadius = '';
      s.style.boxShadow = '';
      s.style.margin = '';
      s.style.padding = '';
    });
  }

  // 3) Перерисовать UI
  if (typeof ui.updateBlocks === 'function') ui.updateBlocks();
  if (typeof ui.renderDreamTiles === 'function') ui.renderDreamTiles();
  if (typeof ui.updateChat === 'function') ui.updateChat();
  if (typeof ui.updateProgressMoon === 'function') ui.updateProgressMoon();
  if (typeof ui.updateFinalInterpretButton === 'function') ui.updateFinalInterpretButton();

  // Если были на шаге 3, а блоков больше нет — вернём на шаг 2
  if (typeof ui.setStep === 'function' && state.uiStep === 3) {
    ui.setStep(2);
  }

  utils.showToast('Блоки очищены и выделение сброшено', 'success');
}

///////////////////////
// === ЧАТ И AI === //
///////////////////////
const chat = {
  // Отправка пользовательского сообщения
  async sendUserMessage(msg) {
    console.log('sendUserMessage вызван', msg);
    if (!state.currentBlock) return;
    if (msg.length > MAX_USER_INPUT_LEN) {
      utils.showToast('Слишком длинное сообщение (макс. 1200 символов)', 'error');
      return;
    }
    const blockId = state.currentBlock.id;
    if (!state.chatHistory[blockId]) state.chatHistory[blockId] = [];
    // Миграция старых сообщений (если есть)
    state.chatHistory[blockId] = (state.chatHistory[blockId] || []).map(m => {
      if (typeof m === 'string') return { role: 'user', content: m };
      if (m && typeof m === 'object' && m.role && m.content) return m;
      return { role: 'user', content: String(m) };
    });
    state.chatHistory[blockId].push({ role: 'user', content: msg });
    ui.updateChat();
    const tooltip = document.getElementById('moonTooltip');
    if (tooltip) tooltip.classList.remove('show');
    await chat.sendToAI(blockId);
  },

  // Отправка истории блока в AI (обычный ход диалога)
  async sendToAI(blockId) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    ui.setThinking(true);
    try {
      // Миграция старых сообщений (если есть)
      state.chatHistory[blockId] = (state.chatHistory[blockId] || []).map(m => {
        if (typeof m === 'string') return { role: 'user', content: m };
        if (m && typeof m === 'object' && m.role && m.content) return m;
        return { role: 'user', content: String(m) };
      });
      const history = state.chatHistory[blockId] || [];
      const payload = buildAnalyzePayload({
  fullHistory: state.chatHistory[blockId], // вся история!
  blockText: block.text,
  rollingSummary: block.rollingSummary,
  extraSystemPrompt: null,
  maxTurns: MAX_LAST_TURNS_TO_SEND // только для API
});
      const res = await api.analyze(payload);
      let aiMsg = res?.choices?.[0]?.message?.content;
      if (!aiMsg || typeof aiMsg !== 'string' || !aiMsg.trim()) {
        aiMsg = 'Ошибка анализа: пустой ответ от сервера.';
      }
      state.chatHistory[blockId].push({ role: 'assistant', content: aiMsg });
      if (blockId === state.currentBlock?.id) {
  ui.updateBlockInterpretButton();
}

      block.turnsCount = (block.turnsCount || 0) + 1;

      if (block.turnsCount >= MAX_TURNS_BEFORE_SUMMARY || history.length > 20) {
        const resSum = await api.summarize({
          history,
          blockText: block.text,
          existingSummary: block.rollingSummary || ''
        });
        block.rollingSummary = resSum.summary || block.rollingSummary;
        block.turnsCount = 0;
      }

      ui.updateChat();
      ui.updateProgressMoon();
      if (state.chatHistory[blockId].length >= 20) utils.showToast('Достигнут лимит сообщений', 'warning');
    } catch (e) {
      console.error('[debug] error in sendToAI', e);
      state.chatHistory[blockId].push({ role: 'assistant', content: 'Ошибка анализа' });
      ui.updateChat();
    }
    ui.setThinking(false);
  },

  // Итоговое толкование блока
async blockInterpretation() {
  if (!state.currentBlock) {
    utils.showToast('Блок не выбран', 'error');
    return;
  }
  const block = state.currentBlock;
  const blockId = block.id;
  const history = state.chatHistory[blockId] || [];
  ui.setThinking(true);
  try {
    const payload = buildAnalyzePayload({
      fullHistory: history,
      blockText: block.text,
      rollingSummary: block.rollingSummary,
      extraSystemPrompt: "Сделай итоговое толкование этого блока сна. Не задавай вопросов, просто дай глубокий, развернутый анализ и интерпретацию на основе всей истории диалога.",
      maxTurns: 6
    });
    const res = await api.analyze(payload);
    let interpretation = res?.choices?.[0]?.message?.content;
    if (!interpretation || typeof interpretation !== 'string' || !interpretation.trim()) {
      interpretation = 'Ошибка: пустой ответ от сервера.';
    }
    block.finalInterpretation = interpretation;
    ui.updateChat();
    ui.updateBlockInterpretButton();      // обновляем состояние кнопки "Толкование"
    ui.updateFinalInterpretButton();      // обновляем состояние кнопки "Итог"
    utils.showToast('Толкование блока готово', 'success');
  } catch (e) {
    utils.showToast('Ошибка при толковании блока', 'error');
  }
  ui.setThinking(false);
},

// Итоговое толкование всего сна
async globalInterpretation() {
  if (!state.currentDream) {
    utils.showToast('Сон не выбран', 'error');
    return;
  }
  const dreamText = state.currentDream.dreamText || '';
  const allSummaries = state.blocks.map(b => b.rollingSummary).filter(Boolean).join('\n');
  ui.setThinking(true);
  try {
    const payload = {
      blockText: dreamText.slice(0, MAX_BLOCKTEXT_LEN_TO_SEND),
      lastTurns: [],
      rollingSummary: allSummaries || null,
      extraSystemPrompt: "Сделай итоговое толкование всего сна. Не задавай вопросов, просто дай глубокий, развернутый анализ и интерпретацию на основе всех блоков и их истории."
    };
    const res = await api.analyze(payload);
    let interpretation = res?.choices?.[0]?.message?.content;
    if (!interpretation || typeof interpretation !== 'string' || !interpretation.trim()) {
      interpretation = 'Ошибка: пустой ответ от сервера.';
    }
    state.globalFinalInterpretation = interpretation;
    ui.showFinalDialog();
    ui.updateFinalInterpretButton();      // обновляем состояние кнопки "Итог"
    utils.showToast('Итоговое толкование сна готово', 'success');
  } catch (e) {
    utils.showToast('Ошибка при итоговом толковании сна', 'error');
  }
  ui.setThinking(false);
}
};

///////////////////////
// === UI === //
///////////////////////
const ui = {
  showAuth() {
    document.getElementById('trialStartScreen').style.display = 'flex';
    document.getElementById('authCard').style.display = 'none';
    document.querySelector('.center-wrap').style.display = 'none';
    document.body.classList.remove('modal-open');
  },
  showMain() {
    document.getElementById('trialStartScreen').style.display = 'none';
    document.getElementById('authCard').style.display = 'none';
    document.querySelector('.center-wrap').style.display = 'flex';
    ui.setStep(1);
    ui.updateCabinetList();
    ui.updateStorageBar();
  },
  showTrialExpired() {
    ui.showAuth();
    utils.showToast('Пробный период истёк. Зарегистрируйте новый аккаунт.', 'error', 4000);
  },
  setStep(step) {
    state.uiStep = step;
    document.body.classList.toggle('step-3-active', step === 3);
    for (let i = 1; i <= 3; ++i) {
      document.getElementById('step' + i).style.display = (i === step) ? 'block' : 'none';
      document.getElementById('step' + i + '-indicator').classList.toggle('active', i === step);
      document.getElementById('step' + i + '-indicator').classList.toggle('completed', i < step);
    }
    // Прогресс-бар
    const filled = document.getElementById('progress-line-filled');
    filled.style.width = ((step - 1) * 50) + '%';
    if (step === 3) bindChatEvents();
    ui.updateSendButton();
  },

  updateBlocks() {
  // Не рендерим чипсы, просто очищаем
  const blocksDiv = document.getElementById('blocks');
  if (blocksDiv) blocksDiv.innerHTML = '';
},

  // Единственное место, которое рендерит dreamView
  renderDreamTiles() {
  const dreamView = document.getElementById('dreamView');
  if (!dreamView) return;

  const textEl = document.getElementById('dream');
  const text = (textEl && textEl.value) || '';
  dreamView.innerHTML = '';

  // --- Кликабельная фраза "Весь текст" ---
  const isWhole = state.blocks.length === 1 && state.blocks[0].start === 0 && state.blocks[0].end >= text.length;
  const wholeTextBtn = document.createElement('span');
  wholeTextBtn.className = 'inline-option' + (isWhole ? ' selected' : '');
  wholeTextBtn.textContent = 'Весь текст';
  wholeTextBtn.onclick = function() {
    if (state.blocks.length > 0) {
      utils.showToast('Нельзя выделить весь текст: уже начаты блоки', 'error');
      return;
    }
    blocks.addWhole();
    ui.renderDreamTiles();
  };
  wholeTextBtn.style.marginRight = '12px';

  if (!text) return;

  // Если есть единственный блок, покрывающий весь текст — рисуем один спан и выходим
  const fullBlock = state.blocks.length === 1 ? state.blocks[0] : null;
  if (fullBlock && fullBlock.start === 0 && fullBlock.end >= text.length) {
    const span = document.createElement('span');
    span.className = 'chip' + (state.currentBlock && state.currentBlock.id === fullBlock.id ? ' active' : '');
    span.style.background = utils.lighten(BLOCK_COLORS[fullBlock.colorIndex], 20);
    span.style.color = '#fff';
    span.onclick = () => blocks.select(fullBlock.id);
    span.textContent = text; // весь текст, без разрезов
    dreamView.appendChild(span);
    if (typeof updateAddWholeButtonState === 'function') updateAddWholeButtonState();
    return;
  }

  // Иначе — обычный режим: плитки для свободного текста, цельные спаны для готовых блоков
  let pos = 0;
  const sortedBlocksArr = [...state.blocks].sort((a, b) => a.start - b.start);

  while (pos < text.length) {
    const block = sortedBlocksArr.find(b => b.start === pos);
    if (block) {
      const span = document.createElement('span');
      span.className = 'chip' + (state.currentBlock && state.currentBlock.id === block.id ? ' active' : '');
      span.style.background = utils.lighten(BLOCK_COLORS[block.colorIndex], 20);
      span.style.color = '#fff';
      span.onclick = () => blocks.select(block.id);
      span.textContent = text.slice(block.start, block.end);
      dreamView.appendChild(span);
      pos = block.end;
    } else {
      // свободный участок текста до следующего блока
      const nextStarts = sortedBlocksArr.map(b => b.start).filter(s => s > pos);
      const nextBlockStart = Math.min(...nextStarts.concat([text.length]));
      const chunk = text.slice(pos, nextBlockStart);
      const tokens = chunk.match(/\S+|\s+/g) || [];
      let localPos = pos;

      tokens.forEach(token => {
        const isWord = /\S/.test(token);
        if (isWord) {
          const span = document.createElement('span');
          span.className = 'tile';
          span.textContent = token;
          span.dataset.start = String(localPos);
          span.dataset.end = String(localPos + token.length);
          // --- ВСТАВЬ ВОТ ЭТОТ ОБРАБОТЧИК ---
          span.onclick = function(e) {
            e.preventDefault();
            span.classList.toggle('selected');
            const selected = Array.from(dreamView.querySelectorAll('.tile.selected'));
            if (selected.length >= 2) {
              // Определяем диапазон
              const starts = selected.map(s => parseInt(s.dataset.start, 10));
              const ends = selected.map(s => parseInt(s.dataset.end, 10));
              const start = Math.min(...starts);
              const end = Math.max(...ends);
              // Проверка на пересечение
              for (const b of state.blocks) {
                if (!(end <= b.start || start >= b.end)) {
                  utils.showToast('Этот фрагмент пересекается с уже добавленным блоком', 'error');
                  // Снять выделение
                  selected.forEach(s => s.classList.remove('selected'));
                  return;
                }
              }
              const text = document.getElementById('dream').value.slice(start, end);
              const ok = blocks.add(start, end, text);
              if (ok) {
                // Снять выделение
                selected.forEach(s => s.classList.remove('selected'));
                ui.renderDreamTiles();
                utils.showToast('Блок добавлен', 'success');
              }
            } else {
              // Просто подсветка
              const nextColorIndex = state.blocks.length % BLOCK_COLORS.length;
              const nextColor = utils.lighten(BLOCK_COLORS[nextColorIndex], 20);
              document.querySelectorAll('.tile.selected').forEach(sel => {
                sel.style.background = nextColor;
                sel.style.color = '#fff';
              });
              document.querySelectorAll('.tile:not(.selected)').forEach(sel => {
                sel.style.background = '';
                sel.style.color = '';
              });
            }
          };
          // --- КОНЕЦ ОБРАБОТЧИКА ---
          dreamView.appendChild(span);
        } else {
          dreamView.appendChild(document.createTextNode(token));
        }
        localPos += token.length;
      });
      pos = nextBlockStart;
    }
  }

  // Синхронизировать цвет уже выделенных плиток
  const nextColorIndex = state.blocks.length % BLOCK_COLORS.length;
  const nextColor = utils.lighten(BLOCK_COLORS[nextColorIndex], 20);
  document.querySelectorAll('.tile.selected').forEach(sel => {
    sel.style.background = nextColor;
    sel.style.color = '#fff';
  });

  if (typeof updateAddWholeButtonState === 'function') updateAddWholeButtonState();
},

updateChat() {
  const chatDiv = document.getElementById('chat');
  chatDiv.innerHTML = '';
  if (!state.currentBlock) {
    document.getElementById('currentBlock').textContent = 'Блок не выбран';
    return;
  }
  document.getElementById('currentBlock').textContent = 'Блок: ' + (state.currentBlock.text.length > 40 ? state.currentBlock.text.slice(0, 40) + '…' : state.currentBlock.text);
  const history = state.chatHistory[state.currentBlock.id] || [];
  history.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'msg ' + (msg.role === 'user' ? 'user' : 'bot');
    div.textContent = msg.content;
    chatDiv.appendChild(div);
  });
  if (state.currentBlock.finalInterpretation) {
    const div = document.createElement('div');
    div.className = 'msg bot final';
    div.textContent = state.currentBlock.finalInterpretation;
    chatDiv.appendChild(div);
  }
  chatDiv.appendChild(document.createElement('div')).className = 'chat-stabilizer';
  setTimeout(() => {
    chatDiv.scrollTop = chatDiv.scrollHeight;
    ui.updateJumpToBottomVisibility();
    bindChatEvents();
  }, 0);
  
  ui.updateBlockInterpretButton();
  ui.updateBlockNav();
},

  updateBlockNav() {
  const prevDiv = document.getElementById('prevPreview');
  const nextDiv = document.getElementById('nextPreview');
  if (!prevDiv || !nextDiv) return;

  const blocksArr = state.blocks;
  const current = state.currentBlock;
  if (!blocksArr.length || !current) {
    prevDiv.classList.add('disabled');
    nextDiv.classList.add('disabled');
    prevDiv.querySelector('.label').textContent = '…';
    nextDiv.querySelector('.label').textContent = '';
    prevDiv.onclick = null;
    nextDiv.onclick = null;
    return;
  }

  const idx = blocksArr.findIndex(b => b.id === current.id);

  // --- Предыдущий блок ---
  if (idx > 0) {
    const prevBlock = blocksArr[idx - 1];
    prevDiv.classList.remove('disabled');
    prevDiv.querySelector('.label').textContent = prevBlock.text.length > 40 ? prevBlock.text.slice(0, 40) + '…' : prevBlock.text;
    prevDiv.onclick = async () => {
      blocks.select(prevBlock.id);
      ui.updateBlockNav();
      // --- Автозапуск AI, если чат пустой ---
      const blockId = prevBlock.id;
      if (!state.chatHistory[blockId] || state.chatHistory[blockId].length === 0) {
        try {
          await chat.sendToAI(blockId);
        } catch (e) {
          console.error('Ошибка при первом запросе к AI:', e);
        }
      }
    };
  } else {
    prevDiv.classList.add('disabled');
    prevDiv.querySelector('.label').textContent = '…';
    prevDiv.onclick = null;
  }

  // --- Следующий блок ---
  if (idx < blocksArr.length - 1) {
    const nextBlock = blocksArr[idx + 1];
    nextDiv.classList.remove('disabled');
    nextDiv.querySelector('.label').textContent = nextBlock.text.length > 40 ? nextBlock.text.slice(0, 40) + '…' : nextBlock.text;
    nextDiv.onclick = async () => {
      blocks.select(nextBlock.id);
      ui.updateBlockNav();
      // --- Автозапуск AI, если чат пустой ---
      const blockId = nextBlock.id;
      if (!state.chatHistory[blockId] || state.chatHistory[blockId].length === 0) {
        try {
          await chat.sendToAI(blockId);
        } catch (e) {
          console.error('Ошибка при первом запросе к AI:', e);
        }
      }
    };
  } else {
    nextDiv.classList.add('disabled');
    nextDiv.querySelector('.label').textContent = '';
    nextDiv.onclick = null;
  }
},
  setThinking(isThinking) {
  const thinkingEl = document.getElementById('thinking');
  if (!thinkingEl) return;
  thinkingEl.style.display = isThinking ? 'block' : 'none';
  if (isThinking) {
    thinkingEl.classList.add('sticky-thinking');
  } else {
    thinkingEl.classList.remove('sticky-thinking');
  }
},

updateProgressMoon(flash = false) {
  const moonBtn = document.getElementById('moonBtn');
  const block = state.currentBlock;
  if (!block) { moonBtn.innerHTML = ''; return; }
  const count = (state.chatHistory[block.id] || []).filter(m => m.role === 'user').length;

  // percent: 0 (пусто) ... 1 (полная луна)
  let percent = 0;
  if (count > 0) percent = Math.min(count / 10, 1);

  const r = 20, cx = 22, cy = 22;

  // Кратеры
  const craters = [
    [cx + 7, cy - 6, 2.5, "#b0b0b0", 0.45],
    [cx - 5, cy + 7, 1.7, "#888", 0.38],
    [cx + 10, cy + 4, 1.3, "#a0a0a0", 0.33],
    [cx - 8, cy - 4, 1.1, "#666", 0.35],
    [cx - 2, cy - 8, 1.6, "#bfc4cc", 0.5],
    [cx + 5, cy + 10, 1.2, "#888", 0.4],
    [cx + 2, cy - 12, 0.9, "#d1d5db", 0.32],
    [cx - 10, cy + 2, 1.8, "#6b7280", 0.28],
    [cx + 12, cy - 2, 1.4, "#9ca3af", 0.36],
    [cx - 6, cy - 10, 1.1, "#b0b0b0", 0.42],
    [cx + 8, cy + 8, 1.6, "#a3a3a3", 0.29],
    [cx - 12, cy + 8, 1.3, "#6b7280", 0.22],
    [cx + 13, cy - 8, 0.8, "#bfc4cc", 0.38],
    [cx - 13, cy - 7, 1.2, "#888", 0.31],
    [cx + 3, cy + 13, 1.5, "#b0b0b0", 0.27],
    [cx - 3, cy + 13, 1.1, "#6b7280", 0.19],
    [cx + 14, cy + 6, 0.9, "#a0a0a0", 0.21],
    [cx - 14, cy - 2, 1.0, "#9ca3af", 0.25],
    [cx + 6, cy - 14, 1.2, "#d1d5db", 0.23],
    [cx - 9, cy + 12, 1.4, "#888", 0.34],
  ];

  moonBtn.innerHTML = `
    <svg class="moon-svg${flash ? ' moon-flash' : ''}" viewBox="0 0 44 44" width="44" height="44">
      <defs>
        <filter id="moon-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="moonTexture" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e2e8f0"/>
          <stop offset="100%" stop-color="#bfc4cc"/>
        </radialGradient>
        <!-- Прямоугольная маска для заполнения слева-направо -->
        <mask id="phaseMask">
          <rect x="0" y="0" width="${44 * percent}" height="44" fill="white"/>
        </mask>
      </defs>
      <!-- Серый фон луны -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#moonTexture)" filter="url(#moon-glow)" />
      <!-- Заполнение луны (желтый цвет) -->
      ${count > 0 ? `
        <g mask="url(#phaseMask)">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffe066" opacity="0.85"/>
        </g>
      ` : ''}
      <!-- Кратеры всегда поверх! -->
      ${craters.map(([x, y, rad, color, op]) =>
        `<circle cx="${x}" cy="${y}" r="${rad}" fill="${color}" opacity="${op}"/>`
      ).join('')}
    </svg>
  `;
  if (flash) {
    moonBtn.querySelector('.moon-svg').classList.add('moon-flash');
    setTimeout(() => {
      moonBtn.querySelector('.moon-svg').classList.remove('moon-flash');
    }, 1600);
  }
},
updateBlockInterpretButton() {
  const btn = document.getElementById('menuBlockInterpret');
  const tooltip = document.getElementById('moonTooltip');
  const block = state.currentBlock;
  if (!btn) return;

  if (!block) {
    btn.disabled = true;
    btn.classList.remove('active');
    if (tooltip) tooltip.classList.remove('show');
    return;
  }

  const blockId = block.id;
  const history = state.chatHistory[blockId] || [];
  const userCount = history.filter(m => m.role === 'user').length;
  const assistantCount = history.filter(m => m.role === 'assistant').length;

  // Кнопка и тултип только если и user, и assistant >= 10
  if (userCount < 10 || assistantCount < 10) {
    btn.disabled = true;
    btn.classList.remove('active');
    if (tooltip) tooltip.classList.remove('show');
  } else {
    btn.disabled = false;
    btn.classList.add('active');
    // Тултип только если он ещё не показывался и assistantCount стало ровно 10
    if (
      tooltip &&
      !block._interpretTooltipShown &&
      assistantCount === 10 &&
      userCount >= 10
    ) {
      showMoonTooltip('Можно получить толкование блока');
      block._interpretTooltipShown = true;
    }
  }
},
  updateSendButton() {
  const btn = document.getElementById('sendAnswerBtn');
  const input = document.getElementById('userInput');
  if (!btn || !input) return;
  btn.disabled = state.isGenerating;
  input.disabled = state.isGenerating;
},
  updateFinalInterpretButton() {
  const btn = document.getElementById('menuFinalInterpret');
  if (!btn) return;

  // Считаем количество блоков с итоговым толкованием
  const interpretedBlocks = state.blocks.filter(
    b => typeof b.finalInterpretation === 'string' && b.finalInterpretation.trim()
  ).length;

  if (interpretedBlocks < 2) {
    btn.disabled = true;
    btn.classList.remove('active');
  } else {
    btn.disabled = false;
    btn.classList.add('active');
  }
},

  updateCabinetList() {
    const listDiv = document.getElementById('cabinetList');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    state.dreams.forEach(d => {
      const tile = document.createElement('div');
      tile.className = 'cabinet-tile';
      tile.innerHTML = `
        <span class="cabinet-date">${utils.formatDate(d.date)}</span>
        <span class="cabinet-preview">${utils.escapeHtml((d.dreamText || '').slice(0, 40))}</span>
        <button class="btn" style="background:#ef4444;color:#fff;" data-del="${d.id}">Удалить</button>
      `;
      // Клик по плитке (кроме кнопки "Удалить")
      tile.onclick = e => {
        if (e.target.closest('button')) return;
        ui.showDreamPreviewModal(d);
      };
      // Кнопка "Удалить"
      tile.querySelector('[data-del]').onclick = async e => {
        e.stopPropagation();
        if (confirm('Удалить этот сон?')) await dreams.delete(d.id);
      };
      listDiv.appendChild(tile);
    });
  },

  updateStorageBar() {
    const bar = document.getElementById('storageBar');
    const txt = document.getElementById('storageText');
    const used = state.dreams.length;
    const percent = Math.min(used / 50, 1) * 100;
    bar.style.width = percent + '%';
    txt.textContent = `${used}/50`;
    txt.style.color = percent > 90 ? '#ef4444' : (percent > 60 ? '#f59e0b' : '#22c55e');
  },

  showFinalDialog() {
    const dlg = document.getElementById('finalDialog');
    dlg.style.display = 'block';
    document.body.classList.add('modal-open');
    document.getElementById('finalDialogMain').textContent = state.globalFinalInterpretation || '';
    const blocksDiv = document.getElementById('finalDialogBlocks');
    blocksDiv.innerHTML = '';
    state.blocks.forEach((b, i) => {
      const div = document.createElement('div');
      div.className = 'msg bot final';
      div.textContent = `Блок ${i + 1}: ${b.finalInterpretation || 'Нет толкования'}`;
      blocksDiv.appendChild(div);
    });
  },

  closeFinalDialog() {
    document.getElementById('finalDialog').style.display = 'none';
    document.body.classList.remove('modal-open');
  },

  showCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'block';
    document.body.classList.add('modal-open');
    ui.updateCabinetList();
  },

  closeCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'none';
    document.body.classList.remove('modal-open');
  },

 // --- МОДАЛКА ПРОСМОТРА СНА ---
showDreamPreviewModal(dream) {
  const modal = document.getElementById('dreamPreviewModal');
  const textDiv = document.getElementById('dreamPreviewText');
  const interpDiv = document.getElementById('dreamPreviewInterpret');
  const interpWrap = document.getElementById('dreamPreviewInterpretWrap');
  textDiv.textContent = dream.dreamText || '';
  interpWrap.style.display = 'block';
  interpDiv.textContent = dream.globalFinalInterpretation || 'нет';
  interpDiv.style.color = dream.globalFinalInterpretation ? '#06213a' : '#94a3b8';
  state._previewedDream = dream;
  modal.style.display = 'block';
  document.body.classList.add('modal-open');

  // --- БЛОК ПОХОЖИХ ПРОИЗВЕДЕНИЙ ---
  let similarWrap = document.getElementById('dreamPreviewSimilarWrap');
  if (!similarWrap) {
    similarWrap = document.createElement('div');
    similarWrap.id = 'dreamPreviewSimilarWrap';
    // Вставляем сразу после interpWrap
    interpWrap.parentNode.insertBefore(similarWrap, interpWrap.nextSibling);
  }
  similarWrap.innerHTML = '';
  if (dream.similarArtworks && dream.similarArtworks.length) {
    similarWrap.innerHTML = `
      <div style="color:#94a3b8; font-size:14px; margin-bottom:4px;">Похожие произведения искусства</div>
      ${dream.similarArtworks.map(item => `
        <div class="similar-item" style="margin-bottom:12px;">
          <div style="font-weight:bold;">${utils.escapeHtml(item.title || '')}</div>
          <div style="color:#666;">${utils.escapeHtml(item.author || '')}${item.type ? ', ' + utils.escapeHtml(item.type) : ''}</div>
          <div style="margin-top:4px;">${utils.escapeHtml(item.desc || '')}</div>
          <div style="margin-top:4px;color:#2e7d32;">${utils.escapeHtml(item.value || '')}</div>
        </div>
      `).join('')}
    `;
  }
},

closeDreamPreviewModal() {
  document.getElementById('dreamPreviewModal').style.display = 'none';
  document.body.classList.remove('modal-open');
  state._previewedDream = null;
}
};
function showSimilarModal(similarArr, { dreamText, interpretation, onSave } = {}) {
  function flattenSimilarArtworks(arr) {
    if (Array.isArray(arr) && arr[0]?.title && arr[0]?.author) return arr;
    if (Array.isArray(arr) && arr[0]?.motif && Array.isArray(arr[0]?.works)) {
      let flat = [];
      for (const motifObj of arr) {
        for (const work of motifObj.works) {
          flat.push({
            title: work.title || '',
            type: work.type || '',
            author: work.author || '',
            desc: work.desc || '',
            value: work.value || ''
          });
        }
      }
      return flat.slice(0, 5);
    }
    return arr;
  }

  if (typeof similarArr === 'string') {
    const modal = document.createElement('div');
    modal.className = 'modal similar-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Похожие произведения искусства</h2>
        <div style="margin:18px 0;">${utils.escapeHtml(similarArr)}</div>
        <button class="close-modal btn primary" style="margin-top:18px;">Закрыть</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').onclick = () => modal.remove();
    return;
  }

  const arr = flattenSimilarArtworks(similarArr);

  let html = '';
  if (Array.isArray(arr) && arr.length > 0 && arr[0].title) {
    html = arr.map(item => `
      <div class="similar-item" style="margin-bottom:18px;">
        <div style="font-weight:bold;font-size:17px;">${utils.escapeHtml(item.title || '')}</div>
        <div style="color:#666;">
          ${utils.escapeHtml(item.author || '')}${item.type ? ', ' + utils.escapeHtml(item.type) : ''}
        </div>
        <div style="margin-top:4px;">${utils.escapeHtml(item.desc || '')}</div>
        <div style="margin-top:4px;color:#2e7d32;">${utils.escapeHtml(item.value || '')}</div>
      </div>
    `).join('');
  } else {
    html = `<div style="color:#888;">Похожих произведений не найдено.</div>`;
  }

  const modal = document.createElement('div');
  modal.className = 'modal similar-modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;margin:40px auto;background:var(--card-bg);border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:32px 24px;position:relative;">
      <button class="modal-close-btn" style="position:absolute;top:16px;right:16px;font-size:22px;background:none;border:none;cursor:pointer;" aria-label="Закрыть">×</button>
      <h2>Похожие произведения искусства</h2>
      <div style="margin:18px 0 0 0;">${html}</div>
      <button class="save-modal btn primary" style="margin-top:18px;width:100%;">Сохранить</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Крестик
  modal.querySelector('.modal-close-btn').onclick = () => modal.remove();

  // Кнопка "Сохранить"
  const saveBtn = modal.querySelector('.save-modal');
  saveBtn.onclick = async () => {
    if (typeof onSave === 'function') {
      saveBtn.disabled = true;
      await onSave(arr);
      saveBtn.disabled = false;
      modal.remove();
    }
  };
}


///////////////////////
// === ЭКСПОРТ/ИМПОРТ === //
///////////////////////
const session = {
  export(format = 'json') {
    const data = {
      dream: state.currentDream,
      blocks: state.blocks,
      chatHistory: state.chatHistory,
      globalFinalInterpretation: state.globalFinalInterpretation
    };
    let content, filename;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = 'saviora_session.json';
    } else {
      content = `Сон: ${data.dream?.dreamText || ''}\n\n`;
      data.blocks.forEach((b, i) => {
        content += `Блок ${i + 1}: ${b.text}\n`;
        (data.chatHistory[b.id] || []).forEach(m => {
          content += (m.role === 'user' ? 'Вы: ' : 'Saviora: ') + m.content + '\n';
        });
        content += `Толкование: ${b.finalInterpretation || ''}\n\n`;
      });
      content += `Итоговое толкование: ${data.globalFinalInterpretation || ''}\n`;
      filename = 'saviora_session.txt';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import(json) {
  try {
    const data = JSON.parse(json);
    if (!data.dream || !Array.isArray(data.blocks)) throw new Error();
    state.currentDream = data.dream;
    state.blocks = data.blocks;
    state.chatHistory = {};
    for (const blockId in (data.chatHistory || {})) {
      state.chatHistory[blockId] = (data.chatHistory[blockId] || []).map(m => {
        if (typeof m === 'string') return { role: 'user', content: m };
        if (m && typeof m === 'object' && m.role && m.content) return m;
        return { role: 'user', content: String(m) };
      });
    }
    state.globalFinalInterpretation = data.globalFinalInterpretation || null;
    ui.showMain();
    ui.setStep(1);
    document.getElementById('dream').value = data.dream.dreamText || '';
    utils.showToast('Сессия импортирована', 'success');
    ui.updateFinalInterpretButton();
    } catch {
      utils.showToast('Ошибка импорта', 'error');
    }
  }
};

///////////////////////
// === СОБЫТИЯ === //
///////////////////////
function bindEvents() {
  // --- АВТОРИЗАЦИЯ ---
  document.getElementById('startTrialBtn').onclick = () => {
    document.getElementById('trialStartScreen').style.display = 'none';
    document.getElementById('authCard').style.display = 'flex';
  };
  document.getElementById('showLoginLink').onclick = e => {
    e.preventDefault();
    document.getElementById('trialStartScreen').style.display = 'none';
    document.getElementById('authCard').style.display = 'flex';
    document.getElementById('tabLogin').click();
  };
  document.getElementById('tabLogin').onclick = () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('tabLogin').classList.add('primary');
    document.getElementById('tabRegister').classList.remove('primary');
  };
  document.getElementById('tabRegister').onclick = () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('tabRegister').classList.add('primary');
    document.getElementById('tabLogin').classList.remove('primary');
  };
  document.getElementById('loginForm').onsubmit = e => { e.preventDefault(); auth.login(); };
  document.getElementById('registerForm').onsubmit = e => { e.preventDefault(); auth.register(); };

  const addWholeFromHint = document.getElementById('addWholeFromHint');
if (addWholeFromHint) {
  addWholeFromHint.onclick = function() {
    if (state.blocks.length > 0) {
      utils.showToast('Нельзя выделить весь текст: уже начаты блоки', 'error');
      return;
    }
    blocks.addWhole();
    ui.renderDreamTiles();
  };
}

  // --- ШАГ 1 ---
  document.getElementById('step1MainBtn').onclick = async function() {
    const text = document.getElementById('dream').value.trim();
    if (!text) { utils.showToast('Введите текст сна', 'error'); return; }
    state.currentDream = { dreamText: text, title: '', blocks: [], globalFinalInterpretation: null };
    state.blocks = [];
    await dreams.saveCurrent();

    // Заменяем кнопку на "Далее →"
    const controls = document.getElementById('step1Controls');
    controls.innerHTML = `<button id="step1NextBtn" class="btn primary">Далее →</button>`;
    utils.showToast('Сон сохранён в кабинет', 'success');

    // Навешиваем обработчик на новую кнопку
    document.getElementById('step1NextBtn').onclick = function() {
      ui.setStep(2);
      ui.renderDreamTiles();
    };
  };

  // --- ШАГ 2 ---
document.getElementById('toStep3').onclick = async function() {
  if (!state.blocks.length) {
    utils.showToast('Добавьте хотя бы один блок', 'error');
    return;
  }

  // --- Логика выбора блока ---
  if (!state.currentBlock || !state.blocks.find(b => b.id === state.currentBlock.id)) {
    // Если блок не выбран или выбранный блок не найден (например, был удалён) — выбираем первый
    state.currentBlock = state.blocks[0];
  }
  // Если выбран — используем его

  ui.setStep(3);
  ui.updateChat();
  ui.updateProgressMoon();

  // --- Сразу отправляем первый запрос к AI ---
  const blockId = state.currentBlock.id;
  if (!state.chatHistory[blockId] || state.chatHistory[blockId].length === 0) {
    try {
      await chat.sendToAI(blockId);
    } catch (e) {
      console.error('Ошибка при первом запросе к AI:', e);
    }
  }
};

document.getElementById('backTo1Top').onclick = () => ui.setStep(1);
ui.renderDreamTiles();

// refreshInline — прямой обработчик
const refreshBtn = document.getElementById('refreshInline');
if (refreshBtn) {
  refreshBtn.onclick = refreshSelectedBlocksUnified;
}

 // --- ШАГ 3 ---
document.getElementById('backTo2Top').onclick = () => {
  ui.setStep(2);
  ui.renderDreamTiles();
};
document.getElementById('moonBtn').onclick = () => {
  const menu = document.getElementById('attachMenu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  // Скрыть tooltip при открытии меню
  const tooltip = document.getElementById('moonTooltip');
  if (tooltip) tooltip.classList.remove('show');
};
document.getElementById('menuBlockInterpret').onclick = async () => {
  await chat.blockInterpretation();
  document.getElementById('attachMenu').style.display = 'none';
};
document.getElementById('menuFinalInterpret').onclick = async () => {
  await chat.globalInterpretation();
  document.getElementById('attachMenu').style.display = 'none';
};
document.getElementById('jumpToBottom').onclick = () => {
  const chatDiv = document.getElementById('chat');
  chatDiv.scrollTop = chatDiv.scrollHeight;
};

  // --- КАБИНЕТ ---
  document.getElementById('openCabinetBtn').onclick = () => ui.showCabinetModal();
  document.getElementById('closeCabinetBtn').onclick = () => ui.closeCabinetModal();
  document.getElementById('logoutBtn').onclick = () => { auth.logout(); ui.closeCabinetModal(); };
  document.getElementById('clearCabinetBtn').onclick = async () => {
    if (confirm('Удалить все сны?')) {
      for (const d of state.dreams) await dreams.delete(d.id);
      ui.closeCabinetModal();
    }
  };

  // --- МОДАЛКИ ---
  document.getElementById('howToBtn').onclick = () => {
    document.getElementById('howToModal').style.display = 'block';
    document.body.classList.add('modal-open');
  };
  document.getElementById('closeHowToModal').onclick = () => {
    document.getElementById('howToModal').style.display = 'none';
    document.body.classList.remove('modal-open');
  };
  document.getElementById('howToModalOk').onclick = () => {
    document.getElementById('howToModal').style.display = 'none';
    document.body.classList.remove('modal-open');
  };
  document.getElementById('closeFinalDialog').onclick = () => ui.closeFinalDialog();

  // --- ЭКСПОРТ/ИМПОРТ ---
  document.getElementById('exportFinalDialogBtn').onclick = () => session.export('txt');
  document.getElementById('saveToCabinetBtn').onclick = async () => {
    await dreams.saveCurrent();
    ui.closeFinalDialog();
  };

  // --- Импорт через drag&drop (можно добавить кнопку) ---
  document.body.addEventListener('dragover', e => { e.preventDefault(); });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    if (!e.dataTransfer.files.length) return;
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = ev => session.import(ev.target.result);
    reader.readAsText(file);
  });

  // --- МОДАЛКА ПРОСМОТРА СНА ---
  document.getElementById('closeDreamPreviewBtn').onclick = () => ui.closeDreamPreviewModal();

  document.getElementById('loadDreamToEditorBtn').onclick = () => {
    const dream = state._previewedDream;
    if (!dream) return;
    dreams.loadToEditor(dream);
    ui.setStep(2);
    ui.renderDreamTiles();
    ui.closeDreamPreviewModal();
    ui.closeCabinetModal();
  };

  document.getElementById('downloadDreamBtn').onclick = () => {
    const dream = state._previewedDream;
    if (!dream) return;
    // Формируем txt
    let content = `Сон: ${dream.dreamText || ''}\n\n`;
    if (dream.globalFinalInterpretation) {
      content += `Итоговое толкование: ${dream.globalFinalInterpretation}\n`;
    }
    const filename = 'saviora_dream.txt';
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  document.getElementById('findSimilarBtn').onclick = async () => {
  const dream = state._previewedDream;
  if (!dream || !dream.dreamText) {
    utils.showToast('Нет текста сна', 'error');
    return;
  }
  // Показываем спиннер
  const btn = document.getElementById('findSimilarBtn');
  const oldHtml = btn.innerHTML;
  btn.innerHTML = `<span class="btn-spinner"></span>Поиск...`;
  btn.disabled = true;
  try {
    const resp = await fetch(API_URL + '/find_similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(state.jwt ? { 'Authorization': 'Bearer ' + state.jwt } : {}) },
      body: JSON.stringify({ summary: dream.dreamText })
    });
    if (!resp.ok) throw new Error('Ошибка поиска');
    const data = await resp.json();
    if (data.similar && data.similar.length) {
      showSimilarModal(data.similar, {
        dreamText: dream.dreamText,
        interpretation: dream.globalFinalInterpretation,
        onSave: async (similarArtworks) => {
          try {
            await api.saveDream({
              ...dream,
              similarArtworks: similarArtworks.slice(0, 5)
            });
            utils.showToast('Сон и подборка сохранены в личный кабинет', 'success');
            await dreams.load();
          } catch (e) {
            utils.showToast('Ошибка сохранения', 'error');
          }
        }
      });
    } else {
      showSimilarModal('Похожих сценариев не найдено');
    }
  } catch (e) {
    showSimilarModal('Ошибка поиска похожих сценариев');
  }
  btn.innerHTML = oldHtml;
  btn.disabled = false;
};

// --- Обработчик прокрутки чата для кнопки "вниз" ---
  const chatDiv = document.getElementById('chat');
  if (chatDiv) {
    chatDiv.addEventListener('scroll', ui.updateJumpToBottomVisibility);
  }
}

function bindChatEvents() {
  const sendBtn = document.getElementById('sendAnswerBtn');
  const input = document.getElementById('userInput');
  if (!sendBtn || !input) return;

  // Автоматический рост textarea
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  sendBtn.onclick = async () => {
    if (state.isGenerating) return; // Блокировка двойной отправки
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    state.isGenerating = true;
    ui.updateSendButton();
    try {
      await chat.sendUserMessage(msg);
    } finally {
      state.isGenerating = false;
      ui.updateSendButton();
    }
  };

  input.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.isGenerating) return;
      sendBtn.click();
    }
  };
}
// --- Автоматическое закрытие меню луны при клике вне ---
document.addEventListener('click', function(e) {
  const menu = document.getElementById('attachMenu');
  const moonBtn = document.getElementById('moonBtn');
  if (!menu || !moonBtn) return;
  // Если меню не открыто — ничего не делаем
  if (menu.style.display !== 'block') return;
  // Если клик по кнопке луны или по самому меню — не закрываем
  if (moonBtn.contains(e.target) || menu.contains(e.target)) return;
  // Иначе — закрываем меню
  menu.style.display = 'none';
  // И заодно скрываем тултип, если он был
  const tooltip = document.getElementById('moonTooltip');
  if (tooltip) tooltip.classList.remove('show');
});

// ====== ТЕМЫ: UI и логика ======

function updateThemeColorMeta() {
  const meta = document.getElementById('appThemeColor');
  if (!meta) return;
  const rootStyles = getComputedStyle(document.documentElement);
  const themeColor = rootStyles.getPropertyValue('--background').trim() || '#ffffff';
  meta.setAttribute('content', themeColor);
}

function applyTheme(themeKey, mode) {
  const theme = THEMES.find(t => t.key === themeKey);
  if (!theme) return;
  const vars = mode === "night" ? theme.night : theme.day;
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  updateThemeColorMeta();
  if (mode === "night") {
    document.documentElement.style.setProperty("--chat-bg", "rgba(30, 41, 59, 0.82)");
    document.documentElement.style.setProperty("--menu-bg", "rgba(30, 41, 59, 0.98)");
    document.documentElement.style.setProperty("--menu-text", "#f1f5f9");
    document.documentElement.style.setProperty("--border", "rgba(255,255,255,0.12)");
  } else {
    document.documentElement.style.setProperty("--chat-bg", "rgba(255, 255, 255, 0.92)");
    document.documentElement.style.setProperty("--menu-bg", "rgba(255, 255, 255, 0.98)");
    document.documentElement.style.setProperty("--menu-text", "#111827");
    document.documentElement.style.setProperty("--border", "rgba(0, 0, 0, 0.08)");
  }
  document.documentElement.setAttribute("data-theme-custom", themeKey);
  document.documentElement.setAttribute("data-theme", mode === "night" ? "dark" : "light");
}
function saveTheme(themeKey, mode) {
  localStorage.setItem("saviora_theme_v2", themeKey);
  localStorage.setItem("saviora_theme_mode_v2", mode);
}
function getSavedTheme() {
  const theme = localStorage.getItem("saviora_theme_v2") || "std";
  const mode = localStorage.getItem("saviora_theme_mode_v2") || (window.matchMedia('(prefers-color-scheme: dark)').matches ? "night" : "day");
  return { theme, mode };
}
function updateThemeButton(themeKey, mode) {
  const btn = document.getElementById("themeToggle");
  const theme = THEMES.find(t => t.key === themeKey);
  const icon = mode === "night" ? "🌙" : "☀️";
  btn.querySelector("#themeIcon").textContent = icon;
  btn.querySelector("#themeName").textContent = theme?.name || "Тема";
}
function renderThemeMenu(selectedKey, selectedMode) {
  const menu = document.getElementById("themeMenuList");
  menu.innerHTML = "";
  THEMES.forEach(theme => {
    const chip = document.createElement("div");
    chip.className = "theme-chip" + (selectedKey === theme.key ? " active" : "");
    chip.innerHTML = `
      <span class="chip-preview">
        <div class="half left" style="background:${theme.day["--background"]};"></div>
        <div class="half right" style="background:${theme.night["--background"]};"></div>
      </span>
      <span class="chip-title">${theme.name}</span>
    `;
    chip.onclick = (e) => {
      e.stopPropagation();
      saveTheme(theme.key, selectedMode);
      applyTheme(theme.key, selectedMode);
      updateThemeButton(theme.key, selectedMode);
      document.getElementById("themeMenu").style.display = "none";
    };
    menu.appendChild(chip);
  });
}
function initThemeUI() {
  const btn = document.getElementById("themeToggle");
  const menuIcon = document.getElementById("themeMenuIcon");
  const menu = document.getElementById("themeMenu");
  const themeName = document.getElementById("themeName");

  // Инициализация при загрузке
  const { theme, mode } = getSavedTheme();
  applyTheme(theme, mode);
  updateThemeButton(theme, mode);

  // Клик по основной части кнопки (кроме подушки)
  btn.onclick = (e) => {
    if (e.target === menuIcon) return;
    e.stopPropagation();
    // Если меню открыто — просто закрываем его
    if (menu.style.display === "block") {
      menu.style.display = "none";
      btn.classList.remove("theme-menu-open");
      return;
    }
    // Переключение светлая/тёмная
    const { theme, mode } = getSavedTheme();
    const newMode = mode === "night" ? "day" : "night";
    saveTheme(theme, newMode);
    applyTheme(theme, newMode);
    updateThemeButton(theme, newMode);
    // Название не показываем!
    btn.classList.remove("theme-menu-open");
  };

  // Клик по подушке — открывает/закрывает меню
  menuIcon.onclick = (e) => {
    e.stopPropagation();
    const { theme, mode } = getSavedTheme();
    renderThemeMenu(theme, mode);
    const isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    btn.classList.toggle("theme-menu-open", !isOpen);
  };

  // Клик вне меню — закрывает меню
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = "none";
      btn.classList.remove("theme-menu-open");
    }
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
}
// === ИНИЦИАЛИЗАЦИЯ === //
async function init() {
  bindEvents();
  initThemeUI(); // ← только одна строка!
  if (await auth.tryAutoLogin()) {
    await dreams.load();
    ui.showMain();
  } else {
    ui.showAuth();
  }
  ui.updateSendButton();
}

window.DEV_LOGS = true;
init();
