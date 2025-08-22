/* ====== Простая «авторизация» (как было) ====== */
const AUTH_PASS = 'volfisthebest';
const AUTH_TOKEN = 'volfisthebest-secret';

function getToken() { return localStorage.getItem('snova_token'); }
function setToken(t) { localStorage.setItem('snova_token', t); }

function showAuthIfNeeded() {
  // В этой версии убрал модальное окно, сразу даём токен, чтобы не мешать UX демо.
  if (!getToken()) setToken(AUTH_TOKEN);
}

/* ====== Состояние ====== */
const BLOCK_COLORS = ['#ffd966','#a4c2f4','#b6d7a8','#f4cccc','#d9d2e9'];
const state = {
  currentStep: 1,
  dreamText: '',
  blocks: [],
  currentBlockId: null,
  nextBlockId: 1
};

/* ====== Утилиты ====== */
const byId = (id)=>document.getElementById(id);
const onClick = (id, handler)=>{ const el=byId(id); if(el) el.onclick = handler; };

function setHeader(main, sub) {
  const m = byId('hdrMain'); const s = byId('hdrSub');
  if (m) m.textContent = main;
  if (s) s.textContent = sub;
}
function showStep(step) {
  ['step1','step2','step3'].forEach((id,i)=>{
    const el = byId(id); if(!el) return;
    el.style.display = (i+1===step)?'':'none';
  });
  state.currentStep = step;
  if (step === 1) setHeader('Saviora','Готово к разметке');
  if (step === 2) setHeader('Saviora','Выделите блоки');
  if (step === 3) {
    const b = getCurrentBlock();
    setHeader(`Блок #${b?.id ?? '—'}`, b ? (b.done ? 'Завершён' : 'Идёт диалог') : 'Блок не выбран');
  }
}
function updateHdrForBlock() {
  if (state.currentStep !== 3) return;
  const b = getCurrentBlock();
  setHeader(`Блок #${b?.id ?? '—'}`, b ? (b.done ? 'Завершён' : 'Идёт диалог') : 'Блок не выбран');
}

/* ====== Разметка текста сна ====== */
let currentSelectionColor = BLOCK_COLORS[0];
function resetSelectionColor() {
  currentSelectionColor = BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}

function renderDreamView() {
  const dv = byId('dreamView'); if (!dv) return;
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
        span.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
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
          } else {
            span.style.background = '#f0f0f0';
            span.style.color = '#888';
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

function hexToRgba(hex, alpha) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${alpha})`;
}

function renderBlocksChips() {
  const wrap = byId('blocks'); if (!wrap) return;
  wrap.innerHTML = '';
  state.blocks.forEach(b => {
    const el = document.createElement('div');
    el.className = 'chip' + (b.id === state.currentBlockId ? ' active' : '');
    el.textContent = `#${b.id} ${b.text.slice(0, 18)}${b.text.length > 18 ? '…' : ''}`;
    el.style.background = BLOCK_COLORS[(b.id - 1) % BLOCK_COLORS.length];
    el.style.color = '#111827';
    el.addEventListener('click', () => selectBlock(b.id));
    wrap.appendChild(el);
  });
  updateCurrentBlockLabel();
  renderDreamView();
  renderChat();
  updateButtonsState();
}

function updateCurrentBlockLabel() {
  const el = byId('currentBlock');
  const b = getCurrentBlock();
  if (el) el.textContent = b ? `Текущий блок #${b.id}: “${b.text}”` : 'Блок не выбран';
  updateHdrForBlock();
}

function getCurrentBlock() {
  return state.blocks.find(b => b.id === state.currentBlockId) || null;
}

/* ====== Чат ====== */
function isChatAtBottom() {
  const chat = byId('chat'); if (!chat) return true;
  const threshold = 8;
  return chat.scrollHeight - chat.scrollTop - chat.clientHeight <= threshold;
}
function scrollChatToBottom() {
  const chat = byId('chat'); if (!chat) return;
  chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  const j = byId('jumpToBottom'); if (j) j.style.display = 'none';
}
function renderChat() {
  const chat = byId('chat'); if (!chat) return;
  const b = getCurrentBlock(); chat.innerHTML = '';
  if (!b) return;

  for (const m of b.chat) {
    const div = document.createElement('div');
    if (m.isGlobalFinal) {
      div.className = 'msg final-global';
      div.textContent = m.text;
      chat.appendChild(div);
      continue;
    }
    div.className = 'msg ' + (m.role === 'bot' ? 'bot' : 'user');
    div.textContent = m.text;
    chat.appendChild(div);

    if (m.quickReplies?.length) {
      const q = document.createElement('div');
      q.className = 'quick';
      m.quickReplies.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'qbtn';
        btn.textContent = opt;
        btn.addEventListener('click', ()=> sendAnswer(opt));
        q.appendChild(btn);
      });
      chat.appendChild(q);
    }
  }
  if (isChatAtBottom()) {
    chat.scrollTop = chat.scrollHeight;
    const j = byId('jumpToBottom'); if (j) j.style.display = 'none';
  } else {
    const j = byId('jumpToBottom'); if (j) j.style.display = 'flex';
  }
  updateButtonsState();
}

