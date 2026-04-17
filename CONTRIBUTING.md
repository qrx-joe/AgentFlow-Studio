# 贡献指南

感谢你对 AgentFlow Studio 感兴趣！在提交贡献前，请先阅读本指南。

## 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/qrx-joe/AgentFlow-Studio.git
cd AgentFlow-Studio

# 安装根依赖
pnpm install

# 安装前端依赖
pnpm -C frontend install

# 安装后端依赖
pnpm -C backend install
```

启动开发服务：

```bash
# 后端 (http://localhost:3000)
pnpm -C backend start:dev

# 前端 (http://localhost:5173)
pnpm -C frontend dev
```

## 代码规范

### 提交信息格式

项目使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范，提交信息会被 `commitlint` 强制检查。

格式：
```
<type>(<scope>): <subject>
```

允许的 `type`：
- `feat` — 新功能
- `fix` — 修复 bug
- `docs` — 文档更新
- `style` — 代码格式调整（不影响功能）
- `refactor` — 重构
- `perf` — 性能优化
- `test` — 测试相关
- `chore` — 构建/工具链相关
- `ci` — CI/CD 配置
- `build` — 构建系统
- `revert` — 回滚提交

示例：
```bash
git commit -m "feat: 添加工作流节点复制功能"
git commit -m "fix(workflow): 修复条件分支边校验错误"
git commit -m "docs: 更新 API 接口文档"
```

### 代码格式化

提交前会自动运行 `lint-staged`，对 staged 文件执行：
- `prettier --write`
- `eslint --fix`

你也可以手动运行：

```bash
# 格式化全部文件
pnpm run format

# 检查格式
pnpm run format:check

# 修复 ESLint
pnpm -C backend lint
pnpm -C frontend lint
```

## 分支策略

- `main` — 主分支，受保护，需通过 CI 才能合并
- 功能分支 — 从 `main` 切出，命名建议：`feat/xxx`、`fix/xxx`、`docs/xxx`

```bash
git checkout -b feat/workflow-node-copy
```

## 测试

提交前请确保以下测试通过：

```bash
# 后端单元测试
pnpm -C backend test

# 工作流引擎测试
pnpm -C backend test:workflow

# 前端构建检查
pnpm -C frontend build:ci
```

## 提交 Pull Request

1. Fork 仓库并从 `main` 切出功能分支
2. 在本地完成开发和测试
3. 确保 `pnpm run format:check` 和 lint 无报错
4. Push 分支并发起 PR
5. 等待 CI 全部通过（GitHub Actions 会运行 prettier → lint → build → test）
6. PR 描述请简要说明改动原因和影响范围

## Issue 反馈

反馈问题时请尽量包含：
- 问题描述和复现步骤
- 期望行为 vs 实际行为
- 运行环境（Node 版本、操作系统、浏览器）
- 相关错误日志或截图

## 联系方式

如有疑问，欢迎通过 GitHub Issue 讨论。
