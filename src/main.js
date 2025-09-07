let isViewingFromCabinet = false;

/* ====== Константы авторизации ====== */
const AUTH_PASS = 'volfisthebest';
const AUTH_TOKEN = 'volfisthebest-secret';

/* ====== Палитра блоков ====== */
const BLOCK_COLORS = ['#ffd966', '#a4c2f4', '#b6d7a8', '#f4cccc', '#d9d2e9'];

const MOON_MAX_ANSWERS = 10;

/* ====== Глобальное состояние ====== */
const state = {
  dreamText: '',
  blocks: [],
  currentBlockId: null,
  nextBlockId: 1,
  currentStep: 1,
  isThinking: false,
  globalFinalInterpretation: null,
  userSelectedBlock: false
};

let currentSelectionColor = null;

let currentDreamId = null; // id текущего сна в кабинете, с которым сейчас работаем

/* ====== Утилиты DOM ====== */
function byId(id) { return document.getElementById(id); }
function onClick(id, handler) { const el = byId(id); if (el) el.onclick = handler; }
function onChange(id, handler) { const el = byId(id); if (el) el.onchange = handler; }
function raf(fn){ return new Promise(r=>requestAnimationFrame(()=>{ fn(); r(); })); }

/* ====== Динамическая кнопка шага 1 ====== */
function setStep1BtnToSave() {
  const btn = byId('step1MainBtn');
  if (!btn) return;
  btn.textContent = 'Сохранить в кабинет';
  btn.classList.remove('secondary');
  btn.classList.add('primary');
  btn.onclick = () => {
    const dreamEl = byId('dream');
    const text = dreamEl ? dreamEl.value.trim() : '';
    if (!text) { alert('Введите текст сна!'); return; }
    if (currentDreamId) {
      setStep1BtnToNext(); // вдруг пользователь обновил страницу
      return;
    }
    currentDreamId = saveDreamToCabinetOnlyText(text);
// GA4: Сохранение сна
gtag('event', 'save_dream', {
  event_category: 'dream',
  event_label: 'Сохранён сон',
  dream_id: currentDreamId
});
setStep1BtnToNext();
  };
}

function setStep1BtnToNext() {
  const btn = byId('step1MainBtn');
  if (!btn) return;
  btn.textContent = 'Далее →';
  btn.classList.remove('secondary');
  btn.classList.add('primary');
  btn.onclick = () => {
    if (!currentDreamId) {
      alert('Сначала сохраните сон!');
      setStep1BtnToSave();
      return;
    }
    const dreamEl = byId('dream');
    state.dreamText = dreamEl ? dreamEl.value : '';
    showStep(2);
    renderDreamView();
    resetSelectionColor();
    updateProgressIndicator();
  };
}

/* ====== Луна-прогресс ====== */
function renderMoonProgress(userAnswersCount = 0, max = 10, isFlash = false, theme = 'light') {
  const moonBtn = document.getElementById('moonBtn');
  if (!moonBtn) return;
  const phase = Math.min(userAnswersCount / max, 1);

  // Цвета ободка по теме
  const goldGlow = {
    stop85: theme === 'dark' ? '#a5b4fc' : '#f6e27a',
    stop100: theme === 'dark' ? '#6366f1' : '#eab308',
    opacity: theme === 'dark' ? 0.32 : 0.22
  };

  // Массив кратеров — много, разных размеров и opacity
  const craters = [
    // Крупные
    {cx: 8, cy: 10, r: 2.6, opacity: 0.22},
    {cx: 20, cy: 8, r: 2.1, opacity: 0.19},
    {cx: 15, cy: 20, r: 2.3, opacity: 0.21},
    // Средние
    {cx: 12, cy: 16, r: 1.3, opacity: 0.16},
    {cx: 18, cy: 14, r: 1.1, opacity: 0.15},
    {cx: 22, cy: 18, r: 1.4, opacity: 0.17},
    {cx: 10, cy: 22, r: 1.2, opacity: 0.14},
    // Мелкие
    {cx: 16, cy: 10, r: 0.7, opacity: 0.12},
    {cx: 24, cy: 12, r: 0.6, opacity: 0.11},
    {cx: 19, cy: 22, r: 0.8, opacity: 0.13},
    {cx: 13, cy: 19, r: 0.5, opacity: 0.10},
    {cx: 21, cy: 16, r: 0.6, opacity: 0.11},
    // Группировка мелких
    {cx: 17, cy: 18, r: 0.4, opacity: 0.09},
    {cx: 18, cy: 19, r: 0.3, opacity: 0.08},
    {cx: 19, cy: 18, r: 0.4, opacity: 0.09},
    // Еще несколько для "шума"
    {cx: 14, cy: 13, r: 0.5, opacity: 0.10},
    {cx: 22, cy: 21, r: 0.5, opacity: 0.10},
    {cx: 12, cy: 21, r: 0.4, opacity: 0.09},
    {cx: 20, cy: 20, r: 0.3, opacity: 0.08}
  ];

  const moonBaseColor = '#b0b3b8'; // насыщенный серый фон луны
  const moonProgressColor = '#44474a'; // тёмно-серый прогресс
  const craterColor = '#888a8d'; // чуть темнее кратеры

  // SVG: внешний ободок теперь строго по радиусу луны (r=20)
 const svg = `
  <svg class="moon-svg${isFlash ? ' moon-flash' : ''}" viewBox="0 0 44 44" fill="none">
    <defs>
      <clipPath id="moonPhase">
        <rect x="0" y="0" width="${44 * phase}" height="44" />
      </clipPath>
    </defs>
    <circle cx="22" cy="22" r="20" fill="${moonBaseColor}" />
    <circle cx="22" cy="22" r="18" fill="${moonProgressColor}" fill-opacity="0.55" clip-path="url(#moonPhase)" />
    ${craters.map(c => `
      <circle 
        cx="${c.cx + 7}" 
        cy="${c.cy + 7}" 
        r="${c.r}" 
        fill="${craterColor}" 
        opacity="${Math.min(0.32, c.opacity * 1.5)}" 
      />
    `).join('')}
  </svg>
`;
  moonBtn.innerHTML = svg;
}

async function llmNextStep(blockText, history) {
  const b = getCurrentBlock();
  if (!b) return { question: 'Ошибка: блок не выбран', quickReplies: ['Повторить'], isFinal: false };

  const PROXY_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
  try {
    const data = await apiRequest(PROXY_URL, {
      blockText: b.text,
      history: [
        { role: 'user', content: 'Контекст блока сна:\n' + b.text },
        ...(() => {
          const prev = getPrevBlocksSummary(b.id, 3);
          return prev ? [{ role: 'user', content: 'Краткие итоги предыдущих блоков:\n' + prev }] : [];
        })(),
        ...b.chat
          .filter(m => !m.isSystemNotice)
          .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
      ]
    });
