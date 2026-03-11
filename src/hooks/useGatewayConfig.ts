import { useCallback, useState } from "react";
import {
	type RpcResponse,
	useOperatorConnection,
} from "./useOperatorConnection";

/** Gateway 配置快照（config.get 返回结构） */
export interface GatewayConfigSnapshot {
	exists: boolean;
	valid: boolean;
	config: Record<string, unknown>;
	raw?: string;
	hash?: string;
}

/** 模型 Provider 信息 */
export interface ModelProvider {
	id: string;
	label?: string;
	baseUrl: string;
	api?: string;
	models: ModelDefinition[];
}

/** 模型定义 */
export interface ModelDefinition {
	id: string;
	name: string;
	reasoning?: boolean;
	input?: string[];
	contextWindow?: number;
	maxTokens?: number;
}

/** Gateway 健康信息 */
export interface GatewayHealth {
	ok: boolean;
	uptime?: number;
	version?: string;
	channels?: Record<string, unknown>;
}

/**
 * Gateway 配置管理 hook
 *
 * 提供读取配置、修改配置、查询模型等高层 API。
 * 内部使用 useOperatorConnection 的 opCall 方法。
 *
 * @example
 * ```tsx
 * const { getConfig, getModels, patchConfig, loading } = useGatewayConfig();
 *
 * // 读取配置
 * const config = await getConfig();
 *
 * // 查询模型列表
 * const models = await getModels();
 *
 * // 增量修改配置（添加一个 provider）
 * await patchConfig({
 *   models: {
 *     providers: {
 *       "my-provider": {
 *         baseUrl: "https://api.example.com/v1",
 *         apiKey: "sk-xxx",
 *         models: [{ id: "gpt-4o", name: "GPT-4o", reasoning: false, ... }]
 *       }
 *     }
 *   }
 * });
 * ```
 */
export function useGatewayConfig() {
	const { opCall, status } = useOperatorConnection();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/** 读取完整 Gateway 配置 */
	const getConfig =
		useCallback(async (): Promise<GatewayConfigSnapshot | null> => {
			setLoading(true);
			setError(null);
			try {
				const res = await opCall("config.get", {});
				if (res.ok && res.payload) {
					return res.payload as GatewayConfigSnapshot;
				}
				setError(extractErrorMessage(res));
				return null;
			} catch (e) {
				setError(String(e));
				return null;
			} finally {
				setLoading(false);
			}
		}, [opCall]);

	/** 读取配置 schema（包含所有字段描述、UI hints） */
	const getConfigSchema = useCallback(async () => {
		const res = await opCall("config.schema", {});
		if (res.ok) return res.payload;
		throw new Error(extractErrorMessage(res));
	}, [opCall]);

	/**
	 * 增量修改配置（merge-patch 语义）
	 * 需要先 getConfig() 拿到 hash，再 patchConfig
	 */
	const patchConfig = useCallback(
		async (
			patch: Record<string, unknown>,
			baseHash?: string,
		): Promise<boolean> => {
			setLoading(true);
			setError(null);
			try {
				// 如果未提供 hash，先获取当前配置的 hash
				let hash = baseHash;
				if (!hash) {
					const current = await opCall("config.get", {});
					if (current.ok && current.payload) {
						hash = (current.payload as Record<string, unknown>).hash as string;
					}
				}

				const res = await opCall("config.patch", {
					raw: JSON.stringify(patch),
					baseHash: hash,
				});

				if (res.ok) return true;
				setError(extractErrorMessage(res));
				return false;
			} catch (e) {
				setError(String(e));
				return false;
			} finally {
				setLoading(false);
			}
		},
		[opCall],
	);

	/** 查询 Gateway 已注册的模型列表 */
	const getModels = useCallback(async (): Promise<unknown | null> => {
		setLoading(true);
		setError(null);
		try {
			const res = await opCall("models.list", {});
			if (res.ok) return res.payload;
			setError(extractErrorMessage(res));
			return null;
		} catch (e) {
			setError(String(e));
			return null;
		} finally {
			setLoading(false);
		}
	}, [opCall]);

	/** 查询 Gateway 健康状态 */
	const getHealth = useCallback(async (): Promise<GatewayHealth | null> => {
		try {
			const res = await opCall("health", {});
			if (res.ok) return res.payload as GatewayHealth;
			return null;
		} catch {
			return null;
		}
	}, [opCall]);

	/** 查询 Gateway 完整状态 */
	const getStatus = useCallback(async () => {
		try {
			const res = await opCall("status", {});
			if (res.ok) return res.payload;
			return null;
		} catch {
			return null;
		}
	}, [opCall]);

	/** 查询通道状态 */
	const getChannelsStatus = useCallback(async () => {
		try {
			const res = await opCall("channels.status", {});
			if (res.ok) return res.payload;
			return null;
		} catch {
			return null;
		}
	}, [opCall]);

	/** 查询 agents 列表 */
	const getAgents = useCallback(async () => {
		try {
			const res = await opCall("agents.list", {});
			if (res.ok) return res.payload;
			return null;
		} catch {
			return null;
		}
	}, [opCall]);

	/** 查询 cron 任务列表 */
	const getCronList = useCallback(async () => {
		try {
			const res = await opCall("cron.list", {});
			if (res.ok) return res.payload;
			return null;
		} catch {
			return null;
		}
	}, [opCall]);

	/** 查询用量统计 */
	const getUsageCost = useCallback(
		async (days = 30) => {
			try {
				const res = await opCall("usage.cost", { days });
				if (res.ok) return res.payload;
				return null;
			} catch {
				return null;
			}
		},
		[opCall],
	);

	/** 发送消息到指定通道 */
	const sendMessage = useCallback(
		async (params: { channel: string; text: string; agentId?: string }) => {
			const res = await opCall("send", params);
			if (!res.ok) throw new Error(extractErrorMessage(res));
			return res.payload;
		},
		[opCall],
	);

	return {
		/** operator 连接状态 */
		connected: status === "connected",
		/** 当前是否正在加载 */
		loading,
		/** 最近一次错误 */
		error,

		// ── 配置管理 ──
		getConfig,
		getConfigSchema,
		patchConfig,

		// ── 模型 ──
		getModels,

		// ── 状态/监控 ──
		getHealth,
		getStatus,
		getChannelsStatus,

		// ── Agent ──
		getAgents,

		// ── Cron ──
		getCronList,

		// ── 用量 ──
		getUsageCost,

		// ── 消息 ──
		sendMessage,

		// ── 底层 ──
		opCall,
	};
}

function extractErrorMessage(res: RpcResponse): string {
	if (res.error && typeof res.error === "object") {
		const err = res.error as Record<string, unknown>;
		if (typeof err.message === "string") return err.message;
	}
	return "unknown error";
}
