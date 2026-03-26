"use strict";

const fs = require("fs");
const path = require("path");

function normalizeEnvName(value) {
  const input = String(value || "").trim().toLowerCase();

  if (input === "prod") {
    return "production";
  }

  if (input === "dev") {
    return "development";
  }

  if (input === "production" || input === "development") {
    return input;
  }

  return "development";
}

function parseEnvFile(filePath) {
  const result = {};

  if (!fs.existsSync(filePath)) {
    return result;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const matched = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!matched) {
      continue;
    }

    const [, key, rawValue] = matched;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function applyEnvValues(values) {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

function loadAppConfig(rootDir) {
  const explicitEnv = { ...process.env };
  const requestedEnv = normalizeEnvName(process.env.APP_ENV || process.env.NODE_ENV);

  applyEnvValues(parseEnvFile(path.join(rootDir, ".env")));
  process.env.APP_ENV = requestedEnv;
  applyEnvValues(parseEnvFile(path.join(rootDir, `.env.${requestedEnv}`)));

  process.env.APP_ENV = explicitEnv.APP_ENV || requestedEnv;
  process.env.NODE_ENV =
    explicitEnv.NODE_ENV ||
    process.env.NODE_ENV ||
    (requestedEnv === "production" ? "production" : "development");
  process.env.HOST =
    explicitEnv.APP_HOST ||
    process.env.HOST ||
    "0.0.0.0";
  process.env.PORT =
    explicitEnv.PORT ||
    process.env.PORT ||
    (requestedEnv === "production" ? "9090" : "9091");
  process.env.DATA_DIR =
    explicitEnv.DATA_DIR ||
    process.env.DATA_DIR ||
    path.join(rootDir, "data", requestedEnv);

  const port = Number.parseInt(process.env.PORT, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  const dataDir = path.resolve(rootDir, process.env.DATA_DIR);

  return {
    appEnv: requestedEnv,
    nodeEnv: process.env.NODE_ENV,
    host: process.env.HOST,
    port,
    dataDir,
    dbPath: path.join(dataDir, "app.db")
  };
}

module.exports = {
  loadAppConfig
};
