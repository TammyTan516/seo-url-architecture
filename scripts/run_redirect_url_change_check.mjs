import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "base-state.json"), "utf8"));
const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const REDIRECT_TABLE_ID = tableId("重定向与URL变更表");
const LIMIT = Number(process.env.SEO_REDIRECT_CHECK_LIMIT || 120);

const fields = fieldMap(REDIRECT_TABLE_ID);
const records = listRecords(REDIRECT_TABLE_ID, fields)
  .map(toRedirectRecord)
  .filter((record) => record.oldUrl)
  .filter((record) => record.status !== "Cancelled")
  .slice(0, LIMIT);

const summary = {
  targetCount: records.length,
  updated: 0,
  pass: 0,
  warning: 0,
  fail: 0,
  errors: [],
  checkedAt: new Date().toISOString(),
};

for (const record of records) {
  try {
    const result = await validateRedirect(record);
    const payload = {
      "Old URL HTTP Status": result.httpStatus,
      "Actual Final URL": result.finalUrl,
      "Redirect Check": result.check,
      "Last Checked At": nowForFeishu(),
      "Validation Summary": result.summary,
      "Last Checked By": "Automation",
    };

    if ((record.status === "Configured" || record.status === "Failed" || record.status === "Verified") && result.check === "Pass") {
      payload.Status = "Verified";
      payload["Verified Date"] = today();
    } else if ((record.status === "Configured" || record.status === "Verified") && result.check === "Fail") {
      payload.Status = "Failed";
    }

    updateRecord(record.recordId, toFieldIdRecord(payload, fields));
    summary.updated += 1;
    count(summary, result.check);
  } catch (error) {
    const payload = {
      "Redirect Check": "Fail",
      "Last Checked At": nowForFeishu(),
      "Validation Summary": `Redirect validation failed: ${String(error.message || error).slice(0, 300)}`,
      "Last Checked By": "Automation",
    };
    if (record.status === "Configured" || record.status === "Verified") payload.Status = "Failed";
    updateRecord(record.recordId, toFieldIdRecord(payload, fields));
    summary.updated += 1;
    summary.fail += 1;
    summary.errors.push({ redirectId: record.redirectId, oldUrl: record.oldUrl, error: String(error.message || error) });
  }
}

fs.writeFileSync(path.join(PROJECT_ROOT, "redirect-url-change-check-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

async function validateRedirect(record) {
  const oldUrl = normalizeUrl(record.oldUrl);
  const expectedNewUrl = normalizeUrl(record.newUrl);
  const manual = await fetch(oldUrl, {
    redirect: "manual",
    headers: { "user-agent": "VertexLabs SEO Redirect Checker/1.0" },
  });
  const httpStatus = manual.status;
  const location = manual.headers.get("location") || "";
  const firstHop = normalizeUrl(location ? new URL(location, oldUrl).toString() : "");

  if (record.redirectType === "410") {
    return {
      httpStatus,
      finalUrl: oldUrl,
      check: httpStatus === 410 ? "Pass" : "Fail",
      summary: httpStatus === 410 ? "Old URL returns 410 as expected." : `Expected 410, got ${httpStatus}.`,
    };
  }

  if (record.redirectType === "Canonical Only") {
    const followed = await fetch(oldUrl, {
      redirect: "follow",
      headers: { "user-agent": "VertexLabs SEO Redirect Checker/1.0", accept: "text/html,application/xhtml+xml" },
    });
    const html = (followed.headers.get("content-type") || "").includes("text/html") ? await followed.text() : "";
    const canonical = normalizeUrl(extractCanonical(html));
    const pass = canonical && expectedNewUrl && canonical === expectedNewUrl;
    return {
      httpStatus: followed.status,
      finalUrl: normalizeUrl(followed.url || oldUrl),
      check: pass ? "Pass" : "Fail",
      summary: pass ? "Canonical target matches New URL." : `Canonical mismatch. Expected ${expectedNewUrl || "New URL"}, got ${canonical || "missing"}.`,
    };
  }

  const expectedStatus = Number(record.redirectType || 301);
  const followed = await fetch(oldUrl, {
    redirect: "follow",
    headers: { "user-agent": "VertexLabs SEO Redirect Checker/1.0" },
  });
  const finalUrl = normalizeUrl(followed.url || oldUrl);
  const statusPass = httpStatus === expectedStatus;
  const targetPass = expectedNewUrl ? finalUrl === expectedNewUrl || firstHop === expectedNewUrl : false;

  if (statusPass && targetPass) {
    return {
      httpStatus,
      finalUrl,
      check: "Pass",
      summary: `${record.redirectType} redirect is configured and reaches expected New URL.`,
    };
  }

  return {
    httpStatus,
    finalUrl,
    check: "Fail",
    summary: `Expected ${record.redirectType || "redirect"} to ${expectedNewUrl || "New URL"}, got status ${httpStatus}${firstHop ? ` first hop ${firstHop}` : ""}, final ${finalUrl}.`,
  };
}

function extractCanonical(html) {
  const match = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])([^>]*)>/i);
  return decodeHtml(attr(match?.[1] || "", "href")).trim();
}

