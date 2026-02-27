# GeneHub

NoDeskClaw AI 员工基因库 —— 统一管理、分发和演化 Agent 能力基因。

## 什么是 GeneHub

GeneHub 是 NoDeskClaw 生态的核心基因仓库，为全体 AI 员工提供可复用、可组合、可演化的能力基因（Skills / Rules / Protocols）。它同时作为基因中转站，连接外部生态与内部 Agent 产品，实现能力的标准化流通。

## 核心能力

### 基因库管理

- 为 NoDeskClaw 全体 AI 员工提供统一的基因存储与检索
- 支持基因的版本管理、依赖解析与冲突检测
- 基因分类：Skills（技能）、Rules（规则）、Protocols（协议）

### 外部基因获取

- 从 **ClawHub** 拉取社区共享基因
- 从 **Evomap** 获取演化路径推荐的基因组合
- 外部基因自动适配与兼容性校验

### 标准学习协议

- 为 **DeskClaw**、**openClaw**、**nanobot** 等 Agent 产品提供标准化的基因注入协议
- 统一的基因描述格式（Gene Manifest）
- 支持热加载与运行时基因切换

### 兼容安装

- 兼容 ClawHub 的 `claw install` 安装方式
- 兼容 DeskClaw 的本地基因目录结构
- 支持 `npx`、`pip`、`brew` 等主流包管理器分发

## 快速开始

```bash
# 从 ClawHub 安装基因
claw install @genehub/core

# 或通过 npm
npx genehub init

# 列出可用基因
genehub list

# 为 Agent 注入基因
genehub inject <agent-name> <gene-name>
```

## 项目结构

```
genehub/
├── genes/           # 基因库
│   ├── skills/      # 技能基因
│   ├── rules/       # 规则基因
│   └── protocols/   # 协议基因
├── adapters/        # 外部生态适配器
│   ├── clawhub/     # ClawHub 适配
│   └── evomap/      # Evomap 适配
├── sdk/             # 标准学习协议 SDK
└── cli/             # 命令行工具
```

## 协议兼容矩阵

| 产品 | 安装方式 | 基因注入 | 热更新 |
|------|---------|---------|--------|
| DeskClaw | ✅ | ✅ | ✅ |
| openClaw | ✅ | ✅ | ✅ |
| nanobot | ✅ | ✅ | 🚧 |
| ClawHub | ✅ | ✅ | ✅ |
| Evomap | ✅ | 🚧 | 🚧 |

## License

MIT
