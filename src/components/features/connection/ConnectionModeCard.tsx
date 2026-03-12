import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ConnectionModeCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
	hint: string;
	active?: boolean;
	showPulse?: boolean;
	onClick: () => void;
	disabled?: boolean;
	meta?: ReactNode;
}

export function ConnectionModeCard({
	icon: Icon,
	title,
	description,
	hint,
	active = false,
	showPulse = false,
	onClick,
	disabled = false,
	meta,
}: ConnectionModeCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`group relative text-left p-4 rounded-xl border transition-all duration-300 min-h-[150px] ${
				active
					? "border-primary/60 bg-primary/6 ring-1 ring-primary/30 shadow-sm"
					: "border-card-border bg-card-bg hover:border-primary/30 hover:-translate-y-1 hover:shadow-md"
			} ${disabled ? "opacity-60 cursor-not-allowed hover:translate-y-0" : ""}`}
		>
			{showPulse && (
				<span className="absolute top-3 right-3 flex h-2.5 w-2.5">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
				</span>
			)}
			<div className="flex items-center gap-2.5 mb-2.5">
				<Icon
					size={16}
					className={active ? "text-primary" : "text-surface-on"}
				/>
				<div className="text-[15px] leading-none font-bold text-surface-on">
					{title}
				</div>
			</div>
			<div className="text-[12px] text-surface-on-variant/70 leading-relaxed mb-2">
				{description}
			</div>
			<div
				className={`text-[11px] leading-relaxed ${
					active ? "text-primary/80" : "text-surface-on-variant/50"
				}`}
			>
				{hint}
			</div>
			{meta && <div className="mt-2">{meta}</div>}
		</button>
	);
}
