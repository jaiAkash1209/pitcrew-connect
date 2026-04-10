const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 8080;
const defaultLocalDataDir = process.platform === "win32"
  ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "PitCrewConnect", "data")
  : path.join(os.homedir(), ".pitcrew-connect", "data");
const dataDir = process.env.LOCAL_DATA_DIR || defaultLocalDataDir;
const bookingsPath = path.join(dataDir, "bookings.json");
const mechanicsPath = path.join(dataDir, "mechanics.json");
const usersPath = path.join(dataDir, "users.json");
const trackingPath = path.join(dataDir, "tracking.json");
const databaseUrl = process.env.DATABASE_URL || "";
const useDatabase = Boolean(databaseUrl);
const isProduction = process.env.NODE_ENV === "production";
const passwordSaltRounds = 10;
const sessionCookieName = "pitcrew_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "pitcrew-dev-session-secret");
const pool = useDatabase
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

function ensureFile(filePath) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function readRecords(filePath) {
  ensureFile(filePath);

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeRecord(filePath, record) {
  const records = readRecords(filePath);
  records.push(record);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function writeRecords(filePath, records) {
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex < 0) {
        return cookies;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    segments.push("Secure");
  }
  segments.push(`Path=${options.path || "/"}`);
  return segments.join("; ");
}

function createSessionToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + sessionDurationMs
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !sessionSecret) {
    return null;
  }

  const [encodedPayload, signature] = String(token).split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    if (!payload?.id || !payload?.role || !payload?.email || Number(payload.exp || 0) < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function createBooking(payload) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    name: payload.name || "",
    phone: payload.phone || "",
    vehicle: payload.vehicle || "",
    service: payload.service || "",
    location: payload.location || "",
    urgency: payload.urgency || "",
    issue: payload.issue || "",
    requesterEmail: String(payload.requesterEmail || "").trim().toLowerCase(),
    status: "New",
    assignedMechanicId: "",
    assignedMechanicName: "",
    assignedMechanicEmail: "",
    acceptedAt: "",
    completedAt: ""
  };
}

function createMechanic(payload) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    name: payload.name || "",
    phone: payload.phone || "",
    email: String(payload.email || "").trim().toLowerCase(),
    business: payload.business || "",
    experience: payload.experience || "",
    location: payload.location || "",
    shopAddress: payload.shopAddress || "",
    service: payload.service || "",
    specialties: payload.specialties || "",
    aadhaarPhoto: payload.aadhaarPhoto || "",
    shopPhoto: payload.shopPhoto || "",
    verificationStatus: "Pending Verification",
    verificationCallStatus: "Call Pending",
    verificationNotes: "",
    verificationCallNotes: payload.verificationCallNotes || "",
    verificationHistory: Array.isArray(payload.verificationHistory) ? payload.verificationHistory : [],
    reviewedAt: "",
    approvedAt: ""
  };
}

function createUserAccount(payload) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    name: payload.name || "",
    email: String(payload.email || "").trim().toLowerCase(),
    password: payload.password || "",
    role: payload.role || "user"
  };
}

function isPasswordHash(value) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

function createTracker(payload) {
  return {
    trackerId: String(payload.trackerId || ""),
    role: payload.role || "",
    name: payload.name || "",
    email: String(payload.email || "").trim().toLowerCase(),
    latitude: Number(payload.latitude || 0),
    longitude: Number(payload.longitude || 0),
    accuracy: Number(payload.accuracy || 0),
    updatedAt: new Date().toISOString()
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(pointA, pointB) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(pointB.latitude - pointA.latitude);
  const lonDelta = toRadians(pointB.longitude - pointA.longitude);
  const latA = toRadians(pointA.latitude);
  const latB = toRadians(pointB.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function findRecordIndex(records, id) {
  return records.findIndex((record) => String(record.id || "") === String(id || ""));
}

function getTrackingMatchesFromRecords(trackers) {
  const validTrackers = trackers.filter((tracker) => {
    return !Number.isNaN(Number(tracker.latitude)) && !Number.isNaN(Number(tracker.longitude));
  });

  const mechanics = validTrackers.filter((tracker) => String(tracker.role || "").toLowerCase() === "mechanic");
  const users = validTrackers.filter((tracker) => String(tracker.role || "").toLowerCase() === "user");
  const assignedMechanics = new Set();

  return users
    .map((user) => {
      let bestMechanic = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      mechanics.forEach((mechanic) => {
        if (assignedMechanics.has(mechanic.trackerId)) {
          return;
        }

        const distanceKm = calculateDistanceKm(
          { latitude: Number(user.latitude), longitude: Number(user.longitude) },
          { latitude: Number(mechanic.latitude), longitude: Number(mechanic.longitude) }
        );

        if (distanceKm < bestDistance) {
          bestDistance = distanceKm;
          bestMechanic = mechanic;
        }
      });

      if (!bestMechanic) {
        return null;
      }

      assignedMechanics.add(bestMechanic.trackerId);

      return {
        id: `${user.trackerId}-${bestMechanic.trackerId}`,
        distanceKm: Number(bestDistance.toFixed(2)),
        user,
        mechanic: bestMechanic
      };
    })
    .filter(Boolean);
}

function mapUserRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at || "",
    name: row.name || "",
    email: row.email || "",
    password: row.password || "",
    role: row.role || ""
  };
}

function mapMechanicRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at || "",
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    business: row.business || "",
    experience: row.experience || "",
    location: row.location || "",
    shopAddress: row.shop_address || "",
    service: row.service || "",
    specialties: row.specialties || "",
    aadhaarPhoto: row.aadhaar_photo || "",
    shopPhoto: row.shop_photo || "",
    verificationStatus: row.verification_status || "",
    verificationCallStatus: row.verification_call_status || "",
    verificationNotes: row.verification_notes || "",
    verificationCallNotes: row.verification_call_notes || "",
    verificationHistory: parseJsonArray(row.verification_history),
    reviewedAt: row.reviewed_at || "",
    approvedAt: row.approved_at || ""
  };
}

function hasStoredDocument(value) {
  const normalized = String(value || "").trim();
  return normalized.startsWith("data:") || normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/uploads/");
}

function sanitizeMechanicRecord(record) {
  const mechanicId = String(record?.id || "").trim();
  const aadhaarValue = String(record?.aadhaarPhoto || "").trim();
  const shopValue = String(record?.shopPhoto || "").trim();

  return {
    ...record,
    aadhaarPhoto: hasStoredDocument(aadhaarValue) ? `/api/mechanics/${encodeURIComponent(mechanicId)}/documents/aadhaar` : "",
    shopPhoto: hasStoredDocument(shopValue) ? `/api/mechanics/${encodeURIComponent(mechanicId)}/documents/shop` : ""
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function stringifyJsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function createVerificationHistoryEntry(payload) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    actor: "admin",
    verificationStatus: payload.verificationStatus || "",
    verificationCallStatus: payload.verificationCallStatus || "",
    verificationNotes: payload.verificationNotes || "",
    verificationCallNotes: payload.verificationCallNotes || ""
  };
}

function mapBookingRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at || "",
    name: row.name || "",
    phone: row.phone || "",
    vehicle: row.vehicle || "",
    service: row.service || "",
    location: row.location || "",
    urgency: row.urgency || "",
    issue: row.issue || "",
    requesterEmail: row.requester_email || "",
    status: row.status || "",
    assignedMechanicId: row.assigned_mechanic_id || "",
    assignedMechanicName: row.assigned_mechanic_name || "",
    assignedMechanicEmail: row.assigned_mechanic_email || "",
    acceptedAt: row.accepted_at || "",
    completedAt: row.completed_at || ""
  };
}

function parseDocumentDataUrl(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function buildPagedResult(records, options = {}) {
  const safeRecords = Array.isArray(records) ? records : [];
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 8, 1), 50);
  const total = safeRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number(options.page) || 1, 1), totalPages);
  const startIndex = (page - 1) * pageSize;
  return {
    records: safeRecords.slice(startIndex, startIndex + pageSize),
    total,
    page,
    pageSize,
    totalPages
  };
}

function applyDateRangeFilter(records, getValue, fromDate = "", toDate = "") {
  const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
  const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : 0;
  const hasDateFilter = Boolean(fromTime || toTime);

  return records.filter((record) => {
    const recordTime = new Date(getValue(record) || "").getTime();
    if (Number.isNaN(recordTime)) {
      return !hasDateFilter;
    }
    if (fromTime && recordTime < fromTime) {
      return false;
    }
    if (toTime && recordTime > toTime) {
      return false;
    }
    return true;
  });
}

