const API_URL = 'https://deepseek-api-key.lexsnitko.workers.dev/';
const AUTH_TOKEN = 'dreamteam-secret';

const dreamInput = document.getElementById('dream-input');
const sendBtn = document.getElementById('send-btn');
const chat = document.getElementById('chat');

let history = [];

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = role;
  msg.textContent = content;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

async function apiRequestToWorker(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(data)
  });

  if (res.status === 401) {
    appendMessage('system', 'Нет доступа. Проверьте авторизацию.');
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    appendMessage('system', `Ошибка: ${res.status} ${text}`);
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}

sendBtn.onclick = async () => {
  const text = dreamInput.value.trim();
  if (!text) return;
  appendMessage('user', text);
  history.push({ role: 'user', content: text });
  dreamInput.value = '';
  sendBtn.disabled = true;
  appendMessage('assistant', '...');
  try {
    const response = await apiRequestToWorker({ blockText: text, history });
    const answer = response.choices?.[0]?.message?.content || 'Нет ответа';
    chat.lastChild.textContent = answer;
    history.push({ role: 'assistant', content: answer });
  } catch (e) {
    chat.lastChild.textContent = 'Ошибка при обращении к серверу.';
  }
  sendBtn.disabled = false;
};
