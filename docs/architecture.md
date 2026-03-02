# GeneHub 架构设计

> 版本：v0.1
> 日期：2026-02-27
> 状态：草稿

---

## 一、定位与背景

### 1.1 为什么需要 GeneHub

NoDeskClaw 已经实现了一套完整的基因进化生态（Gene Evolution Ecosystem），包括基因市场、学习引擎、遗忘机制、Agent 创造等能力。但这套系统存在以下问题：

| 问题 | 影响 |
|------|------|
| 基因存储与管理耦合在 NoDeskClaw 后端 | 其他 Agent 产品无法复用 |
| 基因格式绑定 OpenClaw（SKILL.md + openclaw.json） | nanobot 等产品需要各自适配 |
| 无外部基因引入通道 | 无法从 ClawHub、Evomap 等外部生态获取基因 |
| 安装方式单一（API 调用） | 无法兼容 `claw install`、`npm`、`pip` 等主流分发方式 |

**GeneHub 的目标**：将基因能力从 NoDeskClaw 中抽离为独立的中心化基因服务，成为 NoDeskClaw 全生态的基因基础设施。

### 1.2 核心定位

```
GeneHub = 基因注册中心（Registry）+ 标准学习协议（Protocol）+ 多产品适配层（Adapters）
```

类比：

| 角色 | 软件世界类比 |
|------|-------------|
| GeneHub Registry | npm registry / PyPI |
| Gene Manifest | package.json / setup.py |
| GeneHub CLI | npm / pip |
| 标准学习协议 | Language Server Protocol（LSP） |
| 产品适配器 | LSP 客户端实现 |

---

## 二、系统架构

### 2.1 全局架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            外部基因生态                                        │
│                                                                              │
│   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│   │   ClawHub     │       │   Evomap     │       │  社区贡献     │            │
│   │  (基因市场)    │       │ (进化推荐)   │       │ (PR / Upload) │            │
│   └──────┬───────┘       └──────┬───────┘       └──────┬───────┘            │
│          │                      │                      │                     │
└──────────┼──────────────────────┼──────────────────────┼─────────────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          GeneHub Core                                         │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Gene Registry Service                             │   │
│   │                                                                     │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│   │  │ 基因存储      │  │ 版本管理      │  │ 搜索与发现               │  │   │
│   │  │ Gene Store   │  │ Versioning   │  │ Search & Discovery      │  │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│   │  │ 依赖解析      │  │ 兼容校验      │  │ 审核与发布               │  │   │
│   │  │ Dependency   │  │ Compat Check │  │ Review & Publish        │  │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    外部基因适配层 (Inbound Adapters)                   │   │
│   │                                                                     │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│   │  │ ClawHub      │  │ Evomap       │  │ Git Repo Importer       │  │   │
│   │  │ Adapter      │  │ Adapter      │  │ (GitHub / GitLab)       │  │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    标准学习协议 SDK                                    │   │
│   │                    (Gene Learning Protocol)                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    产品适配层 (Outbound Adapters)                      │   │
│   │                                                                     │   │
│   │  ┌──────────────┐  ┌──────────────┐                               │   │
│   │  │ OpenClaw     │  │ nanobot      │    (DeskClaw 等后续扩展)       │   │
│   │  │ Adapter      │  │ Adapter      │                               │   │
│   │  └──────────────┘  └──────────────┘                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    CLI / 分发层                                       │   │
│   │  genehub install | claw install | npx | pip                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Agent 产品                                           │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│   │  NoDeskClaw   │  │  openClaw    │  │  nanobot     │  (更多产品后续)    │
│   │  (K8s 管理)  │  │  (开源框架)   │  │ (轻量 Agent) │                    │
│   └──────────────┘  └──────────────┘  └──────────────┘                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

#### Gene Registry Service（基因注册中心）

中心化的基因存储与管理服务，职责：

| 模块 | 职责 |
|------|------|
| Gene Store | 基因 / 基因组的存储、CRUD、元数据管理 |
| Versioning | 语义化版本（SemVer）管理、变体（Variant）追溯 |
| Search & Discovery | 全文搜索、标签过滤、推荐算法、热度排行 |
| Dependency Resolver | 基因间依赖解析、冲突检测、安装计划生成 |
| Compatibility Checker | 目标产品兼容性校验（某基因是否支持 nanobot） |
| Review & Publish | 基因审核流程（人类审核 / Agent 审核 / 自动验证） |

#### Inbound Adapters（外部基因适配层）

外部基因生态对接。**ClawHub / EvoMap 已从定期同步改为联邦搜索（实时查询 + 后台入库待审核）**。

| 适配器 | 数据源 | 协议 | 当前模式 |
|--------|--------|------|---------|
| ClawHub Adapter | ClawHub 基因市场 | REST API | **联邦搜索**（实时展示 + 后台入库为 pending，等待 AI 审核） |
| Evomap Adapter | Evomap 进化推荐引擎 | REST API | **联邦搜索**（同上） |
| NoDeskClaw Adapter | NoDeskClaw 内部数据 | 直连 DB | 批量导入（白名单，直接 approved） |
| Git Repo Importer | GitHub / GitLab 仓库 | Git Clone + gene.yaml 解析 | 导入 |

#### Outbound Adapters（产品适配层）

将 GeneHub 的基因注入到不同 Agent 产品（初期聚焦 openClaw + nanobot，其他产品后续扩展）：

