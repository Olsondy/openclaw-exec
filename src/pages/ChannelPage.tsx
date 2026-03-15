import type { LucideIcon } from "lucide-react";
import {
	Bell,
	Bot,
	Headphones,
	MessageSquare,
	Phone,
	Send,
} from "lucide-react";
import { useState } from "react";
import { FeishuWizard } from "../components/features/wizard/FeishuWizard";
import { TelegramWizard } from "../components/features/wizard/TelegramWizard";
import { TopBar } from "../components/layout/TopBar";
import { Button } from "../components/ui";
import { useT } from "../i18n";
import { useConnectionStore } from "../store";

// ─── Channel 定义 ────────────────────────────────────────────────

type ChannelId =
	| "feishu"
	| "telegram"
	| "qq"
	| "dingtalk"
	| "discord"
	| "whatsapp";

interface ChannelDef {
	id: ChannelId;
	icon: LucideIcon;
	iconBg: string;
	iconColor: string;
	available: boolean;
}

const CHANNELS: ChannelDef[] = [
	{
		id: "telegram",
		icon: Send,
		iconBg: "bg-sky-500/10",
		iconColor: "text-sky-500",
		available: true,
	},
	{
		id: "discord",
		icon: Headphones,
		iconBg: "bg-violet-500/10",
		iconColor: "text-violet-500",
		available: false,
	},
	{
		id: "whatsapp",
		icon: Phone,
		iconBg: "bg-emerald-500/10",
		iconColor: "text-emerald-500",
		available: false,
	},
	{
		id: "feishu",
		icon: MessageSquare,
		iconBg: "bg-blue-500/10",
		iconColor: "text-blue-500",
		available: true,
	},
	{
		id: "dingtalk",
		icon: Bell,
		iconBg: "bg-orange-500/10",
		iconColor: "text-orange-500",
		available: false,
	},
	{
		id: "qq",
		icon: Bot,
		iconBg: "bg-indigo-500/10",
		iconColor: "text-indigo-500",
		available: false,
	},
];

// ─── Page ────────────────────────────────────────────────────────

export function ChannelPage() {
	const { status } = useConnectionStore();
	const isOnline = status === "online";
	const [feishuWizardOpen, setFeishuWizardOpen] = useState(false);
	const [telegramWizardOpen, setTelegramWizardOpen] = useState(false);
	const t = useT();

	const channelLabels: Record<ChannelId, { name: string; desc: string }> = {
		feishu: { name: t.channel.feishu, desc: t.channel.feishuDesc },
		telegram: { name: t.channel.telegram, desc: t.channel.telegramDesc },
		qq: { name: t.channel.qq, desc: t.channel.qqDesc },
		dingtalk: { name: t.channel.dingtalk, desc: t.channel.dingtalkDesc },
		discord: { name: t.channel.discord, desc: t.channel.discordDesc },
		whatsapp: { name: t.channel.whatsapp, desc: t.channel.whatsappDesc },
	};

	const handleConfigure = (id: ChannelId) => {
		if (id === "feishu") setFeishuWizardOpen(true);
		if (id === "telegram") setTelegramWizardOpen(true);
	};

	return (
		<>
			<TopBar title={t.sidebar.channel} subtitle={t.topbar.channelSub} />
			<div className="flex-1 overflow-auto p-6">
				<div className="grid grid-cols-2 gap-3 max-w-xl">
					{CHANNELS.map((ch) => {
						const { name, desc } = channelLabels[ch.id];
						return (
							<ChannelCard
								key={ch.id}
								channel={ch}
								name={name}
								desc={desc}
								isOnline={isOnline}
								onConfigure={() => handleConfigure(ch.id)}
								configureLabel={t.channel.configure}
								comingSoonLabel={t.channel.comingSoon}
								offlineLabel={t.channel.activateFirst}
							/>
						);
					})}
				</div>
			</div>

			{feishuWizardOpen && (
				<FeishuWizard
					onSuccess={() => setFeishuWizardOpen(false)}
					onClose={() => setFeishuWizardOpen(false)}
				/>
			)}
			{telegramWizardOpen && (
				<TelegramWizard
					onSuccess={() => setTelegramWizardOpen(false)}
					onClose={() => setTelegramWizardOpen(false)}
				/>
			)}
		</>
	);
}

// ─── ChannelCard ─────────────────────────────────────────────────

function ChannelCard({
	channel,
	name,
	desc,
	isOnline,
	onConfigure,
	configureLabel,
	comingSoonLabel,
	offlineLabel,
}: {
	channel: ChannelDef;
	name: string;
	desc: string;
	isOnline: boolean;
	onConfigure: () => void;
	configureLabel: string;
	comingSoonLabel: string;
	offlineLabel: string;
}) {
	const Icon = channel.icon;
	const dimmed = !channel.available;

	return (
		<div
			className={`aspect-square rounded-xl border border-card-border bg-surface flex flex-col items-center justify-between p-5 transition-all ${
				channel.available
					? "hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
					: "opacity-60"
			}`}
		>
			{/* Icon */}
			<div
				className={`w-10 h-10 rounded-lg flex items-center justify-center ${channel.iconBg} ${channel.iconColor}`}
			>
				<Icon size={18} strokeWidth={1.8} />
			</div>

			{/* Name + Desc */}
			<div className="text-center space-y-1">
				<p
					className={`text-sm font-semibold ${dimmed ? "text-surface-on-variant" : "text-surface-on"}`}
				>
					{name}
				</p>
				<p className="text-[11px] text-surface-on-variant leading-tight">
					{desc}
				</p>
			</div>

			{/* Action */}
			<div className="w-full">
				{!channel.available ? (
					<p className="text-center text-[11px] text-surface-on-variant/50">
						{comingSoonLabel}
					</p>
				) : !isOnline ? (
					<p className="text-center text-[11px] text-surface-on-variant/50">
						{offlineLabel}
					</p>
				) : (
					<Button
						variant="outlined"
						size="sm"
						className="w-full"
						onClick={onConfigure}
					>
						{configureLabel}
					</Button>
				)}
			</div>
		</div>
	);
}
