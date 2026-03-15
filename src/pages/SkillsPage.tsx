import {
	AlertCircle,
	CheckCircle2,
	Download,
	ExternalLink,
	Loader2,
	RefreshCw,
	Search,
	XCircle,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

interface HubSkillEntry {
	name?: string;
	slug?: string;
	description?: string;
	version?: string;
	author?: string;
	homepage?: string;
}

type Tab = "installed" | "hub";

// ─── Page ────────────────────────────────────────────────────────

export function SkillsPage() {
	const t = useT();
	const operatorStatus = useOperatorStore((s) => s.status);
	const isConnected = operatorStatus === "connected";
	const [tab, setTab] = useState<Tab>("installed");

	return (
		<>
			<TopBar title={t.skills.title} subtitle={t.topbar.skillsSub} />
			<div className="flex-1 overflow-auto flex flex-col">
				{/* Tab bar */}
				<div className="flex border-b border-outline/10 px-6 flex-shrink-0">
					{(["installed", "hub"] as Tab[]).map((t_) => (
						<button
							key={t_}
							type="button"
							onClick={() => setTab(t_)}
							className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
								tab === t_
									? "border-primary text-primary"
									: "border-transparent text-surface-on-variant hover:text-surface-on"
							}`}
						>
							{t_ === "installed" ? t.skills.tabInstalled : t.skills.tabHub}
						</button>
					))}
				</div>

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
					) : tab === "installed" ? (
						<InstalledTab />
					) : (
						<HubTab />
					)}
				</div>
			</div>
		</>
	);
}

// ─── Installed Tab ───────────────────────────────────────────────

function InstalledTab() {
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
					className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80"
				>
					<RefreshCw size={12} />
					{t.skills.reload}
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4 max-w-3xl">
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

// ─── ClawHub Tab ────────────────────────────────────────────────

function HubTab() {
	const { opCall } = useOperatorConnection();
	const t = useT();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<HubSkillEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [searching, setSearching] = useState(false);
	const [installingSlug, setInstallingSlug] = useState<string | null>(null);
	const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());
	const [searched, setSearched] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSearch = useCallback(
		async (q: string) => {
			if (!q.trim()) return;
			setSearching(true);
			setSearched(true);
			try {
				const res = await opCall("skills.hub.search", {
					query: q.trim(),
					limit: 20,
				});
				if (res.ok) {
					const payload = res.payload as {
						results?: HubSkillEntry[];
						total?: number;
					} | null;
					setResults(payload?.results ?? []);
					setTotal(payload?.total ?? 0);
				} else {
					setResults([]);
					setTotal(0);
				}
			} finally {
				setSearching(false);
			}
		},
		[opCall],
	);

	const handleInstall = useCallback(
		async (skill: HubSkillEntry) => {
			const slug = skill.slug ?? skill.name ?? "";
			if (!slug) return;
			setInstallingSlug(slug);
			try {
				const res = await opCall("skills.hub.install", { slug });
				if (res.ok) {
					setInstalledSlugs((prev) => new Set([...prev, slug]));
					toast.success(t.skills.hubInstallSuccess);
				} else {
					const errMsg =
						(res.error as { message?: string } | null)?.message ??
						"Install failed";
					toast.error(errMsg);
				}
			} finally {
				setInstallingSlug(null);
			}
		},
		[opCall, t.skills.hubInstallSuccess],
	);

	return (
		<div className="space-y-4 max-w-3xl">
			{/* Search bar */}
			<div className="flex gap-2">
				<div className="relative flex-1">
					<Search
						size={13}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-on-variant/40"
					/>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
						placeholder={t.skills.hubSearchPlaceholder}
						className="w-full pl-8 pr-3 py-2 text-sm bg-surface-variant/30 border border-outline/20 rounded-lg text-surface-on placeholder:text-surface-on-variant/40 focus:outline-none focus:border-primary/40 transition-colors"
					/>
				</div>
				<button
					type="button"
					onClick={() => handleSearch(query)}
					disabled={searching || !query.trim()}
					className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-on hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
				>
					{searching ? (
						<Loader2 size={13} className="animate-spin" />
					) : (
						<Search size={13} />
					)}
					{searching ? t.skills.hubSearching : t.skills.hubSearch}
				</button>
			</div>

			{/* Results */}
			{searching ? (
				<div className="flex items-center justify-center py-16">
					<Loader2
						size={20}
						className="animate-spin text-surface-on-variant/40"
					/>
				</div>
			) : searched && results.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 gap-2 text-surface-on-variant/40">
					<Search size={24} strokeWidth={1.5} />
					<p className="text-sm">{t.skills.hubNoResults}</p>
				</div>
			) : results.length > 0 ? (
				<>
					{total > results.length && (
						<p className="text-xs text-surface-on-variant/50">
							{t.skills.statTotal}: {total}
						</p>
					)}
					<div className="space-y-2">
						{results.map((skill, i) => {
							const slug = skill.slug ?? skill.name ?? String(i);
							const isInstalling = installingSlug === slug;
							const isInstalled = installedSlugs.has(slug);
							return (
								<div
									key={slug}
									className="rounded-xl border border-outline/10 bg-surface px-4 py-3 flex items-start gap-3 hover:border-outline/20 transition-colors"
								>
									<div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
										<Zap size={14} strokeWidth={1.8} />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-medium text-surface-on">
												{skill.name ?? slug}
											</span>
											{skill.version && (
												<span className="text-[10px] text-surface-on-variant/50 font-mono">
													v{skill.version}
												</span>
											)}
											{skill.author && (
												<span className="text-[10px] text-surface-on-variant/50">
													by {skill.author}
												</span>
											)}
											{skill.homepage && (
												<a
													href={skill.homepage}
													target="_blank"
													rel="noreferrer"
													className="text-surface-on-variant/40 hover:text-primary transition-colors"
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
									</div>
									<div className="shrink-0">
										{isInstalled ? (
											<span className="flex items-center gap-1 text-[11px] text-emerald-500">
												<CheckCircle2 size={12} />
												{t.skills.hubInstalled}
											</span>
										) : (
											<button
												type="button"
												disabled={isInstalling || installingSlug !== null}
												onClick={() => handleInstall(skill)}
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
											>
												{isInstalling ? (
													<>
														<Loader2 size={11} className="animate-spin" />
														{t.skills.hubInstalling}
													</>
												) : (
													<>
														<Download size={11} />
														{t.skills.hubInstall}
													</>
												)}
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</>
			) : null}
		</div>
	);
}

// ─── Shared components ───────────────────────────────────────────

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
				<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-variant/40 flex items-center justify-center text-base mt-0.5">
					{skill.emoji ?? "⚡"}
				</div>
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

function StatusBadge({
	skill,
	t,
}: {
	skill: SkillEntry;
	t: ReturnType<typeof useT>;
}) {
	if (skill.disabled)
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-variant/60 text-surface-on-variant/60">
				<XCircle size={9} />
				{t.skills.disabled}
			</span>
		);
	if (skill.blockedByAllowlist)
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-variant/60 text-surface-on-variant/60">
				<AlertCircle size={9} />
				blocked
			</span>
		);
	if (skill.eligible)
		return (
			<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
				<CheckCircle2 size={9} />
				{t.skills.eligible}
			</span>
		);
	return (
		<span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
			<AlertCircle size={9} />
			{t.skills.missingDeps}
		</span>
	);
}

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