| 适配器 | 目标产品 | 注入方式 |
|--------|---------|---------|
| OpenClaw Adapter | openClaw / NoDeskClaw | SKILL.md + openclaw.json（NFS / API） | 初期 |
| nanobot Adapter | nanobot | 配置注入（待定） | 初期 |
| Generic Adapter | 通用 Agent | 标准学习协议 HTTP 回调 | 初期 |
| DeskClaw Adapter | DeskClaw | .cursor/rules/ + SKILL.md | 后续扩展 |

#### GeneHub CLI（命令行工具）

统一的基因管理命令行，兼容多种安装方式：

```bash
# 原生命令
genehub install <gene-slug>
genehub search <keyword>
genehub list
genehub info <gene-slug>
genehub uninstall <gene-slug>
genehub publish <path>

# 兼容已有生态
claw install <gene-slug>          # ClawHub 兼容
npx genehub install <gene-slug>   # npm 生态兼容
pip install genehub-<gene-slug>   # Python 生态兼容
```

---

## 三、数据模型

### 3.1 核心实体

#### Gene（基因）

从 NoDeskClaw 的 Gene 模型演化而来，增加多产品兼容字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | string(128) | 显示名称 |
| slug | string(128) | 唯一标识符，全局唯一 |
| version | string(16) | 语义化版本号（SemVer） |
| description | text | 详细描述（Markdown） |
| short_description | string(256) | 摘要 |
| category | string(32) | 领域分类 |
| tags | JSON | 标签数组（能力 / 性格 / 知识 / 工具） |
| icon | string(32) | 图标名 |
| source | enum | `official` / `clawhub` / `evomap` / `community` / `agent` / `github` |
| source_ref | string | 外部来源引用（ClawHub URL / Evomap ID / GitHub login） |
| publisher_id | FK nullable | 发布者（见 3.3 节） |
| manifest | JSON | **标准基因清单**（见第四章） |
| compatibility | JSON | 兼容产品列表 `["openclaw", "nanobot"]`（初期仅支持这两个产品） |
| dependencies | JSON | 依赖基因 `[{"slug": "xxx", "version": ">=1.0"}]` |
| synergies | JSON | 协同推荐基因 |
| parent_gene_id | FK nullable | 变体溯源 |
| author | JSON | 作者信息 `{"type": "human/agent", "id": "...", "name": "..."}` |
| install_count | int | 总安装数 |
| avg_rating | float | 平均评分 |
| effectiveness_score | float | 综合效能分 |
| review_status | enum | `draft` / `pending` / `approved` / `rejected` |
| is_published | bool | 是否上架 |
| created_at | datetime | |
| updated_at | datetime | |
| deleted_at | datetime | 软删除 |

#### Genome（基因组）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | string(128) | 显示名称 |
| slug | string(128) | 唯一标识符 |
| version | string(16) | 版本号 |
| description | text | 描述 |
| short_description | string(256) | 摘要 |
| icon | string(32) | 图标 |
| genes | JSON | 包含的基因 `[{"slug": "xxx", "version": ">=1.0", "config_override": {}}]` |
| compatibility | JSON | 兼容产品列表 |
| install_count | int | 应用次数 |
| avg_rating | float | 评分 |
| author | JSON | 作者信息 |
| is_published | bool | 上架 |
| created_at | datetime | |
| updated_at | datetime | |
| deleted_at | datetime | 软删除 |

#### GeneVersion（基因版本历史）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| gene_id | FK | 所属基因 |
| version | string(16) | 版本号 |
| manifest | JSON | 该版本的完整 manifest |
| changelog | text | 变更日志 |
| is_latest | bool | 是否最新 |
| published_at | datetime | 发布时间 |

### 3.2 与 NoDeskClaw 的数据关系

```
NoDeskClaw                              GeneHub
┌─────────────────────┐         ┌─────────────────────┐
│ Instance             │         │ Gene (Registry)      │
│ InstanceGene         │◄───────►│ Genome (Registry)    │
│ EvolutionEvent       │         │ GeneVersion          │
│ GeneEffectLog        │         │                      │
│ GeneRating           │   sync  │                      │
└─────────────────────┘  ◄────► └─────────────────────┘

NoDeskClaw 保留：实例级基因状态（InstanceGene）、进化日志、效能数据
GeneHub 统管：基因元数据、版本、manifest、搜索、兼容性
```

NoDeskClaw 的 `genes` 表将作为 GeneHub 的客户端缓存，定期与 GeneHub Registry 同步。新基因由 GeneHub 统一管理，NoDeskClaw 通过 API 拉取。

### 3.3 认证与发布者

#### Publisher（发布者）

通过 GitHub OAuth 登录后自动创建，不维护用户资料，仅缓存 GitHub 身份：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| github_id | integer | GitHub user ID，唯一 |
| github_login | string(64) | GitHub 用户名 |
| github_name | string(128) | 显示名 |
| github_avatar_url | text | 头像 URL |
| github_profile_url | text | Profile 链接（来源跳转用） |
| created_at | datetime | |
| last_login_at | datetime | |

#### ApiKey（API 密钥）

一个 Publisher 可创建多个 Key，用于 CLI/SDK 认证：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| publisher_id | FK | 所属发布者 |
| token_prefix | string(16) | 前缀用于展示（如 `ghb_abc1****`） |
| token_hash | string(64) | SHA-256 hash，不存明文 |
| name | string(128) | 用户命名（如 "My Laptop"） |
| last_used_at | datetime | |
| created_at | datetime | |
| revoked_at | datetime | 非空表示已撤销 |

