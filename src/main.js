/* ====== Константы авторизации ====== */
const AUTH_PASS = 'volfisthebest';
const AUTH_TOKEN = 'volfisthebest-secret';

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
  globalFinalInterpretation: null // <--- добавлено!
};

let currentSelectionColor = null;

/* ====== Утилиты DOM ====== */
function byId(id) { return document.getElementById(id); }
function onClick(id, handler) { const el = byId(id); if (el) el.onclick = handler; }
function onChange(id, handler) { const el = byId(id); if (el) el.onchange = handler; }
function raf(fn){ return new Promise(r=>requestAnimationFrame(()=>{ fn(); r(); })); }

/* ====== Луна-прогресс ====== */
function renderMoonProgress(userAnswersCount = 0, max = 10, isFlash = false, theme = 'light') {
  const moonBtn = document.getElementById('moonBtn');
  if (!moonBtn) return;
  const phase = Math.min(userAnswersCount / max, 1);

  // Цвета ободка по теме
  const goldGlow = {
    stop85: theme === 'dark' ? '#a5b4fc' : '#f6e27a',
    stop100: theme === 'dark' ? '#6366f1' : '#eab308',
    opacity: theme === 'dark' ? 0.32 : 0.22
  };

  // Массив кратеров — много, разных размеров и opacity
  const craters = [
    // Крупные
    {cx: 8, cy: 10, r: 2.6, opacity: 0.22},
    {cx: 20, cy: 8, r: 2.1, opacity: 0.19},
    {cx: 15, cy: 20, r: 2.3, opacity: 0.21},
    // Средние
    {cx: 12, cy: 16, r: 1.3, opacity: 0.16},
    {cx: 18, cy: 14, r: 1.1, opacity: 0.15},
    {cx: 22, cy: 18, r: 1.4, opacity: 0.17},
    {cx: 10, cy: 22, r: 1.2, opacity: 0.14},
    // Мелкие
    {cx: 16, cy: 10, r: 0.7, opacity: 0.12},
    {cx: 24, cy: 12, r: 0.6, opacity: 0.11},
    {cx: 19, cy: 22, r: 0.8, opacity: 0.13},
    {cx: 13, cy: 19, r: 0.5, opacity: 0.10},
    {cx: 21, cy: 16, r: 0.6, opacity: 0.11},
    // Группировка мелких
    {cx: 17, cy: 18, r: 0.4, opacity: 0.09},
    {cx: 18, cy: 19, r: 0.3, opacity: 0.08},
    {cx: 19, cy: 18, r: 0.4, opacity: 0.09},
    // Еще несколько для "шума"
    {cx: 14, cy: 13, r: 0.5, opacity: 0.10},
    {cx: 22, cy: 21, r: 0.5, opacity: 0.10},
    {cx: 12, cy: 21, r: 0.4, opacity: 0.09},
    {cx: 20, cy: 20, r: 0.3, opacity: 0.08}
  ];

  // SVG: внешний ободок теперь строго по радиусу луны (r=20)
 const svg = `
    <svg class="moon-svg${isFlash ? ' moon-flash' : ''}" viewBox="0 0 44 44" fill="none">
      <defs>
        <clipPath id="moonPhase">
          <rect x="0" y="0" width="${44 * phase}" height="44" />
        </clipPath>
        <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stop-color="#fffbe6" stop-opacity="0"/>
          <stop offset="85%" stop-color="${goldGlow.stop85}" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="${goldGlow.stop100}" stop-opacity="${goldGlow.opacity}"/>
        </radialGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="80%" stop-color="#e0e7ef" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#a5b4fc" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="21" fill="url(#goldGlow)" />
      <circle cx="22" cy="22" r="20" fill="url(#moonGlow)" opacity="0.7"/>
      <circle cx="22" cy="22" r="18" fill="#e0e7ef"/>
      <circle cx="22" cy="22" r="18" fill="#f6e27a" fill-opacity="0.32" clip-path="url(#moonPhase)" />
      ${craters.map(c => `
        <circle 
          cx="${c.cx + 7}" 
          cy="${c.cy + 7}" 
          r="${c.r}" 
          fill="#b6bbc7" 
          opacity="${c.opacity}" 
        />
      `).join('')}
    </svg>
  `;
  moonBtn.innerHTML = svg;
}
/* ====== Auth ====== */
function showAuth() {
  const authDiv = byId('auth');
  if (!authDiv) return;
  authDiv.style.display = 'block';
  document.body.style.overflow = 'hidden';
  document.body.classList.add('pre-auth');
  setTimeout(() => { const p = byId('authPass'); if (p) p.focus(); }, 100);
}
function hideAuth() {
  const authDiv = byId('auth');
  if (!authDiv) return;
  authDiv.style.display = 'none';
  document.body.style.overflow = '';
  document.body.classList.remove('pre-auth');
}
function getToken() { try { return localStorage.getItem('snova_token'); } catch { return null; } }
function setToken(token) { try { localStorage.setItem('snova_token', token); } catch {} }
function checkAuth() {
  if (getToken() === AUTH_TOKEN) { hideAuth(); return true; }
  showAuth(); return false;
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

/* ====== Обновление индикатора прогресса ====== */
function updateProgressIndicator() {
  // Обновляем шаги
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
  // Обновляем линию прогресса
  const progressLine = byId('progress-line-filled');
  if (progressLine) {
    const progressPercentage = ((state.currentStep - 1) / 2) * 100;
    progressLine.style.width = `${progressPercentage}%`;
  }
}

/* ====== Рендер сна ====== */
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
        // === Вот здесь добавляем класс для выделенного блока ===
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
      el.addEventListener('click', () => selectBlock(b.id));
      wrap.appendChild(el);
    });
  }
  const cb = byId('currentBlock');
  const b = getCurrentBlock();
  if (cb) cb.textContent = b ? `Текущий блок #${b.id}: “${b.text}”` : 'Блок не выбран';

  function renderQuickReplies(quickReplies) {
  const quickDiv = document.querySelector('.quick');
  quickDiv.innerHTML = quickReplies.map(q => `<button>${q}</button>`).join('');

  // Вот здесь вешаем обработчики!
  document.querySelectorAll('.quick button').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = document.querySelector('#inputField'); // id твоего input
      input.value = this.textContent;
      input.focus();
    });
  });
}

  // Рендерим луну
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

  // Сохраняем только системные элементы: #thinking, .chat-stabilizer, #jumpToBottom
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

    // вставляем перед thinking, чтобы thinking оставался внизу
    const thinking = byId('thinking');
    chat.insertBefore(div, thinking || chat.firstChild);

    if (Array.isArray(m.quickReplies) && m.quickReplies.length) {
      const q = document.createElement('div');
      q.className = 'quick';
      m.quickReplies.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.addEventListener('click', () => sendAnswer(opt));
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
  const currIdx = curr ? list.findIndex(x => x.id === curr.id) : -1;
  for (let i = currIdx + 1; i < list.length; i++) if (!list[i].done) return list[i].id;
  for (let i = 0; i < list.length; i++) if (!list[i].done) return list[i].id;
  return null;
}
function prevUndoneBlockIdStrict() {
  const list = sortedBlocks();
  const curr = getCurrentBlock();
  const currIdx = curr ? list.findIndex(x => x.id === curr.id) : list.length;
  for (let i = currIdx - 1; i >= 0; i--) if (!list[i].done) return list[i].id;
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].done) return list[i].id;
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

  // NEXT
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

  // PREV
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
  const finalBtn = byId('finalInterpretBtn');

  if (blockBtn) blockBtn.classList.remove('btn-warn', 'btn-ok');
  if (finalBtn) finalBtn.classList.remove('btn-warn', 'btn-ok');

  const enoughForBlock = !!b && (b.userAnswersCount || 0) >= 10;
  if (blockBtn) { blockBtn.classList.add(enoughForBlock ? 'btn-ok' : 'btn-warn'); blockBtn.disabled = !enoughForBlock || !b || b.done; }

  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;
  const enoughForFinal = finalsCount >= 2;
  if (finalBtn) { finalBtn.classList.add(enoughForFinal ? 'btn-ok' : 'btn-warn'); finalBtn.disabled = !enoughForFinal; }

  const miBlock = byId('menuBlockInterpret');
  const miFinal = byId('menuFinalInterpret');
  if (miBlock) { miBlock.disabled = blockBtn ? blockBtn.disabled : false; miBlock.style.opacity = miBlock.disabled ? 0.5 : 1; }
  if (miFinal) { miFinal.disabled = finalBtn ? finalBtn.disabled : false; miFinal.style.opacity = miFinal.disabled ? 0.5 : 1; }
}