function sortRecordsByField(records, sortValue = "createdAt-desc") {
  const [field, direction] = String(sortValue || "createdAt-desc").split("-");
  const multiplier = direction === "asc" ? 1 : -1;
  return records.slice().sort((left, right) => {
    const leftValue = left?.[field];
    const rightValue = right?.[field];

    if (field === "createdAt") {
      return ((new Date(leftValue || 0).getTime() || 0) - (new Date(rightValue || 0).getTime() || 0)) * multiplier;
    }

    return String(leftValue || "").toLowerCase().localeCompare(String(rightValue || "").toLowerCase()) * multiplier;
  });
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

function mapTrackingRow(row) {
  return {
    trackerId: row.tracker_id || "",
    role: row.role || "",
    name: row.name || "",
    email: row.email || "",
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    accuracy: Number(row.accuracy || 0),
    updatedAt: row.updated_at || ""
  };
}

async function initializeDatabase() {
  if (!useDatabase) {
    if (isProduction) {
      throw new Error("DATABASE_URL is required in production");
    }

    ensureFile(bookingsPath);
    ensureFile(mechanicsPath);
    ensureFile(usersPath);
    ensureFile(trackingPath);
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mechanics (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      business TEXT NOT NULL,
      experience TEXT NOT NULL,
      location TEXT NOT NULL,
      shop_address TEXT NOT NULL,
      service TEXT NOT NULL,
      specialties TEXT NOT NULL,
      aadhaar_photo TEXT NOT NULL,
      shop_photo TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      verification_call_status TEXT NOT NULL,
      verification_notes TEXT NOT NULL,
      verification_call_notes TEXT NOT NULL DEFAULT '',
      verification_history TEXT NOT NULL DEFAULT '[]',
      reviewed_at TIMESTAMPTZ NULL,
      approved_at TIMESTAMPTZ NULL
    );
  `);

  await pool.query(`
    ALTER TABLE mechanics
    ADD COLUMN IF NOT EXISTS verification_call_notes TEXT NOT NULL DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE mechanics
    ADD COLUMN IF NOT EXISTS verification_history TEXT NOT NULL DEFAULT '[]';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle TEXT NOT NULL,
      service TEXT NOT NULL,
      location TEXT NOT NULL,
      urgency TEXT NOT NULL,
      issue TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_mechanic_id TEXT NOT NULL,
      assigned_mechanic_name TEXT NOT NULL,
      assigned_mechanic_email TEXT NOT NULL,
      accepted_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking (
      tracker_id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  const existingUsers = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (existingUsers.rows[0]?.count > 0) {
    return;
  }

  const seedUsers = [
    {
      id: "admin-1",
      createdAt: new Date().toISOString(),
      name: "Platform Admin",
      email: "admin@pitcrewconnect.com",
      password: await bcrypt.hash("Admin123!", passwordSaltRounds),
      role: "admin"
    },
    {
      id: "mechanic-1",
      createdAt: new Date().toISOString(),
      name: "Service Partner",
      email: "mechanic@pitcrewconnect.com",
      password: await bcrypt.hash("Mechanic123!", passwordSaltRounds),
      role: "mechanic"
    },
    {
      id: "user-1",
      createdAt: new Date().toISOString(),
      name: "Customer Account",
      email: "user@pitcrewconnect.com",
      password: await bcrypt.hash("User123!", passwordSaltRounds),
      role: "user"
    }
  ];

  for (const user of seedUsers) {
    await pool.query(
      "INSERT INTO users (id, created_at, name, email, password, role) VALUES ($1, $2, $3, $4, $5, $6)",
      [user.id, user.createdAt, user.name, user.email, user.password, user.role]
    );
  }

  await pool.query(
    `
      INSERT INTO mechanics (
        id, created_at, name, phone, email, business, experience, location, shop_address,
        service, specialties, aadhaar_photo, shop_photo, verification_status,
        verification_call_status, verification_notes, verification_call_notes, verification_history, reviewed_at, approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20
      )
    `,
    [
      "mechanic-profile-1",
      new Date().toISOString(),
      "Service Partner",
      "9000000000",
      "mechanic@pitcrewconnect.com",
      "PitCrew Partner Garage",
      "6 to 10 years",
      "Demo City",
      "Demo workshop address",
      "Roadside support",
      "Engine, battery, diagnostics",
      "seed-aadhaar",
      "seed-shop",
      "Approved",
      "Verified By Call",
      "Seeded demo mechanic",
      "Demo verification call completed",
      stringifyJsonArray([
        {
          id: createId(),
          createdAt: new Date().toISOString(),
          actor: "admin",
          verificationStatus: "Approved",
          verificationCallStatus: "Verified By Call",
          verificationNotes: "Seeded demo mechanic",
          verificationCallNotes: "Demo verification call completed"
        }
      ]),
      new Date().toISOString(),
      new Date().toISOString()
    ]
  );
}

async function getUsers() {
  if (!useDatabase) {
    return readRecords(usersPath).map((user) => ({
      id: user.id,
      createdAt: user.createdAt || "",
      name: user.name || "",
      email: user.email || "",
      role: user.role || ""
    }));
  }

  const result = await pool.query("SELECT id, created_at, name, email, role FROM users ORDER BY created_at ASC");
  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at || "",
    name: row.name || "",
    email: row.email || "",
    role: row.role || ""
  }));
}

async function getRawMechanicById(mechanicId) {
  const id = String(mechanicId || "").trim();
  if (!id) {
    return null;
  }

  if (!useDatabase) {
    return readRecords(mechanicsPath).find((record) => String(record.id || "") === id) || null;
  }

  const result = await pool.query("SELECT * FROM mechanics WHERE id = $1 LIMIT 1", [id]);
  if (result.rowCount === 0) {
    return null;
  }

  return mapMechanicRow(result.rows[0]);
}

async function getMechanicByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  if (!useDatabase) {
    return readRecords(mechanicsPath).find((record) => {
      return String(record.email || "").trim().toLowerCase() === normalizedEmail;
    }) || null;
  }

  const result = await pool.query("SELECT * FROM mechanics WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (result.rowCount === 0) {
    return null;
  }

  return mapMechanicRow(result.rows[0]);
}

async function findUserByCredentials(email, password, role) {
  if (!useDatabase) {
    const users = readRecords(usersPath);
    const userIndex = users.findIndex((item) => {
      return (
        String(item.email || "").trim().toLowerCase() === email &&
        String(item.role || "").trim().toLowerCase() === role
      );
    });

    if (userIndex < 0) {
      return null;
    }

    const user = users[userIndex];
    const storedPassword = String(user.password || "");
    const isValid = isPasswordHash(storedPassword)
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!isValid) {
      return null;
    }

    if (role === "mechanic") {
      const mechanic = await getMechanicByEmail(email);
      if (!mechanic || String(mechanic.verificationStatus || "") !== "Approved") {
        const error = new Error("Mechanic account is waiting for admin approval");
        error.code = "MECHANIC_NOT_APPROVED";
        throw error;
      }
    }

    if (!isPasswordHash(storedPassword)) {
      users[userIndex] = {
        ...user,
        password: await bcrypt.hash(password, passwordSaltRounds)
      };
      writeRecords(usersPath, users);
      return users[userIndex];
    }

    return user;
  }

  const result = await pool.query(
    "SELECT id, created_at, name, email, password, role FROM users WHERE email = $1 AND role = $2 LIMIT 1",
    [email, role]
  );

  if (!result.rows[0]) {
    return null;
  }

  const user = mapUserRow(result.rows[0]);
  const storedPassword = String(user.password || "");
  const isValid = isPasswordHash(storedPassword)
    ? await bcrypt.compare(password, storedPassword)
    : storedPassword === password;

  if (!isValid) {
    return null;
  }

  if (role === "mechanic") {
    const mechanic = await getMechanicByEmail(email);
    if (!mechanic || String(mechanic.verificationStatus || "") !== "Approved") {
      const error = new Error("Mechanic account is waiting for admin approval");
      error.code = "MECHANIC_NOT_APPROVED";
      throw error;
    }
  }

  if (!isPasswordHash(storedPassword)) {
    const hashedPassword = await bcrypt.hash(password, passwordSaltRounds);
    await pool.query("UPDATE users SET password = $2 WHERE id = $1", [user.id, hashedPassword]);
    return {
      ...user,
      password: hashedPassword
    };
  }

  return user;
}

async function emailExists(email) {
  if (!useDatabase) {
    return readRecords(usersPath).some((user) => String(user.email || "").trim().toLowerCase() === email);
  }

  const result = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
  return result.rowCount > 0;
}

async function registerUser(payload) {
  const hashedPassword = await bcrypt.hash(String(payload.password || ""), passwordSaltRounds);
  const user = createUserAccount({
    ...payload,
    password: hashedPassword
  });

  if (!useDatabase) {
    writeRecord(usersPath, user);
    return user;
  }

  await pool.query(
    "INSERT INTO users (id, created_at, name, email, password, role) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.id, user.createdAt, user.name, user.email, user.password, user.role]
  );

  return user;
}

async function userEmailExistsForOtherAccount(email, excludedUserId = "") {
  if (!useDatabase) {
    return readRecords(usersPath).some((user) => {
      return (
        String(user.email || "").trim().toLowerCase() === email &&
        String(user.id || "") !== String(excludedUserId || "")
      );
    });
  }

  const result = await pool.query("SELECT 1 FROM users WHERE email = $1 AND id <> $2 LIMIT 1", [email, excludedUserId]);
  return result.rowCount > 0;
}

