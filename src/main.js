const AUTH_PASS = 'muksud'; // твой пароль
const AUTH_TOKEN = 'muksud-secret'; // этот же токен будет использоваться для запросов к воркеру

function showAuth() {
  const authDiv = document.getElementById('auth');
  authDiv.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideAuth() {
  const authDiv = document.getElementById('auth');
  authDiv.style.display = 'none';
  document.body.style.overflow = '';
}

function getToken() {
  return localStorage.getItem('snova_token');
}

function setToken(token) {
  localStorage.setItem('snova_token', token);
}

function checkAuth() {
  if (getToken() === AUTH_TOKEN) {
    hideAuth();
    return true;
  }
  showAuth();
  return false;
}

window.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) {
    document.getElementById('authBtn').onclick = () => {
      const val = document.getElementById('authPass').value;
      if (val === AUTH_PASS) {
        setToken(AUTH_TOKEN);
        hideAuth();
        location.reload();
      } else {
        document.getElementById('authError').style.display = 'block';
      }
    };
  }
});

const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: [], finalInterpretation: string|null, userAnswersCount: number}
  currentBlockId: null,
  nextBlockId: 1
};

function byId(id) { return document.getElementById(id); }

// Рендер сна с точным соответствием текстовых узлов кускам исходного текста.
// Каждый Text-узел получает __rawStart/__rawEnd для обратного мэппинга выделения.
function renderDreamView() {
  const dv = byId('dreamView');
  dv.innerHTML = '';
  const t = state.dreamText || '';
  if (!t) return;

  const sorted = [...state.blocks].sort((a,b)=>a.start-b.start);
  let idx = 0;

  function appendTextSlice(start, end, wrapMark) {
    if (start >= end) return;
    const text = t.slice(start, end);
    const textNode = document.createTextNode(text);
    textNode.__rawStart = start;
    textNode.__rawEnd = end;

    if (wrapMark) {
      const mark = document.createElement('mark');
      mark.setAttribute('data-block', wrapMark.id);
      mark.title = `Блок #${wrapMark.id}`;
      mark.appendChild(textNode);
      dv.appendChild(mark);
      mark.addEventListener('click', () => selectBlock(wrapMark.id));
    } else {
      dv.appendChild(textNode);
    }
  }

  for (const b of sorted) {
    if (b.start > idx) appendTextSlice(idx, b.start, null);
    appendTextSlice(b.start, b.end, b);
    idx = b.end;
  }
  if (idx < t.length) appendTextSlice(idx, t.length, null);
}

function renderBlocksChips() {
  const wrap = byId('blocks');
  wrap.innerHTML = '';
  state.blocks.forEach(b => {
    const el = document.createElement('div');
    el.className = 'chip' + (b.id === state.currentBlockId ? ' active' : '');
    el.textContent = `#${b.id} ${b.text.slice(0,20)}${b.text.length>20?'…':''}`;
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

// Утилиты для преобразования DOM-Range в абсолютные индексы исходного текста
function findTextNodeAndLocalOffset(node, offset) {
  if (node.nodeType === Node.TEXT_NODE) return { node, offset };
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  let curr = walker.nextNode();
  let seen = 0;
  while (curr) {
    const len = curr.nodeValue.length;
    if (offset <= seen + len) {
      return { node: curr, offset: Math.max(0, offset - seen) };
    }
    seen += len;
    curr = walker.nextNode();
  }
  return null;
}

function toAbsolute(node, off) {
  const res = findTextNodeAndLocalOffset(node, off);
  if (!res || res.node.__rawStart == null) return null;
  const local = Math.max(0, Math.min(off, res.node.nodeValue.length));
  return res.node.__rawStart + local;
}

function getSelectionOffsets() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!range || range.collapsed) return null;

  const dv = byId('dreamView');
  if (!dv.contains(range.startContainer) || !dv.contains(range.endContainer)) return null;

  const start = toAbsolute(range.startContainer, range.startOffset);
  const end = toAbsolute(range.endContainer, range.endOffset);
  if (start == null || end == null) return null;

  return start <= end ? { start, end } : { start: end, end: start };
}

// Добавить весь текст как блок
function addWholeBlock() {
  if (!state.dreamText) return;
  if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
    alert('Весь текст уже добавлен как блок.');
    return;
  }
  const id = state.nextBlockId++;
  const start = 0;
  const end = state.dreamText.length;
  const text = state.dreamText;
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
  state.currentBlockId = id;
  renderBlocksChips();
}

