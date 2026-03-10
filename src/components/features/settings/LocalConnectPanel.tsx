import { useEffect, useRef } from 'react'
import { Monitor, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../../ui'
import { useLocalConnection, type LocalConnectPhase } from '../../../hooks/useLocalConnection'
import { useConnectionStore } from '../../../store'
import { useTauriEvent } from '../../../hooks/useTauri'

const phaseLabel: Record<LocalConnectPhase, string> = {
  idle: '连接本地 OpenClaw',
  scanning: '正在搜索服务...',
  pairing: '正在配对设备...',
  restarting: '正在重启服务...',
  connecting: '正在连接...',
  done: '已连接',
  error: '重试',
}

interface Props {
  onConnected?: () => void
}

export function LocalConnectPanel({ onConnected }: Props) {
  const { connectLocal, phase, logs } = useLocalConnection()
  const { status, setStatus } = useConnectionStore()
  const logRef = useRef<HTMLDivElement>(null)

  const isLoading =
    phase === 'scanning' ||
    phase === 'pairing' ||
    phase === 'restarting' ||
    phase === 'connecting'

  const isOnline = status === 'online'
  const isError = phase === 'error'

  // 日志自动滚到底
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  // 监听 ws:connected 更新 phase
  useTauriEvent('ws:connected', () => {
    setStatus('online')
    onConnected?.()
  })

  return (
    <div className="space-y-3">
      <p className="text-xs text-surface-on-variant leading-relaxed">
        自动搜索并连接本地安装的 OpenClaw 服务（需本机安装，不支持容器）。
        首次连接会写入设备授权并重启服务。
      </p>

      {isOnline && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-700 text-sm">
          <CheckCircle size={14} />
          <span>已连接到本地 OpenClaw</span>
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-error-container text-error-on-container text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>连接失败，查看下方日志，或手动重启 openclaw 服务后重试</span>
        </div>
      )}

      {logs.length > 0 && (
        <div
          ref={logRef}
          className="rounded-lg bg-surface-variant/30 border border-outline/20 p-3 space-y-0.5 max-h-36 overflow-y-auto"
        >
          {logs.map((line, i) => (
            <p key={i} className="text-xs font-mono text-surface-on-variant whitespace-pre-wrap leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}

      <Button
        onClick={connectLocal}
        disabled={isLoading || isOnline}
        variant={isError ? 'outlined' : undefined}
        className="w-full"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            {phaseLabel[phase]}
          </span>
        ) : isOnline ? (
          <span className="flex items-center gap-2">
            <CheckCircle size={14} />
            已连接
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Monitor size={14} />
            {phaseLabel[phase]}
          </span>
        )}
      </Button>
    </div>
  )
}