#### Gene 表变更

| 字段 | 类型 | 说明 |
|------|------|------|
| publisher_id | FK nullable | 发布者（nullable 兼容历史数据） |
| source | enum | 新增 `github` 值，用户发布时设为 `github` |
| source_ref | string | 用户发布时设为 GitHub login |

#### 认证流程

```
GitHub OAuth                   API Key
┌──────────────────────┐       ┌─────────────────────────┐
│ Web: Login with GitHub │       │ CLI/SDK: Bearer ghb_xxx  │
│ -> /auth/github        │       │ -> 查 api_keys 表         │
│ -> GitHub OAuth flow   │       │ -> hash 比对              │
│ -> upsert publisher    │       │ -> 关联 publisher         │
│ -> JWT httpOnly cookie │       │ -> 设置 authRole          │
└──────────────────────┘       └─────────────────────────┘
```

认证优先级：
1. Bearer Token -> 查 `api_keys` 表，角色 `publisher`
2. Session Cookie -> 解析 JWT，角色 `publisher`
3. `GENEHUB_ADMIN_TOKEN` 环境变量 -> 角色 `admin`
4. 无认证 -> 角色 `public`

所需环境变量：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`GENEHUB_JWT_SECRET`

---

## 四、标准基因清单（Gene Manifest）

见 `docs/gene-learning-protocol.md` 第二章。

---

## 五、技术选型

| 层级 | 选型 | 说明 |
|------|------|------|
| Registry API | TypeScript + Hono | 轻量高性能，运行在 Node.js / Bun / Edge |
| 数据库 | PostgreSQL | 与 NoDeskClaw 同生态，支持 JSONB 全文搜索 |
| 基因文件存储 | 文件系统 + Git | 基因内容版本化天然适合 Git 管理 |
| 搜索引擎 | PostgreSQL FTS（初期）/ Meilisearch（后期） | 先简后繁 |
| CLI | TypeScript (tsx) | 跨平台，单文件分发 |
| Web 前端 | React + Vite + Tailwind CSS | 基因浏览、搜索、API Key 管理 |
| SDK | TypeScript + Python | 覆盖主流 Agent 开发语言 |
| 分发 | npm + pip + GitHub Releases | 兼容主流包管理器 |
| Git Hooks | lefthook | pre-commit 执行 Biome lint |

---

## 六、API 设计

### 6.1 Registry API

**Base URL**: `https://registry.genehub.dev/api/v1`（初期可本地部署）

#### 基因查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/genes` | 搜索基因列表（支持 q / category / tags / compatibility / sort） |
| GET | `/genes/:slug` | 基因详情（最新版本） |
| GET | `/genes/:slug/versions` | 版本列表 |
| GET | `/genes/:slug/versions/:version` | 指定版本详情 |
| GET | `/genes/:slug/manifest` | 获取 manifest（用于安装） |
| GET | `/genes/:slug/variants` | 变体列表 |
| GET | `/genes/:slug/synergies` | 协同推荐 |

#### 基因组查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/genomes` | 搜索基因组 |
| GET | `/genomes/:slug` | 基因组详情 |
| GET | `/genomes/:slug/resolve` | 解析并返回所有基因的 manifest（含依赖） |

#### 基因发布

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/genes` | 发布新基因 |
| PUT | `/genes/:slug/versions` | 发布新版本 |
| POST | `/genes/:slug/deprecate` | 废弃基因 |

#### 依赖解析

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/resolve` | 批量解析依赖，返回安装计划 |

#### 联邦搜索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/genes/search?q=xxx` | 联邦搜索（本地 + ClawHub 实时查询，外部结果后台入库为 pending 待 AI 审核） |
| POST | `/import/git` | 从 Git 仓库导入基因 |

#### ~~外部基因同步~~（已弃用）

> **弃用说明**：定期同步接口已弃用，改用联邦搜索。外部基因源通过联邦搜索实时查询并后台
> 入库为 `pending` 状态，由 AI Curator 审核通过后发布。
> 仅保留 NoDeskClaw 同步用于历史数据批量导入（白名单，直接 approved）。
> 接口将于 2026-06-01 下线。

| 方法 | 路径 | 说明 |
|------|------|------|
| ~~POST~~ | ~~`/sync/clawhub`~~ | ~~触发 ClawHub 同步~~ → 改用联邦搜索 |
| ~~POST~~ | ~~`/sync/evomap`~~ | ~~请求 Evomap 推荐~~ → 改用联邦搜索 |

### 6.2 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

错误响应：

```json
{
  "code": 40001,
  "error_code": "gene_not_found",
  "message": "基因不存在",
  "data": null
}
```

---

## 七、项目结构

