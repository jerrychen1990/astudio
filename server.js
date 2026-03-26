const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 9090;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const users = [
  {
    id: "u_1",
    username: "admin",
    password: "admin123",
    apiKeys: [
      {
        id: "key_1",
        name: "Production",
        value: "sk-prod-1234567890",
        createdAt: "2026-03-26T12:00:00.000Z"
      },
      {
        id: "key_2",
        name: "Staging",
        value: "sk-staging-0987654321",
        createdAt: "2026-03-26T12:30:00.000Z"
      }
    ]
  }
];

const sessions = new Map();

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
  const user = users.find((item) => item.id === userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ message: "用户不存在" });
  }

  req.user = user;
  req.token = token;
  next();
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(
    (item) => item.username === username && item.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "用户名或密码错误" });
  }

  const token = createToken();
  sessions.set(token, user.id);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  return res.json({
    id: req.user.id,
    username: req.user.username
  });
});

app.post("/api/logout", requireAuth, (req, res) => {
  sessions.delete(req.token);
  return res.status(204).send();
});

app.get("/api/keys", requireAuth, (req, res) => {
  return res.json(
    req.user.apiKeys.map((item) => ({
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

  req.user.apiKeys.unshift(newKey);
  return res.status(201).json({
    ...newKey,
    maskedValue: maskApiKey(newKey.value)
  });
});

app.delete("/api/keys/:id", requireAuth, (req, res) => {
  const index = req.user.apiKeys.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "API Key 不存在" });
  }

  req.user.apiKeys.splice(index, 1);
  return res.status(204).send();
});

app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
});
