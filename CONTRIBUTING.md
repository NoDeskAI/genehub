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

## AI 能力开发

### MCP Server

GeneHub 通过 MCP Server 将基因库操作暴露为标准工具，供 OpenCode、Claude Code 等 AI 框架调用。

```bash
# 启动 MCP Server（开发模式）
pnpm --filter @nodeskai/genehub-registry mcp:dev

# 生产模式
pnpm --filter @nodeskai/genehub-registry build
pnpm --filter @nodeskai/genehub-registry mcp
```

新增 MCP 工具的步骤：

1. 在 `packages/registry/src/mcp/tools/` 下对应文件中实现工具函数
2. 在 `packages/registry/src/mcp/server.ts` 中用 `server.tool()` 注册
3. 确保导入排序正确（Biome 会检查）

### Gene Curator

Gene Curator 是基于 **OpenCode** 的 AI Agent，自动管理基因库。默认使用 **MiniMax M2.5** 模型。

#### 前置条件

1. 安装 OpenCode CLI：`npm install -g opencode`
2. 获取 MiniMax API Key：到 [MiniMax 开放平台](https://platform.minimaxi.com/) 注册并创建 API Key
3. 确保 PostgreSQL 已运行，GeneHub Registry 已构建

#### 快速启动

```bash
# 1. 构建 MCP Server（Curator 依赖它与基因库交互）
cd packages/registry
pnpm build

# 2. 设置环境变量
export DATABASE_URL="postgres://genehub:genehub@localhost:5432/genehub"
export MINIMAX_API_KEY="你的 MiniMax API Key"

# 3. 进入 Curator 目录
cd curator

# 4a. 交互模式 —— 开启一个 AI 对话，手动下达任务
opencode --config opencode.json

# 4b. 单次任务模式 —— 执行一个具体指令后退出
opencode run --config opencode.json "审核最近新入库的基因"
```

#### 常用 Curator 任务示例

```bash
# 审核待处理的基因
opencode run --config opencode.json "审核所有 review_status=pending 的基因"

# 整理基因分类
opencode run --config opencode.json "检查所有基因的分类是否正确，修正错误分类"

# 查找重复基因
opencode run --config opencode.json "查找基因库中的重复基因并合并"

# 定期巡检（推荐每日执行）
opencode run --config opencode.json "执行基因库巡检流程"

# 生成基因库报告
opencode run --config opencode.json "统计基因库当前状态并输出报告"
```

#### 更换 LLM 模型

编辑 `curator/opencode.json` 的 `model` 字段。当前配置的两个 MiniMax 模型：

| 模型 | 说明 | 适用场景 |
|------|------|---------|
| `minimax/MiniMax-M2.5` | 高质量模型（默认） | 复杂审核、分类决策 |
| `minimax/MiniMax-M2.5-lightning` | 快速模型 | 批量处理、简单任务 |

切换到 lightning 模型：

```json
{
  "model": "minimax/MiniMax-M2.5-lightning"
}
```

也可以添加其他 provider（如 OpenAI、Anthropic），参见 [OpenCode 配置文档](https://opencode.ai/docs/config)。

#### 修改 Curator 行为

编辑 `curator/system-prompt.md` 调整角色定义、审核标准和巡检流程。

### 事件监听器

Curator 的事件监听器通过 PostgreSQL `LISTEN/NOTIFY` 接收基因变更事件，实现基因入库后自动审核。

```bash
cd packages/registry
DATABASE_URL="postgres://genehub:genehub@localhost:5432/genehub" \
MINIMAX_API_KEY="你的 MiniMax API Key" \
tsx curator/listener.ts
```

收到 `gene.created` 事件后会自动触发 OpenCode 审核该基因。

#### K8s 生产部署

生产环境中，Curator 以 **CronJob**（定时巡检）和 **Deployment**（事件监听）两种模式部署：

```bash
# 部署清单位于 deploy/k8s/curator.yaml
# 需要在 K8s Secret 中配置 MINIMAX_API_KEY
kubectl apply -f deploy/k8s/curator.yaml
```

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
