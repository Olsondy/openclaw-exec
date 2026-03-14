import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Loader2,
	RefreshCw,
	XCircle,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { useOperatorConnection } from "../hooks/useOperatorConnection";
import { useT } from "../i18n";
import { useOperatorStore } from "../store";

// ─── Types ──────────────────────────────────────────────────────

interface MissingReqs {
	bins: string[];
	anyBins: string[];
	env: string[];
	config: string[];
	os: string[];
}

interface InstallOption {
	id: string;
	kind: string;
	label: string;
	bins: string[];
}

interface SkillEntry {
	name: string;
	description: string;
	emoji?: string;
	homepage?: string;
	bundled: boolean;
	eligible: boolean;
	disabled: boolean;
	blockedByAllowlist: boolean;
	missing: MissingReqs;
	install: InstallOption[];
}

// ─── Page ────────────────────────────────────────────────────────

export function SkillsPage() {
	const t = useT();
	const operatorStatus = useOperatorStore((s) => s.status);
	const isConnected = operatorStatus === "connected";

	return (
		<>
			<TopBar title={t.skills.title} subtitle={t.topbar.skillsSub} />
			<div className="flex-1 overflow-auto p-6">
				{!isConnected ? (
					<div className="flex flex-col items-center justify-center h-full gap-3 text-surface-on-variant/50">
						<Zap
							size={32}
							strokeWidth={1.5}
							className="text-surface-on-variant/30"
						/>
						<p className="text-sm font-medium text-surface-on-variant">
							{t.skills.notConnected}
						</p>
						<p className="text-xs text-center max-w-xs">
							{t.skills.notConnectedHint}
						</p>
					</div>
				) : (
					<SkillsContent />
				)}
			</div>
		</>
	);
}

// ─── Content ─────────────────────────────────────────────────────

function SkillsContent() {
	const { opCall } = useOperatorConnection();
	const t = useT();

	const [skills, setSkills] = useState<SkillEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [installingId, setInstallingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await opCall("skills.status", {});
			const payload = res.payload as { skills?: SkillEntry[] } | null;
			setSkills(payload?.skills ?? []);
		} finally {
			setLoading(false);
		}
	}, [opCall]);

	useEffect(() => {
		load();
	}, [load]);

	const handleInstall = useCallback(
		async (skillName: string, installId: string) => {
			const key = `${skillName}:${installId}`;
			setInstallingId(key);
			try {
				await opCall("skills.install", { name: skillName, installId });
				await load();
			} finally {
				setInstallingId(null);
			}
		},
		[opCall, load],
	);

	// Stats
	const total = skills.length;
	const available = skills.filter((s) => s.eligible && !s.disabled).length;
	const disabled = skills.filter((s) => s.disabled).length;
	const missingDeps = skills.filter(
		(s) => !s.eligible && !s.disabled && !s.blockedByAllowlist,
	).length;

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2
					size={20}
					className="animate-spin text-surface-on-variant/40"
				/>
			</div>
		);
	}

	if (skills.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-3 text-surface-on-variant/50">
				<Zap
					size={32}
					strokeWidth={1.5}
					className="text-surface-on-variant/30"
				/>
				<p className="text-sm">{t.skills.noSkills}</p>
				<button
					type="button"
					onClick={load}
					className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
				>
					<RefreshCw size={12} />
					{t.skills.reload}
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4 max-w-3xl">
			{/* Stats + Reload */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<StatChip
						label={t.skills.statTotal}
						value={total}
						color="text-surface-on-variant"
					/>
					<StatChip
						label={t.skills.statAvailable}
						value={available}
						color="text-emerald-500"
					/>
					{disabled > 0 && (
						<StatChip
							label={t.skills.statDisabled}
							value={disabled}
							color="text-surface-on-variant/50"
						/>
					)}
					{missingDeps > 0 && (
						<StatChip
							label={t.skills.statMissingDeps}
							value={missingDeps}
							color="text-amber-500"
						/>
					)}
				</div>
				<button
					type="button"
					onClick={load}
					disabled={loading}
					className="flex items-center gap-1.5 text-xs text-surface-on-variant/50 hover:text-surface-on-variant transition-colors"
				>
					<RefreshCw size={12} className={loading ? "animate-spin" : ""} />
					{t.skills.reload}
				</button>
			</div>

			{/* Skill list */}
			<div className="space-y-2">
				{skills.map((skill) => (
					<SkillCard
						key={skill.name}
						skill={skill}
						installingId={installingId}
						onInstall={handleInstall}
						t={t}
					/>
				))}
			</div>
		</div>
	);
}

// ─── StatChip ────────────────────────────────────────────────────

