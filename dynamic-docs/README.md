# DocForge：动态技术文档 MVP

阶段 2–7 的可运行 MVP：Next.js 前台与 CMS、账号/角色、不可变 Chunk 与页面修订、审核/发布、受权限过滤的 Agent API 和 MCP stdio 工具。本地使用 SQLite/磁盘附件；生产部署使用 Neon PostgreSQL 与 Vercel Private Blob。云端迁移已完成，但正式生产验收和运维准备仍在进行。

> 部署及数据导入已完成；正式投入生产前仍需接入正式人员身份系统、完善登录防护、建立并演练备份/恢复策略，并完成端到端验收。不要把本地 `.env`、SQLite 数据库或附件目录提交到 Git。

## 当前闭环

`作者保存草稿 → 提交审核 → 指定 Reviewer 批准/要求修改 → 发布者发布/撤回 → 公开 API 和前台读取当前发布版本`

- 保存时创建新修订，不覆盖历史内容。
- 新修订未发布期间，公开读取仍返回上一条已发布修订。
- 只有 `PUBLIC` 且被发布指针引用的内容可匿名访问；其他策略在公开接口中返回 404。
- Reviewer 只能处理分配给自己的修订，且不能批准自己创建的内容。
- 发布只接受 `APPROVED` 修订；操作记录写入审计表。
- Reviewer 可以把待审修订与当前发布版本对比；作者和管理员可以比较自己有权查看的修订。
- 恢复历史内容会创建带来源记录的新草稿修订，仍须重新审核和发布，不会直接回滚公开内容。
- 页面修订以顺序引用 Chunk，不复制 Chunk 正文；页面和每个语言版本独立审核、发布。
- 页面发布后按 Chunk 稳定 ID 解析当前发布修订；Chunk 新修订重新发布后，引用它的页面会自动跟随。页面结构和其他 Chunk 不变。

## 运行环境

- Node.js 24（本机已验证版本为 24.18.0）
- npm

## 本地启动

在 PowerShell 中进入本目录。本地仍可用 SQLite 开发：

```powershell
cd D:\Code\my-docs\dynamic-docs
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate -- --name init
```

配置本次 PowerShell 会话中的四个初始密码（每个至少 12 个字符），然后初始化账号：

```powershell
$env:ADMIN_PASSWORD = "替换为本地强密码"
$env:AUTHOR_PASSWORD = "替换为本地强密码"
$env:REVIEWER_PASSWORD = "替换为本地强密码"
$env:PUBLISHER_PASSWORD = "替换为本地强密码"
$env:VIEWER_PASSWORD = "替换为本地强密码"
$env:DATABASE_URL = "file:../dev.db"
npm run db:seed
```

启动站点：

```powershell
npm run dev
```

浏览器打开 `http://localhost:3000`。账号邮箱取自 `.env.example`，密码使用上一步设置的值；不要将真实密码写进 `.env.example`、README 或 Git。

SQLite Schema 保存在 `prisma/schema.sqlite.prisma`，其既有迁移历史仍在 `prisma/migrations/`，因此本地数据库路径与历史记录保持不变。PostgreSQL 使用 `prisma/postgresql/` 下独立的 Schema 和迁移；`npm run db:generate` 会分别生成两种数据库客户端。

## 验证编辑、审核和发布

1. 以 `AUTHOR_EMAIL` 对应账号登录 `/login`。种子数据会创建一篇未发布的 API 示例草稿。
2. 打开草稿，确认正文和版本信息；作者可以保存为新修订或提交审核。
3. 以 `REVIEWER_EMAIL` 对应账号重新登录，打开分配给自己的内容。审核页会显示结构化正文、产品/API 版本、访问策略、允许组织、标签、弃用状态、Agent 用途范围，以及正文引用的附件；检查后再批准该修订或要求修改。
4. 以 `PUBLISHER_EMAIL` 对应账号登录并发布已批准修订。
5. 回到首页或访问 `/api/public/chunks`，确认发布内容出现。之后创建的新草稿不会覆盖已发布版本。
6. 用作者账号另建一条 `AUTHENTICATED` 内容，允许组织填写 `sample-customer`，设定产品 `MaaS`、API 版本 `v1` 和语言 `zh-CN`，然后重复提交审核和发布。
7. 以 `VIEWER_EMAIL` 对应的企业访问者登录。带上 `MaaS`、`v1`、`zh-CN` 条件搜索时应能找到这条内容；缺少版本/语言、使用错误版本或匿名搜索时不能找到。`/api/public/chunks` 只返回公开内容。

