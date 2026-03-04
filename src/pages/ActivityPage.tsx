import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { ActivityItem } from '../components/features/activity/ActivityItem'
import { useTasksStore } from '../store'
import type { LogLevel } from '../types'

const tabs: { label: string; filter: LogLevel | 'all' }[] = [
  { label: 'All Activity', filter: 'all' },
  { label: 'Errors', filter: 'error' },
  { label: 'Successes', filter: 'success' },
  { label: 'Warnings', filter: 'warning' },
]

export function ActivityPage() {
  const { logs } = useTasksStore()
  const [activeTab, setActiveTab] = useState<LogLevel | 'all'>('all')

  const filtered = activeTab === 'all' ? logs : logs.filter((l) => l.level === activeTab)

  return (
    <>
      <TopBar title="Activity" subtitle="Real-time task execution logs across all modules" />
      <div className="flex-1 overflow-auto">
        <div className="flex gap-0 px-6 border-b border-surface-variant">
          {tabs.map(({ label, filter }) => (
            <button
              key={filter}
              onClick={() => setActiveTab(filter)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === filter
                  ? 'border-primary text-primary'
                  : 'border-transparent text-surface-on-variant hover:text-surface-on'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 pt-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-surface-on-variant py-8 text-center">暂无活动日志</p>
          ) : (
            filtered.map((log) => <ActivityItem key={log.id} log={log} />)
          )}
        </div>
      </div>
    </>
  )
}
