import {
	Bot,
	Loader2,
	Plus,
	RefreshCw,
	RotateCw,
	Send,
	Square,
	Trash2,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { TopBar } from "../components/layout/TopBar";
import { useOperatorConnection } from "../hooks/useOperatorConnection";
import { useTauriEvent } from "../hooks/useTauri";
import { useT } from "../i18n";
import { useOperatorStore } from "../store";

// ─── Types ──────────────────────────────────────────────────────

interface AgentRow {
	id: string;
	name?: string;
	identity?: { name?: string; emoji?: string };
}

interface SessionRow {
	key: string;
	kind: string;
	displayName?: string;
	derivedTitle?: string;
	lastMessagePreview?: string;
	updatedAt: number | null;
	model?: string;
}

interface ChatMessage {
	role: "user" | "assistant" | "tool" | "system";
	content: unknown;
	/** timestamp in ms, derived from position in array */
	_idx: number;
}

interface GatewayChatEvent {
	state: "delta" | "final" | "error";
	sessionKey: string;
	runId: string;
	text?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseAgentId(sessionKey: string): string {
	// format: agent:{agentId}:{rest}
	const parts = sessionKey.toLowerCase().split(":");
	if (parts[0] === "agent" && parts.length >= 3) return parts[1];
	return "main";
}

function resolveSessionLabel(row: SessionRow): string {
	return row.displayName?.trim() || row.derivedTitle?.trim() || row.key;
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				if (typeof block === "string") return block;
				if (block && typeof block === "object") {
					const b = block as Record<string, unknown>;
					if (b.type === "text" && typeof b.text === "string") return b.text;
				}
				return "";
			})
			.join("\n")
			.trim();
	}
	return "";
}

