# Contributing to GeneHub

感谢你对 GeneHub 的关注。以下是参与贡献的指南。

## 开发环境

### 前置条件

- Node.js >= 20
- pnpm >= 9
- Python >= 3.12（如需开发 Python SDK）
- PostgreSQL >= 15

### 本地搭建

```bash
# 克隆仓库
git clone https://github.com/NoDeskAI/genehub.git
cd genehub

# 安装依赖
pnpm install

# 启动 Registry 开发服务
cd packages/registry
pnpm dev
```

## 开发流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 编写代码和测试
4. 确保通过 lint 和测试：`pnpm lint && pnpm test`
5. 提交（commit message 格式见下方）
6. 推送到你的 Fork：`git push origin feat/your-feature`
7. 创建 Pull Request

## Commit Message

格式：`<type>(<scope>): <subject>`

- type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore`
- scope：`registry` / `cli` / `sdk` / `protocol` / `genes` 等
- subject：中文，50 字符内

示例：

```
feat(registry): 基因搜索 API 支持标签过滤
fix(cli): 修复 install 命令依赖解析问题
docs(protocol): 补充 nanobot Adapter 映射规则
```

## Pull Request

- 标题格式同 commit message
- 描述变更内容和测试方案
- 关联相关 Issue：`Closes #123`
- 确保 CI 全部通过

## 代码规范

- TypeScript：Biome 格式化和 lint
- Python：Ruff 格式化和 lint
- 详细规范见 `AGENTS.md`

## 贡献基因

如果你想贡献一个新的基因到官方基因库：

1. 在 `genes/` 下创建目录：`genes/<your-gene-slug>/`
2. 编写 `gene.yaml`（Gene Manifest）和 `SKILL.md`
3. 格式要求见 `docs/gene-learning-protocol.md`
4. 提交 PR，标题：`feat(genes): 添加 <gene-name> 基因`

## 报告问题

请通过 [GitHub Issues](https://github.com/NoDeskAI/genehub/issues) 提交，标题格式：

```
[模块] 问题描述
```

包含：背景、期望行为、实际行为、复现步骤。

## 行为准则

请保持友善和建设性的交流。