审核 API 会自动指派一个可用 Reviewer；首版只支持单 Reviewer。管理员、作者、审核员、发布者用不同浏览器配置文件或先退出再登录进行验证。

## 历史版本、差异和恢复

1. 以作者账号打开一个至少有两个修订的 Chunk，在“版本历史”中选择“对比最新”，核对标题、适用范围、标签和正文的字段差异。
2. Reviewer 打开分配给自己的审核内容时，也可以将待审版本与当前发布版本对比；不会因此获得其他草稿或其他 Reviewer 任务的访问权。
3. 作者或管理员可在差异视图中选择“恢复为新草稿”。系统会保留历史修订，并创建下一编号的新修订，标明恢复来源。
4. 确认新修订状态为 `DRAFT`，原发布版本仍可公开读取；新草稿必须重新提交审核、批准和发布。
5. `IN_REVIEW` 或等待发布的 `APPROVED` 修订不能被恢复覆盖，以免绕过审核流程。

## 页面组合与中英文版本

### 创建和发布页面

1. 在 `/cms` 进入“页面管理”，选择“新建页面”。
2. 设置唯一页面路径、标题、语言、产品和 API 版本，然后按展示顺序填写 Chunk ID（可从 `/cms` 内容列表打开 Chunk 并复制 URL 中的 ID）。
3. 一个页面中的 Chunk 必须使用相同语言、产品和 API 版本；当前账号必须有权管理每个被引用的 Chunk。
4. 保存页面草稿后，按页面流程提交审核、Reviewer 批准、Publisher 发布。Publisher 只能发布已发布且匹配页面适用范围的 Chunk。
5. 已发布且全部引用 Chunk 对当前用户可见的页面会显示在首页“已发布页面”，并可通过 `/docs/pages/<slug>` 阅读。
6. 删除被页面修订引用的 Chunk 会被服务端拒绝，以免破坏页面历史或已发布页面。

### 中英文内容关联和独立发布

1. 为同一知识内容分别创建 `zh-CN` 和 `en-US` 的 Chunk；不要把已有 Chunk 的语言直接改掉。
2. 在任一 Chunk 详情页的“语言版本关联”中粘贴另一语言 Chunk ID。关联后会显示稳定的语言版本列表；同一组每种语言最多一个 Chunk。
3. 两种语言的 Chunk 保持各自独立的修订、审核和发布状态。前台只显示当前用户有权访问且已发布的其他语言链接；未发布的翻译不会露出。
4. 页面也可按相同步骤关联中英文页面。每个页面版本可以单独审核、发布；前台只显示用户可访问且已发布的翻译页面。

### 共享 Chunk 更新规则

页面修订保存的是有序 Chunk 稳定 ID 列表，不是 Chunk 修订号快照。该 MVP 采用“发布后自动跟随”规则：共享 Chunk 的新修订完成审核并发布后，所有引用该 Chunk 的已发布页面读取新发布版本；草稿或待审 Chunk 修订不会影响页面。Chunk 新发布版本若语言、产品或 API 版本与页面不匹配，页面采用安全失败策略，不对该请求返回页面。

## 排查本地开发问题

- 如果浏览器控制台出现 React hydration mismatch，先在无扩展的隐私窗口中打开本地站点，或暂时禁用会改写网页 HTML 的扩展。Dark Reader 和 Night Eye 会向 `<html>` 注入 `data-darkreader-*`、`nighteye` 属性，在开发环境触发这类警告；不要用 `suppressHydrationWarning` 隐藏它。
- 若隐私窗口中仍可复现，请检查 Next.js 终端日志中的服务器/客户端差异，并确认服务端和客户端渲染使用相同的数据后再排查代码。

## 质量检查与运行健康状态

CMS 的 Chunk 详情页提供非阻断式文档质量检查，覆盖结构有效性、人类可读性、Agent 可检索性、版本准确性/新鲜度、约束清晰度、弃用处理和访问控制。当前新鲜度通过标准为 `lastVerified` 在过去 365 天内；该检查给出发布前建议，不替代 Reviewer 决策，也不改变服务端授权规则。相关规则由 `src/lib/document-quality.test.ts` 验证。

访问 `/api/health` 可检查应用和数据库是否可用。成功时返回 `200 {"status":"ok"}`；数据库不可用时返回 `503 {"status":"unhealthy"}`。健康检查响应不缓存，也不会暴露数据库连接信息。

