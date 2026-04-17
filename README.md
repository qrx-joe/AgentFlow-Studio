# AgentFlow Studio

轻量级类 Coze 智能体平台，支持可视化拖拽工作流编排、知识库构建与 RAG 检索，以及智能问答 Agent。

[![ci](https://github.com/qrx-joe/AgentFlow-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/qrx-joe/AgentFlow-Studio/actions/workflows/ci.yml)

## 技术栈

| 端   | 技术                                                   |
| ---- | ------------------------------------------------------ |
| 前端 | Vue 3.4+、Pinia、Vue Flow、Element Plus、Vite 5        |
| 后端 | NestJS 10、TypeORM、PostgreSQL 15+、Redis              |
| AI   | OpenAI API（可配置 base URL）、text-embedding 向量模型 |

## 功能特性

- **工作流编排**：可视化拖拽画布，灵活编排 AI 工作流
- **知识库 RAG**：文档上传、分块、嵌入、向量检索
- **智能问答 Agent**：连接工作流与大语言模型
- **SSE 流式输出**：实时流式对话体验

## 快速启动

### 前端开发

```bash
cd frontend
pnpm install
pnpm dev
# 访问 http://localhost:5173
```

### 后端开发

```bash
cd backend
pnpm install
pnpm start:dev
# API 服务 http://localhost:3000
```

### Docker 部署（生产环境）

```bash
docker-compose up -d
# PostgreSQL: 5432, Redis: 6379, Backend: 3000, Frontend: 8080
```

## 环境变量

### Backend (.env)

| 变量              | 说明                | 默认值                                                         |
| ----------------- | ------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL 连接地址 | `postgresql://agentflow:agentflow123@localhost:5432/agentflow` |
| `REDIS_HOST`      | Redis 主机          | `localhost`                                                    |
| `REDIS_PORT`      | Redis 端口          | `6379`                                                         |
| `OPENAI_API_KEY`  | OpenAI API Key      | -                                                              |
| `OPENAI_BASE_URL` | OpenAI API 地址     | `https://api.openai.com/v1`                                    |

## 项目结构

```
.
├── backend/                 # NestJS 后端
│   └── src/
│       ├── workflow/       # 工作流 CRUD 和执行引擎
│       ├── knowledge/       # 知识库、向量嵌入、RAG 检索
│       ├── chat/           # 聊天会话和消息处理
│       └── agent/          # Agent 编排服务
├── frontend/               # Vue 3 前端
│   └── src/
│       ├── views/         # 页面组件
│       ├── components/    # 可复用组件
│       ├── stores/        # Pinia 状态管理
│       └── api/           # API 客户端
├── docker-compose.yml      # Docker 部署配置
└── docs/                   # 项目文档
```

## 代码质量与自动化

项目已配置完整的代码检查和自动化流水线：

### 本地提交前检查（Husky）

- **pre-commit**：lint-staged 自动对 staged 文件执行 `prettier --write` + `eslint --fix`
- **commit-msg**：`commitlint` 强制提交信息符合 [Conventional Commits](https://www.conventionalcommits.org/) 规范

允许的 `type`：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`build`、`revert`

示例：
```bash
git commit -m "feat: 添加工作流执行日志面板"
```

### CI 流水线（GitHub Actions）

每次 Push / PR 自动执行：

1. `pnpm run format:check` — Prettier 格式检查
2. `pnpm -C backend lint` / `pnpm -C frontend lint` — ESLint 检查
3. `pnpm -C backend build` — 后端构建
4. `pnpm -C backend test` — 后端 Jest 单元测试
5. `pnpm -C backend test:workflow` — 工作流引擎测试
6. `pnpm -C frontend build:ci` — 前端构建

### 常用命令

```bash
# 格式化全部代码
pnpm run format

# 仅检查格式
pnpm run format:check

# 后端测试
pnpm -C backend test

# 工作流引擎测试
pnpm -C backend test:workflow

# 修复 ESLint 问题
pnpm -C backend lint
pnpm -C frontend lint
```

## 许可证

MIT
