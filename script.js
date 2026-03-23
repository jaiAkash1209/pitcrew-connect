const requestForm = document.getElementById("requestForm");
const formMessage = document.getElementById("formMessage");
const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const mechanicForm = document.getElementById("mechanicForm");
const mechanicMessage = document.getElementById("mechanicMessage");
const userForm = document.getElementById("userForm");
const userMessage = document.getElementById("userMessage");
const bookingsList = document.getElementById("bookingsList");
const mechanicsList = document.getElementById("mechanicsList");
const adminStatus = document.getElementById("adminStatus");
const refreshAdminButton = document.getElementById("refreshAdminButton");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const ADMIN_SESSION_KEY = "pitcrew_admin_session";

async function submitJson(url, form, messageElement, successText) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  messageElement.textContent = "Submitting...";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    messageElement.textContent = successText(payload);
    form.reset();
  } catch (error) {
    messageElement.textContent = "Could not submit. Please try again in a moment.";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCards(listElement, records, type) {
  if (!listElement) {
    return;
  }

  if (!records.length) {
    listElement.innerHTML = `
      <article class="empty-state">
        <h3>No ${type} yet</h3>
        <p class="admin-note">New ${type} will appear here after forms are submitted.</p>
      </article>
    `;
    return;
  }

  listElement.innerHTML = records
    .slice()
    .reverse()
    .map((record) => {
      if (type === "bookings") {
        return `
          <article class="admin-card">
            <h3>${escapeHtml(record.name || "Unnamed request")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.service || "No service")}</span>
              <span>${escapeHtml(record.urgency || "No urgency")}</span>
              <span>${escapeHtml(record.location || "No location")}</span>
            </div>
            <p><strong>Vehicle:</strong> ${escapeHtml(record.vehicle || "-")}</p>
            <p><strong>Phone:</strong> ${escapeHtml(record.phone || "-")}</p>
            <p><strong>Issue:</strong> ${escapeHtml(record.issue || "-")}</p>
          </article>
        `;
      }

      return `
        <article class="admin-card">
          <h3>${escapeHtml(record.name || "Unnamed mechanic")}</h3>
          <div class="admin-meta">
            <span>${escapeHtml(record.service || "No service")}</span>
            <span>${escapeHtml(record.experience || "No experience")}</span>
            <span>${escapeHtml(record.location || "No location")}</span>
          </div>
          <p><strong>Business:</strong> ${escapeHtml(record.business || "-")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(record.phone || "-")}</p>
          <p><strong>Specialties:</strong> ${escapeHtml(record.specialties || "-")}</p>
        </article>
      `;
    })
    .join("");
}

async function loadAdminData() {
  if (!bookingsList || !mechanicsList || !adminStatus) {
    return;
  }

  adminStatus.textContent = "Refreshing dashboard...";

  try {
    const [bookingsResponse, mechanicsResponse] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/mechanics")
    ]);

    if (!bookingsResponse.ok || !mechanicsResponse.ok) {
      throw new Error("Dashboard fetch failed");
    }

    const [bookings, mechanics] = await Promise.all([
      bookingsResponse.json(),
      mechanicsResponse.json()
    ]);

    renderCards(bookingsList, Array.isArray(bookings) ? bookings : [], "bookings");
    renderCards(mechanicsList, Array.isArray(mechanics) ? mechanics : [], "mechanics");
    adminStatus.textContent = "Dashboard updated.";
  } catch (error) {
    adminStatus.textContent = "Could not load admin data right now.";
  }
}

function isAdminLoggedIn() {
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function requireAdminLogin() {
  if (!bookingsList || !mechanicsList) {
    return;
  }

  if (!isAdminLoggedIn()) {
    window.location.href = "login.html";
  }
}

if (requestForm && formMessage) {
  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/bookings", requestForm, formMessage, (payload) =>
      `${payload.name}, your ${String(payload.service).toLowerCase()} request was saved.`
    );
  });
}

if (userForm && userMessage) {
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/bookings", userForm, userMessage, (payload) =>
      `${payload.name}, your user request for ${String(payload.service).toLowerCase()} was saved.`
    );
  });
}

if (bookingForm && bookingMessage) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/bookings", bookingForm, bookingMessage, (payload) =>
      `${payload.name}, your ${String(payload.service).toLowerCase()} booking was saved as a ${String(payload.urgency).toLowerCase()} request.`
    );
  });
}

if (refreshAdminButton) {
  refreshAdminButton.addEventListener("click", loadAdminData);
}

if (bookingsList && mechanicsList) {
  requireAdminLogin();
  loadAdminData();
}

if (mechanicForm && mechanicMessage) {
  mechanicForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/mechanics", mechanicForm, mechanicMessage, (payload) =>
      `${payload.name}, your mechanic profile for ${String(payload.service).toLowerCase()} was saved.`
    );
  });
}

if (loginForm && loginMessage) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const role = String(formData.get("role") || "");

    if (role === "admin") {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      loginMessage.textContent = "Login successful. Redirecting to admin page...";
      window.setTimeout(() => {
        window.location.href = "admin.html";
      }, 500);
      return;
    }

    window.localStorage.removeItem(ADMIN_SESSION_KEY);

    if (role === "customer") {
      loginMessage.textContent = "Redirecting to customer page...";
      window.setTimeout(() => {
        window.location.href = "user.html";
      }, 500);
      return;
    }

    if (role === "mechanic") {
      loginMessage.textContent = "Redirecting to mechanic page...";
      window.setTimeout(() => {
        window.location.href = "mechanic.html";
      }, 500);
    }
  });
}
