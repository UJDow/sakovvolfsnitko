
const API_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
let userId = localStorage.getItem('snova_userid');
let token = localStorage.getItem('snova_token');

async function apiRequest(url, data) {
  const token = localStorage.getItem('snova_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  if (res.status === 401) {
    localStorage.removeItem('snova_token');
    localStorage.removeItem('snova_userid');
    document.body.classList.add('pre-auth');
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

// Получить профиль пользователя с сервера
async function loadProfileFromServer(userId) {
  return await apiRequest(`${API_URL}/api/profile/get`, { userId });
}

async function migrateLocalToServer(userId) {
  const oldHistory = JSON.parse(localStorage.getItem('saviora_cabinet') || '[]');
  if (!oldHistory.length) return;
  for (const dream of oldHistory) {
    await saveDreamToServer(userId, dream);
  }
  // localStorage.removeItem('saviora_cabinet'); // по желанию
}

async function registerUser(email, username, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
  });
  return await res.json();
}

async function loginUser(emailOrUsername, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password })
  });
  return await res.json();
}

// Сохранить профиль пользователя на сервер
async function saveProfileToServer(user) {
  return await apiRequest(`${API_URL}/api/profile/save`, { user });
}

// Получить историю снов с сервера
async function loadHistoryFromServer(userId) {
  return await apiRequest(`${API_URL}/api/history/get`, { userId });
}

// Сохранить новый сон на сервер
async function saveDreamToServer(userId, dream) {
  await apiRequest(`${API_URL}/api/history/save`, { userId, dream });
}


let isViewingFromCabinet = false;

/* ====== Палитра блоков ====== */
const BLOCK_COLORS = ['#ffd966', '#a4c2f4', '#b6d7a8', '#f4cccc', '#d9d2e9'];

const MOON_MAX_ANSWERS = 10;

/* ====== Глобальное состояние ====== */
const state = {
  dreamText: '',
  blocks: [],
  currentBlockId: null,
  nextBlockId: 1,
  currentStep: 1,
  isThinking: false,
  globalFinalInterpretation: null,
  userSelectedBlock: false
};

let currentSelectionColor = null;
let currentDreamId = null; // id текущего сна в кабинете, с которым сейчас работаем

/* ====== Утилиты DOM ====== */
function byId(id) { return document.getElementById(id); }
function onClick(id, handler) {
  const el = byId(id);
  if (el) {
    el.onclick = null;
    el.removeEventListener('click', el._handler);
    el._handler = handler;
    el.addEventListener('click', handler);
  }
}
function onChange(id, handler) {
  const el = byId(id);
  if (el) {
    el.onchange = null;
    el.removeEventListener('change', el._handler);
    el._handler = handler;
    el.addEventListener('change', handler);
  }
}
function raf(fn){ return new Promise(r=>requestAnimationFrame(()=>{ fn(); r(); })); }

/* ====== Динамическая кнопка шага 1 ====== */
function setStep1BtnToSave() {
  const btn = byId('step1MainBtn');
  if (!btn) return;
  btn.textContent = 'Сохранить в кабинет';
  btn.classList.remove('secondary');
  btn.classList.add('primary');
  btn.onclick = async () => {
    const dreamEl = byId('dream');
    const text = dreamEl ? dreamEl.value.trim() : '';
    if (!text) { alert('Введите текст сна!'); return; }
    if (currentDreamId) {
      setStep1BtnToNext();
      return;
    }
    // Новый сон
    const newDream = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      date: Date.now(),
      dreamText: text,
      blocks: [],
      globalFinalInterpretation: null
    };
    await saveDreamToServer(userId, newDream);
    currentDreamId = newDream.id;
    gtag('event', 'save_dream', {
      event_category: 'dream',
      event_label: 'Сохранён сон',
      dream_id: currentDreamId
    });
    setStep1BtnToNext();
  };
}

function setStep1BtnToNext() {
  const btn = byId('step1MainBtn');
  if (!btn) return;
  btn.textContent = 'Далее →';
  btn.classList.remove('secondary');
  btn.classList.add('primary');
  btn.onclick = () => {
    if (!currentDreamId) {
      alert('Сначала сохраните сон!');
      setStep1BtnToSave();
      return;
    }
    const dreamEl = byId('dream');
    state.dreamText = dreamEl ? dreamEl.value : '';
    showStep(2);
    renderDreamView();
    resetSelectionColor();
    updateProgressIndicator();
  };
}

/* ====== Луна-прогресс ====== */
function renderMoonProgress(userAnswersCount = 0, max = 10, isFlash = false, theme = 'light') {
  const moonBtn = document.getElementById('moonBtn');
  if (!moonBtn) return;
  const phase = Math.min(userAnswersCount / max, 1);

  const goldGlow = {
    stop85: theme === 'dark' ? '#a5b4fc' : '#f6e27a',
    stop100: theme === 'dark' ? '#6366f1' : '#eab308',
    opacity: theme === 'dark' ? 0.32 : 0.22
  };

  const craters = [
    {cx: 8, cy: 10, r: 2.6, opacity: 0.22},
    {cx: 20, cy: 8, r: 2.1, opacity: 0.19},
    {cx: 15, cy: 20, r: 2.3, opacity: 0.21},
    {cx: 12, cy: 16, r: 1.3, opacity: 0.16},
    {cx: 18, cy: 14, r: 1.1, opacity: 0.15},
    {cx: 22, cy: 18, r: 1.4, opacity: 0.17},
    {cx: 10, cy: 22, r: 1.2, opacity: 0.14},
    {cx: 16, cy: 10, r: 0.7, opacity: 0.12},
    {cx: 24, cy: 12, r: 0.6, opacity: 0.11},
    {cx: 19, cy: 22, r: 0.8, opacity: 0.13},
    {cx: 13, cy: 19, r: 0.5, opacity: 0.10},
    {cx: 21, cy: 16, r: 0.6, opacity: 0.11},
    {cx: 17, cy: 18, r: 0.4, opacity: 0.09},
    {cx: 18, cy: 19, r: 0.3, opacity: 0.08},
    {cx: 19, cy: 18, r: 0.4, opacity: 0.09},
    {cx: 14, cy: 13, r: 0.5, opacity: 0.10},
    {cx: 22, cy: 21, r: 0.5, opacity: 0.10},
    {cx: 12, cy: 21, r: 0.4, opacity: 0.09},
    {cx: 20, cy: 20, r: 0.3, opacity: 0.08}
  ];

  const moonBaseColor = '#b0b3b8';
  const moonProgressColor = '#44474a';
  const craterColor = '#888a8d';

  const svg = `
    <svg class="moon-svg${isFlash ? ' moon-flash' : ''}" viewBox="0 0 44 44" fill="none">
      <defs>
        <clipPath id="moonPhase">
          <rect x="0" y="0" width="${44 * phase}" height="44" />
        </clipPath>
      </defs>
      <circle cx="22" cy="22" r="20" fill="${moonBaseColor}" />
      <circle cx="22" cy="22" r="18" fill="${moonProgressColor}" fill-opacity="0.55" clip-path="url(#moonPhase)" />
      ${craters.map(c => `
        <circle 
          cx="${c.cx + 7}" 
          cy="${c.cy + 7}" 
          r="${c.r}" 
          fill="${craterColor}" 
          opacity="${Math.min(0.32, c.opacity * 1.5)}" 
        />
      `).join('')}
    </svg>
  `;
  moonBtn.innerHTML = svg;
}

