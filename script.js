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
const pendingMechanicsList = document.getElementById("pendingMechanicsList");
const mechanicReviewHistoryList = document.getElementById("mechanicReviewHistoryList");
const mechanicAssignmentsList = document.getElementById("mechanicAssignmentsList");
const bookingsTableBody = document.getElementById("bookingsTableBody");
const usersTableBody = document.getElementById("usersTableBody");
const mechanicTableBody = document.getElementById("mechanicTableBody");
const bookingSearchInput = document.getElementById("bookingSearchInput");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");
const bookingSortSelect = document.getElementById("bookingSortSelect");
const bookingDateFrom = document.getElementById("bookingDateFrom");
const bookingDateTo = document.getElementById("bookingDateTo");
const exportBookingsButton = document.getElementById("exportBookingsButton");
const importBookingsButton = document.getElementById("importBookingsButton");
const importBookingsInput = document.getElementById("importBookingsInput");
const bookingPrevPageButton = document.getElementById("bookingPrevPageButton");
const bookingNextPageButton = document.getElementById("bookingNextPageButton");
const bookingPageInfo = document.getElementById("bookingPageInfo");
const mechanicSearchInput = document.getElementById("mechanicSearchInput");
const mechanicStatusFilter = document.getElementById("mechanicStatusFilter");
const mechanicSortSelect = document.getElementById("mechanicSortSelect");
const mechanicDateFrom = document.getElementById("mechanicDateFrom");
const mechanicDateTo = document.getElementById("mechanicDateTo");
const exportMechanicsButton = document.getElementById("exportMechanicsButton");
const importMechanicsButton = document.getElementById("importMechanicsButton");
const importMechanicsInput = document.getElementById("importMechanicsInput");
const mechanicPrevPageButton = document.getElementById("mechanicPrevPageButton");
const mechanicNextPageButton = document.getElementById("mechanicNextPageButton");
const mechanicPageInfo = document.getElementById("mechanicPageInfo");
const userSearchInput = document.getElementById("userSearchInput");
const userRoleFilter = document.getElementById("userRoleFilter");
const userSortSelect = document.getElementById("userSortSelect");
const userDateFrom = document.getElementById("userDateFrom");
const userDateTo = document.getElementById("userDateTo");
const exportUsersButton = document.getElementById("exportUsersButton");
const importUsersButton = document.getElementById("importUsersButton");
const importUsersInput = document.getElementById("importUsersInput");
const userPrevPageButton = document.getElementById("userPrevPageButton");
const userNextPageButton = document.getElementById("userNextPageButton");
const userPageInfo = document.getElementById("userPageInfo");
const adminStatus = document.getElementById("adminStatus");
const refreshAdminButton = document.getElementById("refreshAdminButton");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerRoleSelect = document.getElementById("registerRole");
const mechanicRegisterFields = document.getElementById("mechanicRegisterFields");
const selectedRoleInput = document.getElementById("selectedRole");
const roleCards = document.querySelectorAll("[data-role-card]");
const dashboardWelcome = document.getElementById("dashboardWelcome");
const logoutLinks = document.querySelectorAll(".logout-link");
const dashboardRole = document.body?.dataset?.dashboardRole || "";
const usersList = document.getElementById("usersList");
const userEditForm = document.getElementById("userEditForm");
const userEditMessage = document.getElementById("userEditMessage");
const clearUserEditButton = document.getElementById("clearUserEditButton");
const mechanicEditForm = document.getElementById("mechanicEditForm");
const mechanicEditMessage = document.getElementById("mechanicEditMessage");
const clearMechanicEditButton = document.getElementById("clearMechanicEditButton");
const userSettingsForm = document.getElementById("userSettingsForm");
const userSettingsMessage = document.getElementById("userSettingsMessage");
const mechanicSettingsForm = document.getElementById("mechanicSettingsForm");
const mechanicSettingsMessage = document.getElementById("mechanicSettingsMessage");
const adminSettingsForm = document.getElementById("adminSettingsForm");
const adminSettingsMessage = document.getElementById("adminSettingsMessage");
const mechanicJobsList = document.getElementById("mechanicJobsList");
const mechanicJobsStatus = document.getElementById("mechanicJobsStatus");
const refreshMechanicJobsButton = document.getElementById("refreshMechanicJobsButton");
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
const roleTrackingTitle = document.getElementById("roleTrackingTitle");
const roleTrackingPrimary = document.getElementById("roleTrackingPrimary");
const roleTrackingSecondary = document.getElementById("roleTrackingSecondary");
const roleTrackingDescription = document.getElementById("roleTrackingDescription");
const roleTrackingCoordinates = document.getElementById("roleTrackingCoordinates");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");
const mechanicReviewPanel = document.getElementById("mechanicReviewPanel");
const mechanicReviewTitle = document.getElementById("mechanicReviewTitle");

const AUTH_STORAGE_KEY = "pitcrew_auth";
const THEME_STORAGE_KEY = "pitcrew_theme";
const TRACKER_STORAGE_KEY = "pitcrew_tracker_id";
const dashboardPage = document.body?.dataset?.dashboardPage || "";
let trackingWatcherId = null;
let trackingPollId = null;
let trackingMap = null;
let trackingMarkers = new Map();
let trackingRoutes = new Map();
let trackingAccuracyCircles = new Map();
let trackingRouteBadges = new Map();
let adminDataset = {
  bookings: [],
  mechanics: [],
  users: [],
  trackers: [],
  pendingMechanics: [],
  reviewedMechanics: [],
  mechanicAssignments: [],
  matches: []
};
const ADMIN_PAGE_SIZE = 8;
const adminTableState = {
  bookings: { page: 1 },
  mechanics: { page: 1 },
  users: { page: 1 }
};

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

function redirectToLogin() {
  window.location.replace("login.html");
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
  const toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀" : "☾";
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    toggle.setAttribute("title", theme === "dark" ? "Light mode" : "Dark mode");
  }
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
  button.textContent = getTheme() === "dark" ? "☀" : "☾";
  button.setAttribute("aria-label", getTheme() === "dark" ? "Switch to light mode" : "Switch to dark mode");
  button.setAttribute("title", getTheme() === "dark" ? "Light mode" : "Dark mode");
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

