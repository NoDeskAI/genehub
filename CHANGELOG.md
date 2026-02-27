# Changelog

All notable changes to this project will be documented in this file.

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
