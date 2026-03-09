import { useState } from 'react'
import { KeyRound, CheckCircle, AlertCircle, Loader2, ExternalLink, Shield, MessageSquare, TriangleAlert } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, Button } from '../components/ui'
import { useConfigStore, useConnectionStore, useBootstrapStore } from '../store'
import { useNodeConnection } from '../hooks/useNodeConnection'
import { ApiWizard } from '../components/features/wizard/ApiWizard'

function maskLicenseKey(key: string): string {
  const parts = key.split('-')
  if (parts.length === 4) {
    return `${parts[0]}-****-****-${parts[3]}`
  }
  return `${key.slice(0, 4)}****`
}

export function SettingsPage() {
  const { licenseKey, expiryDate, setLicenseKey, userProfile, runtimeConfig, approvalRules, setApprovalRule, licenseId } = useConfigStore()
  const { status, errorMessage } = useConnectionStore()
  const { verifyAndConnect } = useNodeConnection()
  const { openWizard } = useBootstrapStore()

  const [isChangingKey, setIsChangingKey] = useState(!licenseKey)
  const [newKey, setNewKey] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [apiWizardOpen, setApiWizardOpen] = useState(false)

  const isLoading = status === 'auth_checking' || status === 'connecting'
  const isOnline = status === 'online'
  const hasKey = Boolean(licenseKey)

  const handleRequestChange = () => {
    setNewKey('')
    setIsChangingKey(true)
  }

  const handleCancel = () => {
    setNewKey('')
    setIsChangingKey(false)
  }

  // 首次激活（无旧 key）直接激活，无需弹窗
  const handleActivateOrConfirm = () => {
    if (hasKey) {
      setShowConfirmDialog(true)
    } else {
      doActivate()
    }
  }

  const doActivate = async () => {
    setShowConfirmDialog(false)
    setLicenseKey(newKey.trim())
    setIsChangingKey(false)
    await verifyAndConnect()
  }

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-surface-on focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono tracking-wider'

  return (
    <>
      <TopBar title="Settings" subtitle="激活与配置" />
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-2xl">

        {/* License 激活卡片 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-surface-on">License 激活</h2>
          </div>

          <div className="space-y-3">
            {/* 当前已绑定 Key 信息 */}
            {hasKey && (
              <div className="rounded-lg border border-surface-variant bg-surface-variant/30 px-3 py-2.5 space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-on-variant">当前 Key</span>
                  <span className="font-mono text-surface-on tracking-wider">{maskLicenseKey(licenseKey)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-on-variant">到期时间</span>
                  <span className="text-surface-on">
                    {expiryDate === 'Permanent' || !expiryDate ? '永久有效' : expiryDate}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-on-variant">授权状态</span>
                  <span className={isOnline ? 'text-green-500 font-medium' : 'text-surface-on-variant'}>
                    {isOnline ? '● 已激活' : '○ 未连接'}
                  </span>
                </div>
              </div>
            )}

            {/* 换 Key 输入区 */}
            {isChangingKey ? (
              <>
                <div>
                  <label className="text-xs text-surface-on-variant mb-1 block">
                    {hasKey ? '新 License Key' : 'License Key'}
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className={inputClass}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container text-error-on-container text-sm">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {hasKey && (
                    <Button variant="outlined" onClick={handleCancel} disabled={isLoading}>
                      取消
                    </Button>
                  )}
                  <Button
                    onClick={handleActivateOrConfirm}
                    disabled={isLoading || !newKey.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        {status === 'auth_checking' ? '验证中...' : '连接中...'}
                      </span>
                    ) : '验证并激活'}
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="outlined" onClick={handleRequestChange} className="w-full">
                更换 License Key
              </Button>
            )}
          </div>
        </Card>

        {/* 激活状态卡片（仅激活后显示） */}
        {isOnline && userProfile && runtimeConfig && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-green-500" />
              <h2 className="text-sm font-semibold text-surface-on">节点状态</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-on-variant">授权状态</span>
                <span className="text-green-500 font-medium">{userProfile.licenseStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-on-variant">到期日期</span>
                <span className="text-surface-on">{userProfile.expiryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-on-variant">设备名</span>
                <span className="text-surface-on font-mono">{runtimeConfig.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-on-variant">Agent ID</span>
                <span className="text-surface-on font-mono text-xs truncate max-w-[200px]">{runtimeConfig.agentId}</span>
              </div>
              {runtimeConfig.gatewayWebUI && (
                <div className="flex justify-between items-center">
                  <span className="text-surface-on-variant">Cloud 控制台</span>
                  <a
                    href={runtimeConfig.gatewayWebUI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-xs hover:underline"
                  >
                    打开 <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 飞书配置卡片（激活后始终显示） */}
        {isOnline && licenseId && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-surface-on">飞书配置</h2>
            </div>
            <p className="text-xs text-surface-on-variant mb-3">
              配置飞书 App ID 和 App Secret，以启用飞书消息通道。
            </p>
            <Button variant="outlined" onClick={openWizard}>
              配置飞书
            </Button>
          </Card>
        )}

        {isOnline && licenseId && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-surface-on">模型 API 配置</h2>
            </div>
            <p className="text-xs text-surface-on-variant mb-3">
              手动覆盖节点当前模型配置，不会写回租户服务数据库。
            </p>
            <Button variant="outlined" onClick={() => setApiWizardOpen(true)}>
              打开配置向导
            </Button>
          </Card>
        )}

        {/* 审批规则卡片 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-surface-on">审批规则</h2>
          </div>
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
      {/* 换 Key 二次确认弹窗 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-2xl shadow-elevation-3 p-6 w-80 space-y-4">
            <div className="flex items-center gap-2 text-warning">
              <TriangleAlert size={18} />
              <h3 className="text-sm font-semibold text-surface-on">更换 License Key</h3>
            </div>
            <p className="text-sm text-surface-on-variant leading-relaxed">
              即将切换到新的 License Key，此操作将会：
            </p>
            <ul className="text-sm text-surface-on space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-surface-on-variant">•</span>
                <span>当前已绑定设备会自动解绑</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-surface-on-variant">•</span>
                <span>重新授权后节点数据将清空</span>
              </li>
            </ul>
            <p className="text-xs text-error font-medium">此操作不可撤销，请谨慎操作。</p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outlined"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-error text-white hover:bg-error/90"
                onClick={doActivate}
              >
                确认更换
              </Button>
            </div>
          </div>
        </div>
      )}

      {apiWizardOpen && licenseId && (
        <ApiWizard
          licenseId={licenseId}
          onSuccess={() => {
            setApiWizardOpen(false)
            verifyAndConnect()
          }}
          onClose={() => setApiWizardOpen(false)}
        />
      )}
    </>
  )
}
