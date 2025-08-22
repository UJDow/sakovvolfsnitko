const AUTH_PASS = 'volfisthebest';
const AUTH_TOKEN = 'volfisthebest-secret';

function showAuth() {
  const authDiv = document.getElementById('auth');
  authDiv.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.body.classList.add('auth-mode');
  setTimeout(() => {
    document.getElementById('authPass').focus();
  }, 100);
}

const BLOCK_COLORS = ['#ffd966','#a4c2f4','#b6d7a8','#f4cccc','#d9d2e9'];

let currentSelectionColor = null;
function resetSelectionColor() {
  currentSelectionColor = BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}

function hideAuth() {
  const authDiv = document.getElementById('auth');
  authDiv.style.display = 'none';
  document.body.style.overflow = '';
  document.body.classList.remove('auth-mode');
}

function getToken() { return localStorage.getItem('snova_token'); }
function setToken(token) { localStorage.setItem('snova_token', token); }

function checkAuth() {
  if (getToken() === AUTH_TOKEN) { hideAuth(); return true; }
  showAuth(); return false;
}

window.addEventListener('DOMContentLoaded', () => {
  showStep(1);
  if (!checkAuth()) {
    const authBtn = document.getElementById('authBtn');
    const authPass = document.getElementById('authPass');
    const authError = document.getElementById('authError');

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
});

const state = {
  dreamText: '',
  blocks: [],
  currentBlockId: null,
  nextBlockId: 1,
  currentStep: 1
};

function showStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step' + i);
    if (el) el.style.display = (i === step) ? '' : 'none';
  }
  state.currentStep = step;
}

function byId(id) { return document.getElementById(id); }
function onClick(id, handler) { const el = byId(id); if (el) el.onclick = handler; }
function onChange(id, handler) { const el = byId(id); if (el) el.onchange = handler; }

document.getElementById('toStep2').onclick = function() {
  state.dreamText = document.getElementById('dream').value;
  if (!state.dreamText.trim()) { alert('Введите текст сна!'); return; }
  showStep(2);
  renderDreamView();
  resetSelectionColor();
};

document.getElementById('toStep3').onclick = function() {
  if (!state.blocks.length) { alert('Добавьте хотя бы один блок!'); return; }
  state.currentBlockId = state.blocks[0]?.id || null;

  showStep(3);
  renderBlocksChips();

  const b = getCurrentBlock();
  if (b && !b.done) startOrContinue();
};

document.getElementById('backTo1').onclick = function() { showStep(1); };
document.getElementById('backTo2').onclick = function() { showStep(2); };

function getNextBlockColor() {
  return BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}