/* ====== Навигация по блокам ====== */
function nextUndoneBlockId() {
  if (!state.blocks.length) return null;
  const sorted = [...state.blocks].sort((a,b)=>a.id-b.id);
  const currId = getCurrentBlock()?.id ?? -Infinity;
  for (const x of sorted) { if (x.id > currId && !x.done) return x.id; }
  for (const x of sorted) { if (!x.done) return x.id; }
  return null;
}
function prevUndoneBlockId() {
  if (!state.blocks.length) return null;
  const sorted = [...state.blocks].sort((a,b)=>a.id-b.id);
  const currId = getCurrentBlock()?.id ?? Infinity;
  for (let i=sorted.length-1;i>=0;i--) {
    const x = sorted[i];
    if (x.id < currId && !x.done) return x.id;
  }
  for (let i=sorted.length-1;i>=0;i--) {
    const x = sorted[i];
    if (!x.done) return x.id;
  }
  return null;
}
function goToNextBlock() {
  const id = nextUndoneBlockId();
  if (!id) { alert('Нет следующих незавершённых блоков.'); return; }
  selectBlock(id);
  const b = getCurrentBlock(); if (b && !b.done && b.chat.length===0) startOrContinue();
}
function goToPrevBlock() {
  const id = prevUndoneBlockId();
  if (!id) { alert('Нет предыдущих незавершённых блоков.'); return; }
  selectBlock(id);
  const b = getCurrentBlock(); if (b && !b.done && b.chat.length===0) startOrContinue();
}
function updateButtonsState() {
  const b = getCurrentBlock();
  const blockBtn = byId('blockInterpretBtn');
  const finalBtn = byId('finalInterpretBtn');

  if (blockBtn) blockBtn.classList.remove('btn-warn','btn-ok');
  if (finalBtn) finalBtn.classList.remove('btn-warn','btn-ok');

  const enoughForBlock = !!b && (b.userAnswersCount || 0) >= 5;
  if (blockBtn) {
    blockBtn.disabled = !enoughForBlock || !b || b.done;
    blockBtn.classList.add(blockBtn.disabled ? 'btn-warn' : 'btn-ok');
  }

  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;
  const enoughForFinal = finalsCount >= 2;
  if (finalBtn) {
    finalBtn.disabled = !enoughForFinal;
    finalBtn.classList.add(finalBtn.disabled ? 'btn-warn' : 'btn-ok');
  }

  // Меню скрепки — синхронизация
  const miBlock = byId('menuBlockInterpret');
  const miFinal = byId('menuFinalInterpret');
  if (miBlock) miBlock.disabled = !!blockBtn?.disabled;
  if (miFinal) miFinal.disabled = !!finalBtn?.disabled;

  // Навигационные стрелки
  const prevBtn = byId('prevBlockBtn');
  const nextBtn = byId('nextBlockBtn');
  if (prevBtn) prevBtn.disabled = !prevUndoneBlockId();
  if (nextBtn) nextBtn.disabled = !nextUndoneBlockId();

  // Кнопка отправки — активна, если есть текст и на шаге 3
  const sendBtn = byId('sendAnswerBtn');
  const input = byId('userInput');
  if (sendBtn && input) {
    const can = state.currentStep===3 && !!input.value.trim();
    sendBtn.disabled = !can;
  }
}

/* ====== Логика диалога ====== */
function appendUser(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;
  renderChat();
}
function appendBot(text, quickReplies = [], isFinal = false) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies, isFinal });
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

  const finalKeywords = ["итог","заключение","интерпретация","вывод","финал","конец","завершим"];
  isFinal = finalKeywords.some(k => cleanText.toLowerCase().includes(k));

  return { question: cleanText, quickReplies, isFinal };
}

async function apiRequest(url, data) {
  const token = getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (res.status === 401) {
    setToken('');
    throw new Error('Unauthorized');
  }
  return res.json();
}

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
    const aiRaw = data.choices?.[0]?.message?.content || '';
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
  } catch (e) {
    console.error(e);
    return { question: `Ошибка API: ${e.message || "Проверьте подключение"}`, quickReplies: ["Повторить"], isFinal: false };
  }
}