/* ====== Экспорт/импорт ====== */
function exportJSON() {
  const data = { dreamText: state.dreamText, blocks: state.blocks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'snova_session.json';
  a.click();
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
  _moonFlashShown: false // всегда сбрасываем при импорте
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

/* ====== API ====== */
async function apiRequest(url, data) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });

  if (res.status === 401) {
    setToken('');
    showAuth();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}

/* ====== LLM ====== */
function parseAIResponse(text) {
  let cleanText = (text || '').trim();
  let quickReplies = [];

  // 1. Варианты в [ ... ]: [Вариант 1 | Вариант 2] или [Вариант 1 и Вариант 2]
  const bracketGroups = [...cleanText.matchAll(/\[([^\]]+)\]/g)];
  for (const m of bracketGroups) {
    const inside = (m[1] || '').trim();
    let parts = [];
    if (/\|/.test(inside)) {
      parts = inside.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);
    } else if (/ и /i.test(inside)) {
      const two = inside.split(/\s+и\s+/i).map(s => s.trim()).filter(Boolean);
      if (two.length === 2) parts = two;
    }
    if (parts.length >= 2) {
      quickReplies.push(...parts);
      cleanText = cleanText.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // 2. Списки: 1. ... 2. ... 3. ...
  if (quickReplies.length === 0) {
    const numbered = [...cleanText.matchAll(/(\d+)\.\s*([^\d]+)/g)];
    if (numbered.length >= 2) {
      quickReplies = numbered.map(m => m[2].trim());
      cleanText = cleanText.replace(/(\d+\.\s*[^\d]+)/g, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  // 3. Списки: — ... (тире)
  if (quickReplies.length === 0) {
    const dashOpts = [...cleanText.matchAll(/—\s*([^\n]+)/g)];
    if (dashOpts.length >= 2) {
      quickReplies = dashOpts.map(m => m[1].trim());
      cleanText = cleanText.replace(/—\s*[^\n]+/g, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  // 4. Списки: • ... (маркер)
  if (quickReplies.length === 0) {
    const bulletOpts = [...cleanText.matchAll(/•\s*([^\n]+)/g)];
    if (bulletOpts.length >= 2) {
      quickReplies = bulletOpts.map(m => m[1].trim());
      cleanText = cleanText.replace(/•\s*[^\n]+/g, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  // 5. Списки: а) ... б) ... в) ...
  if (quickReplies.length === 0) {
    const letterOpts = [...cleanText.matchAll(/[а-яa-z]\)\s*([^\n]+)/gi)];
    if (letterOpts.length >= 2) {
      quickReplies = letterOpts.map(m => m[1].trim());
      cleanText = cleanText.replace(/[а-яa-z]\)\s*[^\n]+/gi, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  // 6. Списки: Варианты: ...; ...; ...
  if (quickReplies.length === 0) {
    const semicolon = cleanText.match(/Варианты: (.+)/i);
    if (semicolon) {
      quickReplies = semicolon[1].split(';').map(s => s.trim()).filter(Boolean);
      cleanText = cleanText.replace(/Варианты: .+/i, '').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // 7. Эвристика: "например, ... и ..."
  if (quickReplies.length === 0) {
    const example = cleanText.match(/например[:,]?\s*([^\n]+? и [^\n]+?)(\.|\?|!|$)/i);
    if (example) {
      const parts = example[1].split(/\s+и\s+/i).map(s => s.trim()).filter(Boolean);
      if (parts.length === 2) {
        quickReplies = parts;
        // cleanText = cleanText.replace(example[0], '').replace(/\s{2,}/g, ' ').trim();
      }
    }
  }

  // Ограничиваем количество вариантов
  quickReplies = quickReplies.slice(0, 4);

  return { question: cleanText, quickReplies, isFinal: false };
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
function appendUser(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;

  // Обновляем луну после каждого ответа
  renderMoonProgress(b.userAnswersCount, 10, false);

  // Если достигли 10 ответов и еще не показывали уведомление
  if (b.userAnswersCount === 10 && !b._moonFlashShown) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    appendBot(
      'Вы ответили на 10 вопросов. Теперь вы можете запросить итоговое толкование блока, нажав на кнопку "Толкование" (луна). Хотите продолжить диалог или перейти к толкованию?',
      [],
      false
    );
    renderChat();
    renderBlocksChips();
    return; // Не продолжаем диалог автоматически!
  }

  renderChat();
  renderBlocksChips();
}
function appendBot(text, quickReplies = [], isFinal = false, isSystemNotice = false) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies, isFinal, isSystemNotice });

  // Проверяем, нужно ли показать уведомление о 10 ответах (после ответа ассистента)
  if (
    b.userAnswersCount >= 10 &&
    !b._moonFlashShown &&
    !isSystemNotice
  ) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    b.chat.push({
      role: 'bot',
      text: 'Вы ответили на 10 вопросов. Теперь вы можете запросить итоговое толкование блока, нажав на кнопку "Толкование" (луна). Хотите продолжить диалог или перейти к толкованию?',
      quickReplies: [],
      isFinal: false,
      isSystemNotice: true
    });
    renderChat();
    renderBlocksChips();
    return;
  }

  renderChat();
}
function appendFinalGlobal(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies: [], isFinal: true, isGlobalFinal: true });
  renderChat();
}

function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}

async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  // Если пользователь уже дал 10 ответов — не продолжаем диалог автоматически
  if (b.userAnswersCount >= 10) {
    // Только уведомление, никакого запроса к LLM
    return;
  }

  setThinking(true);
  try {
    const history = b.chat.map(m => ({ role: m.role, text: m.text }));
    const next = await llmNextStep(b.text, history);

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
    console.error(e);
    appendBot('Ошибка при обработке запроса', ['Повторить']);
  } finally {
    setThinking(false);
    updateButtonsState();
    renderBlockPreviews();
  }
}

/* ====== Толкования ====== */
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');
  if ((b.userAnswersCount || 0) < 5) return alert('Нужно минимум 5 ответов по этому блоку.');

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
    appendBot(content, [], true);
    updateButtonsState();
    renderBlockPreviews();
  } catch (e) {
    console.error(e);
    appendBot('Ошибка при формировании толкования блока: ' + (e.message || 'Неизвестная ошибка'), ['Повторить']);
  } finally {
    setThinking(false);
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
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

    const b = getCurrentBlock();
    if (b) appendFinalGlobal(content);
    showFinalDialog();
  } catch (e) {
    console.error(e);
    appendBot('Ошибка при формировании итогового толкования: ' + (e.message || 'Неизвестная ошибка'), ['Повторить']);
  } finally {
    setThinking(false);
    if (btn) { btn.disabled = false; btn.textContent = prevText2; }
  }
}

// ====== Показ финального окна ======
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
      div.innerHTML = `<b>Блок #${b.id}:</b> <span>${b.finalInterpretation}</span>`;
      blocks.appendChild(div);
    }
  });

  dialog.style.display = 'block';
}