function formatTime(ms: number | null): string {
	if (!ms) return "";
	const d = new Date(ms);
	const now = Date.now();
	const diff = now - ms;
	if (diff < 86400000) {
		return d.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function makeNewSessionKey(agentId: string): string {
	const uid = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
	return `agent:${agentId}:direct:${uid}`;
}

// ─── Page ────────────────────────────────────────────────────────

export function ChatPage() {
	const t = useT();
	const operatorStatus = useOperatorStore((s) => s.status);
	const isConnected = operatorStatus === "connected";

	return (
		<>
			<TopBar title={t.chat.title} subtitle={t.topbar.chatSub} />
			<div className="flex-1 overflow-hidden flex min-h-0">
				{!isConnected ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 text-surface-on-variant/50">
						<Bot
							size={32}
							strokeWidth={1.5}
							className="text-surface-on-variant/30"
						/>
						<p className="text-sm font-medium text-surface-on-variant">
							{t.chat.notConnected}
						</p>
						<p className="text-xs text-center max-w-xs">
							{t.chat.notConnectedHint}
						</p>
					</div>
				) : (
					<ChatLayout />
				)}
			</div>
		</>
	);
}

// ─── ChatLayout ──────────────────────────────────────────────────

function ChatLayout() {
	const { opCall } = useOperatorConnection();
	const t = useT();

	const [agents, setAgents] = useState<AgentRow[]>([]);
	const [defaultAgentId, setDefaultAgentId] = useState("main");
	const [sessions, setSessions] = useState<SessionRow[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);
	const [activeKey, setActiveKey] = useState<string | null>(null);

	// 加载 agents + sessions
	const reload = useCallback(async () => {
		setLoadingSessions(true);
		try {
			const [agentsRes, sessionsRes] = await Promise.all([
				opCall("agents.list", {}),
				opCall("sessions.list", { limit: 100 }),
			]);

			const agentPayload = agentsRes.payload as {
				agents?: AgentRow[];
				defaultId?: string;
			} | null;
			if (agentPayload?.agents) {
				setAgents(agentPayload.agents);
			}
			if (agentPayload?.defaultId) {
				setDefaultAgentId(agentPayload.defaultId);
			}

			const sessionPayload = sessionsRes.payload as {
				sessions?: SessionRow[];
			} | null;
			if (sessionPayload?.sessions) {
				setSessions(sessionPayload.sessions);
			}
		} finally {
			setLoadingSessions(false);
		}
	}, [opCall]);

	useEffect(() => {
		reload();
	}, [reload]);

	// 新建会话
	const handleNewSession = useCallback(() => {
		const key = makeNewSessionKey(defaultAgentId);
		// 先本地插入占位 session，发送第一条消息后 gateway 会正式创建
		setSessions((prev) => [
			{ key, kind: "direct", updatedAt: Date.now(), displayName: "New Chat" },
			...prev,
		]);
		setActiveKey(key);
	}, [defaultAgentId]);

	// 删除会话
	const handleDeleteSession = useCallback(
		async (key: string) => {
			await opCall("sessions.delete", { key });
			setSessions((prev) => prev.filter((s) => s.key !== key));
			if (activeKey === key) setActiveKey(null);
		},
		[opCall, activeKey],
	);

	// 重置会话
	const handleResetSession = useCallback(
		async (key: string) => {
			await opCall("sessions.reset", { key });
		},
		[opCall],
	);

	// 按 agentId 分组 sessions
	const agentsMap = Object.fromEntries(agents.map((a) => [a.id, a]));
	const grouped = sessions.reduce<Record<string, SessionRow[]>>((acc, s) => {
		const aid = parseAgentId(s.key);
		if (!acc[aid]) acc[aid] = [];
		acc[aid].push(s);
		return acc;
	}, {});

	return (
		<div className="flex flex-1 min-h-0 overflow-hidden">
			{/* ── 会话列表侧边栏 ── */}
			<aside className="w-56 flex-shrink-0 border-r border-outline/10 flex flex-col">
				<div className="p-2 border-b border-outline/10">
					<button
						type="button"
						onClick={handleNewSession}
						className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary/8 transition-colors"
					>
						<Plus size={13} />
						{t.chat.newSession}
					</button>
				</div>

				<div className="flex-1 overflow-y-auto custom-scrollbar py-2">
					{loadingSessions ? (
						<div className="flex items-center justify-center py-8">
							<Loader2
								size={16}
								className="animate-spin text-surface-on-variant/40"
							/>
						</div>
					) : sessions.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 gap-2 text-surface-on-variant/40">
							<Bot size={20} strokeWidth={1.5} />
							<p className="text-xs">{t.chat.noSessions}</p>
						</div>
					) : (
						Object.entries(grouped).map(([agentId, agentSessions]) => {
							const agent = agentsMap[agentId];
							const emoji = agent?.identity?.emoji ?? "🤖";
							const agentName = agent?.identity?.name ?? agent?.name ?? agentId;

							return (
								<div key={agentId} className="mb-2">
									<div className="px-3 py-1 flex items-center gap-1.5">
										<span className="text-xs">{emoji}</span>
										<span className="text-[10px] font-semibold text-surface-on-variant/60 uppercase tracking-wider truncate">
											{agentName}
										</span>
									</div>
									{agentSessions.map((session) => (
										<SessionItem
											key={session.key}
											session={session}
											isActive={activeKey === session.key}
											onClick={() => setActiveKey(session.key)}
											onDelete={() => handleDeleteSession(session.key)}
											onReset={() => handleResetSession(session.key)}
										/>
									))}
								</div>
							);
						})
					)}
				</div>

				<div className="p-2 border-t border-outline/10">
					<button
						type="button"
						onClick={reload}
						disabled={loadingSessions}
						className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-surface-on-variant/50 hover:text-surface-on-variant transition-colors rounded-md hover:bg-surface-variant/30 disabled:opacity-40"
					>
						<RefreshCw
							size={11}
							className={loadingSessions ? "animate-spin" : ""}
						/>
						{t.chat.reload ?? "Refresh"}
					</button>
				</div>
			</aside>

			{/* ── 消息区域 ── */}
			{activeKey ? (
				<ChatArea key={activeKey} sessionKey={activeKey} agents={agentsMap} />
			) : (
				<div className="flex-1 flex flex-col items-center justify-center gap-3 text-surface-on-variant/40">
					<Bot size={36} strokeWidth={1} />
					<p className="text-sm">{t.chat.noSessions}</p>
				</div>
			)}
		</div>
	);
}

// ─── SessionItem ─────────────────────────────────────────────────