```
genehub/
├── docs/                         # 设计文档
│   ├── architecture.md           # 架构设计（本文档）
│   └── gene-learning-protocol.md # 标准学习协议规范
│
├── packages/
│   ├── registry/                 # Gene Registry Service
│   │   ├── src/
│   │   │   ├── api/              # API 路由
│   │   │   ├── services/         # 业务逻辑
│   │   │   ├── models/           # 数据模型
│   │   │   ├── adapters/         # 外部基因适配器
│   │   │   │   ├── clawhub.ts    # ClawHub 适配
│   │   │   │   ├── evomap.ts     # Evomap 适配
│   │   │   │   └── git.ts        # Git 仓库导入
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                      # 标准学习协议 SDK
│   │   ├── typescript/           # TypeScript SDK
│   │   │   ├── src/
│   │   │   │   ├── client.ts     # GeneHub API 客户端
│   │   │   │   ├── protocol.ts   # 标准学习协议实现
│   │   │   │   ├── adapters/     # 产品适配器（初期）
│   │   │   │   │   ├── openclaw.ts
│   │   │   │   │   ├── nanobot.ts
│   │   │   │   │   └── generic.ts
│   │   │   │   └── types.ts      # 类型定义
│   │   │   └── package.json
│   │   └── python/               # Python SDK
│   │       ├── genehub/
│   │       │   ├── client.py
│   │       │   ├── protocol.py
│   │       │   └── adapters/
│   │       └── pyproject.toml
│   │
│   ├── cli/                      # 命令行工具
│   │   ├── src/
│   │   │   ├── commands/         # 子命令
│   │   │   │   ├── install.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── list.ts
│   │   │   │   ├── publish.ts
│   │   │   │   └── init.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── web/                      # Web 前端（React + Vite）
│       ├── src/
│       │   ├── pages/            # 页面组件
│       │   ├── components/       # 业务 + UI 组件
│       │   └── api/              # API 请求封装
│       └── package.json
│
├── genes/                        # 官方基因库（Git 管理）
│   ├── skills/
│   │   └── <gene-slug>/
│   │       ├── gene.yaml         # 基因元数据
│   │       └── SKILL.md          # 技能内容
│   ├── rules/
│   └── protocols/
│
├── adapters/                     # 安装方式兼容层
│   ├── clawhub/                  # claw install 兼容
│   └── npm/                      # npx genehub 兼容
│
├── README.md
├── package.json                  # monorepo 根配置
└── .gitignore
```

---

## 八、与 NoDeskClaw 集成方案

### 8.1 迁移路径

| 阶段 | 动作 | NoDeskClaw 影响 |
|------|------|----------------|
| Phase 1 | GeneHub Registry 独立部署，导入 NoDeskClaw 现有基因数据 | NoDeskClaw 保持现有功能不变 |
| Phase 2 | NoDeskClaw 基因市场 API 改为代理转发到 GeneHub | 前端无感知，后端 gene_service 添加 GeneHub 客户端 |
| Phase 3 | NoDeskClaw 学习引擎接入标准学习协议 | Learning Channel Plugin 无需改动，gene_service 适配 |
| Phase 4 | NoDeskClaw genes 表降级为本地缓存 | 基因元数据以 GeneHub 为主，本地缓存加速 |

### 8.2 API 映射

| NoDeskClaw 现有 API | GeneHub 替代 |
|---------------------|-------------|
| `GET /genes` | `GET /api/v1/genes` (Registry) |
| `GET /genes/:id` | `GET /api/v1/genes/:slug` (Registry) |
| `POST /genes/:id/rate` | `POST /api/v1/genes/:slug/rate` (Registry) |
| `POST /instances/:id/genes/install` | 保留（实例级操作留在 NoDeskClaw，拉取 manifest 从 GeneHub） |
| `POST /genes/learning-callback` | 保留（学习回调留在 NoDeskClaw） |

### 8.3 数据同步

```
GeneHub Registry                     NoDeskClaw
     │                                    │
     │  GET /genes/:slug/manifest         │
     │ ◄──────────────────────────────────│ (install_gene 时拉取)
     │                                    │
     │  POST /genes (Agent 创造)           │
     │ ◄──────────────────────────────────│ (creation_callback 后推送)
     │                                    │
     │  POST /genes/:slug/effectiveness   │
     │ ◄──────────────────────────────────│ (效能数据回传)
     │                                    │
     │  Webhook: 新基因/版本通知           │
     │ ──────────────────────────────────►│ (主动推送)
     │                                    │
```

---

## 九、外部基因获取

### 9.1 ClawHub 适配

> ClawHub（clawhub.ai）是 OpenClaw 官方的公共技能注册中心，拥有 3,286 个技能、1.5M+ 下载量。
> 技术栈：TanStack Start + Convex + OpenAI embeddings 向量搜索。
> GitHub：openclaw/clawhub（3,131 stars）

#### 交互流程（联邦搜索，当前方案）

```
用户搜索 q="memory"
        │
        ▼
   GeneHub API (GET /genes/search)
        │
        ├─── 本地 DB (ILIKE)         → 本地结果 (source: local)
        │
        └─── ClawHub API (实时搜索)   → 远程结果 (source: clawhub)
                                       ↓
                             去重（本地优先）→ 分数归一化 → 合并排序 → 返回
```

ClawHub 结果**不入库**，仅作为外部知识源实时查询。ClawHub 超时或失败时优雅降级，只返回本地结果。

#### ~~交互流程（定期同步，已弃用）~~

> 以下为旧的定期同步方案，已弃用。保留文档供参考。

```
ClawHub (clawhub.ai)            GeneHub
     │  1. 搜索 → 2. 详情 → 3. 下载 → 4. 转换 → 5. 存入（已弃用）
```

#### ClawHub 技能格式

```yaml
# SKILL.md frontmatter
---
name: my-skill
description: Does a thing with an API.
metadata:
  openclaw:
    requires:
      env:
        - MY_API_KEY
      bins:
        - curl
    primaryEnv: MY_API_KEY
---
# 技能内容（Markdown）
```

