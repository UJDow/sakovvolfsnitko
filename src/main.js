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
    .filter(b => b.id < currentBlockId && !!b.finalInterpretation)
    .sort((a, b) => b.id - a.id) // от более свежих к старым
    .slice(0, limit)
    .map(b => `#${b.id}: ${b.finalInterpretation}`);
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
    div.className = baseClass + (m.isFinal ? ' final' : '');
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
}

function appendBot(text, quickReplies = [], isFinal = false) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies, isFinal });
  renderChat();
}

function appendUser(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'user', text });
  b.userAnswersCount = (b.userAnswersCount || 0) + 1;
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
    appendBot(next.question, next.quickReplies); // без автозавершения
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при обработке запроса", ["Повторить"]);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Начать/продолжить";
  }
}

// Толкование блока (финал для текущего блока) — упрощённая версия
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  // Оставим базовую валидацию, чтобы модель не выдавала финал без контекста диалога
  if ((b.userAnswersCount || 0) < 3) {
    return alert('Нужно минимум 3 ответа пользователя по этому блоку перед финальной интерпретацией.');
  }

  const btn = byId('blockInterpretBtn');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = 'Формируем толкование...';

  try {
    const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

    // История: берём весь диалог по текущему блоку (аск/анс), плюс якорим контекст блока
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
  { role: 'user', content: 'Пожалуйста, дай краткую финальную фрейдистскую интерпретацию этого блока сна (3–6 предложений). Свяжи детали тела и числа (если были) с вытесненными желаниями/детским опытом. Не задавай вопросов. Выведи только чистый текст без заголовков, без кода и без тегов.' }
];

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockText: b.text,
        history
      })
    });

    if (!response.ok) {
      let errJson = null;
      try { errJson = await response.json(); } catch {}
      if (response.status === 402 || errJson?.error === 'billing_insufficient_funds') {
        throw new Error('Баланс DeepSeek исчерпан. Пополните баланс и повторите.');
      }
      throw new Error(errJson?.message || response.statusText);
    }

    const data = await response.json();
    let content = (data.choices?.[0]?.message?.content || '').trim();

    // Лёгкая инлайн-очистка без отдельных функций
    content = content
      .replace(/```[\s\S]*?```/g, ' ')        // вырезаем блоки кода
      .replace(/<[^>]+>/g, ' ')               // HTML/теги
      .replace(/<\u2502?[^>]*\u2502?>/g, ' ') // служебные маркеры <｜…｜>
      .replace(/<\uFF5C?[^>]*\uFF5C?>/g, ' ')
      .replace(/^\s*(толкование блока|итоговое толкование сна)\s*:\s*/i, '') // убираем возможный префикс
      .replace(/\s+/g, ' ')
      .trim();

    if (!content) content = 'Не удалось получить толкование.';

    b.finalInterpretation = content;
    b.done = true;

    // Показываем ровно интерпретацию, без заголовков, чтобы не «зеркалилось» дальше
    appendBot(content, [], true);
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
      { role: 'user', content: 'Составь единое фрейдистское итоговое толкование сна (5–9 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockText, // прокинем для симметрии API, хотя смысл в history
        history
      })
    });

    if (!response.ok) {
      let errJson = null;
      try { errJson = await response.json(); } catch {}
      if (response.status === 402 || errJson?.error === 'billing_insufficient_funds') {
        throw new Error('Баланс DeepSeek исчерпан. Пополните баланс и повторите.');
      }
      throw new Error(errJson?.message || response.statusText);
    }

    const data = await response.json();
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
      appendBot(content, [], true);
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
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      })
    });

    if (!response.ok) {
      let errJson = null;
      try { errJson = await response.json(); } catch {}
      if (response.status === 402 || errJson?.error === 'billing_insufficient_funds') {
        throw new Error('Баланс DeepSeek исчерпан. Пополните баланс и повторите.');
      }
      const msg = errJson?.message || response.statusText;
      throw new Error(msg);
    }

    const data = await response.json();
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
byId('start').onclick = startOrContinue;
byId('blockInterpretBtn').onclick = blockInterpretation;
byId('finalInterpretBtn').onclick = finalInterpretation;
byId('addWholeBlock').onclick = addWholeBlock;

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
