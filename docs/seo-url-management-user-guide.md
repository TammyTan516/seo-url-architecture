# SEO URL 管理系统使用说明

更新时间：2026-06-11

## 1. 系统定位

「SEO URL 管理系统」是网站 SEO 资产管理系统，不是内容生产表。它主要用于管理 V2Fun 网站的 URL 资产、SEO 配置、技术 SEO 检查、重定向变更、关键词映射和页面需求。

核心目标：

- 知道网站当前有哪些 URL。
- 判断哪些 URL 应该被收录，哪些不应该被收录。
- 识别 sitemap、canonical、robots、redirect 等技术 SEO 问题。
- 记录 SEO 配置是否完成。
- 帮助技术团队优先处理高风险问题。

## 2. 每天优先看什么

每天建议按这个顺序检查：

1. 技术SEO检查表：优先看 `Issue Level = High / Medium`。
2. URL资产主表：优先看 `Sitemap Included = Missing`、`Indexable = TBD`、`Status = Needs Update`、`Priority = P0 / P1`。
3. 重定向与URL变更表：优先看 `Redirect Check = Fail`、`Status = Requested / Ready for Dev / Configured`。
4. SEO配置表：优先看 P0/P1 页面是否缺 SEO 配置，或 `SEO Status != Configured`。

## 3. URL资产主表

### 用途

这是整个系统的主表，相当于网站 URL 台账。所有页面都应该最终在这里有一条记录。

主要用于：

- 管理所有页面 URL。
- 判断页面是否上线、是否可收录、是否进入 sitemap。
- 标记页面优先级和负责人。
- 给技术 SEO 检查、SEO 配置、重定向表提供基础数据。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Page ID | 页面唯一 ID，其他表会用它做关联。不要随便改。 | 自动/人工 |
| Page Name | 页面名称，方便人工识别。 | 人工 |
| Canonical URL | 页面当前标准 URL。SEO 和技术都应以此为准。 | 自动/人工 |
| URL Path | URL 路径，例如 `/en/features/ai-image-generator`。 | 自动 |
| Canonical Domain | 规范域名，例如 `example.com`。 | 自动/人工 |
| Language | 页面语言。 | 自动/人工 |
| Page Type | 页面类型，例如 Feature、Use Case、Blog Detail、Help Detail。 | 自动/人工 |
| Page Group | 页面所属模块，例如 Feature、Blog、Help、Core Product。 | 自动/人工 |
| Parent Page ID | 父页面 ID，用于页面层级关系。 | 人工 |
| Status | 页面生命周期状态。 | 自动/人工 |
| Indexable | 页面是否允许被搜索引擎收录。 | 自动/人工 |
| Sitemap Included | 页面是否在 sitemap 中。 | 自动 |
| Canonical Target | 页面 canonical 指向的目标 URL。 | 自动/人工 |
| Hreflang Pair Page ID | 多语言对应页面 ID。 | 自动/人工 |
| Owner | SEO/内容负责人。 | 人工 |
| Tech Owner | 技术负责人。 | 人工 |
| Priority | 页面优先级。 | 自动/人工 |
| Source | 数据来源，例如 Sitemap、Manual、SEO content workflow。 | 自动 |
| Last Updated | 最近更新时间。 | 自动 |
| Notes | 备注。 | 人工 |

### 下拉菜单含义

`Language`

- `en`：英文页面。
- `zh`：中文页面。
- `other`：未归入标准语言路径，通常需要排查。

`Status`

- `Planned`：计划中。
- `Draft`：草稿。
- `Ready for SEO`：等待 SEO 配置。
- `Live`：已上线，正常页面。
- `Needs Update`：需要更新或确认。
- `Deprecated`：废弃页面。
- `Redirected`：已重定向。
- `Noindex`：不希望被搜索引擎收录。
- `Archived`：归档页面。

`Indexable`

- `Yes`：可收录。
- `No`：不应收录。
- `TBD`：待确认。

`Sitemap Included`

- `Yes`：已在 sitemap。
- `No`：不在 sitemap。
- `Missing`：应该关注，可能没被 sitemap 收录。
- `Not Required`：不需要进入 sitemap。

