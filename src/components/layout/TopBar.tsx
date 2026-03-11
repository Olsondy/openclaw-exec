interface TopBarProps {
	title: string;
	subtitle?: string;
}

export function TopBar({ title }: TopBarProps) {
	return (
		<div className="h-16 flex items-center px-8 flex-shrink-0">
			<div className="flex-1">
				<h1 className="text-xl font-normal text-surface-on">{title}</h1>
			</div>
		</div>
	);
}