function getPrevBlocksSummary(currentBlockId, limit=3) {
  const prevFinals = state.blocks
    .filter(x => x.id !== currentBlockId && !!x.finalInterpretation)
    .sort((a,b) => (b.finalAt||0) - (a.finalAt||0))
    .slice(0, limit)
    .map(x => `#${x.id}: ${x.finalInterpretation}`);
  return prevFinals.join('\n');
}

async function startOrContinue() {
  const b = getCurrentBlock(); if (!b) return;
  // «typing» имитация (опционально можно показать три точки)
  try {
    const history = b.chat.map(m => ({ role: m.role, text: m.text }));
    const next = await llmNextStep(b.text, history);
    if (next.isFinal) {
      b.finalInterpretation = next.question.trim();
      b.finalAt = Date.now();
      b.done = true;
      appendBot(next.question, [], true);
    } else {
      appendBot(next.question, next.quickReplies);
    }
  } catch (e) {
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

  const btn = byId('blockInterpretBtn');
  if (btn) { btn.disabled = true; var prevText = btn.textContent; btn.textContent = 'Формируем…'; }

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";
    const history = [
      { role: 'user', content: 'Контекст блока сна:\n' + b.text },
      ...(() => { const prev = getPrevBlocksSummary(b.id, 3); return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : []; })(),
      ...b.chat.map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
      { role: 'user', content: 'Сформируй краткое толкование блока (3–6 предложений) без заголовков и терминологии.' }
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
  } catch (e) {
    appendBot("Ошибка при формировании толкования блока: " + (e.message || 'Неизвестная ошибка'), ["Повторить"]);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
    updateButtonsState();
  }
}

async function finalInterpretation() {
  const interpreted = state.blocks.filter(x => !!x.finalInterpretation);
  if (interpreted.length === 0) return alert('Нет ни одного толкования блока.');

  const btn = byId('finalInterpretBtn');
  if (btn) { btn.disabled = true; var prevText2 = btn.textContent; btn.textContent = 'Формируем…'; }

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";
    const blockText = (state.dreamText || '').slice(0, 4000);
    const history = [
      { role: 'user', content: 'Краткий контекст сна:\n' + blockText },
      { role: 'user', content: 'Итоговые толкования блоков:\n' + interpreted.map(b => `#${b.id}: ${b.finalInterpretation}`).join('\n') },
      { role: 'user', content: 'Составь единое итоговое толкование сна (5–9 предложений) без заголовков и терминологии.' }
    ];
    const data = await apiRequest(PROXY_URL, { blockText, history });
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content.replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/<\u2502?[^>]*\u2502?>/g, ' ')
      .replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content) content = 'Не удалось получить итоговое толкование.';
    appendFinalGlobal(content);
  } catch (e) {
    appendBot("Ошибка при формировании итогового толкования: " + (e.message || 'Неизвестная ошибка'), ["Повторить"]);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prevText2; }
    updateButtonsState();
  }
}

/* ====== Добавление/выбор блоков ====== */
function addBlockFromSelection() {
  const dv = byId('dreamView'); if (!dv) return;
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

/* ====== Импорт/Экспорт ====== */
function exportJSON() {
  const data = { dreamText: state.dreamText, blocks: state.blocks };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'saviora_session.json';
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
      const dreamEl = byId('dream'); if (dreamEl) dreamEl.value = state.dreamText;
      renderBlocksChips();
      resetSelectionColor();
      showStep(2);
    } catch(e) { alert('Не удалось импортировать JSON'); }
  };
  reader.readAsText(file);
}

