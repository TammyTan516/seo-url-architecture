import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "base-state.json"), "utf8"));

const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const URL_TABLE_ID = tableId("URL资产主表");
const SITEMAP_URL = process.env.SEO_SITEMAP_URL || "https://example.com/sitemap.xml";
const CANONICAL_DOMAIN = process.env.SEO_CANONICAL_DOMAIN || "example.com";
const WWW_DOMAIN = process.env.SEO_WWW_DOMAIN || `www.${CANONICAL_DOMAIN}`;

const fields = fieldMap(URL_TABLE_ID);
const existingRecords = listRecords(URL_TABLE_ID, fields);
const sitemapUrls = await fetchSitemapUrls(SITEMAP_URL);
const sitemapSet = new Set(sitemapUrls.map(normalizeUrl));

const byUrl = new Map();
for (const record of existingRecords) {
  const url = normalizeUrl(fieldText(record, "Canonical URL"));
  if (!url) continue;
  if (!byUrl.has(url)) byUrl.set(url, record);
}

const report = {
  sitemapUrlCount: sitemapSet.size,
  existingRecordCount: existingRecords.length,
  created: 0,
  updatedPresent: 0,
  markedMissing: 0,
  skippedManualMissing: 0,
  errors: [],
  syncedAt: new Date().toISOString(),
};

for (const url of sitemapSet) {
  const details = describeUrl(url);
  const payload = {
    "Page ID": details.pageId,
    "Page Name": details.pageName,
    "Canonical URL": url,
    "URL Path": details.path,
    "Canonical Domain": details.domain === WWW_DOMAIN ? WWW_DOMAIN : CANONICAL_DOMAIN,
    "Language": details.language,
    "Page Type": details.pageType,
    "Page Group": details.pageGroup,
    "Parent Page ID": details.parentPageId,
    "Status": "Live",
    "Indexable": "Yes",
    "Sitemap Included": "Yes",
    "Canonical Target": details.domain === WWW_DOMAIN ? url.replace(`https://${WWW_DOMAIN}`, `https://${CANONICAL_DOMAIN}`) : url,
    "Hreflang Pair Page ID": details.hreflangPairPageId,
    "Priority": details.priority,
    "Source": "Sitemap",
    "Last Updated": today(),
    "Notes": `Synced from sitemap: ${SITEMAP_URL}`,
  };

  const record = byUrl.get(url);
  if (record) {
    updateRecord(record.record_id, payload);
    report.updatedPresent += 1;
  } else {
    createRecord(payload);
    report.created += 1;
  }
}

for (const record of existingRecords) {
  const url = normalizeUrl(fieldText(record, "Canonical URL"));
  if (!url || sitemapSet.has(url)) continue;

  const sitemapIncluded = fieldText(record, "Sitemap Included");
  const source = fieldText(record, "Source");
  const status = fieldText(record, "Status");

  if (sitemapIncluded === "Missing" && status === "Needs Update") {
    report.skippedManualMissing += 1;
    continue;
  }

  const shouldMarkMissing =
    sitemapIncluded === "Yes" ||
    source === "Sitemap" ||
    status === "Live";

  if (!shouldMarkMissing) {
    report.skippedManualMissing += 1;
    continue;
  }

  updateRecord(record.record_id, {
    "Sitemap Included": "Missing",
    "Status": "Needs Update",
    "Indexable": fieldText(record, "Indexable") || "TBD",
    "Last Updated": today(),
    "Notes": appendNote(fieldText(record, "Notes"), `Missing from sitemap sync on ${today()}`),
  });
  report.markedMissing += 1;
}

fs.writeFileSync(path.join(PROJECT_ROOT, "sitemap-sync-summary.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

async function fetchSitemapUrls(sitemapUrl) {
  const response = await fetch(sitemapUrl);
  if (!response.ok) throw new Error(`Failed to fetch sitemap ${sitemapUrl}: ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => normalizeUrl(match[1]))
    .filter(Boolean);
}

function describeUrl(urlValue) {
  const parsed = new URL(urlValue);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const language = parts[0] === "en" || parts[0] === "zh" ? parts[0] : "other";
  const withoutLang = language === "other" ? parts : parts.slice(1);
  const pageType = inferPageType(withoutLang);
  const pairLang = language === "en" ? "zh" : language === "zh" ? "en" : "";
  const pageId = ([language, ...withoutLang].filter(Boolean).join("_") || `${language}_homepage`)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return {
    pageId,
    pageName: pageId.replace(/_/g, " "),
    path: parsed.pathname || "/",
    domain: parsed.hostname,
    language,
    pageType,
    pageGroup: inferPageGroup(pageType),
    parentPageId: withoutLang.length > 1
      ? [language, ...withoutLang.slice(0, -1)].filter(Boolean).join("_").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase()
      : "",
    hreflangPairPageId: pairLang
      ? [pairLang, ...withoutLang].join("_").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase()
      : "",
    priority: pageType === "Homepage" || pageType === "Feature" ? "P0" : pageType.includes("Blog") || pageType.includes("Help") ? "P2" : "P1",
  };
}

function inferPageType(parts) {
  if (parts.length === 0) return "Homepage";
  if (parts[0] === "features") return "Feature";
  if (parts[0] === "use-cases") return "Use Case";
  if (parts[0] === "blog" && parts.length === 1) return "Blog Index";
  if (parts[0] === "blog") return "Blog Detail";
  if (parts[0] === "help" && parts.length === 1) return "Help Index";
  if (parts[0] === "help") return "Help Detail";
  return "Landing Page";
}

function inferPageGroup(pageType) {
  if (pageType === "Homepage") return "Core Product";
  if (pageType === "Feature") return "Feature";
  if (pageType === "Use Case") return "Use Case";
  if (pageType.includes("Blog")) return "Blog";
  if (pageType.includes("Help")) return "Help";
  return "Other";
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

function createRecord(record) {
  cli(["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", URL_TABLE_ID, "--as", "user", "--format", "json", "--json", JSON.stringify(toFieldIdRecord(cleanRecord(record), fields))]);
}

function updateRecord(recordId, record) {
  cli(["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", URL_TABLE_ID, "--record-id", recordId, "--as", "user", "--format", "json", "--json", JSON.stringify(toFieldIdRecord(cleanRecord(record), fields))]);
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

function appendNote(existing, note) {
  if (!existing) return note;
  if (existing.includes(note)) return existing;
  return `${existing}\n${note}`;
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
