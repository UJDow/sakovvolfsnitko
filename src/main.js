const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: [], finalInterpretation: null}
  currentBlockId: null,
  nextBlockId: 1,
  overallInterpretation: null
};

function byId(id) { return document.getElementById(id); }

// Новый renderDreamView — только createTextNode и mark
function renderDreamView() {
  const dv = byId('dreamView');
  const t = state.dreamText || '';
  dv.innerHTML = ''; // очистили

  if (!t) return;

  const sorted = [...state.blocks].sort((a, b) => a.start - b.start);
  let idx = 0;

  for (const b of sorted) {
    if (b.start > idx) {
      dv.appendChild(document.createTextNode(t.slice(idx, b.start)));
    }

    const mark = document.createElement('mark');
    mark.dataset.block = b.id;
    mark.title = `Блок #${b.id}`;
    mark.textContent = t.slice(b.start, b.end);
    mark.addEventListener('click', () => selectBlock(b.id));
    dv.appendChild(mark);

    idx = b.end;
  }

  if (idx < t.length) {
    dv.appendChild(document.createTextNode(t.slice(idx)));
  }
}

// Новый getSelectionOffsets — через Range
function getSelectionOffsets() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const dreamView = byId("dreamView");
  const range = sel.getRangeAt(0);

  // Проверяем, что выделение полностью внутри dreamView
  const isInside = dreamView.contains(range.startContainer) && dreamView.contains(range.endContainer);
  if (!isInside) return null;

  // Нормализуем: считаем смещение в символах относительно начала dreamView
  const preRange = document.createRange();
  preRange.selectNodeContents(dreamView);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  const selected = range.toString();
  if (!selected) return null;

  const end = start + selected.length;
  return { start, end };
}

function addBlockFromSelection() {
  if (!state.dreamText) return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');

  // Новая проверка: убеждаемся, что область для выделения реально отрендерена
  const dv = byId('dreamView');
  if (!dv || !dv.textContent || !dv.textContent.trim()) {
    return alert('Сначала нажмите “Показать для выделения”, затем выделите текст в серой области.');
  }

  const off = getSelectionOffsets();
  if (!off) {
    return alert('Не удалось определить выделение. Выделите текст именно в области ниже.');
  }

  const off = getSelectionOffsets();
  if (!off) return alert('Не удалось определить выделение. Выделите текст именно в области ниже.');

  // Нормализуем переносы
  const plain = byId("dreamView").textContent.replace(/\r\n?/g, '\n');
  const source = (state.dreamText || '').replace(/\r\n?/g, '\n');

  // 1) Подрезаем по пробелам на основе plain
  let { start, end } = off;
  while (start < end && /\s/.test(plain[start])) start++;
  while (end > start && /\s/.test(plain[end - 1])) end--;

  if (end <= start) {
    return alert('Похоже, вы выделили только пробелы/переводы строки. Выделите фрагмент текста.');
  }

  const selected = plain.slice(start, end);
  const expected = source.slice(start, end);

  // 2) Если не совпадает — пробуем “сдвиг” из‑за CR/LF или сигнатуры
  if (selected !== expected) {
    console.warn("Несовпадение выделения с исходным текстом", { selected, expected });
    return alert('Ошибка: выделение не совпадает с исходным текстом. Попробуйте выделить без лишних символов и внутри серой области.');
  }

  // 3) Проверка пересечений
  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }

  // 4) Добавляем
  const id = state.nextBlockId++;
  const text = source.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null });
  state.currentBlockId = id;
  renderBlocksChips();
}
function addWholeBlock() {
  if (!state.dreamText) return;
  // Проверяем, что такого блока ещё нет
  if (state.blocks.some(b => b.start === 0 && b.end === state.dreamText.length)) {
    alert('Весь текст уже добавлен как блок.');
    return;
  }
  const id = state.nextBlockId++;
  const start = 0;
  const end = state.dreamText.length;
  const text = state.dreamText;
  state.blocks.push({
    id,
    start,
    end,
    text,
    done: false,
    chat: [],
    finalInterpretation: null // новое поле
  });
  state.currentBlockId = id;
  renderBlocksChips();
}

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

