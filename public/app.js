const loginPanel = document.querySelector("#login-panel");
const appPanel = document.querySelector("#app-panel");
const loginForm = document.querySelector("#login-form");
const createKeyForm = document.querySelector("#create-key-form");
const logoutBtn = document.querySelector("#logout-btn");
const messageEl = document.querySelector("#message");
const keyListEl = document.querySelector("#key-list");
const emptyStateEl = document.querySelector("#empty-state");
const welcomeTextEl = document.querySelector("#welcome-text");

const TOKEN_KEY = "astudio_demo_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function setMessage(message, isError = false) {
  messageEl.textContent = message;
  messageEl.style.color = isError ? "#b91c1c" : "#7c2d12";
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }

  return data;
}

function renderKeys(keys) {
  keyListEl.innerHTML = "";
  emptyStateEl.classList.toggle("hidden", keys.length > 0);

  keys.forEach((item) => {
    const card = document.createElement("article");
    card.className = "key-card";
    card.innerHTML = `
      <div>
        <h3>${item.name}</h3>
        <div class="meta">创建时间：${new Date(item.createdAt).toLocaleString()}</div>
        <p class="key-value">${item.maskedValue}</p>
      </div>
      <button class="danger-btn" type="button" data-id="${item.id}">删除</button>
    `;
    keyListEl.appendChild(card);
  });
}

async function loadCurrentUser() {
  const user = await request("/api/me");
  welcomeTextEl.textContent = `当前用户：${user.username}`;
  loginPanel.classList.add("hidden");
  appPanel.classList.remove("hidden");
}

async function loadKeys() {
  const keys = await request("/api/keys");
  renderKeys(keys);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const result = await request("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });

    setToken(result.token);
    await loadCurrentUser();
    await loadKeys();
    setMessage("登录成功");
  } catch (error) {
    setMessage(error.message, true);
  }
});

createKeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(createKeyForm);

  try {
    await request("/api/keys", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        value: formData.get("value")
      })
    });
    createKeyForm.reset();
    await loadKeys();
    setMessage("API Key 已创建");
  } catch (error) {
    setMessage(error.message, true);
  }
});

keyListEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const { id } = target.dataset;
  if (!id) {
    return;
  }

  try {
    await request(`/api/keys/${id}`, {
      method: "DELETE"
    });
    await loadKeys();
    setMessage("API Key 已删除");
  } catch (error) {
    setMessage(error.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST" });
  } catch (_error) {
  } finally {
    clearToken();
    appPanel.classList.add("hidden");
    loginPanel.classList.remove("hidden");
    renderKeys([]);
    setMessage("已退出登录");
  }
});

async function bootstrap() {
  if (!getToken()) {
    return;
  }

  try {
    await loadCurrentUser();
    await loadKeys();
  } catch (_error) {
    clearToken();
  }
}

bootstrap();