/* ====== Свайпы для навигации по блокам ====== */
let touchStartX = 0, touchStartY = 0, touching = false;
function attachSwipeHandlers() {
  const chat = byId('chat'); if (!chat) return;
  chat.addEventListener('touchstart', (e)=>{
    if (!e.touches || e.touches.length !== 1) return;
    touching = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  chat.addEventListener('touchend', (e)=>{
    if (!touching) return; touching = false;
    const t = e.changedTouches?.[0]; if (!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      if (dx < 0) goToNextBlock();
      else goToPrevBlock();
    }
  }, { passive: true });
}

/* ====== Инициализация и обработчики UI ====== */
showAuthIfNeeded();

window.addEventListener('DOMContentLoaded', () => {
  // Header buttons
  onClick('backBtn', () => {
    if (state.currentStep === 2) showStep(1);
    else if (state.currentStep === 3) showStep(2);
    else showStep(1);
  });
  onClick('menuBtn', () => {
    // Открываем action sheet как меню
    openSheet();
  });

  // Step 1
  onClick('toStep2', () => {
    const dream = byId('dream').value;
    if (!dream.trim()) { alert('Введите текст сна!'); return; }
    state.dreamText = dream;
    showStep(2);
    renderDreamView();
    resetSelectionColor();
  });

  // Step 2
  onClick('toStep1', () => showStep(1));
  onClick('addBlock', addBlockFromSelection);
  onClick('addWholeBlock', () => {
    state.dreamText = byId('dream').value;
    if (!state.dreamText.trim()) { alert('Введите текст сна сначала!'); return; }
    if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
      alert('Весь текст уже добавлен как блок.'); return;
    }
    const id = state.nextBlockId++;
    const start = 0, end = state.dreamText.length;
    const text = state.dreamText;
    state.blocks.push({ id, start, end, text, done:false, chat:[], finalInterpretation:null, userAnswersCount:0 });
    state.currentBlockId = id;
    renderBlocksChips();
    resetSelectionColor();
  });
  onClick('toStep3', () => {
    if (!state.blocks.length) { alert('Добавьте хотя бы один блок!'); return; }
    state.currentBlockId = state.blocks[0].id;
    showStep(3);
    updateCurrentBlockLabel();
    renderChat();
    updateButtonsState();
    attachSwipeHandlers();
    const b = getCurrentBlock();
    if (b && !b.done && b.chat.length === 0) startOrContinue();
  });

  // Step 3 — ввод, отправка, автоскролл
  const input = byId('userInput');
  const sendBtn = byId('sendAnswerBtn');
  const chat = byId('chat');

  if (input) {
    // авто-рост от 1 до 4 строк
    const maxRows = 4;
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      const lineHeight = 20; // ~15px шрифт + паддинги
      const scroll = input.scrollHeight;
      const max = lineHeight * maxRows + 20;
      input.style.height = Math.min(scroll, max) + 'px';
      updateButtonsState();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      }
    });
  }

  onClick('sendAnswerBtn', () => {
    if (state.currentStep !== 3) return;
    const val = input.value.trim();
    if (!val) return;
    sendAnswer(val);
    input.value = '';
    input.style.height = '40px';
    setTimeout(scrollChatToBottom, 0);
  });

  // Jump-to-bottom
  onClick('jumpToBottom', scrollChatToBottom);
  if (chat) {
    chat.addEventListener('scroll', () => {
      const j = byId('jumpToBottom');
      if (!j) return;
      j.style.display = isChatAtBottom() ? 'none' : 'flex';
    });
  }

  // Навигация по кнопкам
  onClick('prevBlockBtn', goToPrevBlock);
  onClick('nextBlockBtn', goToNextBlock);

  // Скрепка: action sheet
  onClick('attachBtn', () => {
    openSheet();
  });
  onClick('menuBlockInterpret', () => { closeSheet(); blockInterpretation(); });
  onClick('menuFinalInterpret', () => { closeSheet(); finalInterpretation(); });
  onClick('menuExport', () => { closeSheet(); exportJSON(); });
  onClick('menuImport', () => {
    closeSheet();
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f=inp.files?.[0]; if (f) importJSON(f); };
    inp.click();
  });

  // Скрытые кнопки на всякий
  onClick('blockInterpretBtn', blockInterpretation);
  onClick('finalInterpretBtn', finalInterpretation);

  updateButtonsState();
});

/* ====== Action Sheet ====== */
function openSheet() {
  const sheet = byId('attachSheet');
  const backdrop = byId('sheetBackdrop');
  if (sheet && backdrop) {
    sheet.style.display = 'block';
    backdrop.style.display = 'block';
  }
}
function closeSheet() {
  const sheet = byId('attachSheet');
  const backdrop = byId('sheetBackdrop');
  if (sheet && backdrop) {
    sheet.style.display = 'none';
    backdrop.style.display = 'none';
  }
}
document.addEventListener('click', (e) => {
  const sheet = byId('attachSheet');
  const backdrop = byId('sheetBackdrop');
  const attachBtn = byId('attachBtn');
  if (!sheet || !backdrop) return;
  if (sheet.style.display !== 'block') return;
  const withinSheet = sheet.contains(e.target);
  const onAttach = attachBtn && attachBtn.contains(e.target);
  if (!withinSheet && !onAttach) closeSheet();
});

/* ====== Отправка/ответ ====== */
function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}
