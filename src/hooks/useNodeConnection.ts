import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { toast } from "sonner";
import { useConfigStore, useConnectionStore } from "../store";
import type { VerifyResponse } from "../types";
import { useTauriEvent } from "./useTauri";

const TENANT_API_BASE = import.meta.env.VITE_TENANT_API_BASE ?? "";
const VERIFY_ENDPOINT = `${TENANT_API_BASE}/api/verify`;

interface DeviceIdentity {
	device_id: string;
	public_key_raw: string;
	private_key_raw?: string;
}

interface DirectGatewayOptions {
	gatewayUrl: string;
	gatewayToken?: string;
	gatewayWebUI?: string;
	profileLabel?: string;
}

export function useNodeConnection() {
	const { setStatus, setError, clearError } = useConnectionStore();
	const {
		licenseKey,
		connectionMode,
		runtimeConfig,
		setRuntimeConfig,
		setUserProfile,
		setSessionMeta,
	} = useConfigStore();

	useTauriEvent(
		"ws:connected",
		useCallback(() => setStatus("online"), [setStatus]),
	);
	useTauriEvent(
		"ws:disconnected",
		useCallback(() => setStatus("idle"), [setStatus]),
	);
	useTauriEvent<string>(
		"ws:error",
		useCallback((msg) => setError(msg), [setError]),
	);

	const verifyAndConnect = useCallback(async () => {
		if (!licenseKey.trim()) {
			toast.warning("请先在设置中配置 License Key");
			return;
		}

		try {
			clearError();
			setStatus("auth_checking");
			const identity = await getDeviceIdentity();
			const deviceName = getDeviceName();

			let result: VerifyResponse;
			if (import.meta.env.DEV) {
				result = await mockVerify(licenseKey, identity.device_id, deviceName);
			} else {
				const resp = await fetch(VERIFY_ENDPOINT, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						licenseKey,
						hwid: identity.device_id,
						deviceName,
						publicKey: identity.public_key_raw,
					}),
				});
				result = await resp.json();
			}

			if (!result.success) {
				setStatus("unauthorized");
				setError("License Key 无效或已过期，请检查后重试");
				return;
			}

			const { nodeConfig, userProfile } = result.data;

			if (userProfile.licenseStatus !== "Valid") {
				setStatus("unauthorized");
				setError(
					`授权状态异常：${userProfile.licenseStatus}，到期日：${userProfile.expiryDate}`,
				);
				return;
			}

			setRuntimeConfig(nodeConfig);
			setUserProfile(userProfile);
			if (nodeConfig.licenseId) {
				setSessionMeta({
					licenseId: nodeConfig.licenseId,
				});
			}

			setStatus("connecting");
			await invoke("connect_gateway", {
				gatewayUrl: nodeConfig.gatewayUrl,
				token: nodeConfig.gatewayToken,
				agentId: nodeConfig.agentId,
				deviceName: nodeConfig.deviceName,
				publicKeyRaw: identity.public_key_raw,
				privateKeyRaw: identity.private_key_raw ?? null,
			});
		} catch (e) {
			setError(String(e));
			setStatus("error");
		}
	}, [
		clearError,
		licenseKey,
		setError,
		setRuntimeConfig,
		setSessionMeta,
		setStatus,
		setUserProfile,
	]);

	const connectDirectGateway = useCallback(
		async (opts: DirectGatewayOptions) => {
			const gatewayUrl = opts.gatewayUrl.trim();
			const gatewayToken = opts.gatewayToken?.trim() ?? "";
			if (!gatewayUrl) {
				setError("网关地址不能为空");
				return false;
			}

			try {
				clearError();
				setStatus("connecting");

				const identity = await getDeviceIdentity();
				const deviceName = getDeviceName();
				const gatewayWebUI = resolveGatewayWebUI(
					opts.gatewayWebUI?.trim() || gatewayUrl,
					gatewayToken,
				);

				setRuntimeConfig({
					gatewayUrl,
					gatewayWebUI,
					gatewayToken,
					agentId: identity.device_id,
					deviceName,
				});
				setUserProfile({
					licenseStatus: opts.profileLabel ?? "Direct",
					expiryDate: "Direct Mode",
				});

				await invoke("connect_gateway", {
					gatewayUrl,
					token: gatewayToken,
					agentId: identity.device_id,
					deviceName,
					publicKeyRaw: identity.public_key_raw,
					privateKeyRaw: identity.private_key_raw ?? null,
				});
				return true;
			} catch (e) {
				setError(String(e));
				setStatus("error");
				return false;
			}
		},
		[clearError, setError, setRuntimeConfig, setStatus, setUserProfile],
	);

	const reconnectCurrent = useCallback(async () => {
		if (connectionMode === "license") {
			await verifyAndConnect();
			return;
		}
		if (!runtimeConfig) {
			setError("未找到可重连的网关配置，请先完成直连");
			return;
		}
		await connectDirectGateway({
			gatewayUrl: runtimeConfig.gatewayUrl,
			gatewayToken: runtimeConfig.gatewayToken,
			gatewayWebUI: runtimeConfig.gatewayWebUI,
			profileLabel: "Direct",
		});
	}, [
		connectDirectGateway,
		connectionMode,
		runtimeConfig,
		setError,
		verifyAndConnect,
	]);

	return { verifyAndConnect, connectDirectGateway, reconnectCurrent };
}

async function getDeviceIdentity(): Promise<DeviceIdentity> {
	if (import.meta.env.DEV) {
		return {
			device_id: "dev-device-id",
			public_key_raw: "dev-public-key",
			private_key_raw: "dev-private-key",
		};
	}
	return invoke<DeviceIdentity>("get_device_identity");
}

function getDeviceName(): string {
	const host = globalThis.location?.hostname || "exec-node";
	const platform = globalThis.navigator?.platform || "unknown";
	return `${host}-${platform}`;
}

function resolveGatewayWebUI(endpoint: string, token: string): string {
	const raw = endpoint.trim();
	if (!raw) return "";

	const withScheme = /^https?:\/\//i.test(raw)
		? raw
		: /^wss?:\/\//i.test(raw)
			? raw.replace(/^ws/i, "http")
			: `https://${raw}`;

	try {
		const url = new URL(withScheme);
		if (!url.hash && token) {
			url.hash = `token=${token}`;
		}
		return url.toString();
	} catch {
		return withScheme;
	}
}

async function mockVerify(
	licenseKey: string,
	hwid: string,
	deviceName: string,
): Promise<VerifyResponse> {
	await new Promise((resolve) => setTimeout(resolve, 800));
	if (!licenseKey || licenseKey.length < 4) {
		return {
			success: false,
			data: { nodeConfig: {} as never, userProfile: {} as never },
		};
	}

	return {
		success: true,
		data: {
			nodeConfig: {
				gatewayUrl: "ws://your-cloud-api.com:18789",
				gatewayWebUI: "http://your-web-ui.com:18789",
				gatewayToken: `mock-token-${hwid.slice(0, 8)}`,
				agentId: hwid.slice(0, 16),
				deviceName,
			},
			userProfile: {
				licenseStatus: "Valid",
				expiryDate: "2027-01-01",
			},
			needsBootstrap: {
				feishu: false,
				modelAuth: false,
			},
		},
	};
}
