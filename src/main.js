const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: []}
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
  // Если node текстовый — отлично
  if (node.nodeType === Node.TEXT_NODE) return { node, offset };
  // Иначе попытаться найти текстовый дочерний узел вокруг offset
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

  // Проверяем, что выделение внутри #dreamView
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
  // Проверяем, что такого блока ещё нет
  if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
    alert('Весь текст уже добавлен как блок.');
    return;
  }
  const id = state.nextBlockId++;
  state.blocks.push({ id, start: 0, end: state.dreamText.length, text: state.dreamText, done: false, chat: [] });
  state.currentBlockId = id;
  renderBlocksChips();
}

// Добавить блок по выделению
function addBlockFromSelection() {
  if (!state.dreamText) return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');
  const off = getSelectionOffsets();
  if (!off) return alert('Не удалось определить выделение. Выделите текст в области ниже.');

  // Нормализация границ
  let start = Math.max(0, Math.min(off.start, state.dreamText.length));
  let end = Math.max(0, Math.min(off.end, state.dreamText.length));
  if (start === end) return alert('Пустое выделение.');

  // Проверяем пересечения с существующими блоками
  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }
  const id = state.nextBlockId++;
  const text = state.dreamText.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [] });
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
    state.blocks.push({ id, start, end, text: s, done: false, chat: [] });
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

function renderChat() {
  const chat = byId('chat');
  const b = getCurrentBlock();
  chat.innerHTML = '';
  if (!b) return;
  for (const m of b.chat) {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.role === 'bot' ? 'bot' : 'user');
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

function appendBot(text, quickReplies = []) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'bot', text, quickReplies });
  renderChat();
}

function appendUser(text) {
  const b = getCurrentBlock(); if (!b) return;
  b.chat.push({ role: 'user', text });
  renderChat();
}

// Функция для парсинга ответов ИИ
function parseAIResponse(text) {
  // Ищем быстрые ответы в формате [Вариант1|Вариант2|Вариант3]
  const quickMatch = text.match(/\[([^\]]+)\]\s*$/);
  let quickReplies = [];
  let cleanText = text;
  let isFinal = false;

  if (quickMatch) {
    // Извлекаем варианты ответов
    quickReplies = quickMatch[1].split(/\s*\|\s*/).slice(0, 3);
    // Убираем блок с вариантами из основного текста
    cleanText = text.substring(0, quickMatch.index).trim();
  }

  // Проверяем, является ли ответ итоговым
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

  // Показать индикатор
  const startBtn = byId('start');
  startBtn.disabled = true;
  startBtn.textContent = "Генерируем...";

  try {
    // Собираем историю для запроса
    const history = b.chat.map(m => ({
      role: m.role,
      text: m.text
    }));

    const next = await llmNextStep(b.text, history);

    appendBot(next.question, next.quickReplies);

    // Если это финальный ответ
    if (next.isFinal) {
      b.done = true;
      appendBot("Анализ завершен! Что дальше?", ["Сохранить", "Новый анализ"]);
    }
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при обработке запроса", ["Повторить"]);
  } finally {
    // Восстановить кнопку
    startBtn.disabled = false;
    startBtn.textContent = "Начать/продолжить";
  }
}

// Функция завершения анализа
function finishAnalysis() {
  const b = getCurrentBlock();
  if (!b) return;

  // Добавляем специальный триггер для AI
  appendUser("Пожалуйста, заверши анализ и предоставь итоговую интерпретацию этого фрагмента сна.");

  // Показать индикатор
  const finishBtn = byId('finish');
  finishBtn.disabled = true;
  finishBtn.textContent = "Формируем итог...";

  // Запускаем процесс
  startOrContinue().finally(() => {
    finishBtn.disabled = false;
    finishBtn.textContent = "Завершить анализ";
  });
}

function resetChat() {
  const b = getCurrentBlock();
  if (!b) return;
  b.chat = [];
  b.done = false;
  renderChat();
}

async function llmNextStep(blockText, history) {
  const b = getCurrentBlock();
  if (!b) return {
    question: "Ошибка: блок не выбран",
    quickReplies: ["Повторить"],
    isFinal: false
  };

  // Теперь отправляем только blockText и history!
  const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockText: b.text,
        history: b.chat.map(m => ({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.text
        }))
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
    const aiResponse = data.choices[0].message.content;
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
      state.blocks = (data.blocks || []).map(b => ({...b, chat: b.chat||[]}));
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
byId('finish').onclick = finishAnalysis;
byId('blockInterpret').onclick = resetChat;
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