function SessionItem({
	session,
	isActive,
	onClick,
	onDelete,
	onReset,
}: {
	session: SessionRow;
	isActive: boolean;
	onClick: () => void;
	onDelete: () => void;
	onReset: () => void;
}) {
	const [showActions, setShowActions] = useState(false);

	return (
		<div
			className={`group relative mx-1 mb-0.5 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
				isActive
					? "bg-primary/10 text-primary"
					: "hover:bg-surface-variant/40 text-surface-on-variant"
			}`}
			onClick={onClick}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
		>
			<p className="text-xs font-medium truncate leading-tight">
				{resolveSessionLabel(session)}
			</p>
			{session.lastMessagePreview && (
				<p className="text-[10px] truncate mt-0.5 opacity-60 leading-tight">
					{session.lastMessagePreview}
				</p>
			)}
			{session.updatedAt && (
				<p className="text-[9px] opacity-40 mt-0.5">
					{formatTime(session.updatedAt)}
				</p>
			)}

			{/* 操作按钮 */}
			{showActions && (
				<div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-surface rounded-md border border-outline/10 shadow-sm">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onReset();
						}}
						className="p-1 rounded hover:bg-surface-variant transition-colors text-surface-on-variant/60 hover:text-surface-on"
						title="Reset"
					>
						<RotateCw size={10} />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="p-1 rounded hover:bg-red-500/10 transition-colors text-surface-on-variant/60 hover:text-red-400"
						title="Delete"
					>
						<Trash2 size={10} />
					</button>
				</div>
			)}
		</div>
	);
}

// ─── ChatArea ────────────────────────────────────────────────────

function ChatArea({
	sessionKey,
	agents,
}: {
	sessionKey: string;
	agents: Record<string, AgentRow>;
}) {
	const { opCall } = useOperatorConnection();
	const t = useT();

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [streamingText, setStreamingText] = useState("");
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const agentId = parseAgentId(sessionKey);
	const agent = agents[agentId];
	const agentEmoji = agent?.identity?.emoji ?? "🤖";
	const agentName = agent?.identity?.name ?? agent?.name ?? agentId;

	// 加载历史消息
	useEffect(() => {
		let cancelled = false;
		setLoadingHistory(true);
		setMessages([]);

		opCall("chat.history", { sessionKey, limit: 200 })
			.then((res) => {
				if (cancelled) return;
				const payload = res.payload as { messages?: unknown[] } | null;
				const raw = payload?.messages ?? [];
				setMessages(
					raw.map((m, idx) => ({
						...(m as Omit<ChatMessage, "_idx">),
						_idx: idx,
					})),
				);
			})
			.finally(() => {
				if (!cancelled) setLoadingHistory(false);
			});

		return () => {
			cancelled = true;
		};
	}, [sessionKey, opCall]);

	// 滚到底
	useLayoutEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingText]);

	// 监听 Gateway chat 事件（流式输出）
	useTauriEvent<{ event: string; payload: unknown }>(
		"ws:gateway_event",
		useCallback(
			(envelope) => {
				if (envelope.event !== "chat") return;
				const payload = envelope.payload as GatewayChatEvent;
				if (payload.sessionKey?.toLowerCase() !== sessionKey.toLowerCase())
					return;

				if (payload.state === "delta" && payload.text) {
					setStreamingText((prev) => prev + payload.text);
					setCurrentRunId(payload.runId);
					setStreaming(true);
				} else if (payload.state === "final") {
					const finalText = streamingText + (payload.text ?? "");
					setMessages((prev) => [
						...prev,
						{
							role: "assistant",
							content: finalText,
							_idx: prev.length,
						},
					]);
					setStreamingText("");
					setStreaming(false);
					setCurrentRunId(null);
				} else if (payload.state === "error") {
					setStreamingText("");
					setStreaming(false);
					setCurrentRunId(null);
				}
			},
			[sessionKey, streamingText],
		),
	);

	// 发送消息
	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || streaming) return;

		const idempotencyKey = crypto.randomUUID();

		// 立即显示用户消息
		setMessages((prev) => [
			...prev,
			{ role: "user", content: text, _idx: prev.length },
		]);
		setInput("");
		setStreamingText("");
		setStreaming(true);

		try {
			await opCall("chat.send", {
				sessionKey,
				message: text,
				idempotencyKey,
			});
		} catch {
			setStreaming(false);
			setStreamingText("");
		}
	}, [input, streaming, sessionKey, opCall]);

	// 中止生成
	const handleAbort = useCallback(async () => {
		await opCall("chat.abort", {
			sessionKey,
			...(currentRunId ? { runId: currentRunId } : {}),
		});
		setStreaming(false);
		setStreamingText("");
		setCurrentRunId(null);
	}, [sessionKey, currentRunId, opCall]);

	// Enter 发送，Shift+Enter 换行
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
			{/* 消息列表 */}
			<div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
				{loadingHistory ? (
					<div className="flex items-center justify-center py-12">
						<Loader2
							size={18}
							className="animate-spin text-surface-on-variant/40"
						/>
					</div>
				) : messages.length === 0 && !streaming ? (
					<div className="flex flex-col items-center justify-center py-16 gap-3 text-surface-on-variant/40">
						<span className="text-3xl">{agentEmoji}</span>
						<p className="text-sm">{agentName}</p>
						<p className="text-xs">{t.chat.inputPlaceholder}</p>
					</div>
				) : (
					messages
						.filter((m) => m.role !== "system")
						.map((msg) => (
							<MessageBubble
								key={msg._idx}
								msg={msg}
								agentEmoji={agentEmoji}
								agentName={agentName}
							/>
						))
				)}

				{/* 流式消息 */}
				{streaming && (
					<div className="flex gap-2.5 items-start">
						<div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm">
							{agentEmoji}
						</div>
						<div className="max-w-[75%] bg-surface-variant/40 border border-outline/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
							{streamingText ? (
								<p className="text-sm text-surface-on whitespace-pre-wrap leading-relaxed">
									{streamingText}
									<span className="inline-block w-1 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />
								</p>
							) : (
								<div className="flex gap-1 py-1">
									<span className="w-1.5 h-1.5 rounded-full bg-surface-on-variant/40 animate-bounce [animation-delay:0ms]" />
									<span className="w-1.5 h-1.5 rounded-full bg-surface-on-variant/40 animate-bounce [animation-delay:150ms]" />
									<span className="w-1.5 h-1.5 rounded-full bg-surface-on-variant/40 animate-bounce [animation-delay:300ms]" />
								</div>
							)}
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* 输入栏 */}
			<div className="flex-shrink-0 border-t border-outline/10 p-3">
				<div className="flex gap-2 items-end">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t.chat.inputPlaceholder}
						disabled={streaming}
						rows={1}
						className="flex-1 resize-none bg-surface-variant/30 border border-outline/20 rounded-xl px-3.5 py-2.5 text-sm text-surface-on placeholder:text-surface-on-variant/40 focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-50 max-h-32 overflow-y-auto custom-scrollbar"
						style={{ minHeight: "42px" }}
					/>
					{streaming ? (
						<button
							type="button"
							onClick={handleAbort}
							className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center"
						>
							<Square size={14} />
						</button>
					) : (
						<button
							type="button"
							onClick={handleSend}
							disabled={!input.trim()}
							className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-on hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center"
						>
							<Send size={14} />
						</button>
					)}
				</div>
				<p className="text-[10px] text-surface-on-variant/30 mt-1.5 text-center">
					Enter ↵ 发送 · Shift+Enter 换行
				</p>
			</div>
		</div>
	);
}

