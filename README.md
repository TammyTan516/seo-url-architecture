# SEO URL Architecture

Feishu/Lark 多维表格驱动的 SEO URL 资产、技术 SEO 检查与重定向管理系统。  
A Feishu/Lark Bitable powered system for SEO URL inventory, technical SEO checks, and redirect management.

> 把网站 URL、sitemap、canonical、robots、redirect、SEO metadata 和页面需求集中到一套可自动检查的工作流里。  
> Centralize URL inventory, sitemap, canonical, robots, redirects, SEO metadata, and page requests into one inspectable workflow.

**语言 / Language**  
[中文](#中文) · [English](#english)

---

## 中文

### 项目定位

`SEO URL Architecture` 是一个公开模板，用于搭建网站技术 SEO 管理系统。它基于 Feishu/Lark 多维表格，把 URL 资产、SEO 配置、技术检查、重定向、关键词映射和页面需求放在同一个工作流里。

这个仓库不包含任何私人 workspace token、生产 URL、用户 open_id、日志、二维码、表格导出或公司内部数据。

### 它能做什么

- 创建一套 Feishu/Lark Bitable 表结构。
- 从 sitemap 自动同步 URL 资产。
- 自动检查技术 SEO 信号：
  - HTTP status
  - final URL
  - title
  - meta description
  - H1 count
  - canonical
  - sitemap presence
  - robots.txt blocking
- 跟踪重定向与 URL 变更需求。
- 校验旧 URL 是否按预期跳转或设置 canonical。
- 提供 SEO 和技术团队可直接使用的文档模板。

### 默认表结构

默认会创建 7 张表：

1. `URL资产主表`
2. `技术SEO检查表`
3. `SEO配置表`
4. `重定向与URL变更表`
5. `配置字典`
6. `关键词地图表`
7. `内容页面需求表`

`URL资产主表` 是核心台账，其他表建议通过 `Page ID` 和它关联。

### 环境要求

- Node.js 20.6+
- Feishu/Lark workspace 权限
- Feishu/Lark 多维表格 app token
- `@larksuite/cli`

脚本会通过 `npx -y @larksuite/cli` 调用 CLI，不需要全局安装。

### 快速开始

1. 克隆仓库。

```bash
git clone <your-repo-url>
cd seo-url-architecture
```

2. 创建环境变量文件。

```bash
cp .env.example .env
```

3. 填写 `.env`。

```bash
SEO_URL_BASE_TOKEN=your_bitable_app_token
SEO_SITEMAP_URL=https://example.com/sitemap.xml
SEO_ROBOTS_URL=https://example.com/robots.txt
SEO_CANONICAL_DOMAIN=example.com
SEO_WWW_DOMAIN=www.example.com
SEO_TECH_CHECK_LIMIT=120
SEO_REDIRECT_CHECK_LIMIT=120
```

4. 登录 Feishu/Lark。

```bash
npx -y @larksuite/cli auth login
```

5. 初始化多维表格结构。

```bash
npm run init:base
```

初始化后会生成 `base-state.json`，里面存放生成后的表 ID。不要提交这个文件。

### 常用命令

同步 sitemap URL 到 `URL资产主表`：

```bash
npm run sync:sitemap
```

运行技术 SEO 检查：

```bash
npm run check:technical
```

基于 canonical mismatch 生成重定向候选记录：

```bash
npm run setup:redirects
```

校验重定向记录：

```bash
npm run check:redirects
```

### 定时任务

`scripts/*.sh` 可以配合 cron、launchd、GitHub Actions 或云端定时任务使用。

推荐节奏：

- 每天同步 sitemap。
- 每天运行 1-2 次技术 SEO 检查。
- 技术 SEO 检查后运行重定向校验。

生产环境建议使用服务器、GitHub Actions 或云函数，不建议长期依赖个人电脑。

### 隐私与安全

不要提交：

- `.env`
- `base-state.json`
- Feishu/Lark app token
- 用户 open_id
- 二维码
- 日志
- 下载的表格文件
- 私有项目的生产 URL

这个模板默认使用 `example.com` 和占位 token。

### 文档

- [Bitable schema](docs/bitable-schema.md)
- [User guide](docs/seo-url-management-user-guide.md)
- [Table headers](templates/table-headers.md)

### 注意事项

Feishu/Lark 原生工作流不完全可移植，因为每个 Base 的字段 ID 都不同。这个仓库适合创建表结构和运行外部自动检查；通知类工作流建议在自己的 workspace 中配置，或基于本地字段 ID 扩展脚本生成。

[Back to top](#seo-url-architecture)

---

## English

### Overview

`SEO URL Architecture` is a public template for building a technical SEO management system. It uses Feishu/Lark Bitable to manage URL inventory, SEO metadata, technical checks, redirects, keyword mapping, and page requests in one workflow.

This repository does not include private workspace tokens, production URLs, user open IDs, logs, QR codes, spreadsheet exports, or company-specific data.

### What It Does

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
- Validates old URLs against expected redirect or canonical behavior.
- Provides documentation templates for SEO and engineering teams.

### Default Tables

The default schema creates 7 tables:

1. `URL资产主表`
2. `技术SEO检查表`
3. `SEO配置表`
4. `重定向与URL变更表`
5. `配置字典`
6. `关键词地图表`
7. `内容页面需求表`

`URL资产主表` is the central source of truth. Other tables should reference it through `Page ID`.

### Requirements

- Node.js 20.6+
- Feishu/Lark workspace access
- A Feishu/Lark Bitable app token
- `@larksuite/cli`

The scripts call the CLI through `npx -y @larksuite/cli`, so you do not need to install it globally.

### Quick Start

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

### Common Commands

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

### Scheduling

The shell wrappers in `scripts/*.sh` can be used with cron, launchd, GitHub Actions, or any scheduler.

Recommended cadence:

- Run sitemap sync daily.
- Run technical SEO checks once or twice per day.
- Run redirect validation after technical checks.

For production use, prefer a server, GitHub Actions, or a cloud scheduler over a personal laptop.

### Privacy And Security

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

### Documentation

- [Bitable schema](docs/bitable-schema.md)
- [User guide](docs/seo-url-management-user-guide.md)
- [Table headers](templates/table-headers.md)

### Notes

Feishu/Lark workflow automation rules are not fully portable because field IDs differ between Bases. Use this repository to create the table structure and run external checks; configure native Feishu/Lark notifications inside your own workspace or extend the scripts to generate workflows from your local field IDs.

[Back to top](#seo-url-architecture)