function hexToRgba(hex, alpha) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${alpha})`;
}

function renderDreamView() {
  const dv = byId('dreamView');
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
      span.dataset.start = pos;
      span.dataset.end = pos + token.length;

      if (block) {
        const color = BLOCK_COLORS[(block.id - 1) % BLOCK_COLORS.length];
        span.style.background = color;
        span.style.color = '#222';
        span.style.borderRadius = '4px';
        span.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.07)';
        span.setAttribute('data-block', block.id);
        span.title = `Блок #${block.id}`;
        span.addEventListener('click', () => selectBlock(block.id));
      } else {
        span.style.background = '#f0f0f0';
        span.style.color = '#888';
        span.style.borderRadius = '4px';
        span.classList.add('tile');
        span.addEventListener('click', function(e) {
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

function renderBlocksChips() {
  const wrap = byId('blocks');
  wrap.innerHTML = '';
  state.blocks.forEach(b => {
    const el = document.createElement('div');
    el.className = 'chip' + (b.id === state.currentBlockId ? ' active' : '');
    el.textContent = `#${b.id} ${b.text.slice(0,20)}${b.text.length>20?'…':''}`;
    el.style.background = BLOCK_COLORS[(b.id - 1) % BLOCK_COLORS.length];
    el.style.color = '#222';
    el.addEventListener('click', ()=>selectBlock(b.id));
    wrap.appendChild(el);
  });
  const cb = byId('currentBlock');
  const b = getCurrentBlock();
  cb.textContent = b ? `Текущий блок #${b.id}: “${b.text}”` : 'Блок не выбран';
  renderDreamView();
  renderChat();
  updateButtonsState();
}

function getCurrentBlock() {
  return state.blocks.find(b => b.id === state.currentBlockId) || null;
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

/* ========= Chat helpers: jump-to-bottom ========= */
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

function renderChat() {
  const chat = byId('chat');
  const b = getCurrentBlock();
  chat.innerHTML = '';
  if (!b) return;
  for (const m of b.chat) {
    const div = document.createElement('div');
    const baseClass = 'msg ' + (m.role === 'bot' ? 'bot' : 'user');
    div.className = baseClass
      + (m.isFinal ? ' final' : '')
      + (m.isGlobalFinal ? ' final-global' : '');
    div.textContent = m.text;
    chat.appendChild(div);
    if (m.quickReplies?.length) {
      const q = document.createElement('div');
      q.className = 'quick';
      m.quickReplies.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.addEventListener('click', ()=>sendAnswer(opt));
        q.appendChild(btn);
      });
      chat.appendChild(q);
    }
  }
  // Автоскролл вниз только если пользователь был у низа
  if (isChatAtBottom()) {
    chat.scrollTop = chat.scrollHeight;
    const j = byId('jumpToBottom'); if (j) j.style.display = 'none';
  } else {
    const j = byId('jumpToBottom'); if (j) j.style.display = 'inline-flex';
  }
  updateButtonsState();
}

/* ========= Навигация по блокам ========= */
function nextUndoneBlockId() {
  if (!state.blocks.length) return null;
  const sorted = [...state.blocks].sort((a, b) => a.id - b.id);
  const curr = getCurrentBlock();
  const currId = curr?.id ?? -Infinity;
  for (const x of sorted) { if (x.id > currId && !x.done) return x.id; }
  for (const x of sorted) { if (!x.done) return x.id; }
  return null;
}
function prevUndoneBlockId() {
  if (!state.blocks.length) return null;
  const sorted = [...state.blocks].sort((a, b) => a.id - b.id);
  const curr = getCurrentBlock();
  const currId = curr?.id ?? Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const x = sorted[i];
    if (x.id < currId && !x.done) return x.id;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const x = sorted[i];
    if (!x.done) return x.id;
  }
  return null;
}
function goToNextBlock() {
  const nextId = nextUndoneBlockId();
  if (!nextId) { alert('Больше нет незавершённых блоков.'); return; }
  selectBlock(nextId);
  const b = getCurrentBlock();
  if (b && !b.done) startOrContinue();
}
function goToPrevBlock() {
  const prevId = prevUndoneBlockId();
  if (!prevId) { alert('Предыдущих незавершённых блоков нет.'); return; }
  selectBlock(prevId);
  const b = getCurrentBlock();
  if (b && !b.done) startOrContinue();
}

function updateButtonsState() {
  const b = getCurrentBlock();
  const blockBtn = byId('blockInterpretBtn');
  const finalBtn = byId('finalInterpretBtn');

  if (blockBtn) blockBtn.classList.remove('btn-warn', 'btn-ok');
  if (finalBtn) finalBtn.classList.remove('btn-warn', 'btn-ok');

  const enoughForBlock = !!b && (b.userAnswersCount || 0) >= 5;
  if (blockBtn) blockBtn.classList.add(enoughForBlock ? 'btn-ok' : 'btn-warn');
  if (blockBtn) blockBtn.disabled = !enoughForBlock || !b || b.done;

  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;
  const enoughForFinal = finalsCount >= 2;
  if (finalBtn) finalBtn.classList.add(enoughForFinal ? 'btn-ok' : 'btn-warn');
  if (finalBtn) finalBtn.disabled = !enoughForFinal;

  // Навигационные стрелки: активны если есть куда идти
  const prevBtn = byId('prevBlockBtn');
  const nextBtn2 = byId('nextBlockBtn');
  if (prevBtn) prevBtn.disabled = !prevUndoneBlockId();
  if (nextBtn2) nextBtn2.disabled = !nextUndoneBlockId();

  // Синхронизация доступности пунктов меню скрепки
  const miBlock = byId('menuBlockInterpret');
  const miFinal = byId('menuFinalInterpret');
  if (miBlock) { miBlock.disabled = blockBtn ? blockBtn.disabled : false; miBlock.style.opacity = miBlock.disabled ? 0.5 : 1; }
  if (miFinal) { miFinal.disabled = finalBtn ? finalBtn.disabled : false; miFinal.style.opacity = miFinal.disabled ? 0.5 : 1; }
}

function appendUser(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;
  renderChat();
}
function appendFinalGlobal(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies: [], isFinal: true, isGlobalFinal: true });
  renderChat();
}