`Priority`

- `P0`：最高优先级，核心页面，技术必须优先看。
- `P1`：重要 SEO 页面。
- `P2`：普通页面。
- `P3`：低优先级页面。

### 风险判断

安全：

- `Status = Live`
- `Indexable = Yes`
- `Sitemap Included = Yes`
- `Canonical URL = Canonical Target`

需要排查：

- `Sitemap Included = Missing`
- `Indexable = TBD`
- `Language = other`
- `Status = Needs Update`
- `Canonical URL` 和 `Canonical Target` 不一致

高风险：

- P0/P1 页面缺 sitemap。
- 核心页面 `Indexable = No`。
- 页面仍为 `Live`，但 canonical 指向其他 URL。
- 无语言路径旧 URL 仍返回 200，而不是 301 到标准 URL。

## 4. 技术SEO检查表

### 用途

这是自动化检查结果表。每天主要看 `Issue Level`。

主要用于检查：

- HTTP 状态。
- Final URL。
- Title / Meta / H1。
- Canonical。
- Sitemap。
- Robots。
- 技术 SEO 风险等级。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Check ID | 检查记录唯一 ID，通常是 `日期_Page ID`。 | 自动 |
| Page ID | 对应 URL 资产主表的页面 ID。 | 自动 |
| URL | 被检查的 URL。 | 自动 |
| Check Date | 检查日期。 | 自动 |
| HTTP Status | 页面返回状态码。 | 自动 |
| Final URL | 自动跟随跳转后的最终 URL。 | 自动 |
| Title Check | Title 检查结果。 | 自动 |
| Meta Check | Meta Description 检查结果。 | 自动 |
| H1 Check | H1 检查结果。 | 自动 |
| Canonical Check | Canonical 检查结果。 | 自动 |
| Sitemap Check | Sitemap 检查结果。 | 自动 |
| Robots Check | Robots 检查结果。 | 自动 |
| Hreflang Check | Hreflang 检查结果，目前预留。 | 自动/预留 |
| Index Status | 索引状态，目前预留或人工补充。 | 自动/人工 |
| Issue Level | 问题风险等级。 | 自动 |
| Issue Summary | 自动生成的问题说明。 | 自动 |
| Fix Owner | 修复负责人。 | 自动/人工 |
| Fix Status | 修复状态。 | 人工 |
| Last Checked By | 检查来源。 | 自动 |
| High Alert Sent | High 问题是否已提醒过。 | 自动 |
| High Alert Sent At | High 问题提醒时间。 | 自动 |

### 下拉菜单含义

`Title Check / Meta Check / H1 Check / Canonical Check / Sitemap Check / Robots Check / Hreflang Check`

- `Pass`：检查通过。
- `Warning`：有风险，但不一定需要技术立即处理。
- `Fail`：检查失败，需要排查。
- `Not Checked`：未检查。
- `Not Required`：不需要检查。

`Issue Level`

- `High`：高风险，技术优先处理。
- `Medium`：中风险，建议排期。
- `Low`：低风险，多为标题、meta 长度问题。
- `Info`：信息提示。
- `None`：未发现明显问题。

`Fix Status`

- `Open`：待处理。
- `In Progress`：处理中。
- `Fixed`：已修复，等待验证。
- `Verified`：已验证。
- `Won't Fix`：确认不修。
- `Blocked`：被阻塞。

`High Alert Sent`

- `Yes`：该 High 问题已经发过提醒，避免重复通知。
- `No`：未提醒。

### 风险判断

安全：

- `Issue Level = None`
- 或只有少量 `Low`

需要排查：

- `Issue Level = Medium`
- `Canonical Check = Warning`
- `Meta Check = Fail`
- `Sitemap Check = Fail`

高风险：

- `Issue Level = High`
- `HTTP Status` 非 2xx。
- `Canonical Check = Fail`。
- `Robots Check = Fail`。
- P0/P1 页面出现任何 High。

## 5. SEO配置表

### 用途

这是页面 SEO 元信息配置表，偏 SEO 内容和配置，不是技术检查表。

