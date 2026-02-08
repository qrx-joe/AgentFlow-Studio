import { WorkflowEngine } from '../src/workflow/engine/workflow-engine'
import { CompensationExecutor } from '../src/workflow/engine/compensation-executor'
import { DataSource } from 'typeorm'
import type { WorkflowDefinition } from '../src/workflow/types'

const agentService = {
  chat: async () => 'ok',
}

const knowledgeService = {
  search: async () => [{ id: '1', documentId: 'doc', content: 'x', similarity: 0.9 }],
}

const definition: WorkflowDefinition = {
  id: 'wf-1',
  name: 'Test',
  nodes: [
    { id: 'n1', type: 'trigger', position: { x: 0, y: 0 } },
    { id: 'n2', type: 'end', position: { x: 200, y: 0 } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
}

const run = async () => {
  const dataSource = new DataSource({ type: 'postgres', url: 'postgresql://invalid' } as any)
  const engine = new WorkflowEngine(
    definition,
    agentService as any,
    knowledgeService as any,
    new CompensationExecutor(dataSource)
  )
  const result = await engine.execute('hello')
  if (result.status !== 'completed') {
    throw new Error('Workflow engine test failed')
  }
  console.log('workflow-engine test passed')
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