function showHowToModal() {
  const modal = document.getElementById('howToModal');
  if (modal) modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function hideHowToModal() {
  const modal = document.getElementById('howToModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
document.getElementById('closeHowToModal').onclick = hideHowToModal;
document.getElementById('howToModalOk').onclick = hideHowToModal;

function showToastNotice(text, ms = 3200) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  toast.textContent = text;
  toast.style.display = 'block';
  toast.style.opacity = '0.97';
  toast.style.bottom = '32px';
  clearTimeout(toast._hideTimer);
  setTimeout(() => {
    toast.style.opacity = '0.97';
    toast.style.bottom = '32px';
  }, 10);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.bottom = '12px';
    setTimeout(() => { toast.style.display = 'none'; }, 350);
  }, ms);
}

/* ====== Вспомогательные ====== */
function showStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = byId('step' + i);
    if (!el) continue;
    el.style.display = (i === step) ? '' : 'none';
  }
  state.currentStep = step;
  updateProgressIndicator();
  if (step === 3 && !state.currentBlockId && state.blocks.length) {
    state.currentBlockId = sortedBlocks()[0]?.id || null;
  }
}
function getCurrentBlock() {
  return state.blocks.find(b => b.id === state.currentBlockId) || null;
}
function resetSelectionColor() {
  currentSelectionColor = BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}
function hexToRgba(hex, alpha) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${alpha})`;
}
function clampPreviewText(s, max = 100) {
  const text = (s || '').trim().replace(/\s+/g, ' ');
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function showMoonNotice(text, ms = 4500) {
  const notice = document.getElementById('moonNotice');
  const moonBtn = document.getElementById('moonBtn');
  if (!notice || !moonBtn) return;

  notice.textContent = text;
  notice.style.display = 'block';
  notice.classList.remove('show');
  notice.style.opacity = '0';

  setTimeout(() => {
    const btnRect = moonBtn.getBoundingClientRect();
    const noticeRect = notice.getBoundingClientRect();
    notice.style.left = '50%';
    notice.style.transform = 'translateX(-50%)';
    const top = btnRect.top - noticeRect.height - 14 + window.scrollY;
    notice.style.top = top + 'px';
    notice.style.zIndex = 2000;
    notice.style.opacity = '';
    notice.classList.add('show');
  }, 10);

  clearTimeout(notice._hideTimer);
  notice._hideTimer = setTimeout(() => {
    notice.classList.remove('show');
    notice.style.display = 'none';
  }, ms);
}

/* ====== Обновление индикатора прогресса ====== */
function updateProgressIndicator() {
  for (let i = 1; i <= 3; i++) {
    const stepIndicator = byId(`step${i}-indicator`);
    if (stepIndicator) {
      stepIndicator.classList.remove('active', 'completed');
      if (i < state.currentStep) {
        stepIndicator.classList.add('completed');
      } else if (i === state.currentStep) {
        stepIndicator.classList.add('active');
      }
    }
  }
  const progressLine = byId('progress-line-filled');
  if (progressLine) {
    const progressPercentage = ((state.currentStep - 1) / 2) * 100;
    progressLine.style.width = `${progressPercentage}%`;
  }
}

/* ====== Рендер сна ====== */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderDreamView() {
  const dv = byId('dreamView');
  if (!dv) return;
  dv.innerHTML = '';
  const t = state.dreamText || '';
  if (!t) return;

  const tokens = t.match(/\S+|\s+/g) || [];
  let pos = 0;
  tokens.forEach(token => {
    const isWord = /\S/.test(token);
    if (isWord) {
      const block = state.blocks.find(b => pos >= b.start && pos + token.length <= b.end);
      const span = document.createElement('span');
      span.textContent = token;
      span.dataset.start = String(pos);
      span.dataset.end = String(pos + token.length);

      if (block) {
        const color = BLOCK_COLORS[(block.id - 1) % BLOCK_COLORS.length];
        span.style.background = color;
        span.style.color = '#222';
        span.style.borderRadius = '4px';
        span.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.07)';
        span.setAttribute('data-block', String(block.id));
        span.title = `Блок #${block.id}`;
        span.addEventListener('click', () => selectBlock(block.id));
        if (block.id === state.currentBlockId) {
          span.classList.add('block-selected');
        }
      } else {
        span.style.background = '#f0f0f0';
        span.style.color = '#888';
        span.style.borderRadius = '4px';
        span.classList.add('tile');
        span.addEventListener('click', (e) => {
          e.preventDefault();
          span.classList.toggle('selected');
          if (span.classList.contains('selected')) {
            span.style.background = hexToRgba(currentSelectionColor, 0.32);
            span.style.color = '#222';
            span.style.borderRadius = '4px';
            span.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.07)';
            span.style.margin = '0px';
            span.style.padding = '0 4px';
          } else {
            span.style.background = '#f0f0f0';
            span.style.color = '#888';
            span.style.borderRadius = '';
            span.style.boxShadow = '';
            span.style.margin = '';
            span.style.padding = '';
          }
        });
      }
      dv.appendChild(span);
    } else {
      dv.appendChild(document.createTextNode(token));
    }
    pos += token.length;
  });
}