async function mechanicEmailExistsForOtherAccount(email, excludedMechanicId = "") {
  if (!useDatabase) {
    return readRecords(mechanicsPath).some((mechanic) => {
      return (
        String(mechanic.email || "").trim().toLowerCase() === email &&
        String(mechanic.id || "") !== String(excludedMechanicId || "")
      );
    });
  }

  const result = await pool.query("SELECT 1 FROM mechanics WHERE email = $1 AND id <> $2 LIMIT 1", [email, excludedMechanicId]);
  return result.rowCount > 0;
}

async function updateUserAccount(userId, payload) {
  const nextName = String(payload.name || "").trim();
  const nextEmail = String(payload.email || "").trim().toLowerCase();

  if (!nextName || !nextEmail) {
    throw new Error("Name and email are required");
  }

  if (await userEmailExistsForOtherAccount(nextEmail, userId)) {
    throw new Error("Another account already uses this email");
  }

  if (!useDatabase) {
    const users = readRecords(usersPath);
    const userIndex = findRecordIndex(users, userId);
    if (userIndex < 0) {
      return null;
    }

    const current = users[userIndex];
    const previousEmail = String(current.email || "").trim().toLowerCase();
    const currentRole = String(current.role || "").trim().toLowerCase();
    const updated = {
      ...current,
      name: nextName,
      email: nextEmail
    };
    users[userIndex] = updated;
    writeRecords(usersPath, users);

    if (previousEmail) {
      writeRecords(
        trackingPath,
        readRecords(trackingPath).map((tracker) => {
          if (String(tracker.email || "").trim().toLowerCase() !== previousEmail) {
            return tracker;
          }

          return {
            ...tracker,
            name: nextName,
            email: nextEmail
          };
        })
      );
    }

    if (currentRole === "user") {
      writeRecords(
        bookingsPath,
        readRecords(bookingsPath).map((booking) => {
          if (String(booking.requesterEmail || "").trim().toLowerCase() !== previousEmail) {
            return booking;
          }

          return {
            ...booking,
            requesterEmail: nextEmail
          };
        })
      );
    }

    if (currentRole === "mechanic") {
      writeRecords(
        mechanicsPath,
        readRecords(mechanicsPath).map((mechanic) => {
          if (String(mechanic.email || "").trim().toLowerCase() !== previousEmail) {
            return mechanic;
          }

          return {
            ...mechanic,
            name: nextName,
            email: nextEmail
          };
        })
      );

      writeRecords(
        bookingsPath,
        readRecords(bookingsPath).map((booking) => {
          if (String(booking.assignedMechanicEmail || "").trim().toLowerCase() !== previousEmail) {
            return booking;
          }

          return {
            ...booking,
            assignedMechanicName: nextName,
            assignedMechanicEmail: nextEmail
          };
        })
      );
    }

    return {
      id: updated.id,
      createdAt: updated.createdAt || "",
      name: updated.name,
      email: updated.email,
      role: updated.role || ""
    };
  }

  const result = await pool.query("SELECT id, created_at, name, email, role FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (result.rowCount === 0) {
    return null;
  }

  const current = mapUserRow(result.rows[0]);
  const previousEmail = String(current.email || "").trim().toLowerCase();
  const currentRole = String(current.role || "").trim().toLowerCase();

  await pool.query("UPDATE users SET name = $2, email = $3 WHERE id = $1", [userId, nextName, nextEmail]);
  await pool.query("UPDATE tracking SET name = $2, email = $3 WHERE email = $1", [previousEmail, nextName, nextEmail]);

  if (currentRole === "user") {
    await pool.query("UPDATE bookings SET requester_email = $2 WHERE requester_email = $1", [previousEmail, nextEmail]);
  }

  if (currentRole === "mechanic") {
    await pool.query("UPDATE mechanics SET name = $2, email = $3 WHERE email = $1", [previousEmail, nextName, nextEmail]);
    await pool.query(
      "UPDATE bookings SET assigned_mechanic_name = $2, assigned_mechanic_email = $3 WHERE assigned_mechanic_email = $1",
      [previousEmail, nextName, nextEmail]
    );
  }

  return {
    id: current.id,
    createdAt: current.createdAt || "",
    name: nextName,
    email: nextEmail,
    role: current.role || ""
  };
}

async function getMechanics(verificationStatus = "") {
  if (!useDatabase) {
    const records = readRecords(mechanicsPath);
    if (!verificationStatus) {
      return records;
    }

    return records.filter((record) => {
      return String(record.verificationStatus || "").trim().toLowerCase() === verificationStatus;
    });
  }

  if (!verificationStatus) {
    const result = await pool.query("SELECT * FROM mechanics ORDER BY created_at ASC");
    return result.rows.map(mapMechanicRow);
  }

  const result = await pool.query(
    "SELECT * FROM mechanics WHERE LOWER(verification_status) = $1 ORDER BY created_at ASC",
    [verificationStatus]
  );
  return result.rows.map(mapMechanicRow);
}

async function updateMechanicAccount(mechanicId, payload) {
  const nextName = String(payload.name || "").trim();
  const nextEmail = String(payload.email || "").trim().toLowerCase();
  const nextPhone = String(payload.phone || "").trim();
  const nextBusiness = String(payload.business || "").trim();

  if (!nextName || !nextEmail || !nextPhone || !nextBusiness) {
    throw new Error("Name, email, phone, and shop name are required");
  }

  if (await mechanicEmailExistsForOtherAccount(nextEmail, mechanicId)) {
    throw new Error("Another mechanic already uses this email");
  }

  if (await userEmailExistsForOtherAccount(nextEmail, String(payload.linkedUserId || ""))) {
    if (!useDatabase) {
      const mechanics = readRecords(mechanicsPath);
      const existing = mechanics.find((mechanic) => String(mechanic.id || "") === String(mechanicId || ""));
      const currentEmail = String(existing?.email || "").trim().toLowerCase();
      const userConflict = readRecords(usersPath).some((user) => {
        return (
          String(user.email || "").trim().toLowerCase() === nextEmail &&
          String(user.email || "").trim().toLowerCase() !== currentEmail
        );
      });
      if (userConflict) {
        throw new Error("Another account already uses this email");
      }
    } else {
      const conflictResult = await pool.query(
        "SELECT 1 FROM users WHERE email = $1 AND email <> (SELECT email FROM mechanics WHERE id = $2 LIMIT 1) LIMIT 1",
        [nextEmail, mechanicId]
      );
      if (conflictResult.rowCount > 0) {
        throw new Error("Another account already uses this email");
      }
    }
  }

  if (!useDatabase) {
    const mechanics = readRecords(mechanicsPath);
    const mechanicIndex = findRecordIndex(mechanics, mechanicId);
    if (mechanicIndex < 0) {
      return null;
    }

    const current = mechanics[mechanicIndex];
    const previousEmail = String(current.email || "").trim().toLowerCase();
    const updated = {
      ...current,
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      business: nextBusiness,
      experience: String(payload.experience || ""),
      location: String(payload.location || ""),
      shopAddress: String(payload.shopAddress || ""),
      service: String(payload.service || ""),
      specialties: String(payload.specialties || "")
    };
    mechanics[mechanicIndex] = updated;
    writeRecords(mechanicsPath, mechanics);

    writeRecords(
      usersPath,
      readRecords(usersPath).map((user) => {
        if (String(user.email || "").trim().toLowerCase() !== previousEmail || String(user.role || "").trim().toLowerCase() !== "mechanic") {
          return user;
        }

        return {
          ...user,
          name: nextName,
          email: nextEmail
        };
      })
    );

    writeRecords(
      trackingPath,
      readRecords(trackingPath).map((tracker) => {
        if (String(tracker.email || "").trim().toLowerCase() !== previousEmail) {
          return tracker;
        }

        return {
          ...tracker,
          name: nextName,
          email: nextEmail
        };
      })
    );

    writeRecords(
      bookingsPath,
      readRecords(bookingsPath).map((booking) => {
        if (String(booking.assignedMechanicId || "") !== String(mechanicId || "")) {
          return booking;
        }

        return {
          ...booking,
          assignedMechanicName: nextName,
          assignedMechanicEmail: nextEmail
        };
      })
    );

    return updated;
  }

  const result = await pool.query("SELECT * FROM mechanics WHERE id = $1 LIMIT 1", [mechanicId]);
  if (result.rowCount === 0) {
    return null;
  }

  const current = mapMechanicRow(result.rows[0]);
  const previousEmail = String(current.email || "").trim().toLowerCase();
  const updated = {
    ...current,
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
    business: nextBusiness,
    experience: String(payload.experience || ""),
    location: String(payload.location || ""),
    shopAddress: String(payload.shopAddress || ""),
    service: String(payload.service || ""),
    specialties: String(payload.specialties || "")
  };

  await pool.query(
    `
      UPDATE mechanics
      SET
        name = $2,
        email = $3,
        phone = $4,
        business = $5,
        experience = $6,
        location = $7,
        shop_address = $8,
        service = $9,
        specialties = $10
      WHERE id = $1
    `,
    [
      mechanicId,
      updated.name,
      updated.email,
      updated.phone,
      updated.business,
      updated.experience,
      updated.location,
      updated.shopAddress,
      updated.service,
      updated.specialties
    ]
  );

  await pool.query("UPDATE users SET name = $2, email = $3 WHERE email = $1 AND role = 'mechanic'", [previousEmail, nextName, nextEmail]);
  await pool.query("UPDATE tracking SET name = $2, email = $3 WHERE email = $1", [previousEmail, nextName, nextEmail]);
  await pool.query(
    "UPDATE bookings SET assigned_mechanic_name = $2, assigned_mechanic_email = $3 WHERE assigned_mechanic_id = $1",
    [mechanicId, nextName, nextEmail]
  );

  return updated;
}

