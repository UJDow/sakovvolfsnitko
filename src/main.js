const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: [], finalInterpretation: null}
  currentBlockId: null,
  nextBlockId: 1,
  overallInterpretation: null // новое поле для общего толкования
};

function byId(id) { return document.getElementById(id); }
  
function renderDreamView() {
  const dv = byId('dreamView');
  const t = state.dreamText || '';
  if (!t) { dv.textContent = ''; return; }

  // Оборачиваем диапазоны блоков в <mark data-block>
  let parts = [];
  const sorted = [...state.blocks].sort((a,b)=>a.start-b.start);
  let idx = 0;
  for (const b of sorted) {
    if (b.start > idx) parts.push(escapeHtml(t.slice(idx, b.start)));
    parts.push(`<mark data-block="${b.id}" title="Блок #${b.id}">${escapeHtml(t.slice(b.start, b.end))}</mark>`);
    idx = b.end;
  }
  if (idx < t.length) parts.push(escapeHtml(t.slice(idx)));
  dv.innerHTML = parts.join('');
  // Клик по подсветке → выбрать блок
  dv.querySelectorAll('mark[data-block]').forEach(m => {
    m.addEventListener('click', () => selectBlock(Number(m.getAttribute('data-block'))));
  });
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

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

function getSelectionOffsets() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const selected = sel.toString();
  if (!selected) return null;

  // Получаем текст из dreamView (как он отображается)
  const dreamViewText = document.getElementById('dreamView').textContent || '';
  // Нормализуем оба текста
  const normSelected = selected.replace(/\s+/g, ' ').trim();
  const normDreamView = dreamViewText.replace(/\s+/g, ' ').trim();

  // Если длины совпадают (или отличаются не больше чем на 2 символа), считаем что выделено всё
  if (Math.abs(normSelected.length - normDreamView.length) < 3) {
    return { start: 0, end: state.dreamText.length };
  }

  // Обычный поиск (на случай, если выделен не весь текст)
  const start = state.dreamText.indexOf(selected);
  if (start !== -1) {
    return { start, end: start + selected.length };
  }

  // Не удалось определить выделение
  return null;
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

function addBlockFromSelection() {
  if (!state.dreamText) return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');
  const off = getSelectionOffsets();
  if (!off) return alert('Не удалось определить выделение. Выделите текст в области ниже.');
  // Проверяем пересечения с существующими блоками
  for (const b of state.blocks) {
    if (!(off.end <= b.start || off.start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }
  const id = state.nextBlockId++;
  const text = state.dreamText.slice(off.start, off.end);
  state.blocks.push({ id, start: off.start, end: off.end, text, done: false, chat: [] });
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

  // Итоги других блоков
  const otherFinals = getOtherBlocksFinals(b.id);
  let systemPrompt = '';
  if (otherFinals) {
    systemPrompt = 'Вот итоговые толкования других фрагментов сна:\n' + otherFinals +
      '\n\nПожалуйста, учитывай их при анализе этого блока.';
  }

  // История чата + специальный запрос пользователя
  const history = [
    ...b.chat.map(m => ({ role: m.role, text: m.text })),
    { role: 'user', text: 'Пожалуйста, заверши анализ и предоставь итоговую интерпретацию этого фрагмента сна.' }
  ];

  // Если есть итоги других блоков — добавляем их как system prompt
  let result;
  if (systemPrompt) {
    // Можно добавить как отдельное сообщение с ролью "system"
    result = await llmNextStep(b.text, [
      { role: 'system', text: systemPrompt },
      ...history
    ]);
  } else {
    result = await llmNextStep(b.text, history);
  }

  b.finalInterpretation = result.question;
  showBlockFinalInterpretation(b.finalInterpretation);
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
  const data = {
    dreamText: state.dreamText,
    blocks: state.blocks.map(b => ({
      ...b,
      // на всякий случай явно укажем итог
      finalInterpretation: b.finalInterpretation || null
    })),
    overallInterpretation: state.overallInterpretation || null
  };
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
        finalInterpretation: b.finalInterpretation || null
      }));
      state.nextBlockId = Math.max(1, ...state.blocks.map(b=>b.id+1));
      state.currentBlockId = state.blocks[0]?.id || null;
      state.overallInterpretation = data.overallInterpretation || null;
      byId('dream').value = state.dreamText;
      renderBlocksChips();
      // Показываем итоговые толкования, если они есть
      if (state.overallInterpretation) appendOverallInterpretation(state.overallInterpretation);
      // Можно также показать итог по текущему блоку, если есть
      const b = getCurrentBlock();
      if (b && b.finalInterpretation) showBlockFinalInterpretation(b.finalInterpretation);
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
