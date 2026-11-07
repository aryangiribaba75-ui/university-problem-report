const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ⚠️ Production mein strong secret .env se lo, yahan hardcode mat karo
const JWT_SECRET = "unifix-lpu-secret-key-change-this-in-production";

// ---------------------------------------------------------------
// DATABASE SETUP
// ---------------------------------------------------------------

const db = new Database(path.join(__dirname, "database.db"));

// Users table
// NOTE: Original borrowed server used "email" for login. UniFix LPU's
// login.html form asks for "University ID" (uid), so this project's
// users are identified by uid instead of email.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    uid TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Reports table — matches the data structure used by
// report.html (Report an Issue) and track.html (Track Resolution).
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    image TEXT,
    video TEXT,
    severity TEXT,
    priority TEXT,
    department TEXT,
    status TEXT DEFAULT 'Reported',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

app.use(cors());
app.use(express.json());

// Static frontend serve karo (project root, one level up from /backend)
app.use(express.static(__dirname));

// ---------------------------------------------------------------
// FILE UPLOADS (image / video attached to a report)
// ---------------------------------------------------------------

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files at /uploads/<filename>
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB, matches video limit on frontend
});

// --- Helper: Token se user nikalo ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// --- Helper: generate a unique Issue ID like UF-2026-482913 ---
function generateIssueId() {
  const year = new Date().getFullYear();
  let id;
  let exists = true;

  while (exists) {
    const random = Math.floor(100000 + Math.random() * 900000);
    id = `UF-${year}-${random}`;
    exists = db.prepare("SELECT id FROM reports WHERE id = ?").get(id);
  }

  return id;
}

// --- Helper: DB row (snake_case) -> API shape (camelCase) ---
function mapReport(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    image: row.image,
    video: row.video,
    severity: row.severity,
    priority: row.priority,
    department: row.department,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =================================================================
// AUTH ROUTES
// =================================================================

// 1️⃣ SIGN UP
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, uid, password } = req.body;

    if (!name || !uid || !password) {
      return res
        .status(400)
        .json({ error: "Name, University ID and password required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE uid = ?").get(uid);
    if (existing) {
      return res.status(409).json({ error: "University ID already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare("INSERT INTO users (name, uid, password) VALUES (?, ?, ?)")
      .run(name, uid, hashedPassword);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: result.lastInsertRowid, name, uid },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2️⃣ LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { uid, password } = req.body;

    if (!uid || !password) {
      return res
        .status(400)
        .json({ error: "University ID and password required" });
    }

    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(uid);
    if (!user) {
      return res.status(401).json({ error: "Invalid University ID or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid University ID or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        uid: user.uid,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3️⃣ GET PROFILE (logged-in user)
app.get("/api/users/me", authMiddleware, (req, res) => {
  const user = db
    .prepare("SELECT id, name, uid, created_at FROM users WHERE id = ?")
    .get(req.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user });
});

// 4️⃣ UPDATE PROFILE
app.put("/api/users/me", authMiddleware, (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Name is required" });
  }

  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), req.userId);

  const user = db
    .prepare("SELECT id, name, uid, created_at FROM users WHERE id = ?")
    .get(req.userId);

  res.json({ message: "Profile updated", user });
});

// 5️⃣ LOGOUT (frontend token delete karega — yahan optional endpoint)
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// =================================================================
// REPORT ROUTES (Report an Issue -> My Reports -> Track Resolution)
// =================================================================

// 6️⃣ CREATE REPORT  (called from report.html)
app.post(
  "/api/reports",
  authMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const { title, description, category, location, severity, priority, department } =
        req.body;

      if (!title || !category || !location) {
        return res
          .status(400)
          .json({ error: "Title, category and location are required" });
      }

      const id = generateIssueId();
      const now = new Date().toISOString();

      const imagePath = req.files?.image?.[0]
        ? `/uploads/${req.files.image[0].filename}`
        : null;

      const videoPath = req.files?.video?.[0]
        ? `/uploads/${req.files.video[0].filename}`
        : null;

      db.prepare(
        `INSERT INTO reports
          (id, user_id, title, description, category, location, image, video, severity, priority, department, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Reported', ?, ?)`
      ).run(
        id,
        req.userId,
        title,
        description || "",
        category,
        location,
        imagePath,
        videoPath,
        severity || "Medium",
        priority || "Medium",
        department || "Campus Administration",
        now,
        now
      );

      const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);
      res.status(201).json(mapReport(row));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// 7️⃣ GET ALL REPORTS FOR LOGGED-IN STUDENT  (called from my-reports.html)
app.get("/api/reports", authMiddleware, (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC")
      .all(req.userId);

    res.json({ reports: rows.map(mapReport) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 8️⃣ GET ONE REPORT BY ID  (called from track.html)
app.get("/api/reports/:id", authMiddleware, (req, res) => {
  try {
    const row = db
      .prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.userId);

    if (!row) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json(mapReport(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/login.html`);
});