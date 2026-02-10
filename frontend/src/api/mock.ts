import type { InternalAxiosRequestConfig } from 'axios'
import request from './request'

// 模拟数据存储
const mockWorkflows = new Map<string, any>()
const mockExecutions = new Map<string, any[]>()
const mockSessions = new Map<string, any>()
const mockMessages = new Map<string, any[]>()

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
                const normalizedMethod = method?.toLowerCase()
                // Remove query params AND optional /api prefix for matching
                const normalizedUrl = url?.split('?')[0].replace(/^\/api/, '')
                const body = data ? JSON.parse(data) : {}

                console.log(`[Mock] ${method?.toUpperCase()} ${url}`, body)
                console.log(`[Mock Debug] Normalized: ${normalizedMethod} ${normalizedUrl}`)

                // 模拟延迟
                setTimeout(() => {
                    let responseData: any = null
                    let status = 200

                    try {
                        // Workflows
                        if (normalizedUrl === '/workflows' && normalizedMethod === 'get') {
                            responseData = Array.from(mockWorkflows.values())
                        } else if (normalizedUrl?.startsWith('/workflows/') && normalizedMethod === 'get') {
                            const id = normalizedUrl.split('/')[2]
                            if (id && mockWorkflows.has(id)) {
                                responseData = mockWorkflows.get(id)
                            } else if (normalizedUrl.endsWith('/executions')) {
                                // List executions
                                const wfId = normalizedUrl.split('/')[2]
                                responseData = mockExecutions.get(wfId) || []
                            }
                        } else if (normalizedUrl === '/workflows' && normalizedMethod === 'post') {
                            const newId = `wf-${Date.now()}`
                            const newWf = { id: newId, ...body, createdAt: new Date().toISOString() }
                            mockWorkflows.set(newId, newWf)
                            responseData = newWf
                        } else if (normalizedUrl?.startsWith('/workflows/') && normalizedMethod === 'put') {
                            // ... put logic
                            const id = normalizedUrl.split('/')[2]
                            if (mockWorkflows.has(id)) {
                                const updated = { ...mockWorkflows.get(id), ...body, updatedAt: new Date().toISOString() }
                                mockWorkflows.set(id, updated)
                                responseData = updated
                            } else {
                                status = 404
                            }
                        } else if (normalizedUrl?.endsWith('/execute') && normalizedMethod === 'post') {
                            // ... execute logic
                            const id = normalizedUrl.split('/')[2]
                            const executionId = `exec-${Date.now()}`

                            // Try to find nodes from stored workflow to make mock steps realistic
                            let steps = []
                            if (mockWorkflows.has(id)) {
                                const wf = mockWorkflows.get(id)
                                steps = wf.nodes.map((node: any) => ({
                                    nodeId: node.id,
                                    status: 'completed',
                                    duration: 500,
                                    output: { result: `Output for ${node.data.label}` }
                                }))
                            } else {
                                // Fallback steps if workflow not found in mock store (e.g. unsaved draft)
                                steps = [
                                    { nodeId: 'node-1', status: 'completed', duration: 500, output: { user_input: 'Hello' } },
                                    { nodeId: 'node-2', status: 'completed', duration: 2000, output: { ai_response: 'Hi there!' } },
                                    { nodeId: 'node-3', status: 'completed', duration: 100, output: { final: true } }
                                ]
                            }

                            const execution = {
                                id: executionId,
                                workflowId: id,
                                status: 'completed',
                                input: body.input,
                                output: { content: 'Mock execution result' },
                                steps: steps,
                                logs: [
                                    `[${new Date().toLocaleTimeString()}] 开始执行工作流`,
                                    ...steps.map((s: any) => `[${new Date().toLocaleTimeString()}] 执行节点 ${s.nodeId}`),
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
                        else if (normalizedUrl === '/knowledge/documents' && normalizedMethod === 'get') {
                            responseData = []
                        }

                        // Chat (Comprehensive mock)
                        else if (normalizedUrl === '/chat/sessions' && normalizedMethod === 'get') {
                            responseData = Array.from(mockSessions.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                        } else if (normalizedUrl === '/chat/sessions' && normalizedMethod === 'post') {
                            const newSessionId = `session-${Date.now()}`
                            const newSession = {
                                id: newSessionId,
                                title: '新建会话',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                            mockSessions.set(newSessionId, newSession)
                            responseData = newSession
                        } else if (normalizedUrl?.match(/\/chat\/sessions\/.*\/messages/) && normalizedMethod === 'get') {
                            // GET /chat/sessions/:id/messages
                            const sessionId = normalizedUrl.split('/')[3]
                            responseData = mockMessages.get(sessionId) || []
                        } else if (normalizedUrl === '/chat/messages' && normalizedMethod === 'post') {
                            const { sessionId, content } = body
                            const userMsg = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content,
                                createdAt: new Date().toISOString()
                            }
                            const aiMsg = {
                                id: `msg-${Date.now() + 1}`,
                                role: 'assistant',
                                content: `Mock AI Response to: ${content}`,
                                sources: [],
                                createdAt: new Date().toISOString()
                            }

                            const msgs = mockMessages.get(sessionId) || []
                            msgs.push(userMsg, aiMsg)
                            mockMessages.set(sessionId, msgs)

                            responseData = aiMsg
                        } else if (normalizedUrl?.startsWith('/chat/sessions/') && normalizedMethod === 'delete') {
                            const id = normalizedUrl.split('/')[3]
                            mockSessions.delete(id)
                            mockMessages.delete(id)
                            responseData = { success: true }
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