// Добавить блок по выделению
function addBlockFromSelection() {
  if (!state.dreamText) return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');
  const off = getSelectionOffsets();
  if (!off) return alert('Не удалось определить выделение. Выделите текст в области ниже.');

  let start = Math.max(0, Math.min(off.start, state.dreamText.length));
  let end = Math.max(0, Math.min(off.end, state.dreamText.length));
  if (start === end) return alert('Пустое выделение.');

  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }
  const id = state.nextBlockId++;
  const text = state.dreamText.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
  state.currentBlockId = id;
  renderBlocksChips();
}

// Авторазбиение на предложения
function autoSplitSentences() {
  const t = (state.dreamText||'').trim();
  if (!t) return;
  const sentences = t.split(/(?<=[\.\!\?])\s+/).filter(s => s.length > 10).slice(0, 5);
  state.blocks = [];
  state.nextBlockId = 1;
  let cursor = 0;
  for (const s of sentences) {
    const start = state.dreamText.indexOf(s, cursor);
    const end = start + s.length;
    const id = state.nextBlockId++;
    state.blocks.push({ id, start, end, text: s, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
    cursor = end;
  }
  state.currentBlockId = state.blocks[0]?.id || null;
  renderBlocksChips();
}

function selectBlock(id) {
  state.currentBlockId = id;
  renderBlocksChips();
}

function getCurrentBlock() {
  return state.blocks.find(b => b.id === state.currentBlockId) || null;
}

// Собрать краткие итоги предыдущих блоков (1–3 последних финала перед текущим)
function getPrevBlocksSummary(currentBlockId, limit = 3) {
  const current = state.blocks.find(b => b.id === currentBlockId);
  if (!current) return '';
  const prevFinals = state.blocks
    .filter(x => x.id !== currentBlockId && !!x.finalInterpretation) // любые уже интерпретированные, кроме текущего
    .sort((a, b) => (b.finalAt || 0) - (a.finalAt || 0)) // последние по времени анализа
    .slice(0, limit)
    .map(x => `#${x.id}: ${x.finalInterpretation}`);
  return prevFinals.length ? prevFinals.join('\n') : '';
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
  chat.scrollTop = chat.scrollHeight;
  updateButtonsState();
}

function nextUndoneBlockId() {
  if (!state.blocks.length) return null;
  const sorted = [...state.blocks].sort((a, b) => a.id - b.id);
  const curr = getCurrentBlock();
  const currId = curr?.id ?? -Infinity;

  // 1) сначала ищем следующий по id > текущего
  for (const x of sorted) {
    if (x.id > currId && !x.done) return x.id;
  }
  // 2) если не нашли — ищем с начала
  for (const x of sorted) {
    if (!x.done) return x.id;
  }
  return null;
}

function goToNextUndoneAndStart() {
  const nextId = nextUndoneBlockId();
  if (!nextId) {
    alert('Все блоки завершены.');
    return;
  }
  selectBlock(nextId);
  startOrContinue();
}

function updateButtonsState() {
  const b = getCurrentBlock();
  const blockBtn = byId('blockInterpretBtn');
  const finalBtn = byId('finalInterpretBtn');
  const startBtn = byId('start');

  // Сбросим классы перед проставлением новых
  if (blockBtn) blockBtn.classList.remove('btn-warn', 'btn-ok');
  if (finalBtn) finalBtn.classList.remove('btn-warn', 'btn-ok');

  // Логика для "Толкование блока"
  const enoughForBlock = !!b && (b.userAnswersCount || 0) >= 5;
  if (blockBtn) blockBtn.classList.add(enoughForBlock ? 'btn-ok' : 'btn-warn');

  // Логика для "Итоговое толкование"
  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;
  const enoughForFinal = finalsCount >= 2;
  if (finalBtn) finalBtn.classList.add(enoughForFinal ? 'btn-ok' : 'btn-warn');

  // Динамика для кнопки "Начать"
  if (startBtn) {
    startBtn.onclick = null; // чтобы не накапливались обработчики
    if (b && b.done) {
      startBtn.textContent = 'Перейти к следующему блоку';
      startBtn.disabled = false;
      startBtn.onclick = goToNextUndoneAndStart;
    } else {
      startBtn.textContent = 'Начать';
      startBtn.disabled = false;
      startBtn.onclick = startOrContinue;
    }
  }
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

// Функция для парсинга ответов ИИ
function parseAIResponse(text) {
  const quickMatch = text.match(/\[([^\]]+)\]\s*$/);
  let quickReplies = [];
  let cleanText = text;
  let isFinal = false;

  if (quickMatch) {
    quickReplies = quickMatch[1].split(/\s*\|\s*/).slice(0, 3);
    cleanText = text.substring(0, quickMatch.index).trim();
  }

  const finalKeywords = ["итог", "заключение", "интерпретация", "вывод"];
  isFinal = finalKeywords.some(keyword =>
    cleanText.toLowerCase().includes(keyword.toLowerCase())
  );

  return {
    question: cleanText,
    quickReplies,
    isFinal
  };
}

// Отправка ответа пользователя
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

// Основная функция для работы с ИИ
async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  const startBtn = byId('start');
  startBtn.disabled = true;
  startBtn.textContent = "Генерируем...";

  try {
    const history = b.chat.map(m => ({
      role: m.role,
      text: m.text
    }));

    const next = await llmNextStep(b.text, history);

    // Если модель выдала финал естественно — фиксируем это как итог блока
    if (next.isFinal) {
      b.finalInterpretation = next.question.trim();
      b.finalAt = Date.now();
      b.done = true;
      appendBot(next.question, [], true);
      updateButtonsState(); // сменить "Начать" -> "Перейти к следующему блоку"
    } else {
      appendBot(next.question, next.quickReplies);
    }
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при обработке запроса", ["Повторить"]);
  } finally {
    startBtn.disabled = false;
    updateButtonsState(); // вернуть корректный текст и обработчик
  }
}

// Толкование блока (финал для текущего блока) — упрощённая версия
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  if ((b.userAnswersCount || 0) < 5) {
    return alert('Нужно минимум 5 ответов по этому блоку перед финальной интерпретацией.');
  }

  const btn = byId('blockInterpretBtn');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = 'Формируем толкование...';

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

    const history = [
      { role: 'user', content: 'Контекст блока сна:\n' + b.text },
      ...(() => {
        const prev = getPrevBlocksSummary(b.id, 3);
        return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : [];
      })(),
      ...b.chat.map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text
      })),
      { role: 'user', content: 'Составь единое итоговое толкование сна (3–6 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Не используй специальную терминологию. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];

    // Только этот вызов!
    const data = await apiRequest(PROXY_URL, {
      blockText: b.text,
      history
    });

    let content = (data.choices?.[0]?.message?.content || '').trim();

    content = content
      .replace(/```[\s\S]*?```/g, ' ')
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
    btn.disabled = false;
    btn.textContent = prevText;
  }
}