onClick('exportFinalDialogBtn', () => {
  const final = state.globalFinalInterpretation || 'Итоговое толкование не найдено.';
  const blocksText = sortedBlocks()
    .filter(b => b.finalInterpretation)
    .map(b => `Блок #${b.id}: ${b.finalInterpretation}`)
    .join('\n\n');
  const text = `Итоговое толкование:\n${final}\n\nТолкования блоков:\n${blocksText}`;
  const blob = new Blob([text], {type: 'text/plain'});
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
});

// ====== Экспорт итогового толкования и блоков ======
onClick('menuExportFinal', () => {
  let final = state.finalGlobalInterpretation || 'Итоговое толкование не найдено.';
  let blocksText = sortedBlocks()
    .filter(b => b.finalInterpretation)
    .map(b => `Блок #${b.id}: ${b.finalInterpretation}`)
    .join('\n\n');
  const exportText = `Итоговое толкование:\n${final}\n\nТолкования блоков:\n${blocksText}`;
  const blob = new Blob([exportText], {type: 'text/plain'});
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
  hideAttachMenu();
});

// ====== Закрытие финального окна ======
onClick('closeFinalDialog', () => {
  const dialog = byId('finalDialog');
  if (dialog) dialog.style.display = 'none';
});

/* ====== Добавление блоков ====== */
function addBlockFromSelection() {
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

  selected.forEach(s => {
    s.classList.remove('selected');
    s.style.background = '#f0f0f0';
    s.style.color = '#888';
  });

  renderBlocksChips();
  resetSelectionColor();
}

