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
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const selectedRoleInput = document.getElementById("selectedRole");
const roleCards = document.querySelectorAll("[data-role-card]");
const dashboardWelcome = document.getElementById("dashboardWelcome");
const logoutLinks = document.querySelectorAll(".logout-link");
const dashboardRole = document.body?.dataset?.dashboardRole || "";
const usersList = document.getElementById("usersList");

const AUTH_STORAGE_KEY = "pitcrew_auth";
const THEME_STORAGE_KEY = "pitcrew_theme";

function setAuth(auth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function getAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getDashboardPath(role) {
  if (role === "admin") {
    return "admin.html";
  }

  if (role === "mechanic") {
    return "mechanic.html";
  }

  return "user.html";
}

function getTheme() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
}

function toggleTheme() {
  const nextTheme = getTheme() === "dark" ? "light" : "dark";
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function ensureThemeToggle() {
  const navShell = document.querySelector(".nav-shell");
  if (!navShell) {
    return;
  }

  const existing = navShell.querySelector(".theme-toggle");
  if (existing) {
    return;
  }

  const navCta = navShell.querySelector(".nav-cta");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-secondary theme-toggle";
  button.textContent = "Night Mode";
  button.addEventListener("click", toggleTheme);

  if (navCta) {
    navShell.insertBefore(button, navCta);
  } else {
    navShell.appendChild(button);
  }
}

function applyRoleSelection(role) {
  if (!selectedRoleInput) {
    return;
  }

  selectedRoleInput.value = role;
  roleCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.roleCard === role);
  });
}

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

      if (type === "users") {
        return `
          <article class="admin-card">
            <h3>${escapeHtml(record.name || "Unnamed user")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.role || "No role")}</span>
              <span>${escapeHtml(record.email || "No email")}</span>
            </div>
            <p><strong>Created:</strong> ${escapeHtml(record.createdAt || "-")}</p>
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
  if (!bookingsList || !mechanicsList || !adminStatus || !usersList) {
    return;
  }

  adminStatus.textContent = "Refreshing dashboard...";

  try {
    const [bookingsResponse, mechanicsResponse, usersResponse] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/mechanics"),
      fetch("/api/users")
    ]);

    if (!bookingsResponse.ok || !mechanicsResponse.ok || !usersResponse.ok) {
      throw new Error("Dashboard fetch failed");
    }

    const [bookings, mechanics, users] = await Promise.all([
      bookingsResponse.json(),
      mechanicsResponse.json(),
      usersResponse.json()
    ]);

    renderCards(bookingsList, Array.isArray(bookings) ? bookings : [], "bookings");
    renderCards(mechanicsList, Array.isArray(mechanics) ? mechanics : [], "mechanics");
    renderCards(usersList, Array.isArray(users) ? users : [], "users");
    adminStatus.textContent = "Dashboard updated.";
  } catch (error) {
    adminStatus.textContent = "Could not load admin data right now.";
  }
}

applyTheme(getTheme());
ensureThemeToggle();

function requireDashboardAccess(requiredRole) {
  if (!requiredRole) {
    return;
  }

  const auth = getAuth();
  if (!auth || auth.role !== requiredRole) {
    window.location.href = "login.html";
    return;
  }

  if (dashboardWelcome) {
    dashboardWelcome.textContent = `${auth.name}, this is your ${requiredRole} dashboard.`;
  }
}

if (roleCards.length && selectedRoleInput) {
  roleCards.forEach((card) => {
    card.addEventListener("click", () => {
      applyRoleSelection(card.dataset.roleCard || "admin");
    });
  });
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
      `${payload.name}, your request was saved successfully.`
    );
  });
}

if (bookingForm && bookingMessage) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/bookings", bookingForm, bookingMessage, (payload) =>
      `${payload.name}, your booking request was saved successfully.`
    );
  });
}

if (mechanicForm && mechanicMessage) {
  mechanicForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await submitJson("/api/mechanics", mechanicForm, mechanicMessage, (payload) =>
      `${payload.name}, your mechanic profile was saved successfully.`
    );
  });
}

if (refreshAdminButton) {
  refreshAdminButton.addEventListener("click", loadAdminData);
}

if (dashboardRole) {
  requireDashboardAccess(dashboardRole);
}

if (dashboardRole === "admin" && bookingsList && mechanicsList && usersList) {
  loadAdminData();
}

logoutLinks.forEach((link) => {
  link.addEventListener("click", () => {
    clearAuth();
  });
});

if (loginForm && loginMessage) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    const role = String(payload.role || "");

    loginMessage.textContent = "Checking login...";

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Login failed");
      }

      setAuth(data.user);
      loginMessage.textContent = "Login successful. Redirecting...";
      window.setTimeout(() => {
        window.location.href = getDashboardPath(role);
      }, 400);
    } catch (error) {
      clearAuth();
      loginMessage.textContent = "Login failed. You need a valid account for the selected role.";
    }
  });
}

if (registerForm && registerMessage) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const payload = Object.fromEntries(formData.entries());
    registerMessage.textContent = "Creating account...";

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Registration failed");
      }

      registerMessage.textContent = "Account created. Redirecting to login...";
      registerForm.reset();
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 700);
    } catch (error) {
      registerMessage.textContent = error.message || "Registration failed.";
    }
  });
}
