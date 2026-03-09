import { useCallback, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ActivityPage } from './pages/ActivityPage'
import { CapabilitiesPage } from './pages/CapabilitiesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChannelPage } from './pages/ChannelPage'
import { useBootstrapStore, useConfigStore } from './store'
import { FeishuWizard } from './components/features/wizard/FeishuWizard'
import { ApiWizard } from './components/features/wizard/ApiWizard'
import { ChannelAuthDialog } from './components/features/channel-auth/ChannelAuthDialog'
import { useNodeConnection } from './hooks/useNodeConnection'
import { useTauriEvent } from './hooks/useTauri'
import { useI18nStore } from './i18n'


type GatewayEventEnvelope = {
  event: string
  payload: unknown
}

function AppInner() {
  const { wizardOpen, needs, closeWizard } = useBootstrapStore()
  const { licenseId } = useConfigStore()
  const { verifyAndConnect } = useNodeConnection()
  const [showChannelAuthDialog, setShowChannelAuthDialog] = useState(false)
  const theme = useI18nStore((s) => s.theme)

  // 将主题色同步到 html 元素
  useEffect(() => {
    const root = window.document.documentElement

    const setHtmlClass = (isDark: boolean) => {
      root.classList.add(isDark ? 'dark' : 'light');
      root.classList.remove(isDark ? 'light' : 'dark');
      root.style.colorScheme = isDark ? 'dark' : 'light';
      // 同步 Tauri 原生窗口主题（影响 Mica 材质明暗）
      getCurrentWindow().setTheme(isDark ? 'dark' : 'light').catch((e) => console.warn('[theme] setTheme failed:', e))
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setHtmlClass(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => setHtmlClass(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      setHtmlClass(theme === 'dark')
    }
  }, [theme])

  useTauriEvent<GatewayEventEnvelope>(
    'ws:gateway_event',
    useCallback((envelope) => {
      if (envelope.event === 'channel.auth.required') {
        setShowChannelAuthDialog(true)
      } else if (envelope.event === 'channel.auth.resolved') {
        setShowChannelAuthDialog(false)
      }
    }, []),
  )

  return (
    <>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="capabilities" element={<CapabilitiesPage />} />
          <Route path="channel" element={<ChannelPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      {wizardOpen && needs.feishu && licenseId && (
        <FeishuWizard
          licenseId={licenseId}
          onSuccess={() => { closeWizard(); verifyAndConnect() }}
          onClose={closeWizard}
        />
      )}
      {wizardOpen && needs.modelAuth && licenseId && (
        <ApiWizard
          licenseId={licenseId}
          onSuccess={() => { closeWizard(); verifyAndConnect() }}
          onClose={closeWizard}
        />
      )}
      {showChannelAuthDialog && (
        <ChannelAuthDialog
          onClose={() => setShowChannelAuthDialog(false)}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