#### 转换规则

| ClawHub 字段 | GeneHub gene.yaml 字段 |
|-------------|----------------------|
| `name` | `name` + `slug`（kebab-case） |
| `description` | `description` / `short_description` |
| `metadata.openclaw.requires` | `config.openclaw` |
| `tags` | `tags` |
| 技能正文 | `skill.content`（SKILL.md） |
| 下载量 / 星标数 | `install_count` / `avg_rating` |
| — | `source: clawhub` |
| 技能 URL | `source_ref` |

#### ClawHub CLI 协议参考

```bash
clawhub search "query"            # 语义搜索
clawhub install <slug>            # 安装（下载 zip → 解压到 ./skills/）
clawhub publish <path>            # 发布
clawhub sync                      # 批量同步
```

#### 安全注意事项

2026-02 ClawHavoc 事件：341 个恶意技能被发现，ClawHub 已接入 VirusTotal 扫描。
GeneHub 同步时应：跳过被标记/隐藏的技能、校验技能包完整性、记录审计日志。

### 9.2 Evomap 适配

> EvoMap（evomap.ai）是 AI 自进化基础设施平台，基于 Genome Evolution Protocol（GEP）。
> 核心引擎：Capability Evolver，实时分析日志 → 提取信号 → 生成/验证策略 → 固化能力。
> GitHub：EvoMap/evolver（872 stars）

#### GEP 协议核心概念

| GEP 概念 | 说明 | GeneHub 映射 |
|----------|------|-------------|
| Gene | 原子能力单元（如 "read file"、"execute SQL"） | Gene Manifest |
| Capsule | 成功执行路径的封装，复合问题解决方案 | Genome（基因组） |
| Event | 不可变的突变/修复日志，完整上下文记录 | GeneVersion changelog |

#### 交互流程

```
EvoMap (evomap.ai)              GeneHub
  │                                │
  │  1. 提交 Agent 能力画像         │
  │ ◄──────────────────────────────│ (当前已安装基因 + 效能数据)
  │                                │
  │  2. Evolver 分析 + 推荐        │
  │ ──────────────────────────────►│ (推荐基因/Capsule 组合)
  │                                │
  │  3. GeneHub 解析推荐            │
  │     GEP Gene → gene.yaml      │
  │     GEP Capsule → genome      │
  │                                │
  │  4. 效能数据回传                │
  │ ◄──────────────────────────────│ (用于进化信号分析)
  │                                │
```

#### Evolver 策略模式

```bash
EVOLVE_STRATEGY=balanced      # 平衡模式（默认）
EVOLVE_STRATEGY=innovate      # 最大化新能力
EVOLVE_STRATEGY=harden        # 聚焦稳定性
EVOLVE_STRATEGY=repair-only   # 紧急修复模式
```

---

## 十、安装兼容性

### 10.1 安装方式矩阵

| 安装方式 | 命令 | 适用场景 |
|---------|------|---------|
| GeneHub CLI | `genehub install <slug>` | 标准方式，全功能 |
| claw install | `claw install @genehub/<slug>` | ClawHub 生态兼容 |
| npx | `npx genehub install <slug>` | 前端 / Node.js 项目 |
| pip | `pip install genehub-<slug>` | Python Agent 项目 |
| Git Clone | `git clone .../<slug>.git` | 开发者直接引用 |
| HTTP API | `POST /install` | 程序化调用（NoDeskClaw 等） |

### 10.2 CLI 安装流程

```
genehub install code-review

  1. 查询 Registry: GET /genes/code-review/manifest
  2. 解析依赖: POST /resolve { genes: ["code-review"] }
  3. 检测目标产品: 自动识别当前环境（openclaw / nanobot / 通用）
  4. 下载 manifest + 依赖
  5. 调用对应 Adapter 注入基因
     ├── OpenClaw: 写入 SKILL.md + 合并 openclaw.json
     ├── nanobot: 配置注入（待定）
     └── Generic: 输出 gene.yaml 到本地目录
  6. 验证安装结果
  7. 输出安装报告
```

### 10.3 后续扩展（DeskClaw 等）

> DeskClaw Adapter 属于后续扩展计划，初期不实现。以下为预留设计参考。

DeskClaw 使用 Cursor Rules（`.cursor/rules/*.mdc`）和 Skills（SKILL.md）管理能力。GeneHub 的 DeskClaw Adapter 负责：

| Gene Manifest 字段 | DeskClaw 映射 |
|-------------------|-------------|
| `skill.content` | `.cursor/skills/<slug>/SKILL.md` |
| `rules` | `.cursor/rules/<slug>.mdc` |
| `config` | 合并到项目配置 |

---

## 十一、AI 能力（OpenCode + MCP）

GeneHub 内置了一套基于 **OpenCode**（开源终端 AI 框架）和 **MCP**（Model Context Protocol）的 AI 能力体系，用于自动化基因库管理。

### 11.1 架构总览