主要用于：

- 管理 SEO Title。
- 管理 Meta Description。
- 管理关键词。
- 管理 H1、Schema、OG 信息。
- 标记 SEO 是否配置完成。
- 同步到旧的 SEO workflow 表格。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| SEO Config ID | SEO 配置唯一 ID。 | 自动/人工 |
| Page ID | 对应 URL 资产主表的 Page ID。 | 自动/人工 |
| Canonical URL | 页面标准 URL。 | 自动/人工 |
| SEO URL | 最终配置 SEO 的 URL。 | 人工/自动同步 |
| SEO Title | 页面 SEO 标题。 | 人工 |
| Meta Description | 页面 meta description。 | 人工 |
| Primary Keyword | 主关键词。 | 人工 |
| Secondary Keywords | 辅助关键词。 | 人工 |
| H1 | 页面主标题。 | 人工 |
| LLM Summary | 给 AI/LLM 理解页面内容的摘要。 | 人工 |
| Schema Type | 结构化数据类型。 | 人工 |
| OG Title | 社交分享标题。 | 人工 |
| OG Description | 社交分享描述。 | 人工 |
| SEO Status | SEO 配置状态。 | 人工 |
| Config Owner | 配置负责人。 | 人工 |
| Last SEO Updated | 最后 SEO 更新时间。 | 自动/人工 |
| Notes | 备注。 | 人工 |

### 下拉菜单含义

`Schema Type`

- `WebPage`：普通网页。
- `Article`：文章。
- `BlogPosting`：博客文章。
- `FAQPage`：FAQ 页面。
- `SoftwareApplication`：软件/应用页面。
- `Product`：产品页面。
- `BreadcrumbList`：面包屑结构。
- `None`：不配置。
- `TBD`：待确认。

`SEO Status`

- `Not Started`：未开始。
- `Draft`：草稿。
- `Ready for Review`：待审核。
- `Approved`：已批准。
- `Configured`：已配置完成。
- `Needs Revision`：需要修改。
- `Blocked`：阻塞。

### 风险判断

安全：

- `SEO Status = Configured`
- SEO Title、Meta Description、H1 都完整。
- SEO URL 和 URL资产主表一致。

需要排查：

- `SEO Status = Draft / Needs Revision / Blocked`
- `SEO URL` 为空。
- `SEO Title` 或 `Meta Description` 为空。

高风险：

- P0/P1 页面没有 SEO 配置。
- 页面已 Live，但 `SEO Status` 不是 `Configured`。
- SEO URL 和 Canonical URL 不一致但没有说明。

## 6. 重定向与URL变更表

### 用途

这是 URL 迁移、旧 URL、301、410 的管理表。

主要用于：

- 记录旧 URL 到新 URL 的变更。
- 校验旧 URL 是否真的 301 到目标 URL。
- 记录 URL 清理、语言路径修正、域名规范化。
- 防止旧 URL 失控、404、重复收录。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Redirect ID | 重定向记录唯一 ID。 | 自动/人工 |
| Old URL | 旧 URL。 | 人工/自动 |
| New URL | 目标 URL。 | 人工/自动 |
| Old Page ID | 旧页面 ID。 | 自动/人工 |
| New Page ID | 新页面 ID。 | 自动/人工 |
| Redirect Type | 重定向类型。 | 人工 |
| Reason | 变更原因。 | 自动/人工 |
| Status | 处理状态。 | 人工/自动 |
| Requested By | 提出人。 | 人工 |
| Tech Owner | 技术负责人。 | 人工 |
| Requested Date | 提出日期。 | 自动/人工 |
| Verified Date | 验证通过日期。 | 自动 |
| Notes | 备注。 | 人工 |
| Redirect Check | 自动校验结果。 | 自动 |
| Old URL HTTP Status | 旧 URL 当前返回状态码。 | 自动 |
| Actual Final URL | 旧 URL 最终跳转到哪里。 | 自动 |
| Last Checked At | 最近检查时间。 | 自动 |
| Validation Summary | 自动校验说明。 | 自动 |
| Last Checked By | 检查来源。 | 自动 |