/* ====== Chips, чат, индикатор «думаю», превью ====== */
function renderBlocksChips() {
  const wrap = byId('blocks');
  if (wrap) {
    wrap.innerHTML = '';
    state.blocks.forEach(b => {
      const el = document.createElement('div');
      el.className = 'chip' + (b.id === state.currentBlockId ? ' active' : '');
      el.textContent = `#${b.id} ${b.text.slice(0, 20)}${b.text.length > 20 ? '…' : ''}`;
      el.style.background = BLOCK_COLORS[(b.id - 1) % BLOCK_COLORS.length];
      el.style.color = '#222';
      el.onclick = () => selectBlock(b.id);
      wrap.appendChild(el);
    });
  }
  const cb = byId('currentBlock');
  const b = getCurrentBlock();
  if (cb) cb.textContent = b ? `Текущий блок #${b.id}: “${b.text}”` : 'Блок не выбран';

  renderMoonProgress(b ? b.userAnswersCount : 0, 10);

  renderDreamView();
  renderChat();
  renderThinking();
  updateButtonsState();
  renderBlockPreviews();
}

/* ====== Чат: рендер без дерганий и сохранение служебных узлов ====== */
function renderChat() {
  const chat = byId('chat');
  if (!chat) return;
  const b = getCurrentBlock();

  const preserve = new Set(['thinking', 'jumpToBottom']);
  Array.from(chat.children).forEach(node => {
    const keep = (node.id && preserve.has(node.id)) || node.classList?.contains('chat-stabilizer');
    if (!keep) chat.removeChild(node);
  });

  if (!b) return;

  const atBottomBefore = isChatAtBottom();

  for (const m of b.chat) {
    const div = document.createElement('div');
    const baseClass = 'msg ' + (m.role === 'bot' ? 'bot' : 'user');
    div.className = baseClass
      + (m.isFinal ? ' final' : '')
      + (m.isGlobalFinal ? ' final-global' : '');
    div.textContent = m.text;

    const thinking = byId('thinking');
    chat.insertBefore(div, thinking || chat.firstChild);

    if (Array.isArray(m.quickReplies) && m.quickReplies.length) {
      const q = document.createElement('div');
      q.className = 'quick';
      m.quickReplies.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => sendAnswer(opt);
        q.appendChild(btn);
      });
      chat.insertBefore(q, thinking || chat.firstChild);
    }
  }

  const j = byId('jumpToBottom');
  if (j) j.style.display = isChatAtBottom() ? 'none' : 'inline-flex';

  if (atBottomBefore) {
    requestAnimationFrame(() => scrollChatToBottom());
  }
}

/* ====== Индикатор «думаю» внутри чата ====== */
function setThinking(on) {
  state.isThinking = !!on;
  renderThinking();
}
function renderThinking() {
  const t = byId('thinking');
  if (!t) return;
  const wasAtBottom = isChatAtBottom();
  t.style.display = state.isThinking ? 'inline-block' : 'none';
  if (wasAtBottom) requestAnimationFrame(() => scrollChatToBottom());
}

/* ====== Jump-to-bottom ====== */
function isChatAtBottom() {
  const chat = byId('chat');
  if (!chat) return true;
  const threshold = 8;
  return chat.scrollHeight - chat.scrollTop - chat.clientHeight <= threshold;
}
function scrollChatToBottom() {
  const chat = byId('chat'); if (!chat) return;
  chat.scrollTop = chat.scrollHeight;
  const j = byId('jumpToBottom'); if (j) j.style.display = 'none';
}

/* ====== Логика порядка блоков 1..N (строгая) ====== */
function sortedBlocks() {
  return [...state.blocks].sort((a, b) => a.id - b.id);
}
function nextUndoneBlockIdStrict() {
  const list = sortedBlocks();
  const curr = getCurrentBlock();
  if (!curr) return null;
  const currIdx = list.findIndex(x => x.id === curr.id);
  if (currIdx >= 0 && currIdx < list.length - 1) {
    return list[currIdx + 1].id;
  }
  return null;
}
function prevUndoneBlockIdStrict() {
  const list = sortedBlocks();
  const curr = getCurrentBlock();
  if (!curr) return null;
  const currIdx = list.findIndex(x => x.id === curr.id);
  if (currIdx > 0) {
    return list[currIdx - 1].id;
  }
  return null;
}

/* ====== Превью блоков ====== */
function previewStyleForBlock(blockId, isCurrent = false) {
  const color = BLOCK_COLORS[(blockId - 1) % BLOCK_COLORS.length];
  return isCurrent ? `background:${hexToRgba(color, 0.35)}; border-color:${hexToRgba('#000000', 0.08)};`
                   : `background:${hexToRgba(color, 0.18)}; border-color:${hexToRgba('#000000', 0.06)};`;
}
function renderBlockPreviews() {
  const prevEl = byId('prevPreview');
  const nextEl = byId('nextPreview');
  const b = getCurrentBlock();
  if (!prevEl || !nextEl) return;

  const prevId = prevUndoneBlockIdStrict();
  const nextId = nextUndoneBlockIdStrict();

  if (b && nextId && nextId !== b.id) {
    const nb = state.blocks.find(x => x.id === nextId);
    nextEl.classList.remove('disabled');
    nextEl.style.cssText += previewStyleForBlock(nb.id, false);
    const label = nextEl.querySelector('.label');
    if (label) label.textContent = `#${nb.id} ${clampPreviewText(nb.text, 80)}`;
    nextEl.onclick = () => { 
      selectBlock(nextId); 
      const cb = getCurrentBlock(); 
      if (cb && !cb.done && (!cb.chat || cb.chat.length === 0)) startOrContinue(); 
    };
  } else {
    nextEl.classList.add('disabled');
    const label = nextEl.querySelector('.label'); if (label) label.textContent = 'Нет следующего блока';
    nextEl.onclick = null;
  }

  if (b && prevId && prevId !== b.id) {
    const pb = state.blocks.find(x => x.id === prevId);
    prevEl.classList.remove('disabled');
    prevEl.style.cssText += previewStyleForBlock(pb.id, false);
    const label = prevEl.querySelector('.label');
    if (label) label.textContent = `#${pb.id} ${clampPreviewText(pb.text, 80)}`;
    prevEl.onclick = () => { 
      selectBlock(prevId); 
      const cb = getCurrentBlock(); 
      if (cb && !cb.done && (!cb.chat || cb.chat.length === 0)) startOrContinue(); 
    };
  } else {
    prevEl.classList.add('disabled');
    const label = prevEl.querySelector('.label'); if (label) label.textContent = '…';
    prevEl.onclick = null;
  }
}