async function resetUserPassword(email, role, newPassword) {
  const nextPassword = String(newPassword || "");
  if (!nextPassword) {
    throw new Error("New password is required");
  }

  const hashedPassword = await bcrypt.hash(nextPassword, passwordSaltRounds);

  if (!useDatabase) {
    const users = readRecords(usersPath);
    const userIndex = users.findIndex((user) => {
      return (
        String(user.email || "").trim().toLowerCase() === email &&
        String(user.role || "").trim().toLowerCase() === role
      );
    });

    if (userIndex < 0) {
      return false;
    }

    users[userIndex] = {
      ...users[userIndex],
      password: hashedPassword
    };
    writeRecords(usersPath, users);
    return true;
  }

  const result = await pool.query(
    "UPDATE users SET password = $3 WHERE email = $1 AND role = $2",
    [email, role, hashedPassword]
  );

  return result.rowCount > 0;
}

async function findUserById(userId) {
  const id = String(userId || "").trim();
  if (!id) {
    return null;
  }

  if (!useDatabase) {
    const user = readRecords(usersPath).find((item) => String(item.id || "") === id);
    return user || null;
  }

  const result = await pool.query(
    "SELECT id, created_at, name, email, role FROM users WHERE id = $1 LIMIT 1",
    [id]
  );
  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    createdAt: row.created_at || "",
    name: row.name || "",
    email: row.email || "",
    role: row.role || ""
  };
}

async function upsertMechanic(payload) {
  const email = String(payload.email || "").trim().toLowerCase();

  if (!useDatabase) {
    const mechanics = readRecords(mechanicsPath);
    const existingIndex = mechanics.findIndex((mechanic) => {
      return String(mechanic.email || "").trim().toLowerCase() === email;
    });

    if (existingIndex >= 0 && email) {
      const current = mechanics[existingIndex];
      const next = createMechanic(payload);
      mechanics[existingIndex] = {
        ...current,
        ...next,
        id: current.id,
        createdAt: current.createdAt,
        aadhaarPhoto: next.aadhaarPhoto || current.aadhaarPhoto || "",
        shopPhoto: next.shopPhoto || current.shopPhoto || "",
        verificationStatus: current.verificationStatus || "Pending Verification",
        verificationCallStatus: current.verificationCallStatus || "Call Pending",
        verificationNotes: current.verificationNotes || "",
        verificationCallNotes: current.verificationCallNotes || "",
        verificationHistory: parseJsonArray(current.verificationHistory),
        reviewedAt: current.reviewedAt || "",
        approvedAt: current.approvedAt || ""
      };
      writeRecords(mechanicsPath, mechanics);
      return mechanics[existingIndex];
    }

    const mechanic = createMechanic(payload);
    writeRecord(mechanicsPath, mechanic);
    return mechanic;
  }

  const existing = await pool.query("SELECT * FROM mechanics WHERE email = $1 LIMIT 1", [email]);
  if (existing.rowCount > 0) {
    const current = mapMechanicRow(existing.rows[0]);
    const next = createMechanic(payload);
    const updated = {
      ...current,
      ...next,
      id: current.id,
      createdAt: current.createdAt,
      aadhaarPhoto: next.aadhaarPhoto || current.aadhaarPhoto || "",
      shopPhoto: next.shopPhoto || current.shopPhoto || "",
      verificationStatus: current.verificationStatus || "Pending Verification",
      verificationCallStatus: current.verificationCallStatus || "Call Pending",
      verificationNotes: current.verificationNotes || "",
      reviewedAt: current.reviewedAt || "",
      approvedAt: current.approvedAt || ""
    };

    await pool.query(
      `
        UPDATE mechanics
        SET
          name = $2,
          phone = $3,
          email = $4,
          business = $5,
          experience = $6,
          location = $7,
          shop_address = $8,
          service = $9,
          specialties = $10,
          aadhaar_photo = $11,
          shop_photo = $12,
          verification_status = $13,
          verification_call_status = $14,
          verification_notes = $15,
          verification_call_notes = $16,
          verification_history = $17,
          reviewed_at = $18,
          approved_at = $19
        WHERE id = $1
      `,
      [
        updated.id,
        updated.name,
        updated.phone,
        updated.email,
        updated.business,
        updated.experience,
        updated.location,
        updated.shopAddress,
        updated.service,
        updated.specialties,
        updated.aadhaarPhoto,
        updated.shopPhoto,
        updated.verificationStatus,
        updated.verificationCallStatus,
        updated.verificationNotes,
        updated.verificationCallNotes,
        stringifyJsonArray(updated.verificationHistory),
        updated.reviewedAt || null,
        updated.approvedAt || null
      ]
    );

    return updated;
  }

  const mechanic = createMechanic(payload);
  await pool.query(
    `
      INSERT INTO mechanics (
        id, created_at, name, phone, email, business, experience, location, shop_address,
        service, specialties, aadhaar_photo, shop_photo, verification_status,
        verification_call_status, verification_notes, verification_call_notes, verification_history, reviewed_at, approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20
      )
    `,
    [
      mechanic.id,
      mechanic.createdAt,
      mechanic.name,
      mechanic.phone,
      mechanic.email,
      mechanic.business,
      mechanic.experience,
      mechanic.location,
      mechanic.shopAddress,
      mechanic.service,
      mechanic.specialties,
      mechanic.aadhaarPhoto,
      mechanic.shopPhoto,
      mechanic.verificationStatus,
      mechanic.verificationCallStatus,
      mechanic.verificationNotes,
      mechanic.verificationCallNotes,
      stringifyJsonArray(mechanic.verificationHistory),
      mechanic.reviewedAt || null,
      mechanic.approvedAt || null
    ]
  );
  return mechanic;
}

async function updateMechanicVerification(mechanicId, payload) {
  const verificationStatus = String(payload.verificationStatus || "").trim();
  const verificationCallStatus = String(payload.verificationCallStatus || "").trim();
  const verificationNotes = String(payload.verificationNotes || "").trim();
  const verificationCallNotes = String(payload.verificationCallNotes || "").trim();
  const allowedStatuses = ["Pending Verification", "Approved", "Rejected", "Need More Info"];
  const allowedCallStatuses = ["Call Pending", "Call Scheduled", "Verified By Call", "Call Failed"];

  if (verificationStatus && !allowedStatuses.includes(verificationStatus)) {
    throw new Error("Invalid verification status");
  }

  if (verificationCallStatus && !allowedCallStatuses.includes(verificationCallStatus)) {
    throw new Error("Invalid call status");
  }

  if (!useDatabase) {
    const mechanics = readRecords(mechanicsPath);
    const mechanicIndex = findRecordIndex(mechanics, mechanicId);
    if (mechanicIndex < 0) {
      return null;
    }

    const current = mechanics[mechanicIndex];
    const nextStatus = verificationStatus || current.verificationStatus || "Pending Verification";
    mechanics[mechanicIndex] = {
      ...current,
      verificationStatus: nextStatus,
      verificationCallStatus: verificationCallStatus || current.verificationCallStatus || "Call Pending",
      verificationNotes: verificationNotes || current.verificationNotes || "",
      verificationCallNotes: verificationCallNotes || current.verificationCallNotes || "",
      verificationHistory: [
        ...parseJsonArray(current.verificationHistory),
        createVerificationHistoryEntry({
          verificationStatus: verificationStatus || nextStatus,
          verificationCallStatus: verificationCallStatus || current.verificationCallStatus || "",
          verificationNotes: verificationNotes || current.verificationNotes || "",
          verificationCallNotes: verificationCallNotes || current.verificationCallNotes || ""
        })
      ],
      reviewedAt: new Date().toISOString(),
      approvedAt: nextStatus === "Approved" ? new Date().toISOString() : current.approvedAt || ""
    };
    writeRecords(mechanicsPath, mechanics);
    return mechanics[mechanicIndex];
  }

  const result = await pool.query("SELECT * FROM mechanics WHERE id = $1 LIMIT 1", [mechanicId]);
  if (result.rowCount === 0) {
    return null;
  }

  const current = mapMechanicRow(result.rows[0]);
  const nextStatus = verificationStatus || current.verificationStatus || "Pending Verification";
  const updated = {
    ...current,
    verificationStatus: nextStatus,
    verificationCallStatus: verificationCallStatus || current.verificationCallStatus || "Call Pending",
    verificationNotes: verificationNotes || current.verificationNotes || "",
    verificationCallNotes: verificationCallNotes || current.verificationCallNotes || "",
    verificationHistory: [
      ...parseJsonArray(current.verificationHistory),
      createVerificationHistoryEntry({
        verificationStatus: verificationStatus || nextStatus,
        verificationCallStatus: verificationCallStatus || current.verificationCallStatus || "",
        verificationNotes: verificationNotes || current.verificationNotes || "",
        verificationCallNotes: verificationCallNotes || current.verificationCallNotes || ""
      })
    ],
    reviewedAt: new Date().toISOString(),
    approvedAt: nextStatus === "Approved" ? new Date().toISOString() : current.approvedAt || ""
  };

  await pool.query(
    `
      UPDATE mechanics
      SET
        verification_status = $2,
        verification_call_status = $3,
        verification_notes = $4,
        verification_call_notes = $5,
        verification_history = $6,
        reviewed_at = $7,
        approved_at = $8
      WHERE id = $1
    `,
    [
      updated.id,
      updated.verificationStatus,
      updated.verificationCallStatus,
      updated.verificationNotes,
      updated.verificationCallNotes,
      stringifyJsonArray(updated.verificationHistory),
      updated.reviewedAt || null,
      updated.approvedAt || null
    ]
  );

  return updated;
}