GitHub Actions 会在 `dynamic-docs/` 或对应工作流变更时运行依赖审计、PostgreSQL 迁移、lint、单元测试、TypeScript 检查和生产构建。CI 使用临时 PostgreSQL 服务，不依赖本机数据库或生产凭据。

## Neon 与 Vercel 部署准备

在 Vercel 中将项目 Root Directory 设为 `dynamic-docs`，使用 Node.js 24。创建 Neon PostgreSQL 数据库，并创建 Vercel Blob **Private** store。配置下列变量：`DATABASE_PROVIDER=postgresql`、`DATABASE_URL`（Neon pooled connection string）、`DIRECT_URL`（Neon direct/non-pooled connection string）、`STORAGE_PROVIDER=vercel-blob`。将 Blob store 连接至 Vercel 项目的 Production/Preview；Vercel 会提供短期 OIDC Blob 凭据。不要把生产连接串或 Blob token 写入 Git。

迁移前先用 Neon 的分支/备份机制准备目标数据库，再在部署环境中执行 `npm run db:deploy:postgres`。部署前的空数据库可通过 `npm run db:import:sqlite` 从本机 SQLite 导入。导入程序要求 PostgreSQL 全部业务表为空；它会先把本地附件上传到私有 Blob，再在一个数据库事务中复制组织、账号、会话、Token、内容、修订、页面、发布指针和审计记录。若导入失败，会尝试删除本次上传的 Blob；如清理也失败，会显式报出错误和需人工检查的文件。

本地执行导入时，将云端变量保存到不提交的 `.env.local`（可用 `vercel env pull .env.local`），然后设置本地 SQLite 源路径并运行：

```powershell
$env:DATABASE_PROVIDER = "postgresql"
$env:STORAGE_PROVIDER = "vercel-blob"
$env:SQLITE_DATABASE_URL = "file:../dev.db"
npm run db:import:sqlite
```

当前导入脚本是一次性首迁移：目标必须为空；源 SQLite 数据库和 `.data/uploads` 会保留不变，导入不会删除或修改它们。上线后还需配置定期 Neon 备份/PITR、验证恢复流程、登录限流及身份提供商，之后才适合承载生产用户数据。`/api/health` 同时检查 PostgreSQL 可读性，可用于平台健康探针。

## API 快速验证

公开接口只会返回当前发布指针所指向的公开 Chunk：

```powershell
Invoke-RestMethod "http://localhost:3000/api/public/chunks?language=zh-CN&product=MaaS&apiVersion=v1"
```

未登录访问 CMS API 应返回 `401`：

```powershell
Invoke-WebRequest "http://localhost:3000/api/cms/chunks" -SkipHttpErrorCheck
```

## Agent API 与 MCP

Agent API 和 MCP 都使用一个绑定到现有用户的短期凭据；服务端从数据库读取用户的角色和组织，不接受 Agent 自报身份。权限仍由已发布状态、组织、产品/API 版本、语言以及 Chunk 的 `allowedAgentScope` 共同决定：`search` 才会出现在搜索结果中，`read` 才允许返回正文，`cite` 才会提供来源链接。搜索结果只返回摘要和来源元数据。

先为需要的用户创建一个有效期不超过一年的只读凭据。以下示例使用示例企业客户账号：

```powershell
npm run agent-token:create -- --email customer@example.test --name "Local documentation agent" --expires-days 90
```

完整凭据只显示一次，请存入本地 MCP 客户端的环境变量，不要提交到 Git 或写入文档。撤销时使用创建命令显示的 Token ID：

```powershell
npm run agent-token:revoke -- <agent-token-id>
```

Agent REST API 使用 `Authorization: Bearer <token>`：

```powershell
$headers = @{ Authorization = "Bearer <agent-token>" }
Invoke-RestMethod "http://localhost:3000/api/agent/v1/chunks/search?q=对话&product=MaaS&apiVersion=v1&language=zh-CN" -Headers $headers
Invoke-RestMethod "http://localhost:3000/api/agent/v1/chunks/sample-maas-chat-completions?product=MaaS&apiVersion=v1&language=zh-CN" -Headers $headers
```

