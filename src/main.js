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

  const moonBaseColor = '#b0b3b8'; // насыщенный серый фон луны
  const moonProgressColor = '#44474a'; // тёмно-серый прогресс
  const craterColor = '#888a8d'; // чуть темнее кратеры

  // SVG: внешний ободок теперь строго по радиусу луны (r=20)
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

function showMoonNotice(text, ms = 4500) {
  const notice = document.getElementById('moonNotice');
  const moonBtn = document.getElementById('moonBtn');
  if (!notice || !moonBtn) return;

  notice.textContent = text;
  notice.style.display = 'block';
  notice.classList.remove('show');
  notice.style.opacity = '0';

  setTimeout(() => {
    // Получаем размеры
    const btnRect = moonBtn.getBoundingClientRect();
    const noticeRect = notice.getBoundingClientRect();

    // Центрируем по горизонтали относительно окна
    notice.style.left = '50%';
    notice.style.transform = 'translateX(-50%)';

    // По вертикали — над луной, как было
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

  // --- Добавлено: управление кнопкой экспорта толкования блока ---
  const exportBtn = byId('menuExportFinal');
  if (exportBtn) {
    const canExport = !!(b && b.finalInterpretation);
    exportBtn.disabled = !canExport;
    exportBtn.style.opacity = canExport ? 1 : 0.5;
  }
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

  // Очищаем от кода, html, шумовых символов и т.д.
  cleanText = cleanText
    .replace(/```[\s\S]*?```/g, ' ')   // убираем блоки кода
    .replace(/<[^>]+>/g, ' ')          // убираем html-теги
    .replace(/[\u2502\uFF5C]/g, ' ')   // убираем спецсимволы
    .replace(/[\u4e00-\u9fff]+/g, ' ') // убираем иероглифы
    .replace(/\s+/g, ' ')              // убираем лишние пробелы
    .trim();

  // Не ищем варианты ответов вообще!
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
function appendUser(text) {
  const b = getCurrentBlock();
  if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;

  renderMoonProgress(b.userAnswersCount, 10, false);

  // Показываем уведомление ровно на 10-м ответе (и только один раз)
  if (b.userAnswersCount === 10 && !b._moonFlashShown) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    showMoonNotice('Вы можете запросить итоговое толкование блока (луна) или продолжить диалог.');
  }

  renderChat();
  renderBlocksChips();
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

function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}

async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  // Если пользователь уже дал 10 ответов — показываем уведомление, но не блокируем диалог
  if (b.userAnswersCount === 10 && !b._moonFlashShown) {
    b._moonFlashShown = true;
    renderMoonProgress(b.userAnswersCount, 10, true);
    setTimeout(() => renderMoonProgress(b.userAnswersCount, 10, false), 2000);
    showMoonNotice('Теперь вы можете запросить Толкование Блока в Луне или продолжить диалог.');
    // Не делаем return!
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

function renderCabinet() {
  const list = loadCabinet();
  const wrap = document.getElementById('cabinetList');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div class="muted" style="margin:24px 0;">История пуста</div>';
    return;
  }
  wrap.innerHTML = list.map((entry, idx) => {
    const date = new Date(entry.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const preview = (entry.dreamText || '').split(/\s+/).slice(0, 5).join(' ') + '...';
    return `
      <div class="card" style="margin-bottom:14px; padding:18px 16px; position:relative;">
        <div style="font-size:15px; color:var(--text-secondary); margin-bottom:6px;">${date}</div>
        <div style="font-size:17px; font-weight:500; margin-bottom:10px;">${preview}</div>
        <button class="btn primary" data-view="${idx}" style="margin-right:8px;">Посмотреть</button>
        <button class="btn secondary" data-del="${idx}">Удалить</button>
      </div>
    `;
  }).join('');
  // Вешаем обработчики
  wrap.querySelectorAll('button[data-view]').forEach(btn => {
    btn.onclick = () => showCabinetEntry(+btn.dataset.view);
  });
  wrap.querySelectorAll('button[data-del]').forEach(btn => {
    btn.onclick = () => { if (confirm('Удалить запись?')) { removeFromCabinet(+btn.dataset.del); renderCabinet(); } };
  });
}

function showCabinetEntry(idx) {
  const list = loadCabinet();
  const entry = list[idx];
  if (!entry) return;
  // Используем финальное окно для показа
  const dialog = byId('finalDialog');
  const main = byId('finalDialogMain');
  const blocks = byId('finalDialogBlocks');
  if (!dialog || !main || !blocks) return;

  main.innerHTML = `<div style="font-size:15px; color:var(--text-secondary); margin-bottom:8px;">${new Date(entry.date).toLocaleString('ru-RU')}</div>
    <div style="margin-bottom:12px;"><b>Текст сна:</b><br>${entry.dreamText}</div>
    <div style="margin-bottom:12px;"><b>Итоговое толкование:</b><br>${entry.finalInterpretation || '<i>Нет</i>'}</div>`;
  blocks.innerHTML = (entry.blocks || []).map((b, i) =>
    `<div style="margin-bottom:14px;"><b>Блок #${i+1}:</b> <span>${b.finalInterpretation || '<i>Нет толкования</i>'}</span></div>`
  ).join('');
  dialog.style.display = 'block';
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
    saveCurrentSessionToCabinet();

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

function saveCurrentSessionToCabinet() {
  if (!state.dreamText?.trim() || !state.blocks?.length) return;
  const entry = {
    date: Date.now(),
    dreamText: state.dreamText,
    finalInterpretation: state.globalFinalInterpretation || '',
    blocks: state.blocks.map(b => ({
      text: b.text,
      finalInterpretation: b.finalInterpretation || '',
      chat: b.chat || []
    }))
  };
  addToCabinet(entry);
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

// ====== Экспорт итогового толкования и блоков ======
function exportFinalTXT() {
  const title = 'Saviora — Толкование сна';
  const date = new Date().toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
  const dream = state.dreamText || '(нет текста)';
  const final = state.globalFinalInterpretation || 'Итоговое толкование не найдено.';
  const blocks = sortedBlocks().filter(b => b.finalInterpretation);

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
  exportFinalTXT();
  hideAttachMenu();
});

onClick('exportFinalDialogBtn', () => {
  exportFinalTXT();
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
  if (state.globalFinalInterpretation) {
    showFinalDialog();
  } else {
    finalInterpretation();
  }
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

onClick('openCabinetBtn', () => {
  renderCabinet();
  byId('cabinetModal').style.display = 'block';
});
onClick('closeCabinetBtn', () => {
  byId('cabinetModal').style.display = 'none';
});
onClick('clearCabinetBtn', () => {
  if (confirm('Очистить всю историю?')) {
    clearCabinet();
    renderCabinet();
  }
});

function hideAttachMenu() {
  const menu = byId('attachMenu');
  if (menu) menu.style.display = 'none';
}
function styleDisplay(el, value) {
  if (el) el.style.display = value;
}

// ====== Кабинет: localStorage ======
const CABINET_KEY = 'saviora_cabinet';

function loadCabinet() {
  try {
    return JSON.parse(localStorage.getItem(CABINET_KEY)) || [];
  } catch { return []; }
}
function saveCabinet(arr) {
  localStorage.setItem(CABINET_KEY, JSON.stringify(arr));
}
function addToCabinet(entry) {
  const arr = loadCabinet();
  arr.unshift(entry); // новые сверху
  saveCabinet(arr);
  updateStorageIndicator();
}
function removeFromCabinet(idx) {
  const arr = loadCabinet();
  arr.splice(idx, 1);
  saveCabinet(arr);
  updateStorageIndicator(); // <--- и сюда
}
function clearCabinet() {
  localStorage.removeItem(CABINET_KEY);
  updateStorageIndicator(); // <--- и сюда
}

// ====== Индикатор заполненности localStorage ======
const SAFE_LS_LIMIT = 2 * 1024 * 1024; // 2 МБ
const AVG_DREAM_SIZE = 1200; // символов
const WAR_AND_PEACE_TOM_SIZE = 650000; // символов

function getBarColor(percent) {
  if (percent < 60) return '#22c55e'; // зелёный
  if (percent < 90) return '#facc15'; // жёлтый
  return '#ef4444'; // красный
}

function updateStorageIndicator() {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const v = localStorage.getItem(k);
    used += k.length + (v ? v.length : 0);
  }
  const percent = Math.min(100, Math.round(used / SAFE_LS_LIMIT * 100));
  const dreamsLeft = Math.max(0, Math.ceil((SAFE_LS_LIMIT - used) / AVG_DREAM_SIZE));
  const tomsLeft = Math.max(0, ((SAFE_LS_LIMIT - used) / WAR_AND_PEACE_TOM_SIZE));
  const bar = document.getElementById('storageBar');
  const text = document.getElementById('storageText');

  if (bar) bar.style.width = percent + '%';
  if (text) {
  text.style.color = getBarColor(percent);
  text.textContent = percent + '%';
  }
}

/* ====== Boot ====== */
window.addEventListener('DOMContentLoaded', () => {
  showStep(1);
  updateProgressIndicator();
  updateStorageIndicator();

  // Синхронизируем ширину индикатора с кнопкой
  const btn = document.getElementById('openCabinetBtn');
  const barContainer = document.getElementById('storageBarContainer');
  if (btn && barContainer) {
    barContainer.style.width = btn.offsetWidth + 'px';
  }
  window.addEventListener('resize', function() {
    if (btn && barContainer) {
      barContainer.style.width = btn.offsetWidth + 'px';
    }
  });

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
