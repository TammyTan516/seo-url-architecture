import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "base-state.example.json"), "utf8"));
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const env = readDotEnv(ENV_PATH);

const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const SEO_CONFIG_TABLE_ID = tableId("SEO配置表");
const SPREADSHEET_TOKEN = requiredEnv("SEO_SPREADSHEET_TOKEN");
const SEO_CONFIG_SHEET_ID = requiredEnv("SEO_CONFIG_SHEET_ID");
const CANONICAL_DOMAIN = (process.env.SEO_CANONICAL_DOMAIN || env.SEO_CANONICAL_DOMAIN || "https://example.com").replace(/\/+$/, "");
const MAX_ROWS = Number(process.env.SEO_SYNC_MAX_ROWS || env.SEO_SYNC_MAX_ROWS || 500);
const DRY_RUN = process.argv.includes("--dry-run");

let fields = ensureFields(SEO_CONFIG_TABLE_ID, [
  { name: "Source Content ID", type: "text" },
  { name: "Blog Doc URL", type: "text", style: { type: "url" } },
  select("AI Workflow Status", ["已配置", "待配置", "待审核", "已同步", "失败"]),
  { name: "Last AI Workflow Sync At", type: "datetime", style: { format: "yyyy-MM-dd HH:mm" } },
  { name: "AI Workflow Sync Notes", type: "text" },
]);

const existingRecords = listBaseRecords(SEO_CONFIG_TABLE_ID, fields);
const existingByContentId = new Map();
const existingBySeoUrl = new Map();
const existingByConfigId = new Map();

for (const record of existingRecords) {
  const contentId = normalizeKey(fieldText(record, "Source Content ID"));
  const seoUrl = normalizeUrl(fieldText(record, "SEO URL"));
  const configId = normalizeKey(fieldText(record, "SEO Config ID"));
  if (contentId && !existingByContentId.has(contentId)) existingByContentId.set(contentId, record);
  if (seoUrl && !existingBySeoUrl.has(seoUrl)) existingBySeoUrl.set(seoUrl, record);
  if (configId && !existingByConfigId.has(configId)) existingByConfigId.set(configId, record);
}

const sheetRows = readSheet(`${SEO_CONFIG_SHEET_ID}!A1:N${MAX_ROWS}`);
const header = headerMap(sheetRows[0] || []);
const configuredRows = [];

for (let index = 1; index < sheetRows.length; index += 1) {
  const row = sheetRows[index] || [];
  const status = cellText(row, header, "Status").trim();
  const seoUrl = normalizeUrl(toAbsoluteUrl(cellText(row, header, "SEO URL")));
  const contentId = cellText(row, header, "Content ID").trim();
  if (status !== "已配置" || !seoUrl || !contentId) continue;
  configuredRows.push({ rowNumber: index + 1, row, status, seoUrl, contentId });
}

const report = {
  ok: true,
  dryRun: DRY_RUN,
  sourceRows: sheetRows.length > 0 ? sheetRows.length - 1 : 0,
  configuredRows: configuredRows.length,
  created: 0,
  updated: 0,
  errors: [],
  syncedAt: new Date().toISOString(),
};

for (const item of configuredRows) {
  try {
    const payload = buildSeoConfigPayload(item);
    const existing = findExistingRecord(payload);
    if (!DRY_RUN) upsertSeoConfig(existing?.record_id, payload);
    if (existing) report.updated += 1;
    else report.created += 1;
  } catch (error) {
    report.errors.push({ rowNumber: item.rowNumber, contentId: item.contentId, error: String(error.message || error) });
  }
}