```
                    ┌──────────────────────────────────────┐
                    │     Gene Curator (K8s Pod)            │
                    │     OpenCode + MiniMax LLM            │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │ system-prompt.md               │  │
                    │  │ 角色定义 + 巡检流程 + 权限边界   │  │
                    │  └────────────────────────────────┘  │
                    └──────────────┬───────────────────────┘
                                   │ MCP (Streamable HTTP)
                                   │ POST http://genehub/mcp
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    GeneHub Registry (K8s Pod)                     │
│                                                                  │
│   Hono HTTP Server (:3000)                                       │
│   ├── /api/v1/genes    REST API                                  │
│   ├── /api/v1/genomes  REST API                                  │
│   └── /mcp             MCP Streamable HTTP (token-gated)         │
│                                                                  │
│   MCP 17 Tools:                                                  │
│     Query:  list_genes / get_gene / search_genes /               │
│             find_similar / get_library_stats / evaluate_in_context│
│     Genome: list_genomes / get_genome /                          │
│             suggest_genome / validate_genome                      │
│     Manage: update_gene_category / update_gene_description /     │
│             update_gene_synergies / merge_genes                   │
│     Review: post_review / flag_for_deletion / approve_gene       │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ SQL
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │  gene_events  │◄── LISTEN/NOTIFY
                    └───────┬───────┘
                            │
                  ┌─────────┴──────────┐
                  ▼                    ▼
         ┌──────────────┐    ┌──────────────────┐
         │ gene-service  │    │ curator/listener │
         │ emitGeneEvent │    │ 实时事件监听       │
         └──────────────┘    └──────────────────┘
```

### 11.2 MCP Server

GeneHub MCP Server 将基因库能力暴露为 17 个标准 MCP 工具，任何支持 MCP 协议的 AI 框架（OpenCode、Claude Code、Cursor 等）都可以接入。

**代码位置**：`packages/registry/src/mcp/`

```
src/mcp/
├── server.ts          # MCP Server 定义，注册所有工具
├── http.ts            # Streamable HTTP 传输（挂载到 Hono /mcp）
├── index.ts           # stdio 传输入口（本地开发 / CLI）
└── tools/
    ├── query.ts       # 6 个查询工具
    ├── genome.ts      # 4 个基因组工具
    ├── manage.ts      # 4 个管理工具
    └── review.ts      # 3 个审核工具
```

**传输方式**：

| 传输 | 端点 | 使用场景 |
|------|------|---------|
| **Streamable HTTP** | `POST /mcp` | K8s 内 Curator Agent、外部 MCP 客户端（需 Bearer Token） |
| stdio | `node dist/mcp/index.js` | 本地开发、CLI 调试 |

**启动方式**：

```bash
# 开发模式（stdio）
pnpm --filter @nodeskai/genehub-registry mcp:dev

# 生产模式 — HTTP 传输随主应用自动启动
# Curator 通过 http://genehub/mcp 连接，无需单独启动 MCP Server
```

**MCP 工具一览**：

| 类别 | 工具 | 说明 |
|------|------|------|
| 查询 | `list_genes` | 列出基因，按分类/来源/审核状态过滤 |
| 查询 | `get_gene` | 基因详情 + 已有点评 + 关联关系 |
| 查询 | `search_genes` | 关键词搜索 |
| 查询 | `find_similar` | 查找相似/重复候选 |
| 查询 | `get_library_stats` | 基因库总览统计 |
| 查询 | `evaluate_in_context` | 上下文评估：在已有库的背景下评价此基因 |
| 基因组 | `list_genomes` | 列出基因组，按分类和关键词过滤 |
| 基因组 | `get_genome` | 基因组详情 + 版本历史 |
| 基因组 | `suggest_genome` | 根据需求描述推荐合适的基因组 |
| 基因组 | `validate_genome` | 校验基因组合法性（存在性、发布状态、冲突检测） |
| 管理 | `update_gene_category` | 重分类（需提供理由） |
| 管理 | `update_gene_description` | 改善描述文本 |
| 管理 | `update_gene_synergies` | 设置关联关系（synergy/conflict/extends/replaces） |
| 管理 | `merge_genes` | 合并重复基因 |
| 审核 | `post_review` | 发布点评（评分 0-10 + 评语） |
| 审核 | `flag_for_deletion` | 标记待删除（人工确认后才会删除） |
| 审核 | `approve_gene` | 审核通过 |

### 11.3 Gene Curator（基因库管理员）

Gene Curator 是一个自主运行的 AI Agent，基于 **OpenCode** 框架驱动，通过 MCP 工具与 GeneHub 交互，负责基因库的日常管理。

**配置文件**：`packages/registry/curator/`

```
curator/
├── opencode.json      # 本地开发配置（MCP stdio）
├── opencode-k8s.json  # K8s 生产配置（MCP Streamable HTTP → http://genehub/mcp）
├── opencode-prod.json # 本地连线上配置（kubectl exec）
├── system-prompt.md   # Curator 的角色定义和工作规范
└── listener.ts        # 实时事件监听器（PostgreSQL LISTEN/NOTIFY）
```

#### 使用 OpenCode 驱动 Curator

**前置条件**：

1. 安装 OpenCode：`npm install -g opencode` 或 `brew install opencode`
2. 设置 LLM API Key：`export MINIMAX_API_KEY="sk-xxx"`
3. 确保 PostgreSQL 正在运行且 GeneHub Registry 已迁移

**OpenCode 配置**：

| 配置文件 | MCP 传输 | 使用场景 |
|---------|---------|---------|
| `opencode.json` | stdio (local) | 本地开发，MCP 直连本地 DB |
| `opencode-k8s.json` | Streamable HTTP (remote) | K8s 部署，连接 `http://genehub/mcp` |
| `opencode-prod.json` | kubectl exec | 本地调试线上环境 |

