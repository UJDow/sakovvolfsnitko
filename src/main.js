const AUTH_PASS = 'volfisthebest';
const AUTH_TOKEN = 'volfisthebest-secret';

const BLOCK_COLORS = [
  '#ffd966', // жёлтый
  '#a4c2f4', // голубой
  '#b6d7a8', // зелёный
  '#f4cccc', // розовый
  '#d9d2e9'  // сиреневый
];

// --- Цвет для выделения будущего блока ---
let currentSelectionColor = null;
function resetSelectionColor() {
  currentSelectionColor = BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}

const state = {
  dreamText: '',
  blocks: [],
  currentBlockId: null,
  nextBlockId: 1
};

function byId(id) { return document.getElementById(id); }

function getNextBlockColor() {
  return BLOCK_COLORS[(state.nextBlockId - 1) % BLOCK_COLORS.length];
}

function renderDreamView() {
  const dv = byId('dreamView');
  dv.innerHTML = '';
  const t = state.dreamText || '';
  if (!t) return;

  const tokens = t.match(/\S+|\s+/g) || [];
  let pos = 0;
  tokens.forEach(token => {
    const block = state.blocks.find(b => pos >= b.start && pos + token.length <= b.end);
    const span = document.createElement('span');
    span.textContent = token;
    span.dataset.start = pos;
    span.dataset.end = pos + token.length;

    if (block) {
      const color = BLOCK_COLORS[(block.id - 1) % BLOCK_COLORS.length];
      span.style.background = color;
      span.style.color = '#222';
      span.setAttribute('data-block', block.id);
      span.title = `Блок #${block.id}`;
      span.addEventListener('click', () => selectBlock(block.id));
    } else {
      span.style.background = '#f0f0f0';
      span.style.color = '#888';
      span.classList.add('tile');
      span.addEventListener('click', function(e) {
        e.preventDefault();
        span.classList.toggle('selected');
        if (span.classList.contains('selected')) {
          span.style.background = currentSelectionColor;
          span.style.color = '#222';
        } else {
          span.style.background = '#f0f0f0';
          span.style.color = '#888';
        }
      });
    }

    dv.appendChild(span);
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

function selectBlock(id) {
  state.currentBlockId = id;
  renderBlocksChips();
}

function getCurrentBlock() {
  return state.blocks.find(b => b.id === state.currentBlockId) || null;
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
  state.blocks.push({ id, start, end, text, done: false, chat: [], finalInterpretation: null, userAnswersCount: 0 });
  state.currentBlockId = id;
  renderBlocksChips();
  resetSelectionColor();
}

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
  resetSelectionColor();
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

  for (const x of sorted) {
    if (x.id > currId && !x.done) return x.id;
  }
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

  if (blockBtn) blockBtn.classList.remove('btn-warn', 'btn-ok');
  if (finalBtn) finalBtn.classList.remove('btn-warn', 'btn-ok');

  const enoughForBlock = !!b && (b.userAnswersCount || 0) >= 5;
  if (blockBtn) blockBtn.classList.add(enoughForBlock ? 'btn-ok' : 'btn-warn');

  const finalsCount = state.blocks.filter(x => !!x.finalInterpretation).length;
  const enoughForFinal = finalsCount >= 2;
  if (finalBtn) finalBtn.classList.add(enoughForFinal ? 'btn-ok' : 'btn-warn');

  if (startBtn) {
    startBtn.onclick = null;
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
    startBtn.disabled = false;
    updateButtonsState();
  }
}

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

async function finalInterpretation() {
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

    const blockText = (state.dreamText || '').slice(0, 4000);

    const history = [
      { role: 'user', content: 'Краткий контекст сна:\n' + blockText },
      { role: 'user', content: 'Итоговые толкования блоков:\n' + interpreted.map(b => `#${b.id}: ${b.finalInterpretation}`).join('\n') },
      { role: 'user', content: 'Составь единое итоговое толкование сна (5–9 предложений), связав общие мотивы: части тела, числа/цифры, запретные импульсы, детские переживания. Не задавай вопросов. Не используй специальную терминологию. Выведи только чистый текст без заголовков, без кода и без тегов.' }
    ];

    const data = await apiRequest(PROXY_URL, {
      blockText,
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

    if (!content) content = 'Не удалось получить итоговое толкование.';

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

byId('render').onclick = () => {
  state.dreamText = byId('dream').value;
  renderDreamView();
  resetSelectionColor();
};
byId('addBlock').onclick = addBlockFromSelection;
byId('auto').onclick = () => {
  state.dreamText = byId('dream').value;
  autoSplitSentences();
  resetSelectionColor();
};
byId('clear').onclick = () => {
  state.dreamText = '';
  state.blocks = [];
  state.currentBlockId=null;
  state.nextBlockId=1;
  byId('dream').value='';
  resetSelectionColor();
  renderBlocksChips();
};
byId('export').onclick = exportJSON;
byId('import').onchange = e => e.target.files[0] && importJSON(e.target.files[0]);
byId('blockInterpretBtn').onclick = blockInterpretation;
byId('finalInterpretBtn').onclick = finalInterpretation;
byId('addWholeBlock').onclick = addWholeBlock;
updateButtonsState();
resetSelectionColor();

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
