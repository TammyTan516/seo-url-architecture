import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "base-state.json"), "utf8"));
const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const URL_TABLE_ID = tableId("URL资产主表");
const REDIRECT_TABLE_ID = tableId("重定向与URL变更表");

const redirectExtraFields = [
  select("Redirect Check", ["Pass", "Warning", "Fail", "Not Checked", "Not Required"]),
  number("Old URL HTTP Status", 0),
  url("Actual Final URL"),
  datetime("Last Checked At"),
  { name: "Validation Summary", type: "text" },
  select("Last Checked By", ["Manual", "Automation"]),
];

const redirectFields = ensureFields(REDIRECT_TABLE_ID, redirectExtraFields);
const urlFields = fieldMap(URL_TABLE_ID);
const urlRecords = listRecords(URL_TABLE_ID, urlFields).map(toUrlAsset);
const redirectRecords = listRecords(REDIRECT_TABLE_ID, redirectFields);
const existingById = new Map(
  redirectRecords
    .map((record) => [fieldText(record, "Redirect ID"), record.record_id])
    .filter(([key]) => key)
);

const candidates = urlRecords
  .filter((asset) => asset.url && asset.canonicalTarget)
  .filter((asset) => normalizeUrl(asset.url) !== normalizeUrl(asset.canonicalTarget))
  .filter((asset) => asset.status !== "Archived" && asset.status !== "Cancelled")
  .filter((asset) => asset.pageId.startsWith("other") || asset.language === "other" || asset.sitemapIncluded === "Missing");

const todayValue = today();
const summary = {
  candidateCount: candidates.length,
  created: 0,
  skippedExisting: 0,
  checkedAt: new Date().toISOString(),
};

for (const candidate of candidates) {
  const redirectId = redirectIdFor(candidate.url, candidate.canonicalTarget);
  if (existingById.has(redirectId)) {
    summary.skippedExisting += 1;
    continue;
  }

  const payload = {
    "Redirect ID": redirectId,
    "Old URL": candidate.url,
    "New URL": candidate.canonicalTarget,
    "Old Page ID": candidate.pageId,
    "New Page ID": candidate.hreflangPairPageId || "",
    "Redirect Type": "301",
    "Reason": candidate.language === "other" || candidate.pageId.startsWith("other") ? "Language Path Fix" : "URL Cleanup",
    "Status": "Requested",
    "Requested Date": todayValue,
    "Redirect Check": "Not Checked",
    "Validation Summary": "Auto-created from URL asset canonical mismatch. Tech should confirm whether this should be a 301 redirect, canonical-only fix, or cancelled.",
    "Last Checked By": "Automation",
  };

  createRecord(REDIRECT_TABLE_ID, toFieldIdRecord(payload, redirectFields));
  summary.created += 1;
}

fs.writeFileSync(path.join(PROJECT_ROOT, "redirect-table-setup-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

function ensureFields(tableIdValue, fields) {
  const existing = fieldMap(tableIdValue);
  for (const field of fields) {
    if (!existing.has(field.name)) {
      createField(tableIdValue, field);
    }
  }
  return fieldMap(tableIdValue);
}

function toUrlAsset(record) {
  return {
    pageId: fieldText(record, "Page ID"),
    url: normalizeUrl(fieldText(record, "Canonical URL")),
    canonicalTarget: normalizeUrl(fieldText(record, "Canonical Target")),
    status: fieldText(record, "Status"),
    language: fieldText(record, "Language"),
    sitemapIncluded: fieldText(record, "Sitemap Included"),
    hreflangPairPageId: fieldText(record, "Hreflang Pair Page ID"),
  };
}

function redirectIdFor(oldUrl, newUrl) {
  const oldPath = urlPath(oldUrl).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
  const newPath = urlPath(newUrl).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
  return `redirect_${oldPath}_to_${newPath}`.slice(0, 95);
}

function urlPath(value) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value;
  }
}

function select(name, options) {
  return { name, type: "select", multiple: false, options: options.map((option) => ({ name: option })) };
}

function url(name) {
  return { name, type: "text", style: { type: "url" } };
}

function number(name, precision = 2) {
  return { name, type: "number", style: { type: "plain", precision, percentage: false, thousands_separator: false } };
}

function datetime(name) {
  return { name, type: "datetime", style: { format: "yyyy-MM-dd HH:mm" } };
}

function createField(tableIdValue, field) {
  return cli(["base", "+field-create", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json", "--json", JSON.stringify(field)]);
}

function createRecord(tableIdValue, record) {
  return cli(["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json", "--json", JSON.stringify(record)]);
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
    const normalized = new URL(urlText);
    normalized.hash = "";
    normalized.search = "";
    if (normalized.pathname.length > 1) normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    return normalized.toString();
  } catch {
    return urlText;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
