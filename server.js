const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 8080;
const dataDir = path.join(__dirname, "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const mechanicsPath = path.join(dataDir, "mechanics.json");

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
    issue: payload.issue || ""
  };
}

function createMechanic(payload) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    name: payload.name || "",
    phone: payload.phone || "",
    business: payload.business || "",
    experience: payload.experience || "",
    location: payload.location || "",
    service: payload.service || "",
    specialties: payload.specialties || ""
  };
}

ensureFile(bookingsPath);
ensureFile(mechanicsPath);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/bookings", (req, res) => {
  res.json(readRecords(bookingsPath));
});

app.post("/api/bookings", (req, res) => {
  const booking = createBooking(req.body || {});
  writeRecord(bookingsPath, booking);
  res.status(201).json({ ok: true, booking });
});

app.get("/api/mechanics", (req, res) => {
  res.json(readRecords(mechanicsPath));
});

app.post("/api/mechanics", (req, res) => {
  const mechanic = createMechanic(req.body || {});
  writeRecord(mechanicsPath, mechanic);
  res.status(201).json({ ok: true, mechanic });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`PitCrew Connect server running on port ${port}`);
});
