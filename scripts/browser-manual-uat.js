const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { createConnection, getDatabaseName } = require("../db");

const DEBUG_PORT = Number(process.env.BROWSER_DEBUG_PORT || 9222);
const BASE_URL = process.env.UAT_BASE_URL || "http://localhost:5173";
const ARTIFACT_DIR = path.join(__dirname, "..", "test-artifacts", "browser-uat");
const TEST_PREFIX = "UAT Browser";
const RUN_TOKEN = `${new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14)}-${Math.random().toString(36).slice(2, 7)}`;

const credentials = {
  superAdmin: {
    title: "Super Admin",
    email: "admin@spl.local",
    password: "Spl@12345",
    expectedPath: "/admin",
  },
  opsManager: {
    title: "Ops Manager",
    email: "ops@spl.local",
    password: "Spl@12345",
    expectedPath: "/admin/matches",
  },
  financeAdmin: {
    title: "Finance Admin",
    email: "finance@spl.local",
    password: "Spl@12345",
    expectedPath: "/admin/finance",
  },
  scorer: {
    title: "Scorer",
    email: "scorer@spl.local",
    password: "Spl@12345",
    expectedPath: "/admin/live-match",
  },
  franchiseAdmin: {
    title: "Franchise Admin",
    email: "franchise@spl.local",
    password: "Spl@12345",
    expectedPath: "/franchise",
  },
};

const crudData = {
  franchiseName: `${TEST_PREFIX} ${RUN_TOKEN} Franchise`,
  franchiseNameUpdated: `${TEST_PREFIX} ${RUN_TOKEN} Franchise Updated`,
  teamName: `${TEST_PREFIX} ${RUN_TOKEN} Team`,
  teamNameUpdated: `${TEST_PREFIX} ${RUN_TOKEN} Team Updated`,
  playerName: `${TEST_PREFIX} ${RUN_TOKEN} Player`,
  playerNameUpdated: `${TEST_PREFIX} ${RUN_TOKEN} Player Updated`,
  ownerName: `${TEST_PREFIX} Owner ${RUN_TOKEN}`,
  ownerNameUpdated: `${TEST_PREFIX} Owner Updated ${RUN_TOKEN}`,
  website: `https://uat-browser-${RUN_TOKEN}.example.com`,
  websiteUpdated: `https://uat-browser-${RUN_TOKEN}-updated.example.com`,
  address: `${TEST_PREFIX} Address ${RUN_TOKEN}`,
  addressUpdated: `${TEST_PREFIX} Address Updated ${RUN_TOKEN}`,
  city: "Hyderabad",
  cityUpdated: "Pune",
  coach: `${TEST_PREFIX} Coach ${RUN_TOKEN}`,
  captain: `${TEST_PREFIX} Captain ${RUN_TOKEN}`,
  venue: `${TEST_PREFIX} Venue ${RUN_TOKEN}`,
  playerEmail: `uat-browser-player-${RUN_TOKEN}@example.com`,
  playerEmailUpdated: `uat-browser-player-updated-${RUN_TOKEN}@example.com`,
};

