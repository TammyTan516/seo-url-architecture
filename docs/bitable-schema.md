# 飞书多维表格结构方案

适用范围：ExampleSite 网站 URL 资产管理、技术 SEO、SEO 配置、关键词映射、重定向和上线追踪。

这个项目不替代现有 `content SEO workflow`。现有项目继续负责内容端产出；本项目负责网站 URL 和技术 SEO 管理。

## 1. URL资产主表

用途：网站所有可管理页面的唯一资产主表。每个正式页面一条记录。

建议表名：`URL资产主表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Page ID | 文本 | 是 | 页面唯一 ID，例如 `feature_product_page_en` |
| Page Name | 文本 | 是 | 页面内部名称，例如 `Product Feature Page - EN` |
| Canonical URL | URL | 是 | 标准收录 URL |
| URL Path | 文本 | 是 | 不含域名的路径，例如 `/en/features/product-feature` |
| Canonical Domain | 单选 | 是 | 建议默认 `example.com` |
| Language | 单选 | 是 | `en`, `zh` |
| Page Type | 单选 | 是 | 页面类型 |
| Page Group | 单选 | 否 | 页面分组，例如 `Core Product`, `Feature`, `Use Case`, `Blog`, `Help` |
| Parent Page ID | 文本 | 否 | 上级页面 ID |
| Status | 单选 | 是 | 页面生命周期状态 |
| Indexable | 单选 | 是 | 是否希望被搜索引擎收录 |
| Sitemap Included | 单选 | 是 | 是否应出现在 sitemap |
| Canonical Target | URL | 否 | canonical 指向 |
| Hreflang Pair Page ID | 文本 | 否 | 对应语言版本页面 |
| Owner | 人员 | 否 | 负责人，默认你自己 |
| Tech Owner | 人员 | 否 | 技术负责人 |
| Priority | 单选 | 是 | `P0`, `P1`, `P2`, `P3` |
| Source | 单选 | 否 | 来源：`Manual`, `Sitemap`, `content SEO workflow`, `CMS`, `Codebase` |
| Last Updated | 日期 | 否 | 最后更新时间 |
| Notes | 多行文本 | 否 | 备注 |

### 推荐单选项

`Canonical Domain`

```txt
example.com
www.example.com
other
```

`Language`

```txt
en
zh
other
```

`Page Type`

```txt
Homepage
Feature
Use Case
Blog Index
Blog Detail
Help Index
Help Detail
Landing Page
Legal
Pricing
Auth
Tool
Other
```

`Status`

```txt
Planned
Draft
Ready for SEO
Live
Needs Update
Deprecated
Redirected
Noindex
Archived
```

`Indexable`

```txt
Yes
No
TBD
```

`Sitemap Included`

```txt
Yes
No
Missing
Not Required
```

## 2. SEO配置表

用途：管理每个页面的 SEO 元信息和发布配置。

建议表名：`SEO配置表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| SEO Config ID | 文本 | 是 | 配置唯一 ID，例如 `seo_feature_product_page_en` |
| Page ID | 关联记录/文本 | 是 | 关联 `URL资产主表.Page ID` |
| Canonical URL | 查找/URL | 否 | 从 URL 主表带出 |
| SEO URL | URL/文本 | 是 | 预期发布 URL 或正式 URL |
| SEO Title | 文本 | 是 | title |
| Meta Description | 多行文本 | 是 | description |
| Primary Keyword | 文本 | 是 | 主关键词 |
| Secondary Keywords | 多行文本 | 否 | 辅助关键词 |
| H1 | 文本 | 否 | 页面 H1 |
| LLM Summary | 多行文本 | 否 | 给 LLM / AI 搜索理解的页面摘要 |
| Schema Type | 单选 | 否 | 结构化数据类型 |
| OG Title | 文本 | 否 | Open Graph title |
| OG Description | 多行文本 | 否 | Open Graph description |
| SEO Status | 单选 | 是 | SEO 配置状态 |
| Config Owner | 人员 | 否 | 配置负责人 |
| Last SEO Updated | 日期 | 否 | 最近 SEO 配置更新时间 |
| Notes | 多行文本 | 否 | 备注 |

### 推荐单选项

`Schema Type`

```txt
WebPage
Article
BlogPosting
FAQPage
SoftwareApplication
Product
BreadcrumbList
None
TBD
```

