import { AlertCircle, CheckCircle2, Cpu, Loader2 } from "lucide-react";
import { useState } from "react";
import { useGatewayConfig } from "../../../hooks/useGatewayConfig";
import { Button, Card } from "../../ui";

interface Props {
	onSuccess: () => void;
	onClose: () => void;
}

// ─── API 格式定义 ────────────────────────────────────────────────

type ApiFormat =
	| "openai-completions"
	| "anthropic-messages"
	| "google-generative-ai";

interface ProviderPreset {
	id: string;
	label: string;
	baseUrl: string;
}

interface ModelSuggestion {
	id: string;
	name: string;
}

interface FormatDef {
	label: string;
	desc: string; // 说明支持哪些大模型
	presets: ProviderPreset[];
	modelSuggestions: ModelSuggestion[];
}

const FORMAT_DEFS: Record<ApiFormat, FormatDef> = {
	"openai-completions": {
		label: "OpenAI 兼容",
		desc: "支持 GPT-4o、DeepSeek、Zhipu AI（GLM）、Moonshot（Kimi）、Ollama 及所有兼容 OpenAI 接口格式的大模型",
		presets: [
			{ id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
			{
				id: "deepseek",
				label: "DeepSeek",
				baseUrl: "https://api.deepseek.com/v1",
			},
			{
				id: "zai",
				label: "Zhipu AI",
				baseUrl: "https://open.bigmodel.cn/api/paas/v4",
			},
			{
				id: "moonshot",
				label: "Moonshot (Kimi)",
				baseUrl: "https://api.moonshot.cn/v1",
			},
			{ id: "custom", label: "自定义地址", baseUrl: "" },
		],
		modelSuggestions: [
			{ id: "gpt-4o", name: "GPT-4o" },
			{ id: "gpt-4o-mini", name: "GPT-4o mini" },
			{ id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
			{ id: "deepseek-reasoner", name: "DeepSeek R1" },
			{ id: "glm-4-flash", name: "GLM-4 Flash" },
			{ id: "moonshot-v1-8k", name: "Kimi 8k" },
		],
	},
	"anthropic-messages": {
		label: "Anthropic",
		desc: "支持 Claude Opus 4.6、Claude Sonnet 4.6、Claude Haiku 4.5 等 Anthropic 系列模型",
		presets: [
			{
				id: "anthropic",
				label: "Anthropic",
				baseUrl: "https://api.anthropic.com/v1",
			},
		],
		modelSuggestions: [
			{ id: "claude-opus-4-6", name: "Claude Opus 4.6" },
			{ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
			{ id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
		],
	},
	"google-generative-ai": {
		label: "Google Gemini",
		desc: "支持 Gemini 2.0 Flash、Gemini 1.5 Pro 等 Google 系列模型",
		presets: [
			{
				id: "google",
				label: "Google AI Studio",
				baseUrl: "https://generativelanguage.googleapis.com/v1beta",
			},
		],
		modelSuggestions: [
			{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
			{ id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
			{ id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
			{ id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
		],
	},
};

const API_FORMATS: ApiFormat[] = [
	"openai-completions",
	"anthropic-messages",
	"google-generative-ai",
];

// ─── Wizard ──────────────────────────────────────────────────────

export function ApiWizard({ onSuccess, onClose }: Props) {
	const { patchConfig } = useGatewayConfig();

	const [apiFormat, setApiFormat] = useState<ApiFormat>("openai-completions");
	const [presetId, setPresetId] = useState<string>("openai");
	const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
	const [modelId, setModelId] = useState("");
	const [modelName, setModelName] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const formatDef = FORMAT_DEFS[apiFormat];

	const handleFormatChange = (fmt: ApiFormat) => {
		const def = FORMAT_DEFS[fmt];
		setApiFormat(fmt);
		const firstPreset = def.presets[0];
		setPresetId(firstPreset.id);
		setBaseUrl(firstPreset.baseUrl);
		setModelId("");
		setModelName("");
		setError(null);
	};

	const handlePresetChange = (id: string) => {
		const p = formatDef.presets.find((x) => x.id === id);
		setPresetId(id);
		if (p && p.baseUrl) setBaseUrl(p.baseUrl);
		if (id !== "custom") setError(null);
	};

	const handleSuggestion = (s: ModelSuggestion) => {
		setModelId(s.id);
		setModelName(s.name);
	};

	const derivedProviderId =
		presetId === "custom"
			? (() => {
					try {
						return (
							new URL(baseUrl).hostname
								.replace(/\./g, "-")
								.replace(/^api-/, "") || "custom"
						);
					} catch {
						return "custom";
					}
				})()
			: presetId;

	const canSubmit = baseUrl.trim() && modelId.trim() && apiKey.trim();

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setLoading(true);
		setError(null);
		try {
			const providerId = derivedProviderId;
			const mId = modelId.trim();
			const mName = modelName.trim() || mId;

			const ok = await patchConfig({
				models: {
					mode: "merge",
					providers: {
						[providerId]: {
							baseUrl: baseUrl.trim(),
							api: apiFormat,
							apiKey: apiKey.trim(),
							models: [{ id: mId, name: mName }],
						},
					},
				},
				agents: {
					defaults: {
						model: {
							primary: `${providerId}/${mId}`,
						},
					},
				},
			});

			if (!ok) {
				setError("保存失败，请检查 Gateway 连接和 operator 权限");
				return;
			}
			onSuccess();
		} catch (e) {
			setError(String(e));
		} finally {
			setLoading(false);
		}
	};

	const inputClass =
		"w-full px-3 py-2 text-sm rounded-lg border border-white/15 bg-surface-variant text-surface-on placeholder:text-surface-on-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors";

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<Card className="w-full max-w-md shadow-2xl ring-1 ring-white/10 space-y-4">
				{/* Header */}
				<div className="flex items-center gap-2">
					<Cpu size={16} className="text-primary" />
					<h2 className="text-sm font-semibold text-surface-on">
						模型 API 配置
					</h2>
				</div>

				{/* API Format */}
				<div className="space-y-2">
					<p className="text-xs font-medium text-surface-on-variant">
						接口格式
					</p>
					<div className="grid grid-cols-3 gap-2">
						{API_FORMATS.map((fmt) => {
							const def = FORMAT_DEFS[fmt];
							const isActive = apiFormat === fmt;
							return (
								<button
									key={fmt}
									type="button"
									onClick={() => handleFormatChange(fmt)}
									className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
										isActive
											? "border-primary/60 bg-primary/8 ring-1 ring-primary/20"
											: "border-white/10 hover:border-white/20"
									}`}
								>
									<p
										className={`text-xs font-semibold ${isActive ? "text-primary" : "text-surface-on"}`}
									>
										{def.label}
									</p>
									<p className="text-[10px] text-surface-on-variant mt-0.5 leading-relaxed">
										{def.desc}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				{/* Provider preset (only show if multiple presets) */}
				{formatDef.presets.length > 1 && (
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-surface-on-variant">
							服务商
						</p>
						<div className="flex flex-wrap gap-1.5">
							{formatDef.presets.map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => handlePresetChange(p.id)}
									className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
										presetId === p.id
											? "border-primary/50 bg-primary/10 text-primary"
											: "border-white/10 text-surface-on-variant hover:border-white/20 hover:text-surface-on"
									}`}
								>
									{p.label}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Base URL */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-surface-on-variant block">
						API 地址
					</label>
					<input
						value={baseUrl}
						onChange={(e) => setBaseUrl(e.target.value)}
						placeholder="https://api.openai.com/v1"
						className={inputClass}
						autoComplete="off"
					/>
				</div>

				{/* Model */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-surface-on-variant block">
						模型 ID
					</label>
					<input
						value={modelId}
						onChange={(e) => {
							setModelId(e.target.value);
							if (
								!modelName ||
								formatDef.modelSuggestions.some((s) => s.id === modelId)
							) {
								setModelName("");
							}
						}}
						placeholder="例如: gpt-4o"
						className={inputClass}
						autoComplete="off"
					/>
					{/* Model suggestions */}
					<div className="flex flex-wrap gap-1.5">
						{formatDef.modelSuggestions.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => handleSuggestion(s)}
								className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
									modelId === s.id
										? "border-primary/50 bg-primary/10 text-primary"
										: "border-white/10 text-surface-on-variant hover:border-white/20 hover:text-surface-on"
								}`}
							>
								{s.name}
							</button>
						))}
					</div>
				</div>

				{/* API Key */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-surface-on-variant block">
						API Key
					</label>
					<input
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder="sk-..."
						className={inputClass}
						autoComplete="off"
					/>
				</div>

				{/* Config preview */}
				{canSubmit && (
					<div className="rounded-lg bg-surface-variant/30 border border-outline/10 px-3 py-2 text-[11px] text-surface-on-variant space-y-0.5">
						<div className="flex gap-1">
							<CheckCircle2
								size={11}
								className="text-emerald-500 mt-0.5 shrink-0"
							/>
							<span>
								Provider:{" "}
								<span className="font-mono text-surface-on">
									{derivedProviderId}
								</span>
							</span>
						</div>
						<div className="flex gap-1">
							<CheckCircle2
								size={11}
								className="text-emerald-500 mt-0.5 shrink-0"
							/>
							<span>
								默认模型:{" "}
								<span className="font-mono text-surface-on">
									{derivedProviderId}/{modelId}
								</span>
							</span>
						</div>
					</div>
				)}

				{error && (
					<div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
						<AlertCircle size={13} className="mt-0.5 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<div className="flex gap-2 pt-1">
					<Button
						variant="text"
						onClick={onClose}
						disabled={loading}
						className="flex-1"
					>
						取消
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit || loading}
						className="flex-1"
					>
						{loading ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							"保存配置"
						)}
					</Button>
				</div>
			</Card>
		</div>
	);
}
