# 工作台模块优化设计方案

> 参考 Dify 的设计理念，对 AgentFlow Studio 工作台进行全面优化

## 一、设计目标

### 1.1 核心理念

- **低代码可视化**：通过拖拽和配置完成复杂 AI 应用的构建
- **专业且易用**：既满足专业开发者的需求，也让非技术人员能快速上手
- **灵活可扩展**：支持自定义节点和插件系统
- **实时调试**：提供强大的调试和测试能力

### 1.2 参考 Dify 的优秀特性

- 清晰的三栏布局（组件库 + 画布 + 属性面板）
- 丰富的节点类型和配置选项
- 变量系统和数据流可视化
- 内置调试器和日志查看
- 版本管理和协作功能

---

## 二、界面布局优化

### 2.1 整体布局结构

```
┌─────────────────────────────────────────────────────────────┐
│  顶部工具栏 (Header)                                          │
│  [返回] [工作流名称] [保存] [发布] [测试] [版本] [设置]        │
├──────────┬────────────────────────────────┬─────────────────┤
│          │                                │                 │
│  组件库  │         画布区域                │   属性面板       │
│  (240px) │       (flex-grow)              │   (360px)       │
│          │                                │                 │
│  ┌────┐  │  ┌──────┐    ┌──────┐         │  ┌───────────┐  │
│  │触发│  │  │ 开始 │───▶│ LLM  │         │  │节点配置   │  │
│  │节点│  │  └──────┘    └──────┘         │  │           │  │
│  ├────┤  │       │                       │  │ 名称:     │  │
│  │LLM │  │       ▼                       │  │ [____]    │  │
│  ├────┤  │  ┌──────┐                     │  │           │  │
│  │知识│  │  │ 结束 │                     │  │ 模型:     │  │
│  │检索│  │  └──────┘                     │  │ [____]    │  │
│  ├────┤  │                                │  │           │  │
│  │条件│  │  [小地图]                      │  │ 提示词:   │  │
│  │判断│  │                                │  │ [____]    │  │
│  └────┘  │                                │  └───────────┘  │
│          │                                │                 │
└──────────┴────────────────────────────────┴─────────────────┘
```

### 2.2 顶部工具栏功能

```typescript
// StudioHeader 组件增强
interface HeaderActions {
  // 基础操作
  save: () => Promise<void>;
  publish: () => Promise<void>;
  test: () => void;

  // 版本管理
  versions: {
    current: string;
    list: Version[];
    restore: (versionId: string) => Promise<void>;
  };

  // 设置
  settings: {
    autoSave: boolean;
    gridSnap: boolean;
    showMinimap: boolean;
  };
}
```

---

## 三、节点系统增强

### 3.1 新增节点类型

#### 3.1.1 变量节点

```typescript
interface VariableNode {
  type: 'variable';
  data: {
    label: string;
    variables: {
      name: string;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      value: any;
      description?: string;
    }[];
  };
}
```

#### 3.1.2 HTTP 请求节点

```typescript
interface HttpNode {
  type: 'http';
  data: {
    label: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers: Record<string, string>;
    body?: any;
    timeout: number;
    retry: {
      enabled: boolean;
      maxAttempts: number;
      backoff: 'linear' | 'exponential';
    };
  };
}
```

#### 3.1.3 数据转换节点

```typescript
interface TransformNode {
  type: 'transform';
  data: {
    label: string;
    transformType: 'jq' | 'javascript' | 'template';
    script: string;
    inputSchema?: JSONSchema;
    outputSchema?: JSONSchema;
  };
}
```

#### 3.1.4 循环节点

```typescript
interface LoopNode {
  type: 'loop';
  data: {
    label: string;
    loopType: 'forEach' | 'while' | 'times';
    condition?: string;
    maxIterations: number;
    breakOnError: boolean;
  };
}
```

#### 3.1.5 并行节点

```typescript
interface ParallelNode {
  type: 'parallel';
  data: {
    label: string;
    branches: string[]; // 分支节点 ID
    waitForAll: boolean; // 是否等待所有分支完成
    timeout?: number;
  };
}
```

### 3.2 节点配置面板优化