`SEO Status`

```txt
Not Started
Draft
Ready for Review
Approved
Configured
Needs Revision
Blocked
```

## 3. 关键词地图表

用途：建立关键词和目标页面的映射，避免关键词互相竞争。

建议表名：`关键词地图表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Keyword ID | 文本 | 是 | 关键词唯一 ID |
| Keyword | 文本 | 是 | 关键词 |
| Language | 单选 | 是 | `en`, `zh` |
| Search Intent | 单选 | 是 | 搜索意图 |
| Keyword Cluster | 文本 | 否 | 关键词组 |
| Target Page ID | 关联记录/文本 | 是 | 目标页面 |
| Target URL | 查找/URL | 否 | 从 URL 主表带出 |
| Priority | 单选 | 是 | `P0`, `P1`, `P2`, `P3` |
| Content Type | 单选 | 否 | 适合承接的内容类型 |
| Status | 单选 | 是 | 映射状态 |
| Notes | 多行文本 | 否 | 备注 |

### 推荐单选项

`Search Intent`

```txt
Informational
Commercial
Transactional
Navigational
Mixed
TBD
```

`Content Type`

```txt
Feature Page
Use Case Page
Blog
Help Article
Landing Page
Comparison
Tutorial
Listicle
Other
```

`Status`

```txt
Mapped
Needs Page
Needs Rewrite
Duplicate Risk
Paused
Rejected
```

## 4. 技术SEO检查表

用途：记录自动化或人工检查结果。

建议表名：`技术SEO检查表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Check ID | 文本 | 是 | 检查记录 ID |
| Page ID | 关联记录/文本 | 是 | 关联 URL 主表 |
| URL | URL | 是 | 检查 URL |
| Check Date | 日期 | 是 | 检查日期 |
| HTTP Status | 数字/单选 | 否 | `200`, `301`, `404`, `500` 等 |
| Final URL | URL | 否 | 跳转后的最终 URL |
| Title Check | 单选 | 否 | title 检查 |
| Meta Check | 单选 | 否 | description 检查 |
| H1 Check | 单选 | 否 | H1 检查 |
| Canonical Check | 单选 | 否 | canonical 检查 |
| Sitemap Check | 单选 | 否 | sitemap 检查 |
| Robots Check | 单选 | 否 | robots 检查 |
| Hreflang Check | 单选 | 否 | hreflang 检查 |
| Index Status | 单选 | 否 | 索引状态 |
| Issue Level | 单选 | 否 | 问题等级 |
| Issue Summary | 多行文本 | 否 | 问题摘要 |
| Fix Owner | 人员 | 否 | 修复负责人 |
| Fix Status | 单选 | 否 | 修复状态 |
| Last Checked By | 文本 | 否 | 检查来源：`Manual`, `Automation`, `GSC`, `Crawler` |

### 推荐单选项

通用检查字段：

```txt
Pass
Warning
Fail
Not Checked
Not Required
```

`Index Status`

```txt
Indexed
Discovered
Crawled Not Indexed
Excluded
Noindex
Unknown
Not Checked
```

`Issue Level`

```txt
High
Medium
Low
Info
None
```

`Fix Status`

```txt
Open
In Progress
Fixed
Verified
Won't Fix
Blocked
```

## 5. 重定向与URL变更表

用途：管理 URL 改版、合并、删除和 301/302 跳转。

