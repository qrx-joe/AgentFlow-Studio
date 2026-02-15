# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

AgentFlow Studio 是一个轻量级的类 Coze 智能体平台，支持可视化拖拽工作流编排、知识库构建与 RAG 检索，以及智能问答 Agent。

## 开发命令

### 前端 (Vue 3 + Vite)
```bash
cd frontend
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 (http://localhost:5173)
pnpm build            # 类型检查并构建生产版本
pnpm lint             # ESLint 自动修复
```

### 后端 (NestJS)
```bash
cd backend
pnpm install          # 安装依赖
pnpm start:dev        # 热重载启动 (http://localhost:3000)
pnpm build            # 构建生产版本
pnpm test:workflow    # 运行工作流引擎测试
pnpm lint             # ESLint 自动修复
```

### Docker (全栈部署)
```bash
docker-compose up -d  # 启动 PostgreSQL、Redis、后端、前端
```

### CI 流水线
CI 执行顺序：`pnpm -C backend build` → `pnpm -C backend test:workflow` → `pnpm -C frontend build:ci`

## 架构说明

### 前端结构 (`frontend/src/`)
- `views/` - 页面组件：Dashboard（工作室）、Workflow（工作流）、Knowledge（知识库）、Chat（对话）、Monitoring（监控）
- `components/` - 按功能组织的可复用组件（chat、knowledge、nodes、workflow）
- `stores/` - Pinia 状态管理：workflow.ts、chat.ts、knowledge.ts、variable.ts
- `api/` - API 客户端模块
- `router/` - Vue Router 路由配置，含基于 localStorage 的认证守卫

### 后端结构 (`backend/src/`)
- `workflow/` - 工作流 CRUD 和执行引擎
  - `engine/workflow-engine.ts` - 核心工作流执行器，负责节点遍历
  - `engine/compensation-executor.ts` - 回滚/补偿逻辑
- `knowledge/` - 知识库管理
  - `embedding/` - 向量嵌入生成
  - `rag/` - RAG 检索管道
  - `search/` - 混合搜索（关键词 + 向量）
- `chat/` - 聊天会话和消息处理，支持 SSE 流式输出
- `agent/` - Agent 编排服务，连接工作流与 LLM
- `common/cache/` - Redis 缓存模块

### 核心数据流
1. **工作流执行**：WorkflowController → WorkflowService → WorkflowEngine（遍历节点/边）
2. **RAG 管道**：文档上传 → 分块 → 嵌入 → pgvector 存储 → 混合检索
3. **对话**：ChatController (SSE) → ChatService → AgentService → LLM API

### 数据库
- PostgreSQL + pgvector 扩展，支持向量相似度搜索
- TypeORM 配置 `synchronize: false`，Schema 变更需手动执行 SQL 迁移
- 通过 `DATABASE_URL` 环境变量连接

## 技术栈
- 前端：Vue 3.4+、Pinia、Vue Flow（工作流画布）、Element Plus、Vite 5
- 后端：NestJS 10、TypeORM、PostgreSQL 15+、Redis
- AI：OpenAI API（可配置 base URL）、text-embedding 向量模型
