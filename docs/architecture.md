# GeneHub 架构设计

> 版本：v0.1
> 日期：2026-02-27
> 状态：草稿

---

## 一、定位与背景

### 1.1 为什么需要 GeneHub

ClawBuddy 已经实现了一套完整的基因进化生态（Gene Evolution Ecosystem），包括基因市场、学习引擎、遗忘机制、Agent 创造等能力。但这套系统存在以下问题：

| 问题 | 影响 |
|------|------|
| 基因存储与管理耦合在 ClawBuddy 后端 | 其他 Agent 产品无法复用 |
| 基因格式绑定 OpenClaw（SKILL.md + openclaw.json） | nanobot 等产品需要各自适配 |
| 无外部基因引入通道 | 无法从 ClawHub、Evomap 等外部生态获取基因 |
| 安装方式单一（API 调用） | 无法兼容 `claw install`、`npm`、`pip` 等主流分发方式 |

**GeneHub 的目标**：将基因能力从 ClawBuddy 中抽离为独立的中心化基因服务，成为 NoDeskClaw 全生态的基因基础设施。

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
│   │  ClawBuddy   │  │  openClaw    │  │  nanobot     │  (更多产品后续)    │
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

从外部生态拉取基因到 GeneHub：

| 适配器 | 数据源 | 协议 |
|--------|--------|------|
| ClawHub Adapter | ClawHub 基因市场 | REST API / Webhook |
| Evomap Adapter | Evomap 进化推荐引擎 | REST API |
| Git Repo Importer | GitHub / GitLab 仓库 | Git Clone + gene.yaml 解析 |

#### Outbound Adapters（产品适配层）

将 GeneHub 的基因注入到不同 Agent 产品（初期聚焦 openClaw + nanobot，其他产品后续扩展）：

| 适配器 | 目标产品 | 注入方式 |
|--------|---------|---------|
| OpenClaw Adapter | openClaw / ClawBuddy | SKILL.md + openclaw.json（NFS / API） | 初期 |
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

从 ClawBuddy 的 Gene 模型演化而来，增加多产品兼容字段：

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
| source | enum | `official` / `clawhub` / `evomap` / `community` / `agent` |
| source_ref | string | 外部来源引用（ClawHub URL / Evomap ID） |
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

### 3.2 与 ClawBuddy 的数据关系

```
ClawBuddy                              GeneHub
┌─────────────────────┐         ┌─────────────────────┐
│ Instance             │         │ Gene (Registry)      │
│ InstanceGene         │◄───────►│ Genome (Registry)    │
│ EvolutionEvent       │         │ GeneVersion          │
│ GeneEffectLog        │         │                      │
│ GeneRating           │   sync  │                      │
└─────────────────────┘  ◄────► └─────────────────────┘

ClawBuddy 保留：实例级基因状态（InstanceGene）、进化日志、效能数据
GeneHub 统管：基因元数据、版本、manifest、搜索、兼容性
```

ClawBuddy 的 `genes` 表将作为 GeneHub 的客户端缓存，定期与 GeneHub Registry 同步。新基因由 GeneHub 统一管理，ClawBuddy 通过 API 拉取。

---

## 四、标准基因清单（Gene Manifest）

见 `docs/gene-learning-protocol.md` 第二章。

---

## 五、技术选型

| 层级 | 选型 | 说明 |
|------|------|------|
| Registry API | TypeScript + Hono | 轻量高性能，运行在 Node.js / Bun / Edge |
| 数据库 | PostgreSQL | 与 ClawBuddy 同生态，支持 JSONB 全文搜索 |
| 基因文件存储 | 文件系统 + Git | 基因内容版本化天然适合 Git 管理 |
| 搜索引擎 | PostgreSQL FTS（初期）/ Meilisearch（后期） | 先简后繁 |
| CLI | TypeScript (tsx) | 跨平台，单文件分发 |
| SDK | TypeScript + Python | 覆盖主流 Agent 开发语言 |
| 分发 | npm + pip + GitHub Releases | 兼容主流包管理器 |

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

