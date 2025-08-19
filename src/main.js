const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: [], finalInterpretation: null}
  currentBlockId: null,
  nextBlockId: 1,
  overallInterpretation: null
};

function byId(id) { return document.getElementById(id); }

// Рендер текста сна с подсветкой добавленных блоков
function renderDreamView() {
  const dv = byId('dreamView');
  const t = state.dreamText || '';
  dv.innerHTML = '';
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

// Безопасное вычисление смещений выделения только внутри dreamView
function getSelectionOffsets() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const dreamView = byId("dreamView");
  const range = sel.getRangeAt(0);

  const isInside = dreamView.contains(range.startContainer) && dreamView.contains(range.endContainer);
  if (!isInside) return null;

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
  if (!state.dreamText) {
    return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');
  }

  const dv = byId('dreamView');
  if (!dv || !dv.textContent || !dv.textContent.trim()) {
    return alert('Сначала нажмите “Показать для выделения”, затем выделите текст в серой области.');
  }

  const off = getSelectionOffsets();
  if (!off) {
    return alert('Не удалось определить выделение. Выделите текст именно в области ниже.');
  }

  const plain = dv.textContent.replace(/\r\n?/g, '\n');
  const source = (state.dreamText || '').replace(/\r\n?/g, '\n');

  let { start, end } = off;
  while (start < end && /\s/.test(plain[start])) start++;
  while (end > start && /\s/.test(plain[end - 1])) end--;

  if (end <= start) {
    return alert('Похоже, вы выделили только пробелы/переводы строки. Выделите фрагмент текста.');
  }

  const selected = plain.slice(start, end);
  const expected = source.slice(start, end);
  if (selected !== expected) {
    console.warn("Несовпадение выделения с исходным текстом", { selected, expected });
    return alert('Ошибка: выделение не совпадает с исходным текстом. Попробуйте выделить без лишних символов и внутри серой области.');
  }

  for (const b of state.blocks) {
    if (!(end <= b.start || start >= b.end)) {
      return alert('Этот фрагмент пересекается с уже добавленным блоком.');
    }
  }

  const id = state.nextBlockId++;
  const text = source.slice(start, end);
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null });
  state.currentBlockId = id;

  renderBlocksChips();
  renderDreamView();
}

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
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null });
  state.currentBlockId = id;
  renderBlocksChips();
  renderDreamView();
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
    if (start === -1) {
      // пропускаем, если по какой-то причине не нашли подстроку
      continue;
    }
    const end = start + s.length;
    const id = state.nextBlockId++;
    state.blocks.push({ id, start, end, text: s, done: false, chat: [], finalInterpretation: null });
    cursor = end;
  }
  state.currentBlockId = state.blocks[0]?.id || null;
  renderBlocksChips();
  renderDreamView();
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
    div.className = 'msg ' + (m.role === 'bot' ? 'bot' : m.role === 'final' ? 'final' : 'user');
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

// Возвращает { question, quickReplies, isFinal } — question = чистый текст без квик-реплаев
function parseAIResponse(text) {
  // Эвристика: отделяем быстрые ответы в конце в формате [a | b | c]
  const quickMatch = text.match(/\[([^\]]+)\]\s*$/);
  let quickReplies = [];
  let cleanText = text;
  let isFinal = false;

  if (quickMatch) {
    quickReplies = quickMatch[1].split(/\s*\|\s*/).slice(0, 3);
    cleanText = text.substring(0, quickMatch.index).trim();
  }

  const finalKeywords = ["итог", "заключение", "интерпретация", "вывод"];
  isFinal = finalKeywords.some(keyword => cleanText.toLowerCase().includes(keyword));

  return { question: cleanText, quickReplies, isFinal };
}

function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}

function getOtherBlocksFinals(currentBlockId) {
  return state.blocks
    .filter(b => b.id !== currentBlockId && b.finalInterpretation)
    .map(b => `Блок #${b.id}: ${b.finalInterpretation}`)
    .join('\n\n');
}

async function startOrContinue() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  const startBtn = byId('start');
  startBtn.disabled = true;
  startBtn.textContent = "Генерируем...";

  try {
    const history = b.chat.map(m => ({ role: m.role, text: m.text }));
    const next = await llmNextStep(b.text, history);
    appendBot(next.question, next.quickReplies);
    if (next.isFinal) {
      b.done = true;
      // По желанию можно автоматически сохранять финал:
      // if (!b.finalInterpretation) b.finalInterpretation = next.question;
      appendBot("Анализ завершен! Что дальше?", ["Сохранить", "Новый анализ"]);
    }
  } catch (e) {
    console.error(e);
    appendBot("Ошибка при обработке запроса", ["Повторить"]);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Начать/продолжить";
  }
}