const registrationData = {
  franchiseName: `${TEST_PREFIX} ${RUN_TOKEN} Registered Franchise`,
  fullName: `${TEST_PREFIX} Franchise Owner ${RUN_TOKEN}`,
  email: `owner.${RUN_TOKEN}@uatfranchiseco.in`,
  employeeId: `UAT${RUN_TOKEN.slice(-8).toUpperCase()}`,
  password: "Spl@12345",
  website: `https://uat-register-${RUN_TOKEN}.example.com`,
  address: `${TEST_PREFIX} Registered Address ${RUN_TOKEN}`,
};

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.consoleMessages = [];
    this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (error) => reject(error));
      this.ws.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);

        if (payload.id) {
          const pending = this.pending.get(payload.id);
          if (!pending) {
            return;
          }

          this.pending.delete(payload.id);

          if (payload.error) {
            pending.reject(new Error(payload.error.message));
            return;
          }

          pending.resolve(payload.result);
          return;
        }

        this.emit(payload.method, payload.params || {});
      });
      this.ws.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error("CDP socket closed."));
        }
        this.pending.clear();
      });
    });
  }

  emit(method, params) {
    if (method === "Runtime.consoleAPICalled") {
      const message = (params.args || [])
        .map((arg) =>
          typeof arg.value === "string"
            ? arg.value
            : JSON.stringify(arg.value ?? arg.description ?? null)
        )
        .join(" ");
      this.consoleMessages.push({
        type: params.type,
        message,
      });
    }

    if (method === "Runtime.exceptionThrown") {
      this.exceptions.push(params.exceptionDetails || {});
    }

    const listeners = this.listeners.get(method) || [];
    for (const listener of listeners) {
      listener(params);
    }
  }

  on(method, handler) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(handler);
    this.listeners.set(method, listeners);
  }

  waitForEvent(method, timeoutMs = 15000, predicate = () => true) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);

      const handler = (params) => {
        if (!predicate(params)) {
          return;
        }

        cleanup();
        resolve(params);
      };

      const cleanup = () => {
        clearTimeout(timer);
        const listeners = this.listeners.get(method) || [];
        const nextListeners = listeners.filter((listener) => listener !== handler);
        this.listeners.set(method, nextListeners);
      };

      this.on(method, handler);
    });
  }

  async send(method, params = {}) {
    await this.ready;

    const id = this.nextId++;
    const payload = {
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
      });
      this.ws.send(JSON.stringify(payload));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Runtime evaluation failed.");
    }

    return result.result ? result.result.value : undefined;
  }

  async navigate(url) {
    const loaded = this.waitForEvent("Page.loadEventFired", 20000);
    await this.send("Page.navigate", { url });
    await loaded;
  }

  async waitFor(checkExpression, timeoutMs = 15000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const value = await this.evaluate(checkExpression);
      if (value) {
        return value;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Timed out waiting for condition: ${checkExpression}`);
  }

  async waitForText(text, timeoutMs = 15000) {
    return this.waitFor(
      `document.body && document.body.innerText && document.body.innerText.toLowerCase().includes(${JSON.stringify(
        String(text).toLowerCase()
      )})`,
      timeoutMs
    );
  }

  async waitForPath(pathname, timeoutMs = 15000) {
    return this.waitFor(
      `window.location.pathname === ${JSON.stringify(pathname)}`,
      timeoutMs
    );
  }

  async clickByText(text, tagNames = ["button", "a", "[role='button']"]) {
    const didClick = await this.evaluate(`(() => {
      const wanted = ${JSON.stringify(text)}.trim().toLowerCase();
      const selectors = ${JSON.stringify(tagNames)};
      const nodes = [...document.querySelectorAll(selectors.join(","))];
      const ranked = nodes
        .map((node) => {
          const rawText = (node.innerText || node.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
          const style = window.getComputedStyle(node);
          const visible = style && style.visibility !== "hidden" && style.display !== "none";
          return {
            node,
            rawText,
            visible,
          };
        })
        .filter((entry) => {
          if (!entry.visible || !entry.rawText) {
            return false;
          }
          return (
            entry.rawText === wanted ||
            entry.rawText.startsWith(wanted + " ") ||
            entry.rawText.includes(wanted)
          );
        })
        .sort((left, right) => left.rawText.length - right.rawText.length);
      const target = ranked.find((entry) => {
        const node = entry.node;
        const rawText = (node.innerText || node.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
        const style = window.getComputedStyle(node);
        const visible = style && style.visibility !== "hidden" && style.display !== "none";
        return visible && (
          rawText === wanted ||
          rawText.startsWith(wanted + " ") ||
          rawText.includes(wanted)
        );
      })?.node;
      if (!target) {
        return false;
      }
      target.scrollIntoView({ block: "center", inline: "center" });
      target.click();
      return true;
    })()`);

    if (!didClick) {
      throw new Error(`Unable to find clickable text: ${text}`);
    }
  }

  async clickSelector(selector) {
    const didClick = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) {
        return false;
      }
      el.scrollIntoView({ block: "center", inline: "center" });
      el.click();
      return true;
    })()`);

    if (!didClick) {
      throw new Error(`Unable to find selector: ${selector}`);
    }
  }

  async setValue(selector, value) {
    const didSet = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) {
        return false;
      }

      const proto =
        element instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : null;

      const descriptor = proto
        ? Object.getOwnPropertyDescriptor(proto, "value")
        : null;

      if (descriptor && descriptor.set) {
        descriptor.set.call(element, ${JSON.stringify(value)});
      } else {
        element.value = ${JSON.stringify(value)};
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);

    if (!didSet) {
      throw new Error(`Unable to set selector: ${selector}`);
    }
  }

  async selectByText(selector, optionText) {
    const didSelect = await this.evaluate(`(() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      const wanted = ${JSON.stringify(optionText)}.trim().toLowerCase();
      if (!select) {
        return false;
      }

      const option = [...select.options].find((item) =>
        String(item.textContent || "").trim().toLowerCase() === wanted
      );

      if (!option) {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      );

      if (descriptor && descriptor.set) {
        descriptor.set.call(select, option.value);
      } else {
        select.value = option.value;
      }

      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);

    if (!didSelect) {
      throw new Error(`Unable to select option "${optionText}" for ${selector}`);
    }
  }

  async clickRowAction(rowText, actionText) {
    const didClick = await this.evaluate(`(() => {
      const rowWanted = ${JSON.stringify(rowText)}.trim().toLowerCase();
      const actionWanted = ${JSON.stringify(actionText)}.trim().toLowerCase();
      const rows = [...document.querySelectorAll("table tbody tr")];
      const row = rows.find((item) =>
        String(item.innerText || "").toLowerCase().includes(rowWanted)
      );

      if (!row) {
        return false;
      }

      const action = [...row.querySelectorAll("button, a, [role='button']")].find(
        (item) => {
          const text = String(item.innerText || item.textContent || "")
            .replace(/\\s+/g, " ")
            .trim()
            .toLowerCase();
          return text === actionWanted || text.includes(actionWanted);
        }
      );

      if (!action) {
        return false;
      }

      row.scrollIntoView({ block: "center", inline: "center" });
      action.click();
      return true;
    })()`);

    if (!didClick) {
      throw new Error(`Unable to click ${actionText} for row containing "${rowText}"`);
    }
  }

  async tableRowExists(rowText) {
    return this.evaluate(`(() => {
      const wanted = ${JSON.stringify(rowText)}.trim().toLowerCase();
      return [...document.querySelectorAll("table tbody tr")].some((item) =>
        String(item.innerText || "").toLowerCase().includes(wanted)
      );
    })()`);
  }

  async clickModalButton(buttonText) {
    const didClick = await this.evaluate(`(() => {
      const wanted = ${JSON.stringify(buttonText)}.trim().toLowerCase();
      const modalRoots = [...document.querySelectorAll("div.fixed.inset-0")];
      const modal = modalRoots[modalRoots.length - 1];
      if (!modal) {
        return false;
      }

      const button = [...modal.querySelectorAll("button, a, [role='button']")]
        .map((node) => ({
          node,
          text: String(node.innerText || node.textContent || "")
            .replace(/\\s+/g, " ")
            .trim()
            .toLowerCase(),
        }))
        .find((entry) => entry.text === wanted || entry.text.includes(wanted))?.node;

      if (!button) {
        return false;
      }

      button.scrollIntoView({ block: "center", inline: "center" });
      button.click();
      return true;
    })()`);

    if (!didClick) {
      throw new Error(`Unable to click modal button: ${buttonText}`);
    }
  }

  async submitFirstForm() {
    const didSubmit = await this.evaluate(`(() => {
      const form = document.querySelector("form");
      if (!form) {
        return false;
      }
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
      return true;
    })()`);

    if (!didSubmit) {
      throw new Error("Unable to submit the current form.");
    }
  }

  async clearAuthState() {
    await this.navigate(`${BASE_URL}/`);
    await this.evaluate(`(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      document.cookie.split(";").forEach((item) => {
        const name = item.split("=")[0]?.trim();
        if (name) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
      });
      return true;
    })()`);
  }

  async screenshot(fileName) {
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), result.data, "base64");
  }

  async getBodyText() {
    return this.evaluate(
      "document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim() : ''"
    );
  }

  async getPathname() {
    return this.evaluate("window.location.pathname");
  }

  async close() {
    if (!this.ws) {
      return;
    }

    await new Promise((resolve) => {
      this.ws.addEventListener(
        "close",
        () => resolve(),
        { once: true }
      );
      this.ws.close();
    });
  }
}

async function getPageWebSocketUrl() {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const targets = await response.json();
  const pageTarget =
    targets.find((target) => target.type === "page" && target.url === "about:blank") ||
    targets.find(
      (target) =>
        target.type === "page" &&
        !String(target.url || "").startsWith("edge://") &&
        !String(target.url || "").startsWith("chrome-extension://")
    );

  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("Unable to find a usable page target in Edge.");
  }

  return pageTarget.webSocketDebuggerUrl;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupBrowserUatData() {
  const pool = await createConnection(getDatabaseName());
  const testPrefixLike = `${TEST_PREFIX}%`;
  const uatEmailLike = "uat-browser+%@example.com";
  const playerEmailLike = "uat-browser-player%@example.com";

  try {
    await pool.request()
      .input("player_name_like", sql.NVarChar(255), testPrefixLike)
      .input("player_email_like", sql.NVarChar(255), playerEmailLike)
      .query(`
DELETE FROM dbo.players
WHERE full_name LIKE @player_name_like
   OR email LIKE @player_email_like;
`);

    await pool.request()
      .input("team_name_like", sql.NVarChar(255), testPrefixLike)
      .query(`
DELETE FROM dbo.teams
WHERE team_name LIKE @team_name_like;
`);

    await pool.request()
      .input("approval_requested_by_like", sql.NVarChar(255), testPrefixLike)
      .input("approval_subject_like", sql.NVarChar(255), `%${TEST_PREFIX}%`)
      .input("approval_notes_like", sql.NVarChar(255), `%${TEST_PREFIX}%`)
      .query(`
DELETE FROM dbo.approvals
WHERE requested_by LIKE @approval_requested_by_like
   OR subject LIKE @approval_subject_like
   OR notes LIKE @approval_notes_like;
`);

    await pool.request()
      .input("auth_email_like", sql.NVarChar(255), uatEmailLike)
      .input("auth_name_like", sql.NVarChar(255), testPrefixLike)
      .query(`
DELETE FROM dbo.auth_users
WHERE email LIKE @auth_email_like
   OR full_name LIKE @auth_name_like;
`);

    await pool.request()
      .input("franchise_name_like", sql.NVarChar(255), testPrefixLike)
      .query(`
DELETE FROM dbo.franchises
WHERE company_name LIKE @franchise_name_like;
`);
  } finally {
    await pool.close();
  }
}

async function login(page, account) {
  await page.clearAuthState();
  await page.navigate(`${BASE_URL}/login`);
  await page.waitForText("SIGN IN");
  await page.clickByText(account.title, ["button"]);
  await page.waitForText(`Signing in as ${account.title}`);
  await page.setValue("input[name='email']", account.email);
  await page.setValue("input[name='password']", account.password);
  await page.submitFirstForm();
  await page.waitForPath(account.expectedPath, 20000);
  return page.getPathname();
}

async function fillFranchiseForm(page, values) {
  await page.setValue("input[name='company_name']", values.company_name);
  await page.setValue("input[name='owner_name']", values.owner_name);
  await page.setValue("input[name='website']", values.website);
  await page.setValue("textarea[name='address']", values.address);
}

async function fillTeamForm(page, values) {
  await page.setValue("input[name='team_name']", values.team_name);
  await page.selectByText("select[name='franchise_id']", values.franchise_name);
  await page.setValue("input[name='city']", values.city);
  await page.setValue("input[name='owner']", values.owner);
  await page.setValue("input[name='coach']", values.coach);
  await page.setValue("input[name='vice_coach']", values.vice_coach);
  await page.setValue("input[name='venue']", values.venue);
  await page.selectByText("select[name='primary_color']", values.primary_color);
  await page.selectByText("select[name='status']", values.status);
  await page.setValue("input[name='budget_left']", String(values.budget_left));
}

async function fillPlayerForm(page, values) {
  await page.setValue("input[name='full_name']", values.full_name);
  await page.selectByText("select[name='team_id']", values.team_name);
  await page.selectByText("select[name='role']", values.role);
  await page.setValue("input[name='batting_style']", values.batting_style);
  await page.setValue("input[name='bowling_style']", values.bowling_style);
  await page.setValue("input[name='date_of_birth']", values.date_of_birth);
  await page.setValue("input[name='mobile']", values.mobile);
  await page.setValue("input[name='email']", values.email);
  await page.selectByText("select[name='status']", values.status);
  await page.setValue("input[name='salary']", String(values.salary));
}

async function registerFranchiseAdmin(page, values) {
  await page.clearAuthState();
  await page.navigate(`${BASE_URL}/register?role=franchise_admin`);
  await page.waitForText("REGISTER");
  await page.setValue("input[name='franchiseName']", values.franchiseName);
  await page.setValue("input[name='fullName']", values.fullName);
  await page.setValue("input[name='email']", values.email);
  await page.setValue("input[name='employeeId']", values.employeeId);
  await page.setValue("input[name='website']", values.website);
  await page.setValue("textarea[name='address']", values.address);
  await page.setValue("input[name='password']", values.password);
  await page.setValue("input[name='confirmPassword']", values.password);
  await page.submitFirstForm();
  await page.waitForPath("/franchise", 20000);
}

async function openAndCloseViewModal(page, rowText, checkText) {
  await page.clickRowAction(rowText, "View");
  await page.waitForText(checkText);
  await page.clickModalButton("Close");
}

async function saveCurrentModal(page, buttonText, waitExpression, timeoutMs = 20000) {
  await page.clickModalButton(buttonText);
  await page.waitFor(waitExpression, timeoutMs);
}

async function run() {
  await cleanupBrowserUatData();

  const wsUrl = await getPageWebSocketUrl();
  const page = new CdpPage(wsUrl);
  await page.ready;

  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  await page.send("Log.enable");

  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, status: "passed" });
    } catch (error) {
      const safeFileName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let currentPath = "";
      let bodySnippet = "";
      try {
        currentPath = await page.getPathname();
        bodySnippet = String(
          await page.evaluate(
            "document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, 300) : ''"
          )
        );
      } catch {}
      try {
        await page.screenshot(`${safeFileName}.png`);
      } catch {}
      results.push({
        name,
        status: "failed",
        error: error.message,
        currentPath,
        bodySnippet,
      });
    }
  }

  try {
    await test("public home renders", async () => {
      await page.clearAuthState();
      await page.navigate(`${BASE_URL}/`);
      await page.waitFor(
        "document.body.innerText.includes('SOFTWARE PREMIER LEAGUE') || document.body.innerText.includes('VIEW FIXTURES')"
      );
      const hasHero = await page.evaluate(
        "document.body.innerText.includes('FRANCHISES') && document.body.innerText.includes('PLAYERS')"
      );
      assert(hasHero, "Home hero stats did not render.");
    });

    await test("public navbar navigation works", async () => {
      await page.navigate(`${BASE_URL}/`);
      await page.waitForText("Teams", 15000);
      await page.clickByText("Teams", ["a", "button"]);
      await page.waitForPath("/teams");
      const scrollY = await page.evaluate("window.scrollY");
      assert(scrollY < 50, `Teams route opened with scrollY=${scrollY}`);

      await page.clickByText("Fixtures", ["a", "button"]);
      await page.waitForPath("/fixtures");

      await page.clickByText("Venues", ["a", "button"]);
      await page.waitForPath("/venues");

      await page.clickByText("Live", ["a", "button"]);
      await page.waitForPath("/live");
    });

    await test("super admin login lands on dashboard", async () => {
      const pathname = await login(page, credentials.superAdmin);
      assert(pathname === "/admin", `Expected /admin, received ${pathname}`);
      await page.waitForText("Points Table", 15000);
    });

    await test("super admin franchise CRUD works", async () => {
      await page.navigate(`${BASE_URL}/admin/franchises`);
      await page.waitForText("Add Franchise");
      await page.clickByText("Add Franchise", ["button"]);
      await page.waitForText("ADD FRANCHISE");
      await fillFranchiseForm(page, {
        company_name: crudData.franchiseName,
        owner_name: crudData.ownerName,
        website: crudData.website,
        address: crudData.address,
      });
      await saveCurrentModal(
        page,
        "Add Franchise",
        `!document.body.innerText.includes('ADD FRANCHISE') && [...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.franchiseName
        )}))`
      );
      assert(
        await page.tableRowExists(crudData.franchiseName),
        "Created franchise row not found."
      );

      await openAndCloseViewModal(page, crudData.franchiseName, crudData.website);

      await page.clickRowAction(crudData.franchiseName, "Edit");
      await page.waitForText("EDIT FRANCHISE");
      await fillFranchiseForm(page, {
        company_name: crudData.franchiseNameUpdated,
        owner_name: crudData.ownerNameUpdated,
        website: crudData.websiteUpdated,
        address: crudData.addressUpdated,
      });
      await saveCurrentModal(
        page,
        "Save Changes",
        `[...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.franchiseNameUpdated
        )}))`
      );
      assert(
        await page.tableRowExists(crudData.franchiseNameUpdated),
        "Updated franchise row not found."
      );
    });

    await test("super admin team CRUD works", async () => {
      await page.navigate(`${BASE_URL}/admin/teams`);
      await page.waitForText("Add Team", 15000);
      await page.clickByText("Add Team", ["button"]);
      await page.waitForText("ADD TEAM");
      await fillTeamForm(page, {
        team_name: crudData.teamName,
        franchise_name: crudData.franchiseNameUpdated,
        city: crudData.city,
        owner: crudData.ownerNameUpdated,
        coach: crudData.coach,
        vice_coach: crudData.captain,
        venue: crudData.venue,
        primary_color: "Blue",
        status: "Active",
        budget_left: 250000,
      });
      await saveCurrentModal(
        page,
        "Add Team",
        `!document.body.innerText.includes('ADD TEAM') && [...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.teamName
        )}))`
      );
      assert(await page.tableRowExists(crudData.teamName), "Created team row not found.");

      await openAndCloseViewModal(page, crudData.teamName, crudData.teamName);

      await page.clickRowAction(crudData.teamName, "Edit");
      await page.waitForText("EDIT TEAM");
      await fillTeamForm(page, {
        team_name: crudData.teamNameUpdated,
        franchise_name: crudData.franchiseNameUpdated,
        city: crudData.cityUpdated,
        owner: crudData.ownerNameUpdated,
        coach: `${crudData.coach} Updated`,
        vice_coach: `${crudData.captain} Updated`,
        venue: `${crudData.venue} Updated`,
        primary_color: "Gold",
        status: "Review",
        budget_left: 260000,
      });
      await saveCurrentModal(
        page,
        "Save Changes",
        `[...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.teamNameUpdated
        )}))`
      );
      assert(
        await page.tableRowExists(crudData.teamNameUpdated),
        "Updated team row not found."
      );
    });

    await test("super admin player CRUD works", async () => {
      await page.navigate(`${BASE_URL}/admin/players`);
      await page.waitForText("Add Player", 15000);
      await page.clickByText("Add Player", ["button"]);
      await page.waitForText("ADD PLAYER");
      await fillPlayerForm(page, {
        full_name: crudData.playerName,
        team_name: crudData.teamNameUpdated,
        role: "Batsman",
        batting_style: "Right Hand",
        bowling_style: "Off Spin",
        date_of_birth: "1998-01-02",
        mobile: "9999999999",
        email: crudData.playerEmail,
        status: "Active",
        salary: 100000,
      });
      await saveCurrentModal(
        page,
        "Add Player",
        `!document.body.innerText.includes('ADD PLAYER') && [...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.playerName
        )}))`
      );
      assert(
        await page.tableRowExists(crudData.playerName),
        "Created player row not found."
      );

      await page.clickRowAction(crudData.playerName, "Edit");
      await page.waitForText("EDIT PLAYER");
      await fillPlayerForm(page, {
        full_name: crudData.playerNameUpdated,
        team_name: crudData.teamNameUpdated,
        role: "All-Rounder",
        batting_style: "Left Hand",
        bowling_style: "Medium Pace",
        date_of_birth: "1997-04-05",
        mobile: "8888888888",
        email: crudData.playerEmailUpdated,
        status: "Injured",
        salary: 120000,
      });
      await saveCurrentModal(
        page,
        "Save Changes",
        `[...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.playerNameUpdated
        )}))`
      );
      assert(
        await page.tableRowExists(crudData.playerNameUpdated),
        "Updated player row not found."
      );

      await page.clickRowAction(crudData.playerNameUpdated, "Delete");
      await page.waitForText("DELETE PLAYER");
      await saveCurrentModal(
        page,
        "Confirm Delete",
        `![...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.playerNameUpdated
        )}))`
      );
      assert(
        !(await page.tableRowExists(crudData.playerNameUpdated)),
        "Deleted player row is still visible."
      );
    });

    await test("super admin can delete created team and franchise", async () => {
      await page.navigate(`${BASE_URL}/admin/teams`);
      await page.waitForText("Add Team", 15000);
      await page.clickRowAction(crudData.teamNameUpdated, "Delete");
      await page.waitForText("DELETE TEAM");
      await saveCurrentModal(
        page,
        "Confirm Delete",
        `![...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.teamNameUpdated
        )}))`
      );
      assert(
        !(await page.tableRowExists(crudData.teamNameUpdated)),
        "Deleted team row is still visible."
      );

      await page.navigate(`${BASE_URL}/admin/franchises`);
      await page.waitForText("Add Franchise", 15000);
      await page.clickRowAction(crudData.franchiseNameUpdated, "Delete");
      await page.waitForText("DELETE FRANCHISE");
      await saveCurrentModal(
        page,
        "Confirm Delete",
        `![...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          crudData.franchiseNameUpdated
        )}))`
      );
      assert(
        !(await page.tableRowExists(crudData.franchiseNameUpdated)),
        "Deleted franchise row is still visible."
      );
    });

    await test("super admin approvals page loads from dashboard scope", async () => {
      await page.navigate(`${BASE_URL}/admin/approvals`);
      await page.waitForText("All Approvals");
      const bodyText = await page.getBodyText();
      assert(bodyText.includes("All Approvals"), "Approvals page did not render.");
      assert(!bodyText.includes("API resource not found"), "Approvals page shows API error.");
    });

    await test("ops manager remains scoped to match operations", async () => {
      const pathname = await login(page, credentials.opsManager);
      assert(pathname === "/admin/matches", `Expected /admin/matches, received ${pathname}`);
      await page.waitForText("Access Limited", 15000);
      await page.navigate(`${BASE_URL}/admin/finance`);
      await page.waitForPath("/admin/matches", 15000);
    });

    await test("finance admin remains access-limited", async () => {
      const pathname = await login(page, credentials.financeAdmin);
      assert(pathname === "/admin/finance", `Expected /admin/finance, received ${pathname}`);
      await page.waitForText("Access Limited", 15000);
      await page.navigate(`${BASE_URL}/admin/teams`);
      await page.waitForPath("/admin/finance", 15000);
    });

    await test("scorer remains scoped to live match", async () => {
      const pathname = await login(page, credentials.scorer);
      assert(pathname === "/admin/live-match", `Expected /admin/live-match, received ${pathname}`);
      await page.waitForText("Access Limited", 15000);
      await page.navigate(`${BASE_URL}/admin/finance`);
      await page.waitForPath("/admin/live-match", 15000);
    });

    await test("seeded franchise admin stays on owned franchise dashboard", async () => {
      const pathname = await login(page, credentials.franchiseAdmin);
      assert(pathname === "/franchise", `Expected /franchise, received ${pathname}`);
      await page.waitForText("My Teams & Players", 20000);
      await page.waitForText("My Teams Snapshot", 20000);
      const order = await page.evaluate(`(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return {
          teamsPlayersIndex: bodyText.indexOf('my teams & players'),
          teamsSnapshotIndex: bodyText.indexOf('my teams snapshot'),
          hasOtherFranchises: bodyText.includes('all franchises')
        };
      })()`);
      assert(order.teamsPlayersIndex >= 0, "My Teams & Players section missing.");
      assert(order.teamsSnapshotIndex >= 0, "My Teams Snapshot section missing.");
      assert(
        order.teamsPlayersIndex < order.teamsSnapshotIndex,
        "My Teams & Players should appear above My Teams Snapshot."
      );
      assert(!order.hasOtherFranchises, "Franchise admin sees global franchise content.");
    });

    await test("franchise registration stays private until super admin approval", async () => {
      await registerFranchiseAdmin(page, registrationData);
      await page.waitForText("My Teams & Players", 20000);
      const franchiseBodyText = await page.getBodyText();
      assert(
        franchiseBodyText.toLowerCase().includes("add team"),
        "Registered franchise admin did not reach the dashboard add-team flow."
      );

      await page.clickByText("Add Team", ["button"]);
      await page.waitForText("ADD TEAM", 15000);
      await page.clickModalButton("Cancel");

      await page.navigate(`${BASE_URL}/`);
      await page.waitForText("FRANCHISES", 15000);
      const homeBeforeApproval = await page.getBodyText();
      assert(
        !homeBeforeApproval.includes(registrationData.franchiseName),
        "Pending franchise should not appear on the home page before approval."
      );

      await login(page, credentials.superAdmin);
      await page.navigate(`${BASE_URL}/admin/approvals`);
      await page.waitForText("All Approvals", 15000);
      assert(
        await page.tableRowExists(registrationData.franchiseName),
        "Registered franchise approval row was not found."
      );
      await page.clickRowAction(registrationData.franchiseName, "Approve");
      await page.waitFor(
        `[...document.querySelectorAll("table tbody tr")].some((row) => row.innerText.includes(${JSON.stringify(
          registrationData.franchiseName
        )}) && row.innerText.toLowerCase().includes('approved'))`,
        20000
      );

      await page.navigate(`${BASE_URL}/`);
      await page.waitForText("THE FRANCHISES", 15000);
      await page.waitForText(registrationData.franchiseName, 20000);
      const homeAfterApproval = await page.getBodyText();
      assert(
        homeAfterApproval.includes(registrationData.franchiseName),
        "Approved franchise did not appear on the home page."
      );
    });

    await test("registered franchise admin can sign in after approval", async () => {
      await login(page, {
        title: "Franchise Admin",
        email: registrationData.email,
        password: registrationData.password,
        expectedPath: "/franchise",
      });
      await page.waitForText("My Teams & Players", 20000);
      const bodyText = await page.getBodyText();
      assert(
        bodyText.includes(registrationData.franchiseName),
        "Approved registered franchise did not load its own dashboard."
      );
    });
  } finally {
    const browserErrors = [
      ...page.consoleMessages.filter((entry) =>
        ["error", "assert"].includes(String(entry.type || "").toLowerCase())
      ),
      ...page.exceptions.map((item) => ({
        type: "exception",
        message: item.text || item.exception?.description || "Unknown exception",
      })),
    ];

    const summary = {
      runToken: RUN_TOKEN,
      baseUrl: BASE_URL,
      artifacts: ARTIFACT_DIR,
      results,
      browserErrors,
    };

    console.log(JSON.stringify(summary, null, 2));

    await page.close();
    await cleanupBrowserUatData();

    const failed = results.filter((item) => item.status === "failed");
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