// Итоговое толкование по всем блокам — упрощённая версия
async function finalInterpretation() {
  // Берём только блоки, где уже есть финальные интерпретации
  const interpreted = state.blocks.filter(x => !!x.finalInterpretation);

  if (interpreted.length === 0) {
    return alert('Нет ни одного толкования блока. Сначала выполните "Толкование блока" хотя бы для одного блока.');
  }

  const btn = byId('finalInterpretBtn');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = 'Формируем итог...';

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

    // Краткий контекст общего сна (ограничим длину)
    const blockText = (state.dreamText || '').slice(0, 4000);

    // История: даём краткий контекст сна и все готовые интерпретации блоков
    const history = [
      { role: 'user', content: 'Краткий контекст сна:\n' + blockText },
      { role: 'user', content: 'Итоговые толкования блоков:\n' + interpreted.map(b => `#${b.id}: ${b.finalInterpretation}`).join('\n') },
      // Финальная инструкция — один абзац, без префиксов/кода/тегов
      { role: 'user', content: 'Составь единое итоговое толкование сна (5–9 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Не используй специальную терминологию. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];

    const data = await apiRequest(PROXY_URL, {
  blockText,
  history
});
    let content = (data.choices?.[0]?.message?.content || '').trim();

    // Лёгкая инлайн-очистка (как в blockInterpretation)
    content = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/<\u2502?[^>]*\u2502?>/g, ' ')
      .replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!content) content = 'Не удалось получить итоговое толкование.';

    // Показываем чистый финальный текст без префиксов
    const b = getCurrentBlock();
if (b) {
  appendFinalGlobal(content);
} else {
  alert('Готово: итоговое толкование сформировано. Откройте любой блок, чтобы увидеть сообщение.');
}
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при формировании итогового толкования: " + (e.message || 'Неизвестная ошибка'), ["Повторить"]);
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
}