async function getBookings(status = "") {
  if (!useDatabase) {
    const records = readRecords(bookingsPath);
    if (!status) {
      return records;
    }

    return records.filter((record) => String(record.status || "").trim().toLowerCase() === status);
  }

  if (!status) {
    const result = await pool.query("SELECT * FROM bookings ORDER BY created_at ASC");
    return result.rows.map(mapBookingRow);
  }

  const result = await pool.query("SELECT * FROM bookings WHERE LOWER(status) = $1 ORDER BY created_at ASC", [status]);
  return result.rows.map(mapBookingRow);
}

async function createBookingRecord(payload) {
  const booking = createBooking(payload);

  if (!useDatabase) {
    writeRecord(bookingsPath, booking);
    return booking;
  }

  await pool.query(
    `
      INSERT INTO bookings (
        id, created_at, name, phone, vehicle, service, location, urgency, issue,
        requester_email, status, assigned_mechanic_id, assigned_mechanic_name,
        assigned_mechanic_email, accepted_at, completed_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16
      )
    `,
    [
      booking.id,
      booking.createdAt,
      booking.name,
      booking.phone,
      booking.vehicle,
      booking.service,
      booking.location,
      booking.urgency,
      booking.issue,
      booking.requesterEmail,
      booking.status,
      booking.assignedMechanicId,
      booking.assignedMechanicName,
      booking.assignedMechanicEmail,
      booking.acceptedAt || null,
      booking.completedAt || null
    ]
  );

  return booking;
}

async function acceptBooking(bookingId, mechanicId) {
  if (!useDatabase) {
    const bookings = readRecords(bookingsPath);
    const mechanics = readRecords(mechanicsPath);
    const bookingIndex = findRecordIndex(bookings, bookingId);
    const mechanicIndex = findRecordIndex(mechanics, mechanicId);

    if (bookingIndex < 0 || mechanicIndex < 0) {
      return null;
    }

    const booking = bookings[bookingIndex];
    const mechanic = mechanics[mechanicIndex];
    if (String(mechanic.verificationStatus || "") !== "Approved") {
      throw new Error("Only approved mechanics can accept jobs");
    }

    if (String(booking.assignedMechanicId || "")) {
      throw new Error("This job has already been assigned");
    }

    bookings[bookingIndex] = {
      ...booking,
      status: "Accepted",
      assignedMechanicId: mechanic.id,
      assignedMechanicName: mechanic.name || mechanic.business || "Assigned mechanic",
      assignedMechanicEmail: mechanic.email || "",
      acceptedAt: new Date().toISOString()
    };
    writeRecords(bookingsPath, bookings);
    return bookings[bookingIndex];
  }

  const bookingResult = await pool.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
  const mechanicResult = await pool.query("SELECT * FROM mechanics WHERE id = $1 LIMIT 1", [mechanicId]);

  if (bookingResult.rowCount === 0 || mechanicResult.rowCount === 0) {
    return null;
  }

  const booking = mapBookingRow(bookingResult.rows[0]);
  const mechanic = mapMechanicRow(mechanicResult.rows[0]);

  if (String(mechanic.verificationStatus || "") !== "Approved") {
    throw new Error("Only approved mechanics can accept jobs");
  }

  if (String(booking.assignedMechanicId || "")) {
    throw new Error("This job has already been assigned");
  }

  const acceptedAt = new Date().toISOString();
  await pool.query(
    `
      UPDATE bookings
      SET
        status = $2,
        assigned_mechanic_id = $3,
        assigned_mechanic_name = $4,
        assigned_mechanic_email = $5,
        accepted_at = $6
      WHERE id = $1
    `,
    [bookingId, "Accepted", mechanic.id, mechanic.name || mechanic.business || "Assigned mechanic", mechanic.email || "", acceptedAt]
  );

  return {
    ...booking,
    status: "Accepted",
    assignedMechanicId: mechanic.id,
    assignedMechanicName: mechanic.name || mechanic.business || "Assigned mechanic",
    assignedMechanicEmail: mechanic.email || "",
    acceptedAt
  };
}

async function getTracking() {
  if (!useDatabase) {
    return readRecords(trackingPath);
  }

  const result = await pool.query("SELECT * FROM tracking ORDER BY updated_at ASC");
  return result.rows.map(mapTrackingRow);
}

async function upsertTracking(payload) {
  const tracker = createTracker(payload);

  if (!useDatabase) {
    const trackers = readRecords(trackingPath);
    const index = trackers.findIndex((item) => String(item.trackerId || "") === tracker.trackerId);

    if (index >= 0) {
      trackers[index] = tracker;
    } else {
      trackers.push(tracker);
    }

    writeRecords(trackingPath, trackers);
    return tracker;
  }

  await pool.query(
    `
      INSERT INTO tracking (tracker_id, role, name, email, latitude, longitude, accuracy, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tracker_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        updated_at = EXCLUDED.updated_at
    `,
    [
      tracker.trackerId,
      tracker.role,
      tracker.name,
      tracker.email,
      tracker.latitude,
      tracker.longitude,
      tracker.accuracy,
      tracker.updatedAt
    ]
  );

  return tracker;
}

async function getTrackingMatches() {
  return getTrackingMatchesFromRecords(await getTracking());
}

function mapCsvRow(row) {
  return Object.entries(row || {}).reduce((record, [key, value]) => {
    record[String(key || "").trim().toLowerCase()] = String(value ?? "").trim();
    return record;
  }, {});
}

async function importBookingsFromRows(rows) {
  const records = Array.isArray(rows) ? rows : [];

  if (!useDatabase) {
    const bookings = readRecords(bookingsPath);
    records.forEach((row) => {
      const csv = mapCsvRow(row);
      const id = csv.id || createId();
      const bookingIndex = bookings.findIndex((booking) => String(booking.id || "") === id);
      const nextRecord = {
        id,
        createdAt: csv.created || new Date().toISOString(),
        name: csv.customer || "",
        phone: csv.phone || "",
        vehicle: csv.vehicle || "",
        service: csv.service || "",
        location: csv.location || "",
        urgency: csv.urgency || "",
        issue: csv.issue || "",
        requesterEmail: String(csv["requester email"] || "").toLowerCase(),
        status: csv.status || "New",
        assignedMechanicId: csv["assigned mechanic id"] || "",
        assignedMechanicName: csv["assigned mechanic"] || "",
        assignedMechanicEmail: String(csv["assigned mechanic email"] || "").toLowerCase(),
        acceptedAt: csv["accepted at"] || "",
        completedAt: csv["completed at"] || ""
      };

      if (bookingIndex >= 0) {
        bookings[bookingIndex] = { ...bookings[bookingIndex], ...nextRecord };
      } else {
        bookings.push(nextRecord);
      }
    });
    writeRecords(bookingsPath, bookings);
    return records.length;
  }

  for (const row of records) {
    const csv = mapCsvRow(row);
    const id = csv.id || createId();
    const existing = await pool.query("SELECT 1 FROM bookings WHERE id = $1 LIMIT 1", [id]);
    if (existing.rowCount > 0) {
      await pool.query(
        `
          UPDATE bookings
          SET
            name = $2,
            phone = $3,
            vehicle = $4,
            service = $5,
            location = $6,
            urgency = $7,
            issue = $8,
            requester_email = $9,
            status = $10,
            assigned_mechanic_id = $11,
            assigned_mechanic_name = $12,
            assigned_mechanic_email = $13,
            accepted_at = $14,
            completed_at = $15
          WHERE id = $1
        `,
        [
          id,
          csv.customer || "",
          csv.phone || "",
          csv.vehicle || "",
          csv.service || "",
          csv.location || "",
          csv.urgency || "",
          csv.issue || "",
          String(csv["requester email"] || "").toLowerCase(),
          csv.status || "New",
          csv["assigned mechanic id"] || "",
          csv["assigned mechanic"] || "",
          String(csv["assigned mechanic email"] || "").toLowerCase(),
          csv["accepted at"] || null,
          csv["completed at"] || null
        ]
      );
    } else {
      await pool.query(
        `
          INSERT INTO bookings (
            id, created_at, name, phone, vehicle, service, location, urgency, issue,
            requester_email, status, assigned_mechanic_id, assigned_mechanic_name,
            assigned_mechanic_email, accepted_at, completed_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16
          )
        `,
        [
          id,
          csv.created || new Date().toISOString(),
          csv.customer || "",
          csv.phone || "",
          csv.vehicle || "",
          csv.service || "",
          csv.location || "",
          csv.urgency || "",
          csv.issue || "",
          String(csv["requester email"] || "").toLowerCase(),
          csv.status || "New",
          csv["assigned mechanic id"] || "",
          csv["assigned mechanic"] || "",
          String(csv["assigned mechanic email"] || "").toLowerCase(),
          csv["accepted at"] || null,
          csv["completed at"] || null
        ]
      );
    }
  }

  return records.length;
}