function attr(attrs, name) {
  return attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}

function toRedirectRecord(record) {
  return {
    recordId: record.record_id,
    redirectId: fieldText(record, "Redirect ID"),
    oldUrl: normalizeUrl(fieldText(record, "Old URL")),
    newUrl: normalizeUrl(fieldText(record, "New URL")),
    redirectType: fieldText(record, "Redirect Type") || "301",
    status: fieldText(record, "Status"),
  };
}

function count(summary, check) {
  if (check === "Pass") summary.pass += 1;
  else if (check === "Warning") summary.warning += 1;
  else summary.fail += 1;
}

function fieldMap(tableIdValue) {
  const response = cli(["base", "+field-list", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json"]);
  return new Map((response.data.fields || []).map((field) => [field.name, field.id]));
}

function listRecords(tableIdValue, fieldsByName) {
  const response = cli(["base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json", "--limit", "500"]);
  const rows = response.data.data || [];
  const recordIds = response.data.record_id_list || [];
  const fieldIds = response.data.field_id_list || [];
  const namesById = new Map([...fieldsByName.entries()].map(([name, id]) => [id, name]));
  return recordIds.map((recordId, rowIndex) => {
    const fieldsObject = {};
    const row = rows[rowIndex] || [];
    for (let index = 0; index < fieldIds.length; index += 1) {
      fieldsObject[namesById.get(fieldIds[index]) || fieldIds[index]] = row[index];
    }
    return { record_id: recordId, fields: fieldsObject };
  });
}

function updateRecord(recordId, record) {
  return cli(["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", REDIRECT_TABLE_ID, "--record-id", recordId, "--as", "user", "--format", "json", "--json", JSON.stringify(record)]);
}

function toFieldIdRecord(record, fieldsByName) {
  return Object.fromEntries(
    Object.entries(record)
      .map(([name, value]) => [fieldsByName.get(name), value])
      .filter(([fieldId, value]) => fieldId && value !== "" && value != null)
  );
}

function fieldText(record, fieldName) {
  return valueText(record.fields?.[fieldName]);
}

function valueText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(valueText).join("");
  if (typeof value === "object") return value.text || value.name || value.value || value.link || "";
  return String(value);
}

function normalizeUrl(value) {
  const raw = valueText(value).trim();
  if (!raw) return "";
  const markdown = raw.match(/\((https?:\/\/[^)]+)\)/);
  const urlText = markdown ? markdown[1] : raw;
  try {
    const url = new URL(urlText);
    url.hash = "";
    url.search = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return urlText;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowForFeishu() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function tableId(name) {
  const table = STATE.tables.find((item) => item.name === name);
  if (!table) throw new Error(`Missing table ${name} in base-state.json`);
  return table.id;
}

function cli(args) {
  const result = spawnSync("npx", ["-y", "@larksuite/cli", ...args], {
    cwd: process.env.LARK_CLI_CWD || process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
  if (result.status !== 0) {
    throw new Error(`lark-cli ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
