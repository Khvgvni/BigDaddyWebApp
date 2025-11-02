// ========== Конфиг ==========
const API_BASE = "https://api.cabinetbot.cabinet75.ru"; // твой сервер
function adminToken() {
  return sessionStorage.getItem("adm_token") || "";
}

// ========== Управление модалками ==========
function openModal(id) {
  document.querySelectorAll(".modal").forEach(m => {
    m.style.display = "none";
    m.setAttribute("aria-hidden", "true");
  });
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.documentElement.style.overflow = "hidden";

  if (id === "cardModal") renderCard();
  if (id === "profileModal") loadProfile(); // Загружаем профиль при открытии
  if (id === "posterModal") loadPosters();  // 🔥 Загружаем афишу при открытии
  if (id === "cardModal") loadCards();  

  modal.classList.remove("animate");
  void modal.offsetWidth;
  modal.classList.add("animate");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
  const anyOpen = Array.from(document.querySelectorAll(".modal"))
    .some(m => m.style.display === "flex");
  if (!anyOpen) document.documentElement.style.overflow = "";
}

// ========== Динамическое меню ==========
const menuImages = [
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu1.png",
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu2.png",
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu3.png",
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu4.png",
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu5.png",
  "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/menu6.png"
];

function renderMenu() {
  const container = document.getElementById("menuContainer");
  if (!container) return;
  container.innerHTML = "";
  menuImages.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "menu-img";
    img.loading = "lazy";
    container.appendChild(img);
  });
}

// ========== Пригласительный ==========
function openInvitation() {
  const container = document.getElementById("invitationContainer");
  if (container) {
    container.innerHTML = "";
    const img = document.createElement("img");
    img.src = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/Invintation.png";
    img.className = "menu-img";
    img.loading = "lazy";
    container.appendChild(img);
  }
  openModal("invitationModal");
}

// ========== Отправка форм ==========
async function sendMessage(message) {
  try {
    const resp = await fetch(`${API_BASE}api/banners/cabinet75`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Secret": "superlong_random_secret_32chars"
      },
      body: JSON.stringify({ text: message })
    });
    if (!resp.ok) console.warn("Proxy status:", resp.status);
  } catch (err) {
    console.warn("Proxy error:", err);
  }
}

// ========== Клубная карта ==========
async function renderCard() {
  const cardImg = document.getElementById("userCardImg");
  if (!cardImg) return;

  try {
    // получаем ID пользователя из Telegram WebApp
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!userId) return;

    // запрос профиля
    const resp = await fetch(`${API_BASE}/api/user/status?id=${userId}`);
    const data = await resp.json();

    if (!data.ok || !data.user) {
      cardImg.src = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/card.png"; // дефолтная карта
      return;
    }

    const status = (data.user.status || "Default").toLowerCase();
    let cardSrc = "https://raw.githubusercontent.com/Khvgvni/CabinetWebApp/main/card.png";

    if (status === "black") cardSrc = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/card_black.png";
    if (status === "silver") cardSrc = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/card_silver.png";
    if (status === "gold") cardSrc = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/card_gold.png";

    cardImg.src = cardSrc;
  } catch (e) {
    console.error("Ошибка при загрузке клубной карты:", e);
    cardImg.src = "https://raw.githubusercontent.com/Khvgvni/BadRabbitWebApp/main/card.png"; // fallback
  }
}

// ========== Профиль ==========
async function loadProfile() {
  try {
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) throw new Error("Не найден telegram_id");

    const res = await fetch(`${API_BASE}/api/user/status?id=${userId}`);
    const data = await res.json();

    if (data.ok && data.user) {
      const { name, phone, status } = data.user;

      document.getElementById("profileName").innerText = name || "-";
      document.getElementById("profilePhone").innerText = phone || "-";
      document.getElementById("profileStatus").innerText = status || "Default";

      // сохраняем статус в localStorage (для карт)
      localStorage.setItem("userCard", (status || "default").toLowerCase());
      renderCard();

    } else {
      document.getElementById("profileName").textContent = "—";
      document.getElementById("profilePhone").textContent = "—";
      document.getElementById("profileStatus").textContent = "Не зарегистрирован";
    }
  } catch (e) {
    console.error("Ошибка загрузки профиля:", e);
    document.getElementById("profileName").textContent = "—";
    document.getElementById("profilePhone").textContent = "—";
    document.getElementById("profileStatus").textContent = "Ошибка загрузки";
  }
}