/* ====== Обновление состояний ====== */
function updateButtonsState() {
  const b = getCurrentBlock();
  const blockBtn = byId('blockInterpretBtn');
  const saveBtn = byId('menuSaveToCabinet');
  const finalBtn = byId('finalInterpretBtn');
  const miBlock = byId('menuBlockInterpret');
  const miFinal = byId('menuFinalInterpret');

  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;

  if (!b || (b.userAnswersCount || 0) < 10) {
    if (blockBtn) blockBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (finalBtn) finalBtn.disabled = true;
    if (miBlock) miBlock.disabled = true;
    if (miFinal) miFinal.disabled = true;
    return;
  }

  if (!b.finalInterpretation) {
    if (blockBtn) blockBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = true;
    if (finalBtn) finalBtn.disabled = true;
    if (miBlock) miBlock.disabled = false;
    if (miFinal) miFinal.disabled = true;
    return;
  }

  if (b.finalInterpretation) {
    if (blockBtn) blockBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = false;
    if (finalBtn) finalBtn.disabled = finalsCount < 2;
    if (miBlock) miBlock.disabled = true;
    if (miFinal) miFinal.disabled = finalsCount < 2;
    return;
  }
}

/* ====== Экспорт/импорт ====== */
function exportJSON() {
  const data = { dreamText: state.dreamText, blocks: state.blocks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'snova_session.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 0);
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.dreamText = data.dreamText || '';
      state.blocks = (data.blocks || []).map(b => ({
        ...b,
        chat: Array.isArray(b.chat) ? b.chat : [],
        finalInterpretation: b.finalInterpretation ?? null,
        userAnswersCount: b.userAnswersCount ?? 0,
        _moonFlashShown: false
      }));
      const maxId = state.blocks.reduce((m, b) => Math.max(m, b.id || 0), 0);
      state.nextBlockId = Math.max(1, maxId + 1);
      state.currentBlockId = state.blocks[0]?.id || null;
      const dreamEl = byId('dream'); if (dreamEl) dreamEl.value = state.dreamText;
      renderBlocksChips();
      resetSelectionColor();
    } catch (e) { alert('Не удалось импортировать JSON'); }
  };
  reader.readAsText(file);
}

/* ====== LLM ====== */
function parseAIResponse(text) {
  let cleanText = (text || '').trim();
  cleanText = cleanText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2502\uFF5C]/g, ' ')
    .replace(/[\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { question: cleanText, quickReplies: [], isFinal: false };
}

async function llmNextStep(blockText, history) {
  const b = getCurrentBlock();
  if (!b) return { question: 'Ошибка: блок не выбран', quickReplies: ['Повторить'], isFinal: false };

  const PROXY_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
  try {
    const data = await apiRequest(PROXY_URL, {
      blockText: b.text,
      history: [
        { role: 'user', content: 'Контекст блока сна:\n' + b.text },
        ...(() => {
          const prev = getPrevBlocksSummary(b.id, 3);
          return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : [];
        })(),
        ...b.chat
          .filter(m => !m.isSystemNotice)
          .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
      ]
    });

    const aiRaw = (data.choices?.[0]?.message?.content || '');
    function stripNoiseLite(s) {
      if (!s) return s;
      s = s.replace(/```[\s\S]*?```/g, ' ');
      s = s.replace(/<[^>]+>/g, ' ');
      s = s.replace(/[\u2502\uFF5C]/g, ' ');
      s = s.replace(/[\u4e00-\u9fff]+/g, ' ');
      s = s.replace(/\b[a-zA-Z]{2,}\b/g, ' ');
      return s.replace(/\s+/g, ' ').trim();
    }
    const aiResponse = stripNoiseLite(aiRaw);
    return parseAIResponse(aiResponse);
  } catch (error) {
    return { question: `Ошибка API: ${error.message || 'Проверьте подключение'}`, quickReplies: ['Повторить запрос'], isFinal: false };
  }
}

function getPrevBlocksSummary(currentBlockId, limit = 3) {
  const current = state.blocks.find(b => b.id === currentBlockId);
  if (!current) return '';
  const prevFinals = state.blocks
    .filter(x => x.id !== currentBlockId && !!x.finalInterpretation)
    .sort((a, b) => (b.finalAt || 0) - (a.finalAt || 0))
    .slice(0, limit)
    .map(x => `#${x.id}: ${x.finalInterpretation}`);
  return prevFinals.length ? prevFinals.join('\n') : '';
}

/* ====== Диалог ====== */
async function appendUser(text) {
  const b = getCurrentBlock();
  if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;

  renderMoonProgress(b.userAnswersCount, 10, false);

  if (b.userAnswersCount === 10) {
    gtag('event', 'block_ready_for_interpretation', {
      event_category: 'block',
      event_label: 'Блок готов к толкованию',
      block_id: b.id,
      dream_id: currentDreamId
    });
  }

  if (b.userAnswersCount === 10 && !b._moonFlashShown) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    showMoonNotice('Вы можете запросить итоговое толкование блока (луна) или продолжить диалог.');
  }

  renderChat();
  renderBlocksChips();
 await saveDreamToServer(userId, {
  id: currentDreamId,
  dreamText: state.dreamText,
  blocks: state.blocks,
  globalFinalInterpretation: state.globalFinalInterpretation || null
});
}
function appendBot(text, quickReplies = [], isFinal = false, isSystemNotice = false) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies, isFinal, isSystemNotice });
  renderChat();
}
function appendFinalGlobal(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies: [], isFinal: true, isGlobalFinal: true });
  renderChat();
}

async function sendAnswer(ans) {
  await appendUser(ans);
  startOrContinue();
}

