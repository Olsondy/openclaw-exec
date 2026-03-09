import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Capabilities, ApprovalRules, NodeRuntimeConfig, UserProfile } from '../types'

/** 持久化至本地的设置 */
interface PersistedSettings {
  licenseKey: string
  /** 上次 verify 成功后缓存的到期日期，用于冷启动时展示（"Permanent" 表示永久） */
  expiryDate: string
}

interface ConfigState {
  /** 持久化：用户的 License Key */
  licenseKey: string

  /** 持久化：上次 verify 成功后缓存的到期日期 */
  expiryDate: string

  /** 内存中：节点运行时配置（来自服务端 verify 接口，不持久化） */
  runtimeConfig: NodeRuntimeConfig | null

  /** 内存中：用户授权信息（来自服务端 verify 接口，不持久化） */
  userProfile: UserProfile | null

  capabilities: Capabilities
  approvalRules: ApprovalRules

  licenseId: number | null

  setLicenseKey: (key: string) => void
  setRuntimeConfig: (config: NodeRuntimeConfig) => void
  setUserProfile: (profile: UserProfile) => void
  clearSession: () => void
  toggleCapability: (key: keyof Capabilities) => void
  setApprovalRule: (key: keyof ApprovalRules, mode: ApprovalRules[keyof ApprovalRules]) => void
  setSessionMeta: (meta: { licenseId: number }) => void
}

const defaultCapabilities: Capabilities = {
  browser: true,
  system: false,
  vision: true,
}

const defaultApprovalRules: ApprovalRules = {
  browser: 'sensitive_only',
  system: 'always',
  vision: 'never',
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      licenseKey: '',
      expiryDate: '',
      runtimeConfig: null,
      userProfile: null,
      capabilities: defaultCapabilities,
      approvalRules: defaultApprovalRules,
      licenseId: null,

      setLicenseKey: (licenseKey) => set({ licenseKey }),

      setRuntimeConfig: (runtimeConfig) => set({ runtimeConfig }),

      setUserProfile: (userProfile) =>
        set({ userProfile, expiryDate: userProfile.expiryDate }),

      /** 清除内存中的 Session（但保留 licenseKey） */
      clearSession: () => set({ runtimeConfig: null, userProfile: null, licenseId: null }),

      toggleCapability: (key) =>
        set((state) => ({
          capabilities: { ...state.capabilities, [key]: !state.capabilities[key] },
        })),

      setApprovalRule: (key, mode) =>
        set((state) => ({
          approvalRules: { ...state.approvalRules, [key]: mode },
        })),

      setSessionMeta: ({ licenseId }) =>
        set({ licenseId }),
    }),
    {
      name: 'easy-openclaw-settings',
      // 只将 licenseKey、capabilities、approvalRules 写入本地存储，
      // runtimeConfig 和 userProfile 不持久化，保障 Token 隐私
      partialize: (state): PersistedSettings => ({
        licenseKey: state.licenseKey,
        expiryDate: state.expiryDate,
      }),
    }
  )
)
