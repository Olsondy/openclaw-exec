import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { useT } from "../i18n";
import { useConfigStore, useConnectionStore } from "../store";

interface LocalConnectResult {
	gateway_url: string;
	gateway_web_ui: string;
	token: string;
	agent_id: string;
	device_name: string;
	restart_log: string | null;
}

interface DeviceIdentity {
	device_id: string;
	public_key_raw: string;
	private_key_raw?: string;
}

export type LocalConnectPhase =
	| "idle"
	| "scanning"
	| "pairing"
	| "restarting"
	| "connecting"
	| "done"
	| "error";

export function useLocalConnection() {
	const { setStatus, setError } = useConnectionStore();
	const { setRuntimeConfig, setUserProfile } = useConfigStore();
	const t = useT();

	const [phase, setPhase] = useState<LocalConnectPhase>("idle");
	const [logs, setLogs] = useState<string[]>([]);

	const appendLog = (msg: string) =>
		setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);

	const connectLocal = useCallback(async () => {
		setPhase("scanning");
		setLogs([]);
		appendLog(t.localConnect.scanning);
		setStatus("auth_checking");
		setError("");

		try {
			setPhase("pairing");
			appendLog(t.localConnect.pairing);

			const result = await invoke<LocalConnectResult>("local_connect");
			const identity = await invoke<DeviceIdentity>("get_device_identity");

			if (result.restart_log) {
				appendLog(t.localConnect.logRestartHeader);
				result.restart_log.split("\n").forEach((line) => appendLog(line));
				appendLog(t.localConnect.logRestartFooter);
				setPhase("restarting");
			}

			appendLog(
				t.localConnect.logFoundService.replace("{url}", result.gateway_url),
			);
			appendLog(t.localConnect.logAuthConnecting);
			setPhase("connecting");
			setStatus("connecting");

			setRuntimeConfig({
				gatewayUrl: result.gateway_url,
				gatewayWebUI: result.gateway_web_ui,
				gatewayToken: result.token,
				agentId: result.agent_id,
				deviceName: result.device_name,
			});

			setUserProfile({
				licenseStatus: t.settings.modeLocal,
				expiryDate: t.settings.directModeLabel,
			});

			await invoke("connect_gateway", {
				gatewayUrl: result.gateway_url,
				token: result.token,
				agentId: result.agent_id,
				deviceName: result.device_name,
				publicKeyRaw: identity.public_key_raw,
				privateKeyRaw: identity.private_key_raw ?? null,
			});

			setPhase("done");
			appendLog(t.localConnect.logConnectedSuccess);
		} catch (e) {
			const msg = String(e);
			setPhase("error");
			setStatus("error");
			setError(msg);
			appendLog(t.localConnect.logErrorPrefix.replace("{error}", msg));
		}
	}, [
		setError,
		setRuntimeConfig,
		setStatus,
		setUserProfile,
		t.localConnect.logAuthConnecting,
		t.localConnect.logConnectedSuccess,
		t.localConnect.logErrorPrefix,
		t.localConnect.logFoundService,
		t.localConnect.logRestartFooter,
		t.localConnect.logRestartHeader,
		t.localConnect.pairing,
		t.localConnect.scanning,
		t.settings.directModeLabel,
		t.settings.modeLocal,
	]);

	return { connectLocal, phase, logs };
}