async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  if (b.userAnswersCount === 10 && !b._moonFlashShown) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    showMoonNotice('Теперь вы можете запросить Толкование Блока в Луне или продолжить диалог.');
  }

  const requestId = Date.now() + Math.random();
  b.pendingRequestId = requestId;

  setThinking(true);
  try {
    const history = b.chat.map(m => ({ role: m.role, text: m.text }));
    const next = await llmNextStep(b.text, history);

    if (b !== getCurrentBlock() || b.pendingRequestId !== requestId) {
      return;
    }

    if (next.isFinal) {
      b.finalInterpretation = next.question.trim();
      b.finalAt = Date.now();
      b.done = true;
      appendBot(next.question, [], true);
      updateButtonsState();
      renderBlockPreviews();
    } else {
      appendBot(next.question, next.quickReplies);
    }
  } catch (e) {
    if (b === getCurrentBlock() && b.pendingRequestId === requestId) {
      appendBot('Ошибка при обработке запроса', ['Повторить']);
    }
  } finally {
    if (b === getCurrentBlock() && b.pendingRequestId === requestId) {
      setThinking(false);
      updateButtonsState();
      renderBlockPreviews();
    }
  }
}

/* ====== Толкования ====== */
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');
  if ((b.userAnswersCount || 0) < 10) return alert('Нужно минимум 10 ответов по этому блоку.');

  const btn = byId('blockInterpretBtn');
  let prevText = '';
  if (btn) { btn.disabled = true; prevText = btn.textContent; btn.textContent = 'Формируем толкование...'; }

  setThinking(true);
  try {
    const PROXY_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
    const history = [
      { role: 'user', content: 'Контекст блока сна:\n' + b.text },
      ...(() => { const prev = getPrevBlocksSummary(b.id, 3); return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : []; })(),
      ...b.chat
        .filter(m => !m.isSystemNotice)
        .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: 'Составь единое итоговое толкование блока сновидения (3–6 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Избегай любых психоаналитических понятий и специальных терминов. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];
    const data = await apiRequest(PROXY_URL, { blockText: b.text, history });
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u2502\uFF5C]/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content) content = 'Не удалось получить толкование';

    b.finalInterpretation = content;
    b.finalAt = Date.now();
    b.done = true;
    gtag('event', 'block_interpreted', {
      event_category: 'block',
      event_label: 'Толкование блока',
      block_id: b.id,
      dream_id: currentDreamId
    });
    appendBot(content, [], true);
    updateButtonsState();
    renderBlockPreviews();
    await saveDreamToServer(userId, {
  id: currentDreamId,
  dreamText: state.dreamText,
  blocks: state.blocks,
  globalFinalInterpretation: state.globalFinalInterpretation || null
});
  } catch (e) {
    console.error(e);
    gtag('event', 'error', {
      event_category: 'error',
      event_label: 'Ошибка при толковании блока',
      error_message: e.message || 'Unknown',
      block_id: b ? b.id : null,
      dream_id: currentDreamId
    });
    appendBot('Ошибка при формировании толкования блока: ' + (e.message || 'Неизвестная ошибка'), ['Повторить']);
  } finally {
    setThinking(false);
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
  }
}

async function renderCabinet() {
  const list = await loadHistoryFromServer(userId);
  const wrap = document.getElementById('cabinetList');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div class="muted" style="margin:24px 0;">История пуста</div>';
    return;
  }
  wrap.innerHTML = list.map((entry, idx) => {
    const date = new Date(entry.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dreamPreview = escapeHTML((entry.dreamText || '').split(/\s+/).slice(0, 8).join(' ') + '...');
    let status = 'none';
    if (entry.globalFinalInterpretation) {
      status = 'done';
    } else if (Array.isArray(entry.blocks) && entry.blocks.some(b => b.finalInterpretation)) {
      status = 'partial';
    }
    let color = '#ef4444';
    if (status === 'done') color = '#22c55e';
    else if (status === 'partial') color = '#facc15';
    return `
      <div class="cabinet-tile" data-view="${idx}" style="cursor:pointer;">
        <div class="cabinet-date">${date}</div>
        <div class="cabinet-preview" style="color:${color}; font-weight:600;">
          ${dreamPreview}
        </div>
        <button class="btn secondary" data-del="${idx}">🗑</button>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('.cabinet-tile[data-view]').forEach(tile => {
    tile.onclick = function(e) {
      if (e.target.closest('button[data-del]')) return;
      showCabinetEntry(+tile.dataset.view);
    };
  });

  wrap.querySelectorAll('button[data-del]').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      if (confirm('Удалить запись?')) {
        const idx = +btn.dataset.del;
        await apiRequest(`${API_URL}/api/history/delete`, { userId, dreamId: list[idx].id });
        renderCabinet();
      }
    };
  });
}

function showFinalDialog() {
  const dialog = byId('finalDialog');
  const main = byId('finalDialogMain');
  const blocks = byId('finalDialogBlocks');
  if (!dialog || !main || !blocks) return;

  let final = state.globalFinalInterpretation || 'Итоговое толкование не найдено.';
  main.textContent = final;

  blocks.innerHTML = '';
  sortedBlocks().forEach(b => {
    if (b.finalInterpretation) {
      const div = document.createElement('div');
      div.style.marginBottom = '18px';
      div.innerHTML = `<b>Блок #${b.id}:</b> <span>${escapeHTML(b.finalInterpretation)}</span>`;
      blocks.appendChild(div);
    }
  });

  dialog.style.display = 'block';

  // Настраиваем одну кнопку экспорта
  const exportBtn = byId('exportFinalDialogBtn');
  if (exportBtn) {
    exportBtn.textContent = '⬇️ Экспорт итога';
    exportBtn.onclick = function() {
      exportFinalTXT(); // Экспортируем текущую сессию
    };
    exportBtn.style.display = '';
  }

  // Настройка кнопки "Сохранить в кабинет"
  const saveBtn = byId('saveToCabinetBtn');
  if (saveBtn) {
    saveBtn.onclick = saveCurrentSessionToCabinet;
    const b = getCurrentBlock();
    const enoughAnswers = b && (b.userAnswersCount || 0) >= 10;
    saveBtn.disabled = !enoughAnswers;
    saveBtn.style.opacity = enoughAnswers ? 1 : 0.5;
    saveBtn.textContent = 'Сохранить в кабинет';
    saveBtn.classList.remove('primary');
    saveBtn.classList.add('secondary');
  }
}