// ========== Init ==========
window.addEventListener("DOMContentLoaded", () => {
  renderMenu();

  // Определяем имя приложения (по урлу)
const APP_NAME = window.location.href.includes("CabinetVladikWebApp") ? "cabinetvladik" : "cabinet75";

// Универсальная функция для отправки заявок
async function sendToServer(endpoint, payload) {
  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, appName: APP_NAME }) // <<< сюда подставляем appName
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || "Ошибка запроса");
    return data;
  } catch (err) {
    console.error("Ошибка при отправке:", err.message);
    alert("❌ Ошибка при отправке. Попробуйте позже.");
  }
}

// ==== Бронь стола ====
const bookForm = document.getElementById("bookTableForm");
if (bookForm) bookForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("name")?.value || "";
  const phone = document.getElementById("phone")?.value || "";
  const guests = document.getElementById("guests")?.value || 1;

  await sendToServer("/api/book/table", { name, phone, guests });
  alert("✅ Ваша заявка на бронь принята!");
  closeModal("bookTableModal");
});

// ==== Такси ====
const taxiForm = document.getElementById("taxiForm");
if (taxiForm) taxiForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("taxiName")?.value || "";
  const phone = document.getElementById("taxiPhone")?.value || "";
  const address = document.getElementById("taxiAddress")?.value || "";

  await sendToServer("/api/book/taxi", { name, phone, address });
  alert("✅ Заявка на такси принята!");
  closeModal("taxiModal");
});

// ==== Команда ====
const teamForm = document.getElementById("joinTeamForm");
if (teamForm) teamForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("teamName")?.value || "";
  const phone = document.getElementById("teamPhone")?.value || "";
  const role = document.getElementById("teamRole")?.value || "";

  await sendToServer("/api/book/team", { name, phone, role });
  alert("✅ Администратор свяжется с вами в течение недели!");
  closeModal("joinTeamModal");
});

  // Инициализация Telegram Web App
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
});

// ========== Прелоадер ==========
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  setTimeout(() => {
    preloader.classList.add("hide");
    preloader.setAttribute("aria-hidden", "true");
    setTimeout(() => (preloader.style.display = "none"), 1000);
  }, 1500);
});

setTimeout(() => {
  const preloader = document.getElementById("preloader");
  if (preloader && preloader.style.display !== "none") {
    preloader.classList.add("hide");
    preloader.setAttribute("aria-hidden", "true");
    setTimeout(() => preloader.remove(), 1000);
  }
}, 4000);

function openTab(id) {
  document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(id).style.display = "block";
  const activeBtn = document.querySelector(`.tab-btn[onclick="openTab('${id}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  if (id === "bannersTab") {
    if (typeof loadBanners === "function") {
      loadBanners(); // Cabinet75
    } else if (typeof loadBannersVladik === "function") {
      loadBannersVladik(); // CabinetVladik
    }
  }
  
  if (id === "usersTab" && typeof loadUsers === "function") {
    loadUsers();
  }
}

// --- Логин админа ---
async function adminLogin() {
  const password = document.getElementById("adminPassword").value.trim();
  if (!password) return alert("Введите пароль");
  
  try {
    const resp = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await resp.json();
    if (!data.ok) return alert(data.error || "Ошибка входа");
    
    sessionStorage.setItem("adm_token", data.token);
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    openTab('bannersTab');
  } catch (error) {
    alert("Ошибка сети: " + error.message);
  }
}

// --- Афиши ---
async function uploadBanner() {
  const fileInput = document.getElementById("bannerFile");
  const f = fileInput.files[0];
  if (!f) return alert("Выберите файл");
  
  const fd = new FormData();
  fd.append("image", f);
  
  try {
    const resp = await fetch(`${API_BASE}/api/admin/banners/cabinetvladik`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken()}` },
      body: fd
    });
    const data = await resp.json();
    if (!data.ok) return alert(data.error || "Ошибка загрузки");
    
    alert("Афиша загружена!");
    fileInput.value = ""; // Очищаем input
    loadBanners();
  } catch (error) {
    alert("Ошибка сети: " + error.message);
  }
}

// === Загрузка афиш CabinetVladik ===
async function loadBannersVladik() {
  try {
    const resp = await fetch(`${API_BASE}/api/banners/cabinetvladik`);
    const data = await resp.json();
    const list = document.getElementById("bannersList");
    list.innerHTML = "";
    
    if (data.ok && data.banners && data.banners.length) {
      data.banners.forEach(b => {
        const div = document.createElement("div");
        div.className = "poster-item";
        div.innerHTML = `
          <img src="${API_BASE}${b.image}" class="menu-img" loading="lazy"/>
          <button onclick="deleteBannerVladik(${b.id})" class="delete-btn">Удалить</button>
        `;
        list.appendChild(div);
      });
    } else {
      list.innerHTML = "<p>Нет афиш</p>";
    }
  } catch (error) {
    console.error("Ошибка загрузки афиш:", error);
    document.getElementById("bannersList").innerHTML = "<p>Ошибка сети</p>";
  }
}