```vue
<!-- PropertiesPanel.vue 增强版 -->
<template>
  <div class="properties-panel">
    <!-- 节点基本信息 -->
    <section class="panel-section">
      <h3>基本信息</h3>
      <el-form label-position="top">
        <el-form-item label="节点名称">
          <el-input v-model="nodeData.label" placeholder="输入节点名称" />
        </el-form-item>
        <el-form-item label="节点描述">
          <el-input v-model="nodeData.description" type="textarea" placeholder="描述节点功能" />
        </el-form-item>
      </el-form>
    </section>

    <!-- 节点特定配置 -->
    <section class="panel-section">
      <h3>节点配置</h3>
      <component :is="getConfigComponent(nodeType)" v-model="nodeData" @update="handleUpdate" />
    </section>

    <!-- 输入变量 -->
    <section class="panel-section">
      <h3>输入变量</h3>
      <VariableMapper
        :variables="inputVariables"
        :available-sources="availableSources"
        @update="handleInputUpdate"
      />
    </section>

    <!-- 输出变量 -->
    <section class="panel-section">
      <h3>输出变量</h3>
      <VariableDefiner :variables="outputVariables" @update="handleOutputUpdate" />
    </section>

    <!-- 错误处理 -->
    <section class="panel-section">
      <h3>错误处理</h3>
      <ErrorHandlingConfig v-model="nodeData.errorHandling" />
    </section>
  </div>
</template>
```

---

## 四、变量系统设计

### 4.1 变量类型定义

```typescript
// 变量系统核心类型
interface Variable {
  id: string;
  name: string;
  type: VariableType;
  value?: any;
  source: VariableSource;
  description?: string;
}

type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file';

interface VariableSource {
  type: 'input' | 'node' | 'system' | 'constant';
  nodeId?: string;
  path?: string; // JSONPath 表达式
}

// 变量引用语法：{{node.output.field}}
type VariableReference = string;
```

### 4.2 变量管理器

```typescript
// stores/variableStore.ts
export const useVariableStore = defineStore('variable', () => {
  const variables = ref<Map<string, Variable>>(new Map());

  // 注册变量
  const registerVariable = (variable: Variable) => {
    variables.value.set(variable.id, variable);
  };

  // 解析变量引用
  const resolveReference = (ref: VariableReference, context: any): any => {
    const match = ref.match(/\{\{(.+?)\}\}/);
    if (!match) return ref;

    const path = match[1];
    return getValueByPath(context, path);
  };

  // 获取节点可用变量
  const getAvailableVariables = (nodeId: string): Variable[] => {
    // 返回该节点之前所有节点的输出变量
    return Array.from(variables.value.values()).filter((v) => isAvailableForNode(v, nodeId));
  };

  return {
    variables,
    registerVariable,
    resolveReference,
    getAvailableVariables,
  };
});
```

### 4.3 变量映射组件

```vue
<!-- VariableMapper.vue -->
<template>
  <div class="variable-mapper">
    <div v-for="field in fields" :key="field.name" class="field-mapping">
      <label>{{ field.label }}</label>
      <el-select
        v-model="mappings[field.name]"
        filterable
        allow-create
        placeholder="选择或输入变量"
      >
        <el-option-group label="系统变量">
          <el-option
            v-for="v in systemVariables"
            :key="v.id"
            :label="v.name"
            :value="`{{${v.path}}}`"
          />
        </el-option-group>
        <el-option-group label="节点输出">
          <el-option
            v-for="v in nodeVariables"
            :key="v.id"
            :label="`${v.nodeName}.${v.name}`"
            :value="`{{${v.path}}}`"
          />
        </el-option-group>
      </el-select>
    </div>
  </div>
</template>
```

---

## 五、调试和测试功能

### 5.1 调试面板设计

```vue
<!-- DebugPanel.vue -->
<template>
  <el-drawer v-model="visible" title="调试控制台" size="50%" direction="btt">
    <div class="debug-panel">
      <!-- 输入区 -->
      <section class="debug-input">
        <h3>测试输入</h3>
        <el-form>
          <el-form-item v-for="input in inputs" :key="input.name" :label="input.label">
            <component :is="getInputComponent(input.type)" v-model="testData[input.name]" />
          </el-form-item>
        </el-form>
        <el-button type="primary" @click="runTest">
          <el-icon><VideoPlay /></el-icon>
          运行测试
        </el-button>
      </section>

      <!-- 执行日志 -->
      <section class="debug-logs">
        <h3>执行日志</h3>
        <el-timeline>
          <el-timeline-item
            v-for="log in executionLogs"
            :key="log.id"
            :timestamp="log.timestamp"
            :type="getLogType(log.level)"
          >
            <div class="log-entry">
              <div class="log-node">{{ log.nodeName }}</div>
              <div class="log-message">{{ log.message }}</div>
              <div v-if="log.data" class="log-data">
                <el-collapse>
                  <el-collapse-item title="查看数据">
                    <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>

      <!-- 输出结果 -->
      <section class="debug-output">
        <h3>执行结果</h3>
        <el-alert
          v-if="executionResult"
          :type="executionResult.status === 'success' ? 'success' : 'error'"
          :title="executionResult.status === 'success' ? '执行成功' : '执行失败'"
          show-icon
        />
        <div class="output-data">
          <pre>{{ JSON.stringify(executionResult?.output, null, 2) }}</pre>
        </div>
      </section>
    </div>
  </el-drawer>
</template>
```