function parseAIResponse(text) {
  const quickMatch = text.match(/\[([^\]]+)\]\s*$/);
  let quickReplies = [];
  let cleanText = text;
  let isFinal = false;

  if (quickMatch) {
    quickReplies = quickMatch[1].split(/\s*\|\s*/).slice(0, 3);
    cleanText = text.substring(0, quickMatch.index).trim();
  }

  const finalKeywords = [
    "итог","заключение","интерпретация","вывод",
    "давай закончим","заканчиваем","завершай","финал","конец"
  ];
  isFinal = finalKeywords.some(k => cleanText.toLowerCase().includes(k));

  return { question: cleanText, quickReplies, isFinal };
}

function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}
function appendBot(text, quickReplies = [], isFinal = false) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies, isFinal });
  renderChat();
}

async function apiRequest(url, data) {
  const token = getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (res.status === 401) {
    setToken('');
    showAuth();
    throw new Error('Unauthorized');
  }
  return res.json();
}

/* ====== Основной цикл ИИ без кнопки start ====== */
async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');
  try {
    const history = b.chat.map(m => ({ role: m.role, text: m.text }));
    const next = await llmNextStep(b.text, history);

    if (next.isFinal) {
      b.finalInterpretation = next.question.trim();
      b.finalAt = Date.now();
      b.done = true;
      appendBot(next.question, [], true);
      updateButtonsState();
    } else {
      appendBot(next.question, next.quickReplies);
    }
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при обработке запроса", ["Повторить"]);
  } finally {
    updateButtonsState();
  }
}

/* ====== Толкования ====== */
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');
  if ((b.userAnswersCount || 0) < 5) return alert('Нужно минимум 5 ответов по этому блоку.');

  const btn = byId('blockInterpretBtn'); if (btn) { btn.disabled = true; var prevText = btn.textContent; btn.textContent = 'Формируем толкование...'; }

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";
    const history = [
      { role: 'user', content: 'Контекст блока сна:\n' + b.text },
      ...(() => { const prev = getPrevBlocksSummary(b.id, 3); return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : []; })(),
      ...b.chat.map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
      { role: 'user', content: 'Составь единое итоговое толкование сна (3–6 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Не используй специальную терминологию. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];
    const data = await apiRequest(PROXY_URL, { blockText: b.text, history });
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content.replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/<\u2502?[^>]*\u2502?>/g, ' ')
      .replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content) content = 'Не удалось получить толкование.';

    b.finalInterpretation = content;
    b.finalAt = Date.now();
    b.done = true;
    appendBot(content, [], true);
    updateButtonsState();
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при формировании толкования блока: " + (e.message || 'Неизвестная ошибка'), ["Повторить"]);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
  }
}

async function finalInterpretation() {
  const interpreted = state.blocks.filter(x => !!x.finalInterpretation);
  if (interpreted.length === 0) return alert('Нет ни одного толкования блока.');

  const btn = byId('finalInterpretBtn'); if (btn) { btn.disabled = true; var prevText2 = btn.textContent; btn.textContent = 'Формируем итог...'; }

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";
    const blockText = (state.dreamText || '').slice(0, 4000);
    const history = [
      { role: 'user', content: 'Краткий контекст сна:\n' + blockText },
      { role: 'user', content: 'Итоговые толкования блоков:\n' + interpreted.map(b => `#${b.id}: ${b.finalInterpretation}`).join('\n') },
      { role: 'user', content: 'Составь единое итоговое толкование сна (5–9 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Не используй специальную терминологию. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];
    const data = await apiRequest(PROXY_URL, { blockText, history });
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content.replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/<\u2502?[^>]*\u2502?>/g, ' ')
      .replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content) content = 'Не удалось получить итоговое толкование.';
    const b = getCurrentBlock();
    if (b) appendFinalGlobal(content);
    else alert('Готово: итоговое толкование сформировано. Откройте любой блок, чтобы увидеть сообщение.');
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при формировании итогового толкования: " + (e.message || 'Неизвестная ошибка'), ["Повторить"]);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prevText2; }
  }
}

/* ====== Ход диалога ====== */
async function llmNextStep(blockText, history) {
  const b = getCurrentBlock();
  if (!b) return { question: "Ошибка: блок не выбран", quickReplies: ["Повторить"], isFinal: false };

  const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

  try {
    const data = await apiRequest(PROXY_URL, {
      blockText: b.text,
      history: [
        { role: 'user', content: 'Контекст блока сна:\n' + b.text },
        ...(() => { const prev = getPrevBlocksSummary(b.id, 3); return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : []; })(),
        ...b.chat.map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }))
      ]
    });

    const aiRaw = data.choices[0].message.content || '';
    function stripNoiseLite(s) {
      if (!s) return s;
      s = s.replace(/```[\s\S]*?```/g, ' ');
      s = s.replace(/<\u2502?[^>]*\u2502?>/g, ' ');
      s = s.replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ');
      s = s.replace(/[\u4e00-\u9fff]+/g, ' ');
      s = s.replace(/\b[a-zA-Z]{2,}\b/g, ' ');
      return s.trim();
    }
    const aiResponse = stripNoiseLite(aiRaw);
    return parseAIResponse(aiResponse);
  } catch (error) {
    return { question: `Ошибка API: ${error.message || "Проверьте подключение"}`, quickReplies: ["Повторить запрос"], isFinal: false };
  }
}

