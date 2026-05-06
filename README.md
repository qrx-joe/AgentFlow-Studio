# AgentFlow Studio

一个轻量级的类 Coze 智能体平台：在浏览器里拖拽节点编排 AI 工作流，挂载知识库做 RAG 检索，并通过 SSE 流式对话与之交互。

[![ci](https://github.com/qrx-joe/AgentFlow-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/qrx-joe/AgentFlow-Studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **在线演示**：未部署演示站（依赖 OpenAI Key + pgvector，部署成本较高）。本地启动方式见下方「快速启动」。

## 演示截图

### 工作流编排画布

> 拖拽节点 / 连线 / 节点配置抽屉 / 小地图，一图四特性

![工作流画布](./docs/assets/workflow-canvas.png)

### 工作室 · 知识库 · 智能对话

<table>
  <tr>
    <td width="50%"><img src="./docs/assets/demo-screenshot.png" alt="工作室" /><p align="center"><b>工作室</b> · 应用列表与版本管理</p></td>
    <td width="50%"><img src="./docs/assets/knowledge-list.png" alt="知识库列表" /><p align="center"><b>知识库列表</b> · 文档数 / 分块数 / 字符数概览</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="./docs/assets/knowledge-rag.png" alt="知识库详情" /><p align="center"><b>知识库详情</b> · 多格式文档（PDF / DOCX / MD / TXT）+ hybrid 检索模式</p></td>
    <td width="50%"><img src="./docs/assets/chat-streaming.png" alt="智能对话" /><p align="center"><b>智能对话</b> · SSE 流式输出 + 引用来源回填</p></td>
  </tr>
</table>

---

## 技术栈

| 端          | 技术                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| 前端        | Vue 3.4 · Vite 5.3 · TypeScript 5.5 · Vue Flow 1.41 · Element Plus 2.7 · Pinia 2.1 · Vue Router 4.4       |
| 后端        | NestJS 10.3 · TypeORM 0.3 · openai-sdk 4.52 · class-validator 0.14 · Passport-JWT · Multer · pdf-parse    |
| 数据 & 缓存 | PostgreSQL 15 + pgvector · Redis 7                                                                        |
| AI 提供方   | OpenAI 兼容协议（OpenAI / DeepSeek / SiliconFlow 任选，配置 `OPENAI_BASE_URL` 切换）+ text-embedding 模型 |
| 工程化      | pnpm workspace · Husky · lint-staged · Commitlint · ESLint · Prettier · Jest · GitHub Actions             |

---

## 核心模块设计

1. **工作流引擎** — `backend/src/workflow/engine/`
   - DAG 拓扑遍历执行；动态循环检测（按节点访问次数 `MAX_VISITS_PER_NODE=3` + 总步数 `MAX_TOTAL_STEPS=200` 双重保护）
   - 节点类型支持：LLM / 知识库检索 / 条件分支 / HTTP 请求 / 代码执行
   - 变量模板 `{{variableName}}` 跨节点引用上游输出
   - 失败回滚（compensation-executor）机制

2. **RAG 检索管道** — `backend/src/knowledge/`
   - 文档解析（PDF / DOCX / Markdown / TXT）→ 分块（强制截断超长 chunk）→ 嵌入 → pgvector 存储
   - 混合检索：BM25 关键词 + 向量余弦相似度，使用 **RRF（Reciprocal Rank Fusion）** 融合排序
   - 查询缓存：5 分钟 TTL + LRU 淘汰，最大 100 条
   - 检索过滤：向量分达标 **OR** 关键词命中即放行（避免低向量分但高关键词分被误删）

3. **流式对话系统** — `backend/src/chat/` + `frontend/src/stores/chat.ts`
   - 后端 SSE（`@nestjs/common` Sse 装饰器）流式推送 token
   - 前端用 `fetch + ReadableStream` 替代原生 `EventSource`，以便携带 JWT Authorization 头
   - 多轮上下文管理 + 引用来源回填

4. **前端可视化画布** — `frontend/src/components/workflow/` + `nodes/`
   - 基于 Vue Flow 实现节点拖拽 / 连线 / 缩放 / 小地图
   - 节点配置抽屉（NodeConfigDrawer）动态适配不同节点 Schema
   - 调试面板对接后端真实执行数据，按节点实时展示输入 / 输出 / 耗时

5. **基础设施 & 工程化**
   - 业务接口 JWT 鉴权 + 全局 AuthGuard + `@nestjs/throttler` 速率限制 + `/health` 健康检查
   - PostgreSQL：开发环境 `synchronize: true` 加速迭代，生产建议关闭并通过手写 SQL（`backend/database.sql`）做迁移
   - Husky pre-commit（lint-staged + ESLint + Prettier） + commitlint 强制 Conventional Commits
   - GitHub Actions CI：Prettier check → lint（backend + frontend）→ build backend → jest → workflow engine test → build frontend

---

## 快速启动

### 本地开发

```bash
# 1. 前置依赖（需先启动 Postgres + Redis）
docker compose up -d postgres redis

# 2. 后端
cd backend && pnpm install && pnpm start:dev      # http://localhost:3000

# 3. 前端
cd frontend && pnpm install && pnpm dev           # http://localhost:5173
```

### Docker 全栈一键启动

```bash
docker-compose up -d
# Postgres 5432 · Redis 6379 · Backend 3000 · Frontend 8080
```

### 必需环境变量（`backend/.env`）

| 变量              | 说明                                       | 示例                                                           |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL 连接串（pgvector 扩展已启用）   | `postgresql://agentflow:agentflow123@localhost:5432/agentflow` |
| `REDIS_HOST`      | Redis 主机                                 | `localhost`                                                    |
| `OPENAI_API_KEY`  | OpenAI 兼容协议的 API Key                  | `sk-xxx`                                                       |
| `OPENAI_BASE_URL` | API 地址，可指向 DeepSeek / SiliconFlow 等 | `https://api.deepseek.com/v1`                                  |
| `JWT_SECRET`      | JWT 签名密钥                               | 任意长字符串                                                   |

---

## 关键技术决策

### 1. Hybrid 检索的分数融合不能用线性加权

最初做混合检索时，把 BM25 关键词分数和向量余弦相似度做 `α * vec + (1-α) * bm25` 加权。结果发现两者尺度根本不可比 —— BM25 是无界正分，向量相似度在 [0, 1]，调权重永远调不准。后来改用 **RRF（Reciprocal Rank Fusion）**：只看每个结果在两路检索里的排名，`score = Σ 1/(k+rank)`，对绝对分值不敏感，召回质量明显改善。同时把过滤逻辑从「检索阶段按分数阈值过滤」改成「融合后按 **向量分达标 OR 关键词命中** 过滤」，避免低向量分但精确命中的文档被误删。
→ commit [`2143fb9`](https://github.com/qrx-joe/AgentFlow-Studio/commit/2143fb9) · [`ff495d5`](https://github.com/qrx-joe/AgentFlow-Studio/commit/ff495d5)

![Hybrid 检索效果](./docs/assets/hybrid-search.png)
_图：hybrid 模式下的检索结果 —— 关键词高亮 + 多路融合排名_

### 2. Embedding API 的 413 不是单条文本太长，是批量请求体太大

接 SiliconFlow 时一直 `413 Payload Too Large`。一开始以为是单条文本过长，加了截断仍然失败。最后定位是**批量请求体超过网关大小限制** —— 不同提供方的批大小限制差异很大（OpenAI 宽松、SiliconFlow 严格）。最终方案：嵌入分批策略按 token 数 + 批量条数双重收紧，并配合 splitter 后的硬截断。
→ commit [`7a0f85a`](https://github.com/qrx-joe/AgentFlow-Studio/commit/7a0f85a) · [`965c7af`](https://github.com/qrx-joe/AgentFlow-Studio/commit/965c7af)

### 3. SSE 流式接口在浏览器里没法用 EventSource 鉴权

前端最初用 `new EventSource()` 接 SSE，结果一上 JWT 鉴权就 401 —— 原生 EventSource API **不支持自定义 Header**。改用 `fetch + ReadableStream` 手动消费 SSE 字节流，才能把 `Authorization: Bearer <token>` 带上。代价是要自己处理流的解析、重连、错误恢复，而不能依赖浏览器内置实现。
→ commit [`037d8ce`](https://github.com/qrx-joe/AgentFlow-Studio/commit/037d8ce)

### 4. 工作流循环检测不能只用「访问过的节点集合」

第一版用 `Set<nodeId>` 检测访问过的节点，结果合法的循环节点（如「重试」「轮询」）也被一棍子打死。改成 **每节点访问次数上限（`MAX_VISITS_PER_NODE=3`）+ 全局总步数上限（`MAX_TOTAL_STEPS=200`）** 双重保护，既允许有限循环，又能拦住死循环。
→ commit [`3306436`](https://github.com/qrx-joe/AgentFlow-Studio/commit/3306436)

---

## 项目结构

```
.
├── backend/                    # NestJS 后端
│   └── src/
│       ├── workflow/           # 工作流引擎（DAG / 循环检测 / 补偿回滚）
│       ├── knowledge/          # 文档解析 / 分块 / Embedding / pgvector / 混合检索
│       ├── chat/               # SSE 流式对话 + 多轮上下文
│       ├── agent/              # Agent 编排（连接工作流和 LLM）
│       ├── common/cache/       # Redis 缓存模块
│       ├── health/             # 健康检查
│       └── metrics/            # 性能指标
├── frontend/                   # Vue 3 前端
│   └── src/
│       ├── views/              # 5 个主页面（Dashboard/Workflow/Knowledge/Chat/Monitoring）
│       ├── components/         # nodes / workflow / knowledge / chat
│       ├── stores/             # Pinia 状态管理
│       └── api/                # API 客户端
├── docs/                       # 项目文档（架构 / 运行逻辑 / 对比分析）
├── docker-compose.yml
└── .github/workflows/          # CI 流水线
```

更多技术细节见 [`docs/01-项目架构概览.md`](./docs/01-项目架构概览.md) 与 [`docs/02-核心运行逻辑详解.md`](./docs/02-核心运行逻辑详解.md)。

---

## 许可证

[MIT](./LICENSE)
