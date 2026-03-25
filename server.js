const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 8080;
const dataDir = path.join(__dirname, "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const mechanicsPath = path.join(dataDir, "mechanics.json");
const usersPath = path.join(dataDir, "users.json");
const trackingPath = path.join(dataDir, "tracking.json");
const databaseUrl = process.env.DATABASE_URL || "";
const useDatabase = Boolean(databaseUrl);
const pool = useDatabase
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

function ensureFile(filePath) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
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
    reviewedAt: row.reviewed_at || "",
    approvedAt: row.approved_at || ""
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
      reviewed_at TIMESTAMPTZ NULL,
      approved_at TIMESTAMPTZ NULL
    );
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
      password: "Admin123!",
      role: "admin"
    },
    {
      id: "mechanic-1",
      createdAt: new Date().toISOString(),
      name: "Service Partner",
      email: "mechanic@pitcrewconnect.com",
      password: "Mechanic123!",
      role: "mechanic"
    },
    {
      id: "user-1",
      createdAt: new Date().toISOString(),
      name: "Customer Account",
      email: "user@pitcrewconnect.com",
      password: "User123!",
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
        verification_call_status, verification_notes, reviewed_at, approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18
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

async function findUserByCredentials(email, password, role) {
  if (!useDatabase) {
    const users = readRecords(usersPath);
    return (
      users.find((item) => {
        return (
          String(item.email || "").trim().toLowerCase() === email &&
          String(item.password || "") === password &&
          String(item.role || "").trim().toLowerCase() === role
        );
      }) || null
    );
  }

  const result = await pool.query(
    "SELECT id, created_at, name, email, password, role FROM users WHERE email = $1 AND password = $2 AND role = $3 LIMIT 1",
    [email, password, role]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function emailExists(email) {
  if (!useDatabase) {
    return readRecords(usersPath).some((user) => String(user.email || "").trim().toLowerCase() === email);
  }

  const result = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
  return result.rowCount > 0;
}

async function registerUser(payload) {
  const user = createUserAccount(payload);

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
          reviewed_at = $16,
          approved_at = $17
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
        verification_call_status, verification_notes, reviewed_at, approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18
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
      verificationNotes,
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
    verificationNotes,
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
        reviewed_at = $5,
        approved_at = $6
      WHERE id = $1
    `,
    [
      updated.id,
      updated.verificationStatus,
      updated.verificationCallStatus,
      updated.verificationNotes,
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

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

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

    res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

app.get("/api/users", async (_req, res) => {
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
    res.json(await getMechanics(statusFilter));
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/api/mechanics", async (req, res) => {
  try {
    const mechanic = await upsertMechanic(req.body || {});
    res.status(201).json({ ok: true, mechanic });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Mechanic save failed" });
  }
});

app.patch("/api/mechanics/:id/verification", async (req, res) => {
  try {
    const mechanic = await updateMechanicVerification(String(req.params?.id || ""), req.body || {});

    if (!mechanic) {
      res.status(404).json({ ok: false, error: "Mechanic not found" });
      return;
    }

    res.json({ ok: true, mechanic });
  } catch (error) {
    const message = error.message || "Verification update failed";
    const statusCode = message.includes("Invalid") ? 400 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(
        `PitCrew Connect server running on port ${port}${useDatabase ? " with PostgreSQL" : " with JSON fallback"}`
      );
    });
  })
  .catch((error) => {
    console.error("Startup failed", error);
    process.exit(1);
  });