function getOtherBlocksFinals(currentBlockId) {
  return state.blocks
    .filter(b => b.id !== currentBlockId && b.finalInterpretation)
    .map((b, i) => `Блок #${b.id}: ${b.finalInterpretation}`)
    .join('\n\n');
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

function appendFinalInterpretation(text) {
  const b = getCurrentBlock();
  if (!b) return;
  // Проверяем, есть ли уже финальное сообщение в чате
  if (b.chat.some(m => m.role === 'final')) return;
  b.chat.push({ role: 'final', text });
  renderChat();
}

function appendOverallInterpretation(text) {
  let el = byId('overallInterpretation');
  if (!el) {
    el = document.createElement('div');
    el.id = 'overallInterpretation';
    el.style.marginTop = '16px';
    el.style.background = '#e0d6ff';
    el.style.color = '#2f1a7f';
    el.style.padding = '12px';
    el.style.borderRadius = '10px';
    el.style.fontWeight = 'bold';
    byId('chat').parentNode.appendChild(el);
  }
  el.textContent = text;
}

async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return;

  if (b.finalInterpretation) {
    showBlockFinalInterpretation(b.finalInterpretation);
    return;
  }

  const otherFinals = getOtherBlocksFinals(b.id);
  let systemPrompt = '';
  if (otherFinals) {
    systemPrompt = 'Вот итоговые толкования других фрагментов сна:\n' + otherFinals +
      '\n\nПожалуйста, учитывай их при анализе этого блока.';
  }

  const history = [
    ...b.chat.map(m => ({ role: m.role, text: m.text })),
    { role: 'user', text: 'Пожалуйста, заверши анализ и предоставь итоговую интерпретацию этого фрагмента сна.' }
  ];

  let result;
  if (systemPrompt) {
    result = await llmNextStep(b.text, [
      { role: 'system', text: systemPrompt },
      ...history
    ]);
  } else {
    result = await llmNextStep(b.text, history);
  }

  b.finalInterpretation = result.question;
  appendFinalInterpretation(b.finalInterpretation);
}

function showBlockFinalInterpretation(text) {
  appendFinalInterpretation(text);
}

async function overallInterpretation() {
  // Собираем все итоговые толкования блоков
  const finals = state.blocks.map(b => b.finalInterpretation);

  // Проверяем, что у всех блоков есть итог
  if (finals.some(f => !f)) {
    appendOverallInterpretation('Не для всех блоков получено итоговое толкование!');
    return;
  }

  // Формируем текст для LLM
  const prompt = 'Вот итоговые толкования по каждому фрагменту сна:\n\n' +
    finals.map((f, i) => `Блок ${i + 1}: ${f}`).join('\n\n') +
    '\n\nПожалуйста, сделай общий вывод и интерпретацию по всему сновидению, учитывая все эти итоги.';

  // Отправляем в LLM (используем тот же llmNextStep, но без истории чата)
  const result = await llmNextStep(prompt, []);

  // Сохраняем и показываем общий итог
  state.overallInterpretation = result.question;
  appendOverallInterpretation(state.overallInterpretation);
}

async function llmNextStep(blockText, history) {
  const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockText,
        history: history.map(m => ({
          role: m.role === "bot" ? "assistant" 
               : m.role === "system" ? "system" 
               : "user",
          content: m.text || m.content
        }))
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
byId('exportTxt').onclick = exportJSON;
byId('import').onchange = e => e.target.files[0] && importJSON(e.target.files[0]);
byId('start').onclick = startOrContinue;
byId('blockInterpret').onclick = blockInterpretation;
byId('finalInterpret').onclick = overallInterpretation;
byId('addWholeBlock').onclick = addWholeBlock;

// --- Новое: обработка ручного ввода ответа ---
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

// --- Глушим сторонние overlay, тултипы и popover ---
const blockOverlayPopups = () => {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('body > *').forEach(el => {
      const style = window.getComputedStyle(el);
      // Удаляем все элементы, которые не твои основные контейнеры и выглядят как overlay
      if (
        (style.position === 'fixed' || style.position === 'absolute') &&
        parseInt(style.zIndex) > 1000 &&
        !el.matches('#app, #root, main, .card, .row, .footer, .chat, .dream-view, .blocks')
      ) {
        el.remove();
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

blockOverlayPopups();

// Отключаем стандартное и кастомное контекстное меню
window.addEventListener('contextmenu', e => e.preventDefault(), true);

// Отключаем всплывающие тултипы по mouseup/selection
document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const r = sel.getRangeAt(0);
    if (!byId('dreamView').contains(r.startContainer) || !byId('dreamView').contains(r.endContainer)) {
      sel.removeAllRanges();
    }
  }
}, true);