#### 外部基因同步

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/sync/clawhub` | 触发 ClawHub 同步 |
| POST | `/sync/evomap` | 请求 Evomap 推荐 |
| POST | `/import/git` | 从 Git 仓库导入基因 |

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
│   └── cli/                      # 命令行工具
│       ├── src/
│       │   ├── commands/         # 子命令
│       │   │   ├── install.ts
│       │   │   ├── search.ts
│       │   │   ├── list.ts
│       │   │   ├── publish.ts
│       │   │   └── init.ts
│       │   └── index.ts
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

## 八、与 ClawBuddy 集成方案

### 8.1 迁移路径

| 阶段 | 动作 | ClawBuddy 影响 |
|------|------|----------------|
| Phase 1 | GeneHub Registry 独立部署，导入 ClawBuddy 现有基因数据 | ClawBuddy 保持现有功能不变 |
| Phase 2 | ClawBuddy 基因市场 API 改为代理转发到 GeneHub | 前端无感知，后端 gene_service 添加 GeneHub 客户端 |
| Phase 3 | ClawBuddy 学习引擎接入标准学习协议 | Learning Channel Plugin 无需改动，gene_service 适配 |
| Phase 4 | ClawBuddy genes 表降级为本地缓存 | 基因元数据以 GeneHub 为主，本地缓存加速 |

### 8.2 API 映射

| ClawBuddy 现有 API | GeneHub 替代 |
|---------------------|-------------|
| `GET /genes` | `GET /api/v1/genes` (Registry) |
| `GET /genes/:id` | `GET /api/v1/genes/:slug` (Registry) |
| `POST /genes/:id/rate` | `POST /api/v1/genes/:slug/rate` (Registry) |
| `POST /instances/:id/genes/install` | 保留（实例级操作留在 ClawBuddy，拉取 manifest 从 GeneHub） |
| `POST /genes/learning-callback` | 保留（学习回调留在 ClawBuddy） |

### 8.3 数据同步

```
GeneHub Registry                     ClawBuddy
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

```
ClawHub Registry                GeneHub
     │                              │
     │  1. GET /packages?q=...      │
     │ ◄────────────────────────────│ (搜索)
     │                              │
     │  2. GET /packages/:id        │
     │ ◄────────────────────────────│ (获取详情)
     │                              │
     │  3. 转换 manifest 格式        │
     │                      ────────│
     │                      │       │
     │                      ▼       │
     │  4. 存入 GeneHub              │
     │         source=clawhub       │
     │                              │
```

转换规则：
- ClawHub 的 package manifest → GeneHub Gene Manifest
- ClawHub 的标签体系 → GeneHub 标签映射
- 保留 `source_ref` 指向 ClawHub 原始 URL

### 9.2 Evomap 适配

Evomap 提供基于 Agent 能力图谱的进化路径推荐：

```
Evomap                          GeneHub
  │                                │
  │  1. POST /recommend            │
  │ ◄──────────────────────────────│ (提交 Agent 当前能力画像)
  │                                │
  │  2. 返回推荐基因组合            │
  │ ──────────────────────────────►│
  │                                │
  │  3. GeneHub 解析推荐            │
  │       并生成安装建议             │
  │                                │
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
| HTTP API | `POST /install` | 程序化调用（ClawBuddy 等） |

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

## 十一、里程碑

### M0 - 基础设施（1-2 周）

- [x] 项目 monorepo 搭建（packages/types + registry + sdk + cli）
- [x] Gene Manifest 规范定稿（`docs/gene-learning-protocol.md`）+ Zod schema
- [x] 数据模型与数据库 schema 设计（Drizzle ORM + PostgreSQL）
- [x] Registry API 骨架（CRUD + 搜索 + 统一响应/错误处理）
- [x] CLI 骨架（install / search / list / publish / init）

### M1 - 核心功能（3-4 周）

- [ ] Registry 完整 API（版本管理、依赖解析、兼容校验）
- [ ] TypeScript SDK（客户端 + OpenClaw Adapter + nanobot Adapter）
- [ ] CLI 完整命令集
- [ ] ClawBuddy 集成（gene_service 对接 GeneHub API）
- [ ] 官方基因库（从 ClawBuddy 导入现有基因模板）

### M2 - 生态扩展（5-6 周）

- [ ] ClawHub Adapter（外部基因拉取）
- [ ] Evomap Adapter（进化推荐）
- [ ] Python SDK
- [ ] npm / pip 分发支持

### M3 - 进阶能力（7-8 周）

- [ ] DeskClaw Adapter（后续扩展）
- [ ] Agent 创造基因自动发布到 GeneHub
- [ ] 基因效能数据聚合与排行
- [ ] 全文搜索升级（Meilisearch）
- [ ] 基因市场 Web UI

---

## 十二、开放问题

| # | 问题 | 倾向 | 状态 |
|---|------|------|------|
| 1 | GeneHub 是独立部署还是嵌入 ClawBuddy | 独立部署，ClawBuddy 作为客户端 | 待确认 |
| 2 | 基因文件存储用数据库还是 Git 仓库 | 混合：元数据在 DB，内容在 Git | 待确认 |
| 3 | Registry 是否对外公开 | 初期内网部署，后期开放公共 Registry | 待确认 |
| 4 | ClawHub 的具体 API 协议 | 待 ClawHub 方提供文档 | 待确认 |
| 5 | Evomap 的推荐算法接口 | 待 Evomap 方提供文档 | 待确认 |

---

*文档持续更新中。*
