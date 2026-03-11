import { AlertCircle, CheckCircle, Loader2, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	type LocalConnectPhase,
	useLocalConnection,
} from "../../../hooks/useLocalConnection";
import { useTauriEvent } from "../../../hooks/useTauri";
import { useT } from "../../../i18n";
import { useConnectionStore } from "../../../store";
import { Button } from "../../ui";

interface Props {
	onConnected?: () => void;
}

export function LocalConnectPanel({ onConnected }: Props) {
	const { connectLocal, phase, logs } = useLocalConnection();
	const { status, setStatus } = useConnectionStore();
	const logRef = useRef<HTMLDivElement>(null);
	const closeTimerRef = useRef<number | null>(null);
	const t = useT();
	const [showSuccessFx, setShowSuccessFx] = useState(false);

	const phaseLabel: Record<LocalConnectPhase, string> = {
		idle: t.localConnect.idle,
		scanning: t.localConnect.scanning,
		pairing: t.localConnect.pairing,
		restarting: t.localConnect.restarting,
		connecting: t.localConnect.connecting,
		done: t.localConnect.done,
		error: t.localConnect.error,
	};

	const isLoading =
		phase === "scanning" ||
		phase === "pairing" ||
		phase === "restarting" ||
		phase === "connecting";

	const isOnline = status === "online";
	const isError = phase === "error";

	// 日志自动滚到底
	useEffect(() => {
		if (logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight;
		}
	}, [logs]);

	// 监听 ws:connected 更新 phase
	useTauriEvent("ws:connected", () => {
		setStatus("online");
		setShowSuccessFx(true);
		toast.success(t.localConnect.connected);
		if (closeTimerRef.current) {
			window.clearTimeout(closeTimerRef.current);
		}
		closeTimerRef.current = window.setTimeout(() => {
			onConnected?.();
		}, 900);
	});

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				window.clearTimeout(closeTimerRef.current);
			}
		};
	}, []);

	return (
		<div className="space-y-3">
			<p className="text-xs text-surface-on-variant leading-relaxed">
				{t.localConnect.desc}
			</p>

			{showSuccessFx && (
				<div className="relative overflow-hidden rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5">
					<div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/20 to-transparent animate-pulse" />
					<div className="relative flex items-center gap-2 text-green-400 text-sm font-medium">
						<span className="relative flex h-5 w-5">
							<span className="absolute inline-flex h-full w-full rounded-full bg-green-500/35 animate-ping" />
							<span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-black">
								<CheckCircle size={12} />
							</span>
						</span>
						<span>{t.localConnect.connected}</span>
					</div>
				</div>
			)}

			{isOnline && (
				<div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-700 text-sm">
					<CheckCircle size={14} />
					<span>{t.localConnect.connected}</span>
				</div>
			)}

			{isError && (
				<div className="flex items-start gap-2 p-2.5 rounded-lg bg-error-container text-error-on-container text-sm">
					<AlertCircle size={14} className="mt-0.5 shrink-0" />
					<span>{t.localConnect.errorMsg}</span>
				</div>
			)}

			{logs.length > 0 && (
				<div
					ref={logRef}
					className="rounded-lg bg-surface-variant/30 border border-outline/20 p-3 space-y-0.5 max-h-36 overflow-y-auto"
				>
					{logs.map((line, i) => (
						<p
							key={i}
							className="text-xs font-mono text-surface-on-variant whitespace-pre-wrap leading-relaxed"
						>
							{line}
						</p>
					))}
				</div>
			)}

			<Button
				onClick={() => {
					if (!isLoading && !isOnline) {
						toast.message(t.localConnect.connecting);
						connectLocal();
					}
				}}
				disabled={isLoading || isOnline}
				variant={isError ? "outlined" : undefined}
				className="w-full"
			>
				{isLoading ? (
					<span className="flex items-center gap-2">
						<Loader2 size={14} className="animate-spin" />
						{phaseLabel[phase]}
					</span>
				) : isOnline ? (
					<span className="flex items-center gap-2">
						<CheckCircle size={14} />
						{t.localConnect.connectedBtn}
					</span>
				) : (
					<span className="flex items-center gap-2">
						<Monitor size={14} />
						{phaseLabel[phase]}
					</span>
				)}
			</Button>
		</div>
	);
}
