
const API_URL = 'https://deepseek-api-key.lexsnitko.workers.dev';
const JWT_KEY = 'saviora_jwt';

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
};

const BLOCK_COLORS = [
  "#6C63FF", // фиолетовый
  "#00B894", // зелёный
  "#00BFFF", // голубой
  "#FFA500", // оранжевый
  "#FF6F61", // коралловый
  "#FFB347", // мягкий оранжевый
  "#FF8C00", // тёмно-оранжевый
  "#A259F7", // сиреневый
  "#43E97B", // салатовый
  "#FF5E62"  // розовый
];

///////////////////////
// === УТИЛИТЫ === //
///////////////////////
const utils = {
  uuid() {
    // Генерация простого uuid v4
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
  // hex: "#RRGGBB"
  let num = parseInt(hex.replace('#',''),16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = (num >> 8 & 0x00FF) + Math.round(2.55 * percent);
  let b = (num & 0x0000FF) + Math.round(2.55 * percent);
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  return "#" + (0x1000000 + (r<<16) + (g<<8) + b).toString(16).slice(1);
};

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
  analyze({ blockText, history, extraSystemPrompt }) {
    return api.request('/analyze', { method: 'POST', body: { blockText, history, extraSystemPrompt } });
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
    state.dreams = list.sort((a, b) => b.date - a.date);
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
        finalInterpretation: b.finalInterpretation || null
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
    state.blocks = (dream.blocks || []).map(b => ({ ...b }));
    state.globalFinalInterpretation = dream.globalFinalInterpretation || null;
    state.chatHistory = {};
    for (const b of state.blocks) {
      state.chatHistory[b.id] = (b.chat || []).map(m => ({ ...m }));
    }
    state.uiStep = 1;
    ui.showMain();
    ui.setStep(1);
    document.getElementById('dream').value = dream.dreamText || '';
    utils.showToast('Сон загружен для редактирования', 'success');
  }
};

///////////////////////
// === БЛОКИ === //
///////////////////////
const blocks = {
  add(start, end, text) {
    // Проверка на пересечение диапазонов
    for (const b of state.blocks) {
      if ((start < b.end && end > b.start)) {
        utils.showToast('Блоки не должны пересекаться', 'error');
        return false;
      }
    }
    const id = utils.uuid();
    const colorIndex = state.blocks.length % BLOCK_COLORS.length;
    const block = { id, start, end, text, chat: [], finalInterpretation: null, colorIndex };
    state.blocks.push(block);
    state.chatHistory[id] = [];
    ui.updateBlocks();
    return true;
  },
  addWhole() {
  const el = document.getElementById('dream');
  if (!el) return;
  // Берём текст как есть, без trim
  const text = el.value;
  if (!text) return;

  // На всякий случай очистим существующие блоки перед созданием “весь текст”
  state.blocks = [];

  // Один блок от начала до полной длины
  const start = 0;
  const end = text.length;
  blocks.add(start, end, text);
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
  blocks.add(start, end, text);

  // Снять выделение
  selected.forEach(s => s.classList.remove('selected'));
  ui.renderDreamTiles();
  utils.showToast('Блок добавлен', 'success');
},
  remove(id) {
    state.blocks = state.blocks.filter(b => b.id !== id);
    delete state.chatHistory[id];
    if (state.currentBlock && state.currentBlock.id === id) state.currentBlock = null;
    ui.updateBlocks();
  },
  select(id) {
    state.currentBlock = state.blocks.find(b => b.id === id);
    ui.updateBlocks();
    ui.updateChat();
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
  async sendUserMessage(msg) {
    if (!state.currentBlock) return;
    const blockId = state.currentBlock.id;
    if (!state.chatHistory[blockId]) state.chatHistory[blockId] = [];
    state.chatHistory[blockId].push({ role: 'user', content: msg });
    ui.updateChat();
    await chat.sendToAI(blockId);
  },
  async sendToAI(blockId) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    ui.setThinking(true);
    try {
      const history = state.chatHistory[blockId] || [];
      const res = await api.analyze({ blockText: block.text, history });
      const aiMsg = res?.choices?.[0]?.message?.content || 'Ошибка анализа';
      state.chatHistory[blockId].push({ role: 'assistant', content: aiMsg });
      ui.updateChat();
      ui.updateProgressMoon();
      if (state.chatHistory[blockId].length >= 20) utils.showToast('Достигнут лимит сообщений', 'warning');
    } catch (e) {
      state.chatHistory[blockId].push({ role: 'assistant', content: 'Ошибка анализа' });
      ui.updateChat();
    }
    ui.setThinking(false);
  },
  async blockInterpretation() {
    if (!state.currentBlock) return;
    const blockId = state.currentBlock.id;
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    ui.setThinking(true);
    try {
      const history = state.chatHistory[blockId] || [];
      const res = await api.analyze({ blockText: block.text, history, extraSystemPrompt: 'Сделай итоговое толкование этого блока сна. Не задавай вопросов, только вывод.' });
      const final = res?.choices?.[0]?.message?.content || 'Ошибка толкования';
      block.finalInterpretation = final;
      ui.updateChat();
      ui.updateProgressMoon(true);
      utils.showToast('Толкование блока готово', 'success');
    } catch (e) {
      utils.showToast('Ошибка толкования блока', 'error');
    }
    ui.setThinking(false);
  },
  async globalInterpretation() {
    if (!state.currentDream) return;
    ui.setThinking(true);
    try {
      const allBlocks = state.blocks.map(b => ({
        text: b.text,
        final: b.finalInterpretation || '',
        chat: state.chatHistory[b.id] || []
      }));
      const dreamText = state.currentDream.dreamText;
      const prompt = 'Сделай итоговое толкование всего сна, учитывая все блоки и их толкования. Не задавай вопросов, только вывод.';
      const res = await api.analyze({ blockText: dreamText, history: [], extraSystemPrompt: prompt });
      state.globalFinalInterpretation = res?.choices?.[0]?.message?.content || 'Ошибка итогового толкования';
      ui.showFinalDialog();
    } catch (e) {
      utils.showToast('Ошибка итогового толкования', 'error');
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
    for (let i = 1; i <= 3; ++i) {
      document.getElementById('step' + i).style.display = (i === step) ? 'block' : 'none';
      document.getElementById('step' + i + '-indicator').classList.toggle('active', i === step);
      document.getElementById('step' + i + '-indicator').classList.toggle('completed', i < step);
    }
    // Прогресс-бар
    const filled = document.getElementById('progress-line-filled');
    filled.style.width = ((step - 1) * 50) + '%';
  },
  updateBlocks() {
  const blocksDiv = document.getElementById('blocks');
  blocksDiv.innerHTML = '';
  state.blocks.forEach(b => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (state.currentBlock && state.currentBlock.id === b.id ? ' active' : '');
    chip.textContent = b.text.length > 40 ? b.text.slice(0, 40) + '…' : b.text;
    chip.onclick = () => blocks.select(b.id);
    chip.style.background = utils.lighten(BLOCK_COLORS[b.colorIndex], 20);
    chip.style.color = '#fff';
    blocksDiv.appendChild(chip);
  });

  // Обновить dreamView
  const dreamView = document.getElementById('dreamView');
  const text = document.getElementById('dream').value; // берём как есть, без trim
  dreamView.innerHTML = '';
  let last = 0;

  // не мутируем исходный массив при каждом рендере
  const sorted = [...state.blocks].sort((a, b) => a.start - b.start);

  sorted.forEach(b => {
    // обычный текст до блока
    if (b.start > last) {
      const span = document.createElement('span');
      span.textContent = text.slice(last, b.start);
      dreamView.appendChild(span);
    }

    // сам блок
    const blockSpan = document.createElement('span');
    blockSpan.className = 'chip active';
    blockSpan.style.background = BLOCK_COLORS[b.colorIndex];
    blockSpan.style.color = '#fff';
    blockSpan.onclick = () => blocks.select(b.id);

    const blockText = text.slice(b.start, b.end);
    const words = blockText.match(/\S+|\s+/g) || [];
    blockSpan.innerHTML = words.map((w, i) => {
      if (!/\S/.test(w)) return w;
      if (i === 0 || i === words.length - 1) {
        return `<span style="color:${BLOCK_COLORS[b.colorIndex]};font-weight:bold;">${utils.escapeHtml(w)}</span>`;
      }
      return utils.escapeHtml(w);
    }).join('');
    dreamView.appendChild(blockSpan);

    // Кнопка "Добавить блок" для выбранного блока
    if (state.currentBlock && state.currentBlock.id === b.id) {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Добавить блок';
      addBtn.className = 'btn secondary';
      addBtn.style.marginLeft = '8px';
      addBtn.onclick = (e) => {
        e.stopPropagation();
        blocks.addFromTiles();
      };
      dreamView.appendChild(addBtn);
    }

    last = b.end;
  });

  // ДОБАВЛЯЕМ остаток текста после последнего блока, если он есть
  if (last < text.length) {
    const span = document.createElement('span');
    span.textContent = text.slice(last);
    dreamView.appendChild(span);
  }
},
  renderDreamTiles() {
  const dreamView = document.getElementById('dreamView');
  if (!dreamView) return;
  const text = document.getElementById('dream').value || '';
  dreamView.innerHTML = '';
  if (!text) return;

  let pos = 0;
  // Сортируем блоки по start
  const sortedBlocks = [...state.blocks].sort((a, b) => a.start - b.start);

  while (pos < text.length) {
    // Проверяем, начинается ли тут блок
    const block = sortedBlocks.find(b => b.start === pos);
    if (block) {
      // Один span на весь блок
      const span = document.createElement('span');
      span.className = 'chip active';
      span.style.background = utils.lighten(BLOCK_COLORS[block.colorIndex], 20);
      span.style.color = '#fff';
      span.onclick = () => blocks.select(block.id);
      span.textContent = text.slice(block.start, block.end);
      dreamView.appendChild(span);
      pos = block.end;
    } else {
      // Обычный текст (не в блоке)
      let nextBlockStart = Math.min(...sortedBlocks.map(b => b.start).filter(s => s > pos).concat([text.length]));
      // Разбиваем на слова и пробелы, чтобы плитки для выделения работали как раньше
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
          span.onclick = function(e) {
            e.preventDefault();
            span.classList.toggle('selected');
            // Подсвечиваем выделенные мягким цветом будущего блока
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
          };
          dreamView.appendChild(span);
        } else {
          dreamView.appendChild(document.createTextNode(token));
        }
        localPos += token.length;
      });
      pos = nextBlockStart;
    }
  }

  // После рендера всех плиток (на случай если выделение уже есть)
  const nextColorIndex = state.blocks.length % BLOCK_COLORS.length;
  const nextColor = utils.lighten(BLOCK_COLORS[nextColorIndex], 20);
  document.querySelectorAll('.tile.selected').forEach(sel => {
    sel.style.background = nextColor;
    sel.style.color = '#fff';
  });
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
    chatDiv.scrollTop = chatDiv.scrollHeight;
  },
  setThinking(isThinking) {
    document.getElementById('thinking').style.display = isThinking ? 'block' : 'none';
  },
  updateProgressMoon(flash = false) {
    // Анимация луны (SVG) — flash при flash=true
    const moonBtn = document.getElementById('moonBtn');
    const block = state.currentBlock;
    if (!block) { moonBtn.innerHTML = ''; return; }
    const count = (state.chatHistory[block.id] || []).filter(m => m.role === 'user').length;
    let percent = utils.clamp(count / 10, 0, 1);
    let color = percent === 1 ? '#10b981' : '#2563eb';
    moonBtn.innerHTML = `
      <svg class="moon-svg${flash ? ' moon-flash' : ''}" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="#fffbe6" stroke="${color}" stroke-width="3"/>
        <path d="M22 2
          a 20 20 0 1 0 0.00001 0"
          fill="none" stroke="#e2e8f0" stroke-width="3"/>
        <path d="M22 2
          a 20 20 0 ${percent > 0.5 ? 1 : 0} 1 ${20 * Math.sin(2 * Math.PI * percent)} ${20 - 20 * Math.cos(2 * Math.PI * percent)}"
          fill="none" stroke="${color}" stroke-width="3"/>
        <text x="22" y="28" text-anchor="middle" font-size="15" fill="${color}" font-weight="bold">${count}/10</text>
      </svg>
    `;
    if (flash) {
      moonBtn.querySelector('.moon-svg').classList.add('moon-flash');
      setTimeout(() => {
        moonBtn.querySelector('.moon-svg').classList.remove('moon-flash');
      }, 1600);
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
},
  closeDreamPreviewModal() {
    document.getElementById('dreamPreviewModal').style.display = 'none';
    document.body.classList.remove('modal-open');
    state._previewedDream = null;
  }
};

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
      state.chatHistory = data.chatHistory || {};
      state.globalFinalInterpretation = data.globalFinalInterpretation || null;
      ui.showMain();
      ui.setStep(1);
      document.getElementById('dream').value = data.dream.dreamText || '';
      utils.showToast('Сессия импортирована', 'success');
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
document.getElementById('addBlock').onclick = () => {
  blocks.addFromTiles();
};
document.getElementById('addWholeBlock').onclick = () => {
  // 1) Запрет, если уже есть хотя бы один блок
  if (state.blocks.length > 0) {
    utils.showToast('Нельзя выделить весь текст: уже начаты блоки', 'error');
    return;
  }
  // 2) Дополнительно запретим, если сейчас выделены плитки (начато выделение)
  const dreamView = document.getElementById('dreamView');
  if (dreamView && dreamView.querySelector('.tile.selected')) {
    utils.showToast('Сначала снимите выделение плиток', 'error');
    return;
  }
  blocks.addWhole();
};
document.getElementById('toStep3').onclick = () => {
  if (!state.blocks.length) { utils.showToast('Добавьте хотя бы один блок', 'error'); return; }
  state.currentBlock = state.blocks[0];
  ui.setStep(3);
  ui.updateChat();
  ui.updateProgressMoon();
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
  document.getElementById('sendAnswerBtn').onclick = async () => {
    const input = document.getElementById('userInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    await chat.sendUserMessage(msg);
  };
  document.getElementById('userInput').onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('sendAnswerBtn').click();
    }
  };
  document.getElementById('moonBtn').onclick = () => {
    const menu = document.getElementById('attachMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  };
  document.getElementById('menuBlockInterpret').onclick = async () => {
    await chat.blockInterpretation();
    document.getElementById('attachMenu').style.display = 'none';
  };
  document.getElementById('menuFinalInterpret').onclick = async () => {
    await chat.globalInterpretation();
    document.getElementById('attachMenu').style.display = 'none';
  };
  document.getElementById('menuSaveToCabinet').onclick = async () => {
    await dreams.saveCurrent();
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
}

// === ИНИЦИАЛИЗАЦИЯ === //
async function init() {
  bindEvents();
  if (await auth.tryAutoLogin()) {
    await dreams.load();
    ui.showMain();
  } else {
    ui.showAuth();
  }
}


init();