建议表名：`重定向与URL变更表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Redirect ID | 文本 | 是 | 重定向记录 ID |
| Old URL | URL | 是 | 旧 URL |
| New URL | URL | 是 | 新 URL |
| Old Page ID | 文本/关联记录 | 否 | 旧页面 ID |
| New Page ID | 文本/关联记录 | 否 | 新页面 ID |
| Redirect Type | 单选 | 是 | `301`, `302`, `410`, `Canonical Only` |
| Reason | 单选 | 是 | 变更原因 |
| Status | 单选 | 是 | 配置状态 |
| Requested By | 人员 | 否 | 发起人 |
| Tech Owner | 人员 | 否 | 技术负责人 |
| Requested Date | 日期 | 否 | 发起日期 |
| Verified Date | 日期 | 否 | 验证日期 |
| Notes | 多行文本 | 否 | 备注 |

### 推荐单选项

`Reason`

```txt
URL Cleanup
Page Merge
Page Deprecated
Site Migration
Language Path Fix
Canonical Domain Fix
Content Refresh
Other
```

`Status`

```txt
Requested
Ready for Dev
Configured
Verified
Failed
Cancelled
```

## 6. 内容页面需求表

用途：承接内容端、Blog、专题页、落地页的新页面需求。后续可以与 `content SEO workflow` 做轻量同步，但现在先独立管理。

建议表名：`内容页面需求表`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Request ID | 文本 | 是 | 需求 ID |
| Request Type | 单选 | 是 | 新页面、更新页面、Blog 发布等 |
| Topic | 文本 | 是 | 主题 |
| Primary Keyword | 文本 | 否 | 目标关键词 |
| Target Page Type | 单选 | 是 | 目标页面类型 |
| Target Language | 单选 | 是 | 语言 |
| Draft Doc URL | URL | 否 | 飞书草稿文档 |
| Target URL Path | 文本 | 否 | 预期 URL path |
| Related Page ID | 文本/关联记录 | 否 | 如果是更新已有页面，关联页面 |
| Status | 单选 | 是 | 需求状态 |
| SEO Config ID | 文本/关联记录 | 否 | 关联 SEO 配置 |
| Published URL | URL | 否 | 上线 URL |
| Owner | 人员 | 否 | 负责人 |
| Notes | 多行文本 | 否 | 备注 |

### 推荐单选项

`Request Type`

```txt
New Page
Update Existing Page
Blog Publish
Help Article
Landing Page
Redirect Request
Technical Fix
```

`Status`

```txt
Idea
Approved
Drafting
SEO Ready
Ready for Dev
Live
Rejected
Paused
```

## 7. 配置字典

用途：保存固定配置和团队规则，避免散落在不同地方。

建议表名：`配置字典`

| 字段名 | 字段类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| Config Key | 文本 | 是 | 配置名 |
| Config Value | 多行文本 | 是 | 配置值 |
| Applies To | 文本 | 否 | 适用范围 |
| Owner | 人员 | 否 | 负责人 |
| Last Updated | 日期 | 否 | 更新时间 |
| Notes | 多行文本 | 否 | 备注 |

### 建议初始化配置

| Config Key | Config Value |
| --- | --- |
| canonical_domain | `https://example.com` |
| supported_languages | `en, zh` |
| default_blog_path_en | `/en/blog/read/` |
| default_blog_path_zh | `/zh/blog/read/` |
| sitemap_url | `https://example.com/sitemap.xml` |
| robots_url | `https://example.com/robots.txt` |
| title_length_rule | `建议 45-60 字符，最多不超过 65 字符` |
| meta_description_rule | `建议 120-155 字符，最多不超过 160 字符` |

## 推荐视图

### URL资产主表

- `全部页面`
- `P0页面`
- `已上线页面`
- `待SEO配置`
- `未进Sitemap`
- `Blog详情页`
- `Help详情页`
- `Deprecated/Redirected`

### SEO配置表

- `待配置`
- `待审核`
- `已配置`
- `需要修改`
- `缺SEO URL`

### 技术SEO检查表

- `High问题`
- `待技术修复`
- `已修复待验证`
- `Sitemap问题`
- `Canonical问题`
- `404/跳转问题`

### 重定向与URL变更表

- `待配置`
- `待验证`
- `已验证`
- `失败记录`

## 推荐权限

你个人：

- 管理员/可编辑全部字段

技术团队：

- URL资产主表：可查看，允许编辑 `Tech Owner`, `Status`, `Notes` 可选
- 技术SEO检查表：可查看，允许编辑 `Fix Status`, `Issue Summary`, `Notes` 可选
- 重定向与URL变更表：可查看，允许编辑 `Status`, `Verified Date`, `Notes` 可选

其他查询人员：

- 只读

## 后续自动化建议

确认表头后再做自动化，建议分三步：

1. Sitemap 同步：每天抓取 sitemap，更新 `URL资产主表`。
2. 技术检查：检查 HTTP、canonical、title、description、h1、robots、sitemap。
3. SEO 配置同步：从 `内容页面需求表` 或 `content SEO workflow` 结果同步到 `SEO配置表`。