async function importUsersFromRows(rows) {
  const records = Array.isArray(rows) ? rows : [];

  if (!useDatabase) {
    const users = readRecords(usersPath);
    for (const row of records) {
      const csv = mapCsvRow(row);
      const id = csv.id || createId();
      const email = String(csv.email || "").toLowerCase();
      if (!csv.name || !email || !csv.role) {
        continue;
      }

      const userIndex = users.findIndex((user) => String(user.id || "") === id || String(user.email || "").toLowerCase() === email);
      if (userIndex >= 0) {
        const current = users[userIndex];
        users[userIndex] = {
          ...current,
          name: csv.name,
          email,
          role: csv.role || current.role,
          password: csv.password ? await bcrypt.hash(csv.password, passwordSaltRounds) : current.password
        };
      } else if (csv.password) {
        const nextRecord = {
          id,
          createdAt: csv.created || new Date().toISOString(),
          name: csv.name,
          email,
          role: csv.role,
          password: await bcrypt.hash(csv.password, passwordSaltRounds)
        };
        users.push(nextRecord);
      }
    }
    writeRecords(usersPath, users);
    return records.length;
  }

  for (const row of records) {
    const csv = mapCsvRow(row);
    const id = csv.id || createId();
    const email = String(csv.email || "").toLowerCase();
    if (!csv.name || !email || !csv.role) {
      continue;
    }

    const existing = await pool.query("SELECT id, password FROM users WHERE id = $1 OR email = $2 LIMIT 1", [id, email]);
    if (existing.rowCount > 0) {
      const current = existing.rows[0];
      await updateUserAccount(current.id, {
        name: csv.name,
        email
      });
      const passwordValue = csv.password ? await bcrypt.hash(csv.password, passwordSaltRounds) : current.password;
      await pool.query(
        `
          UPDATE users
          SET
            role = $2,
            password = $3
          WHERE id = $1
        `,
        [current.id, csv.role, passwordValue]
      );
    } else if (csv.password) {
      await pool.query(
        "INSERT INTO users (id, created_at, name, email, password, role) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, csv.created || new Date().toISOString(), csv.name, email, await bcrypt.hash(csv.password, passwordSaltRounds), csv.role]
      );
    }
  }

  return records.length;
}

async function importMechanicsFromRows(rows) {
  const records = Array.isArray(rows) ? rows : [];

  if (!useDatabase) {
    const mechanics = readRecords(mechanicsPath);
    for (const row of records) {
      const csv = mapCsvRow(row);
      const id = csv.id || createId();
      const email = String(csv.email || "").toLowerCase();
      if (!csv.name || !email) {
        continue;
      }

      const mechanicIndex = mechanics.findIndex((mechanic) => String(mechanic.id || "") === id || String(mechanic.email || "").toLowerCase() === email);
      const nextRecord = {
        id,
        createdAt: csv.created || new Date().toISOString(),
        name: csv.name,
        email,
        phone: csv.phone || "",
        business: csv.shop || "",
        experience: csv.experience || "",
        location: csv.location || "",
        shopAddress: csv["shop address"] || "",
        service: csv.service || "",
        specialties: csv.specialties || "",
        verificationStatus: csv.verification || "Pending Verification",
        verificationCallStatus: csv["call status"] || "Call Pending",
        verificationNotes: csv["review notes"] || "",
        verificationCallNotes: csv["call notes"] || ""
      };

      if (mechanicIndex >= 0) {
        mechanics[mechanicIndex] = { ...mechanics[mechanicIndex], ...nextRecord };
      } else {
        mechanics.push({
          ...createMechanic(nextRecord),
          ...nextRecord
        });
      }
    }
    writeRecords(mechanicsPath, mechanics);
    return records.length;
  }

  for (const row of records) {
    const csv = mapCsvRow(row);
    const id = csv.id || createId();
    const email = String(csv.email || "").toLowerCase();
    if (!csv.name || !email) {
      continue;
    }

    const existing = await pool.query("SELECT id FROM mechanics WHERE id = $1 OR email = $2 LIMIT 1", [id, email]);
    if (existing.rowCount > 0) {
      await updateMechanicAccount(existing.rows[0].id, {
        name: csv.name,
        email,
        phone: csv.phone || "",
        business: csv.shop || "",
        experience: csv.experience || "",
        location: csv.location || "",
        shopAddress: csv["shop address"] || "",
        service: csv.service || "",
        specialties: csv.specialties || ""
      });
      await pool.query(
        `
          UPDATE mechanics
          SET
            verification_status = $2,
            verification_call_status = $3,
            verification_notes = $4,
            verification_call_notes = $5
          WHERE id = $1
        `,
        [
          existing.rows[0].id,
          csv.verification || "Pending Verification",
          csv["call status"] || "Call Pending",
          csv["review notes"] || "",
          csv["call notes"] || ""
        ]
      );
    } else {
      await pool.query(
        `
          INSERT INTO mechanics (
            id, created_at, name, phone, email, business, experience, location, shop_address,
            service, specialties, aadhaar_photo, shop_photo, verification_status,
            verification_call_status, verification_notes, verification_call_notes, verification_history, reviewed_at, approved_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
        `,
        [
          id,
          csv.created || new Date().toISOString(),
          csv.name,
          csv.phone || "",
          email,
          csv.shop || "",
          csv.experience || "",
          csv.location || "",
          csv["shop address"] || "",
          csv.service || "",
          csv.specialties || "",
          "",
          "",
          csv.verification || "Pending Verification",
          csv["call status"] || "Call Pending",
          csv["review notes"] || "",
          csv["call notes"] || "",
          "[]",
          null,
          null
        ]
      );
    }
  }

  return records.length;
}

