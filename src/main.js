const state = {
  dreamText: '',
  blocks: [], // {id, start, end, text, done:false, chat: []}
  currentBlockId: null,
  nextBlockId: 1
};

function byId(id) { return document.getElementById(id); }
  
function renderDreamView() {
  const dv = byId('dreamView');
  const t = state.dreamText || '';
  if (!t) { dv.textContent = ''; return; }

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

  const start = state.dreamText.indexOf(selected);
  if (start === -1) return null;
  return { start, end: start + selected.length };
}

function addBlockFromSelection() {
  if (!state.dreamText) return alert('Сначала вставьте сон и нажмите “Показать для выделения”.');
  const off = getSelectionOffsets();
  if (!off) return alert('Не удалось определить выделение. Выделите текст в области ниже.');
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

// Парсим ответ ИИ
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

function sendAnswer(ans) {
  appendUser(ans);
  startOrContinue();
}

// Основной процесс
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
    appendBot(next.question, next.quickReplies);
    
    if (next.isFinal) {
      b.done = true;
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

// Итоговое толкование по всем блокам
async function finishAnalysis() {
  if (!state.blocks.length) return alert("Нет блоков для анализа!");

  let allInterpretations = [];
  for (const b of state.blocks) {
    if (!b.chat.length) continue;
    const history = b.chat.map(m => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text
    }));
    try {
      appendUser(`[Итог для блока #${b.id}] Пожалуйста, заверши интерпретацию этого блока.`);
      const next = await llmNextStep(b.text, history);
      allInterpretations.push(`Блок #${b.id}: ${next.question}`);
    } catch (e) {
      allInterpretations.push(`Блок #${b.id}: Ошибка при анализе`);
    }
  }

  const summary = "## Итоговое толкование сна\n\n" + allInterpretations.join("\n\n");
  appendBot(summary);
}

// Интерпретация только выбранного блока
async function blockInterpretation() {
  const b = getCurrentBlock();
  if (!b) return alert('Выберите блок.');

  appendUser("Сделай, пожалуйста, интерпретацию этого блока целиком.");

  try {
    const next = await llmNextStep(b.text, b.chat.map(m => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text
    })));
    appendBot("Интерпретация блока:\n" + next.question);
  } catch (e) {
    appendBot("Ошибка при толковании блока");
  }
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
byId('blockInterpret').onclick = blockInterpretation;

// Обновлённый ввод ответа
byId('sendAnswerBtn').onclick = () => {
  const val = byId('userInput').value.trim();
  if (!val) return;
  sendAnswer(val);
  byId('userInput').value = '';
};

byId('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    byId('sendAnswerBtn').click();
  }
});
