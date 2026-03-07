# GeneHub 开源前敏感信息扫描报告

**扫描日期**: 2026-03-07  
**扫描范围**: 全项目代码、配置、部署清单、Git 历史

---

## 1. 密钥/凭证扫描

### 1.1 发现项

| 位置 | 内容 | 风险等级 | 说明 |
|------|------|----------|------|
| `packages/registry/.env` | 存在 | 低 | 文件存在但已被 `.gitignore` 正确忽略，不会被提交 |
| `packages/registry/.env.example` | `GENEHUB_ADMIN_TOKEN=admin-dev-token` | 中 | 包含默认 token 值，建议改为空或 `<CHANGE_ME>` |
| `packages/registry/src/api/auth.ts:14` | `JWT_SECRET ?? 'genehub-dev-jwt-secret'` | 低 | 开发环境 fallback，生产需配置 `GENEHUB_JWT_SECRET` |
| `packages/registry/src/middleware/auth.ts:13-14` | `admin-dev-token` / `genehub-dev-jwt-secret` | 低 | 同上，开发 fallback |
| `packages/registry/src/services/gitea-service.ts:3` | `GENEHUB_ADMIN_TOKEN \|\| 'admin-dev-token'` | 低 | 同上 |
| 测试文件 | `test-tok`, `secret-key`, `my-secret` | 无 | 仅测试 fixture，可接受 |

### 1.2 凭证使用方式（正确）

- `deploy/k8s/*.yaml` 使用 `secretKeyRef` 从 K8s Secret 读取
- `.github/workflows/release.yml` 使用 `${{ secrets.* }}` 引用 GitHub Secrets
- 生产环境变量均通过 `process.env.*` 读取

---

## 2. 内部 URL / IP 扫描

### 2.1 发现项

| 位置 | 内容 | 风险等级 | 说明 |
|------|------|----------|------|
| `deploy/k8s/genehub.yaml` | `nodesk-center-cn-beijing.cr.volces.com` | 高 | 火山引擎容器镜像仓库，内部/公司基础设施 |
| `deploy/k8s/curator.yaml` | 同上 | 高 | 同上 |
| `deploy/k8s/gitea.yaml` | 同上 | 高 | 同上 |
| `deploy/k8s/postgres.yaml` | 同上 | 高 | 同上 |
| `Dockerfile.curator` | `internet-cn-beijing.cr.volces.com/library/node:22-alpine` | 高 | 火山引擎镜像源 |
| `.github/workflows/release.yml` | `CR_REGISTRY`, `CR_IMAGE` 等 | 高 | 同上，CI 推送目标 |
| `deploy/k8s/genehub.yaml` | `genehub.nodeskai.com` | 中 | 公开域名，开源后可保留 |
| `deploy/k8s/*` | `nodeskclaw-system` | 中 | K8s namespace，可改为通用名如 `genehub-system` |

### 2.2 无问题项

- 无私有 IP（10.x, 172.16-31.x, 192.168.x）
- `localhost` 仅用于本地开发/文档示例

---

## 3. 硬编码敏感值

### 3.1 发现项

| 位置 | 内容 | 风险等级 | 说明 |
|------|------|----------|------|
| `deploy/k8s/genehub.yaml:65` | `GENEHUB_ADMIN_LOGINS: "xzq-xu"` | **高** | 真实 GitHub 用户名，需移除或改为占位符 |
| `packages/registry/.env.example` | `DATABASE_URL=postgres://genehub:genehub@localhost:5432/genehub` | 中 | 含密码 `genehub`，为开发示例格式，建议改为 `postgres://user:<CHANGE_ME>@localhost:5432/genehub` |
| 多处 | `postgres://genehub:genehub@localhost:5432/genehub` | 低 | 本地开发默认，README/curator/drizzle 等，可接受 |

### 3.2 无问题项

- 未发现 OpenAI/AWS/GitHub 等真实 API key 模式
- K8s Secret 模板已使用 `<CHANGE_ME>` 占位符

---

