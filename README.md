# GeneHub

NoDeskClaw AI 员工基因库 —— 统一管理、分发和演化 Agent 能力基因。

## 什么是 GeneHub

GeneHub 是 NoDeskClaw 生态的核心基因注册中心（Gene Registry），为全体 AI 员工提供可复用、可组合、可演化的能力基因。

它同时承担三个角色：
- **基因注册中心**（Registry）：统一存储、版本管理、搜索发现
- **标准学习协议**（Protocol）：定义基因从发现到安装到学习的全生命周期规范
- **多产品适配层**（Adapters）：初期对接 openClaw、nanobot，后续扩展 DeskClaw 等产品

## 核心能力

### 基因库管理

- 为 NoDeskClaw 全体 AI 员工提供统一的基因存储与检索
- 语义化版本管理（SemVer）、依赖解析与冲突检测
- 基因标签体系：能力（ability）、性格（personality）、知识（knowledge）、工具（tool）

### 外部基因获取

- 从 **ClawHub** 拉取社区共享基因
- 从 **Evomap** 获取演化路径推荐的基因组合
- 从 Git 仓库直接导入基因
- 外部基因自动适配与兼容性校验

### 标准学习协议（Gene Learning Protocol）

- 定义基因的标准描述格式 **Gene Manifest**（`gene.yaml`）
- 标准化的安装 / 学习 / 遗忘 / 创造协议
- 渐进式学习能力等级：L0 直接安装 → L1 浅层学习 → L2 深度学习 → L3 自主进化
- 初期为 **openClaw** 和 **nanobot** 提供 Adapter 接口，后续扩展 DeskClaw 等产品

### 兼容安装

- 原生 CLI：`genehub install <slug>`
- ClawHub 兼容：`claw install @genehub/<slug>`
- npm 兼容：`npx genehub install <slug>`
- pip 兼容：`pip install genehub-<slug>`
- HTTP API：程序化调用（ClawBuddy 等平台对接）

## 快速开始

### 开发环境搭建

```bash
# 克隆仓库
git clone git@github.com:NoDeskAI/genehub.git
cd genehub

# 安装依赖（需要 pnpm >= 9 和 Node.js >= 20）
pnpm install

# 启动 PostgreSQL（需要 Docker）
docker compose up -d

# 运行数据库迁移
pnpm db:generate
pnpm db:migrate

# 导入种子数据
pnpm db:seed

# 启动 Registry 服务
pnpm dev:registry
```

### 使用 CLI

```bash
# 搜索基因
genehub search code-review

# 安装基因（自动检测当前 Agent 产品：openClaw / nanobot）
genehub install code-review

# 安装指定版本
genehub install code-review@1.2.0

# 安装并触发深度学习
genehub install code-review --learn

# 触发深度学习（L2）
genehub learn code-review

# 检查学习结果
genehub learn --check code-review

# 查看已安装基因
genehub list

# 卸载基因
genehub uninstall code-review

# 管理配置
genehub config set registry http://localhost:3000
genehub config set token ghb_your_token

# 初始化新基因模板
genehub init ./my-gene

# 发布基因
genehub publish ./my-gene/
```

### 运行测试

```bash
pnpm test
```

## 项目结构

```
genehub/
├── docs/                           # 设计文档
│   ├── architecture.md             # 架构设计
│   └── gene-learning-protocol.md   # 标准学习协议规范
├── packages/
│   ├── types/                      # @genehub/types - 共享类型与 Zod schemas
│   ├── registry/                   # @genehub/registry - Gene Registry Service (Hono + Drizzle)
│   ├── sdk/typescript/             # @genehub/sdk - TypeScript SDK + Adapters
│   └── cli/                        # genehub - 命令行工具 (Commander.js)
├── genes/                          # 官方基因库
│   └── skills/<gene-slug>/
│       ├── gene.yaml               # Gene Manifest
│       └── SKILL.md                # 技能内容
├── package.json                    # monorepo 根配置 (pnpm workspace)
├── docker-compose.yml              # PostgreSQL 本地开发
└── biome.json                      # Lint / Format 配置
```

## 协议兼容矩阵

> 初期聚焦 openClaw + nanobot，其他产品后续扩展。

| 产品 | 安装 | 学习(L0) | 深度学习(L2) | 自主进化(L3) | 状态 |
|------|------|----------|-------------|-------------|------|
| openClaw / ClawBuddy | ✅ | ✅ | ✅ | ✅ | 初期支持 |
| nanobot | ✅ | ✅ | 🚧 | 🚧 | 初期支持 |
| DeskClaw | — | — | — | — | 后续扩展 |
| ClawHub | — | — | — | — | 后续扩展 |
| Evomap | — | — | — | — | 后续扩展 |

## 文档

- [架构设计](docs/architecture.md)
- [标准学习协议规范](docs/gene-learning-protocol.md)

## License

MIT