### 下拉菜单含义

`Redirect Type`

- `301`：永久重定向，SEO 最常用。
- `302`：临时重定向，不建议长期用于 SEO URL 迁移。
- `410`：页面永久删除。
- `Canonical Only`：不跳转，只用 canonical 指向目标。

`Reason`

- `URL Cleanup`：URL 清理。
- `Page Merge`：页面合并。
- `Page Deprecated`：页面废弃。
- `Site Migration`：站点迁移。
- `Language Path Fix`：语言路径修正。
- `Canonical Domain Fix`：规范域名修正。
- `Content Refresh`：内容更新导致 URL 变化。
- `Other`：其他。

`Status`

- `Requested`：已提出需求。
- `Ready for Dev`：可交给技术。
- `Configured`：技术已配置，等待自动校验。
- `Verified`：自动校验通过。
- `Failed`：自动校验失败。
- `Cancelled`：取消。

`Redirect Check`

- `Pass`：符合预期。
- `Warning`：有风险但不一定失败。
- `Fail`：不符合预期。
- `Not Checked`：未检查。
- `Not Required`：不需要检查。

### 风险判断

安全：

- `Redirect Type = 301`
- `Redirect Check = Pass`
- `Status = Verified`

需要排查：

- `Status = Requested / Ready for Dev` 长期未处理。
- `Redirect Check = Not Checked`。
- `Redirect Type = 302` 但实际是长期 SEO 迁移。

高风险：

- `Redirect Check = Fail`。
- 旧 URL 返回 200，但应该跳转。
- 旧 URL 返回 404。
- 最终 URL 不是 `New URL`。
- P0/P1 页面迁移没有 301。

## 7. 关键词地图表

### 用途

这是关键词和页面的映射表。

主要用于：

- 管理关键词应该对应哪个页面。
- 避免多个页面抢同一个关键词。
- 判断哪些关键词缺页面。
- 支持后续内容规划。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Keyword ID | 关键词记录 ID。 | 人工/自动 |
| Keyword | 关键词。 | 人工 |
| Language | 关键词语言。 | 人工 |
| Search Intent | 搜索意图。 | 人工 |
| Keyword Cluster | 关键词分组。 | 人工 |
| Target Page ID | 目标页面 ID。 | 人工 |
| Target URL | 目标页面 URL。 | 人工 |
| Priority | 关键词优先级。 | 人工 |
| Content Type | 适合承接关键词的内容类型。 | 人工 |
| Status | 映射状态。 | 人工 |
| Notes | 备注。 | 人工 |

### 下拉菜单含义

`Search Intent`

- `Informational`：信息型。
- `Commercial`：商业调研型。
- `Transactional`：交易型。
- `Navigational`：导航型。
- `Mixed`：混合。
- `TBD`：待判断。

`Status`

- `Mapped`：已映射。
- `Needs Page`：需要新页面。
- `Needs Rewrite`：需要重写页面。
- `Duplicate Risk`：有关键词冲突风险。
- `Paused`：暂停。
- `Rejected`：不做。

### 风险判断

安全：

- `Status = Mapped`
- 一个主关键词对应一个明确页面。

需要排查：

- `Needs Page`
- `Needs Rewrite`
- `TBD`

高风险：

- `Duplicate Risk`。
- 高优先级关键词没有目标页面。
- 多个页面抢同一个核心关键词。

## 8. 内容页面需求表

### 用途

这是新页面、内容更新、技术修复需求池。

主要用于：

- 记录要新增或更新的页面。
- 管理内容需求状态。
- 连接 SEO 配置表和 URL 资产表。
- 给内容、SEO、技术之间传递需求。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Request ID | 需求 ID。 | 人工/自动 |
| Request Type | 需求类型。 | 人工 |
| Topic | 主题。 | 人工 |
| Primary Keyword | 主关键词。 | 人工 |
| Target Page Type | 目标页面类型。 | 人工 |
| Target Language | 目标语言。 | 人工 |
| Draft Doc URL | 草稿文档。 | 人工 |
| Target URL Path | 计划 URL 路径。 | 人工 |
| Related Page ID | 关联页面。 | 人工 |
| Status | 需求状态。 | 人工 |
| SEO Config ID | 对应 SEO 配置 ID。 | 人工/自动 |
| Published URL | 上线 URL。 | 人工/自动 |
| Owner | 负责人。 | 人工 |
| Notes | 备注。 | 人工 |

