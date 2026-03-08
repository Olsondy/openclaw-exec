import { NavLink } from 'react-router-dom'
import { Earth, Settings } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from '../../store'
import { useConfigStore } from '../../store'

import { LayoutDashboard, Activity, PlugZap, LineChart } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/capabilities', icon: PlugZap, label: 'Capabilities' },
  { to: '/analytics', icon: LineChart, label: 'Analytics' },
]

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  connecting: 'bg-yellow-500',
  auth_checking: 'bg-yellow-500',
  authorized: 'bg-yellow-500',
  error: 'bg-red-500',
  unauthorized: 'bg-red-500',
  idle: 'bg-gray-400',
  paused: 'bg-gray-400',
}

export function Sidebar() {
  const { status } = useConnectionStore()
  const { config } = useConfigStore()

  const openConsole = async () => {
    if (!config.cloud_console_url) return
    await invoke('open_cloud_console', { url: config.cloud_console_url })
  }

  return (
    <aside className="w-64 h-screen bg-transparent flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 px-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">OC</div>
          <div>
            <div className="text-sm font-semibold text-surface-on">ClawMate</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status] ?? 'bg-gray-400'}`} />
              <span className="text-xs text-surface-on-variant capitalize">{status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-sm font-medium transition-colors duration-150 ${isActive
                ? 'bg-primary-container text-primary-on-container'
                : 'text-surface-on-variant hover:bg-surface-variant hover:text-surface-on'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="p-3 space-y-1">
        <button
          onClick={openConsole}
          className="w-[calc(100%-1.5rem)] mx-3 flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium text-surface-on-variant hover:bg-surface-variant hover:text-surface-on transition-colors"
        >
          <Earth className="w-[18px] h-[18px]" strokeWidth={2.5} />
          云端控制台
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-sm font-medium transition-colors ${isActive
              ? 'bg-primary-container text-primary-on-container'
              : 'text-surface-on-variant hover:bg-surface-variant hover:text-surface-on'
            }`
          }
        >
          <Settings className="w-[18px] h-[18px]" strokeWidth={2.5} />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