**手动运行 Curator（本地）**：

```bash
cd packages/registry

# 先构建 MCP Server
pnpm build

# 方式一：交互式对话（调试用）
cd curator
MINIMAX_API_KEY="sk-xxx" opencode

# 方式二：单次任务执行
cd curator
MINIMAX_API_KEY="sk-xxx" opencode run "审核最近新入库的基因"

# 方式三：全面巡检
MINIMAX_API_KEY="sk-xxx" opencode run "执行基因库全面巡检"
```

> **注意**：`opencode` 自动读取当前目录的 `opencode.json`，无需 `--config` 参数。

**也可以使用其他 MCP 兼容的 AI 框架**：

```bash
# 方式一：通过 HTTP（推荐，GeneHub 运行中即可用）
# 任何 MCP 客户端连接 http://localhost:3000/mcp 即可

# 方式二：通过 stdio（本地开发）
# Claude Code
claude --mcp-config '{"genehub":{"command":"node","args":["dist/mcp/index.js"]}}' \
  "审核最近新入库的基因"
```

### 11.4 事件驱动架构

基因库的变更事件通过 PostgreSQL 原生的 `LISTEN/NOTIFY` 机制发布，无需额外消息队列。

**事件发布**（`services/gene-events.ts`）：

```sql
NOTIFY gene_events, '{"type":"gene.created","slug":"xxx","source":"clawhub"}'
```

**支持的事件类型**：

| 事件 | 触发时机 |
|------|----------|
| `gene.created` | 新基因入库 |
| `gene.updated` | 基因版本发布或元数据更新 |
| `gene.reviewed` | Curator 发布点评 |
| `gene.flagged` | 基因被标记待删除 |

**事件监听器**（`curator/listener.ts`）：

监听 `gene_events` 频道，收到 `gene.created` 事件后自动触发 OpenCode 运行 Curator 审核新基因。

```bash
# 启动事件监听器（本地开发）
cd packages/registry/curator
DATABASE_URL="postgres://genehub:genehub@localhost:5432/genehub" \
MINIMAX_API_KEY="sk-xxx" \
tsx listener.ts
```

### 11.5 联邦搜索

搜索 API 支持同时查询本地 GeneHub 数据库和 ClawHub 外部 API，结果合并后按来源标记返回。

**端点**：`GET /api/v1/genes/search?q=xxx`

**工作流程**：

```
用户搜索 → 并行查询 ─┬─ 本地 DB (ILIKE)    → 本地结果 (source: local)
                     └─ ClawHub API (搜索) → 远程结果 (source: clawhub)
                                            ↓
                                  去重（本地优先）→ 分数归一化 → 合并排序 → 返回
                                            ↓ (后台 fire-and-forget)
                                  ClawHub 新结果 → 入库为 pending → 发 gene.created 事件
                                                                    → Curator AI 审核
```

**设计原则**：
- ClawHub 结果**立即展示**，用户无需等待入库
- 后台自动将新的外部结果入库为 `pending` + `is_published: false`，触发 AI 审核
- 审核通过后 `approved` + `is_published: true`，后续搜索将作为本地结果命中
- 入库时通过 slug 去重，已存在的不重复插入
- ClawHub 超时或失败时优雅降级，只返回本地结果
- NoDeskClaw 同步为白名单，直接 `approved` 入库
- 返回 `sources` 字段标明各来源命中数量

**响应示例**：

```json
{
  "code": 0,
  "data": {
    "query": "memory",
    "total": 10,
    "items": [
      { "slug": "memory", "name": "记忆管理", "source": "local", "score": 1.0 },
      { "slug": "elite-longterm-memory", "name": "Elite Longterm Memory", "source": "clawhub", "score": 0.85 }
    ],
    "sources": { "local": 6, "clawhub": 4 }
  }
}
```

### 11.6 K8s 部署

**镜像**：

| 镜像 | Dockerfile | 内容 |
|------|-----------|------|
| `genehub` | `Dockerfile` | Registry + MCP HTTP Server + Web UI |
| `genehub-curator` | `Dockerfile.curator` | OpenCode CLI + tsx + Curator 配置 |

**Curator 部署清单**：`deploy/k8s/curator.yaml`

| 资源 | 类型 | 说明 |
|------|------|------|
| `gene-curator` | CronJob | 每 6 小时执行一次全面巡检 |
| `gene-curator-listener` | Deployment | 常驻进程，监听 `gene_events` 实时触发审核 |

**MCP 通信**：Curator Pod 通过 `POST http://genehub/mcp`（ClusterIP Service）连接 GeneHub MCP Server，使用 `GENEHUB_ADMIN_TOKEN` Bearer 认证。

**所需 Secrets**（统一使用 `genehub-app-secret`）：

```yaml
DATABASE_URL: postgres://...
GENEHUB_ADMIN_TOKEN: ghb_admin_xxx
MINIMAX_API_KEY: sk-xxx
```

**CI/CD**：`release.yml` 自动构建两个镜像、推送到 Volcengine CR、部署 GeneHub + Curator。

---

## 十二、里程碑

### M0 - 基础设施

- [x] 项目 monorepo 搭建（packages/types + registry + sdk + cli）
- [x] Gene Manifest 规范定稿（`docs/gene-learning-protocol.md`）+ Zod schema
- [x] 数据模型与数据库 schema 设计（Drizzle ORM + PostgreSQL）
- [x] Registry API 骨架（CRUD + 搜索 + 统一响应/错误处理）
- [x] CLI 骨架（install / search / list / publish / init）

