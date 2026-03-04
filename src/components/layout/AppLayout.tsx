import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-surface m-4 ml-0 rounded-[28px] overflow-hidden relative shadow-sm border border-outline/20">
        <Outlet />
      </main>
    </div>
  )
}
