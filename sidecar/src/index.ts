import type { SidecarTask, SidecarResult, IpcMessage } from './types'
import { executeBrowser } from './modules/browser'
import { executeSystem } from './modules/system'
import { executeVision } from './modules/vision'

// 通过 stdin/stdout 与 Tauri 通信
process.stdin.setEncoding('utf8')

let buffer = ''

process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''

  for (const line of lines) {
    if (line.trim()) {
      try {
        const msg: IpcMessage = JSON.parse(line)
        handleMessage(msg)
      } catch {
        // ignore malformed input
      }
    }
  }
})

async function handleMessage(msg: IpcMessage) {
  if (msg.type === 'ping') {
    send({ type: 'pong' })
    return
  }

  if (msg.type === 'execute' && msg.data) {
    const result = await executeTask(msg.data)
    send({ type: 'result', data: result })
  }
}

async function executeTask(task: SidecarTask): Promise<SidecarResult> {
  const timeout = new Promise<SidecarResult>((resolve) =>
    setTimeout(
      () =>
        resolve({
          task_id: task.task_id,
          status: 'timeout',
          error: `Task timed out after ${task.timeout_ms}ms`,
          logs: [],
        }),
      task.timeout_ms,
    ),
  )

  const execution = (async () => {
    try {
      switch (task.type) {
        case 'browser':
          return await executeBrowser(task)
        case 'system':
          return await executeSystem(task)
        case 'vision':
          return await executeVision(task)
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }
    } catch (e) {
      return {
        task_id: task.task_id,
        status: 'error' as const,
        error: String(e),
        logs: [],
      }
    }
  })()

  return Promise.race([timeout, execution])
}

function send(msg: unknown) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}