function setSessionCookie(res, user) {
  const token = createSessionToken(user);
  res.setHeader(
    "Set-Cookie",
    serializeCookie(sessionCookieName, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProduction,
      path: "/",
      maxAge: Math.floor(sessionDurationMs / 1000)
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(sessionCookieName, "", {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProduction,
      path: "/",
      maxAge: 0
    })
  );
}

function requireAuthenticatedUser(req, res) {
  if (!req.authUser) {
    res.status(401).json({ ok: false, error: "Authentication required" });
    return false;
  }

  return true;
}

function requireAdminRole(req, res) {
  if (!requireAuthenticatedUser(req, res)) {
    return false;
  }

  const role = String(req.authUser?.role || "").trim().toLowerCase();
  if (role !== "admin") {
    res.status(403).json({ ok: false, error: "Admin access required" });
    return false;
  }

  return true;
}

async function deleteBookingRecord(bookingId) {
  if (!useDatabase) {
    const bookings = readRecords(bookingsPath);
    const nextBookings = bookings.filter((booking) => String(booking.id || "") !== String(bookingId || ""));
    const deleted = nextBookings.length !== bookings.length;
    if (deleted) {
      writeRecords(bookingsPath, nextBookings);
    }
    return deleted;
  }

  const result = await pool.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
  return result.rowCount > 0;
}

async function deleteMechanicRecord(mechanicId) {
  if (!useDatabase) {
    const mechanics = readRecords(mechanicsPath);
    const mechanic = mechanics.find((item) => String(item.id || "") === String(mechanicId || ""));
    if (!mechanic) {
      return false;
    }

    writeRecords(
      mechanicsPath,
      mechanics.filter((item) => String(item.id || "") !== String(mechanicId || ""))
    );

    const mechanicEmail = String(mechanic.email || "").trim().toLowerCase();
    if (mechanicEmail) {
      writeRecords(
        usersPath,
        readRecords(usersPath).filter((user) => String(user.email || "").trim().toLowerCase() !== mechanicEmail)
      );
      writeRecords(
        trackingPath,
        readRecords(trackingPath).filter((tracker) => String(tracker.email || "").trim().toLowerCase() !== mechanicEmail)
      );
    }

    const resetBookings = readRecords(bookingsPath).map((booking) => {
      if (String(booking.assignedMechanicId || "") !== String(mechanicId || "")) {
        return booking;
      }

      return {
        ...booking,
        status: "New",
        assignedMechanicId: "",
        assignedMechanicName: "",
        assignedMechanicEmail: "",
        acceptedAt: ""
      };
    });
    writeRecords(bookingsPath, resetBookings);
    return true;
  }

  const mechanicResult = await pool.query("SELECT id, email FROM mechanics WHERE id = $1 LIMIT 1", [mechanicId]);
  if (mechanicResult.rowCount === 0) {
    return false;
  }

  const mechanicEmail = String(mechanicResult.rows[0].email || "").trim().toLowerCase();
  await pool.query("DELETE FROM mechanics WHERE id = $1", [mechanicId]);

  await pool.query(
    `
      UPDATE bookings
      SET
        status = 'New',
        assigned_mechanic_id = '',
        assigned_mechanic_name = '',
        assigned_mechanic_email = '',
        accepted_at = NULL
      WHERE assigned_mechanic_id = $1
    `,
    [mechanicId]
  );

  if (mechanicEmail) {
    await pool.query("DELETE FROM users WHERE email = $1", [mechanicEmail]);
    await pool.query("DELETE FROM tracking WHERE email = $1", [mechanicEmail]);
  }

  return true;
}

async function deleteUserAccount(userId) {
  if (!useDatabase) {
    const users = readRecords(usersPath);
    const user = users.find((item) => String(item.id || "") === String(userId || ""));
    if (!user) {
      return false;
    }

    const email = String(user.email || "").trim().toLowerCase();
    const role = String(user.role || "").trim().toLowerCase();
    writeRecords(
      usersPath,
      users.filter((item) => String(item.id || "") !== String(userId || ""))
    );

    if (email) {
      writeRecords(
        trackingPath,
        readRecords(trackingPath).filter((tracker) => String(tracker.email || "").trim().toLowerCase() !== email)
      );
      writeRecords(
        bookingsPath,
        readRecords(bookingsPath).filter((booking) => String(booking.requesterEmail || "").trim().toLowerCase() !== email)
      );
    }

    if (role === "mechanic") {
      const mechanics = readRecords(mechanicsPath);
      const mechanic = mechanics.find((item) => String(item.email || "").trim().toLowerCase() === email);
      if (mechanic) {
        writeRecords(
          mechanicsPath,
          mechanics.filter((item) => String(item.email || "").trim().toLowerCase() !== email)
        );
        writeRecords(
          bookingsPath,
          readRecords(bookingsPath).map((booking) => {
            if (String(booking.assignedMechanicId || "") !== String(mechanic.id || "")) {
              return booking;
            }

            return {
              ...booking,
              status: "New",
              assignedMechanicId: "",
              assignedMechanicName: "",
              assignedMechanicEmail: "",
              acceptedAt: ""
            };
          })
        );
      }
    }

    return true;
  }

  const userResult = await pool.query("SELECT id, email, role FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (userResult.rowCount === 0) {
    return false;
  }

  const email = String(userResult.rows[0].email || "").trim().toLowerCase();
  const role = String(userResult.rows[0].role || "").trim().toLowerCase();

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);

  if (email) {
    await pool.query("DELETE FROM tracking WHERE email = $1", [email]);
    await pool.query("DELETE FROM bookings WHERE requester_email = $1", [email]);
  }

  if (role === "mechanic" && email) {
    const mechanicResult = await pool.query("SELECT id FROM mechanics WHERE email = $1 LIMIT 1", [email]);
    if (mechanicResult.rowCount > 0) {
      const mechanicId = mechanicResult.rows[0].id;
      await pool.query("DELETE FROM mechanics WHERE email = $1", [email]);
      await pool.query(
        `
          UPDATE bookings
          SET
            status = 'New',
            assigned_mechanic_id = '',
            assigned_mechanic_name = '',
            assigned_mechanic_email = '',
            accepted_at = NULL
          WHERE assigned_mechanic_id = $1
        `,
        [mechanicId]
      );
    }
  }

  return true;
}

if (isProduction && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production");
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self)");
  next();
});

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const session = verifySessionToken(cookies[sessionCookieName]);
  req.authUser = session || null;
  next();
});

app.use(express.json({ limit: "4mb" }));
app.use(express.static(__dirname, {
  maxAge: isProduction ? "1d" : 0
}));

app.post("/api/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "").trim().toLowerCase();

  try {
    const user = await findUserByCredentials(email, password, role);

    if (!user) {
      res.status(401).json({ ok: false, error: "Invalid login details" });
      return;
    }

    setSessionCookie(res, user);
    res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.code === "MECHANIC_NOT_APPROVED") {
      res.status(403).json({ ok: false, error: error.message });
      return;
    }
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

app.get("/api/session", async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ ok: false, error: "Not authenticated" });
    return;
  }

  const freshUser = await findUserById(req.authUser.id);
  if (!freshUser || String(freshUser.role || "").trim().toLowerCase() !== String(req.authUser.role || "").trim().toLowerCase()) {
    clearSessionCookie(res);
    res.status(401).json({ ok: false, error: "Session expired" });
    return;
  }

  if (String(freshUser.role || "").trim().toLowerCase() === "mechanic") {
    const mechanic = await getMechanicByEmail(freshUser.email);
    if (!mechanic || String(mechanic.verificationStatus || "") !== "Approved") {
      clearSessionCookie(res);
      res.status(403).json({ ok: false, error: "Mechanic account is waiting for admin approval" });
      return;
    }
  }

  setSessionCookie(res, freshUser);
  res.json({
    ok: true,
    user: { id: freshUser.id, name: freshUser.name, email: freshUser.email, role: freshUser.role }
  });
});

app.post("/api/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/password/reset", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = String(req.body?.role || "").trim().toLowerCase();
  const newPassword = String(req.body?.newPassword || "");

  if (!email || !role || !newPassword) {
    res.status(400).json({ ok: false, error: "Email, role, and new password are required" });
    return;
  }

  if (!["user", "mechanic", "admin"].includes(role)) {
    res.status(400).json({ ok: false, error: "Invalid account role" });
    return;
  }

  try {
    const updated = await resetUserPassword(email, role, newPassword);
    if (!updated) {
      res.status(404).json({ ok: false, error: "Account not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Password reset failed" });
  }
});

app.get("/api/users", async (_req, res) => {
  if (!requireAdminRole(_req, res)) {
    return;
  }

  try {
    res.json(await getUsers());
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/api/users/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "user").trim().toLowerCase();

  if (!name || !email || !password) {
    res.status(400).json({ ok: false, error: "Name, email, and password are required" });
    return;
  }

  if (!["user", "mechanic"].includes(role)) {
    res.status(400).json({ ok: false, error: "Invalid registration role" });
    return;
  }

  try {
    if (await emailExists(email)) {
      res.status(409).json({ ok: false, error: "An account with this email already exists" });
      return;
    }

    if (role === "mechanic") {
      const phone = String(req.body?.phone || "").trim();
      const business = String(req.body?.business || "").trim();
      const shopAddress = String(req.body?.shopAddress || "").trim();
      const aadhaarPhoto = String(req.body?.aadhaarPhoto || "");
      const shopPhoto = String(req.body?.shopPhoto || "");

      if (!phone || !business || !shopAddress || !aadhaarPhoto || !shopPhoto) {
        res.status(400).json({
          ok: false,
          error: "Mechanic registration requires phone, business, shop address, Aadhaar photo, and shop photo"
        });
        return;
      }

      await upsertMechanic({
        name,
        email,
        phone,
        business,
        shopAddress,
        aadhaarPhoto,
        shopPhoto,
        experience: String(req.body?.experience || ""),
        location: String(req.body?.location || ""),
        service: String(req.body?.service || ""),
        specialties: String(req.body?.specialties || "")
      });
    }

    const user = await registerUser({ name, email, password, role });
    res.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Registration failed" });
  }
});

app.get("/api/tracking", async (_req, res) => {
  try {
    res.json(await getTracking());
  } catch (error) {
    res.status(500).json([]);
  }
});