// Следующий шаг диалога с ИИ
async function llmNextStep(blockText, history) {
  const b = getCurrentBlock();
  if (!b) return {
    question: "Ошибка: блок не выбран",
    quickReplies: ["Повторить"],
    isFinal: false
  };

  const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

  try {
    const data = await apiRequest(PROXY_URL, {
  blockText: b.text,
  history: [
    { role: 'user', content: 'Контекст блока сна:\n' + b.text },
    ...(() => {
      const prev = getPrevBlocksSummary(b.id, 3);
      return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : [];
    })(),
    ...b.chat.map(m => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text
    }))
  ]
});
    
const aiRaw = data.choices[0].message.content || '';

function stripNoiseLite(s) {
  if (!s) return s;
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/<\u2502?[^>]*\u2502?>/g, ' ');
  s = s.replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ');
  return s.trim();
}

const aiResponse = stripNoiseLite(aiRaw);
return parseAIResponse(aiResponse);

  } catch (error) {
    return {
      question: `Ошибка API: ${error.message || "Проверьте подключение"}`,
      quickReplies: ["Повторить запрос"],
      isFinal: false
    };
  }
}

// Экспорт/импорт
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
    } catch(e) { alert('Не удалось импортировать JSON'); }
  };
  reader.readAsText(file);
}

// Handlers
byId('render').onclick = () => { state.dreamText = byId('dream').value; renderDreamView(); };
byId('addBlock').onclick = addBlockFromSelection;
byId('auto').onclick = () => { state.dreamText = byId('dream').value; autoSplitSentences(); };
byId('clear').onclick = () => { state.dreamText = ''; state.blocks = []; state.currentBlockId=null; state.nextBlockId=1; byId('dream').value=''; renderBlocksChips(); };
byId('export').onclick = exportJSON;
byId('import').onchange = e => e.target.files[0] && importJSON(e.target.files[0]);
byId('blockInterpretBtn').onclick = blockInterpretation;
byId('finalInterpretBtn').onclick = finalInterpretation;
byId('addWholeBlock').onclick = addWholeBlock;
// В самом конце файла, после всех обработчиков:
updateButtonsState();

// --- Ручной ввод ответа ---
byId('sendAnswerBtn').onclick = () => {
  const val = byId('userInput').value.trim();
  if (!val) return;
  sendAnswer(val);
  byId('userInput').value = '';
};

byId('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    byId('sendAnswerBtn').click();
  }
});
