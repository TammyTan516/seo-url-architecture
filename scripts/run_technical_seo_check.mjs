import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "base-state.json"), "utf8"));

const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const URL_TABLE_ID = tableId("URL资产主表");
const CHECK_TABLE_ID = tableId("技术SEO检查表");
const SITEMAP_URL = process.env.SEO_SITEMAP_URL || "https://example.com/sitemap.xml";
const ROBOTS_URL = process.env.SEO_ROBOTS_URL || "https://example.com/robots.txt";
const LIMIT = Number(process.env.SEO_TECH_CHECK_LIMIT || 120);
const urlFields = fieldMap(URL_TABLE_ID);
const checkFields = ensureCheckFields(CHECK_TABLE_ID);
const urlRecords = listRecords(URL_TABLE_ID, urlFields);
const checkRecords = listRecords(CHECK_TABLE_ID, checkFields);
const existingChecksById = new Map(checkRecords.map((record) => [fieldText(record, "Check ID"), record]).filter(([key]) => key));

const sitemapSet = new Set((await fetchSitemapUrls(SITEMAP_URL)).map(normalizeUrl));
const robotsTxt = await fetchText(ROBOTS_URL).catch(() => "");
const robotsRules = parseRobots(robotsTxt);

const todayString = today();
const targets = urlRecords
  .map((record) => toUrlAsset(record))
  .filter((asset) => asset.url)
  .filter((asset) => shouldCheck(asset))
  .slice(0, LIMIT);

const report = {
  targetCount: targets.length,
  created: 0,
  updated: 0,
  high: 0,
  medium: 0,
  low: 0,
  none: 0,
  errors: [],
  checkedAt: new Date().toISOString(),
};

for (const asset of targets) {
  const checkId = `${todayString}_${asset.pageId}`;
  try {
    const result = await inspectUrl(asset, sitemapSet, robotsRules);
    const payload = {
      "Check ID": checkId,
      "Page ID": asset.pageId,
      "URL": asset.url,
      "Check Date": todayString,
      "HTTP Status": result.httpStatus || 0,
      "Final URL": result.finalUrl || asset.url,
      "Title Check": result.titleCheck,
      "Meta Check": result.metaCheck,
      "H1 Check": result.h1Check,
      "Canonical Check": result.canonicalCheck,
      "Sitemap Check": result.sitemapCheck,
      "Robots Check": result.robotsCheck,
      "Hreflang Check": "Not Checked",
      "Index Status": asset.indexable === "No" ? "Noindex" : "Not Checked",
      "Issue Level": result.issueLevel,
      "Issue Summary": result.issueSummary,
      "Fix Status": result.issueLevel === "None" ? "Verified" : "Open",
      "Last Checked By": "Automation",
    };
    const existingRecord = existingChecksById.get(checkId);
    const recordId = existingRecord?.record_id;
    upsertCheck(recordId, payload);
    if (recordId) report.updated += 1;
    else report.created += 1;
    countIssue(report, result.issueLevel);
    if (result.issueLevel === "High" && fieldText(existingRecord, "High Alert Sent") !== "Yes") {
      const updatedRecordId = recordId || existingChecksById.get(checkId)?.record_id || findCheckRecordId(checkId);
      if (updatedRecordId) {
        triggerHighIssueWorkflow(updatedRecordId);
        upsertCheck(updatedRecordId, {
          "Issue Level": "High",
          "High Alert Sent": "Yes",
          "High Alert Sent At": nowForFeishu(),
        });
      }
      report.highAlertsSent = (report.highAlertsSent || 0) + 1;
    }
  } catch (error) {
    const payload = {
      "Check ID": checkId,
      "Page ID": asset.pageId,
      "URL": asset.url,
      "Check Date": todayString,
      "HTTP Status": 0,
      "Title Check": "Not Checked",
      "Meta Check": "Not Checked",
      "H1 Check": "Not Checked",
      "Canonical Check": "Not Checked",
      "Sitemap Check": asset.sitemapIncluded === "Yes" ? "Pass" : "Fail",
      "Robots Check": "Not Checked",
      "Hreflang Check": "Not Checked",
      "Index Status": "Unknown",
      "Issue Level": "High",
      "Issue Summary": `Fetch/check failed: ${String(error.message || error).slice(0, 300)}`,
      "Fix Status": "Open",
      "Last Checked By": "Automation",
    };
    const existingRecord = existingChecksById.get(checkId);
    const recordId = existingRecord?.record_id;
    upsertCheck(recordId, payload);
    if (recordId) report.updated += 1;
    else report.created += 1;
    report.high += 1;
    if (fieldText(existingRecord, "High Alert Sent") !== "Yes") {
      const updatedRecordId = recordId || existingChecksById.get(checkId)?.record_id || findCheckRecordId(checkId);
      if (updatedRecordId) {
        triggerHighIssueWorkflow(updatedRecordId);
        upsertCheck(updatedRecordId, {
          "Issue Level": "High",
          "High Alert Sent": "Yes",
          "High Alert Sent At": nowForFeishu(),
        });
      }
      report.highAlertsSent = (report.highAlertsSent || 0) + 1;
    }
    report.errors.push({ pageId: asset.pageId, url: asset.url, error: String(error.message || error) });
  }
}