### M1 - 核心功能 ✅

- [x] Registry 完整 API（版本管理、依赖解析、兼容校验、认证中间件、效能数据上报）
- [x] TypeScript SDK（客户端 + OpenClaw Adapter L1 + nanobot Adapter L1 + Generic Adapter）
- [x] Learning Engine（L1 浅层学习 + L2 深度学习引擎 + genehub-learner 元学习基因）
- [x] CLI 完整命令集（install/uninstall/search/list/publish/init/config/learn）
- [ ] NoDeskClaw 集成（→ M2.1）
- [x] 官方基因库（8 个高质量基因含 learning objectives + scenarios）

### M2 - 生态对接

#### M2.1 — NoDeskClaw 集成（最高优先级，M1 遗留）

将 GeneHub 与 NoDeskClaw 打通，使 NoDeskClaw 的基因市场以 GeneHub 为后端。

- [x] GeneHub 侧基础设施：Webhook 端点、NoDeskClaw Adapter（Client + Converter + Sync）、批量导入脚本
- [x] K8s 部署清单配置 `NODESKCLAW_DATABASE_URL` / `GENEHUB_WEBHOOK_SECRET`
- [ ] NoDeskClaw 基因市场 API 代理转发到 GeneHub Registry（Phase 2，需改 NoDeskClaw 代码）
- [ ] NoDeskClaw 学习引擎接入 GeneHub 标准学习协议（Phase 3，需改 NoDeskClaw 代码）
- [ ] NoDeskClaw `genes` 表降级为本地缓存，GeneHub 为数据主源（Phase 4，需改 NoDeskClaw 代码）

#### M2.2 — ClawHub Adapter ✅

从 ClawHub（clawhub.ai，OpenClaw 官方技能市场）拉取社区技能到 GeneHub。

- [x] ClawHub API 客户端（搜索 / 获取技能详情 / 下载技能包）
- [x] 格式转换：ClawHub `SKILL.md` frontmatter → GeneHub `gene.yaml` Manifest
- [x] ~~定时同步 / 手动触发同步（`POST /sync/clawhub`）~~ → **已弃用**，改用联邦搜索
- [x] 来源溯源：`source=clawhub` + `source_ref` 指向 ClawHub 原始 URL
- [x] 安全审查：过滤 ClawHavoc 事件后被标记的恶意技能
- [x] **联邦搜索（当前方案）**：实时查询 ClawHub API，不入库，按来源标记

#### M2.3 — Evomap Adapter ✅

对接 EvoMap（evomap.ai，AI 自进化基础设施）的 GEP 协议，获取进化推荐。

- [x] GEP 协议数据结构映射：EvoMap Gene/Capsule/Event → GeneHub Gene Manifest
- [x] Evolver 推荐接口对接：提交 Agent 能力画像 → 获取推荐基因组合
- [x] 进化信号集成：将 GeneHub 的效能数据回传给 EvoMap 用于进化分析
- [x] ~~`POST /sync/evomap`：请求 Evomap 推荐并导入推荐基因~~ → **已弃用**，改用联邦搜索

#### M2.4 — 推迟到 M3

- Python SDK（暂不紧急）
- npm / pip 分发支持（依赖 Python SDK）

### M3 - AI 能力 + 进阶功能 ✅（AI 部分）

- [x] MCP Server（17 个工具：查询 6 + 基因组 4 + 管理 4 + 审核 3）
- [x] Gene Curator Agent（OpenCode 配置 + 系统提示词 + 事件监听器）
- [x] 事件驱动架构（PostgreSQL LISTEN/NOTIFY + gene_events）
- [x] 联邦搜索（本地 DB + ClawHub API 并行查询、去重、分数归一化）
- [x] 基因审核 API（`gene_reviews` + 人工反馈覆盖）
- [x] 基因关系模型（`gene_relations`：synergy / conflict / extends / replaces）
- [x] 基因组版本管理（`genome_versions` + resolve 解析）
- [x] K8s 部署清单（CronJob 定期巡检 + Deployment 实时监听）
- [ ] Python SDK
- [ ] npm / pip 分发支持
- [ ] 基因效能数据聚合与排行
- [ ] 全文搜索升级（Meilisearch）
- [ ] DeskClaw Adapter（后续扩展）

---

## 十三、开放问题

| # | 问题 | 倾向 | 状态 |
|---|------|------|------|
| 1 | GeneHub 是独立部署还是嵌入 NoDeskClaw | 独立部署，NoDeskClaw 作为客户端 | 待确认 |
| 2 | 基因文件存储用数据库还是 Git 仓库 | 混合：元数据在 DB，内容在 Git | 待确认 |
| 3 | Registry 是否对外公开 | 初期内网部署，后期开放公共 Registry | 待确认 |
| 4 | ClawHub API 协议 | Convex HTTP API，技能格式为 SKILL.md + frontmatter，有完整 CLI | 已调研 |
| 5 | Evomap GEP 协议 | Gene/Capsule/Event 三层结构，Evolver 引擎 + 能力市场 | 已调研 |
| 6 | ClawHub 恶意技能过滤策略 | 跳过被标记/低星级技能，结合 VirusTotal 扫描结果 | 待确认 |

---

*文档持续更新中。*
