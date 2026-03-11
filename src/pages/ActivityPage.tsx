import { useMemo, useState } from "react";
import { ActivityItem } from "../components/features/activity/ActivityItem";
import { TopBar } from "../components/layout/TopBar";
import { useT } from "../i18n";
import { useTasksStore } from "../store";
import type { ActivityLog, LogLevel } from "../types";

type LogSection = "audit" | "gateway";

export function ActivityPage() {
	const { logs } = useTasksStore();
	const [section, setSection] = useState<LogSection>("audit");
	const [auditLevel, setAuditLevel] = useState<LogLevel | "all">("all");
	const [gatewayLevel, setGatewayLevel] = useState<LogLevel | "all">("all");
	const [auditKeyword, setAuditKeyword] = useState("");
	const [gatewayKeyword, setGatewayKeyword] = useState("");
	const t = useT();

	const levelOptions: { value: LogLevel | "all"; label: string }[] = [
		{ value: "all", label: t.activity.all },
		{ value: "error", label: t.activity.errors },
		{ value: "success", label: t.activity.successes },
		{ value: "warning", label: t.activity.warnings },
		{ value: "info", label: "Info" },
		{ value: "pending", label: "Pending" },
	];

	const [auditLogs, gatewayLogs] = useMemo(() => {
		const gateway: ActivityLog[] = [];
		const audit: ActivityLog[] = [];
		for (const log of logs) {
			if (isGatewayLog(log)) {
				gateway.push(log);
				continue;
			}
			audit.push(log);
		}
		return [audit, gateway];
	}, [logs]);

	const filteredAuditLogs = useMemo(
		() => filterLogs(auditLogs, auditLevel, auditKeyword),
		[auditLogs, auditKeyword, auditLevel],
	);
	const filteredGatewayLogs = useMemo(
		() => filterLogs(gatewayLogs, gatewayLevel, gatewayKeyword),
		[gatewayLogs, gatewayKeyword, gatewayLevel],
	);

	const currentLevel = section === "audit" ? auditLevel : gatewayLevel;
	const currentKeyword = section === "audit" ? auditKeyword : gatewayKeyword;
	const currentLogs =
		section === "audit" ? filteredAuditLogs : filteredGatewayLogs;

	return (
		<>
			<TopBar title={t.sidebar.activity} />
			<div className="flex-1 overflow-auto">
				<div className="flex gap-0 px-6 border-b border-surface-variant">
					<button
						type="button"
						onClick={() => setSection("audit")}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							section === "audit"
								? "border-primary text-primary"
								: "border-transparent text-surface-on-variant hover:text-surface-on"
						}`}
					>
						{t.activity.auditLogs}
					</button>
					<button
						type="button"
						onClick={() => setSection("gateway")}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							section === "gateway"
								? "border-primary text-primary"
								: "border-transparent text-surface-on-variant hover:text-surface-on"
						}`}
					>
						{t.activity.gatewayLogs}
					</button>
				</div>

				<div className="px-6 py-3 border-b border-surface-variant bg-surface/30">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_auto] md:items-end">
						<div className="space-y-1">
							<label className="text-xs text-surface-on-variant">
								{t.activity.levelLabel}
							</label>
							<select
								value={currentLevel}
								onChange={(e) => {
									const value = e.target.value as LogLevel | "all";
									if (section === "audit") {
										setAuditLevel(value);
										return;
									}
									setGatewayLevel(value);
								}}
								className="w-full rounded-lg border border-white/15 bg-surface-variant px-2.5 py-2 text-xs text-surface-on focus:outline-none"
							>
								{levelOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-surface-on-variant">
								{t.activity.keywordLabel}
							</label>
							<input
								value={currentKeyword}
								onChange={(e) => {
									if (section === "audit") {
										setAuditKeyword(e.target.value);
										return;
									}
									setGatewayKeyword(e.target.value);
								}}
								placeholder={t.activity.keywordPlaceholder}
								className="w-full rounded-lg border border-white/15 bg-surface-variant px-3 py-2 text-xs text-surface-on placeholder:text-surface-on-variant/60 focus:outline-none"
							/>
						</div>
						<button
							type="button"
							onClick={() => {
								if (section === "audit") {
									setAuditLevel("all");
									setAuditKeyword("");
									return;
								}
								setGatewayLevel("all");
								setGatewayKeyword("");
							}}
							className="h-9 rounded-lg border border-white/15 px-3 text-xs text-surface-on-variant hover:text-surface-on hover:bg-surface-variant/50 transition-colors"
						>
							{t.activity.clearFilters}
						</button>
					</div>
				</div>

				<div className="px-6 pt-4">
					{currentLogs.length === 0 ? (
						<p className="text-sm text-surface-on-variant py-8 text-center">
							{t.activity.noLogs}
						</p>
					) : (
						currentLogs.map((log) => <ActivityItem key={log.id} log={log} />)
					)}
				</div>
			</div>
		</>
	);
}

function isGatewayLog(log: ActivityLog): boolean {
	if (log.title.toLowerCase().startsWith("gateway:")) {
		return true;
	}
	return log.tags.some((tag) => {
		const normalized = tag.toLowerCase();
		return normalized === "gateway" || normalized === "event";
	});
}

function filterLogs(
	logs: ActivityLog[],
	level: LogLevel | "all",
	keyword: string,
): ActivityLog[] {
	const normalizedKeyword = keyword.trim().toLowerCase();
	return logs.filter((log) => {
		if (level !== "all" && log.level !== level) {
			return false;
		}
		if (!normalizedKeyword) {
			return true;
		}
		const searchText =
			`${log.title} ${log.description} ${log.tags.join(" ")}`.toLowerCase();
		return searchText.includes(normalizedKeyword);
	});
}