fs.writeFileSync(path.join(PROJECT_ROOT, "technical-seo-check-summary.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

function shouldCheck(asset) {
  if (asset.status === "Archived" || asset.status === "Deprecated") return false;
  if (asset.indexable === "No") return false;
  if (!asset.url.startsWith("http")) return false;
  return asset.status === "Live" || asset.sitemapIncluded === "Yes" || asset.priority === "P0" || asset.priority === "P1";
}

async function inspectUrl(asset, sitemapSet, robotsRules) {
  const response = await fetch(asset.url, {
    redirect: "follow",
    headers: {
      "user-agent": "VertexLabs SEO URL Architecture Checker/1.0",
      "accept": "text/html,application/xhtml+xml",
    },
  });
  const finalUrl = normalizeUrl(response.url || asset.url);
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type") || "";
  const html = contentType.includes("text/html") ? await response.text() : "";

  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const h1Count = extractH1Count(html);
  const canonical = normalizeUrl(extractCanonical(html));
  const expectedCanonical = normalizeUrl(asset.canonicalTarget || asset.url);
  const robotBlocked = isBlockedByRobots(asset.url, robotsRules);

  const checks = {
    httpOk: httpStatus >= 200 && httpStatus < 300,
    sitemapOk: sitemapSet.has(normalizeUrl(asset.url)),
    robotsOk: !robotBlocked,
    titleCheck: checkTitle(title),
    metaCheck: checkMeta(metaDescription),
    h1Check: h1Count === 1 ? "Pass" : h1Count === 0 ? "Fail" : "Warning",
    canonicalCheck: canonical ? (canonical === expectedCanonical ? "Pass" : "Fail") : "Warning",
  };

  const issues = [];
  if (!checks.httpOk) issues.push(`HTTP status ${httpStatus}`);
  if (!checks.sitemapOk && asset.sitemapIncluded === "Yes") issues.push("URL expected in sitemap but not found");
  if (!checks.robotsOk) issues.push("Blocked by robots.txt");
  if (checks.titleCheck !== "Pass") issues.push(`Title ${checks.titleCheck.toLowerCase()}${title ? ` (${title.length} chars)` : ""}`);
  if (checks.metaCheck !== "Pass") issues.push(`Meta description ${checks.metaCheck.toLowerCase()}${metaDescription ? ` (${metaDescription.length} chars)` : ""}`);
  if (checks.h1Check !== "Pass") issues.push(`H1 ${checks.h1Check.toLowerCase()} (${h1Count} found)`);
  if (checks.canonicalCheck !== "Pass") issues.push(canonical ? `Canonical mismatch: ${canonical}` : "Canonical missing");

  return {
    httpStatus,
    finalUrl,
    titleCheck: checks.titleCheck,
    metaCheck: checks.metaCheck,
    h1Check: checks.h1Check,
    canonicalCheck: checks.canonicalCheck,
    sitemapCheck: checks.sitemapOk ? "Pass" : "Fail",
    robotsCheck: checks.robotsOk ? "Pass" : "Fail",
    issueLevel: issueLevel({ httpOk: checks.httpOk, robotsOk: checks.robotsOk, checks }),
    issueSummary: issues.length ? issues.join("; ") : "No major technical SEO issues detected.",
  };
}

function issueLevel({ httpOk, robotsOk, checks }) {
  if (!httpOk || !robotsOk || checks.canonicalCheck === "Fail") return "High";
  if (checks.sitemapOk === false || checks.titleCheck === "Fail" || checks.metaCheck === "Fail" || checks.h1Check === "Fail") return "Medium";
  if (checks.titleCheck === "Warning" || checks.metaCheck === "Warning" || checks.h1Check === "Warning" || checks.canonicalCheck === "Warning") return "Low";
  return "None";
}

function checkTitle(title) {
  if (!title) return "Fail";
  if (title.length < 30 || title.length > 65) return "Warning";
  return "Pass";
}

function checkMeta(meta) {
  if (!meta) return "Fail";
  if (meta.length < 80 || meta.length > 170) return "Warning";
  return "Pass";
}

function extractTitle(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\b(?=[^>]*\bname=["']description["'])([^>]*)>/i);
  return decodeHtml(attr(match?.[1] || "", "content")).trim();
}

function extractCanonical(html) {
  const match = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])([^>]*)>/i);
  return decodeHtml(attr(match?.[1] || "", "href")).trim();
}

function extractH1Count(html) {
  return [...html.matchAll(/<h1\b[^>]*>/gi)].length;
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

async function fetchSitemapUrls(sitemapUrl) {
  const response = await fetch(sitemapUrl);
  if (!response.ok) throw new Error(`Failed to fetch sitemap ${sitemapUrl}: ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => normalizeUrl(match[1])).filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function parseRobots(text) {
  const rules = [];
  let applies = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const [keyRaw, ...valueParts] = line.split(":");
    const key = keyRaw.trim().toLowerCase();
    const value = valueParts.join(":").trim();
    if (key === "user-agent") applies = value === "*";
    if (applies && key === "disallow" && value) rules.push(value);
  }
  return rules;
}

function isBlockedByRobots(urlValue, disallowRules) {
  const pathname = new URL(urlValue).pathname || "/";
  return disallowRules.some((rule) => rule !== "/" && pathname.startsWith(rule)) || disallowRules.includes("/");
}

function toUrlAsset(record) {
  return {
    recordId: record.record_id,
    pageId: fieldText(record, "Page ID"),
    url: normalizeUrl(fieldText(record, "Canonical URL")),
    canonicalTarget: normalizeUrl(fieldText(record, "Canonical Target")),
    status: fieldText(record, "Status"),
    indexable: fieldText(record, "Indexable"),
    sitemapIncluded: fieldText(record, "Sitemap Included"),
    priority: fieldText(record, "Priority"),
  };
}

function upsertCheck(recordId, record) {
  const args = ["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", CHECK_TABLE_ID, "--as", "user", "--format", "json", "--json", JSON.stringify(toFieldIdRecord(cleanRecord(record), checkFields))];
  if (recordId) args.push("--record-id", recordId);
  cli(args);
}

function countIssue(report, level) {
  if (level === "High") report.high += 1;
  else if (level === "Medium") report.medium += 1;
  else if (level === "Low") report.low += 1;
  else report.none += 1;
}

function ensureCheckFields(tableIdValue) {
  const fields = fieldMap(tableIdValue);
  const additions = [
    select("High Alert Sent", ["Yes", "No"]),
    datetime("High Alert Sent At"),
  ];
  for (const field of additions) {
    if (!fields.has(field.name)) {
      cli(["base", "+field-create", "--base-token", BASE_TOKEN, "--table-id", tableIdValue, "--as", "user", "--format", "json", "--json", JSON.stringify(field)]);
    }
  }
  return fieldMap(tableIdValue);
}

function triggerHighIssueWorkflow(recordId) {
  // Feishu's field-change workflow does not reliably fire when a record is created with Issue Level already set to High.
  // Toggling the value makes the existing High Issue workflow observe a real field change to High.
  upsertCheck(recordId, { "Issue Level": "Low" });
}

function findCheckRecordId(checkId) {
  const latestFields = fieldMap(CHECK_TABLE_ID);
  const latestRecords = listRecords(CHECK_TABLE_ID, latestFields);
  return latestRecords.find((record) => fieldText(record, "Check ID") === checkId)?.record_id || "";
}

function select(name, options) {
  return { name, type: "select", multiple: false, options: options.map((option) => ({ name: option })) };
}

function datetime(name) {
  return { name, type: "datetime", style: { format: "yyyy-MM-dd HH:mm" } };
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

function cleanRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value != null));
}

function fieldText(record, fieldName) {
  if (!record) return "";
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