app.get("/api/tracking/matches", async (_req, res) => {
  try {
    res.json(await getTrackingMatches());
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/api/tracking/update", async (req, res) => {
  const trackerId = String(req.body?.trackerId || "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!trackerId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400).json({ ok: false, error: "trackerId, latitude, and longitude are required" });
    return;
  }

  try {
    const tracker = await upsertTracking({
      trackerId,
      role: String(req.body?.role || ""),
      name: String(req.body?.name || ""),
      email: String(req.body?.email || ""),
      latitude,
      longitude,
      accuracy: Number(req.body?.accuracy || 0)
    });

    res.json({ ok: true, tracker });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Tracking update failed" });
  }
});

app.get("/api/mechanics/:id/documents/:type", async (req, res) => {
  const mechanicId = String(req.params?.id || "");
  const documentType = String(req.params?.type || "").trim().toLowerCase();
  if (!["aadhaar", "shop"].includes(documentType)) {
    res.status(404).end();
    return;
  }

  try {
    const mechanic = await getRawMechanicById(mechanicId);
    if (!mechanic) {
      res.status(404).end();
      return;
    }

    const sourceValue = documentType === "aadhaar" ? mechanic.aadhaarPhoto : mechanic.shopPhoto;
    const normalized = String(sourceValue || "").trim();
    if (!normalized) {
      res.status(404).end();
      return;
    }

    if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/uploads/")) {
      res.redirect(normalized);
      return;
    }

    const parsed = parseDocumentDataUrl(normalized);
    if (!parsed) {
      res.status(404).end();
      return;
    }

    res.setHeader("Content-Type", parsed.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(parsed.buffer);
  } catch (error) {
    res.status(500).end();
  }
});

app.get("/api/bookings", async (req, res) => {
  try {
    const statusFilter = String(req.query?.status || "").trim().toLowerCase();
    res.json(await getBookings(statusFilter));
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const booking = await createBookingRecord(req.body || {});
    res.status(201).json({ ok: true, booking });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Booking save failed" });
  }
});

app.patch("/api/bookings/:id/accept", async (req, res) => {
  try {
    const booking = await acceptBooking(String(req.params?.id || ""), String(req.body?.mechanicId || ""));

    if (!booking) {
      res.status(404).json({ ok: false, error: "Booking or mechanic not found" });
      return;
    }

    res.json({ ok: true, booking });
  } catch (error) {
    const message = error.message || "Job acceptance failed";
    const statusCode = message.includes("approved") ? 403 : message.includes("assigned") ? 409 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get("/api/mechanics", async (req, res) => {
  try {
    const statusFilter = String(req.query?.verificationStatus || "").trim().toLowerCase();
    const records = await getMechanics(statusFilter);
    res.json(records.map(sanitizeMechanicRecord));
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/api/mechanics", async (req, res) => {
  try {
    const mechanic = await upsertMechanic(req.body || {});
    res.status(201).json({ ok: true, mechanic: sanitizeMechanicRecord(mechanic) });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Mechanic save failed" });
  }
});

app.get("/api/admin/dashboard", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const bookingPage = Number(req.query?.bookingPage || 1);
    const mechanicPage = Number(req.query?.mechanicPage || 1);
    const userPage = Number(req.query?.userPage || 1);
    const pageSize = Number(req.query?.pageSize || 8);

    const [
      bookingRecordsRaw,
      mechanicRecordsRaw,
      userRecords,
      trackingRecords,
      matches
    ] = await Promise.all([
      getBookings(""),
      getMechanics(""),
      getUsers(),
      getTracking(),
      getTrackingMatches()
    ]);

    const bookingSearch = String(req.query?.bookingSearch || "").trim().toLowerCase();
    const bookingStatus = String(req.query?.bookingStatus || "").trim();
    const bookingSort = String(req.query?.bookingSort || "createdAt-desc").trim();
    const bookingFrom = String(req.query?.bookingFrom || "").trim();
    const bookingTo = String(req.query?.bookingTo || "").trim();

    const mechanicSearch = String(req.query?.mechanicSearch || "").trim().toLowerCase();
    const mechanicStatus = String(req.query?.mechanicStatus || "").trim();
    const mechanicSort = String(req.query?.mechanicSort || "createdAt-desc").trim();
    const mechanicFrom = String(req.query?.mechanicFrom || "").trim();
    const mechanicTo = String(req.query?.mechanicTo || "").trim();

    const userSearch = String(req.query?.userSearch || "").trim().toLowerCase();
    const userRole = String(req.query?.userRole || "").trim().toLowerCase();
    const userSort = String(req.query?.userSort || "createdAt-desc").trim();
    const userFrom = String(req.query?.userFrom || "").trim();
    const userTo = String(req.query?.userTo || "").trim();

    const bookingRecords = sortRecordsByField(
      applyDateRangeFilter(
        bookingRecordsRaw.filter((booking) => {
          const matchesSearch = bookingSearch
            ? [
                booking.name,
                booking.service,
                booking.location,
                booking.status,
                booking.assignedMechanicName
              ].some((value) => String(value || "").toLowerCase().includes(bookingSearch))
            : true;
          const matchesStatus = bookingStatus ? String(booking.status || "") === bookingStatus : true;
          return matchesSearch && matchesStatus;
        }),
        (booking) => booking.createdAt,
        bookingFrom,
        bookingTo
      ),
      bookingSort
    );

    const mechanicRecords = sortRecordsByField(
      applyDateRangeFilter(
        mechanicRecordsRaw.filter((mechanic) => {
          const matchesSearch = mechanicSearch
            ? [
                mechanic.name,
                mechanic.email,
                mechanic.business,
                mechanic.service,
                mechanic.phone
              ].some((value) => String(value || "").toLowerCase().includes(mechanicSearch))
            : true;
          const matchesStatus = mechanicStatus ? String(mechanic.verificationStatus || "") === mechanicStatus : true;
          return matchesSearch && matchesStatus;
        }),
        (mechanic) => mechanic.createdAt,
        mechanicFrom,
        mechanicTo
      ),
      mechanicSort
    );

    const userFiltered = sortRecordsByField(
      applyDateRangeFilter(
        userRecords.filter((user) => {
          const matchesSearch = userSearch
            ? [user.name, user.email].some((value) => String(value || "").toLowerCase().includes(userSearch))
            : true;
          const matchesRole = userRole ? String(user.role || "").toLowerCase() === userRole : true;
          return matchesSearch && matchesRole;
        }),
        (user) => user.createdAt,
        userFrom,
        userTo
      ),
      userSort
    );

    const pendingMechanics = mechanicRecordsRaw.filter((mechanic) => {
      return String(mechanic.verificationStatus || "") !== "Approved" && String(mechanic.verificationStatus || "") !== "Rejected";
    }).map(sanitizeMechanicRecord);
    const reviewedMechanics = mechanicRecordsRaw.filter((mechanic) => {
      return Boolean(mechanic.reviewedAt) || (Array.isArray(mechanic.verificationHistory) && mechanic.verificationHistory.length);
    }).map(sanitizeMechanicRecord);
    const mechanicAssignments = buildMechanicAssignments(mechanicRecordsRaw, bookingRecordsRaw).map(sanitizeMechanicRecord);

    const mechanicAssignmentCounts = bookingRecordsRaw.reduce((counts, booking) => {
      const key = String(booking.assignedMechanicId || "").trim();
      if (!key) {
        return counts;
      }
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});

    const pagedMechanics = buildPagedResult(mechanicRecords.map((mechanic) => {
      const sanitized = sanitizeMechanicRecord(mechanic);
      return {
        ...sanitized,
        assignedJobsCount: mechanicAssignmentCounts[String(mechanic.id || "").trim()] || 0
      };
    }), { page: mechanicPage, pageSize });

    res.json({
      ok: true,
      bookings: buildPagedResult(bookingRecords, { page: bookingPage, pageSize }),
      mechanics: pagedMechanics,
      users: buildPagedResult(userFiltered, { page: userPage, pageSize }),
      summaries: {
        pendingMechanics,
        reviewedMechanics,
        mechanicAssignments,
        trackingRecords,
        matches
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Dashboard fetch failed" });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const user = await updateUserAccount(String(req.params?.id || ""), req.body || {});

    if (!user) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }

    res.json({ ok: true, user });
  } catch (error) {
    const message = error.message || "User update failed";
    const statusCode = message.includes("required") || message.includes("Another account") ? 400 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.patch("/api/mechanics/:id", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const mechanic = await updateMechanicAccount(String(req.params?.id || ""), req.body || {});

    if (!mechanic) {
      res.status(404).json({ ok: false, error: "Mechanic not found" });
      return;
    }

    res.json({ ok: true, mechanic: sanitizeMechanicRecord(mechanic) });
  } catch (error) {
    const message = error.message || "Mechanic update failed";
    const statusCode = message.includes("required") || message.includes("Another") ? 400 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.patch("/api/mechanics/:id/verification", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const mechanic = await updateMechanicVerification(String(req.params?.id || ""), req.body || {});

    if (!mechanic) {
      res.status(404).json({ ok: false, error: "Mechanic not found" });
      return;
    }

    res.json({ ok: true, mechanic: sanitizeMechanicRecord(mechanic) });
  } catch (error) {
    const message = error.message || "Verification update failed";
    const statusCode = message.includes("Invalid") ? 400 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const deleted = await deleteUserAccount(String(req.params?.id || ""));
    if (!deleted) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "User delete failed" });
  }
});

app.delete("/api/mechanics/:id", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const deleted = await deleteMechanicRecord(String(req.params?.id || ""));
    if (!deleted) {
      res.status(404).json({ ok: false, error: "Mechanic not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Mechanic delete failed" });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    const deleted = await deleteBookingRecord(String(req.params?.id || ""));
    if (!deleted) {
      res.status(404).json({ ok: false, error: "Booking not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Booking delete failed" });
  }
});

app.post("/api/admin/import/:resource", async (req, res) => {
  if (!requireAdminRole(req, res)) {
    return;
  }

  const resource = String(req.params?.resource || "").trim().toLowerCase();
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  try {
    let imported = 0;

    if (resource === "bookings") {
      imported = await importBookingsFromRows(rows);
    } else if (resource === "users") {
      imported = await importUsersFromRows(rows);
    } else if (resource === "mechanics") {
      imported = await importMechanicsFromRows(rows);
    } else {
      res.status(400).json({ ok: false, error: "Unsupported import resource" });
      return;
    }

    res.json({ ok: true, imported });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Import failed" });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(
        `PitCrew Connect server running on port ${port}${useDatabase ? " with PostgreSQL" : ` with local storage at ${dataDir}`}`
      );
    });
  })
  .catch((error) => {
    console.error("Startup failed", error);
    process.exit(1);
  });
