import type { SidecarTask, SidecarResult } from '../types'

export async function executeBrowser(task: SidecarTask): Promise<SidecarResult> {
  const logs: string[] = []
  // TODO: Phase 2 实现 Playwright 操作
  logs.push(`[browser] Received task: ${JSON.stringify(task.payload)}`)
  return { task_id: task.task_id, status: 'success', result: null, logs }
}
