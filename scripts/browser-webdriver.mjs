import { spawn } from "node:child_process";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const webdriverElementKey = "element-6066-11e4-a52e-4f735466cecf";

export function loadEnvFile(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const delimiter = trimmed.indexOf("=");
    if (delimiter === -1) continue;

    const key = trimmed.slice(0, delimiter);
    if (process.env[key]) continue;

    let value = trimmed.slice(delimiter + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function requestJson(baseUrl, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = payload?.value?.message ?? payload?.message ?? text;
    throw new Error(`WebDriver ${method} ${path} failed with HTTP ${response.status}: ${message}`);
  }

  if (payload?.value?.error) {
    throw new Error(`WebDriver ${method} ${path} failed: ${payload.value.message ?? payload.value.error}`);
  }

  return payload.value;
}

async function waitForWebDriver(baseUrl) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await requestJson(baseUrl, "GET", "/status");
      return;
    } catch {
      await delay(150);
    }
  }

  throw new Error("Timed out waiting for safaridriver to accept WebDriver requests.");
}

export async function createSafariWebDriver() {
  const webdriverUrl = process.env.SMOKE_WEBDRIVER_URL;
  if (webdriverUrl) {
    return { baseUrl: webdriverUrl.replace(/\/$/, ""), stop: async () => undefined };
  }

  const port = Number(process.env.SAFARIDRIVER_PORT ?? 4445);
  const baseUrl = `http://127.0.0.1:${port}`;
  const driver = spawn("/usr/bin/safaridriver", ["--port", String(port)], {
    stdio: ["ignore", "ignore", "pipe"]
  });

  let stderr = "";
  driver.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForWebDriver(baseUrl);
  } catch (error) {
    driver.kill();
    throw new Error(`${error.message}${stderr ? `\n${stderr.trim()}` : ""}`);
  }

  return {
    baseUrl,
    stop: async () => {
      driver.kill();
      await delay(150);
    }
  };
}

export class BrowserSession {
  constructor(baseUrl, sessionId) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
  }

  async command(method, path, body) {
    return requestJson(this.baseUrl, method, `/session/${this.sessionId}${path}`, body);
  }

  async navigate(url) {
    await this.command("POST", "/url", { url });
  }

  async execute(script, args = []) {
    return this.command("POST", "/execute/sync", { script, args });
  }

  async findByCss(selector) {
    const element = await this.command("POST", "/element", {
      using: "css selector",
      value: selector
    });
    return element[webdriverElementKey];
  }

  async click(elementId) {
    await this.command("POST", `/element/${elementId}/click`, {});
  }

  async text(elementId) {
    return this.command("GET", `/element/${elementId}/text`);
  }

  async waitFor(label, predicate, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
      try {
        const result = await predicate();
        if (result) return result;
      } catch (error) {
        lastError = error;
      }
      await delay(150);
    }

    throw new Error(`Timed out waiting for ${label}.${lastError ? ` Last error: ${lastError.message}` : ""}`);
  }

  async quit() {
    await requestJson(this.baseUrl, "DELETE", `/session/${this.sessionId}`);
  }
}

export async function createBrowserSession(baseUrl) {
  try {
    const session = await requestJson(baseUrl, "POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "safari"
        }
      }
    });

    return new BrowserSession(baseUrl, session.sessionId);
  } catch (error) {
    if (error.message.includes("Allow remote automation")) {
      throw new Error(
        "Safari WebDriver is installed, but Safari remote automation is disabled. Enable Safari Settings > Advanced > Show features for web developers, then Developer > Allow Remote Automation, or run this script with SMOKE_WEBDRIVER_URL pointing at another WebDriver server."
      );
    }

    throw error;
  }
}

export async function withSafariBrowser(callback) {
  const driver = await createSafariWebDriver();
  const session = await createBrowserSession(driver.baseUrl);

  try {
    return await callback(session);
  } finally {
    await session.quit().catch(() => undefined);
    await driver.stop();
  }
}