function StatChip({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="flex items-center gap-1">
			<span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
			<span className="text-xs text-surface-on-variant/50">{label}</span>
		</div>
	);
}

// ─── SkillCard ───────────────────────────────────────────────────

function SkillCard({
	skill,
	installingId,
	onInstall,
	t,
}: {
	skill: SkillEntry;
	installingId: string | null;
	onInstall: (name: string, installId: string) => void;
	t: ReturnType<typeof useT>;
}) {
	const hasMissingBins =
		skill.missing.bins.length > 0 || skill.missing.anyBins.length > 0;
	const hasMissingEnv = skill.missing.env.length > 0;
	const hasMissingConfig = skill.missing.config.length > 0;
	const hasAnyMissing = hasMissingBins || hasMissingEnv || hasMissingConfig;

	return (
		<div
			className={`rounded-xl border px-4 py-3 transition-colors ${
				skill.disabled
					? "border-outline/10 bg-surface opacity-60"
					: skill.eligible
						? "border-outline/10 bg-surface hover:border-outline/20"
						: "border-amber-500/20 bg-amber-500/5"
			}`}
		>
			<div className="flex items-start gap-3">
				{/* Emoji / icon */}
				<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-variant/40 flex items-center justify-center text-base mt-0.5">
					{skill.emoji ?? "⚡"}
				</div>

				{/* Main content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium text-surface-on">
							{skill.name}
						</span>
						<StatusBadge skill={skill} t={t} />
						{skill.bundled && (
							<span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-variant/60 text-surface-on-variant/60">
								built-in
							</span>
						)}
						{skill.homepage && (
							<a
								href={skill.homepage}
								target="_blank"
								rel="noreferrer"
								className="text-surface-on-variant/40 hover:text-primary transition-colors"
								onClick={(e) => e.stopPropagation()}
							>
								<ExternalLink size={11} />
							</a>
						)}
					</div>

					{skill.description && (
						<p className="text-xs text-surface-on-variant mt-0.5 leading-relaxed">
							{skill.description}
						</p>
					)}

					{/* Missing deps detail */}
					{hasAnyMissing && (
						<div className="mt-2 space-y-1.5">
							{hasMissingBins && (
								<MissingItem
									label={t.skills.missingBins}
									items={[...skill.missing.bins, ...skill.missing.anyBins]}
									color="text-amber-500"
								/>
							)}
							{hasMissingEnv && (
								<MissingItem
									label={t.skills.missingEnv}
									items={skill.missing.env}
									color="text-orange-500"
								/>
							)}
							{hasMissingConfig && (
								<MissingItem
									label={t.skills.missingConfig}
									items={skill.missing.config}
									color="text-red-400"
								/>
							)}
						</div>
					)}

					{/* Install buttons */}
					{!skill.disabled && skill.install.length > 0 && hasAnyMissing && (
						<div className="flex flex-wrap gap-2 mt-2.5">
							{skill.install.map((opt) => {
								const key = `${skill.name}:${opt.id}`;
								const isInstalling = installingId === key;
								return (
									<button
										key={opt.id}
										type="button"
										disabled={installingId !== null}
										onClick={() => onInstall(skill.name, opt.id)}
										className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
									>
										{isInstalling ? (
											<>
												<Loader2 size={10} className="animate-spin" />
												{t.skills.installing}
											</>
										) : (
											<>
												<Zap size={10} />
												{opt.label}
											</>
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── StatusBadge ─────────────────────────────────────────────────

function StatusBadge({
	skill,
	t,
}: {
	skill: SkillEntry;
	t: ReturnType<typeof useT>;
}) {
	if (skill.disabled) {
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-variant/60 text-surface-on-variant/60">
				<XCircle size={9} />
				{t.skills.disabled}
			</span>
		);
	}
	if (skill.blockedByAllowlist) {
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-variant/60 text-surface-on-variant/60">
				<AlertCircle size={9} />
				blocked
			</span>
		);
	}
	if (skill.eligible) {
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
				<CheckCircle2 size={9} />
				{t.skills.eligible}
			</span>
		);
	}
	return (
		<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
			<AlertCircle size={9} />
			{t.skills.missingDeps}
		</span>
	);
}

// ─── MissingItem ─────────────────────────────────────────────────

function MissingItem({
	label,
	items,
	color,
}: {
	label: string;
	items: string[];
	color: string;
}) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<span className={`text-[10px] ${color} font-medium`}>{label}:</span>
			{items.map((item) => (
				<code
					key={item}
					className="text-[10px] px-1.5 py-0.5 rounded bg-surface-variant/50 text-surface-on-variant font-mono"
				>
					{item}
				</code>
			))}
		</div>
	);
}
