# SEO URL Architecture

A Feishu/Lark Bitable based workflow for managing SEO URL inventory, technical SEO checks, redirect validation, SEO metadata, keyword mapping, and page requests.

This repository is a public template. It does not include private workspace tokens, production URLs, user open IDs, logs, QR codes, spreadsheet exports, or company-specific data.

## What This Project Does

- Creates a Feishu/Lark Bitable schema for SEO URL management.
- Syncs URL assets from a sitemap.
- Checks technical SEO signals:
  - HTTP status
  - final URL
  - title
  - meta description
  - H1 count
  - canonical
  - sitemap presence
  - robots.txt blocking
- Tracks redirect and URL change requests.
- Validates old URLs against expected redirect/canonical behavior.
- Provides documentation templates for SEO and technical teams.

## Bitable Tables

The default schema creates these tables:

1. `URL资产主表`
2. `技术SEO检查表`
3. `SEO配置表`
4. `重定向与URL变更表`
5. `配置字典`
6. `关键词地图表`
7. `内容页面需求表`

`URL资产主表` is the central source of truth. Other tables should reference it by `Page ID`.

## Requirements

- Node.js 20+
- Feishu/Lark workspace access
- `@larksuite/cli`
- A Feishu/Lark Bitable app token

The scripts call the CLI through `npx -y @larksuite/cli`, so you do not need to install it globally.

## Setup

1. Clone the repository.

```bash
git clone <your-repo-url>
cd seo-url-architecture
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Fill in `.env`.

```bash
SEO_URL_BASE_TOKEN=your_bitable_app_token
SEO_SITEMAP_URL=https://example.com/sitemap.xml
SEO_ROBOTS_URL=https://example.com/robots.txt
SEO_CANONICAL_DOMAIN=example.com
SEO_WWW_DOMAIN=www.example.com
SEO_TECH_CHECK_LIMIT=120
SEO_REDIRECT_CHECK_LIMIT=120
```

4. Authenticate with Feishu/Lark.

```bash
npx -y @larksuite/cli auth login
```

5. Initialize the Bitable schema.

```bash
npm run init:base
```

This writes `base-state.json`, which stores generated table IDs. Do not commit `base-state.json`.

## Common Commands

Sync sitemap URLs into the URL asset table:

```bash
npm run sync:sitemap
```

Run technical SEO checks:

```bash
npm run check:technical
```

Create redirect candidate records from canonical mismatches:

```bash
npm run setup:redirects
```

Validate redirect records:

```bash
npm run check:redirects
```

## Scheduling

The shell wrappers in `scripts/*.sh` can be used with cron, launchd, GitHub Actions, or any scheduler.

Examples:

- Run sitemap sync daily.
- Run technical SEO checks twice per day.
- Run redirect validation after technical checks.

For production use, prefer a server, GitHub Actions, or a cloud scheduler over a personal laptop.

## Privacy And Security

Never commit:

- `.env`
- `base-state.json`
- Feishu/Lark app tokens
- user open IDs
- QR codes
- logs
- downloaded spreadsheets
- internal production URLs if your project is private

This template intentionally uses `example.com` and placeholder tokens.

## Documentation

- [Bitable schema](docs/bitable-schema.md)
- [User guide](docs/seo-url-management-user-guide.md)
- [Table headers](templates/table-headers.md)

## Notes

Feishu/Lark workflow automation rules are not fully portable because field IDs differ between Bases. Use this repository to create the table structure and run external checks; configure native Feishu/Lark notifications inside your own workspace or extend the scripts to generate workflows from your local field IDs.
