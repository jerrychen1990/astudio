const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 9090;
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "app.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();
const apiKeysByUser = new Map();

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const insertUserStmt = db.prepare(`
  INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
  VALUES (@id, @email, @username, @password_hash, @created_at, @updated_at)
`);
const findUserByIdStmt = db.prepare(`
  SELECT id, email, username, password_hash, created_at, updated_at
  FROM users
  WHERE id = ?
`);
const findUserByEmailStmt = db.prepare(`
  SELECT id, email, username, password_hash, created_at, updated_at
  FROM users
  WHERE email = ?
`);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || "").split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const inputHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username
  };
}

function getUserKeys(userId) {
  if (!apiKeysByUser.has(userId)) {
    apiKeysByUser.set(userId, []);
  }

  return apiKeysByUser.get(userId);
}

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function maskApiKey(value) {
  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 4)}${"*".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

function getToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "未登录或登录已失效" });
  }

  const userId = sessions.get(token);
  const user = findUserByIdStmt.get(userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ message: "用户不存在" });
  }

  req.user = user;
  req.token = token;
  next();
}

app.post("/api/register", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !username || !password) {
    return res.status(400).json({ message: "email、username、password 为必填项" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "邮箱格式不正确" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "密码长度不能少于 6 位" });
  }

  if (findUserByEmailStmt.get(email)) {
    return res.status(409).json({ message: "该邮箱已注册" });
  }

  const now = new Date().toISOString();
  const user = {
    id: `u_${crypto.randomUUID()}`,
    email,
    username,
    password_hash: hashPassword(password),
    created_at: now,
    updated_at: now
  };

  insertUserStmt.run(user);

  return res.status(201).json({
    message: "注册成功，请使用邮箱和密码登录",
    user: toPublicUser(user)
  });
});

app.post("/api/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const user = findUserByEmailStmt.get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: "邮箱或密码错误" });
  }

  const token = createToken();
  sessions.set(token, user.id);

  return res.json({
    token,
    user: toPublicUser(user)
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  return res.json(toPublicUser(req.user));
});

app.post("/api/logout", requireAuth, (req, res) => {
  sessions.delete(req.token);
  return res.status(204).send();
});

app.get("/api/keys", requireAuth, (req, res) => {
  const keys = getUserKeys(req.user.id);
  return res.json(
    keys.map((item) => ({
      ...item,
      maskedValue: maskApiKey(item.value)
    }))
  );
});

app.post("/api/keys", requireAuth, (req, res) => {
  const { name, value } = req.body || {};

  if (!name || !value) {
    return res.status(400).json({ message: "name 和 value 为必填项" });
  }

  const newKey = {
    id: `key_${crypto.randomUUID()}`,
    name: String(name).trim(),
    value: String(value).trim(),
    createdAt: new Date().toISOString()
  };

  getUserKeys(req.user.id).unshift(newKey);
  return res.status(201).json({
    ...newKey,
    maskedValue: maskApiKey(newKey.value)
  });
});

app.delete("/api/keys/:id", requireAuth, (req, res) => {
  const keys = getUserKeys(req.user.id);
  const index = keys.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "API Key 不存在" });
  }

  keys.splice(index, 1);
  return res.status(204).send();
});

app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
});
