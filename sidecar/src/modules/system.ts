import type { SidecarTask, SidecarResult } from '../types'

export async function executeSystem(task: SidecarTask): Promise<SidecarResult> {
  const logs: string[] = []
  logs.push(`[system] Received task: ${JSON.stringify(task.payload)}`)
  return { task_id: task.task_id, status: 'success', result: null, logs }
}
