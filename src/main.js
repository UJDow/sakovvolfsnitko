// main.js

const API_URL = "https://deepseek-api-key.lexsnitko.workers.dev/";

// --- Работа с токеном ---
function saveToken(token) {
  localStorage.setItem("dreams_token", token);
}
function getToken() {
  return localStorage.getItem("dreams_token");
}
function clearToken() {
  localStorage.removeItem("dreams_token");
}

// --- API функции ---
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

async function getDreams() {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/dreams`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await res.json();
}

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

async function deleteDream(dreamId) {
  const token = getToken();
  if (!token) throw new Error("Нет токена");
  const res = await fetch(`${API_URL}/dreams/${dreamId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await res.json();
}

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

// --- UI Логика ---

// Элементы
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const dreamsList = document.getElementById("dreams-list");
const addDreamForm = document.getElementById("add-dream-form");
const dreamTextInput = document.getElementById("dream-text");
const blocksInput = document.getElementById("blocks");
const interpretBtn = document.getElementById("interpret-btn");
const interpretationDiv = document.getElementById("interpretation");
const logoutBtn = document.getElementById("logout-btn");

// Показать/скрыть блоки
function showBlock(id) {
  document.querySelectorAll(".block").forEach(b => b.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// Проверка авторизации при загрузке
window.addEventListener("DOMContentLoaded", async () => {
  if (getToken()) {
    showBlock("cabinet-block");
    await renderDreams();
  } else {
    showBlock("login-block");
  }
});

// --- Регистрация ---
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = registerForm.username.value.trim();
    const password = registerForm.password.value.trim();
    const res = await register(username, password);
    if (res.ok) {
      alert("Регистрация успешна!");
      showBlock("cabinet-block");
      await renderDreams();
    } else {
      alert(res.error || "Ошибка регистрации");
    }
  });
}

// --- Логин ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();
    const res = await login(username, password);
    if (res.ok) {
      alert("Вход выполнен!");
      showBlock("cabinet-block");
      await renderDreams();
    } else {
      alert(res.error || "Ошибка входа");
    }
  });
}

// --- Выход ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearToken();
    showBlock("login-block");
  });
}

// --- Добавить сон ---
if (addDreamForm) {
  addDreamForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = dreamTextInput.value.trim();
    let blocks = [];
    try {
      blocks = JSON.parse(blocksInput.value || "[]");
    } catch {
      blocks = [];
    }
    const res = await addDream(text, blocks);
    if (res.ok) {
      dreamTextInput.value = "";
      blocksInput.value = "";
      await renderDreams();
    } else {
      alert(res.error || "Ошибка добавления сна");
    }
  });
}

// --- Показать сны ---
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
