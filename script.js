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
const userSettingsForm = document.getElementById("userSettingsForm");
const userSettingsMessage = document.getElementById("userSettingsMessage");
const mechanicSettingsForm = document.getElementById("mechanicSettingsForm");
const mechanicSettingsMessage = document.getElementById("mechanicSettingsMessage");
const adminSettingsForm = document.getElementById("adminSettingsForm");
const adminSettingsMessage = document.getElementById("adminSettingsMessage");
const trackingList = document.getElementById("trackingList");
const trackingStatus = document.getElementById("trackingStatus");
const trackingRole = document.getElementById("trackingRole");
const trackingName = document.getElementById("trackingName");
const trackingLatitude = document.getElementById("trackingLatitude");
const trackingLongitude = document.getElementById("trackingLongitude");
const trackingAccuracy = document.getElementById("trackingAccuracy");
const trackingUpdatedAt = document.getElementById("trackingUpdatedAt");
const startTrackingButton = document.getElementById("startTrackingButton");
const stopTrackingButton = document.getElementById("stopTrackingButton");
const trackingMapElement = document.getElementById("trackingMap");
const trackingMatchesList = document.getElementById("trackingMatchesList");
const adminTrackingList = document.getElementById("adminTrackingList");
const adminMatchesList = document.getElementById("adminMatchesList");

const AUTH_STORAGE_KEY = "pitcrew_auth";
const THEME_STORAGE_KEY = "pitcrew_theme";
const TRACKER_STORAGE_KEY = "pitcrew_tracker_id";
let trackingWatcherId = null;
let trackingPollId = null;
let trackingMap = null;
let trackingMarkers = new Map();
let trackingRoutes = new Map();

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

function getSettingsStorageKey(formId) {
  return `pitcrew_settings_${formId}`;
}

function getTheme() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
}

function getTrackerId() {
  let trackerId = window.localStorage.getItem(TRACKER_STORAGE_KEY);
  if (!trackerId) {
    trackerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(TRACKER_STORAGE_KEY, trackerId);
  }
  return trackerId;
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

function loadFormSettings(form) {
  if (!form || !form.id) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(getSettingsStorageKey(form.id));
    if (!raw) {
      return;
    }

    const values = JSON.parse(raw);
    Object.entries(values).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = value;
      }
    });
  } catch (error) {
    return;
  }
}

