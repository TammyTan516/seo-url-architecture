import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE_TOKEN = requiredEnv("SEO_URL_BASE_TOKEN");
const CANONICAL_DOMAIN = process.env.SEO_CANONICAL_DOMAIN || "example.com";
const WWW_DOMAIN = process.env.SEO_WWW_DOMAIN || `www.${CANONICAL_DOMAIN}`;
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const STATE_PATH = path.join(ROOT, "base-state.json");

const commonSelect = {
  language: ["en", "zh", "other"],
  priority: ["P0", "P1", "P2", "P3"],
};

const tables = [
  {
    name: "URL资产主表",
    primaryField: { name: "Page ID", type: "text" },
    fields: [
      { name: "Page Name", type: "text" },
      url("Canonical URL"),
      { name: "URL Path", type: "text" },
      select("Canonical Domain", [CANONICAL_DOMAIN, WWW_DOMAIN, "other"]),
      select("Language", commonSelect.language),
      select("Page Type", ["Homepage", "Feature", "Use Case", "Blog Index", "Blog Detail", "Help Index", "Help Detail", "Landing Page", "Legal", "Pricing", "Auth", "Tool", "Other"]),
      select("Page Group", ["Core Product", "Feature", "Use Case", "Blog", "Help", "Legal", "System", "Other"]),
      { name: "Parent Page ID", type: "text" },
      select("Status", ["Planned", "Draft", "Ready for SEO", "Live", "Needs Update", "Deprecated", "Redirected", "Noindex", "Archived"]),
      select("Indexable", ["Yes", "No", "TBD"]),
      select("Sitemap Included", ["Yes", "No", "Missing", "Not Required"]),
      url("Canonical Target"),
      { name: "Hreflang Pair Page ID", type: "text" },
      user("Owner"),
      user("Tech Owner"),
      select("Priority", commonSelect.priority),
      select("Source", ["Manual", "Sitemap", "content SEO workflow", "CMS", "Codebase"]),
      date("Last Updated"),
      { name: "Notes", type: "text" },
    ],
  },
  {
    name: "SEO配置表",
    primaryField: { name: "SEO Config ID", type: "text" },
    fields: [
      { name: "Page ID", type: "text" },
      url("Canonical URL"),
      url("SEO URL"),
      { name: "SEO Title", type: "text" },
      { name: "Meta Description", type: "text" },
      { name: "Primary Keyword", type: "text" },
      { name: "Secondary Keywords", type: "text" },
      { name: "H1", type: "text" },
      { name: "LLM Summary", type: "text" },
      select("Schema Type", ["WebPage", "Article", "BlogPosting", "FAQPage", "SoftwareApplication", "Product", "BreadcrumbList", "None", "TBD"]),
      { name: "OG Title", type: "text" },
      { name: "OG Description", type: "text" },
      select("SEO Status", ["Not Started", "Draft", "Ready for Review", "Approved", "Configured", "Needs Revision", "Blocked"]),
      user("Config Owner"),
      date("Last SEO Updated"),
      { name: "Notes", type: "text" },
    ],
  },
  {
    name: "关键词地图表",
    primaryField: { name: "Keyword ID", type: "text" },
    fields: [
      { name: "Keyword", type: "text" },
      select("Language", commonSelect.language),
      select("Search Intent", ["Informational", "Commercial", "Transactional", "Navigational", "Mixed", "TBD"]),
      { name: "Keyword Cluster", type: "text" },
      { name: "Target Page ID", type: "text" },
      url("Target URL"),
      select("Priority", commonSelect.priority),
      select("Content Type", ["Feature Page", "Use Case Page", "Blog", "Help Article", "Landing Page", "Comparison", "Tutorial", "Listicle", "Other"]),
      select("Status", ["Mapped", "Needs Page", "Needs Rewrite", "Duplicate Risk", "Paused", "Rejected"]),
      { name: "Notes", type: "text" },
    ],
  },
  {
    name: "技术SEO检查表",
    primaryField: { name: "Check ID", type: "text" },
    fields: [
      { name: "Page ID", type: "text" },
      url("URL"),
      date("Check Date"),
      number("HTTP Status", 0),
      url("Final URL"),
      checkSelect("Title Check"),
      checkSelect("Meta Check"),
      checkSelect("H1 Check"),
      checkSelect("Canonical Check"),
      checkSelect("Sitemap Check"),
      checkSelect("Robots Check"),
      checkSelect("Hreflang Check"),
      select("Index Status", ["Indexed", "Discovered", "Crawled Not Indexed", "Excluded", "Noindex", "Unknown", "Not Checked"]),
      select("Issue Level", ["High", "Medium", "Low", "Info", "None"]),
      { name: "Issue Summary", type: "text" },
      user("Fix Owner"),
      select("Fix Status", ["Open", "In Progress", "Fixed", "Verified", "Won't Fix", "Blocked"]),
      select("Last Checked By", ["Manual", "Automation", "GSC", "Crawler"]),
    ],
  },
  {
    name: "重定向与URL变更表",
    primaryField: { name: "Redirect ID", type: "text" },
    fields: [
      url("Old URL"),
      url("New URL"),
      { name: "Old Page ID", type: "text" },
      { name: "New Page ID", type: "text" },
      select("Redirect Type", ["301", "302", "410", "Canonical Only"]),
      select("Reason", ["URL Cleanup", "Page Merge", "Page Deprecated", "Site Migration", "Language Path Fix", "Canonical Domain Fix", "Content Refresh", "Other"]),
      select("Status", ["Requested", "Ready for Dev", "Configured", "Verified", "Failed", "Cancelled"]),
      user("Requested By"),
      user("Tech Owner"),
      date("Requested Date"),
      date("Verified Date"),
      { name: "Notes", type: "text" },
    ],
  },
  {
    name: "内容页面需求表",
    primaryField: { name: "Request ID", type: "text" },
    fields: [
      select("Request Type", ["New Page", "Update Existing Page", "Blog Publish", "Help Article", "Landing Page", "Redirect Request", "Technical Fix"]),
      { name: "Topic", type: "text" },
      { name: "Primary Keyword", type: "text" },
      select("Target Page Type", ["Homepage", "Feature", "Use Case", "Blog Detail", "Help Detail", "Landing Page", "Other"]),
      select("Target Language", commonSelect.language),
      url("Draft Doc URL"),
      { name: "Target URL Path", type: "text" },
      { name: "Related Page ID", type: "text" },
      select("Status", ["Idea", "Approved", "Drafting", "SEO Ready", "Ready for Dev", "Live", "Rejected", "Paused"]),
      { name: "SEO Config ID", type: "text" },
      url("Published URL"),
      user("Owner"),
      { name: "Notes", type: "text" },
    ],
  },
  {
    name: "配置字典",
    primaryField: { name: "Config Key", type: "text" },
    fields: [
      { name: "Config Value", type: "text" },
      { name: "Applies To", type: "text" },
      user("Owner"),
      date("Last Updated"),
      { name: "Notes", type: "text" },
    ],
  },
];

