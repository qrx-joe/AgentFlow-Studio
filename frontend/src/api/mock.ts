import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import request from './request'

// 模拟数据存储
const mockWorkflows = new Map<string, any>()
const mockExecutions = new Map<string, any[]>()

// 预置一些数据
const demoWorkflowId = 'demo-workflow-001'
mockWorkflows.set(demoWorkflowId, {
    id: demoWorkflowId,
    name: '示例工作流',
    nodes: [
        { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: '开始' } },
        { id: '2', type: 'llm', position: { x: 300, y: 100 }, data: { label: 'AI 生成', model: 'gpt-3.5-turbo' } },
        { id: '3', type: 'end', position: { x: 500, y: 100 }, data: { label: '结束' } },
    ],
    edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
    ],
})

// 启用 Mock
export const setupMock = () => {
    console.log('[Mock] API Mock Enabled')

    // 拦截请求
    request.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
        // 只有开启了 Mock 开关才拦截 (可以通过环境变量或 localStorage 控制)
        // 这里默认拦截所有 /api 请求，如果加上特定的 header 或参数判断也可以
        // 简单处理：直接在 response interceptor 里 mock error 也可以，但 request interceptor 可以直接阻断网络请求

        // 我们通过适配器模式来模拟
        config.adapter = async (config) => {
            return new Promise((resolve, reject) => {
                const { url, method, data } = config
                const body = data ? JSON.parse(data) : {}

                console.log(`[Mock] ${method?.toUpperCase()} ${url}`, body)

                // 模拟延迟
                setTimeout(() => {
                    let responseData: any = null
                    let status = 200

                    try {
                        // Workflows
                        if (url === '/workflows' && method === 'get') {
                            responseData = Array.from(mockWorkflows.values())
                        } else if (url?.startsWith('/workflows/') && method === 'get') {
                            const id = url.split('/')[2]
                            if (id && mockWorkflows.has(id)) {
                                responseData = mockWorkflows.get(id)
                            } else if (url.endsWith('/executions')) {
                                // List executions
                                const wfId = url.split('/')[2]
                                responseData = mockExecutions.get(wfId) || []
                            }
                        } else if (url === '/workflows' && method === 'post') {
                            const newId = `wf-${Date.now()}`
                            const newWf = { id: newId, ...body, createdAt: new Date().toISOString() }
                            mockWorkflows.set(newId, newWf)
                            responseData = newWf
                        } else if (url?.startsWith('/workflows/') && method === 'put') {
                            const id = url.split('/')[2]
                            if (mockWorkflows.has(id)) {
                                const updated = { ...mockWorkflows.get(id), ...body, updatedAt: new Date().toISOString() }
                                mockWorkflows.set(id, updated)
                                responseData = updated
                            } else {
                                status = 404
                            }
                        } else if (url?.endsWith('/execute') && method === 'post') {
                            const id = url.split('/')[2]
                            const executionId = `exec-${Date.now()}`
                            const execution = {
                                id: executionId,
                                workflowId: id,
                                status: 'completed',
                                input: body.input,
                                output: { content: 'Mock execution result' },
                                steps: [
                                    { nodeId: 'node-1', status: 'completed', duration: 500, output: { user_input: 'Hello' } },
                                    { nodeId: 'node-2', status: 'completed', duration: 2000, output: { ai_response: 'Hi there!' } },
                                    { nodeId: 'node-3', status: 'completed', duration: 100, output: { final: true } }
                                ],
                                logs: [
                                    `[${new Date().toLocaleTimeString()}] 开始执行工作流`,
                                    `[${new Date().toLocaleTimeString()}] 执行节点：开始 (node-1)`,
                                    `[${new Date().toLocaleTimeString()}] 执行节点：AI 生成 (node-2)`,
                                    `[${new Date().toLocaleTimeString()}] AI 响应：这是一个模拟的回答`,
                                    `[${new Date().toLocaleTimeString()}] 执行节点：结束 (node-3)`,
                                    `[${new Date().toLocaleTimeString()}] 工作流执行完成`
                                ],
                                startedAt: new Date().toISOString(),
                                completedAt: new Date().toISOString(),
                            }
                            const list = mockExecutions.get(id) || []
                            list.unshift(execution)
                            mockExecutions.set(id, list)
                            responseData = execution
                        }

                        // Knowledge (Simple mock)
                        else if (url === '/knowledge/documents' && method === 'get') {
                            responseData = []
                        }

                        // Chat (Simple mock)
                        else if (url === '/chat/sessions' && method === 'get') {
                            responseData = []
                        }

                        if (responseData !== null) {
                            resolve({
                                data: responseData,
                                status,
                                statusText: 'OK',
                                headers: {},
                                config,
                                request: {}
                            })
                        } else {
                            // Pass through or 404
                            reject({ response: { status: 404, data: { message: 'Not Found' } } })
                        }
                    } catch (e) {
                        reject({ response: { status: 500, data: { message: 'Mock Error' } } })
                    }
                }, 300)
            })
        }
        return config
    })
}
