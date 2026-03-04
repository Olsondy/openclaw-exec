import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui'
import { useConnectionStore, useTasksStore } from '../store'
import { useNodeConnection } from '../hooks/useNodeConnection'

const statusLabel: Record<string, string> = {
  online: '🟢 在线',
  connecting: '🟡 连接中',
  auth_checking: '🟡 验证中',
  authorized: '🟡 已授权',
  error: '🔴 错误',
  unauthorized: '🔴 未授权',
  idle: '⚫ 空闲',
  paused: '⚫ 已暂停',
}

export function DashboardPage() {
  const { status, onlineAt, errorMessage } = useConnectionStore()
  const { pendingApprovals, getStats } = useTasksStore()
  const { connect } = useNodeConnection()
  const stats = getStats()

  const uptime = onlineAt
    ? Math.floor((Date.now() - onlineAt.getTime()) / 60000) + ' 分钟'
    : '--'

  return (
    <>
      <TopBar title="Dashboard" subtitle="Node status and real-time activity" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        <div className="grid grid-cols-3 gap-4">
          <Card elevated>
            <p className="text-xs text-surface-on-variant">节点状态</p>
            <p className="text-lg font-semibold text-surface-on mt-1">{statusLabel[status] ?? status}</p>
            <p className="text-xs text-surface-on-variant mt-1">在线时长：{uptime}</p>
          </Card>
          <Card elevated>
            <p className="text-xs text-surface-on-variant">今日任务</p>
            <p className="text-lg font-semibold text-surface-on mt-1">{stats.total}</p>
            <p className="text-xs text-surface-on-variant mt-1">成功 {stats.success} / 失败 {stats.error}</p>
          </Card>
          <Card elevated>
            <p className="text-xs text-surface-on-variant">成功率</p>
            <p className="text-lg font-semibold text-surface-on mt-1">
              {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : '--'}%
            </p>
            <p className="text-xs text-surface-on-variant mt-1">共 {stats.total} 条任务</p>
          </Card>
        </div>

        {pendingApprovals.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-surface-on mb-3">⚠️ 待审批操作 ({pendingApprovals.length})</h2>
            {pendingApprovals.map(({ task, resolve }) => (
              <div key={task.task_id} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant mb-2">
                <div>
                  <p className="text-sm text-surface-on">{task.type} 操作</p>
                  <p className="text-xs text-surface-on-variant">Task #{task.task_id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(false)}
                    className="px-3 py-1 text-xs rounded-lg border border-outline text-surface-on hover:bg-surface-variant"
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => resolve(true)}
                    className="px-3 py-1 text-xs rounded-lg bg-primary text-white hover:opacity-90"
                  >
                    允许执行
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {errorMessage && (
          <Card>
            <p className="text-sm text-error">{errorMessage}</p>
          </Card>
        )}

        {(status === 'idle' || status === 'error') && (
          <Card>
            <p className="text-sm text-surface-on-variant mb-3">节点未连接，请前往 Settings 配置 Token 后连接。</p>
            <button
              onClick={connect}
              className="text-sm text-primary hover:underline"
            >
              立即连接 →
            </button>
          </Card>
        )}
      </div>
    </>
  )
}