async function showCabinetEntry(idx) {
  isViewingFromCabinet = true;

  const list = await loadHistoryFromServer(userId);
  const entry = list[idx];
  if (!entry) return;
  const cabinet = byId('cabinetModal');
  if (cabinet) cabinet.style.display = 'none';
  document.body.classList.remove('modal-open');

  const dialog = byId('finalDialog');
  const main = byId('finalDialogMain');
  const blocks = byId('finalDialogBlocks');
  if (!dialog || !main || !blocks) return;

  main.innerHTML = `<div style="font-size:15px; color:var(--text-secondary); margin-bottom:8px;">${new Date(entry.date).toLocaleString('ru-RU')}</div>
    <div style="margin-bottom:12px;"><b>Текст сна:</b><br>${escapeHTML(entry.dreamText)}</div>
    <div style="margin-bottom:12px;"><b>Итоговое толкование:</b><br>${entry.globalFinalInterpretation ? escapeHTML(entry.globalFinalInterpretation) : '<i>Нет</i>'}</div>`;

  blocks.innerHTML = (entry.blocks || []).map((b, i) =>
    `<div style="margin-bottom:14px;"><b>Блок #${i+1}:</b> <span>${b.finalInterpretation ? escapeHTML(b.finalInterpretation) : '<i>Нет толкования</i>'}</span></div>`
  ).join('');
  dialog.style.display = 'block';

  // Меняем поведение и текст кнопки экспорта
  const exportBtn = byId('exportFinalDialogBtn');
  if (exportBtn) {
    exportBtn.textContent = '⬇️ Экспорт';
    exportBtn.onclick = function() {
      exportFinalTXT(entry); // Экспортируем именно этот сон
    };
    exportBtn.style.display = '';
  }

  const saveBtn = byId('saveToCabinetBtn');
  if (saveBtn) {
    saveBtn.textContent = 'Загрузить Сновидение для толкования';
    saveBtn.classList.remove('secondary');
    saveBtn.classList.add('primary');
    saveBtn.onclick = function() {
      currentDreamId = entry.id;
      state.dreamText = entry.dreamText || '';
      state.blocks = Array.isArray(entry.blocks) ? entry.blocks.map(b => ({
        ...b,
        chat: Array.isArray(b.chat) ? b.chat : [],
        finalInterpretation: b.finalInterpretation ?? null,
        userAnswersCount: b.userAnswersCount ?? 0,
        _moonFlashShown: false
      })) : [];
      state.globalFinalInterpretation = entry.globalFinalInterpretation || null;
      state.nextBlockId = state.blocks.reduce((m, b) => Math.max(m, b.id || 0), 0) + 1;
      state.currentBlockId = null;
      state.userSelectedBlock = false;
      const dreamEl = byId('dream');
      if (dreamEl) dreamEl.value = state.dreamText;
      showStep(2);
      renderBlocksChips();
      resetSelectionColor();
      updateProgressIndicator();
      const dialog = byId('finalDialog');
      if (dialog) dialog.style.display = 'none';
      isViewingFromCabinet = false;
    };
  }
}

// ====== Итоговое толкование только для финального окна ======
async function finalInterpretation() {
  const interpreted = state.blocks.filter(x => !!x.finalInterpretation);
  if (interpreted.length === 0) return alert('Нет ни одного толкования блока.');

  const btn = byId('finalInterpretBtn');
  let prevText2 = '';
  if (btn) { btn.disabled = true; prevText2 = btn.textContent; btn.textContent = 'Формируем итог...'; }

  setThinking(true);
  try {
    const PROXY_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
    const blockText = (state.dreamText || '').slice(0, 4000);
    const history = [
      { role: 'user', content: 'Краткий контекст сна:\n' + blockText },
      { role: 'user', content: 'Итоговые толкования блоков:\n' + interpreted.map(b => `#${b.id}: ${b.finalInterpretation}`).join('\n') },
      { role: 'user', content: 'Составь единое итоговое толкование сновидения (5–9 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Избегай любых психоаналитических понятий и специальных терминов. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];
    const data = await apiRequest(PROXY_URL, { blockText, history });
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u2502\uFF5C]/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content) content = 'Не удалось получить итоговое толкование';

    state.globalFinalInterpretation = content;
    gtag('event', 'final_interpretation', {
      event_category: 'dream',
      event_label: 'Финальное толкование',
      dream_id: currentDreamId
    });

    const b = getCurrentBlock();
    if (b) appendFinalGlobal(content);
    showFinalDialog();
    await saveDreamToServer(userId, {
  id: currentDreamId,
  dreamText: state.dreamText,
  blocks: state.blocks,
  globalFinalInterpretation: state.globalFinalInterpretation || null
});
  } catch (e) {
    console.error(e);
    gtag('event', 'error', {
      event_category: 'error',
      event_label: 'Ошибка при финальном толковании',
      error_message: e.message || 'Unknown',
      dream_id: currentDreamId
    });
    appendBot('Ошибка при формировании итогового толкования: ' + (e.message || 'Неизвестная ошибка'), ['Повторить']);
  } finally {
    setThinking(false);
    if (btn) { btn.disabled = false; btn.textContent = prevText2; }
  }
}

async function saveCurrentSessionToCabinet() {
  if (!userId) {
    showToastNotice('Ошибка: не определён пользователь. Перезайдите!');
    return;
  }
  if (!state.dreamText.trim()) {
    showToastNotice('Введите текст сна перед сохранением!');
    return;
  }
  const entry = {
    id: currentDreamId || (Date.now() + Math.floor(Math.random() * 10000)),
    date: Date.now(),
    dreamText: state.dreamText,
    blocks: state.blocks,
    globalFinalInterpretation: state.globalFinalInterpretation || null
  };
  try {
    await saveDreamToServer(userId, entry);
    showToastNotice('Сон сохранён в личный кабинет!');
    currentDreamId = entry.id;
  } catch (e) {
    showToastNotice('Ошибка при сохранении: ' + (e.message || 'Неизвестная ошибка'));
  }
}