### 5.2 节点执行状态可视化

```typescript
// 节点执行状态
interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  input?: any;
  output?: any;
  error?: string;
}

// 在画布上显示执行状态
const nodeStatusStyles = {
  pending: { border: '2px solid #909399' },
  running: { border: '2px solid #409EFF', animation: 'pulse 1s infinite' },
  success: { border: '2px solid #67C23A' },
  error: { border: '2px solid #F56C6C' },
  skipped: { border: '2px dashed #909399' },
};
```

---

## 六、版本管理

### 6.1 版本数据结构

```typescript
interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string; // 语义化版本号 v1.0.0
  name: string;
  description?: string;
  snapshot: {
    nodes: Node[];
    edges: Edge[];
    variables: Variable[];
  };
  createdBy: string;
  createdAt: Date;
  tags: string[];
}
```

### 6.2 版本管理界面

```vue
<!-- VersionManager.vue -->
<template>
  <el-dialog v-model="visible" title="版本管理" width="800px">
    <div class="version-manager">
      <!-- 当前版本 -->
      <el-alert type="info" :closable="false"> 当前版本: {{ currentVersion.version }} </el-alert>

      <!-- 版本列表 -->
      <el-table :data="versions" style="margin-top: 20px">
        <el-table-column prop="version" label="版本号" width="120" />
        <el-table-column prop="name" label="版本名称" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="preview(row)"> 预览 </el-button>
            <el-button size="small" @click="restore(row)"> 恢复 </el-button>
            <el-button size="small" type="danger" @click="deleteVersion(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 创建新版本 -->
      <div class="create-version">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          创建新版本
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>
```

---

## 七、性能优化

### 7.1 大规模工作流优化

```typescript
// 虚拟滚动和节点懒加载
const useVirtualCanvas = () => {
  const visibleNodes = computed(() => {
    const viewport = vueFlow.viewport.value;
    return nodes.value.filter((node) => isNodeInViewport(node, viewport));
  });

  return { visibleNodes };
};

// 节点渲染优化
const nodeRenderOptimization = {
  // 使用 Web Worker 处理复杂计算
  useWorker: true,

  // 节点缓存
  enableCache: true,

  // 延迟渲染非关键节点
  lazyRender: true,
};
```

### 7.2 自动保存和恢复

```typescript
// 自动保存机制
const useAutoSave = (workflowId: string) => {
  const { nodes, edges } = useWorkflowStore();

  // 防抖保存
  const debouncedSave = useDebounceFn(async () => {
    await saveWorkflow(workflowId, {
      nodes: nodes.value,
      edges: edges.value,
    });
  }, 2000);

  // 监听变化
  watch([nodes, edges], debouncedSave, { deep: true });

  // 页面关闭前保存
  onBeforeUnmount(() => {
    debouncedSave.flush();
  });
};
```

---

## 八、实施计划

### Phase 1: 基础增强 (1-2周)

- [ ] 优化三栏布局
- [ ] 增强属性面板
- [ ] 添加变量系统基础功能
- [ ] 实现自动保存

### Phase 2: 节点扩展 (2-3周)

- [ ] 新增 HTTP 请求节点
- [ ] 新增数据转换节点
- [ ] 新增循环和并行节点
- [ ] 优化节点配置界面

### Phase 3: 调试功能 (1-2周)

- [ ] 实现调试面板
- [ ] 添加执行日志
- [ ] 节点状态可视化
- [ ] 断点调试功能

### Phase 4: 版本管理 (1周)

- [ ] 版本数据模型
- [ ] 版本管理界面
- [ ] 版本对比功能

### Phase 5: 性能优化 (1周)

- [ ] 虚拟滚动
- [ ] 节点懒加载
- [ ] 渲染优化

---

## 九、技术栈建议

### 前端

- **Vue 3 + TypeScript**: 核心框架
- **@vue-flow/core**: 流程图引擎
- **Element Plus**: UI 组件库
- **Pinia**: 状态管理
- **Monaco Editor**: 代码编辑器（用于代码节点）
- **JSONPath Plus**: 变量路径解析

### 后端

- **NestJS**: 保持现有架构
- **TypeORM**: 数据持久化
- **Bull**: 任务队列（用于异步执行）
- **Socket.IO**: 实时通信（用于执行状态推送）

---

## 十、参考资源

- [Dify 官方文档](https://docs.dify.ai/)
- [Vue Flow 文档](https://vueflow.dev/)
- [n8n Workflow Automation](https://n8n.io/)
- [Node-RED](https://nodered.org/)