function attachSettingsForm(form, messageElement) {
  if (!form || !messageElement) {
    return;
  }

  loadFormSettings(form);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    window.localStorage.setItem(getSettingsStorageKey(form.id), JSON.stringify(payload));
    messageElement.textContent = "Settings saved.";
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

      if (type === "tracking") {
        return `
          <article class="tracking-feed-card">
            <h3>${escapeHtml(record.name || "Unknown tracker")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.role || "No role")}</span>
              <span>${escapeHtml(record.updatedAt || "No update time")}</span>
            </div>
            <p><strong>Latitude:</strong> ${escapeHtml(record.latitude ?? "-")}</p>
            <p><strong>Longitude:</strong> ${escapeHtml(record.longitude ?? "-")}</p>
            <p><strong>Accuracy:</strong> ${escapeHtml(record.accuracy ?? "-")}</p>
          </article>
        `;
      }

      if (type === "matches") {
        return `
          <article class="admin-card">
            <h3>${escapeHtml(record.user?.name || "Unknown user")} -> ${escapeHtml(record.mechanic?.name || "Unknown mechanic")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.distanceKm ?? "-")} km</span>
              <span>${escapeHtml(record.mechanic?.role || "mechanic")}</span>
              <span>${escapeHtml(record.user?.role || "user")}</span>
            </div>
            <p><strong>User:</strong> ${escapeHtml(record.user?.name || "-")}</p>
            <p><strong>Mechanic:</strong> ${escapeHtml(record.mechanic?.name || "-")}</p>
            <p><strong>Distance:</strong> ${escapeHtml(record.distanceKm ?? "-")} km</p>
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

function ensureTrackingMap() {
  if (!trackingMapElement || typeof window.L === "undefined" || trackingMap) {
    return;
  }

  trackingMap = window.L.map(trackingMapElement).setView([20.5937, 78.9629], 5);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(trackingMap);
}

function updateTrackingMap(trackers, matches) {
  if (!trackingMapElement || typeof window.L === "undefined") {
    return;
  }

  ensureTrackingMap();
  if (!trackingMap) {
    return;
  }

  const activeIds = new Set();
  const bounds = [];

  trackers.forEach((tracker) => {
    const latitude = Number(tracker.latitude);
    const longitude = Number(tracker.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return;
    }

    const trackerId = String(tracker.trackerId || "");
    activeIds.add(trackerId);
    bounds.push([latitude, longitude]);

    const popup = `
      <strong>${escapeHtml(tracker.name || "Unknown tracker")}</strong><br>
      Role: ${escapeHtml(tracker.role || "-")}<br>
      Updated: ${escapeHtml(tracker.updatedAt || "-")}
    `;

    const marker = trackingMarkers.get(trackerId);
    if (marker) {
      marker.setLatLng([latitude, longitude]).bindPopup(popup);
      return;
    }

    const nextMarker = window.L.marker([latitude, longitude]).addTo(trackingMap).bindPopup(popup);
    trackingMarkers.set(trackerId, nextMarker);
  });

  trackingMarkers.forEach((marker, trackerId) => {
    if (!activeIds.has(trackerId)) {
      trackingMap.removeLayer(marker);
      trackingMarkers.delete(trackerId);
    }
  });

  if (bounds.length === 1) {
    trackingMap.setView(bounds[0], 14);
  } else if (bounds.length > 1) {
    trackingMap.fitBounds(bounds, { padding: [30, 30] });
  }

  const activeRouteIds = new Set();
  (matches || []).forEach((match) => {
    const userLatitude = Number(match.user?.latitude);
    const userLongitude = Number(match.user?.longitude);
    const mechanicLatitude = Number(match.mechanic?.latitude);
    const mechanicLongitude = Number(match.mechanic?.longitude);
    if (
      Number.isNaN(userLatitude) ||
      Number.isNaN(userLongitude) ||
      Number.isNaN(mechanicLatitude) ||
      Number.isNaN(mechanicLongitude)
    ) {
      return;
    }

    const routeId = String(match.id || `${match.user?.trackerId}-${match.mechanic?.trackerId}`);
    activeRouteIds.add(routeId);

    const routePoints = [
      [userLatitude, userLongitude],
      [mechanicLatitude, mechanicLongitude]
    ];
    const routeLine = trackingRoutes.get(routeId);

    if (routeLine) {
      routeLine.setLatLngs(routePoints);
      return;
    }

    const nextRoute = window.L.polyline(routePoints, {
      color: "#ff6b2c",
      weight: 4,
      opacity: 0.75,
      dashArray: "10 8"
    }).addTo(trackingMap);

    trackingRoutes.set(routeId, nextRoute);
  });

  trackingRoutes.forEach((routeLine, routeId) => {
    if (!activeRouteIds.has(routeId)) {
      trackingMap.removeLayer(routeLine);
      trackingRoutes.delete(routeId);
    }
  });
}

async function loadTrackingMatches() {
  const response = await fetch("/api/tracking/matches");
  if (!response.ok) {
    throw new Error("Matches fetch failed");
  }

  const matches = await response.json();
  return Array.isArray(matches) ? matches : [];
}

async function loadAdminData() {
  if (!bookingsList || !mechanicsList || !adminStatus || !usersList) {
    return;
  }

  adminStatus.textContent = "Refreshing dashboard...";

  try {
    const [bookingsResponse, mechanicsResponse, usersResponse, trackingResponse, matches] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/mechanics"),
      fetch("/api/users"),
      fetch("/api/tracking"),
      loadTrackingMatches()
    ]);

    if (!bookingsResponse.ok || !mechanicsResponse.ok || !usersResponse.ok || !trackingResponse.ok) {
      throw new Error("Dashboard fetch failed");
    }

    const [bookings, mechanics, users, trackers] = await Promise.all([
      bookingsResponse.json(),
      mechanicsResponse.json(),
      usersResponse.json(),
      trackingResponse.json()
    ]);

    renderCards(bookingsList, Array.isArray(bookings) ? bookings : [], "bookings");
    renderCards(mechanicsList, Array.isArray(mechanics) ? mechanics : [], "mechanics");
    renderCards(usersList, Array.isArray(users) ? users : [], "users");
    renderCards(adminTrackingList, Array.isArray(trackers) ? trackers : [], "tracking");
    renderCards(adminMatchesList, matches, "matches");
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
  if (!auth || (requiredRole !== "auth" && auth.role !== requiredRole)) {
    window.location.href = "login.html";
    return;
  }

  if (dashboardWelcome) {
    dashboardWelcome.textContent = `${auth.name}, this is your ${requiredRole} dashboard.`;
  }
}

async function refreshTrackingFeed() {
  if (!trackingList && !trackingMatchesList) {
    return;
  }

  try {
    const [response, matches] = await Promise.all([
      fetch("/api/tracking"),
      loadTrackingMatches()
    ]);
    if (!response.ok) {
      throw new Error("Tracking fetch failed");
    }

    const trackers = await response.json();
    const records = Array.isArray(trackers) ? trackers : [];
    renderCards(trackingList, records, "tracking");
    renderCards(trackingMatchesList, matches, "matches");
    updateTrackingMap(records, matches);
  } catch (error) {
    if (trackingStatus) {
      trackingStatus.textContent = "Could not load tracking feed.";
    }
  }
}

async function sendTrackingPosition(position) {
  const auth = getAuth();
  if (!auth) {
    return;
  }

  const payload = {
    trackerId: getTrackerId(),
    role: auth.role,
    name: auth.name,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy
  };

  const response = await fetch("/api/tracking/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Tracking update failed");
  }

  trackingRole.textContent = `Role: ${auth.role}`;
  trackingName.textContent = `Name: ${auth.name}`;
  trackingLatitude.textContent = String(position.coords.latitude);
  trackingLongitude.textContent = String(position.coords.longitude);
  trackingAccuracy.textContent = `${Math.round(position.coords.accuracy)} m`;
  trackingUpdatedAt.textContent = new Date().toLocaleString();
  if (trackingStatus) {
    trackingStatus.textContent = "Tracking is live.";
  }
}

function stopTracking() {
  if (trackingWatcherId !== null) {
    navigator.geolocation.clearWatch(trackingWatcherId);
    trackingWatcherId = null;
  }

  if (trackingPollId !== null) {
    window.clearInterval(trackingPollId);
    trackingPollId = null;
  }

  if (trackingStatus) {
    trackingStatus.textContent = "Tracking stopped.";
  }
}

function startTracking() {
  if (!navigator.geolocation) {
    if (trackingStatus) {
      trackingStatus.textContent = "Geolocation is not available on this device.";
    }
    return;
  }

  stopTracking();
  if (trackingStatus) {
    trackingStatus.textContent = "Starting tracking...";
  }

  trackingWatcherId = navigator.geolocation.watchPosition(
    async (position) => {
      try {
        await sendTrackingPosition(position);
        refreshTrackingFeed();
      } catch (error) {
        if (trackingStatus) {
          trackingStatus.textContent = "Could not update live tracking.";
        }
      }
    },
    () => {
      if (trackingStatus) {
        trackingStatus.textContent = "Location permission is required for live tracking.";
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );

  trackingPollId = window.setInterval(refreshTrackingFeed, 5000);
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

if (dashboardRole === "auth" && trackingList) {
  refreshTrackingFeed();
  trackingPollId = window.setInterval(refreshTrackingFeed, 5000);
}

attachSettingsForm(userSettingsForm, userSettingsMessage);
attachSettingsForm(mechanicSettingsForm, mechanicSettingsMessage);
attachSettingsForm(adminSettingsForm, adminSettingsMessage);

if (startTrackingButton) {
  startTrackingButton.addEventListener("click", startTracking);
}

if (stopTrackingButton) {
  stopTrackingButton.addEventListener("click", stopTracking);
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
