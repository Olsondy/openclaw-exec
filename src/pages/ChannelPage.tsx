import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { FeishuWizard } from "../components/features/wizard/FeishuWizard";
import { TelegramWizard } from "../components/features/wizard/TelegramWizard";
import { TopBar } from "../components/layout/TopBar";
import { Button, Card } from "../components/ui";
import { useT } from "../i18n";
import { useConnectionStore } from "../store";

export function ChannelPage() {
	const { status } = useConnectionStore();
	const isOnline = status === "online";
	const [feishuWizardOpen, setFeishuWizardOpen] = useState(false);
	const [telegramWizardOpen, setTelegramWizardOpen] = useState(false);
	const t = useT();

	return (
		<>
			<TopBar title={t.sidebar.channel} subtitle={t.topbar.channelSub} />
			<div className="flex-1 overflow-auto p-6 space-y-4 max-w-2xl">
				{/* 飞书配置卡片 */}
				<Card>
					<div className="flex items-center gap-2 mb-4">
						<MessageSquare size={16} className="text-primary" />
						<h2 className="text-sm font-semibold text-surface-on">
							{t.channel.feishu}
						</h2>
					</div>
					<p className="text-xs text-surface-on-variant mb-3">
						{t.channel.feishuDesc}
					</p>
					<Button
						variant="outlined"
						onClick={() => setFeishuWizardOpen(true)}
						disabled={!isOnline}
					>
						{t.channel.configureFeishu}
					</Button>
					{!isOnline && (
						<p className="text-xs text-surface-on-variant mt-2">
							{t.channel.activateFirst}
						</p>
					)}
				</Card>

				{/* Telegram 配置卡片 */}
				<Card>
					<div className="flex items-center gap-2 mb-4">
						<Send size={16} className="text-primary" />
						<h2 className="text-sm font-semibold text-surface-on">
							{t.channel.telegram}
						</h2>
					</div>
					<p className="text-xs text-surface-on-variant mb-3">
						{t.channel.telegramDesc}
					</p>
					<Button
						variant="outlined"
						onClick={() => setTelegramWizardOpen(true)}
						disabled={!isOnline}
					>
						{t.channel.configureTelegram}
					</Button>
					{!isOnline && (
						<p className="text-xs text-surface-on-variant mt-2">
							{t.channel.activateFirst}
						</p>
					)}
				</Card>
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