function select(name, options) {
  return {
    name,
    type: "select",
    multiple: false,
    options: options.map((option) => ({ name: option })),
  };
}

function checkSelect(name) {
  return select(name, ["Pass", "Warning", "Fail", "Not Checked", "Not Required"]);
}

function url(name) {
  return { name, type: "text", style: { type: "url" } };
}

function user(name) {
  return { name, type: "user", multiple: false };
}

function date(name) {
  return { name, type: "datetime", style: { format: "yyyy-MM-dd" } };
}

function number(name, precision = 2) {
  return {
    name,
    type: "number",
    style: {
      type: "plain",
      precision,
      percentage: false,
      thousands_separator: false,
    },
  };
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

function baseArgs(...args) {
  return ["base", ...args, "--base-token", BASE_TOKEN, "--as", "user", "--format", "json"];
}

function listTables() {
  const response = cli(baseArgs("+table-list"));
  return response.data.tables || [];
}

function listFields(tableId) {
  const response = cli(baseArgs("+field-list", "--table-id", tableId));
  return response.data.fields || [];
}

function updateTable(tableId, name) {
  return cli(baseArgs("+table-update", "--table-id", tableId, "--name", name));
}

function createTable(name) {
  const response = cli(baseArgs("+table-create", "--name", name, "--fields", JSON.stringify([{ name: "TEMP_ID", type: "text" }])));
  return response.data.table;
}

function createField(tableId, field) {
  return cli(baseArgs("+field-create", "--table-id", tableId, "--json", JSON.stringify(field)));
}

function updateField(tableId, fieldId, field) {
  return cli(baseArgs("+field-update", "--table-id", tableId, "--field-id", fieldId, "--json", JSON.stringify(field), "--yes"));
}

const report = [];
let existingTables = listTables();

if (existingTables.length === 1 && existingTables[0].name === "数据表") {
  updateTable(existingTables[0].id, "URL资产主表");
  existingTables = listTables();
}

for (const spec of tables) {
  let table = existingTables.find((item) => item.name === spec.name);
  if (!table) {
    table = createTable(spec.name);
    existingTables.push(table);
    report.push(`created table ${spec.name}`);
  } else {
    report.push(`found table ${spec.name}`);
  }

  let fields = listFields(table.id);
  if (fields.length === 1 && (fields[0].name === "文本" || fields[0].name === "TEMP_ID")) {
    updateField(table.id, fields[0].id, spec.primaryField);
    report.push(`updated primary field ${spec.name}.${spec.primaryField.name}`);
    fields = listFields(table.id);
  }

  const fieldNames = new Set(fields.map((field) => field.name));
  if (!fieldNames.has(spec.primaryField.name)) {
    createField(table.id, spec.primaryField);
    report.push(`created field ${spec.name}.${spec.primaryField.name}`);
  }

  for (const field of spec.fields) {
    if (fieldNames.has(field.name)) continue;
    createField(table.id, field);
    fieldNames.add(field.name);
    report.push(`created field ${spec.name}.${field.name}`);
  }
}

fs.writeFileSync(STATE_PATH, JSON.stringify({ tables: listTables(), updatedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ ok: true, report, statePath: STATE_PATH }, null, 2));

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