function exportFinalTXT(entry) {
  // Если передан entry — экспортируем его, иначе state
  const src = entry || {
    dreamText: state.dreamText,
    globalFinalInterpretation: state.globalFinalInterpretation,
    blocks: sortedBlocks().filter(b => b.finalInterpretation)
  };

  const title = 'Saviora — Толкование сна';
  const date = new Date().toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
  const dream = src.dreamText || '(нет текста)';
  const final = src.globalFinalInterpretation || 'Итоговое толкование не найдено.';
  const blocks = src.blocks || [];

  let txt = `${title}\n\n`;
  txt += `Оригинальный текст сна:\n${dream}\n\n`;
  txt += `Итоговое толкование:\n${final}\n\n`;

  if (blocks.length) {
    txt += `Список блоков с пояснениями:\n`;
    blocks.forEach(b => {
      txt += `Блок #${b.id}: ${b.finalInterpretation}\n`;
    });
    txt += '\n';
  }

  txt += `Дата: ${date}\n`;

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saviora_final.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

onClick('closeFinalDialog', () => {
  const dialog = byId('finalDialog');
  if (dialog) dialog.style.display = 'none';
});

/* ====== Добавление блоков ====== */
async function addBlockFromSelection() {
  const dv = byId('dreamView');
  if (!dv) return;
  const selected = Array.from(dv.querySelectorAll('.tile.selected'));
  if (!selected.length) return alert('Выделите плиточки для блока.');

  const starts = selected.map(s => parseInt(s.dataset.start || '0', 10));
  const ends = selected.map(s => parseInt(s.dataset.end || '0', 10));
  const start = Math.min(...starts);
  const end = Math.max(...ends);

  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }

  const id = state.nextBlockId++;
  const text = state.dreamText.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0, _moonFlashShown: false });
  state.currentBlockId = id;
  gtag('event', 'add_block', {
    event_category: 'block',
    event_label: 'Добавлен блок',
    block_id: id,
    block_length: text.length,
    dream_id: currentDreamId
  });

  selected.forEach(s => {
    s.classList.remove('selected');
    s.style.background = '#f0f0f0';
    s.style.color = '#888';
  });

  renderBlocksChips();
  resetSelectionColor();
  await saveDreamToServer(userId, {
  id: currentDreamId,
  dreamText: state.dreamText,
  blocks: state.blocks,
  globalFinalInterpretation: state.globalFinalInterpretation || null
});
}

function refreshSelectedBlocks() {
  const confirmMsg = 'Обновить выбранные блоки? Текущие блоки будут очищены, а выделения сброшены.';
  if (!confirm(confirmMsg)) return;

  state.blocks = [];
  state.currentBlockId = null;
  state.nextBlockId = 1;
  state.blocks.forEach(b => b._moonFlashShown = false);

  const dv = byId('dreamView');
  if (dv) {
    dv.querySelectorAll('.tile.selected').forEach(s => {
      s.classList.remove('selected');
      s.style.background = '#f0f0f0';
      s.style.color = '#888';
      s.style.borderRadius = '';
      s.style.boxShadow = '';
      s.style.margin = '';
      s.style.padding = '';
    });
  }

  renderBlocksChips();
  resetSelectionColor();
}

function selectBlock(id) {
  state.currentBlockId = id;
  state.userSelectedBlock = true;
  renderBlocksChips();
}

/* ====== Handlers ====== */
function initHandlers() {
  setStep1BtnToSave();

  onClick('howToBtn', showHowToModal);

  onClick('toStep3', () => {
    if (!state.blocks.length) { alert('Добавьте хотя бы один блок!'); return; }
    if (!state.userSelectedBlock) {
      state.currentBlockId = sortedBlocks()[0]?.id || null;
    }
    showStep(3);
    renderBlocksChips();
    updateProgressIndicator();
    gtag('event', 'start_dialog', {
      event_category: 'dialog',
      event_label: 'Начат диалог',
      block_id: state.currentBlockId,
      dream_id: currentDreamId
    });
    const b = getCurrentBlock();
    if (b && !b.done && (!b.chat || b.chat.length === 0)) startOrContinue();
  });

  onClick('menuSaveToCabinet', saveCurrentSessionToCabinet);

  onClick('backTo1Top', () => { startNewDream(); showStep(1); updateProgressIndicator(); });
  onClick('backTo2Top', () => { showStep(2); updateProgressIndicator(); });

  onClick('addBlock', addBlockFromSelection);
  onClick('addWholeBlock', () => {
    const dreamEl = byId('dream');
    state.dreamText = dreamEl ? dreamEl.value : '';
    if (!state.dreamText.trim()) { alert('Введите текст сна сначала!'); return; }
    if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
      alert('Весь текст уже добавлен как блок.'); return;
    }
    const id = state.nextBlockId++;
    const start = 0;
    const end = state.dreamText.length;
    const text = state.dreamText;
    state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0, _moonFlashShown: false });
    state.currentBlockId = id;
    showStep(2);
    renderBlocksChips();
    resetSelectionColor();
  });

  onClick('refreshInline', refreshSelectedBlocks);

  onClick('blockInterpretBtn', blockInterpretation);
  onClick('finalInterpretBtn', finalInterpretation);

  onClick('sendAnswerBtn', () => {
    if (state.currentStep !== 3) { alert('Перейдите к шагу "Работа с блоками"'); return; }
    const el = byId('userInput');
    const val = (el && el.value || '').trim();
    if (!val) return;
    hideAttachMenu();
    sendAnswer(val);
    if (el) el.value = '';
    setTimeout(scrollChatToBottom, 0);
  });

  const userInputEl = byId('userInput');
  if (userInputEl) {
    userInputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const btn = byId('sendAnswerBtn'); if (btn) btn.click();
      }
    });
    userInputEl.addEventListener('focus', hideAttachMenu);
    userInputEl.addEventListener('click', hideAttachMenu);
  }

  const chatEl = byId('chat');
  if (chatEl) {
    chatEl.addEventListener('scroll', () => {
      const jumpBtn = byId('jumpToBottom');
      if (jumpBtn) jumpBtn.style.display = isChatAtBottom() ? 'none' : 'inline-flex';
    });
    chatEl.addEventListener('click', hideAttachMenu);
  }
  onClick('jumpToBottom', scrollChatToBottom);

  onClick('moonBtn', (e) => {
    e.stopPropagation();
    const menu = byId('attachMenu');
    if (!menu) return;
    menu.style.display = (menu.style.display !== 'none') ? 'none' : 'block';
  });

  onClick('exportFinalDialogBtn', () => {
    exportFinalTXT();
  });

  document.addEventListener('click', (e) => {
    const menu = byId('attachMenu');
    const bar = byId('chatInputBar');
    if (!menu || !bar) return;
    if (!bar.contains(e.target)) hideAttachMenu();
  });

  onClick('menuBlockInterpret', () => { hideAttachMenu(); blockInterpretation(); });
  onClick('menuFinalInterpret', () => { 
    hideAttachMenu();
    if (state.globalFinalInterpretation) {
      showFinalDialog();
    } else {
      finalInterpretation();
    }
  });
  onClick('nextBlockBtn', () => { const id = nextUndoneBlockIdStrict(); if (id) { selectBlock(id); const b = getCurrentBlock(); if (b && !b.done) startOrContinue(); } });
  onClick('prevBlockBtn', () => { const id = prevUndoneBlockIdStrict(); if (id) { selectBlock(id); const b = getCurrentBlock(); if (b && !b.done) startOrContinue(); } });

  updateButtonsState();
  resetSelectionColor();
}