function appendFinalInterpretation(text) {
  const b = getCurrentBlock();
  if (!b) return;
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
    result = await llmNextStep(b.text, [{ role: 'system', text: systemPrompt }, ...history]);
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
  const finals = state.blocks.map(b => b.finalInterpretation);
  if (finals.some(f => !f)) {
    state.overallInterpretation = null;
    appendOverallInterpretation('Не для всех блоков получено итоговое толкование!');
    return;
  }
  const prompt = 'Вот итоговые толкования по каждому фрагменту сна:\n\n' +
    finals.map((f, i) => `Блок ${i + 1}: ${f}`).join('\n\n') +
    '\n\nПожалуйста, сделай общий вывод и интерпретацию по всему сновидению, учитывая все эти итоги.';
  const result = await llmNextStep(prompt, []);
  state.overallInterpretation = result.question;
  appendOverallInterpretation(state.overallInterpretation);
}

async function llmNextStep(blockText, history) {
  const PROXY_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

  // Безопасная маппа истории: исключаем 'final', корректно маппим роли
  const mappedHistory = (history || [])
    .filter(m => m && m.role !== 'final')
    .map(m => ({
      role: m.role === "bot" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.text || m.content || ''
    }));

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockText,
        history: mappedHistory
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
    const aiResponse = data?.choices?.[0]?.message?.content ?? '';
    if (!aiResponse) {
      throw new Error('Пустой ответ от модели');
    }
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
      state.dreamText = (data.dreamText || '').replace(/\r\n?/g, '\n'); // нормализация переноса
      state.blocks = (data.blocks || []).map(b => ({
        ...b,
        chat: b.chat || [],
        finalInterpretation: b.finalInterpretation ?? null
      }));
      const maxId = state.blocks.reduce((m, b) => Math.max(m, Number(b.id) || 0), 0);
      state.nextBlockId = maxId + 1;
      state.currentBlockId = state.blocks[0]?.id || null;
      byId('dream').value = state.dreamText;
      renderBlocksChips();
      renderDreamView();
    } catch(e) { alert('Не удалось импортировать JSON'); }
  };
  reader.readAsText(file);
}

// Рендер чипов блоков
function renderBlocksChips() {
  const container = byId('blocks');
  container.innerHTML = '';
  for (const b of state.blocks) {
    const chip = document.createElement('div');
    chip.className = 'chip' + (b.id === state.currentBlockId ? ' active' : '');
    chip.textContent = `#${b.id}`;
    chip.title = b.text;
    chip.addEventListener('click', () => selectBlock(b.id));
    container.appendChild(chip);
  }
  const cur = byId('currentBlock');
  const current = getCurrentBlock();
  cur.textContent = current ? `Текущий блок #${current.id}` : 'Блок не выбран';
  renderChat();
}

// Handlers
byId('render').onclick = () => {
  state.dreamText = (byId('dream').value || '').replace(/\r\n?/g, '\n');
  renderDreamView();
};
byId('addBlock').onclick = addBlockFromSelection;
byId('auto').onclick = () => {
  state.dreamText = (byId('dream').value || '').replace(/\r\n?/g, '\n'); // нормализация
  autoSplitSentences();
};
byId('clear').onclick = () => {
  state.dreamText = '';
  state.blocks = [];
  state.currentBlockId = null;
  state.nextBlockId = 1;
  byId('dream').value = '';
  renderBlocksChips();
  renderDreamView();
};
byId('exportJson').onclick = exportJSON;
byId('import').onchange = e => e.target.files[0] && importJSON(e.target.files[0]);
byId('start').onclick = startOrContinue;
byId('blockInterpret').onclick = blockInterpretation;
byId('finalInterpret').onclick = overallInterpretation;
byId('addWholeBlock').onclick = addWholeBlock;

// Ручной ответ
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

// Сброс внешних выделений
document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const r = sel.getRangeAt(0);
    const dv = byId('dreamView');
    if (!dv.contains(r.startContainer) || !dv.contains(r.endContainer)) {
      sel.removeAllRanges();
    }
  }
}, true);

// Стартовый рендер
renderBlocksChips();
