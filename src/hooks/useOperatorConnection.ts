import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import { useConfigStore, useConnectionStore, useOperatorStore } from "../store";
import { useTauriEvent } from "./useTauri";

/** op_call 的返回类型 */
export interface RpcResponse {
	ok: boolean;
	payload: unknown | null;
	error: unknown | null;
}

/**
 * Operator 连接 hook
 *
 * 功能：
 * 1. 监听 node 连接状态，当 node 上线后自动建立 operator 连接
 * 2. 提供 `opCall(method, params)` 方法供组件调用任意 Gateway RPC
 * 3. 通过事件监听维护连接状态
 *
 * 用法：
 * ```tsx
 * const { opCall, status } = useOperatorConnection();
 * const config = await opCall("config.get", {});
 * ```
 */
export function useOperatorConnection() {
	const nodeStatus = useConnectionStore((s) => s.status);
	const runtimeConfig = useConfigStore((s) => s.runtimeConfig);
	const { status, setStatus, setError } = useOperatorStore();
	const connectedRef = useRef(false);

	// 监听 operator 事件
	useTauriEvent(
		"op:connected",
		useCallback(() => {
			connectedRef.current = true;
			setStatus("connected");
		}, [setStatus]),
	);

	useTauriEvent(
		"op:disconnected",
		useCallback(() => {
			connectedRef.current = false;
			setStatus("idle");
		}, [setStatus]),
	);

	useTauriEvent<string>(
		"op:error",
		useCallback(
			(msg) => {
				setError(msg);
			},
			[setError],
		),
	);

	// 当 node 连接上线且有 runtimeConfig 时，自动建立 operator 连接
	useEffect(() => {
		if (nodeStatus !== "online" || !runtimeConfig) {
			return;
		}

		// 防止重复连接
		if (connectedRef.current || status === "connecting") {
			return;
		}

		const doConnect = async () => {
			setStatus("connecting");
			try {
				// 获取设备身份（与 node 连接共享同一身份）
				const identity = await invoke<{
					device_id: string;
					public_key_raw: string;
					private_key_raw?: string;
				}>("get_device_identity");

				await invoke("op_connect", {
					gatewayUrl: runtimeConfig.gatewayUrl,
					token: runtimeConfig.gatewayToken,
					agentId: identity.device_id,
					deviceName: runtimeConfig.deviceName,
					publicKeyRaw: identity.public_key_raw,
					privateKeyRaw: identity.private_key_raw ?? null,
				});
			} catch (e) {
				setError(String(e));
			}
		};

		doConnect();
	}, [nodeStatus, runtimeConfig, status, setStatus, setError]);

	// node 断开时也断开 operator
	useEffect(() => {
		if (nodeStatus === "idle" || nodeStatus === "error") {
			if (connectedRef.current) {
				invoke("op_disconnect").catch(() => {});
				connectedRef.current = false;
				setStatus("idle");
			}
		}
	}, [nodeStatus, setStatus]);

	/**
	 * 调用 Gateway RPC 方法
	 *
	 * @example
	 * ```ts
	 * const res = await opCall("config.get", {});
	 * if (res.ok) console.log(res.payload);
	 *
	 * const models = await opCall("models.list", {});
	 * const health = await opCall("health", {});
	 * const status = await opCall("status", {});
	 * ```
	 */
	const opCall = useCallback(
		async (
			method: string,
			params: Record<string, unknown> = {},
		): Promise<RpcResponse> => {
			return invoke<RpcResponse>("op_call", { method, params });
		},
		[],
	);

	return {
		/** operator 连接状态 */
		status,
		/** 调用 Gateway RPC */
		opCall,
		/** 手动断开 operator */
		disconnect: useCallback(() => invoke("op_disconnect"), []),
	};
}
