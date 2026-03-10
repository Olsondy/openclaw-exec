import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { KeyRound, Monitor, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../../store'
import type { ConnectionMode } from '../../../store/config.store'

interface Props {
  onDone: () => void
}

const OPTIONS: {
  mode: ConnectionMode
  icon: React.ElementType
  title: string
  desc: string
  hint: string
}[] = [
  {
    mode: 'license',
    icon: KeyRound,
    title: 'License 激活',
    desc: '输入 License Key 连接到云端 OpenClaw 服务，适合订阅制用户。',
    hint: '激活后由云端统一管理配置',
  },
  {
    mode: 'local',
    icon: Monitor,
    title: '连接本地实例',
    desc: '自动发现并连接本机已安装的 OpenClaw，适合私有部署用户。',
    hint: '配置存储在本地，完全离线可用',
  },
]

export function WelcomeModal({ onDone }: Props) {
  const { setConnectionMode } = useConfigStore()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<ConnectionMode | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await invoke('save_app_config', { config: { connectionMode: selected } })
      setConnectionMode(selected)
      onDone()
      navigate('/settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl px-4">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-surface-on mb-1">欢迎使用 ClawMate</h1>
          <p className="text-sm text-surface-on-variant">请选择连接方式，后续可在设置中切换</p>
        </div>

        {/* 选项卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {OPTIONS.map(({ mode, icon: Icon, title, desc, hint }) => {
            const isActive = selected === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setSelected(mode)}
                className={`
                  text-left p-5 rounded-xl border transition-all duration-200
                  ${isActive
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                    : 'border-card-border bg-card-bg hover:border-white/20'
                  }
                `}
              >
                <div className={`mb-3 w-9 h-9 rounded-lg flex items-center justify-center
                  ${isActive ? 'bg-primary/15' : 'bg-surface-variant'}`}
                >
                  <Icon size={18} className={isActive ? 'text-primary' : 'text-surface-on-variant'} />
                </div>
                <div className="text-sm font-medium text-surface-on mb-1.5">{title}</div>
                <div className="text-xs text-surface-on-variant leading-relaxed mb-3">{desc}</div>
                <div className={`text-[11px] ${isActive ? 'text-primary' : 'text-surface-on-variant/60'}`}>
                  {hint}
                </div>
              </button>
            )
          })}
        </div>

        {/* 确认按钮 */}
        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
            bg-primary text-primary-on text-sm font-medium
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:opacity-90 transition-opacity"
        >
          {loading ? '正在初始化...' : '继续'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  )
}