MCP 适配器使用官方 TypeScript SDK 的标准 stdio transport，支持当前 `2026-07-28` 协议和旧版初始化协议。本地 MCP Host 启动命令为 `npm run mcp:stdio`，并需在该进程环境中设置 `DOCS_AGENT_TOKEN`；可选设置 `DOCS_BASE_URL` 以生成来源链接。提供两个只读工具：`search_docs` 和 `read_doc_chunk`。MCP 服务直接使用本地数据库，Next.js 网站不必为 stdio 工具运行。MCP Host 应将 Token 作为环境变量安全注入，不要放进提示词或工具参数。

本地手动启动时，可在同一 PowerShell 会话中设置凭据：

```powershell
$env:DOCS_AGENT_TOKEN = "粘贴创建时只显示一次的凭据"
$env:DOCS_BASE_URL = "http://localhost:3000"
npm run mcp:stdio
```

当前版本没有开放远程 MCP HTTP endpoint，也没有实现 OAuth 2.1；Agent REST Bearer Token 不应被视为 MCP OAuth。需要远程 MCP 时，应先完成 MCP 官方授权服务器流程与 Protected Resource Metadata，再开放 HTTP transport。

## 角色

| 角色 | 首版能力 |
|---|---|
| `ADMIN` | 查看所有 CMS 内容、创建草稿、审核、发布和撤回 |
| `AUTHOR` | 创建/编辑自己的草稿、提交审核、查看自己的历史修订 |
| `REVIEWER` | 查看分配给自己的审核内容及其当前发布版本并比较，批准或要求修改 |
| `PUBLISHER` | 查看已批准修订并发布或撤回 |
| `VIEWER` | CMS 仅显示公开内容；暂不提供自助注册 |

管理员可在 `/cms/admin` 创建用户与组织、调整用户姓名/角色/组织/启用状态，以及重命名或停用组织。新用户初始密码由管理员设置（至少 12 个字符），须通过安全渠道交付；应用不会发送邀请邮件或强制首次改密。停用用户会删除其会话并撤销 Agent Token；停用组织会对其全部用户执行相同处理。系统禁止停用或降级最后一个启用的管理员。用户和组织管理操作会写入审计记录；管理员可在 `/cms/admin/audit` 按操作、目标类型和目标 ID 查看、筛选和分页审计记录，敏感字段会脱敏。当前不支持删除用户/组织或找回密码。

该 MVP 通过独立 API 路由执行服务端检查；UI 隐藏按钮不是授权依据。当前实现 API Reference Chunk、可组合页面、中英文关联、受控附件上传和面向小规模数据集的全文子串检索。检索在服务端先过滤已发布状态、身份/组织授权和版本适用条件，再匹配标题、正文、标签及元数据；搜索结果数量和分页也只基于授权后的内容。MVP 对候选记录做应用层扫描，尚未建立倒排索引；数据量或查询延迟增长时应迁移到 SQLite FTS5 或 PostgreSQL 全文检索，并维持相同的授权过滤边界。暂不包含用户组管理 UI、复杂组织 ABAC、专用搜索集群或远程 MCP HTTP/OAuth。

## 数据模型

- `Chunk`：稳定内容 ID。
- `ChunkRevision`：不可变内容修订，包括语言、产品/API 版本、访问策略、Agent scope、验证时间、弃用状态、正文和审核状态。
- `ChunkLanguageGroup`：稳定关联不同语言的 Chunk；语言内容的版本与发布周期相互独立。
- `DocPage` / `PageRevision`：页面稳定路径和不可变页面修订。
- `PageRevisionChunk`：页面修订中的有序 Chunk ID 引用；读取时解析该 Chunk 当前发布版本。
- `PageLanguageGroup`：稳定关联中英文页面，页面各自独立修订与发布。
- `PublishedChunk`：指向当前公开修订；更新草稿不会改变它。
- `PublishedPage`：指向当前发布页面修订。
- `User` / `Session`：角色账号与数据库侧会话；浏览器只持有随机 HttpOnly Cookie。
- `AuditEvent`：记录草稿创建、提交审核、审核决定、发布和撤回。

`allowedAgentScope` 是用途限制，不是授权。Agent REST API 和本地 MCP stdio 适配器使用绑定到现有用户的凭据；服务端读取用户角色和组织，并同时检查发布状态、适用条件与 scope。MCP 目前仅提供本地 stdio transport，未开放远程 HTTP/OAuth 接入。

系统支持 `zh-CN` 和 `en-US` 字段验证及跨语言 Chunk/页面关联；不同语言版本分别管理修订、审核和发布状态。不要通过修改同一个 Chunk 的语言来创建翻译。