### 下拉菜单含义

`Request Type`

- `New Page`：新页面。
- `Update Existing Page`：更新已有页面。
- `Blog Publish`：博客发布。
- `Help Article`：帮助文档。
- `Landing Page`：落地页。
- `Redirect Request`：重定向需求。
- `Technical Fix`：技术修复。

`Status`

- `Idea`：想法。
- `Approved`：已批准。
- `Drafting`：撰写中。
- `SEO Ready`：SEO 已准备。
- `Ready for Dev`：可交给技术。
- `Live`：已上线。
- `Rejected`：拒绝。
- `Paused`：暂停。

### 风险判断

安全：

- `Live`
- `SEO Ready` 且信息完整。

需要排查：

- `Approved` 但长期没有推进。
- `Ready for Dev` 但没有上线。
- 缺 `Target URL Path`。

高风险：

- 已上线但没有进入 URL资产主表。
- 已上线但没有 SEO配置表记录。
- 重要页面没有关键词映射。

## 9. 配置字典

### 用途

这是系统配置表，不是每天操作表。

主要用于：

- 存放系统规则。
- 存放 canonical domain、sitemap、robots、语言、标题长度规则等。
- 后续自动化脚本可以读取这里的配置。

### 字段说明

| 字段 | 含义 | 维护方式 |
| --- | --- | --- |
| Config Key | 配置名称。 | 人工 |
| Config Value | 配置值。 | 人工 |
| Applies To | 适用于哪个表或流程。 | 人工 |
| Owner | 负责人。 | 人工 |
| Last Updated | 更新时间。 | 人工 |
| Notes | 备注。 | 人工 |

### 风险判断

安全：

- 配置值正确。
- sitemap、robots、canonical domain 都是当前线上值。

需要排查：

- canonical domain 变了但这里没更新。
- sitemap URL 变了但脚本还读旧地址。
- title/meta 规则调整后没有同步。

## 10. 自动化运行时间

当前本地自动化任务依赖你的电脑开机并登录用户会话。

| 自动化 | 运行时间 | 作用 |
| --- | --- | --- |
| Sitemap 同步 | 每天 11:00、17:00 | 从 sitemap 更新 URL资产主表 |
| 技术 SEO 检查 | 每天 11:30、17:30 | 检查 HTTP、canonical、sitemap、robots、title/meta/H1 |
| 重定向校验 | 每天 11:45、17:45 | 校验旧 URL 是否按预期跳转 |
| SEO配置表同步旧工作流 | 每小时 | 将 `SEO Status = Configured` 的记录同步到旧 SEO workflow 表格 |

## 11. 总体风险等级

安全状态：

- URL 在 sitemap 中。
- 页面可收录。
- HTTP 200。
- canonical 正确。
- SEO 配置完成。
- 重定向校验通过。

中风险：

- title/meta 过短或过长。
- canonical 缺失。
- sitemap 缺失但页面不是核心页面。
- SEO 配置还在 Draft。
- 关键词未完全映射。

高风险：

- P0/P1 页面不可收录。
- 核心页面缺 sitemap。
- canonical 指错。
- robots 阻挡。
- 页面 404 / 500。
- 旧 URL 没有 301。
- 重定向到错误页面。
- 多个核心页面抢同一个关键词。

## 12. 分工建议

SEO owner 主要维护：

- SEO配置表。
- 关键词地图表。
- 内容页面需求表。
- URL资产主表中的 SEO 归类、优先级和备注。

技术团队主要关注：

- 技术SEO检查表中的 High / Medium。
- 重定向与URL变更表中的 Failed / Configured / Ready for Dev。
- URL资产主表中的 P0/P1、Missing Sitemap、Indexable 异常。

双方共用：

- URL资产主表，作为网站 SEO URL 的唯一总台账。