## 4. .gitignore 检查

### 4.1 已正确忽略

- `.env`
- `.env.*`（含 `.env.local` 等）
- `!.env.example`（保留示例文件）
- `node_modules/`
- `__pycache__/`
- `.venv/`
- `*.pyc`
- `.pytest_cache`
- `.mypy_cache`
- `deploy/k8s/kubeconfig-*.yaml`

### 4.2 结论

`.gitignore` 配置符合开源规范。

---

## 5. .env.example 检查

### 5.1 当前内容

```
DATABASE_URL=postgres://genehub:genehub@localhost:5432/genehub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GENEHUB_JWT_SECRET=
GENEHUB_ADMIN_TOKEN=admin-dev-token
GITEA_URL=http://localhost:3001
GITEA_ADMIN_USER=genehub
GITEA_ORG=genes
```

### 5.2 建议

| 变量 | 建议 |
|------|------|
| `GENEHUB_ADMIN_TOKEN` | 改为空或 `<CHANGE_ME>`，不要提供默认值 |
| `DATABASE_URL` | 可选：密码改为 `<CHANGE_ME>` 以强调需修改 |

---

## 6. Git 历史检查

### 6.1 检查命令

```bash
git log --all --diff-filter=A --name-only --pretty=format:"" | grep -E "\.env$|secret|password"
```

### 6.2 结果

**未发现** `.env` 或敏感文件曾被提交到 Git 历史。

---

## 7. 其他发现

### 7.1 console.log / 调试语句

- CLI、Registry、Curator 中存在 `console.log`，多为正常输出（启动信息、进度、结果）
- 无明显的调试用 `console.log` 或 `debugger` 残留

### 7.2 开源项目规范符合度

- 无密钥、凭证、内部 URL 的硬编码（除上述需整改项）
- 无 `.env` 提交
- `.env.example` 仅需小幅调整

---

## 8. 整改建议汇总

### 必须修复（开源前）

| 优先级 | 项 | 建议操作 |
|--------|-----|----------|
| P0 | `deploy/k8s/genehub.yaml` 中 `GENEHUB_ADMIN_LOGINS: "xzq-xu"` | 改为 `"<CHANGE_ME>"` 或通过 Secret 注入 |
| P0 | `deploy/k8s/*` 中的 `nodesk-center-cn-beijing.cr.volces.com` | 改为占位符或使用 `docker.io` 等公开镜像源 |
| P0 | `Dockerfile.curator` 中的 `internet-cn-beijing.cr.volces.com` | 改为 `node:22-alpine` 等公开镜像 |
| P0 | `.github/workflows/release.yml` 中的 CR 地址 | 开源版可移除 deploy-k8s job，或改为可配置变量 |

### 建议修复

| 优先级 | 项 | 建议操作 |
|--------|-----|----------|
| P1 | `.env.example` 中 `GENEHUB_ADMIN_TOKEN=admin-dev-token` | 改为空或 `<CHANGE_ME>` |
| P1 | `deploy/k8s/*` 中 `nodeskclaw-system` | 可改为 `genehub-system` 等通用名 |

### 可选

| 项 | 说明 |
|-----|------|
| `postgres://genehub:genehub@...` | 开发示例常用格式，可保留；若强调安全可改为占位符 |
| `genehub.nodeskai.com` | 公开域名，可保留作为默认 Registry URL |

---

## 9. 检查清单（开源前确认）

- [ ] 移除/替换 `GENEHUB_ADMIN_LOGINS` 中的真实用户名
- [ ] 替换 deploy/k8s 中的火山引擎镜像地址为占位符或公开源
- [ ] 替换 Dockerfile.curator 中的镜像源
- [ ] 调整 release.yml 中的 deploy 目标（或移除）
- [ ] 更新 .env.example 中的 GENEHUB_ADMIN_TOKEN
- [ ] 确认 `packages/registry/.env` 未被 git 跟踪（已确认忽略）
- [ ] 再次运行 `git status` 确认无敏感文件待提交
