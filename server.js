const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 8080;
const dataDir = path.join(__dirname, "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const mechanicsPath = path.join(dataDir, "mechanics.json");
const usersPath = path.join(dataDir, "users.json");
const trackingPath = path.join(dataDir, "tracking.json");

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

function writeTracker(payload) {
  const trackers = readRecords(trackingPath);
  const trackerId = String(payload.trackerId || "");
  const nextRecord = {
    trackerId,
    role: payload.role || "",
    name: payload.name || "",
    email: String(payload.email || "").trim().toLowerCase(),
    latitude: Number(payload.latitude || 0),
    longitude: Number(payload.longitude || 0),
    accuracy: Number(payload.accuracy || 0),
    updatedAt: new Date().toISOString()
  };

  const index = trackers.findIndex((item) => String(item.trackerId || "") === trackerId);
  if (index >= 0) {
    trackers[index] = nextRecord;
  } else {
    trackers.push(nextRecord);
  }

  fs.writeFileSync(trackingPath, JSON.stringify(trackers, null, 2), "utf8");
  return nextRecord;
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

function getTrackingMatches() {
  const trackers = readRecords(trackingPath).filter((tracker) => {
    return !Number.isNaN(Number(tracker.latitude)) && !Number.isNaN(Number(tracker.longitude));
  });

  const mechanics = trackers.filter((tracker) => String(tracker.role || "").toLowerCase() === "mechanic");
  const users = trackers.filter((tracker) => String(tracker.role || "").toLowerCase() === "user");
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

function findRecordIndex(records, id) {
  return records.findIndex((record) => String(record.id || "") === String(id || ""));
}

ensureFile(bookingsPath);
ensureFile(mechanicsPath);
ensureFile(usersPath);
ensureFile(trackingPath);

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "").trim().toLowerCase();
  const users = readRecords(usersPath);

  const user = users.find((item) => {
    return (
      String(item.email || "").trim().toLowerCase() === email &&
      String(item.password || "") === password &&
      String(item.role || "").trim().toLowerCase() === role
    );
  });

  if (!user) {
    res.status(401).json({
      ok: false,
      error: "Invalid login details"
    });
    return;
  }

  res.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/api/users", (req, res) => {
  const users = readRecords(usersPath).map((user) => {
    return {
      id: user.id,
      createdAt: user.createdAt || "",
      name: user.name || "",
      email: user.email || "",
      role: user.role || ""
    };
  });

  res.json(users);
});

app.post("/api/users/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "user").trim().toLowerCase();
  const users = readRecords(usersPath);

  if (!name || !email || !password) {
    res.status(400).json({
      ok: false,
      error: "Name, email, and password are required"
    });
    return;
  }

  const exists = users.some((user) => String(user.email || "").trim().toLowerCase() === email);
  if (exists) {
    res.status(409).json({
      ok: false,
      error: "An account with this email already exists"
    });
    return;
  }

  if (!["user", "mechanic"].includes(role)) {
    res.status(400).json({
      ok: false,
      error: "Invalid registration role"
    });
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

    const mechanic = createMechanic({
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
    writeRecord(mechanicsPath, mechanic);
  }

  const user = createUserAccount({ name, email, password, role });
  writeRecord(usersPath, user);

  res.status(201).json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/api/tracking", (req, res) => {
  res.json(readRecords(trackingPath));
});

app.get("/api/tracking/matches", (req, res) => {
  res.json(getTrackingMatches());
});

app.post("/api/tracking/update", (req, res) => {
  const trackerId = String(req.body?.trackerId || "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!trackerId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400).json({
      ok: false,
      error: "trackerId, latitude, and longitude are required"
    });
    return;
  }

  const tracker = writeTracker({
    trackerId,
    role: String(req.body?.role || ""),
    name: String(req.body?.name || ""),
    email: String(req.body?.email || ""),
    latitude,
    longitude,
    accuracy: Number(req.body?.accuracy || 0)
  });

  res.json({
    ok: true,
    tracker
  });
});

app.get("/api/bookings", (req, res) => {
  const statusFilter = String(req.query?.status || "").trim().toLowerCase();
  const records = readRecords(bookingsPath);

  if (!statusFilter) {
    res.json(records);
    return;
  }

  res.json(records.filter((record) => String(record.status || "").trim().toLowerCase() === statusFilter));
});

app.post("/api/bookings", (req, res) => {
  const booking = createBooking(req.body || {});
  writeRecord(bookingsPath, booking);
  res.status(201).json({ ok: true, booking });
});

app.patch("/api/bookings/:id/accept", (req, res) => {
  const bookingId = String(req.params?.id || "");
  const mechanicId = String(req.body?.mechanicId || "");
  const bookings = readRecords(bookingsPath);
  const mechanics = readRecords(mechanicsPath);
  const bookingIndex = findRecordIndex(bookings, bookingId);
  const mechanicIndex = findRecordIndex(mechanics, mechanicId);

  if (bookingIndex < 0 || mechanicIndex < 0) {
    res.status(404).json({ ok: false, error: "Booking or mechanic not found" });
    return;
  }

  const booking = bookings[bookingIndex];
  const mechanic = mechanics[mechanicIndex];

  if (String(mechanic.verificationStatus || "") !== "Approved") {
    res.status(403).json({ ok: false, error: "Only approved mechanics can accept jobs" });
    return;
  }

  if (String(booking.assignedMechanicId || "")) {
    res.status(409).json({ ok: false, error: "This job has already been assigned" });
    return;
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
  res.json({ ok: true, booking: bookings[bookingIndex] });
});

app.get("/api/mechanics", (req, res) => {
  const statusFilter = String(req.query?.verificationStatus || "").trim().toLowerCase();
  const records = readRecords(mechanicsPath);

  if (!statusFilter) {
    res.json(records);
    return;
  }

  res.json(
    records.filter((record) => String(record.verificationStatus || "").trim().toLowerCase() === statusFilter)
  );
});

app.post("/api/mechanics", (req, res) => {
  const payload = req.body || {};
  const mechanics = readRecords(mechanicsPath);
  const email = String(payload.email || "").trim().toLowerCase();
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
    res.json({ ok: true, mechanic: mechanics[existingIndex] });
    return;
  }

  const mechanic = createMechanic(payload);
  writeRecord(mechanicsPath, mechanic);
  res.status(201).json({ ok: true, mechanic });
});

app.patch("/api/mechanics/:id/verification", (req, res) => {
  const mechanicId = String(req.params?.id || "");
  const verificationStatus = String(req.body?.verificationStatus || "").trim();
  const verificationCallStatus = String(req.body?.verificationCallStatus || "").trim();
  const verificationNotes = String(req.body?.verificationNotes || "").trim();
  const mechanics = readRecords(mechanicsPath);
  const mechanicIndex = findRecordIndex(mechanics, mechanicId);

  if (mechanicIndex < 0) {
    res.status(404).json({ ok: false, error: "Mechanic not found" });
    return;
  }

  const allowedStatuses = ["Pending Verification", "Approved", "Rejected", "Need More Info"];
  const allowedCallStatuses = ["Call Pending", "Call Scheduled", "Verified By Call", "Call Failed"];

  if (verificationStatus && !allowedStatuses.includes(verificationStatus)) {
    res.status(400).json({ ok: false, error: "Invalid verification status" });
    return;
  }

  if (verificationCallStatus && !allowedCallStatuses.includes(verificationCallStatus)) {
    res.status(400).json({ ok: false, error: "Invalid call status" });
    return;
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
  res.json({ ok: true, mechanic: mechanics[mechanicIndex] });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`PitCrew Connect server running on port ${port}`);
});
