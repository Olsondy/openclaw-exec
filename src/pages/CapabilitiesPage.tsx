import { TopBar } from '../components/layout/TopBar'
import { Card, Switch } from '../components/ui'
import { useConfigStore } from '../store'
import { Globe, Monitor, Eye } from 'lucide-react'

const modules = [
  {
    key: 'browser' as const,
    icon: Globe,
    title: '浏览器自动化',
    description: '使用 Playwright 控制 Chrome/Firefox 执行网页操作、表单填写、数据抓取',
  },
  {
    key: 'system' as const,
    icon: Monitor,
    title: '系统操作',
    description: '文件管理、进程控制、执行系统命令。注意：此模块风险较高，建议设置审批规则',
  },
  {
    key: 'vision' as const,
    icon: Eye,
    title: '视觉/OCR',
    description: '屏幕截图、OCR 文字识别、图像分析能力',
  },
]

export function CapabilitiesPage() {
  const { capabilities, toggleCapability } = useConfigStore()

  return (
    <>
      <TopBar title="Capabilities" subtitle="Enable or disable execution modules" />
      <div className="flex-1 overflow-auto p-6 space-y-3 max-w-2xl">
        {modules.map(({ key, icon: Icon, title, description }) => (
          <Card key={key}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon className="w-6 h-6 text-primary mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-sm font-medium text-surface-on">{title}</p>
                  <p className="text-xs text-surface-on-variant mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
              <Switch
                checked={capabilities[key]}
                onChange={() => toggleCapability(key)}
              />
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
