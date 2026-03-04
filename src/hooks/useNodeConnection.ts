import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore, useConfigStore } from '../store'
import { useTauriEvent } from './useTauri'

export function useNodeConnection() {
  const { setStatus, setError } = useConnectionStore()
  const { config } = useConfigStore()

  useTauriEvent('ws:connected', useCallback(() => setStatus('online'), [setStatus]))
  useTauriEvent('ws:disconnected', useCallback(() => setStatus('idle'), [setStatus]))
  useTauriEvent<string>('ws:error', useCallback((msg) => setError(msg), [setError]))

  const connect = useCallback(async () => {
    if (!config.token || !config.auth_endpoint || !config.gateway_endpoint) {
      setError('请先在 Settings 中配置 Token 和端点地址')
      return
    }

    try {
      setStatus('auth_checking')

      const authResult = await invoke<{ allowed: boolean; message?: string }>('check_auth', {
        authEndpoint: config.auth_endpoint,
        token: config.token,
        machineId: await getMachineId(),
      })

      if (!authResult.allowed) {
        setStatus('unauthorized')
        setError(authResult.message ?? 'Token 已绑定其他设备，请联系管理员解绑')
        return
      }

      setStatus('connecting')
      await invoke('connect_gateway', {
        gatewayUrl: config.gateway_endpoint,
        token: config.token,
      })
    } catch (e) {
      setError(String(e))
    }
  }, [config, setStatus, setError])

  return { connect }
}

async function getMachineId(): Promise<string> {
  let id = localStorage.getItem('machine_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('machine_id', id)
  }
  return id
}