// ─── MessageBubble ───────────────────────────────────────────────

function MessageBubble({
	msg,
	agentEmoji,
	agentName,
}: {
	msg: ChatMessage;
	agentEmoji: string;
	agentName: string;
}) {
	const isUser = msg.role === "user";
	const isTool = msg.role === "tool";
	const text = extractTextFromContent(msg.content);

	if (!text) return null;

	// Tool calls: compact display
	if (isTool) {
		return (
			<div className="flex justify-center">
				<div className="px-3 py-1 rounded-full bg-surface-variant/30 border border-outline/10 text-[10px] text-surface-on-variant/50 font-mono max-w-[70%] truncate">
					⚙ {text}
				</div>
			</div>
		);
	}

	if (isUser) {
		return (
			<div className="flex justify-end">
				<div className="max-w-[75%] bg-primary text-primary-on rounded-2xl rounded-tr-sm px-3.5 py-2.5">
					<p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
				</div>
			</div>
		);
	}

	// Assistant
	return (
		<div className="flex gap-2.5 items-start">
			<div
				className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm"
				title={agentName}
			>
				{agentEmoji}
			</div>
			<div className="max-w-[75%] bg-surface-variant/40 border border-outline/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
				<p className="text-sm text-surface-on whitespace-pre-wrap leading-relaxed">
					{text}
				</p>
			</div>
		</div>
	);
}