/* ====== Экспорт/импорт ====== */
function exportJSON() {
  const data = { dreamText: state.dreamText, blocks: state.blocks };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
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
        chat: b.chat || [],
        finalInterpretation: b.finalInterpretation ?? null,
        userAnswersCount: b.userAnswersCount ?? 0
      }));
      state.nextBlockId = Math.max(1, ...state.blocks.map(b=>b.id+1));
      state.currentBlockId = state.blocks[0]?.id || null;
      byId('dream').value = state.dreamText;
      renderBlocksChips();
      resetSelectionColor();
    } catch(e) { alert('Не удалось импортировать JSON'); }
  };
  reader.readAsText(file);
}

/* ====== Handlers ====== */
onClick('addBlock', addBlockFromSelection);
onClick('addWholeBlock', function() {
  state.dreamText = byId('dream').value;
  if (!state.dreamText.trim()) { alert('Введите текст сна сначала!'); return; }
  if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
    alert('Весь текст уже добавлен как блок.'); return;
  }
  const id = state.nextBlockId++;
  const start = 0;
  const end = state.dreamText.length;
  const text = state.dreamText;
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
  state.currentBlockId = id;
  showStep(2);
  renderBlocksChips();
  resetSelectionColor();
});
onClick('blockInterpretBtn', blockInterpretation);
onClick('finalInterpretBtn', finalInterpretation);

// Отправка ответа
onClick('sendAnswerBtn', () => {
  if (state.currentStep !== 3) { alert('Перейдите к шагу "Работа с блоками"'); return; }
  const el = byId('userInput');
  const val = el.value.trim();
  if (!val) return;
  sendAnswer(val);
  el.value = '';
  // Авто-склейка к низу
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
}

// Jump-to-bottom
const chatEl = byId('chat');
if (chatEl) {
  chatEl.addEventListener('scroll', () => {
    const jumpBtn = byId('jumpToBottom');
    if (!jumpBtn) return;
    jumpBtn.style.display = isChatAtBottom() ? 'none' : 'inline-flex';
  });
}
onClick('jumpToBottom', scrollChatToBottom);

// Скрепка и меню
onClick('attachBtn', () => {
  const menu = byId('attachMenu');
  if (!menu) return;
  menu.style.display = (menu.style.display !== 'none') ? 'none' : 'block';
});
document.addEventListener('click', (e) => {
  const menu = byId('attachMenu');
  const bar = byId('chatInputBar');
  if (!menu || !bar) return;
  if (!bar.contains(e.target)) menu.style.display = 'none';
});
onClick('menuBlockInterpret', () => { blockInterpretation(); const m = byId('attachMenu'); if (m) m.style.display = 'none'; });
onClick('menuFinalInterpret', () => { finalInterpretation(); const m = byId('attachMenu'); if (m) m.style.display = 'none'; });

// Стрелки
onClick('nextBlockBtn', goToNextBlock);
onClick('prevBlockBtn', goToPrevBlock);

// Инициализация
updateButtonsState();
resetSelectionColor();

/* ====== Выделение блоков (оставлено без изменений) ====== */
function addBlockFromSelection() {
  const dv = byId('dreamView');
  const selected = Array.from(dv.querySelectorAll('.tile.selected'));
  if (!selected.length) return alert('Выделите плиточки для блока.');

  const start = Math.min(...selected.map(s => parseInt(s.dataset.start, 10)));
  const end = Math.max(...selected.map(s => parseInt(s.dataset.end, 10)));

  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }
  const id = state.nextBlockId++;
  const text = state.dreamText.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
  state.currentBlockId = id;

  selected.forEach(s => {
    s.classList.remove('selected');
    s.style.background = '#f0f0f0';
    s.style.color = '#888';
  });

  renderBlocksChips();
  resetSelectionColor();
}

function selectBlock(id) {
  state.currentBlockId = id;
  renderBlocksChips();
  const b = getCurrentBlock();
  if (b && !b.done && b.chat.length === 0) startOrContinue();
}
