// main.js

const API_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

// --- Работа с токеном ---
function saveToken(token) { localStorage.setItem("dreams_token", token); }
function getToken() { return localStorage.getItem("dreams_token"); }
function clearToken() { localStorage.removeItem("dreams_token"); }

// Регистрация
async function register(username, password) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.ok && data.token) saveToken(data.token);
  return data;
}

// Логин
async function login(username, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.ok && data.token) saveToken(data.token);
  return data;
}

// Получить сны
async function getDreams() {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/dreams`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await res.json();
}

// Добавить сон
async function addDream(text, blocks) {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/dreams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ text, blocks })
  });
  return await res.json();
}

// Удалить сон
async function deleteDream(dreamId) {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/dreams/${dreamId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await res.json();
}

// Интерпретация сна
async function interpretDream(dreamText) {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/llm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ dream: dreamText })
  });
  return await res.json();
}

async function renderDreams() {
  if (!dreamsList) return;
  dreamsList.innerHTML = "Загрузка...";
  try {
    const data = await getDreams();
    if (data.dreams && data.dreams.length) {
      dreamsList.innerHTML = "";
      data.dreams.forEach(dream => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div>
            <b>Сон:</b> ${dream.text}<br>
            <b>Блоки:</b> <pre>${JSON.stringify(dream.blocks, null, 2)}</pre>
            <button data-id="${dream.id}" class="interpret-btn">Интерпретировать</button>
            <button data-id="${dream.id}" class="delete-btn">Удалить</button>
            <div id="interp-${dream.id}" class="interp-result"></div>
          </div>
        `;
        dreamsList.appendChild(li);
      });

      // Кнопки интерпретации
      document.querySelectorAll(".interpret-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const dream = data.dreams.find(d => d.id === id);
          if (dream) {
            const interpDiv = document.getElementById(`interp-${id}`);
            interpDiv.innerText = "Интерпретация...";
            const res = await interpretDream(dream.text);
            interpDiv.innerText = res.result || "Ошибка интерпретации";
          }
        });
      });

      // Кнопки удаления
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          await deleteDream(id);
          await renderDreams();
        });
      });

    } else {
      dreamsList.innerHTML = "Снов пока нет.";
    }
  } catch (e) {
    dreamsList.innerHTML = "Ошибка загрузки снов.";
  }
}
