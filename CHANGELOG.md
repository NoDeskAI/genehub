# Changelog

All notable changes to this project will be documented in this file.

## v2026-02-27-m1

### M1 - 核心功能

#### Registry 完整 API
- 版本管理：`POST /:slug/versions` 发布新版本、`GET /:slug/versions/:version` 获取指定版本
- 依赖解析：`POST /resolve` 支持 semver 范围匹配、循环依赖检测、拓扑排序
- 认证中间件：Bearer Token、角色分级（public / publisher / admin）
- 效能数据上报：`POST /:slug/effectiveness` + `POST /:slug/installed` 安装统计
- Gene CRUD 增强：`PUT /:slug` 更新、`DELETE /:slug` 软删除、版本指定 manifest 获取

#### Learning Engine（L1 + L2）
- L1 浅层学习：安装基因时自动更新 AGENTS.md 能力声明、写入 memory 记录、合并 MCP Servers
- L2 深度学习引擎：LearningEngine 类、学习任务生成、练习场景、结果解析与 variant 应用
- genehub-learner 元学习基因：always-on skill，教 Agent 处理学习任务

#### 适配器增强
- BaseAdapter 重构：`doInstall/doUninstall` + `onPostInstall/onPostUninstall` hook 模式
- OpenClaw Adapter L1：自动更新 AGENTS.md、memory、MCP 配置
- nanobot Adapter L1：memory 记录、版本解析
- getInstalledVersion()：从 SKILL.md front matter 解析版本号
- uninstall()：清理 AGENTS.md 中的能力声明

#### CLI 完整命令集
- 新增：`config set/get`、`uninstall`、`learn`（L2 深度学习触发/检查）
- 增强：`install` 支持 `slug@version` + `--learn` 自动触发学习
- 增强：`search --json`、`list --json` JSON 格式输出
- 增强：`list` 显示版本号

#### 官方基因库
- 新增 7 个高质量基因：genehub-learner、analytical-thinking、clean-code、test-driven-development、data-analysis、communication-style、prompt-engineering
- 每个基因包含完整的 learning objectives 和 scenarios

#### 测试
- Learning Engine 单元测试（6 项）
- OpenClaw Adapter L1 集成测试（6 项）
- 全部 30 项测试通过

---

## v2026-02-27-alpha

### Added

- 项目初始化
- 架构设计文档（`docs/architecture.md`）
- 标准学习协议规范（`docs/gene-learning-protocol.md`）
- 项目基础规则（AGENTS.md、Cursor Rules、开源项目规范）
- MIT License、CONTRIBUTING.md

### M0 - 基础设施

- pnpm monorepo 搭建（`@genehub/types` + `@genehub/registry` + `@genehub/sdk` + `genehub` CLI）
- `@genehub/types`：Gene Manifest Zod schema、实体类型、API 类型、Adapter 接口
- `@genehub/registry`：Hono + Drizzle ORM + PostgreSQL，Gene CRUD API（搜索/详情/manifest/版本/发布）
- `@genehub/sdk`：GeneHub API 客户端 + OpenClaw Adapter + nanobot Adapter + Generic Adapter
- `genehub` CLI：install / search / list / publish / init 五个子命令
- 官方基因示例：`genes/skills/code-review/`
- Docker Compose 本地 PostgreSQL 环境
- Vitest 测试：Manifest schema 校验 + Registry API + Adapter 单元测试