function toggleMechanicRegisterFields() {
  if (!registerRoleSelect || !mechanicRegisterFields) {
    return;
  }

  const isMechanic = registerRoleSelect.value === "mechanic";
  mechanicRegisterFields.hidden = !isMechanic;

  mechanicRegisterFields.querySelectorAll("input, textarea, select").forEach((field) => {
    if (field.name === "aadhaarPhoto" || field.name === "shopPhoto" || field.name === "phone" || field.name === "business" || field.name === "shopAddress") {
      field.required = isMechanic;
    }
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
      if (field && field.type !== "file") {
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

function readFileAsDataUrl(file) {
  if (!(file instanceof File)) {
    return Promise.resolve("");
  }

  if (!String(file.type || "").startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
        const width = Math.max(1, Math.round((image.width || 1) * scale));
        const height = Math.max(1, Math.round((image.height || 1) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(String(reader.result || ""));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => resolve(String(reader.result || ""));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

async function getFormPayload(form) {
  const formData = new FormData(form);
  const payload = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      payload[key] = value.size ? await readFileAsDataUrl(value) : "";
    } else {
      payload[key] = value;
    }
  }

  return payload;
}

async function submitJson(url, form, messageElement, successText) {
  const payload = await getFormPayload(form);
  const auth = getAuth();

  if ((form.id === "userForm" || form.id === "requestForm") && auth?.role === "user") {
    payload.requesterEmail = auth.email || "";
  }

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

function formatCoordinate(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return "-";
  }

  return numericValue.toFixed(6);
}

function getTrackerLocationLabel(tracker) {
  const accuracy = Number(tracker?.accuracy);
  if (!Number.isNaN(accuracy) && accuracy > 500) {
    return "Remote area / unnamed area";
  }

  return "Exact live GPS pin";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function buildVerificationHistorySummary(record) {
  const history = Array.isArray(record?.verificationHistory) ? record.verificationHistory : [];
  if (!history.length) {
    return "No review activity recorded yet.";
  }

  return history
    .slice(-3)
    .reverse()
    .map((entry) => {
      const statusPart = entry.verificationStatus ? `Status: ${entry.verificationStatus}` : "";
      const callPart = entry.verificationCallStatus ? `Call: ${entry.verificationCallStatus}` : "";
      const notePart = entry.verificationNotes ? `Note: ${entry.verificationNotes}` : "";
      const callNotePart = entry.verificationCallNotes ? `Call note: ${entry.verificationCallNotes}` : "";

      return [formatDateTime(entry.createdAt), statusPart, callPart, notePart, callNotePart]
        .filter(Boolean)
        .map((item) => escapeHtml(item))
        .join(" | ");
    })
    .join("<br>");
}

function buildMechanicAssignments(mechanics, bookings) {
  return (Array.isArray(mechanics) ? mechanics : [])
    .filter((mechanic) => String(mechanic.verificationStatus || "") === "Approved")
    .map((mechanic) => {
      const assignedBookings = (Array.isArray(bookings) ? bookings : []).filter((booking) => {
        return String(booking.assignedMechanicId || "") === String(mechanic.id || "");
      });

      return {
        ...mechanic,
        assignedBookings
      };
    });
}

function getReviewMechanicId() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("id") || "").trim();
}

function getVerificationNotePayload(mechanicId) {
  const reviewMechanicId = getReviewMechanicId();
  if (mechanicReviewPanel && String(reviewMechanicId || "") === String(mechanicId || "")) {
    return {
      verificationNotes: document.querySelector("[data-review-page-notes]")?.value?.trim() || "",
      verificationCallNotes: document.querySelector("[data-review-page-call-notes]")?.value?.trim() || ""
    };
  }

  const mechanicSelectorValue =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(String(mechanicId || ""))
      : String(mechanicId || "").replaceAll('"', '\\"');
  const card = document.querySelector(`[data-mechanic-card="${mechanicSelectorValue}"]`);
  if (!card) {
    return {
      verificationNotes: "",
      verificationCallNotes: ""
    };
  }

  const verificationNotes = card.querySelector("[data-review-notes]")?.value?.trim() || "";
  const verificationCallNotes = card.querySelector("[data-call-notes]")?.value?.trim() || "";
  return {
    verificationNotes,
    verificationCallNotes
  };
}

function getAdminHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

async function loadSessionUser() {
  const response = await fetch("/api/session");
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Session unavailable");
  }

  setAuth(data.user);
  return data.user;
}

function handleProtectedRequestFailure(error) {
  if (!error) {
    return;
  }

  const message = String(error.message || "");
  if (message.includes("Authentication required") || message.includes("Admin access required") || message.includes("Session expired")) {
    clearAuth();
    redirectToLogin();
  }
}

async function deleteAdminRecord(resource, recordId) {
  const response = await fetch(`/api/${resource}/${recordId}`, {
    method: "DELETE",
    headers: getAdminHeaders()
  });

  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Delete failed");
  }

  return data;
}

async function patchAdminRecord(resource, recordId, payload) {
  const response = await fetch(`/api/${resource}/${recordId}`, {
    method: "PATCH",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Update failed");
  }

  return data;
}

function renderTableBody(tableBody, rowsHtml, emptyMessage, columnCount) {
  if (!tableBody) {
    return;
  }

  if (!rowsHtml.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${columnCount}" class="table-empty">${escapeHtml(emptyMessage)}</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rowsHtml.join("");
}

function getNormalizedSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getDateValue(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function matchesDateRange(value, fromValue, toValue) {
  if (!fromValue && !toValue) {
    return true;
  }

  const recordTime = getDateValue(value);
  if (!recordTime) {
    return false;
  }

  const fromTime = fromValue ? getDateValue(`${fromValue}T00:00:00`) : 0;
  const toTime = toValue ? getDateValue(`${toValue}T23:59:59`) : 0;
  if (fromTime && recordTime < fromTime) {
    return false;
  }

  if (toTime && recordTime > toTime) {
    return false;
  }

  return true;
}

function sortRecords(records, sortValue) {
  const [field, direction] = String(sortValue || "createdAt-desc").split("-");
  const multiplier = direction === "asc" ? 1 : -1;

  return records.slice().sort((left, right) => {
    const leftValue = left?.[field];
    const rightValue = right?.[field];

    if (field === "createdAt") {
      return (getDateValue(leftValue) - getDateValue(rightValue)) * multiplier;
    }

    return getNormalizedSearchValue(leftValue).localeCompare(getNormalizedSearchValue(rightValue)) * multiplier;
  });
}

function paginateRecords(records, stateKey) {
  const safeRecords = Array.isArray(records) ? records : [];
  const totalPages = Math.max(1, Math.ceil(safeRecords.length / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(adminTableState[stateKey].page, totalPages);
  adminTableState[stateKey].page = currentPage;
  const startIndex = (currentPage - 1) * ADMIN_PAGE_SIZE;

  return {
    records: safeRecords.slice(startIndex, startIndex + ADMIN_PAGE_SIZE),
    currentPage,
    totalPages
  };
}

function updatePageInfo(element, currentPage, totalPages) {
  if (!element) {
    return;
  }

  element.textContent = `Page ${currentPage} of ${totalPages}`;
}

function setPagerDisabled(previousButton, nextButton, currentPage, totalPages) {
  if (previousButton) {
    previousButton.disabled = currentPage <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentPage >= totalPages;
  }
}

function parseCsvRow(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) {
    return [];
  }

  const headers = parseCsvRow(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read CSV file"));
    reader.readAsText(file);
  });
}

async function importAdminRows(resource, rows) {
  const response = await fetch(`/api/admin/import/${resource}`, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ rows })
  });

  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Import failed");
  }

  return data;
}

function getFilteredBookings(bookings) {
  const query = getNormalizedSearchValue(bookingSearchInput?.value);
  const status = String(bookingStatusFilter?.value || "").trim();
  const fromDate = String(bookingDateFrom?.value || "").trim();
  const toDate = String(bookingDateTo?.value || "").trim();

  return (Array.isArray(bookings) ? bookings : []).filter((booking) => {
    const matchesQuery = query
      ? [
          booking.name,
          booking.service,
          booking.location,
          booking.status,
          booking.assignedMechanicName
        ].some((value) => getNormalizedSearchValue(value).includes(query))
      : true;
    const matchesStatus = status ? String(booking.status || "") === status : true;
    return matchesQuery && matchesStatus && matchesDateRange(booking.createdAt, fromDate, toDate);
  });
}

function getFilteredUsers(users) {
  const query = getNormalizedSearchValue(userSearchInput?.value);
  const role = getNormalizedSearchValue(userRoleFilter?.value);
  const fromDate = String(userDateFrom?.value || "").trim();
  const toDate = String(userDateTo?.value || "").trim();

  return (Array.isArray(users) ? users : []).filter((user) => {
    const matchesQuery = query
      ? [user.name, user.email].some((value) => getNormalizedSearchValue(value).includes(query))
      : true;
    const matchesRole = role ? getNormalizedSearchValue(user.role) === role : true;
    return matchesQuery && matchesRole && matchesDateRange(user.createdAt, fromDate, toDate);
  });
}

function getFilteredMechanics(mechanics) {
  const query = getNormalizedSearchValue(mechanicSearchInput?.value);
  const status = String(mechanicStatusFilter?.value || "").trim();
  const fromDate = String(mechanicDateFrom?.value || "").trim();
  const toDate = String(mechanicDateTo?.value || "").trim();

  return (Array.isArray(mechanics) ? mechanics : []).filter((mechanic) => {
    const matchesQuery = query
      ? [
          mechanic.name,
          mechanic.email,
          mechanic.business,
          mechanic.service,
          mechanic.phone
        ].some((value) => getNormalizedSearchValue(value).includes(query))
      : true;
    const matchesStatus = status ? String(mechanic.verificationStatus || "") === status : true;
    return matchesQuery && matchesStatus && matchesDateRange(mechanic.createdAt, fromDate, toDate);
  });
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    return;
  }

  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function exportBookingsCsv() {
  const bookings = sortRecords(getFilteredBookings(adminDataset.bookings), bookingSortSelect?.value);
  downloadCsv("pitcrew-bookings.csv", [
    ["Id", "Customer", "Phone", "Vehicle", "Service", "Urgency", "Location", "Issue", "Status", "Requester Email", "Assigned Mechanic Id", "Assigned Mechanic", "Assigned Mechanic Email", "Created", "Accepted At", "Completed At"],
    ...bookings.map((booking) => [
      booking.id,
      booking.name,
      booking.phone,
      booking.vehicle,
      booking.service,
      booking.urgency,
      booking.location,
      booking.issue,
      booking.status,
      booking.requesterEmail,
      booking.assignedMechanicId,
      booking.assignedMechanicName,
      booking.assignedMechanicEmail,
      booking.createdAt,
      booking.acceptedAt,
      booking.completedAt
    ])
  ]);
}

function exportUsersCsv() {
  const users = sortRecords(getFilteredUsers(adminDataset.users), userSortSelect?.value);
  downloadCsv("pitcrew-users.csv", [
    ["Id", "Name", "Email", "Role", "Created", "Password"],
    ...users.map((user) => [user.id, user.name, user.email, user.role, user.createdAt, ""])
  ]);
}

function exportMechanicsCsv() {
  const mechanics = sortRecords(getFilteredMechanics(adminDataset.mechanics), mechanicSortSelect?.value);
  downloadCsv("pitcrew-mechanics.csv", [
    ["Id", "Name", "Email", "Phone", "Shop", "Experience", "Location", "Shop Address", "Service", "Specialties", "Verification", "Call Status", "Review Notes", "Call Notes", "Created"],
    ...mechanics.map((mechanic) => [
      mechanic.id,
      mechanic.name,
      mechanic.email,
      mechanic.phone,
      mechanic.business,
      mechanic.experience,
      mechanic.location,
      mechanic.shopAddress,
      mechanic.service,
      mechanic.specialties,
      mechanic.verificationStatus,
      mechanic.verificationCallStatus,
      mechanic.verificationNotes,
      mechanic.verificationCallNotes,
      mechanic.createdAt
    ])
  ]);
}

function renderAdminTables(bookingsPage, usersPage, mechanicsPage) {
  const bookingRecords = Array.isArray(bookingsPage?.records) ? bookingsPage.records : [];
  const userRecords = Array.isArray(usersPage?.records) ? usersPage.records : [];
  const mechanicRecords = Array.isArray(mechanicsPage?.records) ? mechanicsPage.records : [];
  renderTableBody(
    bookingsTableBody,
    bookingRecords.map((booking) => `
      <tr>
        <td>${escapeHtml(booking.name || "-")}</td>
        <td>${escapeHtml(booking.service || "-")}</td>
        <td>${escapeHtml(booking.urgency || "-")}</td>
        <td>${escapeHtml(booking.location || "-")}</td>
        <td>${escapeHtml(booking.status || "-")}</td>
        <td>${escapeHtml(booking.assignedMechanicName || "-")}</td>
        <td>${escapeHtml(formatDateTime(booking.createdAt))}</td>
        <td>
          <button class="button button-secondary action-button" data-delete-resource="bookings" data-delete-id="${escapeHtml(booking.id || "")}">Delete</button>
        </td>
      </tr>
    `),
    "Bookings will appear here after users submit service requests.",
    8
  );
  updatePageInfo(bookingPageInfo, Number(bookingsPage?.page || 1), Number(bookingsPage?.totalPages || 1));
  setPagerDisabled(bookingPrevPageButton, bookingNextPageButton, Number(bookingsPage?.page || 1), Number(bookingsPage?.totalPages || 1));

  renderTableBody(
    usersTableBody,
    userRecords.map((user) => `
      <tr>
        <td>${escapeHtml(user.name || "-")}</td>
        <td>${escapeHtml(user.email || "-")}</td>
        <td>${escapeHtml(user.role || "-")}</td>
        <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
        <td class="table-actions">
          <button class="button button-secondary action-button" data-edit-user="${escapeHtml(user.id || "")}">Edit</button>
          <button class="button button-secondary action-button" data-delete-resource="users" data-delete-id="${escapeHtml(user.id || "")}">Delete</button>
        </td>
      </tr>
    `),
    "User accounts will appear here after registration.",
    5
  );
  updatePageInfo(userPageInfo, Number(usersPage?.page || 1), Number(usersPage?.totalPages || 1));
  setPagerDisabled(userPrevPageButton, userNextPageButton, Number(usersPage?.page || 1), Number(usersPage?.totalPages || 1));

  renderTableBody(
    mechanicTableBody,
    mechanicRecords.map((mechanic) => {
      return `
        <tr>
          <td>${escapeHtml(mechanic.name || "-")}</td>
          <td>${escapeHtml(mechanic.email || "-")}</td>
          <td>${escapeHtml(mechanic.phone || "-")}</td>
          <td>${escapeHtml(mechanic.business || "-")}</td>
          <td>${escapeHtml(mechanic.verificationStatus || "-")}</td>
          <td>${escapeHtml(mechanic.verificationCallStatus || "-")}</td>
          <td>${escapeHtml(String(mechanic.assignedJobsCount || 0))}</td>
          <td class="table-actions">
            <button class="button button-secondary action-button" data-edit-mechanic="${escapeHtml(mechanic.id || "")}">Edit</button>
            <button class="button button-secondary action-button" data-delete-resource="mechanics" data-delete-id="${escapeHtml(mechanic.id || "")}">Delete</button>
          </td>
        </tr>
      `;
    }),
    "Mechanic accounts will appear here after registration.",
    8
  );
  updatePageInfo(mechanicPageInfo, Number(mechanicsPage?.page || 1), Number(mechanicsPage?.totalPages || 1));
  setPagerDisabled(mechanicPrevPageButton, mechanicNextPageButton, Number(mechanicsPage?.page || 1), Number(mechanicsPage?.totalPages || 1));
}

function fillUserEditForm(user) {
  if (!userEditForm || !user) {
    return;
  }

  userEditForm.elements.namedItem("id").value = user.id || "";
  userEditForm.elements.namedItem("name").value = user.name || "";
  userEditForm.elements.namedItem("email").value = user.email || "";
  userEditForm.elements.namedItem("role").value = user.role || "";
  if (userEditMessage) {
    userEditMessage.textContent = `Editing ${user.name || "user"}.`;
  }
}

function fillMechanicEditForm(mechanic) {
  if (!mechanicEditForm || !mechanic) {
    return;
  }

  ["id", "name", "email", "phone", "business", "experience", "location", "shopAddress", "service", "specialties"].forEach((fieldName) => {
    const field = mechanicEditForm.elements.namedItem(fieldName);
    if (field) {
      field.value = mechanic[fieldName] || "";
    }
  });

  if (mechanicEditMessage) {
    mechanicEditMessage.textContent = `Editing ${mechanic.name || "mechanic"}.`;
  }
}

function clearEditForm(form, messageElement, defaultMessage = "") {
  if (form) {
    form.reset();
    const idField = form.elements.namedItem("id");
    if (idField) {
      idField.value = "";
    }
  }

  if (messageElement) {
    messageElement.textContent = defaultMessage;
  }
}

function renderPendingMechanicQueue(listElement, records) {
  if (!listElement) {
    return;
  }

  if (!records.length) {
    listElement.innerHTML = `
      <article class="empty-state">
        <h3>No pending mechanics</h3>
        <p class="admin-note">New mechanic registrations waiting for admin review will appear here.</p>
      </article>
    `;
    return;
  }

  listElement.innerHTML = `
    <table class="data-table compact-review-table">
      <thead>
        <tr>
          <th>Request</th>
          <th>Mechanic</th>
          <th>Mobile</th>
          <th>Status</th>
          <th>Call</th>
          <th>Aadhaar</th>
          <th>Shop</th>
          <th>Review</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .slice()
          .reverse()
          .map((record) => {
            const requestLabel = record.createdAt
              ? formatDateTime(record.createdAt)
              : String(record.id || "").slice(0, 8) || "-";
            const aadhaarLink = record.aadhaarPhoto
              ? `<a class="table-link" href="${escapeHtml(record.aadhaarPhoto)}" target="_blank" rel="noopener noreferrer">View</a>`
              : `<span class="table-muted">-</span>`;
            const shopLink = record.shopPhoto
              ? `<a class="table-link" href="${escapeHtml(record.shopPhoto)}" target="_blank" rel="noopener noreferrer">View</a>`
              : `<span class="table-muted">-</span>`;
            return `
              <tr>
                <td class="truncate-cell" title="${escapeHtml(requestLabel)}">${escapeHtml(requestLabel)}</td>
                <td class="truncate-cell" title="${escapeHtml(record.name || "Unnamed mechanic")}">
                  <strong>${escapeHtml(record.name || "Unnamed mechanic")}</strong>
                </td>
                <td>${escapeHtml(record.phone || "-")}</td>
                <td>${escapeHtml(record.verificationStatus || "Pending Verification")}</td>
                <td>${escapeHtml(record.verificationCallStatus || "Call Pending")}</td>
                <td>${aadhaarLink}</td>
                <td>${shopLink}</td>
                <td>
                  <a class="table-link" href="mechanic-review.html?id=${encodeURIComponent(record.id || "")}">Details</a>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderMechanicReviewHistoryTable(listElement, records) {
  if (!listElement) {
    return;
  }

  if (!records.length) {
    listElement.innerHTML = `
      <article class="empty-state">
        <h3>No review history yet</h3>
        <p class="admin-note">Admin call notes and approval history will appear here after review begins.</p>
      </article>
    `;
    return;
  }

  listElement.innerHTML = `
    <table class="data-table compact-review-table">
      <thead>
        <tr>
          <th>Mechanic</th>
          <th>Status</th>
          <th>Call</th>
          <th>Reviewed</th>
          <th>Review</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .slice()
          .reverse()
          .map((record) => {
            const latestEntry = Array.isArray(record.verificationHistory) ? record.verificationHistory.slice(-1)[0] : null;
            const reviewLabel = latestEntry?.verificationNotes || record.verificationNotes || "-";
            return `
              <tr>
                <td class="truncate-cell" title="${escapeHtml(record.name || "Unnamed mechanic")}">
                  <strong>${escapeHtml(record.name || "Unnamed mechanic")}</strong>
                </td>
                <td>${escapeHtml(record.verificationStatus || "Pending Verification")}</td>
                <td>${escapeHtml(record.verificationCallStatus || "Call Pending")}</td>
                <td class="truncate-cell" title="${escapeHtml(formatDateTime(record.reviewedAt))}">${escapeHtml(formatDateTime(record.reviewedAt))}</td>
                <td class="truncate-cell" title="${escapeHtml(reviewLabel)}">${escapeHtml(reviewLabel)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
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
            <div class="verification-actions">
              <button class="button button-secondary action-button" data-delete-resource="bookings" data-delete-id="${escapeHtml(record.id || "")}">Delete booking</button>
            </div>
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
            <div class="verification-actions">
              <button class="button button-secondary action-button" data-delete-resource="users" data-delete-id="${escapeHtml(record.id || "")}">Delete account</button>
            </div>
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

      if (type === "mechanicJobs") {
        const acceptDisabled = record.acceptEnabled ? "" : "disabled";
        const acceptLabel = record.acceptEnabled ? "Accept job" : "Approval required";
        return `
          <article class="admin-card">
            <h3>${escapeHtml(record.name || "Unnamed request")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.service || "No service")}</span>
              <span>${escapeHtml(record.urgency || "No urgency")}</span>
              <span>${escapeHtml(record.status || "No status")}</span>
            </div>
            <p><strong>Location:</strong> ${escapeHtml(record.location || "-")}</p>
            <p><strong>Vehicle:</strong> ${escapeHtml(record.vehicle || "-")}</p>
            <p><strong>Issue:</strong> ${escapeHtml(record.issue || "-")}</p>
            <button class="button button-primary action-button" data-accept-job="${escapeHtml(record.id || "")}" ${acceptDisabled}>${acceptLabel}</button>
          </article>
        `;
      }

      if (type === "mechanicVerification") {
        const aadhaarPreview = record.aadhaarPhoto
          ? `<img class="document-preview" src="${escapeHtml(record.aadhaarPhoto)}" alt="Aadhaar card preview">`
          : `<p class="admin-note">No Aadhaar photo uploaded.</p>`;
        const shopPreview = record.shopPhoto
          ? `<img class="document-preview" src="${escapeHtml(record.shopPhoto)}" alt="Shop photo preview">`
          : `<p class="admin-note">No shop photo uploaded.</p>`;
        return `
          <article class="admin-card verification-card" data-mechanic-card="${escapeHtml(record.id || "")}">
            <h3>${escapeHtml(record.name || "Unnamed mechanic")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.verificationStatus || "Pending Verification")}</span>
              <span>${escapeHtml(record.verificationCallStatus || "Call Pending")}</span>
              <span>${escapeHtml(record.service || "No service")}</span>
            </div>
            <p><strong>Phone:</strong> ${escapeHtml(record.phone || "-")}</p>
            <p><strong>Email:</strong> ${escapeHtml(record.email || "-")}</p>
            <p><strong>Shop:</strong> ${escapeHtml(record.business || "-")}</p>
            <p><strong>Address:</strong> ${escapeHtml(record.shopAddress || "-")}</p>
            <p><strong>Notes:</strong> ${escapeHtml(record.verificationNotes || "-")}</p>
            <p><strong>Call notes:</strong> ${escapeHtml(record.verificationCallNotes || "-")}</p>
            <div class="verification-doc-grid">
              <div>
                <p class="mini-label">Aadhaar</p>
                ${aadhaarPreview}
              </div>
              <div>
                <p class="mini-label">Shop</p>
                ${shopPreview}
              </div>
            </div>
            <div class="nested-form">
              <label class="full-width">
                Review note
                <textarea data-review-notes rows="3" placeholder="Add approval or document review note">${escapeHtml(record.verificationNotes || "")}</textarea>
              </label>
              <label class="full-width">
                Call note
                <textarea data-call-notes rows="3" placeholder="Record the verification call outcome">${escapeHtml(record.verificationCallNotes || "")}</textarea>
              </label>
            </div>
            <p class="admin-note">Latest review activity:<br>${buildVerificationHistorySummary(record)}</p>
            <div class="verification-actions">
              <button class="button button-secondary action-button" data-call-status="${escapeHtml(record.id || "")}" data-value="Call Scheduled">Schedule call</button>
              <button class="button button-secondary action-button" data-call-status="${escapeHtml(record.id || "")}" data-value="Verified By Call">Verified by call</button>
              <button class="button button-secondary action-button" data-call-status="${escapeHtml(record.id || "")}" data-value="Call Failed">Call failed</button>
              <button class="button button-primary action-button" data-verify-status="${escapeHtml(record.id || "")}" data-value="Approved">Approve</button>
              <button class="button button-secondary action-button" data-verify-status="${escapeHtml(record.id || "")}" data-value="Need More Info">Need info</button>
              <button class="button button-secondary action-button" data-verify-status="${escapeHtml(record.id || "")}" data-value="Rejected">Reject</button>
              <button class="button button-secondary action-button" data-delete-resource="mechanics" data-delete-id="${escapeHtml(record.id || "")}">Delete mechanic</button>
            </div>
          </article>
        `;
      }

      if (type === "mechanicReviewHistory") {
        const latestEntry = Array.isArray(record.verificationHistory) ? record.verificationHistory.slice(-1)[0] : null;
        return `
          <article class="admin-card history-card">
            <h3>${escapeHtml(record.name || "Unnamed mechanic")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.verificationStatus || "Pending Verification")}</span>
              <span>${escapeHtml(record.verificationCallStatus || "Call Pending")}</span>
              <span>${escapeHtml(formatDateTime(record.reviewedAt))}</span>
            </div>
            <p><strong>Latest review:</strong> ${escapeHtml(latestEntry?.verificationNotes || record.verificationNotes || "-")}</p>
            <p><strong>Latest call note:</strong> ${escapeHtml(latestEntry?.verificationCallNotes || record.verificationCallNotes || "-")}</p>
            <p class="admin-note">${buildVerificationHistorySummary(record)}</p>
          </article>
        `;
      }

      if (type === "mechanicAssignments") {
        const assignedBookings = Array.isArray(record.assignedBookings) ? record.assignedBookings : [];
        const assignmentLines = assignedBookings.length
          ? assignedBookings
              .map((booking) => {
                return `
                  <div class="assignment-item">
                    <p><strong>${escapeHtml(booking.name || "Customer")}</strong> · ${escapeHtml(booking.service || "Service")}</p>
                    <p>${escapeHtml(booking.location || "-")} · ${escapeHtml(booking.status || "-")}</p>
                  </div>
                `;
              })
              .join("")
          : `<p class="admin-note">No job assigned currently.</p>`;

        return `
          <article class="admin-card assignment-card">
            <h3>${escapeHtml(record.name || "Unnamed mechanic")}</h3>
            <div class="admin-meta">
              <span>${escapeHtml(record.verificationStatus || "Pending Verification")}</span>
              <span>${escapeHtml(record.business || "No shop")}</span>
              <span>${assignedBookings.length ? `${assignedBookings.length} active` : "Available"}</span>
            </div>
            <p><strong>Phone:</strong> ${escapeHtml(record.phone || "-")}</p>
            <p><strong>Service area:</strong> ${escapeHtml(record.location || "-")}</p>
            <div class="assignment-stack">
              ${assignmentLines}
            </div>
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

function renderMechanicReviewDetail(mechanic, assignedBookings = []) {
  if (!mechanicReviewPanel) {
    return;
  }

  if (!mechanic) {
    mechanicReviewPanel.innerHTML = `
      <article class="empty-state">
        <h3>Mechanic not found</h3>
        <p>That review record is missing or no longer available.</p>
      </article>
    `;
    return;
  }

  const aadhaarPreview = mechanic.aadhaarPhoto
    ? `<img class="document-preview" src="${escapeHtml(mechanic.aadhaarPhoto)}" alt="Aadhaar card preview">`
    : `<p class="admin-note">No Aadhaar photo uploaded.</p>`;
  const shopPreview = mechanic.shopPhoto
    ? `<img class="document-preview" src="${escapeHtml(mechanic.shopPhoto)}" alt="Shop photo preview">`
    : `<p class="admin-note">No shop photo uploaded.</p>`;
  const assignedMarkup = assignedBookings.length
    ? assignedBookings
        .map((booking) => {
          return `
            <div class="assignment-item">
              <p><strong>${escapeHtml(booking.name || "Customer")}</strong> - ${escapeHtml(booking.service || "Service")}</p>
              <p>${escapeHtml(booking.location || "-")} - ${escapeHtml(booking.status || "-")}</p>
            </div>
          `;
        })
        .join("")
    : `<p class="admin-note">No assigned jobs right now.</p>`;

  mechanicReviewPanel.innerHTML = `
    <div class="review-main-card">
      <div class="review-header-card">
        <div>
          <p class="eyebrow">Mechanic record</p>
          <h2>${escapeHtml(mechanic.name || "Unnamed mechanic")}</h2>
          <div class="admin-meta">
            <span>${escapeHtml(mechanic.verificationStatus || "Pending Verification")}</span>
            <span>${escapeHtml(mechanic.verificationCallStatus || "Call Pending")}</span>
            <span>${escapeHtml(mechanic.service || "No service")}</span>
          </div>
        </div>
        <div class="review-header-actions">
          <a class="button button-secondary" href="admin.html#mechanics-board">Back to queue</a>
          <button class="button button-secondary action-button" data-delete-resource="mechanics" data-delete-id="${escapeHtml(mechanic.id || "")}">Delete mechanic</button>
        </div>
      </div>

      <div class="review-section-grid">
        <article class="admin-card review-summary-card">
          <h3>Basic details</h3>
          <div class="review-summary-list">
            <p><strong>Name:</strong> ${escapeHtml(mechanic.name || "-")}</p>
            <p><strong>Email:</strong> ${escapeHtml(mechanic.email || "-")}</p>
            <p><strong>Phone:</strong> ${escapeHtml(mechanic.phone || "-")}</p>
            <p><strong>Shop:</strong> ${escapeHtml(mechanic.business || "-")}</p>
            <p><strong>Address:</strong> ${escapeHtml(mechanic.shopAddress || "-")}</p>
            <p><strong>City / Area:</strong> ${escapeHtml(mechanic.location || "-")}</p>
            <p><strong>Specialties:</strong> ${escapeHtml(mechanic.specialties || "-")}</p>
          </div>
        </article>

        <article class="admin-card review-summary-card">
          <h3>Assigned jobs</h3>
          <div class="assignment-stack">
            ${assignedMarkup}
          </div>
        </article>
      </div>

      <div class="review-section-grid">
        <article class="admin-card review-doc-card">
          <h3>Aadhaar card</h3>
          ${aadhaarPreview}
        </article>
        <article class="admin-card review-doc-card">
          <h3>Shop photo</h3>
          ${shopPreview}
        </article>
      </div>

      <article class="admin-card review-action-card">
        <h3>Verification actions</h3>
        <div class="nested-form">
          <label class="full-width">
            Review note
            <textarea data-review-page-notes rows="4" placeholder="Add approval or document review note">${escapeHtml(mechanic.verificationNotes || "")}</textarea>
          </label>
          <label class="full-width">
            Call note
            <textarea data-review-page-call-notes rows="4" placeholder="Record the verification call outcome">${escapeHtml(mechanic.verificationCallNotes || "")}</textarea>
          </label>
        </div>
        <div class="verification-actions">
          <button class="button button-secondary action-button" data-call-status="${escapeHtml(mechanic.id || "")}" data-value="Call Scheduled">Schedule call</button>
          <button class="button button-secondary action-button" data-call-status="${escapeHtml(mechanic.id || "")}" data-value="Verified By Call">Verified by call</button>
          <button class="button button-secondary action-button" data-call-status="${escapeHtml(mechanic.id || "")}" data-value="Call Failed">Call failed</button>
          <button class="button button-primary action-button" data-verify-status="${escapeHtml(mechanic.id || "")}" data-value="Approved">Approve</button>
          <button class="button button-secondary action-button" data-verify-status="${escapeHtml(mechanic.id || "")}" data-value="Need More Info">Need info</button>
          <button class="button button-secondary action-button" data-verify-status="${escapeHtml(mechanic.id || "")}" data-value="Rejected">Reject</button>
        </div>
        <p class="admin-note">Latest review activity:<br>${buildVerificationHistorySummary(mechanic)}</p>
      </article>
    </div>
  `;
}

async function updateMechanicVerification(mechanicId, payload) {
  const response = await fetch(`/api/mechanics/${mechanicId}/verification`, {
    method: "PATCH",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Verification update failed");
  }

  return response.json();
}

async function acceptMechanicJob(bookingId, mechanicId) {
  const response = await fetch(`/api/bookings/${bookingId}/accept`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ mechanicId })
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Job accept failed");
  }

  return data;
}

async function loadMechanicReviewPage() {
  if (!mechanicReviewPanel || !adminStatus) {
    return;
  }

  const mechanicId = getReviewMechanicId();
  if (!mechanicId) {
    adminStatus.textContent = "Mechanic review link is missing an id.";
    renderMechanicReviewDetail(null);
    return;
  }

  adminStatus.textContent = "Loading mechanic review...";

  try {
    const [mechanicsResponse, bookingsResponse] = await Promise.all([
      fetch("/api/mechanics"),
      fetch("/api/bookings")
    ]);

    if (!mechanicsResponse.ok || !bookingsResponse.ok) {
      throw new Error("Review fetch failed");
    }

    const [mechanics, bookings] = await Promise.all([
      mechanicsResponse.json(),
      bookingsResponse.json()
    ]);
    const mechanicRecords = Array.isArray(mechanics) ? mechanics : [];
    const bookingRecords = Array.isArray(bookings) ? bookings : [];
    const mechanic = mechanicRecords.find((item) => String(item.id || "") === mechanicId);
    const assignedBookings = bookingRecords.filter((booking) => String(booking.assignedMechanicId || "") === mechanicId);

    renderMechanicReviewDetail(mechanic, assignedBookings);
    if (mechanicReviewTitle) {
      mechanicReviewTitle.textContent = mechanic?.name
        ? `Verification details - ${mechanic.name}`
        : "Verification details";
    }
    adminStatus.textContent = mechanic ? "Mechanic review loaded." : "Mechanic record not found.";
  } catch (error) {
    adminStatus.textContent = "Could not load mechanic review right now.";
    renderMechanicReviewDetail(null);
  }
}

async function getCurrentMechanicRecord() {
  const auth = getAuth();
  if (!auth) {
    return null;
  }

  const response = await fetch("/api/mechanics");
  if (!response.ok) {
    throw new Error("Mechanic records unavailable");
  }

  const mechanics = await response.json();
  return (Array.isArray(mechanics) ? mechanics : []).find((mechanic) => {
    return String(mechanic.email || "").trim().toLowerCase() === String(auth.email || "").trim().toLowerCase();
  }) || null;
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
      Location: ${escapeHtml(getTrackerLocationLabel(tracker))}<br>
      Coordinates: ${escapeHtml(formatCoordinate(tracker.latitude))}, ${escapeHtml(formatCoordinate(tracker.longitude))}<br>
      Updated: ${escapeHtml(tracker.updatedAt || "-")}
    `;

    const marker = trackingMarkers.get(trackerId);
    if (marker) {
      marker.setLatLng([latitude, longitude]).bindPopup(popup);
    } else {
      const nextMarker = window.L.marker([latitude, longitude]).addTo(trackingMap).bindPopup(popup);
      trackingMarkers.set(trackerId, nextMarker);
    }

    const accuracyRadius = Number(tracker.accuracy);
    const circle = trackingAccuracyCircles.get(trackerId);
    if (!Number.isNaN(accuracyRadius) && accuracyRadius > 0) {
      if (circle) {
        circle.setLatLng([latitude, longitude]);
        circle.setRadius(accuracyRadius);
      } else {
        const nextCircle = window.L.circle([latitude, longitude], {
          radius: accuracyRadius,
          color: "#ff6b2c",
          weight: 1,
          fillColor: "#ff6b2c",
          fillOpacity: 0.08
        }).addTo(trackingMap);
        trackingAccuracyCircles.set(trackerId, nextCircle);
      }
    } else if (circle) {
      trackingMap.removeLayer(circle);
      trackingAccuracyCircles.delete(trackerId);
    }
  });

  trackingMarkers.forEach((marker, trackerId) => {
    if (!activeIds.has(trackerId)) {
      trackingMap.removeLayer(marker);
      trackingMarkers.delete(trackerId);
    }
  });

  trackingAccuracyCircles.forEach((circle, trackerId) => {
    if (!activeIds.has(trackerId)) {
      trackingMap.removeLayer(circle);
      trackingAccuracyCircles.delete(trackerId);
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
    const routeCenter = [
      (userLatitude + mechanicLatitude) / 2,
      (userLongitude + mechanicLongitude) / 2
    ];
    const routeLabel = `${match.distanceKm ?? "-"} km`;

    if (routeLine) {
      routeLine.setLatLngs(routePoints);
      const routeBadge = trackingRouteBadges.get(routeId);
      if (routeBadge) {
        routeBadge.setLatLng(routeCenter);
        routeBadge.setTooltipContent(routeLabel);
      }
      return;
    }

    const nextRoute = window.L.polyline(routePoints, {
      color: "#ff6b2c",
      weight: 5,
      opacity: 0.88,
      dashArray: "12 8",
      lineCap: "round",
      lineJoin: "round",
      className: "assigned-route-line"
    }).addTo(trackingMap);

    const nextBadge = window.L.marker(routeCenter, {
      interactive: false,
      icon: window.L.divIcon({
        className: "route-badge-icon",
        html: `<span class="route-badge">${escapeHtml(routeLabel)}</span>`
      })
    })
      .addTo(trackingMap)
      .bindTooltip(routeLabel, {
        permanent: false,
        direction: "top"
      });

    trackingRoutes.set(routeId, nextRoute);
    trackingRouteBadges.set(routeId, nextBadge);
  });

  trackingRoutes.forEach((routeLine, routeId) => {
    if (!activeRouteIds.has(routeId)) {
      trackingMap.removeLayer(routeLine);
      trackingRoutes.delete(routeId);
    }
  });

  trackingRouteBadges.forEach((routeBadge, routeId) => {
    if (!activeRouteIds.has(routeId)) {
      trackingMap.removeLayer(routeBadge);
      trackingRouteBadges.delete(routeId);
    }
  });
}

function renderRoleTrackingMatch(match) {
  if (!roleTrackingTitle || !roleTrackingPrimary || !roleTrackingSecondary || !roleTrackingDescription) {
    return;
  }

  if (!match) {
    roleTrackingTitle.textContent = "Waiting for live match";
    roleTrackingPrimary.textContent = dashboardRole === "mechanic" ? "User: -" : "Mechanic: -";
    roleTrackingSecondary.textContent = "Distance: -";
    if (roleTrackingCoordinates) {
      roleTrackingCoordinates.textContent = dashboardRole === "mechanic" ? "Destination pin: -" : "User position: -";
    }
    roleTrackingDescription.textContent =
      dashboardRole === "mechanic"
        ? "Once the user enables live tracking, the destination route will appear here."
        : "Start live tracking on both user and mechanic accounts to show the route here.";
    return;
  }

  if (dashboardRole === "mechanic") {
    roleTrackingTitle.textContent = "Customer destination is live";
    roleTrackingPrimary.textContent = `User: ${match.user?.name || "-"}`;
    roleTrackingSecondary.textContent = `Distance: ${match.distanceKm ?? "-"} km`;
    if (roleTrackingCoordinates) {
      roleTrackingCoordinates.textContent =
        `Destination pin: ${formatCoordinate(match.user?.latitude)}, ${formatCoordinate(match.user?.longitude)} (${getTrackerLocationLabel(match.user)})`;
    }
    roleTrackingDescription.textContent =
      `Follow the route line on the map to reach ${match.user?.name || "the user"} at the exact shared position.`;
    return;
  }

  roleTrackingTitle.textContent = "Mechanic is on the way";
  roleTrackingPrimary.textContent = `Mechanic: ${match.mechanic?.name || "-"}`;
  roleTrackingSecondary.textContent = `Distance: ${match.distanceKm ?? "-"} km`;
  if (roleTrackingCoordinates) {
    roleTrackingCoordinates.textContent =
      `User position: ${formatCoordinate(match.user?.latitude)}, ${formatCoordinate(match.user?.longitude)} (${getTrackerLocationLabel(match.user)})`;
  }
  roleTrackingDescription.textContent =
    `The map shows the assigned mechanic route to your live location. Keep your tracking enabled for accurate directions.`;
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
  if (!adminStatus) {
    return;
  }

  adminStatus.textContent = "Refreshing dashboard...";

  try {
    const params = new URLSearchParams({
      bookingPage: String(adminTableState.bookings.page || 1),
      mechanicPage: String(adminTableState.mechanics.page || 1),
      userPage: String(adminTableState.users.page || 1),
      pageSize: String(ADMIN_PAGE_SIZE),
      bookingSearch: String(bookingSearchInput?.value || ""),
      bookingStatus: String(bookingStatusFilter?.value || ""),
      bookingSort: String(bookingSortSelect?.value || "createdAt-desc"),
      bookingFrom: String(bookingDateFrom?.value || ""),
      bookingTo: String(bookingDateTo?.value || ""),
      mechanicSearch: String(mechanicSearchInput?.value || ""),
      mechanicStatus: String(mechanicStatusFilter?.value || ""),
      mechanicSort: String(mechanicSortSelect?.value || "createdAt-desc"),
      mechanicFrom: String(mechanicDateFrom?.value || ""),
      mechanicTo: String(mechanicDateTo?.value || ""),
      userSearch: String(userSearchInput?.value || ""),
      userRole: String(userRoleFilter?.value || ""),
      userSort: String(userSortSelect?.value || "createdAt-desc"),
      userFrom: String(userDateFrom?.value || ""),
      userTo: String(userDateTo?.value || "")
    });

    const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
      headers: getAdminHeaders()
    });
    const data = await response.json().catch(() => ({ ok: false }));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Dashboard fetch failed");
    }

    adminDataset = {
      bookings: data.bookings?.records || [],
      mechanics: data.mechanics?.records || [],
      users: data.users?.records || [],
      trackers: data.summaries?.trackingRecords || [],
      pendingMechanics: data.summaries?.pendingMechanics || [],
      reviewedMechanics: data.summaries?.reviewedMechanics || [],
      mechanicAssignments: data.summaries?.mechanicAssignments || [],
      matches: data.summaries?.matches || []
    };
    adminTableState.bookings.page = Number(data.bookings?.page || 1);
    adminTableState.mechanics.page = Number(data.mechanics?.page || 1);
    adminTableState.users.page = Number(data.users?.page || 1);

    renderAdminTables(data.bookings, data.users, data.mechanics);
    renderPendingMechanicQueue(pendingMechanicsList, adminDataset.pendingMechanics);
    renderMechanicReviewHistoryTable(mechanicReviewHistoryList, adminDataset.reviewedMechanics);
    renderCards(mechanicAssignmentsList, adminDataset.mechanicAssignments, "mechanicAssignments");
    renderCards(adminTrackingList, adminDataset.trackers, "tracking");
    renderCards(adminMatchesList, adminDataset.matches, "matches");
    updateTrackingMap(adminDataset.trackers, adminDataset.matches);
    adminStatus.textContent = "Dashboard updated.";
  } catch (error) {
    handleProtectedRequestFailure(error);
    adminStatus.textContent = "Could not load admin data right now.";
  }
}

async function loadMechanicJobs() {
  if (!mechanicJobsList || !mechanicJobsStatus) {
    return;
  }

  mechanicJobsStatus.textContent = "Loading jobs...";

  try {
    const [mechanicRecord, bookingsResponse] = await Promise.all([
      getCurrentMechanicRecord(),
      fetch("/api/bookings")
    ]);

    if (!bookingsResponse.ok) {
      throw new Error("Bookings unavailable");
    }

    const bookings = await bookingsResponse.json();
    const isApproved = String(mechanicRecord?.verificationStatus || "") === "Approved";
    const openJobs = (Array.isArray(bookings) ? bookings : [])
      .filter((booking) => !String(booking.assignedMechanicId || ""))
      .map((booking) => ({
        ...booking,
        acceptEnabled: isApproved
      }));

    renderCards(mechanicJobsList, openJobs, "mechanicJobs");
    mechanicJobsStatus.textContent = isApproved
      ? "Approved mechanic. You can accept open jobs."
      : "Admin approval is required before you can accept jobs.";
  } catch (error) {
    mechanicJobsStatus.textContent = "Could not load mechanic jobs right now.";
  }
}

applyTheme(getTheme());
ensureThemeToggle();

async function requireDashboardAccess(requiredRole) {
  if (!requiredRole) {
    return;
  }

  const localAuth = getAuth();
  if (!localAuth) {
    redirectToLogin();
    return;
  }

  try {
    const auth = await loadSessionUser();
    if (requiredRole !== "auth" && auth.role !== requiredRole) {
      clearAuth();
      redirectToLogin();
      return;
    }

    if (dashboardWelcome) {
      dashboardWelcome.textContent = `${auth.name}, this is your ${requiredRole} dashboard.`;
    }
  } catch (error) {
    clearAuth();
    redirectToLogin();
    return;
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

async function loadRoleTrackingMap() {
  if (!trackingMapElement || (dashboardRole !== "user" && dashboardRole !== "mechanic")) {
    return;
  }

  const auth = getAuth();
  if (!auth) {
    return;
  }

  try {
    const [trackingResponse, matches, bookingsResponse, mechanicRecord] = await Promise.all([
      fetch("/api/tracking"),
      loadTrackingMatches(),
      fetch("/api/bookings"),
      dashboardRole === "mechanic" ? getCurrentMechanicRecord() : Promise.resolve(null)
    ]);

    if (!trackingResponse.ok || !bookingsResponse.ok) {
      throw new Error("Tracking fetch failed");
    }

    const trackers = await trackingResponse.json();
    const bookings = await bookingsResponse.json();
    const records = Array.isArray(trackers) ? trackers : [];
    const bookingList = Array.isArray(bookings) ? bookings : [];

    let match = null;
    if (dashboardRole === "mechanic" && mechanicRecord) {
      const activeBooking = getLatestAssignedBookingForMechanic(bookingList, mechanicRecord.id);
      const userTracker = records.find((tracker) => {
        return String(tracker.email || "").trim().toLowerCase() === String(activeBooking?.requesterEmail || "").trim().toLowerCase();
      });
      const mechanicTracker = records.find((tracker) => {
        return String(tracker.email || "").trim().toLowerCase() === String(auth.email || "").trim().toLowerCase();
      });

      if (activeBooking && userTracker && mechanicTracker) {
        const distanceKm = calculateApproxDistance(userTracker, mechanicTracker);
        match = {
          id: `${activeBooking.id}-${mechanicRecord.id}`,
          distanceKm,
          user: userTracker,
          mechanic: mechanicTracker
        };
      }
    }

    if (dashboardRole === "user") {
      const activeBooking = getLatestAssignedBookingForUser(bookingList, auth.email);
      const userTracker = records.find((tracker) => {
        return String(tracker.email || "").trim().toLowerCase() === String(auth.email || "").trim().toLowerCase();
      });
      const mechanicTracker = records.find((tracker) => {
        return String(tracker.email || "").trim().toLowerCase() === String(activeBooking?.assignedMechanicEmail || "").trim().toLowerCase();
      });

      if (activeBooking && userTracker && mechanicTracker) {
        const distanceKm = calculateApproxDistance(userTracker, mechanicTracker);
        match = {
          id: `${activeBooking.id}-${activeBooking.assignedMechanicId || "mechanic"}`,
          distanceKm,
          user: userTracker,
          mechanic: mechanicTracker
        };
      }
    }

    if (!match) {
      const trackerId = getTrackerId();
      match = matches.find((item) => {
        if (dashboardRole === "mechanic") {
          return String(item.mechanic?.trackerId || "") === trackerId;
        }

        return String(item.user?.trackerId || "") === trackerId;
      }) || null;
    }

    updateTrackingMap(records, match ? [match] : []);
    renderRoleTrackingMatch(match || null);
  } catch (error) {
    renderRoleTrackingMatch(null);
  }
}

function calculateApproxDistance(pointA, pointB) {
  const latitudeA = Number(pointA?.latitude);
  const longitudeA = Number(pointA?.longitude);
  const latitudeB = Number(pointB?.latitude);
  const longitudeB = Number(pointB?.longitude);

  if (
    Number.isNaN(latitudeA) ||
    Number.isNaN(longitudeA) ||
    Number.isNaN(latitudeB) ||
    Number.isNaN(longitudeB)
  ) {
    return "-";
  }

  const earthRadiusKm = 6371;
  const latDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const lonDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latA = (latitudeA * Math.PI) / 180;
  const latB = (latitudeB * Math.PI) / 180;

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return Number((2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(2));
}

function isAssignedBookingActive(booking) {
  const status = String(booking?.status || "").trim().toLowerCase();
  return Boolean(String(booking?.assignedMechanicId || "").trim()) && !["completed", "closed"].includes(status);
}

function getLatestAssignedBookingForUser(bookings, email) {
  return (Array.isArray(bookings) ? bookings : [])
    .slice()
    .reverse()
    .find((booking) => {
      return (
        String(booking.requesterEmail || "").trim().toLowerCase() === String(email || "").trim().toLowerCase() &&
        isAssignedBookingActive(booking)
      );
    }) || null;
}

function getLatestAssignedBookingForMechanic(bookings, mechanicId) {
  return (Array.isArray(bookings) ? bookings : [])
    .slice()
    .reverse()
    .find((booking) => {
      return String(booking.assignedMechanicId || "") === String(mechanicId || "") && isAssignedBookingActive(booking);
    }) || null;
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
    email: auth.email,
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

if (registerRoleSelect) {
  toggleMechanicRegisterFields();
  registerRoleSelect.addEventListener("change", toggleMechanicRegisterFields);
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

if (refreshMechanicJobsButton) {
  refreshMechanicJobsButton.addEventListener("click", loadMechanicJobs);
}

[
  bookingSearchInput,
  bookingStatusFilter,
  bookingSortSelect,
  bookingDateFrom,
  bookingDateTo,
  mechanicSearchInput,
  mechanicStatusFilter,
  mechanicSortSelect,
  mechanicDateFrom,
  mechanicDateTo,
  userSearchInput,
  userRoleFilter,
  userSortSelect,
  userDateFrom,
  userDateTo
].forEach((control) => {
  if (!control) {
    return;
  }

  const eventName = control.tagName === "SELECT" ? "change" : "input";
  control.addEventListener(eventName, () => {
    adminTableState.bookings.page = 1;
    adminTableState.mechanics.page = 1;
    adminTableState.users.page = 1;
    loadAdminData();
  });
});

if (exportBookingsButton) {
  exportBookingsButton.addEventListener("click", exportBookingsCsv);
}

if (exportUsersButton) {
  exportUsersButton.addEventListener("click", exportUsersCsv);
}

if (exportMechanicsButton) {
  exportMechanicsButton.addEventListener("click", exportMechanicsCsv);
}

[
  [bookingPrevPageButton, "bookings", -1],
  [bookingNextPageButton, "bookings", 1],
  [mechanicPrevPageButton, "mechanics", -1],
  [mechanicNextPageButton, "mechanics", 1],
  [userPrevPageButton, "users", -1],
  [userNextPageButton, "users", 1]
].forEach(([button, key, delta]) => {
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    adminTableState[key].page = Math.max(1, adminTableState[key].page + delta);
    loadAdminData();
  });
});

[
  [importBookingsButton, importBookingsInput, "bookings"],
  [importMechanicsButton, importMechanicsInput, "mechanics"],
  [importUsersButton, importUsersInput, "users"]
].forEach(([button, input, resource]) => {
  if (!button || !input) {
    return;
  }

  button.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", async () => {
    const [file] = input.files || [];
    if (!file) {
      return;
    }

    adminStatus.textContent = `Importing ${resource} CSV...`;
    try {
      const csvText = await readTextFile(file);
      const rows = parseCsv(csvText);
      await importAdminRows(resource, rows);
      adminStatus.textContent = `${resource.charAt(0).toUpperCase()}${resource.slice(1)} imported successfully.`;
      input.value = "";
      loadAdminData();
    } catch (error) {
      adminStatus.textContent = error.message || `Could not import ${resource} CSV.`;
      input.value = "";
    }
  });
});

if (clearUserEditButton) {
  clearUserEditButton.addEventListener("click", () => {
    clearEditForm(userEditForm, userEditMessage, "User form cleared.");
  });
}

if (clearMechanicEditButton) {
  clearMechanicEditButton.addEventListener("click", () => {
    clearEditForm(mechanicEditForm, mechanicEditMessage, "Mechanic form cleared.");
  });
}

if (dashboardRole) {
  requireDashboardAccess(dashboardRole);
}

if (dashboardRole === "admin" && (pendingMechanicsList || bookingsTableBody || usersTableBody || mechanicTableBody)) {
  loadAdminData();
}

if (dashboardPage === "mechanic-review") {
  loadMechanicReviewPage();
}

if (dashboardRole === "mechanic" && mechanicJobsList) {
  loadMechanicJobs();
}

if (dashboardRole === "auth" && trackingList) {
  refreshTrackingFeed();
  trackingPollId = window.setInterval(refreshTrackingFeed, 5000);
}

if ((dashboardRole === "user" || dashboardRole === "mechanic") && trackingMapElement) {
  loadRoleTrackingMap();
  trackingPollId = window.setInterval(loadRoleTrackingMap, 5000);
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
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await fetch("/api/logout", {
        method: "POST"
      });
    } catch (error) {
      // Ignore logout network errors and clear local state anyway.
    }
    clearAuth();
    redirectToLogin();
  });
});