onClick('openCabinetBtn', async () => {
  gtag('event', 'open_cabinet', {
    event_category: 'cabinet',
    event_label: 'Открыт личный кабинет'
  });
  await renderCabinet();
  byId('cabinetModal').style.display = 'block';
  document.body.classList.add('modal-open');
});
onClick('closeCabinetBtn', () => {
  byId('cabinetModal').style.display = 'none';
  document.body.classList.remove('modal-open');
});
onClick('clearCabinetBtn', async () => {
  if (confirm('Очистить всю историю?')) {
    await apiRequest(`${API_URL}/api/history/clear`, { userId });
    renderCabinet();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.querySelector('#cabinetModal .modal-overlay');
  if (overlay) {
    overlay.onclick = () => {
      document.getElementById('cabinetModal').style.display = 'none';
      document.body.classList.remove('modal-open');
    };
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('cabinetModal');
  if (modal) {
    modal.addEventListener('touchmove', function(e) {
      if (e.target.closest('.cabinet-list')) return;
      e.preventDefault();
    }, { passive: false });
  }
});

function hideAttachMenu() {
  const menu = byId('attachMenu');
  if (menu) menu.style.display = 'none';
}
function styleDisplay(el, value) {
  if (el) el.style.display = value;
}


function startNewDream() {
  currentDreamId = null;
  state.dreamText = '';
  state.blocks = [];
  state.currentBlockId = null;
  state.nextBlockId = 1;
  state.globalFinalInterpretation = null;
  state.userSelectedBlock = false;
  const dreamEl = byId('dream');
  if (dreamEl) dreamEl.value = '';
  setStep1BtnToSave();
}

window.addEventListener('DOMContentLoaded', async () => {
  userId = localStorage.getItem('snova_userid');
  token = localStorage.getItem('snova_token');
  if (!token || !userId) {
    document.body.classList.add('pre-auth');
  } else {
    try {
      await apiRequest(`${API_URL}/api/profile/get`, { userId });
      document.body.classList.remove('pre-auth');
    } catch (e) {
      document.body.classList.add('pre-auth');
      localStorage.removeItem('snova_token');
      localStorage.removeItem('snova_userid');
    }
  }

  initHandlers();

  if ('virtualKeyboard' in navigator) {
    try {
      navigator.virtualKeyboard.overlaysContent = true;
      navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
        const keyboardHeight = event.target.boundingRect.height;
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      });
    } catch (e) {}
  }

  if (window.matchMedia('(spanning: single-fold-vertical)').matches) {
    document.documentElement.classList.add('foldable-vertical');
  }
});

// --- АВТОСКРОЛЛ И ПОВЕДЕНИЕ ПРИ ВВОДЕ ---

const messagesContainer = document.getElementById('messages');
const input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Скроллим вниз при фокусе на инпуте (клавиатура появляется)
input.addEventListener('focus', scrollToBottom);

// Скроллим вниз после отправки сообщения
sendBtn.addEventListener('click', () => {
  setTimeout(scrollToBottom, 100); // Даем DOM обновиться
});

// Если у тебя есть функция добавления сообщений, добавь туда scrollToBottom:
function addMessage(text, fromUser = false) {
  const msg = document.createElement('div');
  msg.className = fromUser ? 'user-message' : 'bot-message';
  msg.textContent = text;
  messagesContainer.appendChild(msg);
  scrollToBottom();
}

document.getElementById('showRegister').onclick = function(e) {
  e.preventDefault();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = '';
};

document.getElementById('showLogin').onclick = function(e) {
  e.preventDefault();
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = '';
};


document.getElementById('registerBtn').onclick = async function() {
  const email = document.getElementById('regEmail').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorDiv = document.getElementById('registerError');
  errorDiv.textContent = '';
  if (!email || !username || !password) {
    errorDiv.textContent = 'Заполните все поля!';
    return;
  }
  const res = await registerUser(email, username, password); // ← ВЕРНО!
  if (res.error) {
    errorDiv.textContent = res.error;
    return;
  }
  localStorage.setItem('snova_token', res.token);
  localStorage.setItem('snova_userid', res.userId);
  userId = res.userId;
  token = res.token;
  showToastNotice('Регистрация успешна!');
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = '';
  document.body.classList.remove('pre-auth');
};

document.getElementById('loginBtn').onclick = async function() {
  const emailOrUsername = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = '';
  if (!emailOrUsername || !password) {
    errorDiv.textContent = 'Заполните все поля!';
    return;
  }
  const res = await loginUser(emailOrUsername, password);
  if (res.error) {
    errorDiv.textContent = res.error;
    return;
  }
  localStorage.setItem('snova_token', res.token);
  localStorage.setItem('snova_userid', res.userId);
  userId = res.userId;
  token = res.token;
  showToastNotice('Вход выполнен!');
  document.getElementById('loginForm').style.display = 'none';
  document.body.classList.remove('pre-auth');
};
