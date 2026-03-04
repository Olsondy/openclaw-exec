export type TaskType = 'browser' | 'system' | 'vision'

export interface SidecarTask {
  task_id: string
  type: TaskType
  payload: Record<string, unknown>
  timeout_ms: number
}

export interface SidecarResult {
  task_id: string
  status: 'success' | 'error' | 'timeout'
  result?: unknown
  error?: string
  logs: string[]
}

export interface IpcMessage {
  type: 'execute' | 'ping'
  data?: SidecarTask
}
