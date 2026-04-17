import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  value?: any;
  source: VariableSource;
  description?: string;
}

export interface VariableSource {
  type: 'input' | 'node' | 'system' | 'constant';
  nodeId?: string;
  path?: string; // JSONPath 表达式
}

export const useVariableStore = defineStore('variable', () => {
  // 变量存储
  const variables = ref<Map<string, Variable>>(new Map());

  // 系统变量
  const systemVariables = computed<Variable[]>(() => [
    {
      id: 'sys_input',
      name: 'input',
      type: 'string',
      source: { type: 'system', path: 'input' },
      description: '工作流输入',
    },
    {
      id: 'sys_timestamp',
      name: 'timestamp',
      type: 'number',
      source: { type: 'system', path: 'timestamp' },
      description: '当前时间戳',
    },
    {
      id: 'sys_user',
      name: 'user',
      type: 'object',
      source: { type: 'system', path: 'user' },
      description: '当前用户信息',
    },
  ]);

  // 注册变量
  const registerVariable = (variable: Variable) => {
    variables.value.set(variable.id, variable);
  };

  // 批量注册变量
  const registerVariables = (vars: Variable[]) => {
    vars.forEach((v) => registerVariable(v));
  };

  // 获取变量
  const getVariable = (id: string): Variable | undefined => {
    return variables.value.get(id);
  };

  // 删除变量
  const removeVariable = (id: string) => {
    variables.value.delete(id);
  };

  // 清空所有变量
  const clearVariables = () => {
    variables.value.clear();
  };

  // 解析变量引用 {{node.output.field}}
  const resolveReference = (ref: string, context: any): any => {
    const match = ref.match(/\{\{(.+?)\}\}/);
    if (!match) return ref;

    const path = match[1].trim();
    return getValueByPath(context, path);
  };

  // 通过路径获取值
  const getValueByPath = (obj: any, path: string): any => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[key];
    }

    return result;
  };

  // 获取节点可用变量
  const getAvailableVariables = (nodeId: string, nodes: any[]): Variable[] => {
    const availableVars: Variable[] = [...systemVariables.value];

    // 找到当前节点之前的所有节点
    const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return availableVars;

    // 添加前置节点的输出变量
    for (let i = 0; i < nodeIndex; i++) {
      const node = nodes[i];
      const nodeVars = getNodeOutputVariables(node);
      availableVars.push(...nodeVars);
    }

    return availableVars;
  };

  // 获取节点输出变量
  const getNodeOutputVariables = (node: any): Variable[] => {
    const vars: Variable[] = [];

    switch (node.type) {
      case 'llm':
        vars.push({
          id: `${node.id}_output`,
          name: `${node.data?.label || node.id}.output`,
          type: 'string',
          source: { type: 'node', nodeId: node.id, path: 'output' },
          description: 'LLM 生成的文本',
        });
        break;

      case 'knowledge':
        vars.push({
          id: `${node.id}_results`,
          name: `${node.data?.label || node.id}.results`,
          type: 'array',
          source: { type: 'node', nodeId: node.id, path: 'results' },
          description: '检索到的文档列表',
        });
        vars.push({
          id: `${node.id}_context`,
          name: `${node.data?.label || node.id}.context`,
          type: 'string',
          source: { type: 'node', nodeId: node.id, path: 'context' },
          description: '拼接后的上下文文本',
        });
        break;

      case 'http':
        vars.push({
          id: `${node.id}_response`,
          name: `${node.data?.label || node.id}.response`,
          type: 'object',
          source: { type: 'node', nodeId: node.id, path: 'response' },
          description: 'HTTP 响应数据',
        });
        vars.push({
          id: `${node.id}_status`,
          name: `${node.data?.label || node.id}.status`,
          type: 'number',
          source: { type: 'node', nodeId: node.id, path: 'status' },
          description: 'HTTP 状态码',
        });
        break;

      case 'code':
        vars.push({
          id: `${node.id}_result`,
          name: `${node.data?.label || node.id}.result`,
          type: 'any',
          source: { type: 'node', nodeId: node.id, path: 'result' },
          description: '代码执行结果',
        });
        break;

      case 'condition':
        vars.push({
          id: `${node.id}_result`,
          name: `${node.data?.label || node.id}.result`,
          type: 'boolean',
          source: { type: 'node', nodeId: node.id, path: 'result' },
          description: '条件判断结果',
        });
        break;
    }

    return vars;
  };

  // 验证变量引用
  const validateReference = (ref: string): boolean => {
    const match = ref.match(/\{\{(.+?)\}\}/);
    if (!match) return false;

    const path = match[1].trim();
    return path.length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(path);
  };

  // 格式化变量引用
  const formatReference = (path: string): string => {
    return `{{${path}}}`;
  };

  return {
    variables,
    systemVariables,
    registerVariable,
    registerVariables,
    getVariable,
    removeVariable,
    clearVariables,
    resolveReference,
    getValueByPath,
    getAvailableVariables,
    getNodeOutputVariables,
    validateReference,
    formatReference,
  };
});