// === Удаление афиши CabinetVladik ===
async function deleteBannerVladik(id) {
  if (!confirm("Удалить афишу?")) return;
  try {
    const resp = await fetch(`${API_BASE}/api/admin/banners/cabinetvladik/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken()}` }
    });
    const data = await resp.json();
    if (!data.ok) return alert(data.error || "Ошибка удаления");
    loadBannersVladik();
  } catch (error) {
    alert("Ошибка сети: " + error.message);
  }
}

// --- Пользователи ---
async function setUserStatus() {
  const name = document.getElementById("userName").value.trim();
  const phone = document.getElementById("userPhone").value.trim();
  const status = document.getElementById("userStatus").value;
  const telegram_id = prompt("Введите Telegram ID пользователя:");
  
  if (!telegram_id) return alert("Telegram ID обязателен");
  
  try {
    const resp = await fetch(`${API_BASE}/api/admin/user/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken()}`
      },
      body: JSON.stringify({ name, phone, status, telegram_id })
    });
    const data = await resp.json();
    if (!data.ok) return alert(data.error || "Ошибка сохранения");
    
    alert("Статус сохранён!");
    document.getElementById("userName").value = "";
    document.getElementById("userPhone").value = "";
    loadUsers();
  } catch (error) {
    alert("Ошибка сети: " + error.message);
  }
}

async function loadUsers() {
  try {
    // ИСПРАВЛЕНО: правильный endpoint для получения пользователей
    const resp = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { "Authorization": `Bearer ${adminToken()}` }
    });
    const data = await resp.json();
    const list = document.getElementById("usersList");
    list.innerHTML = "";
    
    if (data.ok && data.users && data.users.length) {
      data.users.forEach(u => {
        const card = document.createElement("div");
        card.className = "user-card";
        card.innerHTML = `
          <strong>${u.name || "Без имени"}</strong><br>
          Тел: ${u.phone || "—"}<br>
          ID: ${u.telegram_id}<br>
          Статус: ${u.status || "Default"}<br>
          <small>Зарегистрирован: ${new Date(u.created_at).toLocaleDateString()}</small>
        `;
        list.appendChild(card);
      });
    } else {
      list.innerHTML = "<p>Нет пользователей</p>";
    }
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
    document.getElementById("usersList").innerHTML = "<p>Ошибка загрузки</p>";
  }
}

// Загружаем афишу
async function loadPosters() {
  const container = document.getElementById("posterContainer");
  container.innerHTML = "Загрузка афиши...";

  try {
    const res = await fetch("https://api.cabinetbot.cabinet75.ru/api/banners/cabinetvladik");
    const data = await res.json();

    if (data.ok) {
      container.innerHTML = "";
      data.banners.forEach(b => {
        const div = document.createElement("div");
        div.className = "poster-item";
        div.innerHTML = `<img src="https://api.cabinetbot.cabinet75.ru${b.image}" alt="${b.title}" /><p>${b.title}</p>`;
        container.appendChild(div);
      });
    } else {
      container.innerHTML = "Ошибка загрузки афиши.";
    }
  } catch (e) {
    console.error("Ошибка сети:", e);
    container.innerHTML = "Ошибка сети при загрузке афиши.";
  }
}

// --- Рассылка ---
async function sendBroadcast() {
  const text = document.getElementById("broadcastText").value.trim();
  const status = document.getElementById("broadcastStatus").value;
  const phones = document.getElementById("broadcastPhones").value.trim();
  
  if (!text) return alert("Введите текст сообщения");
  
  try {
    const resp = await fetch(`${API_BASE}/api/admin/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken()}`
      },
      body: JSON.stringify({ text, status: status || undefined, phones: phones || undefined })
    });
    const data = await resp.json();
    if (!data.ok) return alert(data.error || "Ошибка отправки");
    
    alert(`✅ Сообщение отправлено (${data.count || 0} получателей)`);
    document.getElementById("broadcastText").value = "";
    document.getElementById("broadcastStatus").value = "";
    document.getElementById("broadcastPhones").value = "";
  } catch (err) {
    alert("Ошибка сети при отправке рассылки: " + err.message);
  }
}

// Автоматическая проверка авторизации при открытии админки
document.getElementById('adminModal').addEventListener('click', function(e) {
  if (e.target === this) {
    const token = adminToken();
    if (token) {
      document.getElementById("adminLogin").style.display = "none";
      document.getElementById("adminPanel").style.display = "block";
    }
  }
});