document.addEventListener("click", async (event) => {
  const editUserButton = event.target.closest("[data-edit-user]");
  if (editUserButton) {
    const userId = editUserButton.getAttribute("data-edit-user");
    const user = adminDataset.users.find((item) => String(item.id || "") === String(userId || ""));
    if (user) {
      fillUserEditForm(user);
      userEditForm?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const editMechanicButton = event.target.closest("[data-edit-mechanic]");
  if (editMechanicButton) {
    const mechanicId = editMechanicButton.getAttribute("data-edit-mechanic");
    const mechanic = adminDataset.mechanics.find((item) => String(item.id || "") === String(mechanicId || ""));
    if (mechanic) {
      fillMechanicEditForm(mechanic);
      mechanicEditForm?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const verifyButton = event.target.closest("[data-verify-status]");
  if (verifyButton && adminStatus) {
    const mechanicId = verifyButton.getAttribute("data-verify-status");
    const verificationStatus = verifyButton.getAttribute("data-value");
    const notePayload = getVerificationNotePayload(mechanicId);

    adminStatus.textContent = "Updating mechanic verification...";
    try {
      await updateMechanicVerification(mechanicId, {
        verificationStatus,
        verificationNotes: notePayload.verificationNotes || `Updated by admin to ${verificationStatus}`,
        verificationCallNotes: notePayload.verificationCallNotes
      });
      adminStatus.textContent = `Mechanic marked as ${verificationStatus}.`;
      if (dashboardPage === "mechanic-review") {
        loadMechanicReviewPage();
      } else {
        loadAdminData();
      }
    } catch (error) {
      handleProtectedRequestFailure(error);
      adminStatus.textContent = "Could not update mechanic verification.";
    }
    return;
  }

  const callButton = event.target.closest("[data-call-status]");
  if (callButton && adminStatus) {
    const mechanicId = callButton.getAttribute("data-call-status");
    const verificationCallStatus = callButton.getAttribute("data-value");
    const notePayload = getVerificationNotePayload(mechanicId);

    adminStatus.textContent = "Saving call verification state...";
    try {
      await updateMechanicVerification(mechanicId, {
        verificationCallStatus,
        verificationNotes: notePayload.verificationNotes || `Admin call state: ${verificationCallStatus}`,
        verificationCallNotes: notePayload.verificationCallNotes || `Admin call state: ${verificationCallStatus}`
      });
      adminStatus.textContent = `Call status updated to ${verificationCallStatus}.`;
      if (dashboardPage === "mechanic-review") {
        loadMechanicReviewPage();
      } else {
        loadAdminData();
      }
    } catch (error) {
      handleProtectedRequestFailure(error);
      adminStatus.textContent = "Could not update call verification.";
    }
    return;
  }

  const acceptButton = event.target.closest("[data-accept-job]");
  if (acceptButton && mechanicJobsStatus) {
    const bookingId = acceptButton.getAttribute("data-accept-job");
    mechanicJobsStatus.textContent = "Accepting job...";
    try {
      const mechanicRecord = await getCurrentMechanicRecord();
      if (!mechanicRecord) {
        throw new Error("Mechanic profile not found");
      }

      await acceptMechanicJob(bookingId, mechanicRecord.id);
      mechanicJobsStatus.textContent = "Job accepted. Tracking and assignment are now linked.";
      loadMechanicJobs();
    } catch (error) {
      mechanicJobsStatus.textContent = error.message || "Could not accept job.";
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-resource]");
  if (deleteButton && adminStatus) {
    const resource = deleteButton.getAttribute("data-delete-resource");
    const recordId = deleteButton.getAttribute("data-delete-id");
    const labels = {
      users: "account",
      mechanics: "mechanic",
      bookings: "booking"
    };
    const label = labels[resource] || "record";

    adminStatus.textContent = `Deleting ${label}...`;
    try {
      await deleteAdminRecord(resource, recordId);
      adminStatus.textContent = `${label.charAt(0).toUpperCase()}${label.slice(1)} deleted by admin.`;
      if (dashboardPage === "mechanic-review" && resource === "mechanics") {
        window.location.replace("admin.html#mechanics-board");
      } else if (dashboardPage === "mechanic-review") {
        loadMechanicReviewPage();
      } else {
        loadAdminData();
      }
    } catch (error) {
      handleProtectedRequestFailure(error);
      adminStatus.textContent = error.message || `Could not delete ${label}.`;
    }
  }
});

window.addEventListener("pageshow", (event) => {
  if (!dashboardRole) {
    return;
  }

  if (event.persisted || !getAuth()) {
    requireDashboardAccess(dashboardRole);
  }
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

      const sessionUser = await loadSessionUser();
      setAuth(sessionUser);
      loginMessage.textContent = "Login successful. Redirecting...";
      window.setTimeout(() => {
        window.location.replace(getDashboardPath(role));
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

    const payload = await getFormPayload(registerForm);
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

      registerMessage.textContent =
        payload.role === "mechanic"
          ? "Mechanic account created. Wait for admin verification, then log in."
          : "Account created. Redirecting to login...";
      registerForm.reset();
      toggleMechanicRegisterFields();
      window.setTimeout(() => {
        window.location.replace("login.html");
      }, 700);
    } catch (error) {
      registerMessage.textContent = error.message || "Registration failed.";
    }
  });
}

if (userEditForm && userEditMessage) {
  userEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userId = String(userEditForm.elements.namedItem("id")?.value || "").trim();
    if (!userId) {
      userEditMessage.textContent = "Select a user record first.";
      return;
    }

    const payload = {
      name: String(userEditForm.elements.namedItem("name")?.value || "").trim(),
      email: String(userEditForm.elements.namedItem("email")?.value || "").trim(),
      role: String(userEditForm.elements.namedItem("role")?.value || "").trim()
    };

    userEditMessage.textContent = "Saving user changes...";
    try {
      await patchAdminRecord("users", userId, payload);
      userEditMessage.textContent = "User account updated.";
      loadAdminData();
    } catch (error) {
      userEditMessage.textContent = error.message || "Could not update user account.";
    }
  });
}

if (mechanicEditForm && mechanicEditMessage) {
  mechanicEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mechanicId = String(mechanicEditForm.elements.namedItem("id")?.value || "").trim();
    if (!mechanicId) {
      mechanicEditMessage.textContent = "Select a mechanic record first.";
      return;
    }

    const payload = {
      name: String(mechanicEditForm.elements.namedItem("name")?.value || "").trim(),
      email: String(mechanicEditForm.elements.namedItem("email")?.value || "").trim(),
      phone: String(mechanicEditForm.elements.namedItem("phone")?.value || "").trim(),
      business: String(mechanicEditForm.elements.namedItem("business")?.value || "").trim(),
      experience: String(mechanicEditForm.elements.namedItem("experience")?.value || "").trim(),
      location: String(mechanicEditForm.elements.namedItem("location")?.value || "").trim(),
      shopAddress: String(mechanicEditForm.elements.namedItem("shopAddress")?.value || "").trim(),
      service: String(mechanicEditForm.elements.namedItem("service")?.value || "").trim(),
      specialties: String(mechanicEditForm.elements.namedItem("specialties")?.value || "").trim()
    };

    mechanicEditMessage.textContent = "Saving mechanic changes...";
    try {
      await patchAdminRecord("mechanics", mechanicId, payload);
      mechanicEditMessage.textContent = "Mechanic account updated.";
      loadAdminData();
    } catch (error) {
      mechanicEditMessage.textContent = error.message || "Could not update mechanic account.";
    }
  });
}

if (forgotPasswordForm && forgotPasswordMessage) {
  forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(new FormData(forgotPasswordForm).entries());
    const nextPassword = String(payload.newPassword || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (nextPassword !== confirmPassword) {
      forgotPasswordMessage.textContent = "Passwords do not match.";
      return;
    }

    forgotPasswordMessage.textContent = "Updating password...";
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: String(payload.email || "").trim(),
          role: String(payload.role || "").trim(),
          newPassword: nextPassword
        })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      forgotPasswordMessage.textContent = "Password updated. You can log in with the new password.";
      forgotPasswordForm.reset();
    } catch (error) {
      forgotPasswordMessage.textContent = error.message || "Could not reset password.";
    }
  });
}