fs.writeFileSync(path.join(PROJECT_ROOT, "ai-workflow-to-seo-config-sync-summary.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

function buildSeoConfigPayload({ row, rowNumber, status, seoUrl, contentId }) {
  const seoPath = urlPath(seoUrl);
  const pageId = pageIdFromUrl(seoUrl);
  const seoConfigId = `seo_ai_${pageId}`;
  const title = cellText(row, header, "SEO Title").trim();
  const meta = cellText(row, header, "Meta Description").trim();
  const keywords = cellText(row, header, "Keywords").trim();
  const secondary = cellText(row, header, "Secondary Keywords").trim();
  const llmSummary = cellText(row, header, "LLM Summary").trim();
  const blogDocUrl = firstUrl(cellText(row, header, "Blog Doc URL"));

  return {
    "SEO Config ID": seoConfigId,
    "Page ID": pageId,
    "Canonical URL": seoUrl,
    "SEO URL": seoUrl,
    "SEO Title": title,
    "Meta Description": meta,
    "Primary Keyword": firstKeyword(keywords),
    "Secondary Keywords": secondary || restKeywords(keywords),
    "H1": title,
    "LLM Summary": llmSummary,
    "Schema Type": seoPath.startsWith("/blog/") ? "BlogPosting" : "WebPage",
    "OG Title": title,
    "OG Description": meta,
    "SEO Status": "Configured",
    "Last SEO Updated": today(),
    "Notes": `Synced from AI workflow SEO config row ${rowNumber}.`,
    "Source Content ID": contentId,
    "Blog Doc URL": blogDocUrl,
    "AI Workflow Status": status,
    "Last AI Workflow Sync At": nowForFeishu(),
    "AI Workflow Sync Notes": `Source row ${rowNumber}.`,
  };
}

function findExistingRecord(payload) {
  const contentId = normalizeKey(payload["Source Content ID"]);
  const seoUrl = normalizeUrl(payload["SEO URL"]);
  const configId = normalizeKey(payload["SEO Config ID"]);
  return existingByContentId.get(contentId) || existingBySeoUrl.get(seoUrl) || existingByConfigId.get(configId) || null;
}

function upsertSeoConfig(recordId, record) {
  const args = ["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", SEO_CONFIG_TABLE_ID, "--as", "user", "--format", "json", "--json", JSON.stringify(toFieldIdRecord(cleanRecord(record), fields))];
  if (recordId) args.push("--record-id", recordId);
  cli(args);
}

function ensureFields(tableIdValue, requiredFields) {
  const existing = fieldMap(tableIdValue);
  for (const field of requiredFields) {
    if (existing.has(field.name)) continue;
    cli(["base", "+field-create", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json", "--json", JSON.stringify(field)]);
  }
  return fieldMap(tableIdValue);
}

function select(name, options) {
  return { name, type: "select", multiple: false, options: options.map((option) => ({ name: option })) };
}

function tableId(name) {
  const table = STATE.tables.find((item) => item.name === name);
  if (!table) throw new Error(`Missing table ${name} in base-state.example.json`);
  return table.id;
}

function fieldMap(tableIdValue) {
  const response = cli(["base", "+field-list", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json"]);
  return new Map((response.data.fields || []).map((field) => [field.name, field.id]));
}

function listBaseRecords(tableIdValue, fieldsByName) {
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

function readSheet(range) {
  const response = cli(["sheets", "+read", "--as", "user", "--spreadsheet-token", SPREADSHEET_TOKEN, "--range", range]);
  return response.data?.valueRange?.values || [];
}

function headerMap(headers) {
  const map = {};
  headers.forEach((headerValue, index) => {
    const normalized = normalizeHeader(valueText(headerValue));
    if (normalized) map[normalized] = index + 1;
  });
  return map;
}

function cellText(row, map, headerName) {
  const colIndex = map[normalizeHeader(headerName)];
  if (!colIndex) return "";
  return valueText(row[colIndex - 1]);
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

function toFieldIdRecord(record, fieldsByName) {
  return Object.fromEntries(
    Object.entries(record)
      .map(([name, value]) => [fieldsByName.get(name), value])
      .filter(([fieldId, value]) => fieldId && value !== "" && value != null)
  );
}

function cleanRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value != null));
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUrl(value) {
  const raw = valueText(value).trim();
  if (!raw) return "";
  const markdown = raw.match(/\((https?:\/\/[^)]+)\)/);
  const urlText = markdown ? markdown[1] : raw;
  try {
    const url = new URL(urlText, CANONICAL_DOMAIN);
    url.hash = "";
    url.search = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return urlText;
  }
}

function toAbsoluteUrl(value) {
  const text = valueText(value).trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("/")) return `${CANONICAL_DOMAIN}${text}`;
  return text;
}

function urlPath(value) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return "";
  }
}

function pageIdFromUrl(value) {
  const pathValue = urlPath(value);
  const normalized = pathValue.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return normalized || "homepage";
}

function firstUrl(value) {
  const text = valueText(value);
  return text.match(/https?:\/\/\S+/)?.[0] || text;
}

function firstKeyword(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean)[0] || "";
}

function restKeywords(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(1).join(", ");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowForFeishu() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function readDotEnv(filePath) {
  const output = {};
  if (!fs.existsSync(filePath)) return output;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    output[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
  }
  return output;
}

function requiredEnv(key) {
  const value = process.env[key] || env[key];
  if (!value) throw new Error(`Missing ${key}. Expected it in ${ENV_PATH}`);
  return value;
}

function cli(args) {
  const result = spawnSync("npx", ["-y", "@larksuite/cli", ...args], {
    cwd: process.env.LARK_CLI_CWD || PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
  });
  if (result.status !== 0) {
    throw new Error(`lark-cli ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
}
