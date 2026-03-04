import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { Card, Button } from '../components/ui'
import { useConfigStore, useConnectionStore } from '../store'
import { useNodeConnection } from '../hooks/useNodeConnection'

export function SettingsPage() {
  const { config, approvalRules, setToken, setAuthEndpoint, setGatewayEndpoint, setCloudConsoleUrl, setApprovalRule } = useConfigStore()
  const { status, errorMessage } = useConnectionStore()
  const { connect } = useNodeConnection()

  const [localToken, setLocalToken] = useState(config.token)
  const [localAuth, setLocalAuth] = useState(config.auth_endpoint)
  const [localGateway, setLocalGateway] = useState(config.gateway_endpoint)
  const [localConsole, setLocalConsole] = useState(config.cloud_console_url)

  const handleSave = async () => {
    setToken(localToken)
    setAuthEndpoint(localAuth)
    setGatewayEndpoint(localGateway)
    setCloudConsoleUrl(localConsole)
    await connect()
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-surface-on focus:outline-none focus:ring-2 focus:ring-primary/50'

  return (
    <>
      <TopBar title="Settings" subtitle="Configure your node" />
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-2xl">

        <Card>
          <h2 className="text-sm font-semibold text-surface-on mb-4">Node Connection</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-surface-on-variant mb-1 block">Token</label>
              <input
                type="password"
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder="输入节点 Token"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-surface-on-variant mb-1 block">Auth Service Endpoint</label>
              <input
                value={localAuth}
                onChange={(e) => setLocalAuth(e.target.value)}
                placeholder="https://auth.example.com/node-connect"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-surface-on-variant mb-1 block">Gateway Endpoint</label>
              <input
                value={localGateway}
                onChange={(e) => setLocalGateway(e.target.value)}
                placeholder="wss://gateway.example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-surface-on-variant mb-1 block">Cloud Console URL</label>
              <input
                value={localConsole}
                onChange={(e) => setLocalConsole(e.target.value)}
                placeholder="https://console.example.com"
                className={inputClass}
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-error-container text-error-on-container text-sm">
                {errorMessage}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={status === 'auth_checking' || status === 'connecting'}
            >
              {status === 'auth_checking' ? '验证中...' : status === 'connecting' ? '连接中...' : '保存并连接'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-surface-on mb-4">Approval Rules</h2>
          <div className="space-y-3">
            {(['browser', 'system', 'vision'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-surface-on capitalize">{key}</span>
                <select
                  value={approvalRules[key]}
                  onChange={(e) => setApprovalRule(key, e.target.value as 'always' | 'never' | 'sensitive_only')}
                  className="text-sm px-2 py-1 rounded-lg border border-outline bg-surface text-surface-on"
                >
                  <option value="always">总是询问</option>
                  <option value="sensitive_only">敏感操作询问</option>
                  <option value="never">不询问</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