function refreshSelectedBlocks() {
  const confirmMsg = 'Обновить выбранные блоки? Текущие блоки будут очищены, а выделения сброшены.';
  if (!confirm(confirmMsg)) return;

  state.blocks = [];
  state.currentBlockId = null;
  state.nextBlockId = 1;
  // (Если вдруг где-то останутся старые блоки — сбрасываем флаги)
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
  renderBlocksChips();
}

/* ====== Handlers ====== */
function initHandlers() {
  onClick('toStep2', () => {
    const dreamEl = byId('dream');
    state.dreamText = dreamEl ? dreamEl.value : '';
    if (!state.dreamText.trim()) { alert('Введите текст сна!'); return; }
    showStep(2);
    renderDreamView();
    resetSelectionColor();
    updateProgressIndicator();
  });

  onClick('toStep3', () => {
  if (!state.blocks.length) { alert('Добавьте хотя бы один блок!'); return; }
  // Если пользователь не выбрал блок — по умолчанию первый
  if (!state.currentBlockId) {
    state.currentBlockId = sortedBlocks()[0]?.id || null;
  }
  showStep(3);
  renderBlocksChips();
  updateProgressIndicator();
  const b = getCurrentBlock();
  // Новый блок: только если чат пустой, иначе не дублируем вопрос
  if (b && !b.done && (!b.chat || b.chat.length === 0)) startOrContinue();
});

  // Назад
  onClick('backTo1Top', () => { showStep(1); updateProgressIndicator(); });
onClick('backTo1', () => { showStep(1); updateProgressIndicator(); });
onClick('backTo2Header', () => { showStep(2); updateProgressIndicator(); });
onClick('backTo2Top', () => { showStep(2); updateProgressIndicator(); });

  // Добавление блоков (шаг 2)
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

  const refreshBtn = byId('refreshInline');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {});
  }

  onClick('blockInterpretBtn', blockInterpretation);
  onClick('finalInterpretBtn', finalInterpretation);

  // Отправка ответа
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

  // Enter в textarea
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

  // Jump-to-bottom и scrollend (2025)
  const chatEl = byId('chat');
  if (chatEl) {
    if ('onscrollend' in window) {
      chatEl.addEventListener('scrollend', () => {
        const jumpBtn = byId('jumpToBottom');
        if (jumpBtn) jumpBtn.style.display = isChatAtBottom() ? 'none' : 'inline-flex';
      });
    } else {
      chatEl.addEventListener('scroll', () => {
        const jumpBtn = byId('jumpToBottom');
        if (jumpBtn) jumpBtn.style.display = isChatAtBottom() ? 'none' : 'inline-flex';
      });
    }
    chatEl.addEventListener('click', hideAttachMenu);
  }
  onClick('jumpToBottom', scrollChatToBottom);

  // Скрепка и меню (ЛУНА)
  onClick('moonBtn', (e) => {
    e.stopPropagation();
    const menu = byId('attachMenu');
    if (!menu) return;
    menu.style.display = (menu.style.display !== 'none') ? 'none' : 'block';
  });

  onClick('menuExportFinal', () => {
  // Найти итоговое толкование (глобальное)
  let final = null;
  for (const b of state.blocks) {
    if (b.chat && b.chat.some(m => m.isGlobalFinal)) {
      final = b.chat.find(m => m.isGlobalFinal).text;
      break;
    }
  }
  if (!final) final = 'Итоговое толкование не найдено.';

  // Сохраняем в файл
  const blob = new Blob([final], {type: 'text/plain'});
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

  hideAttachMenu(); // чтобы меню закрывалось после экспорта
});

  // Клик вне меню — закрыть
  document.addEventListener('click', (e) => {
    const menu = byId('attachMenu');
    const bar = byId('chatInputBar');
    if (!menu || !bar) return;
    if (!bar.contains(e.target)) hideAttachMenu();
  });

  onClick('menuBlockInterpret', () => { hideAttachMenu(); blockInterpretation(); });
  onClick('menuFinalInterpret', () => { 
  hideAttachMenu(); 
  showFinalDialog(); 
});
  // Старые стрелки — если присутствуют в HTML
  onClick('nextBlockBtn', () => { const id = nextUndoneBlockIdStrict(); if (id) { selectBlock(id); const b = getCurrentBlock(); if (b && !b.done) startOrContinue(); } });
  onClick('prevBlockBtn', () => { const id = prevUndoneBlockIdStrict(); if (id) { selectBlock(id); const b = getCurrentBlock(); if (b && !b.done) startOrContinue(); } });

  // Экспорт/импорт
  onClick('exportBtn', exportJSON);
  onChange('importFile', (e) => { const f = e?.target?.files?.[0]; if (f) importJSON(f); });

  updateButtonsState();
  resetSelectionColor();
}

