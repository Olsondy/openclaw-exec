import { Badge } from '../../ui'
import type { ActivityLog, LogLevel } from '../../../types'

const dotColors: Record<LogLevel, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  pending: 'bg-orange-400 animate-pulse',
}

const badgeColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  PENDING: 'warning',
  BROWSER: 'info',
  SYSTEM: 'default',
  VISION: 'default',
}

interface ActivityItemProps {
  log: ActivityLog
}

export function ActivityItem({ log }: ActivityItemProps) {
  const time = log.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotColors[log.level]}`} />
        <div className="w-px flex-1 bg-surface-variant mt-1" />
      </div>
      <div className="pb-4 flex-1">
        <p className="text-xs text-surface-on-variant mb-1">{time}</p>
        <div className="bg-surface border border-surface-variant rounded-xl p-4 shadow-elevation-1">
          <p className="text-sm font-medium text-surface-on">{log.title}</p>
          <p className="text-xs text-surface-on-variant mt-0.5">{log.description}</p>
          {log.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {log.tags.map((tag) => (
                <Badge key={tag} label={tag} color={badgeColors[tag] ?? 'default'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