function hideAttachMenu() {
  const menu = byId('attachMenu');
  if (menu) menu.style.display = 'none';
}
function styleDisplay(el, value) {
  if (el) el.style.display = value;
}

/* ====== Boot ====== */
window.addEventListener('DOMContentLoaded', () => {
  showStep(1);
  updateProgressIndicator();

  // Если токен валиден — сразу показываем контент без вспышек
  if (getToken() === AUTH_TOKEN) {
    hideAuth();
  } else {
    showAuth();
    const authBtn = byId('authBtn');
    const authPass = byId('authPass');
    const authError = byId('authError');

    if (authBtn && authPass) {
      authBtn.onclick = () => {
        const val = authPass.value;
        if (val === AUTH_PASS) {
          setToken(AUTH_TOKEN);
          hideAuth();
          location.reload();
        } else {
          if (authError) authError.style.display = 'block';
        }
      };
      authPass.addEventListener('input', () => { if (authError) authError.style.display = 'none'; });
      authPass.addEventListener('keydown', e => { if (e.key === 'Enter' && authBtn) authBtn.click(); });
    }
  }

  initHandlers();

  // ====== 2025: Поддержка виртуальной клавиатуры ======
  if ('virtualKeyboard' in navigator) {
    try {
      navigator.virtualKeyboard.overlaysContent = true;
      navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
        const keyboardHeight = event.target.boundingRect.height;
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      });
    } catch (e) {}
  }

  // ====== 2025: Поддержка foldables и новых форм-факторов ======
  if (window.matchMedia('(spanning: single-fold-vertical)').matches) {
    document.documentElement.classList.add('foldable-vertical');
  }
});
